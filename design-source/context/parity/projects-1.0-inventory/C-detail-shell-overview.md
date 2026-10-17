# C — 1.0 Projects: the detail page's shell and Overview

Read at `qanvast-id-tool` working tree, branch `integ/security-non-qanvast` @ `620190192`, read-only (nothing run). Read in full: `src/app/(main)/projects/[projectId]/page.tsx` lines 1–2620 and 4440–5130 (cited below as **page**; the middle was skimmed only to map what is mounted where), `src/components/projects/{control-shell, financial-summary-card, financial-attention-block, project-team-card, key-files-rail, setup-progress, draft-setup-card, homeowner-response-banner, project-fabs, tool-entry-dialog, activity-summary, confirm-delete-project-dialog, closure-review-banner, post-update-sheet, quick-expense-sheet, file-lightbox}.tsx`, `src/components/ui/{secondary-page-header, sliding-tabs, download-picker}.tsx`, `src/components/homeowner/invite-dialog.tsx`, `src/components/shared/{homeowner-questionnaire, invite-to-answer-dialog}.tsx`, `src/components/leads/drawer-sections/assignment-section.tsx`, `src/lib/{project-health, project-progress, financial-issues, access-control}.ts`, `src/lib/finance/{contract-value, contract-loader}.ts`, `src/lib/queries/{project-aggregates, projects}.ts` (the hooks the page uses), `src/app/(main)/layout.tsx`, `src/context/{platform-config-context, breadcrumb-context, app-context (scoping parts)}.tsx`, the API routes `api/projects/records/[id]`, `api/projects/records/[id]/assignees`, `api/projects/[id]/{delete,archive}`, `api/project-aggregates/financial-summary`, `api/studio/preview-as-homeowner`, `api/homeowner/invite`, and the keyframes in `src/app/globals.css`. Paths below are relative to `src/` unless they start with **page** or `supabase/` (repo root). Meeting Summary and Progress Updates are recorded for placement only (reader D owns them).

How to read it: the large surfaces (§1, §2, §6, §7) use the numbered sub-headings — (1) what it is · (2) layout · (3) UI elements · (4) interactions · (5) states · (6) motion · (7) rules · (8) data · (9) responsive · (10) problems; a sub-heading with nothing to say is left out. The small surfaces are flat lists in that same order, and every fault there starts with **Problem** / **Problems**. §16 gathers every animation and transition in one list.

## Bottom line

- The project detail is **one 5,130-line client component**: a sticky white header (back, crumb, `#seq` + name, a meta line, four action buttons, a kebab, the tab strip) over five tabs. Overview is a 7/5 two-column grid: Financial Summary · Project Info · Project Team · Customer + Property · Key Files · Notes on the left; Meeting Summary · Progress Updates · Activity on the right.
- **The header never says what state the project is in.** No Draft / Active / Closed / Archived badge and no status ("Planning") anywhere in the header; the only state differences are: Draft → the name is editable; Active → "Close project" appears in the kebab. An archived project looks identical to a live one.
- **Tab state is read from the URL once, then only written.** `?tab=` values that no longer exist (`planning`, `design` — still linked from Tasks, the Dashboard and a notification) render the header over an empty page; an in-app link to another tab of the project you are already on is reverted by the sync effect **[inferred]**.
- **Financial Summary** = one severity-coloured banner (the top open issue) + a counts strip ("15 finance issues open · 0 resolved · View all ›") + a right-side drawer, then six figures with ⓘ tooltips. Twelve issue kinds are computed in the browser; the banner is the *most recently dated* critical issue, not the worst (the owner's screenshot shows "overdue by 20 days" while another milestone is 108 days overdue).
- **Three things on the page are dead:** the red escalation banner can never show (escalations reach the browser without a `projectId`); the project health score is computed and never drawn; "Resolve" on a variance issue from Overview opens nothing, because the wizard is mounted inside the Finance tab.
- **Contract value has one server-side rule**: latest client-signed quote → else the primary quote that is sent-for-signature or approved → else the budget; plus approved client VOs. The card says "From signed quote" in both quote cases, signed or not. Expected profit needs a cost on *every* quote line; actual profit appears after the first payment, in two bases (cash · including commitments).
- **Inline edits are unguarded and silent.** Project Info, Customer, Property and Notes pencils show to every role, ignore the handover lock, validate nothing, and say nothing on success or failure; the server `PATCH` accepts any signed-in member of the studio. Project Info's Save also re-sends status, stage, start and due date (the due date in its display form — likely a failed save on any project that has one **[inferred]**).
- **Two ways to assign a designer that disagree**: Project Info's pencil writes the old single `assigned_to`; the Project Team card writes the `project_assignees` junction with even commission splits. With a team set, the pencil's Designer choice visibly does nothing **[inferred]**.
- **Draft projects** get a five-step "Set up this project" card on top of Overview; the page itself flips Draft → Active the moment all five checks pass, on anyone's page view. The setup wizard's step map still looks for a renamed check, so the timeline step never appears **[inferred]**.
- **Below 1024px** the four header buttons and the kebab fold into one "⋯" menu, the crumb goes, the meta line becomes two lines and hides on scroll; two floating buttons (Log expense, Post update) sit over every tab. Their sheets take a photo / receipt and do not upload it.
- **Delete** is Owner / Admin only (checked on the server too); a project with any financial record cannot be deleted and the dialog offers "Archive instead?" with raw table names in the sentence. "Close project" is described as "Archive after handover", so the product has two different things called archive.
- **Motion is light**: a 250 ms fade + 4px rise on every tab switch, a 300 ms sliding underline, a 400 ms fade-up on two of the Overview cards only, a 200 ms header shadow, tw-animate defaults on dialogs / sheet / menus; everything collapses under `prefers-reduced-motion`.

---

## 1. The page frame — entry, data, URL sync, loading and failure

### (1) What it is / entry points

- **C-01** Route `/projects/[projectId]`, a `"use client"` page inside the `(main)` layout (top bar, sidebar, bottom nav); the whole detail — five tabs and every dialog — is one default-exported component `ProjectDetailPage`. `page:1`, `page:637`, `app/(main)/layout.tsx:160-211`.
- **C-02** Query parameters the page understands: `?tab=` (`details` default · `management` · `finance` · `files-docs` · `activity`, plus an unlisted `render`), `?sub=` (Finance: `overview` default · `contracts` · `invoices` · `pos` · `expenses` · `bills` · `receipts`; Management: `milestones` default · `tasks` · `materials` · `floor-plan`), `?focus=<invoiceId>` (only with `tab=finance&sub=invoices`), and the retired `?review=true`. `page:647-650`, `page:674-678`, `page:708-712`, `page:881-885`, `page:4040`.
- **C-03** Old links `?tab=timeline` and `?tab=tasks` are mapped to `management`. `page:648-649`.
- **C-04** `?review=true` (old timeline-review emails) triggers `router.replace(pathname)`, which drops every query parameter. `page:1425-1430`.
- **C-05** Entry points that link here (from a grep of `router.push`/`href` to `/projects/${id}`): the Projects list and its cards, the Tasks page, the Dashboard, the lead detail drawer, Finance › Pipeline and Operations, the inbox (conversation header, context panel, chat list), the quotes table, the invoice quick view, the recent-updates feed, the selection board, the mAIson panel and the workload view. `app/(main)/projects/page.tsx`, `app/(main)/tasks/page.tsx:317`, `app/(main)/dashboard/page.tsx:112`, `components/leads/lead-detail-drawer.tsx`, `components/layout/id-buddy-panel.tsx:468,481`.
- **C-06** A sibling route `/projects/[projectId]/quotes/new` exists; the Draft setup card's "Add quote" link goes there. `components/projects/setup-progress.tsx:29`.

### (2) Layout

- **C-07** Page root: `px-4 sm:px-6 md:px-8 pb-6 space-y-6` — 16 / 24 / 32px side gutters, 24px bottom, 24px between the header, the banners and the tab body; no top padding (the header sits flush under the top bar). `page:1628`.
- **C-08** The scroll container is the layout's `<main>` (`overflow-y-auto`, mesh background `bg-mesh-subtle`); the header sticks to its top. `app/(main)/layout.tsx:186`, `components/ui/secondary-page-header.tsx:113`.
- **C-09** Order inside the root: header → handover-lock banner → signature-request banner → escalation banner → the keyed tab body → page-level dialogs → the floating task bulk bar → the mobile FABs. `page:1630-1941`, `page:4512-4855`.

### (7) Rules and logic — data loading and URL sync

- **C-10** The project comes from `useProjectById` → `GET /api/projects/records/{id}`: the `projects` row with its `project_assignees` (member, commission split, added at/by, name through `studio_members → profiles`), transformed on the server; a 404 becomes `null`. `lib/queries/projects.ts:89-108`, `app/api/projects/records/[id]/route.ts:23-82`.
- **C-11** The server normalises the stage to exactly three values: `Draft`, `Closed`, and everything else (legacy `design` / `execution`, `active`, empty) → `Active`. `lib/transformers.ts:457-467`.
- **C-12** `status` is a separate, older field (Planning · Hacking · In Progress · Completed · On Hold · Cancelled); the detail page carries it in state but never displays it. `lib/transformers.ts:103-108`, `page:2091`, `page:443-445`.
- **C-13** On mount the page itself starts nineteen queries regardless of tab — the project, studio members, the project-type taxonomy, all studio projects (for the duplicate-name check), commission rules, the project's VOs, quotes, credit notes, POs, the financial summary, action items, studio settings, workflow toggles, studio features, role permissions, studio companies, the lead's latest signature request, portal tokens and the unified file list — before the cards add their own (activity feed, project files, progress updates, POs again, questionnaire answers, meeting briefs). `page:660-664`, `page:770-804`, `page:830`, `page:945-979`, `page:1310`.
- **C-14** The financial summary refetches on every mount (`refetchOnMount: "always"`) and makes a second request for the base quote's line count. `lib/queries/project-aggregates.ts:132-140`, `:197-203`.
- **C-15** Tab and sub-tab live in React state seeded from the URL **once**; an effect then writes them back with `router.replace(…, { scroll: false })`, omitting defaults (`details`, `overview`, `milestones`) and keeping other parameters. `page:850`, `page:894-908`.
- **C-16** Because writes use `replace`, tab changes add no browser history: Back leaves the project instead of returning to the previous tab **[inferred]**. `page:906`.
- **C-17** The page publishes the project name to the layout breadcrumb context and a "focused entity" (id, name, stage, status, budget, client) to the page context that the mAIson assistant reads. `page:1389-1394`, `page:1396-1418`, `context/page-context.tsx:15-27`.
- **C-18** Auto-promotion: when the stage is Draft, not closed, and all five setup checks pass, an effect `PATCH`es `stage: "Active"` and toasts "All setup steps complete — project is now Active."; a failure is logged and retried on the next change. `page:1565-1587`.
- **C-19** The setup checks treat the commission step as done when the studio's workflow toggle `commissionApprovalRequired` is off, and the contract step as done when the lead's latest signature request is `signed`. `page:1566-1569`, `components/projects/setup-progress.tsx:23-59`.
- **C-20** Handover lock: `projectIsLocked` = studio feature `lockProjectOnHandover` on **and** (`handoverLockedAt` set **or** stage `Closed`) **and** the viewer may not `project_override.override_lock` (Owner / Admin may). `page:809-813`, `lib/access-control.ts:329-331`.
- **C-21** Payment-schedule freeze: once any milestone carries a payment %, the schedule is frozen for everyone; Owner / Admin can override per project (passed to the Gantt, not used on Overview). `page:822-826`, `page:2774-2775`.

### (5) States

- **C-22** Loading (while the project query is loading): a pulsing skeleton — a 128×16 line, a 224×32 title with a 160×16 line under it, two button blocks (112 and 128 wide, 36 high), a 40px bar capped at `max-w-md`, then a two-column grid (one column below 1024) of four 160px-high rounded blocks. `page:1589-1611`, `components/ui/skeleton.tsx:3-10`.
- **C-23** The skeleton has its own top padding (`pt-4 sm:pt-6 md:pt-8`) and no white header band, so the real page lands with the header higher and a different column split (7/5, not 1/1). `page:1591`, `page:1604`, `page:2003-2005`.
- **C-24** Not found / failed: the same header frame titled "Project not found" (back arrow and "Projects /" crumb work), then centred "Project not found" and either "An error occurred loading this project." (query error) or "This project may have been moved or deleted." No retry control. `page:1613-1623`.
- **C-25** A render-time crash is caught by the layout's error boundary: a red-tinted warning circle, "Something went wrong", "An unexpected error occurred. Please try refreshing the page.", and a "Try Again" button. `app/(main)/layout.tsx:198`, `components/ui/error-boundary.tsx:35-52`.
- **C-26** Before the session resolves the layout shows a centred shape loader on a grey screen; without a user it redirects to `/login`. `app/(main)/layout.tsx:132-158`.
- **C-27** Route access: `/projects` is open to tags `owner`, `admin`, `id`; an accounting-only member is redirected to their default route. `lib/access-control.ts:68`, `app/(main)/layout.tsx:143-145`.

### (6) Motion

- **C-28** The tab body is wrapped in `<div key={activeTab} className="animate-tab-enter">`: on every tab switch the body remounts and plays `tabFadeIn` — opacity 0 → 1 with `translateY(4px → 0)`, 0.25s, ease-out. `page:1941`, `app/globals.css:1687-1693`.
- **C-29** On phones the layout animates `<main>`'s top padding over 300 ms ease-in-out as the top bar hides; on a detail page "focus mode" removes the top bar and bottom nav entirely. `app/(main)/layout.tsx:186`, `:204-208`, `components/ui/secondary-page-header.tsx:64-67`.
- **C-30** A global rule cuts every animation and transition to 0.01 ms under `prefers-reduced-motion: reduce`. `app/globals.css:1331-1338`.

### (8) Data

- **C-31** Reads: `projects` (+ `project_assignees`, `studio_members`, `profiles`); the contract file URL is signed from the private `contract-files` bucket on the way out. `app/api/projects/records/[id]/route.ts:35-75`.
- **C-32** Writes go through `PATCH /api/projects/records/{id}` with a whitelist of 25 columns (`name`, `status`, `stage`, `progress`, `timeline`, `timeline_status`, `notes`, `assigned_to`, `customer_phone`, `customer_email`, `property_type`, `property_address`, `property_name`, `project_type`, `scope`, `budget_total`, `start_date`, `due_date`, `ai_plan_metadata`, `quote_data`, `quote_status`, `contract_file_name`, `closed_at`, `commission_locked`, `commission_enabled`); a changed timeline is mirrored into the contract quote's payment schedule. `app/api/projects/records/[id]/route.ts:88-142`.
- **C-33** After any update the client invalidates `["projects"]` and `["project", id]`; there are no optimistic updates for the inline edits. `lib/queries/projects.ts:352-362`.

### (10) Problems

- **C-34** An unknown `?tab=` is accepted as-is: no tab is highlighted, no body renders, and the sync effect keeps the bad value in the address. Live links still use dead values — `?tab=planning` from the Tasks page and the Dashboard, `?tab=design&designSubTab=floor-plan` from the homeowner floor-plan annotation notification **[inferred]**. `page:850`, `app/(main)/tasks/page.tsx:317`, `app/(main)/dashboard/page.tsx:112`, `app/api/homeowner/projects/[id]/floor-plan/annotations/route.ts:110`.
- **C-35** Tab state does not follow later URL changes: an in-app push to `?tab=finance&sub=invoices` for the project already open (the mAIson panel does this) leaves the state on the old tab and the sync effect rewrites the URL back **[inferred]**. `page:850`, `page:894-908`, `components/layout/id-buddy-panel.tsx:468`.
- **C-36** The Finance tab is hidden when the platform switch `finance/operations` is off, but `?tab=finance` still renders the Finance body — the body has no such guard. `page:1879`, `page:3271`.
- **C-37** A `render` tab body (the Visualizer, edge to edge) is still in the page but has no tab in the strip; it is reachable only by typing `?tab=render`. `page:4040-4044`, `page:1876-1882`.
- **C-38** `useProjectActionItems` is fetched (invoices, tasks, escalations, rejected POs) and its result is never used on the page. `page:796`, `lib/queries/project-aggregates.ts:317-410`.
- **C-39** The project health score (`computeProjectHealth`: timeline 30% · budget 25% · issues 20% · momentum 15% · collection 10%; ≥70 "On Track", ≥50 "Needs Attention", else "At Risk"), `daysRemaining` and `openIssueCount` are computed on every render and never drawn. `page:1355-1379`, `lib/project-health.ts:21-103`.
- **C-40** Auto-promotion is a side effect of *viewing*: any member (a designer included) who opens a Draft project whose checks all pass changes its stage, with no one having pressed anything. `page:1570-1587`.
- **C-41** `GET /api/projects/records/{id}` checks only the studio, not the assignee: a designer who is not on the project can open it by URL, though lists hide it from them (the filter lives in the browser's app context) **[inferred — RLS policies not read]**. `app/api/projects/records/[id]/route.ts:34-44`, `context/app-context.tsx:135-143`.
- **C-42** Dead code in the frame: `handleQuoteTabUpload`, `quoteFileInputRef`, `isUploadingQuote`, `STATUS_OPTIONS`, `getPropertyTypes`, `MOCK_PROJECT_FILES`, `InfoRow`, and five task helper functions are defined and never used. `page:378`, `page:441-445`, `page:449-496`, `page:853-854`, `page:1525-1557`, `page:5021-5028`.

---

## 2. The header

### (1) What it is

- **C-43** One shared component, `SecondaryPageHeader`, with `sticky` and `actionsInline`; the page supplies the title, a meta line (`subtitle`), the actions and the tab strip. It passes no `badges`. `page:1630-1885`, `components/ui/secondary-page-header.tsx:31-44`.

### (2) Layout

- **C-44** A white band that bleeds to the content edges (negative margins matching the page gutters), 1px bottom border, 14px top padding, no bottom padding because the tab strip sits on the border. `components/ui/secondary-page-header.tsx:100-106`.
- **C-45** `sticky top-0 z-20`; a soft two-layer shadow (`0 2px 8px -2px rgba(0,0,0,.08), 0 1px 4px -2px rgba(0,0,0,.06)`) appears whenever the scroll container is not at the top. `components/ui/secondary-page-header.tsx:113-114`, `:86-90`.
- **C-46** Top row: left block (32px back button + crumb + title + meta) and, on the right, the actions, `items-start justify-between gap-3`, 14px below it before the tabs. `components/ui/secondary-page-header.tsx:125-130`, `:136-144`.
- **C-47** The tab strip is the header's last row, so tabs stay pinned with the header while the body scrolls. `components/ui/secondary-page-header.tsx:210-211`, `page:1871-1884`.

### (3) UI elements

- **C-48** Back: a 32×32 rounded button with a 16px left arrow, `aria-label="Go back"`; it always goes to `/projects` (`router.push`), not to where the user came from. `components/ui/secondary-page-header.tsx:137-143`, `page:1634`.
- **C-49** Crumb: the link "Projects" followed by "/" in 14px grey, hover purple; shown from 1024px up only. `components/ui/secondary-page-header.tsx:149-166`, `page:1633`.
- **C-50** Title: `<h1>` in the 20px / 24px bold heading style, holding "#{projectSeqId}" in 12px grey tabular figures and the project name, truncated with an ellipsis. `page:1646-1653`, `components/ui/secondary-page-header.tsx:172-174`, `app/globals.css:1069`.
- **C-51** `projectSeqId` is a per-studio running number stored on the project (`project_seq_id`, not null). `lib/transformers.ts:526`, `supabase/migrations/20260503000001_project_sequential_id.sql:28-47`.
- **C-52** Meta line (≥1024px, one wrapping row, 14px grey): a 13px person icon, the client name, "·", the link "View lead" with a 10px external-link icon (only when the project has a lead), "·", the project type or the literal fallback "Renovation", and "· {property type}" when set. `page:1684-1703`.
- **C-53** "View lead" goes to `/leads?openLead={leadId}` (the Leads page with that lead's drawer open) in the same tab, despite the external-link icon. `page:1690-1692`.
- **C-54** Action 1 — "Invite to Portal": outline (purple border and text), 32px high, 12px text, a 14px `UserPlus` icon; always shown ≥1024px; opens the Invite dialog. `page:1708-1715`.
- **C-55** Action 2 — "Photo Renders": grey-outline button with a purple sparkles icon, `aria-label="Open Photo Renders for this project"`; tooltip "Generate before/after photo renders to show the client what the space will look like."; opens the tool entry dialog. `page:1717-1733`.
- **C-56** Action 3 — "Plan the Space (3D)": grey-outline with a purple layers icon, `aria-label="Open Plan the Space (3D) for this project"`; tooltip "Build a 3D model of the space, place furniture, and walk the client through the design."; opens the tool entry dialog. `page:1734-1749`.
- **C-57** Action 4 — "Preview as Homeowner": grey-outline with a purple eye icon, `aria-label="Preview this project as the homeowner"`; tooltip "Open the homeowner portal in a new tab in read-only preview mode (30-minute session)."; rendered only when the platform page `tools/homeowner-portal` is enabled. `page:1758-1775`.
- **C-58** The three tooltips open after 200 ms, below the button, 12px text, max 240px wide, on the dark inverse surface. `page:1717`, `page:1730`, `components/ui/tooltip.tsx:37-38`.
- **C-59** Kebab (≥1024px): a 32×32 ghost button with a horizontal three-dot icon, `aria-label="More project options"`, rendered **only for Owner or Admin** (`canDeleteProject`). `page:1819-1830`, `page:655-657`.
- **C-60** Kebab menu (288px wide, no padding), two rich rows: "Close project" (green check-square icon; sub-line "Archive after handover. Records and portal stay intact (read-only).") shown only when stage is `Active`; and "Delete project" in red (trash icon; sub-line "Permanently remove the project and its records. Cannot be undone.") with a red-tinted hover. `page:1837-1866`.
- **C-61** Tab strip: "Overview" (clipboard-list icon) · "Management" (calendar) · "Finance" (receipt) · "Files & Docs" (open folder) · "Activity" (eye); underline variant, 14px medium, 16px horizontal / 10px vertical padding per tab, 14px icons, active tab purple with a 2px purple underline. `page:1872-1883`, `components/ui/sliding-tabs.tsx:86-131`.
- **C-62** "Management (n)": n = the project's tasks whose status is neither Completed nor Cancelled; the brackets are omitted at 0. Tasks come from the app context, which for a designer-only member holds only tasks assigned to them, so the count differs by viewer. `page:1878`, `page:1345-1348`, `context/app-context.tsx:1169-1174`.
- **C-63** "Finance (n)": n = the project's invoices whose status is not `paid` and not `void` (drafts included); omitted at 0. The Finance tab exists only when the platform page `finance/operations` is enabled. `page:1879`.

### (4) Interactions

- **C-64** Draft only: the title gains a 24×24 bordered pencil (`aria-label="Edit project name"`). Pressing it swaps the name for an underlined text field (focused, all selected) with "Save" and "Cancel" text buttons; Enter saves, Escape cancels. `page:1635-1644`, `page:567-631`.
- **C-65** Title validation: empty → "Project name is required."; same name (trimmed, case-insensitive) as another project in the studio → "A project with this name already exists."; a failed save → "Couldn't save — please try again."; errors show under the field in red with an alert icon and re-validate as the user types. `page:527-559`, `page:606-610`.
- **C-66** While saving, the field and both buttons disable and Save reads "Saving…"; an unchanged name just closes the editor. `page:536-558`, `page:584-604`.
- **C-67** Tab press: sets the active tab; the underline slides to the new tab; the body remounts with the enter animation; the URL updates in place. `page:1875`, `components/ui/sliding-tabs.tsx:96-102`.
- **C-68** "Close project" (kebab) opens the Closure dialog; "Delete project" opens the Delete dialog (§4). `page:1841`, `page:1855`.
- **C-69** "Preview as Homeowner" calls `window.open('/api/studio/preview-as-homeowner?projectId=…', '_blank', 'noopener')`; the server sets a 30-minute `homeowner_preview_session` cookie and redirects to `/my/projects/{id}?preview=1`. `page:1765`, `app/api/studio/preview-as-homeowner/route.ts:54-75`.
- **C-70** Keyboard: tabs are `role="tab"` with only the active one in the tab order (`tabIndex` 0 / −1) and **no arrow-key handler**, so the other tabs cannot be reached from the keyboard **[inferred]**. `components/ui/sliding-tabs.tsx:108-116`.

### (5) States — what changes with the project's state

- **C-71** Draft: the title is editable (pencil); the kebab has no "Close project"; Overview opens with the setup card. `page:1635`, `page:1838`, `page:1993-1994`.
- **C-72** Active: static title; the kebab offers "Close project" and "Delete project" — "Close project" stays even while a closure is pending review or was rejected. `page:1838-1852`.
- **C-73** Closed: static title; the kebab offers only "Delete project"; nothing in the header says the project is closed. `page:1838`, `page:1967-1968`.
- **C-74** Archived (`archivedAt` set): nothing on the detail page reads it — no banner, no chip, no Unarchive; unarchiving lives only on the Projects list (the one screen that uses `useUnarchiveProject`). `lib/transformers.ts:546`, `lib/queries/projects.ts:1045-1059`, `app/(main)/projects/page.tsx`.
- **C-75** Invited or not: the "Invite to Portal" button looks and reads the same whether or not a homeowner is already linked; only the toast after sending differs (§3). `page:1708-1715`, `components/homeowner/invite-dialog.tsx:212-216`.

### (6) Motion

- **C-76** Tab underline: `transition-[left,width] duration-300 ease-in-out`, enabled only after the first measurement so it does not slide in on load; tab label colour changes over 200 ms. `components/ui/sliding-tabs.tsx:96-101`, `:117`.
- **C-77** Header shadow fades in and out over 200 ms (`transition-shadow`). `components/ui/secondary-page-header.tsx:113`.
- **C-78** Buttons: 150 ms colour / border / shadow transitions and a press scale of 0.98. `components/ui/button.tsx:8`.
- **C-79** Menus and tooltips use tw-animate defaults: fade + zoom from 95% with a 2-unit slide from the trigger side. `components/ui/dropdown-menu.tsx:45`, `components/ui/tooltip.tsx:38`.

### (9) Responsive

- **C-80** Below 1024px the four action buttons and the desktop kebab are hidden; one 32×32 grey-outline "⋯" (`aria-label="Project actions"`) stays inline at the title's right. `page:1711`, `page:1723`, `page:1739`, `page:1764`, `page:1778-1788`, `page:1825`.
- **C-81** Its menu (240px): "Invite to Portal", "Photo Renders", "Plan the Space (3D)", "Preview as Homeowner" (same platform condition), then for Owner / Admin a separator, "Close project" (Active only) and "Delete project" in red — plain one-line items, without the desktop sub-lines. `page:1789-1817`.
- **C-82** Below 1024px the crumb is hidden and the meta line becomes two 12px lines: client + "View lead", then project type · property type, each truncated. `components/ui/secondary-page-header.tsx:149`, `page:1660-1682`.
- **C-83** Below 1024px the meta line disappears once the page has scrolled past 56px and returns under 12px (hysteresis), leaving "← title ⋯" plus the tabs. `components/ui/secondary-page-header.tsx:86-91`, `:186-191`.
- **C-84** The tab strip scrolls sideways with a hidden scrollbar, a 28px fade on whichever edge has more tabs, and scrolls the active tab into view (smooth after first paint). `components/ui/sliding-tabs.tsx:49-62`, `:76-93`.

### (10) Problems

- **C-85** No state in the header: stage, status, closure-pending, locked and archived are all invisible there; the list page's status has no counterpart on the record. `page:1630-1885`.
- **C-86** The meta line prints "Renovation" when the project has no type — an invented value presented as data. `page:1674`, `page:1696`.
- **C-87** The desktop kebab's two rows are raw `<button>`s inside the menu, not menu items: the menu does not close itself when one is pressed (the dialog opens over it) and arrow-key navigation skips them **[inferred]**. `page:1837-1865`.
- **C-88** "Close project" in the header is Owner / Admin only, while the "Close Project" button in Management › Milestones is shown to every role. `page:1819`, `page:2963-2980`.
- **C-89** "Invite to Portal" ignores the platform switch that hides "Preview as Homeowner" (`tools/homeowner-portal`). `page:1708-1715`, `page:1758`.
- **C-90** The external-link icon on "View lead" promises a new tab; it navigates away in the same one. `page:1690-1692`.
- **C-91** The title's duplicate-name rule is checked only in the browser against the loaded list of active projects; the server does not enforce it. `page:531`, `page:1640`, `app/api/projects/records/[id]/route.ts:110-124`.
- **C-92** A project's name can be changed only while it is Draft; there is no rename for an Active or Closed project on this page. `page:1635-1654`.

---

## 3. Page-level banners (between the header and the tab body, on every tab)

- **C-93** Handover lock — amber strip (`tertiary-yellow-variant2` fill, `variant1` border, 12px amber text, lock icon, `role="alert"`): "This project is handover-locked. Contact a studio admin to unlock for edits." Shown when `projectIsLocked` (C-20). `page:1890-1895`.
- **C-94** Signature request — amber strip (`role="status"`, file icon) shown only while the lead's latest signature request is `pending` or `viewed`: "Quote signing request pending client signature." or "Quote signing request viewed by client — awaiting signature.", with a right-aligned underlined link "Open signing portal" (external icon) to `/sign/{token}` in a new tab. A signed request shows nothing. `page:1905-1923`.
- **C-95** Escalation warning — red card (`tertiary-red-variant2` fill, 12px radius, 16px padding, warning triangle): "{n} open escalation(s)" in semibold and, under it, the subject of the first critical escalation (else the first). Condition: any of the project's escalations has priority critical or high. `page:1926-1938`.
- **C-96** **Problem:** the escalation banner cannot appear. The page filters escalations by `e.projectId`, and neither the `Escalation` type nor the server's transformer carries a project id (only the project's name), so the list is always empty. The same empty list is handed to the Closure dialog and the health score. `page:1351-1354`, `lib/transformers.ts:567-588`, `types/app.ts:405-427`, `app/api/escalations/records/route.ts:43-58`.
- **C-97** **Problem:** nothing in `src/` ever writes `handover_locked_at`, so the lock can only engage through "stage is Closed" with the studio flag on **[inferred from a grep of writers]**. `page:811-812`, `lib/transformers.ts:548`.
- **C-98** **Problem:** the lock banner promises "unlock for edits", but there is no unlock control anywhere on this page, and the Overview's four pencils and the Draft title edit ignore the lock (§6–§9). `page:1893`, `page:2085`, `page:2212`, `page:2390`, `page:2483`.
- **C-99** Homeowner response banner (`HomeownerResponseBanner`) is mounted only on the Management tab, above its sub-tabs: red "Homeowner requested a revision / {n} revisions" with up to three milestone rows, or a dismissible green "Homeowner approved a milestone / {n} milestones — most recent: {name}". It is not shown on Overview. `page:2596-2600`, `components/projects/homeowner-response-banner.tsx:79-145`.
- **C-100** **Problem:** that banner's rows are buttons meant to open the milestone, but the page passes no `onMilestoneClick`, so pressing a row does nothing. `page:2598`, `components/projects/homeowner-response-banner.tsx:96-100`.

---

## 4. Dialogs the header opens

### 4a. Invite to Portal

- **C-101** A centred dialog (max 448px): a purple-tinted 32px tile with `UserPlus`, title "Invite to Portal", description "Invite a homeowner to track **{project name}** in their portal." `components/homeowner/invite-dialog.tsx:233-245`.
- **C-102** Field "Homeowner Name" (placeholder "e.g. John Tan"), prefilled with the project's client name. `components/homeowner/invite-dialog.tsx:249-259`, `page:4767`.
- **C-103** Field "Phone Number": a 100px country-code select (flag + dial code for each supported country) and a telephone input with a per-country placeholder; digits only, cut at the country's maximum length; changing the country clears the number. Helper: "WhatsApp opens with a ready-to-send message containing their portal login link." `components/homeowner/invite-dialog.tsx:262-293`, `:145-149`.
- **C-104** The phone is prefilled from the project's own `customerPhone` only, with country detection from its prefix. `page:4768`, `components/homeowner/invite-dialog.tsx:43-52`.
- **C-105** A boxed row "Show chat history" with a hand-rolled switch (on by default, purple): "Homeowner can see messages from before they joined" / "Homeowner only sees messages after invite"; the eye icon swaps to a struck eye when off. `components/homeowner/invite-dialog.tsx:296-329`.
- **C-106** A boxed, monospace, selectable portal link (`{origin}/my/{studio slug}/login`, or `/my/login` until the slug loads) with "Copy Link" → "Copied" (green check) for 2 s and the toast "Portal link copied to clipboard" (failure: "Failed to copy link"). `components/homeowner/invite-dialog.tsx:128-143`, `:337-354`.
- **C-107** Footer: "Cancel" and the primary "Send via WhatsApp" (message icon), equal widths; while working the primary reads "Preparing…" with a spinner and both disable. `components/homeowner/invite-dialog.tsx:370-392`.
- **C-108** Validation on send: empty name → "Name is required"; missing or invalid number → the country's message or "Valid phone number is required"; the error prints in red under the switch row and the phone field gets a red border. `components/homeowner/invite-dialog.tsx:157-166`, `:285`, `:332-334`.
- **C-109** Send: a blank tab is opened inside the click (so the browser does not block it), then `POST /api/homeowner/invite` `{ projectId, name, phone (E.164), chatHistoryVisible }`; on success the tab is pointed at `https://wa.me/{digits}?text={message}` and the dialog closes. `components/homeowner/invite-dialog.tsx:173-217`.
- **C-110** Toast on success: "Portal link ready — opening WhatsApp for {name}", or, when the homeowner was already linked and active, "{name} is already invited — opening WhatsApp to resend the link". `components/homeowner/invite-dialog.tsx:212-216`.
- **C-111** If the pop-up was blocked: toast "Pop-up blocked — tap “Open WhatsApp” below to send the invite." and a full-width purple "Open WhatsApp" link appears in the dialog. `components/homeowner/invite-dialog.tsx:218-222`, `:357-367`.
- **C-112** Server: finds or creates the studio's `homeowner_profiles` row by phone (updating the name), then creates / re-activates / updates the `homeowner_project_links` row (role `owner`, a new `portal_token`, `chat_history_visible`), and creates a non-internal `conversations` row "{name} – {project}" if the project has none. `app/api/homeowner/invite/route.ts:214-354`.
- **C-113** The WhatsApp text the server returns: "Hi {name}! {studio name} has invited you to track your project "{project name}" on the mAIson portal. Log in here: {portal login URL}". No SMS is sent; the designer sends from their own WhatsApp. `app/api/homeowner/invite/route.ts:363-382`.
- **C-114** Server errors surface in the dialog: "Project not found" (404), "name, phone, and one of projectId/leadId are required" (400), "Internal server error" (500), or the client's "Something went wrong. Please try again." There is no role check — any signed-in member may invite. `app/api/homeowner/invite/route.ts:13-24`, `:210-212`, `:383-386`, `components/homeowner/invite-dialog.tsx:197-226`.
- **C-115** **Problems:** the phone is not prefilled when it lives only on the lead (the Customer card shows that number "from lead"); the project's country is not passed, so the dial code falls back to the studio's country; and the resend case gives no sign, before sending, that this person is already invited. `page:4762-4769`, `page:2239-2247`, `components/homeowner/invite-dialog.tsx:68-72`.

### 4b. Photo Renders / Plan the Space (3D) — the tool entry dialog

- **C-116** One dialog for both buttons (max 512px): a purple-tinted 28px icon tile + the title "Photo Renders" or "Plan the Space (3D)". `components/projects/tool-entry-dialog.tsx:96-103`, `:37-50`.
- **C-117** Description with nothing saved: "Generate before/after renders to show the client what their space will look like." / "Build a 3D model of the space, place furniture, and walk the client through the design."; with saved items: "Pick up where you left off — {n} existing render(s)/layout(s) on this project — or start fresh." `components/projects/tool-entry-dialog.tsx:104-108`.
- **C-118** While counting: a small spinner and "Checking for existing renders…" / "…layouts…". `components/projects/tool-entry-dialog.tsx:112-116`.
- **C-119** Layouts: up to five existing plans in a bordered list — name and "Updated {d MMM yyyy}" with an arrow; pressing one opens `/tools/floor-plan?projectId=…&planId=…`. `components/projects/tool-entry-dialog.tsx:118-136`, `:77-82`.
- **C-120** Renders: one row "Open Visualizer with {n} past render(s)" · "Filed in `Renders` on this project", which opens `/tools/ai-visualizer?projectId=…&leadId=…` — the same address as starting fresh. `components/projects/tool-entry-dialog.tsx:138-159`, `:84-90`.
- **C-121** Always: a dashed row with a purple plus tile — "Generate a new render" / "Start a new 3D layout" · "Project context is pre-filled — no need to pick it again." — tinted purple when it is the only choice; footer "Cancel". `components/projects/tool-entry-dialog.tsx:161-192`.
- **C-122** Both tools are separate full pages; pressing a row closes the dialog and leaves the project. `components/projects/tool-entry-dialog.tsx:72-75`.
- **C-123** **Problem:** "Open Visualizer with n past renders" does not load those renders (the code comment says the visualizer cannot re-load them); and with nothing saved the dialog is an extra press before the only possible action. `components/projects/tool-entry-dialog.tsx:84-90`, `:161-185`.

### 4c. Preview as Homeowner

- **C-124** No dialog: a new tab. The route needs only a studio session and a project in that studio (no role check); failures come back as raw JSON in the new tab (e.g. `{"error":"Project not found or not in your studio"}`). `app/api/studio/preview-as-homeowner/route.ts:24-52`.
- **C-125** The preview is read-only by enforcement: homeowner mutation routes refuse a preview session with 403 (per the route's header comment; those routes were not read). `app/api/studio/preview-as-homeowner/route.ts:12-13`, `page:1750-1757`.

### 4d. Delete project (Owner / Admin)

- **C-126** Dialog "Delete project?" with a warning triangle: "This will permanently delete **{name}**, its milestones, quote data, and files. Conversations, tasks, and escalations linked to it will be kept but unlinked. This action cannot be undone." Buttons "Cancel" and a destructive "Delete" ("Deleting…"). `components/projects/confirm-delete-project-dialog.tsx:121-155`.
- **C-127** Server (`POST /api/projects/{id}/delete`): 401 without a session, 404 / 403 for another studio's project, 403 "Owner or admin role required" for anyone else. `app/api/projects/[id]/delete/route.ts:24-68`.
- **C-128** The server counts rows for the project in ten tables — `project_invoices`, `purchase_orders`, `variation_orders`, `expenses`, `commission_entries`, `commission_rules`, `finance_documents`, `journal_lines`, `commission_change_requests`, `client_portal_tokens` — and refuses with 409 `has_financial_activity` if any exist. `app/api/projects/[id]/delete/route.ts:6-17`, `:70-88`.
- **C-129** Otherwise the `projects` row is deleted; cascades remove milestones, quotes, files, rooms, progress updates and homeowner links, and null the link on conversations, escalations, tasks, floor plans and render jobs. `app/api/projects/[id]/delete/route.ts:90-97`.
- **C-130** On 409 the dialog becomes "Archive instead?" (archive icon): "**{name}** has financial activity ({n table name, …}) and can't be permanently deleted. Archiving hides it from the active projects list — you can unarchive it later." Buttons "Cancel" and "Archive project" ("Archiving…"). `components/projects/confirm-delete-project-dialog.tsx:83-118`.
- **C-131** Archive (`POST /api/projects/{id}/archive`, Owner / Admin) sets `archived_at` and runs a shared cascade over the project's open tasks and their queued due reminders (the cascade's body was not read; it reports `tasksCancelled` / `remindersCancelled`). `app/api/projects/[id]/archive/route.ts:1-6`, `:41-67`, `lib/lifecycle/transitions.ts:312-319`.
- **C-132** After a delete or an archive the user is sent to `/projects`; failures print the server's message in the dialog. There is no success toast and no Undo. `components/projects/confirm-delete-project-dialog.tsx:41-72`.
- **C-133** **Problems:** the activity summary prints raw table names with fixed plurals ("3 project invoices, 1 purchase orders, 2 client portal tokens"); the icon and error colours use classes `text-tertiary-red-default` / `text-tertiary-yellow-default`, which are not defined tokens, so they render uncoloured **[inferred]**; an invited homeowner alone (a portal token) blocks deletion. `components/projects/confirm-delete-project-dialog.tsx:84-87`, `:94`, `:103`, `:126`, `app/globals.css:85-106`.
- **C-134** **Problem:** two ideas share one word — the kebab calls Close "Archive after handover" (stage → Closed, record kept), while "Archive project" here sets `archived_at` and hides the project from lists. `page:1849`, `components/projects/confirm-delete-project-dialog.tsx:95-100`.

### 4e. Close project

- **C-135** The kebab's "Close project", the Management card's "Close Project" and the rejected-closure banner's "Resubmit" all open the same page-level `ClosureDialog`, fed the project, its invoices, credit notes, POs, VOs and the (always empty, C-96) escalations; submitting calls `PATCH …/closure {action:"submit"}` and creates a "Review and approve project closure" task for the owner. Internals belong to another reader. `page:4782-4798`, `lib/queries/projects.ts:831-912`.

---

## 5. Overview — frame and the state-dependent top slot

### (2) Layout

- **C-136** Overview is `space-y-6`: an optional closure banner, an optional top card, then a grid `grid-cols-1 lg:grid-cols-12 gap-6` with the main column `lg:col-span-7 space-y-6` and the side column `lg:col-span-5 space-y-5`. Below 1024px everything is one column, main first. `page:1945`, `page:2003-2005`, `page:2504`.
- **C-137** Cards share one look: white, 1px `surface-variant` (#E6E6E6) border, 16px radius, small shadow, 20px padding, a 14px semibold heading-font title. `page:2035`, `page:2039`, `components/projects/financial-summary-card.tsx:392-398`.
- **C-138** Main column order: Financial Summary → Project Info → Project Team (Owner / Admin) → Customer | Property side by side → Key Files → Notes. Side column: Meeting Summary → Progress Updates → Activity. `page:2007-2500`, `page:2506-2581`.

### (5) States — the top slot

- **C-139** Closure pending or rejected: `ClosureReviewBanner` first. Pending (amber card, triangle): owner sees "Project closure pending your review" / "Review the summary below and approve or reject."; others see "Closure submitted — awaiting approval" / "The studio owner will review and approve the closure." `page:1950-1957`, `components/projects/closure-review-banner.tsx:17-37`.
- **C-140** Rejected (red card, X-circle): "Closure rejected", "Reason: {comment}" when given, and an outline "Resubmit" button for everyone, which reopens the Closure dialog. `components/projects/closure-review-banner.tsx:40-62`, `page:1955`.
- **C-141** Closed with a summary: `ClosureSummaryCard` ("Project Closed", green header). Pending / rejected with a summary: the same card titled "Closure Pending Review" / "Closure Rejected"; the **owner only** gets inline Approve and Reject (Reject asks for a comment). `page:1967-1992`, `components/projects/closure-summary-card.tsx:25-31`, `:142-175`.
- **C-142** Approve asks through the browser's native `confirm("Approve this closure? The project will move to the Closed stage.")`, then toasts "Closure approved"; Reject toasts "Closure rejected — submitter has been notified". `page:1975-1991`.
- **C-143** Draft: `DraftSetupCard` (below). Active with no closure in flight: nothing in the top slot — attention lives inside Financial Summary. `page:1993-1995`.

### The Draft setup card

- **C-144** Card header: a 36px purple-tinted circle with sparkles, "Set up this project", "Finish the remaining steps to move this project to Active and unlock invoicing, payments, and commission.", and "{done} of {total} complete" at the right. `components/projects/draft-setup-card.tsx:43-56`.
- **C-145** A 4px progress bar in purple, width = done/total, animating its width over 300 ms. `components/projects/draft-setup-card.tsx:59-64`.
- **C-146** Five rows with a green check-circle (done, text struck through and grey) or an empty grey circle (medium weight): "Designer assigned" · "Quote added" · "Contract uploaded" · "Project timeline created" · "Commission structure". `components/projects/draft-setup-card.tsx:67-90`, `components/projects/setup-progress.tsx:24-57`.
- **C-147** Rules: designer = `assignedTo` set; quote = `quoteStatus` set and not `none`; contract = a contract file name **or** `quoteStatus === "client_signed"` **or** a fully signed e-signature on the lead; timeline = at least one milestone; commission = `commissionLocked` **or** the studio's commission approval is off. `components/projects/setup-progress.tsx:25-56`.
- **C-148** Only "Quote added" has an inline fix: the link "Add quote →" to `/projects/{id}/quotes/new`. `components/projects/setup-progress.tsx:26-30`, `components/projects/draft-setup-card.tsx:81-88`.
- **C-149** Footer, right-aligned on a grey band: the primary "Complete setup →", which opens `DraftSetupWizard` (a stepped dialog over the incomplete steps; its last step sets the stage to Active). `components/projects/draft-setup-card.tsx:94-109`, `components/projects/draft-setup-wizard.tsx:83-116`.
- **C-150** The card has no all-done state: when every check passes the page's own effect activates the project and the card unmounts. `components/projects/draft-setup-card.tsx:21-24`, `page:1570-1587`.
- **C-151** **Problem:** the wizard maps check labels to steps by exact text and still expects "Payment schedule defined"; the check is now "Project timeline created", so that step is dropped. If the timeline is the only open step the wizard renders nothing and "Complete setup" appears dead; otherwise the wizard's last step activates the project with the timeline check still open **[inferred]**. `components/projects/draft-setup-wizard.tsx:60-68`, `:84-89`, `:118-121`, `components/projects/setup-progress.tsx:50`.
- **C-152** **Problem:** a Draft project shows the same gaps twice — in the setup card and again as blue "suggested" issues inside Financial Summary ("No designer assigned", "Quote not added"), each with its own, different link. `page:1993-1994`, `lib/financial-issues.ts:294-320`.

---

## 6. Financial Summary card

### (1) What it is

- **C-153** The first card of the main column, rendered only once the financial summary query has data; while it loads or if it fails there is no card, no skeleton and no error. `page:2007-2033`.
- **C-154** It receives the summary, the milestone progress %, the project's `quoteData` lines, the project's country, the project and an `onIssueAction` hook; it fetches the project's POs itself. `page:2008-2014`, `components/projects/financial-summary-card.tsx:316-318`.

### (2) Layout

- **C-155** Head: a 32px amber-tinted rounded tile with a 16px dollar icon, then "Financial Summary". `components/projects/financial-summary-card.tsx:394-399`.
- **C-156** Under the head, in order: the attention block (banner, then counts strip), then three rows of figures — Contract Value | Collected (always two columns, 16px gap); Expected Profit | Actual Profit (two columns from 640px, stacked below); Remaining | Margin Δ vs expected (always two columns). `components/projects/financial-summary-card.tsx:408-421`, `:424`, `:477`, `:495`.
- **C-157** The card's height is bounded: at most one banner and one strip line whatever the number of issues. `components/projects/financial-attention-block.tsx:20-22`.

### (3) UI elements — the attention block

- **C-158** Banner (the single top open issue): 12px/8px padding, 8px radius, 1px border, a 14px icon, an 11px semibold title, an optional 10px detail line, and a right-aligned 10px semibold text button "{CTA label} →". `components/projects/financial-attention-block.tsx:166-187`.
- **C-159** Banner tones by severity — **critical**: red tint (#FBEBEA fill, #F8D7D4 border, #AF2D22 text, red alert-circle); **pending**: amber tint with a triangle; **action-pending**: purple tint (#EEE5FF) with an alert-circle; **suggested**: blue tint (#EDEEF7, text #3E4690); **resolved**: green tint with a check-circle; **audit**: grey with a check. `components/projects/financial-attention-block.tsx:32-69`, `app/globals.css:55-106`.
- **C-160** Counts strip (grey band, 8px radius, 11px text): "{n} finance issue(s) open" — semibold red when n > 0, disabled grey at 0 — "·" "{n} resolved" (grey; disabled at 0) and, only when present, "· {n} audit"; right-aligned "View all ›" in purple 10px. `components/projects/financial-attention-block.tsx:200-252`.
- **C-161** Empty (no issues of any kind): one grey band with a green check — "No financial issues — all metrics are in balance." — replaces both banner and strip. `components/projects/financial-attention-block.tsx:95-104`.
- **C-162** Drawer (right-side sheet, full width on phones, max 448px from 640px): title "Financial attention", description "Everything affecting this project's financials, grouped by status.", then sections "Open · n" (label in red), "Resolved · n", "Audit · n", each a stack of rows in the banner's style with the same CTA. `components/projects/financial-attention-block.tsx:122-145`, `:256-316`.
- **C-163** Drawer empty hint (inbox icon): "No open issues — you're caught up." `components/projects/financial-attention-block.tsx:140-142`.

### (3) UI elements — the issue kinds (title · detail · CTA · severity)

- **C-164** *variance* (one per non-void invoice with an unresolved variance): "Variance on {invoice no.}: +/−{amount}" · "Billed above the milestone's expected amount." / "Billed below the milestone's expected amount." · "Resolve" · critical when the variance exceeds 5% of the contract value, else pending. `lib/financial-issues.ts:116-142`.
- **C-165** *collection-trailing*: "Collection trailing progress by {gap}%" · "Consider milestone billing to catch up." · "Bill milestone" → `?tab=finance` · shown when progress % − collection % ≥ 15; critical at ≥ 30, else pending. `lib/financial-issues.ts:144-157`.
- **C-166** *overdue-invoice* (unpaid, non-void, past due date): "{invoice no.} overdue by {n} day(s)" · "Due {d MMM} · {balance} outstanding" · "Chase" → `?tab=finance` · critical after 7 days, else pending. `lib/financial-issues.ts:160-175`.
- **C-167** *draft-invoice* (a draft that is not overdue): "{invoice no.} sitting in draft" · "Review and send to the client." · "Review" → `?tab=finance` · action-pending. `lib/financial-issues.ts:176-189`.
- **C-168** *po-rejected* (PO status `rejected` / `vendor_rejected`): "Vendor rejected {PO no.}" · "{vendor} declined or asked for changes." / "Vendor declined or asked for changes." · "Review" → `?tab=finance` · critical within a day of the rejection, else pending. `lib/financial-issues.ts:193-212`.
- **C-169** *overdue-po* (expected delivery passed, not fulfilled, not cancelled / closed): "{PO no.} delivery overdue by {n} day(s)" · "Vendor: {name}" / "Delivery past expected date." · "Follow up" → `?tab=finance` · critical after 7 days, else pending. `lib/financial-issues.ts:213-232`.
- **C-170** *cost-overrun* (committed POs + expenses > contract value): "Costs are exceeding contract value by {amount}" · "Committed POs + expenses are above the signed contract. Raise a VO or trim scope." · "Review costs" → `?tab=finance` · always critical. `lib/financial-issues.ts:235-251`.
- **C-171** *margin-slippage* (expected margin − actual cash margin ≥ 10 points): "Margin running {x}pp under expected" · "Expected {a}% · actual {b}%. Costs are creeping up." · "Open costs" → `?tab=finance` · critical at ≥ 20, else pending. `lib/financial-issues.ts:253-271`.
- **C-172** *overdue-milestone* (end date passed, status not `completed` and not `pending-approval`): "{milestone} overdue by {n} day(s)" · "Expected completion: {raw end date, e.g. 2026-09-16}" · "Open Gantt" → `?tab=management` · critical after 7 days, else pending. `lib/financial-issues.ts:273-292`.
- **C-173** *setup-designer* (Draft, no designer): "No designer assigned" · "Assign a designer to activate this project." · "Assign" → `?tab=details` · suggested. `lib/financial-issues.ts:295-307`.
- **C-174** *setup-quote* (Draft, no quote): "Quote not added" · "Upload a quote to define project scope and budget." · "Upload quote" → `?tab=finance` · suggested. `lib/financial-issues.ts:308-319`.
- **C-175** *variance-resolved* (roll-up of resolved variances, non-zero): "Resolved: +/−{amount} absorbed via VO / rebalance / top-up" · no CTA · severity resolved (the only thing that ever fills the "resolved" count). `lib/financial-issues.ts:322-332`.

### (3) UI elements — the six figures

- **C-176** Every figure has a 10px uppercase grey label with a 10px ⓘ icon and a 16px bold tabular value; hovering the label opens a tooltip above it (200 ms delay, max 280px, the formula in 11px monospace, an optional grey note). `components/projects/financial-summary-card.tsx:38-55`, `:74-86`.
- **C-177** CONTRACT VALUE — value in near-black; caption "From signed quote · {n} line item(s)" plus " · includes +{amount} VOs" when client VOs are non-zero, or "From project budget · no signed quote yet". `components/projects/financial-summary-card.tsx:425-436`.
- **C-178** Its tooltip (quote): "**Contract Value** = signed primary quote total + approved client variation orders." / "Updates automatically when a VO is approved or the quote is re-signed." `components/projects/financial-summary-card.tsx:438-445`.
- **C-179** Its tooltip (budget): "**Contract Value** = the agreed total amount with the client." / "Pulled from the project budget — no signed quote exists yet. Once a quote is signed, this number switches to the quote total (+ approved VOs)." `components/projects/financial-summary-card.tsx:446-454`.
- **C-180** COLLECTED — green when above zero, grey at zero; tooltip "**Collected** = total of every payment recorded against this project's invoices." / "Updates as you record payments in Finance → Invoices." `components/projects/financial-summary-card.tsx:457-471`.
- **C-181** EXPECTED PROFIT, unknown: a dashed, faintly grey box — the label, "— no quote yet" or "— needs cost data" (hover title "Cost data missing on {m} of {n} line items"), and a purple link with a book icon, "Upload quote →" (goes to `/finance/operations`) or "Open Price Book →" (goes to `/finance/price-book`). `components/projects/financial-summary-card.tsx:127-149`, `:483`.
- **C-182** EXPECTED PROFIT, known: the amount (green if ≥ 0, red if negative) and "{x.x}% margin" in 11px grey. `components/projects/financial-summary-card.tsx:151-166`.
- **C-183** Its tooltip: "**Expected profit = Expected revenue − Expected cost**" / "• Expected revenue = sum of (price × quantity) for every line in the approved quote" / "• Expected cost = sum of (vendor / labour cost × quantity) for the same lines" / "Tells you the profit you should make if the project lands on quote." Note: "**Where does cost data come from?** The Price Book stores your vendor and labour costs per item. When a quote line is linked to a Price Book item, its cost auto-fills. Manually-added lines with no Price Book reference have no cost on file and won't contribute to expected profit until you fill the cost in." `components/projects/financial-summary-card.tsx:105-125`.
- **C-184** ACTUAL PROFIT, before any payment: a dashed box — the label and "— appears after the first payment". `components/projects/financial-summary-card.tsx:216-239`.
- **C-185** ACTUAL PROFIT, after a payment: two lines — "CASH BASIS" with a 16px bold amount and its margin %, then under a hairline "INCL. COMMITMENTS" with a 14px semibold amount and its margin %; each green if ≥ 0, red if negative. `components/projects/financial-summary-card.tsx:247-301`.
- **C-186** Its tooltip opens with "Profit you're realizing on the project so far. Once payments come in we show two views side by side:" (empty) or "Profit you're realizing on the project, shown two ways — pick whichever matches how you think about the business:" then: "**Cash basis** = Money received − Money actually paid out" / "• Money received = collected payments" / "• Money paid out = approved expenses + payments already made against POs" / "Reflects only what's genuinely moved through the bank account so far." `components/projects/financial-summary-card.tsx:184-196`, `:223-262`.
- **C-187** …and: "**Including commitments** = Money received − Money paid + still owed to vendors" / "• Includes the full subtotal of every active PO, even ones not yet paid" / "More conservative — assumes every open PO will be fully paid out, so you don't get surprised when the invoices land." Note: "**Cost data:** these numbers depend on you logging expenses and PO payments against this project. The Price Book pre-populates vendor costs on POs to make this faster." `components/projects/financial-summary-card.tsx:197-214`.
- **C-188** REMAINING — near-black; amber only when negative; tooltip "**Remaining** = Contract value − Money collected so far." / "Money still owed by the client. A negative number means you've been overpaid against the original contract." `components/projects/financial-summary-card.tsx:496-512`.
- **C-189** MARGIN Δ VS EXPECTED, known: a trending-up (green) or trending-down (red) icon and "+x.x%" / "−x.x%"; tooltip "**Δ** = Actual margin (cash basis) − Expected margin from quote." / "Positive means you're running better than quoted; negative means you're slipping. Useful as an early warning when costs are creeping up mid-project." Note: "Shown once you've quoted with cost data on every line item and received at least one payment." `components/projects/financial-summary-card.tsx:513-537`.
- **C-190** MARGIN Δ, unknown: a grey "—"; tooltip first line as above, then "We need both numbers before we can compare them." and one of: "Add cost data on your quote line items and record at least one payment to see this." / "Add cost data on every quote line item — the Price Book makes this fast." / "Waiting for the first payment to compute your actual margin." `components/projects/financial-summary-card.tsx:538-561`.

### (4) Interactions

- **C-191** Pressing a count in the strip opens the drawer showing only that bucket; "View all" shows every bucket; a zero count is disabled. `components/projects/financial-attention-block.tsx:203-250`, `:131-139`.
- **C-192** A CTA first asks the page (`onIssueAction`); if the page does not claim it, the browser goes to the issue's address with `window.location.assign` — a full page reload, even for a tab of the project already open. `components/projects/financial-attention-block.tsx:156-165`, `:286-292`.
- **C-193** The page claims only variance issues: it looks up the invoice and its milestone and sets `overviewVarianceTarget`, intending to open the Variance Resolution wizard in place. `page:2015-2031`.
- **C-194** The drawer closes with its X, the overlay or Escape (sheet defaults); it does not close when a CTA navigates because the page reloads. `components/projects/financial-attention-block.tsx:122`.

### (7) Rules and logic

- **C-195** Sorting: by severity (critical → pending → action-pending → suggested → resolved → audit), then by date, newest first; the date is the invoice's update time, the invoice due date, the PO's delivery date or the milestone's end date. The first open item is the banner. `lib/financial-issues.ts:51-58`, `:79-85`, `components/projects/financial-attention-block.tsx:85-87`.
- **C-196** Buckets: "open" = every severity except resolved and audit — so draft invoices and Draft-setup nudges count as open "finance issues". `lib/financial-issues.ts:341-355`.
- **C-197** Contract value is resolved on the server by one function: (1) the latest `client_signed` non-variation quote with a positive total (latest by `signed_at`, older rows by `updated_at`); else (2) the primary quote whose status is `sent_for_signature` or `approved`; else (3) `budget_total` × 100; else 0. `lib/finance/contract-value.ts:65-113`.
- **C-198** To that base it adds the net of approved client-direction variation orders (omissions are negative), and floors the result at 0. `lib/finance/contract-value.ts:69-84`, `lib/finance/contract-loader.ts:52-56`.
- **C-199** Quotes are read by lead **or** project; VO rows count when `vo_direction` is null, `client` or `client_positive`; the quote total is the final incl-GST, incl-discount figure and is shown as is. `lib/finance/contract-loader.ts:35-37`, `:74-78`, `lib/finance/contract-value.ts:17-23`.
- **C-200** The browser collapses the source to two labels: `signed` or `primary` → "quote"; `budget` or `none` → "budget". `lib/queries/project-aggregates.ts:186-187`.
- **C-201** Collected = Σ `payment_records.amount` for the project's invoices; billed = Σ invoice totals; collection % = round(collected ÷ billed × 100), 0 when nothing is billed. `lib/queries/project-aggregates.ts:149-150`, `:206-208`.
- **C-202** Remaining = contract value − collected. `components/projects/financial-summary-card.tsx:387`.
- **C-203** Expected profit: over the project's `quoteData` lines, revenue = Σ round((`total` or `unitPrice × qty`) × 100) and cost = Σ round(`costPrice × qty` × 100); it is known **only if every line has a cost above zero**; expected margin = profit ÷ revenue × 100. `components/projects/financial-summary-card.tsx:337-365`.
- **C-204** Actual profit exists only when collected > 0. Cash cost = approved expenses (amount + GST) + PO payments made; commitment cost = approved expenses + Σ subtotals of POs not cancelled / rejected / draft / vendor-rejected. Profit = collected − cost; margin = profit ÷ collected × 100. `components/projects/financial-summary-card.tsx:367-377`, `lib/queries/project-aggregates.ts:165-170`, `app/api/project-aggregates/financial-summary/route.ts:63-79`.
- **C-205** Margin Δ = cash margin − expected margin, when both exist. `components/projects/financial-summary-card.tsx:379-382`.
- **C-206** Progress % (also the Project Info ring): payment-weighted — completed milestones count their payment % in full, in-progress ones half, the rest nothing, divided by the total weight; with no payment %s it is (completed + ½ in-progress) ÷ milestone count; rounded; 0 with no timeline. `lib/project-progress.ts:28-57`.
- **C-207** Amounts are formatted with the project's country currency (falling back to the studio's). `components/projects/financial-summary-card.tsx:320`.

### (8) Data

- **C-208** `GET /api/project-aggregates/financial-summary?projectId=` reads `projects`, `project_invoices`, `payment_records`, approved `variation_orders`, `purchase_orders.subtotal_cents`, `po_payments`, approved `expenses`, `quotes`, `leads.quote_metadata` (GST toggle) and issued `credit_notes` of source `vo_rebalance`; a session is the only requirement. `app/api/project-aggregates/financial-summary/route.ts:25-148`.
- **C-209** `GET /api/project-aggregates/quote-line-count?quoteId=` supplies the "n line items" in the caption. `lib/queries/project-aggregates.ts:197-203`.

### (9) Responsive

- **C-210** Only the profit row stacks (below 640px); the drawer is a full-width right sheet on a phone (the file's header comment says "bottom sheet on mobile", which is not what is built). `components/projects/financial-summary-card.tsx:477`, `components/projects/financial-attention-block.tsx:16-18`, `:123`.

### (10) Problems

- **C-211** "Resolve" on a variance issue does nothing visible from Overview: the page claims the press and sets its target, but the Variance Resolution wizard is mounted inside the Finance tab's block, which is not rendered on Overview; the wizard then springs open the next time the user enters Finance **[inferred]**. `page:2020-2028`, `page:3271`, `page:3999-4007`.
- **C-212** The banner is not the worst issue: ties within a severity go to the newest date, so among overdue milestones the *least* overdue leads (the owner's screenshot: banner "overdue by 20 days", Upcoming Milestones "108d overdue"). `lib/financial-issues.ts:79-85`, `:289`.
- **C-213** The strip says "finance issues" for a list that includes overdue milestones, PO deliveries and setup nudges. `components/projects/financial-attention-block.tsx:214`, `lib/financial-issues.ts:1-11`.
- **C-214** Every CTA is a full reload to the tab's default view: "Chase", "Review", "Follow up" land on Finance › Overview rather than on the invoice or PO, although the page supports `sub=invoices&focus={id}`. `lib/financial-issues.ts:170-172`, `:183-185`, `page:706-712`.
- **C-215** "Assign" reloads the Overview the user is already on (`?tab=details`), and nothing there is highlighted. `lib/financial-issues.ts:303-305`.
- **C-216** The milestone detail prints the stored date raw ("Expected completion: 2026-09-16"), while invoices use "16 Sep" and Upcoming Milestones "Sep 16". `lib/financial-issues.ts:285`, `:169`, `page:232`.
- **C-217** Day counts round up from the timestamp, and a date-only value is read as UTC midnight: on the due date itself (after 08:00 in Singapore) the banner already says "overdue by 1 day" while Upcoming Milestones says "due today" **[inferred]**. `lib/financial-issues.ts:277-279`, `page:177-181`.
- **C-218** "From signed quote" and its tooltip are shown whenever the source is a quote — including a primary quote that is only sent for signature or approved, i.e. not signed. `components/projects/financial-summary-card.tsx:433-445`, `lib/queries/project-aggregates.ts:186-187`.
- **C-219** Two sources for "the quote": the contract value and its line count come from the `quotes` tables; expected profit counts lines from the project row's `quote_data` copy, so "104 line items" and "cost data missing on m of n" can disagree **[inferred]**. `page:2011`, `lib/queries/project-aggregates.ts:197-203`, `components/projects/financial-summary-card.tsx:337-360`.
- **C-220** The two profit tiles format with the studio's currency, the rest of the card with the project's — a mismatch for a studio working in more than one country. `components/projects/financial-summary-card.tsx:152`, `:243`, `:320`.
- **C-221** "Including commitments = Money received − Money paid + still owed to vendors" reads as an addition; the sum actually subtracts expenses and the full PO subtotals. Subtotals are pre-tax while the cash line uses payments made, so the "more conservative" figure can come out higher **[inferred]**. `components/projects/financial-summary-card.tsx:199`, `:368-369`.
- **C-222** With no quote the Expected Profit link says "Upload quote" under a book icon and goes to the studio-wide Finance › Operations page, not to this project's quote; a designer cannot open that page at all. `components/projects/financial-summary-card.tsx:143-145`, `:483`, `lib/access-control.ts:111`.
- **C-223** The tooltips hang on non-focusable `<div>`s with a help cursor: hover only, nothing for keyboard or touch. `components/projects/financial-summary-card.tsx:42-47`.
- **C-224** "audit" is a styled severity with its own count and drawer section that no rule ever produces; the "No open issues — you're caught up." hint is unreachable because the button that would show it is disabled at zero. `lib/financial-issues.ts:26-32`, `components/projects/financial-attention-block.tsx:140-142`, `:210`.
- **C-225** No role gate: contract value, profit and margin are shown to every member who can open the project, designers included; the route needs only a session. `page:2007-2033`, `app/api/project-aggregates/financial-summary/route.ts:26-27`.
- **C-226** Financial Summary and the Draft cards sit above Project Info, so a brand-new project opens on money figures that are all empty. `page:2005-2035`.

---

## 7. Project Info card

### (3) UI elements — read view

- **C-227** Head: "Project Info" and, at the right, a 32×32 pencil button (13px icon, grey, purple tint on hover, `title="Edit project info"`). `page:2083-2102`.
- **C-228** Left: an 80px progress ring — a 6px grey track and a 6px purple arc with round ends, starting at 12 o'clock, the percentage in 14px bold at the centre, the caption "Progress" (11px grey) underneath. `page:2105-2116`.
- **C-229** Right: three cells in a row from 640px (stacked below), each an 11px uppercase grey label with an 11px icon and a 14px semibold value. `page:2118`.
- **C-230** Cell 1, when a quote backs the contract value: "CONTRACT VALUE" (dollar icon), the amount, and a 10px caption "From quote" + " · Budget {amount}" when a budget above zero exists. Otherwise: "BUDGET" and the budget amount (S$0.00 when none). `page:2119-2143`.
- **C-231** Cell 2: "CREATED" (calendar icon) — "Jun 19, 2026" style (`en-US`, short month), or "--". `page:2144-2151`.
- **C-232** Cell 3: "DESIGNER" or "DESIGNERS" (person icon) — every assignee's name joined by ", ", else the single assigned name, else "--". `page:2152-2165`.
- **C-233** Below a hairline: "UPCOMING MILESTONES" (flag icon) with the link "View timeline →" at the right, then up to two rows — the milestone name and "{Mon d} · {relative}", e.g. "Jun 19 · 108d overdue". `page:192-239`.
- **C-234** Which rows: milestones not `completed` that have an end date, earliest first, the first two. Relative text: "{n}d overdue" · "due today" · "due tomorrow" · "due in {n}d" (under a week) · "due in {n}w" (weeks rounded up). Overdue rows are red and medium weight. `page:169-187`, `page:231-234`.
- **C-235** Empty: a dashed box — "No timeline set up yet." (no milestones) or "No upcoming milestones — the timeline is either empty or all complete." — with the link "Set timeline →". `page:207-221`.

### (3) UI elements — the edit form (the pencil)

- **C-236** The card's body is replaced in place (the card gains a faint purple ring); it holds exactly two fields in two columns from 640px. `page:2035-2041`.
- **C-237** "BUDGET" (dollar icon): a number input, 36px high, placeholder "e.g. 50000", no currency prefix; an empty or zero budget shows blank. `page:2042-2053`.
- **C-238** "DESIGNER" (person icon): a select with placeholder "Select designer", the option "Unassigned", then every studio member tagged `id`, by name. `page:2054-2069`.
- **C-239** A helper line with an info icon: "Milestone dates are managed in the Timeline tab." `page:2071-2073`.
- **C-240** Footer above a hairline, right-aligned: "Cancel" (grey outline) and "Save" (primary, check icon), both 32px high with 12px text; Save disables while a project update is in flight. `page:2074-2079`.

### (4) Interactions

- **C-241** The pencil copies budget, start date, due date, status, stage and designer into the form's state; only budget and designer are editable. `page:2086-2095`.
- **C-242** Save sends **all six** — `status`, `stage`, `budgetTotal`, `startDate`, `dueDate`, `assignedTo` — in one `PATCH`, then closes the form; Cancel discards. `page:1466-1479`, `page:2075`.
- **C-243** "View timeline →", "Set timeline →" and each milestone row switch to the Management tab. `page:200`, `page:216`, `page:228`, `page:2172`.

### (7) Rules and logic

- **C-244** Budget is stored in whole dollars: the client rounds before sending. `lib/queries/projects.ts:320-322`.
- **C-245** The designer value is a `studio_members.id` written to the single `assigned_to` column; this path does not touch the `project_assignees` junction or any commission split. `page:2065`, `page:1475`, `lib/queries/projects.ts:311`.

### (5) States

- **C-246** No loading, success or error feedback for this form: a successful save just closes it; a failed save throws inside the click handler with no message and the form stays open **[inferred]**. `page:1466-1479`.

### (6) Motion

- **C-247** The card enters with `animate-fade-up` (opacity 0 → 1, `translateY(12px → 0)`, 0.4s ease-out, fill both) each time Overview mounts; the edit ring's shadow transitions over 200 ms. The ring itself is static (no draw-in). `page:2035`, `app/globals.css:1222-1225`, `:1653-1656`.

### (10) Problems

- **C-248** The pencil shows for every role and ignores the handover lock; `canEditProject` is computed and used only for the Team card. `page:2085-2101`, `page:815`, `page:2186`.
- **C-249** Save re-sends the due date as the display string the transformer produced (e.g. "19 Jun", no year) into a date column — likely rejected by the database, so saving Project Info on any project that has a due date would fail silently **[inferred; not run]**. `lib/transformers.ts:247-251`, `:506`, `page:2090`, `page:1474`.
- **C-250** Save also re-sends the stage and status captured when the form opened, overwriting any change made meanwhile (for example the auto-promotion to Active). `page:2091-2092`, `page:1470-1471`.
- **C-251** With a project team set, the read view and `assignedTo` come from the junction's first member, so choosing another designer (or "Unassigned") here changes a column nobody reads and looks like a save that did nothing **[inferred]**. `lib/transformers.ts:519-521`, `page:2161-2163`.
- **C-252** The field is labelled "Budget" even when the card is showing "Contract Value"; the user edits a number that then appears only as the small "· Budget …" caption. `page:2044`, `page:2119-2133`.
- **C-253** "Milestone dates are managed in the Timeline tab." — there is no Timeline tab; it is Management › Milestones. `page:2072`, `page:1878`.
- **C-254** "View timeline" lands on whichever Management sub-tab was last open (state is kept), so it can open Tasks or Materials instead of Milestones **[inferred]**. `page:2172`, `page:881-885`.
- **C-255** Upcoming Milestones counts `pending-approval` milestones as upcoming or overdue; the attention block deliberately skips them — the two disagree. `page:171`, `lib/financial-issues.ts:276`.
- **C-256** Milestone rows are `<li>`s with a click handler: not focusable, no keyboard access. Dates are always `en-US` whatever the project's country. `page:225-229`, `page:232`, `page:2149`.
- **C-257** Start date, due date, status and stage have no control anywhere on the page, though the form carries them. `page:862`, `page:2087-2094`.

---

## 8. Project Team card (Owner / Admin)

- **C-258** Shown only when the viewer may `projects.edit`; otherwise the card renders nothing. With seeded role rows that is Owner / Admin; in the legacy tag fallback a designer also passes, so who sees the card depends on how the studio's roles were set up **[inferred]**. `page:2182-2188`, `components/projects/project-team-card.tsx:118-120`, `lib/access-control.ts:263-311`, `:329`.
- **C-259** Head: a purple people icon, "Project Team", "Saving…" at the right while a change is in flight; under it: "Designers added here can view this project. Commission splits auto-balance evenly across the team." `components/projects/project-team-card.tsx:128-137`.
- **C-260** Assigned list, titled "ASSIGNED ({n})": one bordered grey row per designer — a 28px initials avatar in a cycling gradient, the name, the member's specialty, a white pill with the commission % (only with two or more), and an X button (`aria-label="Remove {name}"`, red tint on hover). With two or more a note reads "Commission split is set at project creation". `components/leads/drawer-sections/assignment-section.tsx:136-188`.
- **C-261** Picker, titled "MANUAL ASSIGNMENT" (nobody yet) or "ADD ANOTHER DESIGNER": a 36px rounded field with a search icon and a chevron that flips when open; closed text "Choose a designer to assign…" / "Search to add another designer…"; open placeholder "Search by name or specialty…". `components/leads/drawer-sections/assignment-section.tsx:194-227`.
- **C-262** The list under it (max 192px, scrolls) shows unassigned members tagged `id`: initial avatar, name, "{specialty} · {n} active", and a green dot (hover title "Accepting leads"). Empty texts: "No assignable designers found" · "No match — try a different name" · "All designers already assigned". It closes on an outside press. `components/leads/drawer-sections/assignment-section.tsx:58-76`, `:230-262`.
- **C-263** Add: the row appears at once (optimistic) with splits re-divided evenly (basis points, the remainder to the first member); the server upserts the junction and mirrors the first-added member onto `assigned_to` / `assigned_designer`; toast "{name} added to the project team". On failure the list reverts and the toast is "Couldn't add designer. Please try again." `components/projects/project-team-card.tsx:27-32`, `:81-99`, `app/api/projects/records/[id]/assignees/route.ts:111-134`.
- **C-264** Remove: optimistic; the member is unassigned, the rest are re-split evenly and saved; toast "{name} removed from the project team" or "Couldn't remove designer. Please try again." (with revert). No confirmation and no Undo. `components/projects/project-team-card.tsx:101-116`.
- **C-265** Locked project: the picker is replaced by a grey row with a lock — "This project is locked. Unlock it to change the team." `components/projects/project-team-card.tsx:139-145`.
- **C-266** While saving, the whole editor is disabled through a `<fieldset disabled>`. `components/projects/project-team-card.tsx:147`.
- **C-267** The card states the visibility rule: a designer sees a project only if they are on its team (or are its single assigned designer) — lead assignment does not carry over. `page:2178-2181`, `context/app-context.tsx:135-143`.
- **C-268** **Problems:** the server route has no role check (any member can change any project's team by calling it); the note "Commission split is set at project creation" and the pill's hover title "Commission split (auto-balanced; finalized at project creation)" were written for the lead screen and contradict this card, which re-splits on every change; the card keeps its own copy of the team from mount, so a designer changed through Project Info's pencil is not reflected until the page is reopened; removing the last designer leaves the project with nobody who can see it besides Owner / Admin, without a warning. `app/api/projects/records/[id]/assignees/route.ts:54-85`, `components/leads/drawer-sections/assignment-section.tsx:143-147`, `:171`, `components/projects/project-team-card.tsx:57-61`.

---

## 9. Customer card and Property card

### Layout

- **C-269** The two cards sit side by side from 640px (`grid-cols-1 sm:grid-cols-2 gap-5 items-start`), each sized to its own content. `page:2193`.

### Customer — read view

- **C-270** Head "Customer" with a pencil (`title="Edit customer info"`). Then a 40px avatar with the client's initials (up to two letters, "?" if none) on a cream gradient (#FEF5EA → #FCECD5, text #C17E22), the client name in 14px semibold, and the caption "Homeowner". `page:2210-2236`, `app/globals.css:1042-1045`.
- **C-271** Phone row (phone icon): the project's phone, else the linked lead's with a 10px uppercase tag "FROM LEAD", else italic grey "No phone". Email row (mail icon): same pattern, "No email". `page:2238-2273`.
- **C-272** Neither value is a link (no `tel:` / `mailto:` / WhatsApp). `page:2242-2266`.

### Customer — edit

- **C-273** In place, with a purple ring: "PHONE" (placeholder "e.g. 91234567") and "EMAIL" (placeholder "e.g. client@example.com") — plain text inputs — then "Cancel" and "Save" (check icon). `page:2196-2207`, `page:5030-5051`.
- **C-274** The form starts from the project's own values only; a value shown "from lead" starts empty. Save writes `customer_phone` and `customer_email`. `page:2214-2217`, `page:1481-1490`.

### Customer — the Homeowner Questionnaire (inside the card)

- **C-275** Under a hairline, only when the platform page `tools/homeowner-portal` is enabled: a clipboard icon, "Homeowner Questionnaire", "{answered}/{total} answered", and two buttons — "Fill answers" (outline) and "Ask homeowner" (primary; forced grey when it cannot be used). `page:2282-2288`, `components/shared/homeowner-questionnaire.tsx:337-371`.
- **C-276** Each question: its text (a red asterisk if required), the answer shown read-only in the question's own input type, a provenance pill — green "Homeowner" (house icon) or grey "Studio" (person icon) — a pencil (`aria-label="Edit answer"`) and a history button (`aria-label="Show answer history"`). `components/shared/homeowner-questionnaire.tsx:226-279`, `:374-388`.
- **C-277** Editing is one row at a time: the row becomes an input with "Save" (spinner while saving) and "Cancel", and a red inline message on failure; "Fill answers" opens the first unanswered question. `components/shared/homeowner-questionnaire.tsx:110-148`, `:282-295`.
- **C-278** "Ask homeowner" opens the dialog "Ask the homeowner": "We'll notify {name or "the homeowner"} in their portal and they can answer your questions there.", a read-only "Portal link" with "Copy" → "Copied", "Last sent: {relative}" (+ " — please wait a few minutes before sending again" within 5 minutes), "Cancel" and "Send notification" ("Sending..."). `components/shared/invite-to-answer-dialog.tsx:79-146`, `:151-159`.
- **C-279** Sending posts to `/api/projects/{id}/send-questionnaire`; toast "Sent — the homeowner will see it in their portal" or, when throttled, "Invite already sent recently — give it a few minutes before retrying". `page:2289-2306`.
- **C-280** Other states: three grey skeleton bars while loading; "Could not load the questionnaire. Refresh to try again."; "This project's originating lead has no phone number yet — add one to enable the questionnaire."; a red technical message when the phone could not be bound to a homeowner profile (it prints the error code and detail); "No questions configured yet. Set them up in Accounts → HomeOwner Portal → Scope." (a link). `components/shared/homeowner-questionnaire.tsx:159-217`, `:391-405`.
- **C-281** **Problems:** the page passes `p.customerName`, which the project transformer never sets, so the dialog always says "the homeowner"; a raw bind error (`code: detail`, `bindStep: …`) is shown to the studio user; the questionnaire makes the Customer card several times taller than Property. `page:2287`, `lib/transformers.ts:469-565`, `components/shared/homeowner-questionnaire.tsx:197-206`.

### Property — read view

- **C-282** Head "Property" with a pencil (`title="Edit property info"`). A two-column grid (one below 640px) of label / value pairs: "PROPERTY TYPE", "ADDRESS", "PROJECT TYPE", "SCOPE", and — only when a value exists — "AREA" ("{n} sqft") and "STYLE". Empty values print "--". `page:2388-2437`.
- **C-283** Fallbacks: property type, address (the lead's area), project type, area and style fall back to the linked lead's values, with no "from lead" tag (unlike the Customer card). `page:2409-2434`, `page:1435-1438`.

### Property — edit

- **C-284** "PROPERTY TYPE" (building icon): a select, placeholder "Select type", over a fixed list — HDB 3-Room · HDB 4-Room · HDB 5-Room · HDB Executive · Condo · Landed — Terrace · Landed — Semi-D · Landed — Bungalow · Penthouse · Commercial — Office · Commercial — Retail · Others. `page:2319-2333`, `page:436-440`.
- **C-285** "ADDRESS" (pin icon): text input, placeholder "e.g. 123 Ang Mo Kio Ave 3". `page:2334`.
- **C-286** "PROJECT TYPE" (home icon): a select, placeholder "Select project type", over the studio's `project_type` taxonomy, or the defaults Renovation-Full Home · New-Full Home · Renovation-Partial · New-Partial · Commercial · Others. `page:2335-2349`, `page:661-662`, `data/lead-bucket-config.ts:294-301`.
- **C-287** "SCOPE" (layers icon): twelve toggle chips — Living Room · Kitchen · Master Bedroom · Bedroom 2 · Bedroom 3 · Bathroom 1 · Bathroom 2 · Balcony · Service Yard · Study · Dining · Others; selected chips are purple-tinted, the rest white with a grey border that turns purple on hover; the selection is stored as one comma-separated string. `page:2350-2378`, `page:358-361`.
- **C-288** "Cancel" / "Save" as elsewhere; Save writes `property_type`, `property_address`, `project_type`, `scope`. `page:2379-2384`, `page:1492-1503`.

### Problems (both cards)

- **C-289** No validation at all: the phone and e-mail accept any text (a `PhoneNumberInput` exists and is used elsewhere on the page, not here). `page:2199-2200`, `page:89`, `page:3501`.
- **C-290** Silent saves: no confirmation on success; on failure nothing is shown and the form stays open **[inferred]**. `page:1481-1503`.
- **C-291** The pencils ignore role and lock, as on Project Info. `page:2212-2224`, `page:2390-2404`.
- **C-292** The client's name cannot be edited anywhere on the page; Area and Style can be shown but not edited. `page:2233`, `page:2423-2436`.
- **C-293** The property-type list is Singapore-only and hard-coded, although a region-aware list is defined a line below and never used; a value outside the list (for example one that came from the lead) cannot be re-selected. `page:436-441`, `page:2328`.
- **C-294** Opening Property's edit when the address was only the lead's area copies nothing, so saving unchanged leaves the project's own address empty while the read view keeps showing the lead's. `page:2394`, `page:2413`.

---

## 10. Key Files rail

- **C-295** Card "Key Files" with the link "View all →" (switches to Files & Docs), then three tiles in a row from 640px (stacked below). `components/projects/key-files-rail.tsx:138-150`.
- **C-296** Filled tile: white, bordered, a 36px purple-tinted icon square, a 12px semibold title, a grey meta line, a small download icon on Quote and Contract; hover turns the border purple, lifts the tile 2px and adds a small shadow. `components/projects/key-files-rail.tsx:46-71`.
- **C-297** Empty tile: dashed border, grey icon square, and an upload icon with "Upload quote" / "Upload contract" / "Upload renders"; hover tints it purple. `components/projects/key-files-rail.tsx:47-48`, `:60-64`.
- **C-298** Quote tile is filled when `quoteStatus` is set (not `none`) and `quoteData` has lines; meta "{n} line item(s)". `components/projects/key-files-rail.tsx:81-82`, `:157-165`.
- **C-299** Contract tile is filled when a file exists in folder `contract`, or the project has a contract file name, or `quoteStatus === "client_signed"`; meta = the file name or "Signed". `components/projects/key-files-rail.tsx:88-92`, `:185-193`.
- **C-300** Renders tile is filled when files exist in folder `render` / `renders` or any progress update has a photo attachment; meta "{n} image(s)". `components/projects/key-files-rail.tsx:97-119`, `:207-215`.
- **C-301** Pressing a filled Quote or Contract tile asks `/api/projects/{id}/quote/list` (or `/contract/list`): one file → it opens in a new tab; two or more → a 288px menu headed "CHOOSE A FILE TO DOWNLOAD" with a badge per row ("Signed" green · "Draft" grey · "Upload" purple) and the label; none → toast "No downloadable files yet."; failure → toast with the error or "Failed to load downloads". `components/ui/download-picker.tsx:54-100`, `:131-162`.
- **C-302** Pressing a filled Renders tile opens a dark full-screen lightbox: file name, "{i} / {n}", "Open in Files & Docs", "Open in new tab", a round close button, previous / next arrows, a thumbnail strip; Escape closes, the arrow keys move. `components/projects/key-files-rail.tsx:125-128`, `components/projects/file-lightbox.tsx:41-173`.
- **C-303** Pressing any empty tile switches to the Files & Docs tab. `components/projects/key-files-rail.tsx:174`, `:202`, `:213`, `page:2446-2453`.
- **C-304** **Problems:** the lightbox is fed only the progress-update photos, so when the count comes solely from files in the Renders folder the tile looks filled and pressing it shows nothing **[inferred]**; the contract lookup uses folder `contract` while the Files tab's folder id is `contracts`, so a file uploaded there is not recognised by this tile **[inferred]**; "Upload quote" leads to Files & Docs, not to a quote upload — the page's branch that would open Finance › Contracts is never reached; the texts "No quote yet" / "No contract yet" / "No renders yet" are defined and never displayed. `components/projects/key-files-rail.tsx:89`, `:118-128`, `:43`, `:173-175`, `components/projects/file-lightbox.tsx:52`, `page:382`, `page:2447-2449`.
- **C-305** **Problem:** the hover lift is not animated — the tile transitions colours only, so the 2px move snaps **[inferred]**. `components/projects/key-files-rail.tsx:46-49`.

---

## 11. Notes card

- **C-306** No notes: the whole card is one quiet button — a pencil and "Add notes..." in grey. `page:2491-2498`.
- **C-307** With notes: a 11px uppercase label "NOTES", the text in 14px grey with relaxed leading, and a pencil at the right (`title="Edit notes"`). `page:2477-2490`.
- **C-308** Editing: the label, a textarea (min 80px, placeholder "Add project notes...", focused on open), "Cancel" and "Save" (check icon); Save writes `notes`. `page:2458-2476`, `page:1505-1512`.
- **C-309** The card enters with `animate-fade-up` delayed 120 ms. `page:2457`.
- **C-310** **Problems:** plain text only, and the read view does not preserve line breaks (no `whitespace-pre-wrap`) **[inferred]**; no author or time; silent save; ignores role and lock; the card has no title when empty. `page:2481`, `page:2483-2488`.

---

## 12. The right column

### Meeting Summary (placement only)

- **C-311** First card of the side column; the page passes the project and the client's name. Head: a 32px purple-tinted tile with sparkles, "Meeting Summary" and "· {n}" when briefs exist; at the right a primary 32px button with a microphone, "Log Meeting ▾". `page:2506`, `components/projects/meeting-summary-card.tsx:80-99`.
- **C-312** Its menu (240px): "Launch Co-pilot" / "Live transcription & insights", a separator, "Upload recording" / "Transcribe an existing audio file". `components/projects/meeting-summary-card.tsx:100-117`.
- **C-313** Empty: a 48px grey circle with a microphone, "No meetings yet", "Run a live co-pilot session, or upload a recording, and the brief will land here automatically." `components/projects/meeting-summary-card.tsx:179-188`.

### Progress Updates (placement and what Overview passes)

- **C-314** Second card. Head: "Progress Updates" with a sub-line — "Updates are sent to the owner for review before homeowners see them" or "Posted updates appear immediately on the homeowner portal" — and a primary 36px button "+ Post Update", disabled on a locked project with the hover title "Project is locked after handover — unlock to post updates." `components/projects/progress-updates.tsx:460-478`.
- **C-315** The page passes: project id and name, the legacy `progressUpdates` array from the project row, the milestones as `{ id, name, paymentPercent }`, the country, `isLocked`, and a callback for when an update completes a payment milestone. `page:2509-2515`.
- **C-316** That callback: refuses on an unlocked-commission Draft with the toast "Financial actions are restricted while the project is in Draft."; with no contract value toasts "Milestone "{name}" completed but no contract value set."; otherwise notifies the homeowner of the milestone's completion and auto-generates the milestone's invoice (payment % of the contract value, due today). `page:2516-2551`.
- **C-317** If the invoice already exists: toast "Invoice already exists for "{name}""; on failure: "Failed to auto-generate invoice". `page:2552-2573`.
- **C-318** **Problem:** on success the page stores the new invoice's number, total and share token in `milestoneDialogData` — and nothing reads it (the confirmation dialog moved into the Gantt), so from Overview an invoice is created with no message at all. `page:836-842`, `page:2562-2568`, `page:4695`.
- **C-319** **Problem:** the page's comment calls this "single Post Update CTA, no approval workflow", while the card has an owner-review path ("Pending review", Approve / Reject, as in the owner's screenshot). `page:2508`, `components/projects/progress-updates.tsx:465-467`.

### Activity card

- **C-320** Third card: "Activity" and the link "View all →" (switches to the Activity tab). `components/projects/activity-summary.tsx:59-69`, `page:2578-2581`.
- **C-321** The five newest events, each a 28px grey initials avatar with a 14px category badge at its lower right, a two-line-clamped sentence "**{actor}** {action}", and a relative time: "Just now" · "{n}m" · "{n}h" · "{n}d" · then "{Mon d}". `components/projects/activity-summary.tsx:41-52`, `:78-108`.
- **C-322** Category badges: progress (camera, green) · timeline (calendar, purple) · task (check-square, blue) · finance (dollar, amber) · procurement (package, blue) · issue (triangle, red) · chat (message, grey) · file (file, grey). `components/projects/activity-summary.tsx:15-35`.
- **C-323** States: "Loading…" as plain text; empty "No activity yet — actions across the project will show up here." `components/projects/activity-summary.tsx:71-76`.
- **C-324** The feed is derived in the browser from one payload (`/api/project-aggregates/activity-feed`): progress updates, tasks, invoices, payments, POs, VOs, escalations, file uploads, commission rules and requests, expenses and three lifecycle moments ("Project created", "submitted project for closure review", "Project closed"), sorted newest first. `lib/queries/project-aggregates.ts:443-697`.
- **C-325** **Problems:** rows are not links; many actors are placeholders — "System" (avatar "S"), "Team member", "Owner" — because the event is built from the record's current state, not from who did it; a record yields one line reflecting its latest status at its creation time (an invoice paid today reads "fully paid" dated the day it was created) **[inferred]**. `lib/queries/project-aggregates.ts:489-504`, `:613-615`, `:646`.

---

## 13. Mobile — floating buttons and their sheets

- **C-326** Two round 48px buttons fixed at the lower right (16px from the edge, 12px apart), shown below 1024px on **every** tab and in every project state: green "Log expense" (receipt icon) above purple "Post update" (camera icon), white icons, large shadow, press scale 0.95. `components/projects/project-fabs.tsx:23-38`, `page:4851-4855`.
- **C-327** They sit `5rem + safe-area` above the bottom, an offset chosen to clear the bottom nav — which this page hides (focus mode), so they float over an empty gap **[inferred]**. `components/projects/project-fabs.tsx:20-23`, `app/(main)/layout.tsx:204-208`.
- **C-328** "Post update" opens a centred dialog (not a sheet, despite the name): "Post Update", "Share progress with {client} on {project}", a dashed drop area "Add Photos or Videos" (opens the camera / picker; picked items become 64px thumbnails with a remove dot and an add tile), a textarea "Write a message for the homeowner...", "Cancel" and "Post Update" ("Posting..."). Toasts: "Update posted" / "Failed to post update". `components/projects/post-update-sheet.tsx:93-171`.
- **C-329** It posts a progress update of type `site-update` titled "Update for {client}". `components/projects/post-update-sheet.tsx:63-69`.
- **C-330** "Log expense" opens "Quick Expense" (receipt icon, the project's name under it): "Amount" (large numeric field, placeholder "0.00", focused), "Category" (select "Select category...", active expense categories), "Note (optional)" (placeholder "E.g., nails and screws for kitchen"), a dashed "Snap Receipt" button (becomes a row with the file name and an ×), a checkbox "I paid out of pocket", "Cancel" and "Save Expense" / "Save & Request Reimbursement" ("Saving..."). `components/projects/quick-expense-sheet.tsx:104-217`.
- **C-331** Validation: a missing or non-positive amount → toast "Enter a valid amount". Success: "Expense recorded" or "Expense recorded — reimbursement requested"; failure: "Failed to record expense". The expense is dated today with GST 0. `components/projects/quick-expense-sheet.tsx:59-85`.
- **C-332** **Problems:** the photos are saved as the browser's temporary `blob:` addresses, not uploaded (the code says "In production, this would be uploaded to storage"), so nobody else can see them; the snapped receipt is never attached to the expense at all; the FABs duplicate "+ Post Update" on Overview and ignore the handover lock, the Draft restriction and Closed; and they share the corner with the draggable mAIson button. `components/projects/post-update-sheet.tsx:57-61`, `components/projects/quick-expense-sheet.tsx:43`, `:67-75`, `app/(main)/layout.tsx:214`.
- **C-333** Other small-screen behaviour of Overview: one column; Customer above Property below 640px; Project Info's three cells stack below 640px; Key Files tiles stack below 640px; the profit pair stacks below 640px. `page:2003`, `page:2118`, `page:2193`, `components/projects/key-files-rail.tsx:150`.

---

## 14. What else is mounted, and where (map only)

- **C-334** Management tab: the homeowner response banner, a sub-tab strip "Milestones · Tasks · Materials · Floor Plan", a mobile milestone list with create / reschedule dialogs, the Gantt, the selection board, the floor-plan section, a "Wrap up this project" card with "Close Project" (Active, no closure in flight), and the task table. `page:2596-2623`, `page:2628`, `page:2712`, `page:2743`, `page:2762`, `page:2940`, `page:2950`, `page:2963-2981`, `page:2985`.
- **C-335** Finance tab: "Income ▾ / Expense ▾ / Record Payment" actions, the sub-tabs (overview · contracts · invoices · pos · expenses · bills · receipts), and — mounted inside this tab's block only — the Create PO, Upload document, Expense drawer, VO digitizer, Invoice drawer, Variance wizard, Generate invoices and Payment drawer. `page:3271-3324`, `page:3619-3893`, `page:3897-4035`.
- **C-336** Files & Docs tab: the folder / file browser, then Selection Receipts and Shared Render Feedback. Activity tab: `ActivityFeed`. `page:4055-4503`, `page:4506-4508`.
- **C-337** Mounted at page level (any tab): the file preview, delete-file, delete-folder and new-folder dialogs; the tool entry dialog; the floating task bulk bar (Management only, slides up 200 ms); Invite to Portal; Delete project; Closure; Credit Note; Record Delivery; Invoice Editor; Financial Report; the FABs. `page:4512-4855`.
- **C-338** **Problem:** four of those can never open — nothing sets their state to open: the Credit Note dialog, the Record Delivery dialog, the Invoice Editor and the Project Financial Report (and, inside Finance, Generate Invoices). `page:681-684`, `page:688`, `page:4801-4848`, `page:4012-4017`.
- **C-339** `control-shell.tsx` (`ControlPanel`, `ControlTile`) is used only by the Visualizer (the hidden render tab): a panel that slides over its rail from the right in 300 ms ease-out with a "‹" back button, a title, an optional badge and a green "Auto-saved" dot; tiles show a state (set · empty · locked) with a green ✓ when set. Not part of Overview. `components/projects/control-shell.tsx:12-48`, `:56-98`.
- **C-340** `SetupProgressIndicator` (a "{done}/{total}" with five dots and a "Missing:" tooltip) is exported from the setup file and not used on the detail page. `components/projects/setup-progress.tsx:61-98`.

---

## 15. Roles — client and server, in one place

- **C-341** Owner / Admin (by tag): see the desktop kebab and the Close / Delete rows of the mobile menu. `page:655-657`, `page:1804`, `page:1819`.
- **C-342** Owner only: Approve / Reject on a pending closure; the owner's wording on the closure banner; `userIsOwner` handed to the Draft wizard and the invoice drawer. `page:1954`, `page:1975`, `page:1984`, `page:1994`, `page:3970`.
- **C-343** `projects.edit` (role permissions, or the tag fallback): the Project Team card. `project_override.override_lock` (Owner / Admin): exempt from the handover lock. `payment_schedule.override` (Owner / Admin): may override the frozen schedule. `page:810-815`, `page:825`.
- **C-344** Everyone who can open the page: every header action, every Overview pencil, the Financial Summary figures, Post Update, Log Meeting, the FABs, and the Finance tab (it is gated by a platform switch, not by role). `page:1708-1775`, `page:1879`, `page:2007`.
- **C-345** Server: `PATCH /api/projects/records/{id}` checks the session and the studio only — no role, no lock, no stage rule; the same for the assignees route, the invite route and the preview route. Delete and Archive check Owner / Admin. `app/api/projects/records/[id]/route.ts:100-124`, `app/api/projects/records/[id]/assignees/route.ts:54-85`, `app/api/projects/[id]/delete/route.ts:54-68`, `app/api/projects/[id]/archive/route.ts:41-53`.
- **C-346** So the stage can be set to anything by any member through the API, and the client relies on that itself (the auto-promotion and the wizard's Activate are plain `PATCH`es). `lib/queries/projects.ts:306`, `page:1576`, `components/projects/draft-setup-wizard.tsx:107-109`.

---

## 16. Motion — every animation and transition on the shell and Overview, in one list

- **C-347** Tab body enter: `animate-tab-enter` → `tabFadeIn`, opacity 0 → 1 and `translateY(4px → 0)`, 0.25s ease-out, replayed on every tab switch because the wrapper is keyed by the tab; there is no exit animation. `page:1941`, `app/globals.css:1687-1693`.
- **C-348** Card entrance: `animate-fade-up` → `fadeUp`, opacity 0 → 1 and `translateY(12px → 0)`, 0.4s ease-out, fill both — on Project Info (no delay) and Notes (120 ms delay) only; Financial Summary, Project Team, Customer, Property, Key Files and the whole right column appear without it. `page:2035`, `page:2457`, `app/globals.css:1222-1225`, `:1653-1656`.
- **C-349** Edit mode: a card being edited gains `ring-1 ring-primary-default/20`; the card carries `transition-shadow duration-200`. The swap between read view and form is instant (no height or fade transition). `page:2035`, `page:2195`, `page:2315`, `page:2457`.
- **C-350** Tab underline 300 ms ease-in-out on `left` and `width`; tab label colour 200 ms; overflow auto-scroll uses the browser's smooth scrolling. `components/ui/sliding-tabs.tsx:58-60`, `:96-101`, `:117`.
- **C-351** Sticky header: shadow 200 ms; the meta line's hide-on-scroll below 1024px is an instant show / hide. `components/ui/secondary-page-header.tsx:113`, `:190`.
- **C-352** Buttons 150 ms with a 0.98 press scale; icon buttons and links `transition-colors` (Tailwind's default 150 ms). `components/ui/button.tsx:8`, `page:2097`.
- **C-353** Dialogs (Invite, tool entry, Delete, Ask the homeowner, Post Update, Quick Expense): overlay fade and content fade + zoom from 95%, 200 ms, both directions. `components/ui/dialog.tsx:42`, `:64`.
- **C-354** The attention drawer: slides in from the right in 500 ms and out in 300 ms (ease-in-out) over a fading 50% black overlay. `components/ui/sheet.tsx:39`, `:63-65`.
- **C-355** Menus (kebab, mobile ⋯, Log Meeting, download chooser) and tooltips: fade + zoom from 95% with a small slide from the trigger side. `components/ui/dropdown-menu.tsx:45`, `components/ui/tooltip.tsx:38`.
- **C-356** Draft setup progress bar: width 300 ms. `components/projects/draft-setup-card.tsx:61`.
- **C-357** Small ones: skeleton blocks pulse (`animate-pulse`); spinners spin (`Loader2 animate-spin`) in Invite, the questionnaire, the tool dialog and the FAB sheets; the Invite switch's knob slides with `transition-transform` and its track with `transition-colors`; the team picker's chevron rotates 180° with `transition-transform`; FABs scale to 0.95 on press; the lightbox has no transitions at all. `components/ui/skeleton.tsx:7`, `components/homeowner/invite-dialog.tsx:319-326`, `components/leads/drawer-sections/assignment-section.tsx:226`, `components/projects/project-fabs.tsx:26`, `components/projects/file-lightbox.tsx:59-61`.
- **C-358** The progress ring and all figures are static: no draw-in, no count-up, no change highlight when a number updates. `page:2107-2113`, `components/projects/financial-summary-card.tsx:77`.

---

## Uncertain / not verified

- Nothing was run. Everything marked **[inferred]** is read from the code's structure, not observed — in particular: the variance wizard not opening from Overview (C-211), the due-date string failing the Project Info save (C-249; depends on the database rejecting a year-less date), the tab state not following URL changes (C-35), the setup wizard dropping the timeline step (C-151), and the Key Files mismatches (C-304).
- Row-level security was not read. Whether a designer can really load a project they are not assigned to (C-41), and whether the unguarded routes (C-345) are narrowed by database policies, needs a check against the policies.
- No writer of `handover_locked_at` was found in `src/` (C-97); a database trigger or an admin tool outside `src/` could set it.
- The 200 ms / 300 ms / 500 ms figures for dialogs, the sheet and menus come from the class names (`duration-200`, `data-[state=open]:duration-500`, tw-animate defaults); the exact easing of tw-animate's presets was not looked up.
- Not read in depth (other readers' slices or shared pieces): `ClosureDialog`, `ClosureSummaryCard` body, `DraftSetupWizard` steps, `MeetingSummaryCard` and `ProgressUpdates` internals, `ActivityFeed`, `ScopeAnswerInput` and the answer-history popover, the Gantt, the whole Finance tab, `/api/projects/[id]/{quote,contract}/list`, `/api/projects/[id]/send-questionnaire` (only its error strings), the homeowner portal's preview page, and the Topbar / BottomNav.
- The owner's screenshot shows "Management (10)" and "Finance (4)"; the formulas are in C-62 and C-63, but the counts were not reproduced against data.
- Whether `text-tertiary-red-default` resolves through some other stylesheet than `globals.css` (C-133) was checked only by a search of that file.
