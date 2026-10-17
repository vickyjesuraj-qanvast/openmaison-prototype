# B — 1.0 Projects: how a project starts

Reader B of twelve. Source: OpenMaison 1.0, `/Users/vicky/Documents/GitHub/qanvast-id-tool`, working tree on branch `integ/security-non-qanvast` @ `620190192`, read only (never run). Read in full: `src/components/projects/project-create-drawer.tsx` (1582 lines), `draft-setup-wizard.tsx` (815), `draft-setup-card.tsx`, `setup-progress.tsx`, `start-milestone-flow.tsx`, `template-picker-dialog.tsx`, `clone-project-dialog.tsx`, `quote-source-picker-dialog.tsx`, `milestone-template-picker.tsx`, `save-milestone-template-dialog.tsx`, `src/app/(main)/projects/new/page.tsx`, `src/app/(main)/projects/[projectId]/quotes/new/page.tsx`, `src/lib/project-lead.ts`, `src/lib/lifecycle/transitions.ts`, `src/lib/milestone-templates.ts`, `src/lib/canonical-phases.ts`, `src/lib/projects/timeline-generators.ts`, `src/lib/numbering.ts`, `src/data/property-type-templates.ts`, `src/data/mock-timeline-templates.ts`, `src/data/system-milestone-templates.ts`, the API routes `projects/records` (+ `[id]`, `clone`, `count-by-lead`, `sync-customer-phone`, `[id]/lead-link`, `[id]/assignees`), `projects/templates/**`, `project-templates/records/**`, `quotes/templates/apply-project`, `reference/project-types`, `projects/[id]/quote/*`, `projects/[id]/contract/*`, `projects/[id]/payment-schedule/rebalance`, `homeowner-links/promote-lead-link`; and the parts that touch creation of `src/components/leads/lead-detail-drawer.tsx`, `conversion-readiness-card.tsx`, `quote-summary-card.tsx`, `src/app/(main)/projects/page.tsx`, `src/app/(main)/projects/[projectId]/page.tsx`, `src/components/projects/gantt-chart.tsx`, `src/lib/queries/projects.ts`, `src/lib/agents/executors.ts`, `src/app/api/leads/mutations/create/route.ts`, `src/app/api/finance/generate-invoices/route.ts`, `src/app/api/sign/[token]/submit/route.ts`, the drawer shell, `src/app/globals.css`, the two migration folders, and the docs `docs/rules/projects.md`, `docs/prd/09-projects.md`, `docs/PROJECTS_AND_FINANCE_GUIDE.md`, `docs/features/projects-overhaul/backend-dependencies.md`, `docs/rules/leads.md`.

**Citation aliases** (all paths are in the 1.0 repo):

| Alias | File |
|---|---|
| `drawer` | `src/components/projects/project-create-drawer.tsx` |
| `shell` | `src/components/leads/drawer-sections/drawer-shell.tsx` |
| `section` | `src/components/leads/drawer-sections/drawer-section.tsx` |
| `lead-drawer` | `src/components/leads/lead-detail-drawer.tsx` |
| `readiness` | `src/components/leads/conversion-readiness-card.tsx` |
| `records` | `src/app/api/projects/records/route.ts` |
| `record-id` | `src/app/api/projects/records/[id]/route.ts` |
| `hook` | `src/lib/queries/projects.ts` |
| `wizard` | `src/components/projects/draft-setup-wizard.tsx` |
| `card` | `src/components/projects/draft-setup-card.tsx` |
| `checks` | `src/components/projects/setup-progress.tsx` |
| `detail` | `src/app/(main)/projects/[projectId]/page.tsx` |
| `list` | `src/app/(main)/projects/page.tsx` |
| `gantt` | `src/components/projects/gantt-chart.tsx` |
| `generators` | `src/lib/projects/timeline-generators.ts` |
| `agent` | `src/lib/agents/executors.ts` |

**[inferred]** marks anything worked out from the code rather than read as a statement in it.

---

## Bottom line

- **One real creation form.** A project is made in one right-hand drawer (`ProjectCreateDrawer`), opened either from a lead ("Create Project") or from "+ New Project" on the listing. It is a single scrolling form with a confirm dialog, not a stepped wizard. Clone has an API and a dialog but no button anywhere; `/projects/new` is an orphaned older page; the `project_templates` table has two API surfaces and no screen; the mAIson agent's `create_project` very likely fails at the database **[inferred]**.
- **Every project is born a Draft.** The insert always writes `stage = Draft`, `status = planning`, `current_phase = Planning`. The "promote to Active at insert when all gates pass" rule can never fire, because the drawer stopped sending the payment schedule that rule needs.
- **Draft → Active is five checks**: Designer assigned · Quote added · Contract uploaded · Project timeline created · Commission structure. A project converted from a signed lead normally lands at 4 of 5, missing only the timeline.
- **The main Draft path is a dead end on screen.** The timeline check has no link, and "Complete setup" opens a wizard that has no step for it (the wizard still looks for the old label "Payment schedule defined"), so with only the timeline missing the button does nothing. The user has to find Management › Milestones unaided; once milestones autosave, the page promotes the project by itself.
- **The gates are advisory.** The wizard activates the project on its last step even if earlier steps were skipped; the server accepts `stage: "Active"` from any signed-in member with no checks; the owner approving a commission request also flips the stage to Active regardless of the other gates.
- **No template is chosen at creation.** The timeline starts empty. The Timeline tab's empty state offers five ways to fill it (hybrid from quote · work phases from quote · payment schedule · property-type template · from scratch). Templates seed milestones only — never tasks. The picker exists on desktop only; a phone gets a bare "Add milestone".
- **What a lead hands over:** client name / phone / email, property type, project type, budget (= the final quote total), every assignee (splits reset to even), the quote's line items and status as a snapshot, the contract's file name, the payment schedule (as draft invoices), the portal link. **Not handed over:** the lead's real property address (the form takes the district instead), files (merged in at read time), questionnaire answers (they ride on the portal link), visualizer rooms, source, key-collection date; area and style are pasted into Notes as text.
- **One lead → one project is an app rule, not a database rule.** The create route refuses a second project with a 409; the clone route and the agent do not check; the lead FK has a plain index. A project created without a lead mints a hidden "parked" lead so quotes, invoices and signing have an anchor. The link is two-way ("View lead" on the project; "Go to Project" on the lead).
- **Documents in the form are fake uploads.** Choosing a floor plan or a signed contract keeps only the file name — no bytes leave the browser — and that name alone ticks the "Contract uploaded" gate.
- **"Add quote" on the setup card leads to a mock.** `/projects/{id}/quotes/new` animates a pretend scan, shows four hard-coded lines and "$18,450.00", and saves nothing.
- **Money starts before the project does.** Creation generates the draft invoices from the schedule even though every other billing action is blocked while Draft; an HTTP failure of that call is swallowed; the invoices cannot be tied to milestones because none exist yet **[inferred]**.
- **Commission at creation has holes.** A designer's per-milestone rate request is silently dropped and the studio default is locked instead **[inferred]**; the confirm dialog says "Studio default" even when Skip or per-milestone was chosen. Project numbers ("#31") are a per-studio counter; `src/lib/numbering.ts` is about invoices and POs only. The docs are stale on almost every creation fact.

---

## 1. Every way a project comes to exist

- **B-01** The lead drawer mounts `ProjectCreateDrawer` with `leadData` when `showCreateProjectDialog` is true; this is the lead → project conversion. `lead-drawer:3367-3407`.
- **B-02** The Projects listing mounts the same drawer with no `leadData` when "+ New Project" is pressed (or the "C" key). `list:126-128`, `list:307-309`, `list:670-680`.
- **B-03** An older full page exists at `/projects/new` ("Start New Project"). Nothing in `src` links or routes to it (a search for `projects/new` finds only the page itself); it is reachable by typing the address. `src/app/(main)/projects/new/page.tsx:16-121`.
- **B-04** A clone path exists as code only: `POST /api/projects/records/clone`, the hook `useCloneProject` and `CloneProjectDialog`. No component renders the dialog or calls the hook. `src/app/api/projects/records/clone/route.ts:16-107`, `hook:791-826`, `src/components/projects/clone-project-dialog.tsx:41-248`.
- **B-05** The mAIson agent has a `create_project` tool that inserts a project row directly, bypassing the create route. `src/lib/agents/tools.ts:301-325`, `agent:2377-2491`.
- **B-06** A client signing the quote online does **not** create a project: it sets the lead's quote to `client_signed`, marks the contract uploaded, moves the lead to Signed and attaches the signed PDF to any project that already exists. `src/app/api/sign/[token]/submit/route.ts:411-470`, `:653-685`.
- **B-07** Those are the only writers: the only `projects` inserts in `src` are the create route, the clone route and the agent executor. `records:265-306`, `clone/route.ts:54-96`, `agent:2475-2481`.

---

## 2. From a lead (Signed / Won → project)

### (1) What it is / entry points

- **B-08** **Auto-prompt.** When the lead drawer auto-saves a status change into `SIGNED`, it opens the create drawer 500 ms later — once per drawer mount, and only when no project exists (sub-status `PROJECT_STARTED`, or a loaded project whose `leadId` is this lead). `lead-drawer:1187-1196`.
- **B-09** **Footer button "Create Project".** Shown when every active prerequisite is met, the lead has no unsaved edits, its sub-status is not `PROJECT_STARTED`, and no linked project is loaded. It does not depend on the lead's status — an Ongoing lead that is ready gets it too. `lead-drawer:2467-2484`, `:2652-2659`.
- **B-10** **Deal card.** The quote summary card's single primary action is "Go to Project" when a project exists, else "Create project" when the deal is won, else the per-status quote action. `src/components/leads/drawer-sections/quote-summary-card.tsx:109-134`, `lead-drawer:2186-2187`.
- **B-11** **Readiness panel** (Classic mode only, and only while not ready): a collapsible checklist that ends in "Convert to Project". `lead-drawer:2496-2568`, `readiness:52-189`.
- **B-12** There is no URL for conversion; it is state inside the lead drawer. The lead drawer itself opens from `/leads?openLead={leadId}`. `lead-drawer:3367`, `detail:1667`.

### (2) Layout

- **B-13** The lead drawer's footer block is `space-y-2 w-full max-w-6xl mx-auto`; the action row is `flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`, so buttons sit right-aligned on desktop and stack full-width on a phone. `lead-drawer:2488-2490`, `:2571`.
- **B-14** The readiness panel is a `rounded-xl border` box; its collapsed bar is `px-3 py-2.5` with one 8px dot per active gate, a sentence, and a chevron; it turns green (`border-tertiary-green-variant1 bg-tertiary-green-variant2`) when every gate is met. `lead-drawer:2497-2538`.
- **B-15** Inside, each checklist row is at least 28px high: an 18px status circle, the label, and a right-aligned text action. The convert button spans the full width under the list. `readiness:137-187`.

### (3) UI elements

- **B-16** Collapsed bar copy: "{done} of {total} ready to create project", or "Ready to create project" when complete. `lead-drawer:2526-2535`.
- **B-17** Checklist rows and their actions: "Designer assigned" → "Assign"; "Quote approved" → "Create quote"; "Contract uploaded" → "Upload now"; "Project type selected" → "Select type". A done row appends " — {detail}" (designer names · quote total · contract file name or "Uploaded" · the type). Icons: User, FileText, FileCheck, Layers; a done row shows a white check on a green disc. `readiness:75-118`, `:126-170`.
- **B-18** "Convert to Project" (FolderPlus icon): green when all rows are done, grey and disabled otherwise. `readiness:176-186`.
- **B-19** Footer button: FolderPlus 14px + "Create Project", green (`bg-tertiary-green text-white`, hover `bg-on-tertiary-green-variant`). `lead-drawer:2652-2659`.
- **B-20** After a project exists and is still Draft with commission unlocked, the lead shows a yellow callout: "Project created in Draft" / "Commission structure awaiting owner approval. Financial actions on the project are restricted until approved." / link "View Project". `lead-drawer:1508-1528`.

### (4) Interactions

- **B-21** "Assign" collapses the panel and scrolls to the assignment section; "Create quote" opens the quote digitizer dialog (behind the tool-access guard); "Upload now" opens the contract flow; "Select type" scrolls to the project-type field. `lead-drawer:2560-2564`.
- **B-22** Every entry point only sets `showCreateProjectDialog`; the create drawer then stacks over the lead drawer at z-index 50. `lead-drawer:2186`, `:2564`, `:2654`, `:3367-3370`.
- **B-23** After the project is created the lead is patched to the bucket that owns `SIGNED` in the studio's funnel, with sub-status `PROJECT_STARTED` (null if the funnel has no such sub-status; no move at all if the funnel has no `SIGNED`). `lead-drawer:3386-3396`, `src/lib/leads/funnel-transitions.ts:182-231`.
- **B-24** Then the lead drawer closes, a toast "Project created" with description "Opening your new project…" shows, and the app navigates to `/projects/{id}` (or `/projects` if no id came back). `lead-drawer:3397-3404`.

### (5) States

- **B-25** The footer button is suppressed while the lead drawer is dirty (`!isDirty`), so a user who just edited something sees no button until the auto-save lands. `lead-drawer:2484`.
- **B-26** In Journey mode the readiness panel is never shown and a missing project type does not hide the button, because the create drawer asks for the type itself. `lead-drawer:2477-2480`, `:2496`.
- **B-27** Each prerequisite disappears from the checklist when its studio workflow toggle is off (`requireAssignment`, `quoteApprovalRequired`, `contractRequired`, `projectTypeRequired`; all default on); with none active the card renders nothing. `readiness:72-121`, `src/lib/queries/studio-config.ts:69-79`.

### (6) Motion

- **B-28** The auto-prompt waits 500 ms (`setTimeout`) after the status save before the drawer slides in. `lead-drawer:1194`.
- **B-29** The readiness panel and its convert button only use `transition-colors`; the panel's expand/collapse is an instant mount/unmount with no height animation. `lead-drawer:2497`, `:2540`, `readiness:179`.

### (7) Rules and logic

- **B-30** "Quote approved" means the quote status is `approved`, `sent_for_signature` or `client_signed`. `lead-drawer:1786`, `readiness:50`.
- **B-31** The lead hands the drawer: id, name, phone, email, `type` (property type label), `area`, area in sqft, style preference, budget, single assignee id/name, the full assignee list, notes, project type, contract file name, the quote's line items, the lead-level quote status, the quote's document discount and GST switch, and the contract quote's payment schedule. `lead-drawer:3371-3385`.
- **B-32** The payment schedule is resolved signed quote → primary quote → open quote → the old lead-level object → none, and carries `type` (fixed / percent) and `amountCents` per stage. `lead-drawer:364-378`.
- **B-33** A backstop inside the drawer refuses conversion when the lead has an id, the studio requires quote approval and the quote is not approved: "This lead's quote must be approved before you can create a project." `drawer:346-349`, `:373-375`.
- **B-34** The server refuses a second project for the same lead with HTTP 409: "A project already exists for this lead. Open the existing project instead of creating a new one." The drawer shows that sentence as the error toast. The database does not enforce the rule: `projects.lead_id` carries a plain index and is `ON DELETE SET NULL`. `records:194-211`, `drawer:643-649`, `scripts/migrations/011_indexes.sql:12`, `scripts/migrations/006_projects.sql:39`.
- **B-35** **Two-way link.** The project header shows "View lead" (ExternalLink icon) → `/leads?openLead={leadId}` whenever the project has a `leadId`; the lead shows "Go to Project" / "View Project". `detail:1664-1670`, `:1687-1692`, `lead-drawer:1519-1524`, `:2187`.
- **B-36** The lead's portal link survives the conversion: the hook ensures a homeowner record for the lead (when a phone exists) and then stamps the project id onto the lead's primary portal link, keeping its token. `hook:223-250`, `src/lib/homeowner-binding.ts:162-188`.
- **B-37** Files are not copied: the project's Files list merges the parent lead's `lead_files` into its own at read time. `src/app/api/projects/[id]/files/route.ts:71-127`.
- **B-38** Questionnaire answers are not copied: the project's scope-answers route resolves the portal link by project id and, if none, binds through the originating lead. `src/app/api/projects/[id]/scope-answers/route.ts:1-60`.
- **B-39** The lead's quotes stay on the lead; the project's quote list and download routes resolve `project.lead_id` and delegate to the lead-side routes. `src/app/api/projects/[id]/quote/list/route.ts:22-34`, `src/app/api/projects/[id]/quote/download/route.ts:25-38`.
- **B-40** The contract's bytes stay with the lead too: only the file name travels to the project, and the project's contract list falls back to the lead's file or the signed quote. `src/app/api/projects/[id]/contract/list/route.ts:1-15`.

### (8) Data

- **B-41** Lead columns written after conversion: `bucket`, `lead_status_code`, `sub_status_code` (through the client's `updateLead`). `lead-drawer:3390-3393`.
- **B-42** `homeowner_project_links.project_id` is set where `lead_id` matches, `role = 'primary'` and `project_id` is null. `src/lib/homeowner-binding.ts:176-184`; the same write is exposed as `PATCH /api/homeowner-links/promote-lead-link` for the variation-order digitizer. `src/app/api/homeowner-links/promote-lead-link/route.ts:24-54`.
- **B-43** `GET /api/projects/records/count-by-lead?leadId=` counts a lead's non-archived projects; any count above zero locks the lead's issuing entity. `src/app/api/projects/records/count-by-lead/route.ts:17-48`.
- **B-44** `PATCH /api/projects/records/sync-customer-phone` copies a changed customer phone onto every project of a lead. `src/app/api/projects/records/sync-customer-phone/route.ts:18-43`.
- **B-45** `PATCH /api/projects/records/[id]/lead-link` sets a project's `lead_id` (used when the variation-order digitizer has to mint a lead for an old lead-less project). `src/app/api/projects/records/[id]/lead-link/route.ts:1-47`.

### (9) Responsive

- **B-46** On a phone the footer row is reversed and stacked, so "Create Project" is a full-width button above "Cancel". `lead-drawer:2571`, `:2649-2651`.

### (10) Problems

- **B-47** The auto-prompt only fires when a person changes the status to Signed inside the drawer. When the client signs online the server moves the lead to Signed and nobody is prompted; the studio has to notice the footer button. `lead-drawer:1187-1196`, `sign/[token]/submit/route.ts:432-456`.
- **B-48** Two success toasts fire for one conversion: the drawer's own ("Project created successfully") and the lead drawer's ("Project created — Opening your new project…"). `drawer:461-466`, `lead-drawer:3400`.
- **B-49** The lead's move to Signed › Project started is a separate client call made after the project exists; if the page closes in between, the lead keeps its old status while a project is attached. **[inferred]** `lead-drawer:3390-3393`.
- **B-50** The drawer is handed `lead.quoteStatus` (the saved value) while the button that opens it is decided by `editQuoteStatus` (the drawer's working value), so the button can appear and the form then refuse with the quote-approval message. **[inferred]** `lead-drawer:1786`, `:2475`, `:3381`.
- **B-51** The confirm dialog says "the lead will be closed automatically"; what happens is a move to Signed › Project started. `drawer:1338`.
- **B-52** The duplicate guard counts archived projects, but the lead-side "has a project" checks read the non-archived list; a lead whose project was archived and whose sub-status was changed would be offered "Create Project" and then refused, pointing to a project the user cannot see. **[inferred]** `records:197-201`, `lead-drawer:1508`, `:2484`.

---

## 3. The create drawer — "Create Project from Lead" / "New Project"

### (1) What it is / entry points

- **B-53** One component, `ProjectCreateDrawer`, with props `onClose`, `zIndex` (default 50), `countryCode`, `leadData`, `onProjectCreated`. Title is "Create Project from Lead" with a lead, "New Project" without. `drawer:67-121`, `:750`.
- **B-54** It is one scrolling form of eight sections followed by a confirm dialog; there are no steps, no progress indicator and no draft saving. `drawer:757-1328`, `:1331-1387`.

### (2) Layout

- **B-55** The shell is a panel fixed to the right edge, full viewport height, `w-full sm:max-w-2xl` (672px from 640px up), white, `shadow-2xl`, over a backdrop `bg-overlay-20p backdrop-blur-sm` one z-layer below. `shell:89-104`, `drawer:754`.
- **B-56** Header row: `px-4 sm:px-6 py-3 sm:py-4`, title as `font-heading font-semibold`, then the "Full View" button and a 36px close button (X 16px). The header gains a `0 2px 8px rgba(0,0,0,0.08)` shadow once the body is scrolled. `shell:114-133`.
- **B-57** Body: `flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-bg` (grey page behind white cards); sections are stacked with `gap-6`. In Full View the panel is the whole viewport and the content is centred in `max-w-2xl`. `shell:144`, `drawer:757`.
- **B-58** Each section is an uppercase 12px heading (`text-xs font-heading font-semibold text-on-surface-disabled uppercase tracking-wider`, 12px below) over a white card `rounded-xl border border-on-surface-border p-4`. `section:35-61`.
- **B-59** Fields sit in `grid grid-cols-1 sm:grid-cols-2 gap-4`; labels are 11px medium grey; inputs are 36px high (`h-9 text-sm`). `drawer:770-793`, `:798-825`.
- **B-60** Footer: sticky at the bottom, `p-3 sm:p-4`, white, with a `0 -2px 8px` shadow while more content is below; it holds the error summary (when any) above a right-aligned "Cancel" + "Create Project" pair. `shell:149-156`, `drawer:681-729`.
- **B-61** Section order: (pre-fill note) · Customer Details · Property Details · Project Information · Team & Assignment · Payment Schedule · Commission Structure · Documents · Notes. `drawer:760-1327`.
- **B-62** While any drawer is open the floating mAIson button is hidden (a `maison-fab-visibility` window event). `shell:65-70`.

### (3) UI elements

- **B-63** **Pre-fill note** (lead only): Info icon + "Pre-filled from {lead name} — review & adjust before creating." (falls back to "this lead"), in a pale purple rounded box. `drawer:760-767`.
- **B-64** **Customer Details:** "Name *" (placeholder "Client name", full width); "Mobile" (the shared phone input with dial code); "Email" (placeholder "email@example.com"). `drawer:769-794`.
- **B-65** **Property Details:** "Property Type" select (first row "Select property type...", then the region's list); "Property Address / Name" (placeholder "e.g. Toa Payoh Block 123"); "Area (sqft)" (placeholder "e.g. 1200"); "Style Preference" (placeholder "e.g. Minimalist, Japandi"). `drawer:797-826`.
- **B-66** **Project Information:** "Project Name *" (placeholder "e.g. Condo Renovation — John"); "Project Type *" select (first row "Select project type..."). `drawer:829-866`.
- **B-67** "Scope Overview": twelve pill chips — Living Room, Kitchen, Master Bedroom, Bedroom 2, Bedroom 3, Bathroom 1, Bathroom 2, Balcony, Service Yard, Study, Dining, Others. A chosen chip turns pale purple and gains a "✓ " prefix. `drawer:58-61`, `:868-887`.
- **B-68** "Quote total (final)" — a read-only grey row shown only when the lead's quote has line items: caption "After discount, incl. GST — from the signed quote" or "Incl. GST — from the signed quote", amount right-aligned in the heading font. `drawer:889-901`.
- **B-69** "Budget ({currency code})" — a number input, placeholder "e.g. 80000". `drawer:903-906`.
- **B-70** **Team & Assignment — picker.** A 36px rounded box with a plus icon reading "Choose a designer to assign…" (none yet) or "Search to add another designer…"; clicked, it becomes a text field "Search by name or specialty…" with a dropdown (max height 192px) of member rows: initial in a coloured disc, name, "{specialty} · {n} active". Empty copy: "No match — try a different name" or "All designers already assigned". `drawer:1528-1579`.
- **B-71** **Team & Assignment — assigned list.** Heading "Assigned ({n})" (shown in capitals); each row has a two-letter initials disc (five rotating gradient colours), name, specialty, a remove X, and — only with two or more designers and commission on — a percent box with "Total must be 100%" in the heading and, when off, "Split must total 100% — currently {x}%". `drawer:1456-1525`, `:47-54`.
- **B-72** "Start Date" and "Target Completion" are native date inputs side by side. `drawer:948-957`.
- **B-73** **Payment Schedule, from the quote** (lead with a schedule): badge "From digitized quote"; one read-only row per stage (calendar-check icon in a purple disc, stage name, trigger, a green percent badge); a "Total" line that is green at 100% and red otherwise. `drawer:962-992`.
- **B-74** **Payment Schedule, manual** (no quote schedule): badge "Default schedule" (lead) or "Manual entry" (no lead); editable rows of "Stage name", a percent box followed by "%", "Trigger", and a trash icon (hidden when one row is left); "+ Add Stage"; the same Total line; an inline error under it. `drawer:995-1078`.
- **B-75** Without a lead the manual schedule carries an info note: "We recommend digitizing a quote for accurate payment milestones. Go to Quote Digitizer" (the last words link to `/tools/quote-digitizer`). `drawer:1003-1011`.
- **B-76** **Commission Structure** opens with "Studio default rate:" and a badge such as "5.0% of revenue", or "No studio default rate configured." `drawer:1085-1100`.
- **B-77** Three mode tiles in a row (stacked on phones), each icon over label: "Use studio default" (BadgeCheck), "Set custom rate" for an owner / "Request different rate" for anyone else (Settings2), "Skip commission" (MinusCircle). Native tooltips: "Commission accrues at the studio-level rate."; "Override the studio default for this project." / "Submit a different rate for owner approval."; "No commission will accrue. You can set this up later from the project page; nothing else is blocked." `drawer:1103-1143`.
- **B-78** Under "Use studio default": "Commission will be locked on creation using the studio default rate." `drawer:1145-1147`.
- **B-79** Under "Skip commission": "No commission will accrue for this project. Invoicing, payments, milestones, and closure all work as normal — you can configure commission later from the project page if you change your mind." `drawer:1149-1156`.
- **B-80** Owner's custom rate: a "Flat Rate" / "Per Milestone" switch; Flat = a number box (placeholder "e.g. 10", step 0.5) + "% of project" + a Revenue / Profit select; Per Milestone = "Set commission % per milestone" with one percent box per schedule stage, or "No milestones defined."; then "Commission will be locked on creation." `drawer:1158-1208`.
- **B-81** A non-owner's request: a yellow box with the same switch (placeholder "e.g. 12"; heading "Requested commission % per milestone"), a two-row text area "Reason for different rate (optional)...", and the note "Project will be created in **Draft** stage. Owner must approve the commission before the project can proceed." `drawer:1210-1262`.
- **B-82** When the studio has commission switched off the whole section is replaced by: "Commission is turned off studio-wide. New projects will not accrue commission. You can re-enable this from Accounts → Workflow." `drawer:1265-1274`.
- **B-83** **Documents:** two dashed drop boxes, "Floor Plan" ("Upload floor plan") and "Signed Contract" ("Upload contract"), each with an upload icon. A chosen file shows as a chip with a file icon, the name and a trash button — purple for the floor plan, green for the contract. `drawer:1277-1316`.
- **B-84** **Notes:** a three-row text area, placeholder "Additional project notes...". `drawer:1319-1327`.
- **B-85** **Footer buttons:** "Cancel" (outlined) and the primary button with a FolderPlus icon reading "Create Project", "Creating..." while saving, or "Fix Errors to Save" on a red, shaking button for 0.6 s after a failed attempt. `drawer:701-727`.
- **B-86** **Footer error summary** (after the first attempt): a red box with an alert icon, "One thing to fix" or "{n} things to fix", and one "· {message}" line per open problem. `drawer:680-700`.
- **B-87** **Confirm dialog** (max 448px): title "Create Project"; body "This will create a new project “{project name}” for {customer or "the client"}. Invoices will be generated and the lead will be closed automatically."; a yellow box headed "Defaults Applied" (shown in capitals, Info icon) with "Payment Schedule" (each stage as "{name} {percent}%", comma-joined) and "Commission"; footnote "You can change these on the project page after creation."; buttons "Cancel" and "Create Project". `drawer:1331-1387`.

### (4) Interactions

- **B-88** "Full View" / "Compact View" (Maximize2 / Minimize2 icons) toggles the panel between 672px and the full viewport. `drawer:732-745`, `:754`.
- **B-89** Adding a designer rebalances every split to an even share (remainder basis points go to the first rows); removing one rebalances again; typing a percent changes only that row, on blur, and leaves the others frozen. `drawer:920-946`, `:1485-1495`, `src/lib/commission-split.ts:28-33`.
- **B-90** The picker opens on click and focuses its search field; it closes on any mouse-down outside or after a pick. `drawer:1424-1432`, `:1535`, `:1563`.
- **B-91** In the manual schedule every keystroke updates the row; a non-numeric percent becomes 0; "+ Add Stage" appends an empty row at 0%. `drawer:1013-1064`.
- **B-92** Choosing a commission mode resets the other modes' fields (custom rate, basis, per-milestone rows). `drawer:1104-1136`.
- **B-93** Switching to "Per Milestone" builds its rows once, from the stage names of the quote's schedule or the manual one at that moment. `drawer:1167-1171`, `:1217-1221`.
- **B-94** Picking a file stores `file.name` in state and clears the input; the trash icon clears it. A contract inherited from the lead has no trash icon. `drawer:1291`, `:1303-1305`, `:1311`.
- **B-95** "Create Project" validates; if clean it opens the confirm dialog; the dialog's "Create Project" closes the dialog and runs the save, which validates again. `drawer:709-717`, `:1379`, `:398-407`.
- **B-96** On a failed validation: the summary appears, the button turns red and shakes, a toast shows the single message or "{n} things need fixing before you can create this project" with the messages joined by " · ", and the form scrolls smoothly to the first problem that has an anchor (name, project name, type, team). `drawer:660-674`, `:389-395`.
- **B-97** Editing a field with an inline error clears that error; the footer summary is recomputed on every render so it shrinks as problems are fixed. `drawer:324-326`, `:775`, `:835`, `:848-849`, `:677-680`.
- **B-98** The header X and "Cancel" close at once with no "discard?" question; clicking the backdrop and pressing Escape do nothing (the drawer passes neither handler to the shell). `drawer:749-756`, `shell:94`, `:105-111`.
- **B-99** There is no autosave, no optimistic row and no undo; after success the projects and leads queries are invalidated and refetched. `hook:254-257`.
- **B-100** Keyboard: "C" pressed outside any input, select or open dialog fires a global `shortcut-create` event that the listing turns into opening the drawer; inside the drawer there are no shortcuts beyond native tabbing. `src/lib/hooks/use-keyboard-shortcuts.ts:41-47`, `:80-83`, `src/lib/hooks/use-shortcut-create.ts:9-15`, `list:128`.
- **B-101** Success toast, one of: "Project created successfully"; "Project created. Commission skipped — you can configure it later from the project page."; "Project created in Draft. Commission pending owner approval." Then `onProjectCreated(id)` and the drawer closes. `drawer:461-466`, `:567-568`.

### (5) States

- **B-102** Saving: the primary and the confirm buttons are disabled and read "Creating..."; nothing else is locked. `drawer:718`, `:725`, `:1380-1383`.
- **B-103** Create failure: toast with the server's message or "Failed to create project"; the drawer stays open with everything typed. `drawer:643-652`.
- **B-104** Assignees could not be attached: "Project created but assignees couldn't be attached. Please open the project and re-add them." `drawer:486-490`.
- **B-105** Commission write failed: "Project created, but the custom commission rate couldn't be applied — it will accrue at the studio default. Re-apply the rate from the project page." (owner) or "Project created, but your commission change request couldn't be filed. Please raise it again from the project page." `drawer:557-564`.
- **B-106** Invoice generation threw: "Project created, but invoices couldn't be generated — you can create them from Finance." `drawer:637-640`.
- **B-107** No loading or empty state of its own: members, project types and commission rules default to empty lists and fill in when their queries resolve. `drawer:138-141`.
- **B-108** There is no permission-denied state; the form is identical for every role except the commission tiles (owner sets, others request). `drawer:149-150`, `:1128`.

### (6) Motion

- **B-109** Enter: `animate-in slide-in-from-right duration-300` (tw-animate-css; the panel slides in from the right over 300 ms). There is no exit animation — the drawer is unmounted. `shell:100`, `list:670`.
- **B-110** The backdrop appears without a fade (no animation class). `shell:91-95`.
- **B-111** Header and footer shadows fade with `transition-shadow`; the panel carries `transition-[width]`, though Full View changes `max-width`, so the resize is likely a jump. **[inferred]** `shell:100-101`, `:115`, `:151`.
- **B-112** Failed attempt: the primary button gets `animate-[shake_0.4s_ease-in-out]` and red fill for 600 ms. Keyframes `shake`: 0/100% 0, 20% −4px, 40% +4px, 60% −3px, 80% +3px on the x axis. `drawer:663-664`, `:719-723`, `src/app/globals.css:1232-1238`.
- **B-113** Scope chips use `transition-colors duration-150`; commission tiles, drop boxes and picker rows use `transition-colors` at the default duration. `drawer:877`, `:1111`, `:1288`, `:1562`.
- **B-114** The scroll to the first error is `scrollIntoView({ behavior: "smooth", block: "center" })`. `drawer:672`.
- **B-115** Confirm dialog: overlay `bg-black/50` fades in; the panel fades and zooms from 95%, `duration-200`; the reverse on close; z-index 60. `src/components/ui/alert-dialog.tsx:39`, `:61`.
- **B-116** A global rule cuts every animation and transition to 0.01 ms under `prefers-reduced-motion: reduce`. `src/app/globals.css:1331-1338`.

### (7) Rules and logic

- **B-117** Required: "Customer name is required" · "Project name is required" · "Project type is required" · "At least one designer is required". `drawer:356-359`.
- **B-118** With commission on and two or more designers the splits must add to exactly 10,000 basis points: "Commission split must total 100% — currently {x}%". `drawer:360-368`.
- **B-119** When the quote brings no schedule, the manual percentages must add to exactly 100: "Payment percentages must total 100% (currently {n}%)". `drawer:369-372`.
- **B-120** Not validated: phone, email format, budget (may be empty, zero or negative), property type, the order of the two dates, a duplicate project name, stage names being empty. `drawer:354-377`.
- **B-121** Prefill from the lead: customer name / phone / email; property type ← `lead.type`; address ← `lead.area`; area ← sqft; style; project type; notes; contract file name. Scope, both dates and the floor plan start empty. `drawer:252-294`.
- **B-122** Default project name: "{property type or "Renovation"} — {lead name or "Client"}"; blank without a lead. `drawer:260`.
- **B-123** Default budget: the quote's final total (line items − document discount + GST, GST dropped when the quote has it off), else the lead's budget. `drawer:131-137`, `:265`.
- **B-124** Default team: the lead's assignees with splits recomputed to even; else the lead's single assignee at 100%; else the signed-in user when they are a designer; else nobody. `drawer:266-289`.
- **B-125** The form re-initialises only when the lead id changes, so a background refetch cannot wipe what was typed. `drawer:307-314`.
- **B-126** Manual schedule default: the studio's default payment template, else Deposit 10% "Upon signing" · Commencement 30% "Works commence" · Mid-Project 30% "50% completion" · Completion 30% "Handover". `drawer:205-238`, `src/lib/queries/finance.ts:347-359`.
- **B-127** Commission mode starts at "default", or "skip" when the studio's `commissionApprovalRequired` toggle is off. `drawer:144`, `:304`, `:319-321`.
- **B-128** Commission flags sent: Skip → `commissionLocked: true, commissionEnabled: false`; Default or an owner's custom rate → locked and enabled; a designer's request → `commissionLocked: false`. `drawer:416-420`, `:457-458`.
- **B-129** The drawer always sends `stage: "Draft"`. `drawer:422`, `:447`.
- **B-130** Area and style have no columns: they are appended to the notes as "Area: {n} sqft" and "Style: {text}" on their own lines. `drawer:424-428`.
- **B-131** Scope is stored as the chosen chip labels joined by ", ". `drawer:441`.
- **B-132** After the insert, in order: assignee rows are posted and awaited; the commission override or change request is created and awaited; the parent is told and the drawer closes; compliance tasks and invoices are then fired without waiting. `drawer:475-491`, `:498-565`, `:567-568`, `:570-642`.
- **B-133** Owner custom rate → one project commission override (percentage × 100), or one per milestone with trigger `milestone:{stage name}` and rates between 0 and 100. `drawer:500-522`.
- **B-134** Designer request → a commission change request for their own member record, with the reason and, for per-milestone, the average rate plus the list of rates. `drawer:523-556`.
- **B-135** Compliance tasks: when the property type text contains "hdb" / "condo", "penthouse", "apartment" / "landed", "terrace", "semi", "bungalow", the first ten `mandatory` items of the Singapore checklist for that class are created as tasks titled "[Compliance] {item}", type General, assigned to the first designer (else the user), linked to the project, with notifications off. `drawer:570-602`, `src/data/sg-checklists.ts:1712-1718`.
- **B-136** Invoices: when the budget is above zero, `POST /api/finance/generate-invoices` is called with the project, the total in cents (final quote total, else the budget) and the stages (the quote's, with fixed amounts, else the manual ones). It creates sequential **draft** invoices plus journal entries and refuses if the project already has invoices. `drawer:610-642`, `src/app/api/finance/generate-invoices/route.ts:219-237`, `:263-334`, `:60-88`.
- **B-137** Milestones are deliberately not seeded and no AI plan is generated on create; the timeline starts empty. `drawer:452-456`, `:604-608`.
- **B-138** "Owner" is `isOwner(user.tags)`; the server applies no role check to creation — `POST /api/projects/records` only requires a session. `drawer:149`, `records:171-173`, `src/lib/api-auth.ts:23-33`.
- **B-139** The create route sends no notification about the new project to the designer, the owner or the client; it only records a usage event `project_created`. (The lead's status move and a commission request go through their own paths, not read here.) `records:313-323`.

### (8) Data

- **B-140** `POST /api/projects/records` inserts into `projects`: `studio_id` (from the session), `project_seq_id`, `name`, `client_name`, `budget_total` and `budget_used` (rounded to whole currency units), `notes`, `lead_id`, `assigned_to`, `customer_phone`, `customer_email`, `property_type`, `property_name`, `property_address`, `project_type`, `scope`, `floor_plan_file_name`, `contract_file_name`, `stage`, `start_date`, `due_date`, `quote_data`, `quote_status`, `commission_locked`, `commission_enabled`, `company_id`. `records:265-304`.
- **B-141** Hard-coded on insert: `status: "planning"`, `current_phase: "Planning"`, `progress: 0`, `is_delayed: false`, `next_milestone: "Design Sign-off"`, `entity_locked_at: now` (the issuing entity is frozen from birth), `quote_status: "none"` when none is given. `records:272-277`, `:282`, `:297`, `:303`.
- **B-142** The server fills blanks from the lead: phone, email, property type, `area` → `property_address`, project type and the lead's issuing entity. `records:213-229`, `:283-288`, `:302`.
- **B-143** `timeline` and `timeline_status: "draft"` are written only when a `paymentSchedule` is in the body, one milestone per stage with `paymentPercent` and `commissionTrigger: true`; a generic stage name ("1st payment", "Stage 2", "M3") is replaced by a cleaned-up trigger. The drawer no longer sends it. `records:35-58`, `:241-253`, `:300`, `drawer:452-456`.
- **B-144** Insert-time promotion: stage becomes Active when the caller sent Draft and a designer, a quote status other than "none", a contract file name, at least one seeded milestone and `commissionLocked === true` are all present. `records:255-263`.
- **B-145** `project_assignees` rows (`project_id`, `member_id`, `commission_split_bps`) are upserted by `POST /api/projects/records/{id}/assignees`; `projects.assigned_to` holds the first designer. `src/app/api/projects/records/[id]/assignees/route.ts:87-106`, `drawer:442`, `:476-485`.
- **B-146** Without a lead, the hook first creates a **parked lead** through `POST /api/leads/mutations/create` with `parkedForProject: true`: name (or "Unknown"), phone, email, budget, property type, area, assignee, project type, `source: "Organic"`, `status: "assigned"`, the bucket that owns Signed, sub-status `PROJECT_STARTED`, notes "Customer record created with project: {project name}", and an activity-log line "Lead created with project". `hook:177-198`, `src/lib/project-lead.ts:55-92`, `src/app/api/leads/mutations/create/route.ts:160-187`.
- **B-147** The parked lead exists because quotes, signature requests, invoices and variation orders all hang off `leads.id`; the code calls a separate `customers` table "the longer-term right fix". `src/lib/project-lead.ts:4-26`.
- **B-148** Other rows a creation can write: `commission_rules` or `commission_change_requests`, up to ten `tasks`, `project_invoices` with `journal_entries` / `journal_lines`, and the homeowner profile and link. `drawer:505-552`, `:586-598`, `:626-634`, `hook:238-249`.

### (9) Responsive

- **B-149** Below 640px the drawer is full width; the "Full View" button is hidden; all two-column grids become one column; the three commission tiles stack; schedule rows wrap so the trigger drops to a second line (each text box has a 120px floor). `shell:101`, `drawer:737`, `:770`, `:1012-1022`, `:1103`.
- **B-150** The footer adds the device's bottom safe-area inset, and the drawer's z-index 50 exists to clear the phone's bottom navigation (z-40). `shell:151`, `drawer:115-117`.

### (10) Problems

- **B-151** **Documents upload nothing.** Both file inputs only read `files[0].name`; the name is saved to `floor_plan_file_name` / `contract_file_name` and the file never leaves the browser. `drawer:1291`, `:1311`, `:445-446`.
- **B-152** That phantom contract name satisfies the Draft "Contract uploaded" check. `checks:40-41`.
- **B-153** **Wrong field for the address.** "Property Address / Name" is prefilled from `lead.area`, which is the lead form's "Area / District", and the server's fallback does the same; the lead's own `propertyAddress` is never passed. The value is also written to both `property_name` and `property_address`. `drawer:257`, `:438-439`, `lead-drawer:3373`, `records:287`, `src/components/leads/new-lead-drawer.tsx:311`.
- **B-154** Area is labelled and stored as "sqft" whatever the lead's unit, and area and style end up as sentences inside Notes. `drawer:426-427`, `:818`.
- **B-155** **A designer's per-milestone request is lost.** Whether a request exists is decided by `customRate` being non-empty, but that box is not shown in "Per Milestone"; the project is then created with commission locked at the studio default, no request is filed and the toast says "Project created successfully". The same happens when the rate is left blank. **[inferred]** `drawer:418-419`, `:523-541`.
- **B-156** The confirm dialog's Commission line reads "Studio default (…)" unless a flat custom rate is typed — so it is wrong for Skip and for Per Milestone — and it finds the rule with `!r.projectId`, a looser test than the section's `!r.memberId && !r.projectId`. `drawer:1359-1367`, `:1086`.
- **B-157** "Defaults Applied" heads the confirm box even when the schedule came from the quote or the rate is custom. `drawer:1341-1354`.
- **B-158** "Invoices will be generated and the lead will be closed automatically" is shown always — also for "+ New Project", where there is no lead to close, and when the budget is zero and no invoices are made. `drawer:1338`, `:611`.
- **B-159** If the user edits Budget on a converted lead, the project's `budget_total` takes the edit but the invoices are still generated on the quote's total. `drawer:433`, `:614-617`.
- **B-160** The invoice call's response is parsed and discarded; only a thrown network error produces the toast, so a 400 or 409 from the route passes silently. `drawer:626-640`.
- **B-161** Invoices are generated while the project is Draft, the stage in which the Finance tab disables "Raise an invoice" and says billing unlocks later. `drawer:610-642`, `detail:3295-3319`.
- **B-162** Those invoices are matched to milestones by stage name, and at creation the timeline is empty, so they are created unattributed — the state the route's own comment warns about. **[inferred]** `src/app/api/finance/generate-invoices/route.ts:98-110`, `drawer:452-456`.
- **B-163** The red button says "Fix Errors to Save" on a form whose action is Create, and the plain success toast does not mention that the project is a Draft. `drawer:725`, `:465`.
- **B-164** No discard guard; and the "Go to Quote Digitizer" link is a plain `<a href>` that leaves the page and loses the form. `drawer:704`, `:1008`, `shell:129`.
- **B-165** A stale comment says the hook "auto-promotes from Draft to the next gate when all gates pass"; with no schedule sent, `seedTimeline.length > 0` is never true, so every project made through the drawer is a Draft. `drawer:421`, `records:255-263`.
- **B-166** Compliance tasks use the Singapore checklist in every region, ignore the checklist's own `autoCreateTask` flag, are created with `mutate` and no error handling, and are never announced to the user. `drawer:570-602`, `src/data/sg-checklists.ts:44-60`.
- **B-167** The manual total is compared with `!== 100`, so decimal percentages can fail on floating-point dust while the invoice route itself allows a 0.01 tolerance. **[inferred]** `drawer:370-371`, `generate-invoices/route.ts:46-58`.
- **B-168** The chain is not atomic: the parked lead is created before the project insert, so a failed insert leaves a hidden Signed › Project started lead with no project; the sequence number is taken before the insert as well. **[inferred]** `hook:177-218`, `records:233-239`.
- **B-169** The team picker lists every studio member under the word "designer", while the Draft wizard's designer step lists only members tagged `id`. `drawer:1435-1439`, `wizard:176`.
- **B-170** The comment in the shared template picker says "the project create drawer keeps its own inline picker (Phase 6.2)"; the drawer has no template picker. `src/components/projects/milestone-template-picker.tsx:29-31`.

---

## 4. "+ New Project" on the listing, and the old `/projects/new` page

### (1) What it is / entry points

- **B-171** The listing's header action is a small primary button, Plus icon + "New Project" (the words are hidden below 640px, leaving the icon). It is shown to every role. `list:307-309`.
- **B-172** It opens the same drawer with no lead; on success the listing navigates to `/projects/{id}`. `list:670-680`.
- **B-173** The listing's empty states do not offer creation: "No projects found" / "Try a different search or filter", and per stage "No projects in {stage}" / "Projects will appear here when assigned to this stage". `list:692-715`.

### (2)–(9) The legacy page `/projects/new`

- **B-174** Layout: a centred column `max-w-2xl`, page padding `px-4 sm:px-6 md:px-8`, a sticky secondary header (parent "Projects", back to `/projects`, title "Start New Project", subtitle "Initialize a new renovation project.") and one bordered card `p-6`. The page fades in (`animate-in fade-in duration-300`). `src/app/(main)/projects/new/page.tsx:50-60`.
- **B-175** Fields: "Project Name" (placeholder "e.g. Modern Minimalist @ Punggol"); "Client Name" (placeholder "Client Name"); "Property Type" (region list, first option preselected); "Budget ({code})" (number, placeholder "50000"); "Target Completion" (free text, placeholder "Dec 2024"); "Initial Status" as two outline chips, "Planning" and "In Progress". `new/page.tsx:62-110`.
- **B-176** One button, Save icon + "Create Project", right-aligned under a divider. It returns silently unless name and client are filled, then calls the shared create mutation and goes to `/projects` without waiting. `new/page.tsx:28-47`, `:113-117`.
- **B-177** Defaults it sends: budget 50,000 when blank, due date "Dec 2024" when blank, next milestone "Initial Deposit", thumbnail "/placeholder-user.jpg". `new/page.tsx:31-43`.

### (10) Problems

- **B-178** The page is orphaned but live; it creates a project with no designer, no project type, no schedule and a parked lead. `new/page.tsx:28-47`, `hook:177-198`.
- **B-179** Most of what it sends is ignored by the server: `type` (the route reads `propertyType`), `status` (always "planning"), `progress`, `delayed`, `nextMilestone` (always "Design Sign-off"). The "Initial Status" chips therefore do nothing. `records:138-169`, `:272-282`.
- **B-180** "Dec 2024" is sent into a `date` column, which should make the insert fail; the page has already navigated away and the only feedback is the generic "Failed to create project" toast. **[inferred]** `new/page.tsx:41-46`, `scripts/migrations/006_projects.sql:53`, `src/context/app-context.tsx:210-217`.
- **B-181** A blank budget silently becomes 50,000. `new/page.tsx:37`.
- **B-182** For "+ New Project" the drawer still shows the confirm sentence about closing the lead, and quietly creates a lead the user never asked for; that lead is what "View lead" opens from the new project. `drawer:1338`, `hook:177-198`, `detail:1664-1670`.

---

## 5. Draft projects, setup, and Draft → Active

### (1) What it is / entry points

- **B-183** `projects.stage` is one of `Draft`, `Active`, `Closed` (check constraint, default `Draft`); the migration's own definition is "DRAFT = setup incomplete, ACTIVE = all setup done and work in progress, CLOSED = completed". `supabase/migrations/20260503000002_project_stage_values.sql:1-21`.
- **B-184** `projects.status` is a separate value; it is written as "planning" on every create and no screen in the app writes it afterwards (the update hook can, but nothing calls it with a status), so "Planning" is the status every project shows. **[inferred]** `records:272`, `hook:305`, `list:103`.
- **B-185** On the listing a Draft project sits under the yellow "Draft" stage and every Draft row carries a second yellow badge, "Commission Pending", next to its status badge. `list:31-43`, `list:582-586`.
- **B-186** On the project page a Draft project shows the setup card at the top of the Overview, in the slot that holds the closure summary for closed projects. `detail:1959-1995`.
- **B-187** Only a Draft project's title is editable: a 24px pencil button beside the name turns it into an underlined input with "Save" and "Cancel". `detail:1635-1654`, `detail:509-631`.

### (2) Layout

- **B-188** Setup card: `rounded-2xl border border-surface-variant bg-surface-default shadow-sm`; a header row `px-5 py-4` (36px purple disc with a Sparkles icon, title, one-line description, counter at the right); a 4px progress bar; a list `px-5 py-3` of rows `py-2.5` separated by hairlines; a footer `px-5 py-3` on a grey tint with one right-aligned button. `card:41-98`.
- **B-189** Wizard: a centred dialog `sm:max-w-xl` (576px), `max-h-[90dvh]`, column layout so a long step scrolls inside; header (step line, 32px icon disc + title, description), body `py-2`, footer with "Back" at the left and "Skip for now" at the right. `wizard:127-166`.

### (3) UI elements

- **B-190** Card copy: "Set up this project" / "Finish the remaining steps to move this project to Active and unlock invoicing, payments, and commission." / "{done} of {total} complete". `card:48-55`.
- **B-191** The five checks, in order: "Designer assigned", "Quote added", "Contract uploaded", "Project timeline created", "Commission structure". A done row has a green check-circle and struck-through grey text; an open row has an empty circle and medium-weight text. `checks:23-57`, `card:68-90`.
- **B-192** Only "Quote added" has an inline link, "Add quote →", to `/projects/{id}/quotes/new`. `checks:27-30`, `card:81-88`.
- **B-193** Card button: "Complete setup →". `card:95-97`.
- **B-194** Wizard header line: "Step {i} of {n} · Activate “{project name}”". `wizard:131-135`.
- **B-195** Step "Assign a designer" — "Pick the interior designer who will own this project."; a select "Select a designer…" listing members tagged `id` as "{name} · {specialty}"; empty copy "No designers in this studio. Add team members in Accounts → Team."; button "Save & next →" ("Saving…" with a spinner). `wizard:33-37`, `:173-224`.
- **B-196** Step "Add a quote" — "Approved quote defines scope and budget. We'll open the Quote Digitizer in a new tab."; a purple note "The Quote Digitizer lets you upload, parse, and review a quote in detail. Once approved, return here and re-open the setup wizard — the quote step will be marked complete."; button "Open Quote Digitizer →" ("Opening…"). `wizard:38-42`, `:255-270`.
- **B-197** Step "Upload signed contract" — "PDF or image of the signed contract. Stored in this project's Files."; a dashed box "Click to choose a file" / "PDF or image, up to 25MB"; once chosen, a row with the file name, size in KB and a remove X; button "Upload & next →" ("Uploading…"). `wizard:43-47`, `:307-349`.
- **B-198** Step "Define payment schedule" — "How the contract value is split across milestones. Must total 100%."; rows of "Milestone name" + percent + remove; "+ Add milestone"; "Total: {n}%" (green at 100, red otherwise); button "Save & next →", disabled until 100. `wizard:48-52`, `:420-474`.
- **B-199** Step "Approve commission" — "Lock the commission structure for this project. Required to activate."; three option cards: "Use studio default" / "Commission accrues at the studio-level rate already set up. Recommended."; "Set a custom rate" / "Override the studio default for this project. Locked once you approve." (owner) or "Request a different rate" / "Submit a different rate to your studio owner. The project remains in Draft until approved."; "Skip commission for this project" / "No commission will accrue. You can configure it later from the project page; nothing else is blocked." `wizard:53-57`, `:503-506`, `:639-659`.
- **B-200** The commission step's button changes with the choice: "Use default & activate", "Skip & activate", "Approve & activate" (owner, custom) or "Submit request". A custom choice reveals the Flat Rate / Per Milestone controls, "Apply to:" Revenue / Profit, and for non-owners "Reason for the request (optional)". `wizard:630-635`, `:661-762`.
- **B-201** A compact indicator component exists — "{done}/{total}" with five dots and a tooltip "Missing:" listing open checks — but nothing renders it. `checks:61-98`.

### (4) Interactions

- **B-202** The wizard lists only the unfinished checks, in order, and shows one at a time; each step's own button saves and moves on; "Skip for now" moves on without saving; "Back" goes one step back and is disabled on the first. `wizard:84-105`, `:154-164`.
- **B-203** Completing the last listed step sets `stage: "Active"`, toasts "“{name}” is now Active." and closes; a failure toasts "Couldn't activate the project. Please try again." `wizard:95-116`.
- **B-204** Designer step: writes `assigned_to` on the project. `wizard:180-195`.
- **B-205** Quote step: closes the wizard and navigates, in the same tab, to `/leads?openLead={leadId}&openQuote=true` (the lead drawer with the quote editor open). `wizard:233-253`.
- **B-206** Contract step: posts the file to `/api/projects/{id}/files` with folder "contract", then sets `contract_file_name`. `wizard:281-305`.
- **B-207** Schedule step: starts from the project's milestones if any, else 10/30/30/30; on save it **replaces** the project's timeline with undated payment milestones (`id: pay-…`, `status: not-started`, `commissionTrigger: true`). `wizard:354-418`.
- **B-208** Commission step: Default → `commissionLocked: true, commissionEnabled: true`; Skip → locked, not enabled, toast "Commission skipped for this project. You can set it up later from the project page."; owner custom → override rule(s) then lock; non-owner custom → a change request, toast "Commission request submitted. The project stays in Draft until your owner approves.", and the wizard closes. `wizard:508-628`.
- **B-209** Title edit: Enter saves, Escape cancels; an empty name ("Project name is required.") or a name already used by another project in the studio ("A project with this name already exists.") blocks the save; a failed save reads "Couldn't save — please try again." `detail:526-566`, `:577-582`.
- **B-210** `StartMilestoneFlow` ("Start this milestone?" → "Started — what next?") changes a milestone's status only; it has no part in activating a project and does not look at the stage. `src/components/projects/start-milestone-flow.tsx:32-126`, `gantt:3450-3468`.

### (5) States

- **B-211** Step validation toasts: "Pick a designer first."; "Select a file first."; "Schedule must total 100% (currently {n}%)."; "Every milestone needs a name."; "Enter a flat rate between 0 and 100."; "Enter a rate for at least one milestone."; "Couldn't find your studio member record. Ask your owner to set the rate." `wizard:181-183`, `:282-284`, `:386-393`, `:535-538`, `:580-583`, `:556-559`.
- **B-212** Step failure toasts: "Couldn't save. Please try again."; the upload's server message or "Couldn't upload contract."; "Couldn't save schedule."; "Couldn't save commission. Please try again."; "This project has no customer attached. Try cloning again or contact support."; "Couldn't open Quote Digitizer. Please try again." `wizard:191`, `:301`, `:414`, `:624`, `:242`, `:249`.
- **B-213** While a project is Draft the app blocks: raising an invoice, a variation order or a purchase order (menu rows disabled, tagged "Draft project", with "Billing and VOs unlock once the project leaves Draft." / "POs unlock once the project leaves Draft. Receipts work anytime."), generating invoices, and completing a milestone — each with the toast "Financial actions are restricted while the project is in Draft."; the Finance overview's billing shows "Available once the project leaves Draft". `detail:2517-2520`, `:2634-2637`, `:2818-2821`, `:3295-3319`, `:3334-3355`, `:3655`, `:3708-3711`, `:3782-3785`, `:3825-3828`.
- **B-214** Recording an expense stays available in Draft, and "Close project" is offered only when the stage is Active. `detail:3343-3350`, `detail:1807-1811`.
- **B-215** The card has no "all done" state: when every check passes the page promotes the project and the card unmounts. `card:21-24`.

### (6) Motion

- **B-216** The card's progress bar animates its width over 300 ms (`transition-[width] duration-300`). `card:59-63`.
- **B-217** The wizard uses the shared dialog motion: overlay fade (`bg-overlay-40p`), panel fade + zoom from 95%, 200 ms, reversed on close; steps swap instantly with no slide. `src/components/ui/dialog.tsx:41-44`, `:63-66`, `wizard:146-152`.
- **B-218** Saving buttons show a spinning Loader2 icon (`animate-spin`). `wizard:219`, `:345`, `:470`, `:767`.

### (7) Rules and logic

- **B-219** "Designer assigned" = `assignedTo` is set. "Quote added" = `quoteStatus` exists and is not "none". `checks:25-30`.
- **B-220** "Contract uploaded" = a contract file name, **or** a project quote status of `client_signed`, **or** the lead's latest signature request is `signed`; a link still awaiting signature does not count. `checks:31-42`, `card:30-33`.
- **B-221** "Project timeline created" = the project's timeline has at least one milestone. `checks:43-52`.
- **B-222** "Commission structure" = `commissionLocked` is true, or the studio has the commission toggle off. `checks:53-56`.
- **B-223** **Promotion path 1 — on insert:** see B-144; unreachable from the drawer. `records:255-263`.
- **B-224** **Promotion path 2 — automatic, on the project page:** whenever a Draft, not-closed project is open and all five checks pass, the page sets the stage to Active once and toasts "All setup steps complete — project is now Active."; a failure re-arms it. It runs only while someone has that page open. `detail:1559-1587`.
- **B-225** **Promotion path 3 — the wizard's last step:** B-203; it does not re-check the other gates. `wizard:95-116`.
- **B-226** **Promotion path 4 — owner approves a commission change request:** the server inserts the rule, sets `commission_locked: true` and `stage: "Active"` where the stage is still Draft. `src/app/api/finance/records/commission-change-requests/route.ts:251-271`.
- **B-227** The update route whitelists `stage` among editable columns and applies no gate or role check to it; the agent's `update_project` can also set it. `record-id:88-94`, `:106-126`, `agent:2502`.
- **B-228** Saving a timeline also mirrors its payment milestones into the lead's contract quote schedule (one way). `record-id:128-140`.
- **B-229** The Gantt autosaves 1.5 s after the last change and the save refetches the project — which is what trips promotion path 2 after the first milestones are added. `gantt:502-532`, `detail:2912-2917`, `hook:352-354`.

### (8) Data

- **B-230** Columns the setup touches, all through `PATCH /api/projects/records/{id}`: `assigned_to`, `contract_file_name`, `timeline`, `timeline_status`, `commission_locked`, `commission_enabled`, `stage`, `name`; plus `project_files` (contract upload) and `commission_rules` / `commission_change_requests`. `hook:303-333`, `wizard:187`, `:291-297`, `:406-410`, `:512-551`.

### (9) Responsive

- **B-231** The wizard is capped at 90% of the dynamic viewport height with an internally scrolling body so the footer stays on screen on a phone; its width is the dialog default (`100% − 2rem`) below 640px. `wizard:128-129`, `src/components/ui/dialog.tsx:63`.
- **B-232** The setup card has no breakpoint rules; its header is one flex row, so the counter competes with the title on narrow screens. **[inferred]** `card:43-56`.

### (10) Problems

- **B-233** **"Complete setup" can do nothing.** The wizard maps check labels to steps and still expects "Payment schedule defined"; the check is now called "Project timeline created", so it maps to no step. When the timeline is the only open check the step list is empty and the wizard renders `null` — the button appears dead. `wizard:60-68`, `:84-89`, `:118-121`, `checks:50`.
- **B-234** The timeline check also has no link on the card, and nothing on the Overview says where a timeline is made. `checks:43-52`, `card:81-88`.
- **B-235** The schedule step ("Define payment schedule") is therefore unreachable, though its code and copy remain, and the commission step still tells the user to "Go back to the Payment schedule step". `wizard:361-475`, `:713-715`.
- **B-236** **Skipped steps do not stop activation.** A user can press "Skip for now" on every step but the last, finish the last, and the project becomes Active with those gates open. `wizard:95-101`, `:159-163`.
- **B-237** The quote step cannot be completed where it sends the user: it promises a new tab but navigates away in the same one, and no code writes the lead's quote back to `projects.quote_status`; the only in-app writers are the project's own "Upload Quote" actions, which set "draft". **[inferred]** `wizard:40`, `:245-246`, `detail:1516-1522`, `:1545-1549`.
- **B-238** "Add quote" on the card goes to a mock page that saves nothing (section 8). `checks:29`.
- **B-239** "Commission Pending" is printed on every Draft row whatever is actually missing; a project waiting only for a timeline is mislabelled. `list:582-586`.
- **B-240** Promotion path 2 depends on a browser having the page open, and paths 3 and 4 skip the other gates, so "Active" does not guarantee the five checks. `detail:1570-1587`, `wizard:107-116`, `commission-change-requests/route.ts:266-270`.
- **B-241** The wizard's contract step claims "up to 25MB" and sends the file to the general files route, while the dedicated contract route caps at 10 MB and accepts Word files; two upload paths, two sets of limits. `wizard:324`, `:291`, `src/app/api/projects/[id]/contract/route.ts:19-26`.
- **B-242** The designer step writes only the scalar `assigned_to`, not a `project_assignees` row, unlike the create drawer. `wizard:187`, `drawer:476-485`.
- **B-243** The stage is called "Draft", the status "Planning", the listing badge "Commission Pending", the card "Set up this project" and the wizard "Activate" — five words for one condition. `list:34`, `:103`, `:584`, `card:48`, `wizard:134`.

---

## 6. First setup of the timeline (where templates really are)

### (1) What it is / entry points

- **B-244** Project page → Management tab → Milestones sub-tab. With no milestones the Gantt area shows an onboarding card instead of the chart. `gantt:1963-1979`, `detail:2624`.
- **B-245** After milestones exist the same generators live in the toolbar's settings popover under "Generate timeline" (shown in capitals). `gantt:2378-2425`.

### (2) Layout

- **B-246** A card (`rounded-xl`, light shadow) with a centred column `max-w-md`, `py-10 px-6`: a 56px gradient tile with a CalendarClock icon, a heading, a line of help, then five full-width option rows 10px apart. Each row is `p-3.5 rounded-xl` with a 36px icon tile, a title and a caption; the first has a 2px purple border and a "Recommended" tag. `gantt:1973-2062`.

### (3) UI elements

- **B-247** Heading "Set up your project timeline"; help "Choose how you'd like to create milestones for this project". `gantt:1979-1980`.
- **B-248** Option 1 (Flag icon, "Recommended"): "Work phases + payment milestones" — "Category phases from your quote, plus Deposit / Progress / Final as their own milestones." `gantt:1987-2002`.
- **B-249** Option 2 (Sparkles): "Work phases from quote" — "One milestone per work category — no payment milestones." `gantt:2005-2017`.
- **B-250** Option 3 (DollarSign): "Payment schedule only" — "Billing milestones (Deposit / Progress / Final) from your studio's schedule." `gantt:2020-2032`.
- **B-251** Option 4 (ListTodo): "Start from a template" — "Five pre-built timelines for common property types in your region." `gantt:2035-2046`.
- **B-252** Option 5 (Plus): "Start from scratch" — "Add milestones one at a time and build the timeline yourself." `gantt:2049-2061`.
- **B-253** **Quote source dialog** (options 1 and 2; max 448px): title "Generate from a quote", description "We'll feed the line items into AI and produce a milestone-by-milestone timeline you can edit."; rows "This project's quote" ("{n} line items · {amount}" + a status chip) or, when the project has none, "Lead's quote" with the caption "The project doesn't have its own quote yet — using the lead's as a fallback."; always a dashed row "Upload a new quote" / "PDF, image, or spreadsheet · we'll parse and generate"; footer "Cancel". `src/components/projects/quote-source-picker-dialog.tsx:207-311`.
- **B-254** Its quote status chips: "Not started", "Draft", "Pending review", "Approved", "Rejected", "Sent for signature", "Signed by client". `quote-source-picker-dialog.tsx:38-46`.
- **B-255** **Template dialog** (option 4; max 448px): title "Pick a template", description "Each template seeds a typical milestone sequence. You can rename, drag, and edit dates after applying."; five radio-style rows, each with name, "{n} milestones · {x} weeks" and a one-line description; buttons "Cancel" and "Use template". `src/components/projects/template-picker-dialog.tsx:68-131`.
- **B-256** Singapore's five templates: "HDB BTO" (8 milestones), "HDB Resale" (8), "Condo" (8), "Landed Property" (10), "Commercial Fit-out" (8); summed durations give 9, 9, 8, 20 and 10 weeks **[inferred]**. Malaysia, the UAE and India have their own five; other regions fall back to Singapore's. `src/data/property-type-templates.ts:51-129`, `:381-394`.
- **B-257** Toolbar generators: "From work categories" ("Generating..." while busy), "Hybrid — work + payments", "From payment schedule", "From project template", and, with no quote, "Upload quote to enable" ("Parsing..."); the first two carry the tooltip "Add a quote to this project first" when disabled. Next to them: "Save as template" and "Manage templates" (→ `/accounts/milestone-templates`). `gantt:2362-2425`.
- **B-258** "From project template" opens a different picker: title "Reset to a template", "Replaces the current timeline. Pick from your saved templates or built-in defaults.", two groups ("Your saved templates", "Built-in") of cards showing name, description and "{n} milestones · {d}d · {p} payments", confirm "Reset timeline". `gantt:3692-3710`, `src/components/projects/milestone-template-picker.tsx:59-161`.
- **B-259** "Save as template" dialog: "Template name *" (placeholder "e.g. "HDB 4R — Standard"", prefilled "{project type} — Standard"), "Description (optional)" ("When should you use this template?"), a "Captured" box listing milestones, dependencies, descriptions, colours, payment triggers and total span, and the line "Per-project state (tasks, comments, blocked status, publish history) is not saved." `src/components/projects/save-milestone-template-dialog.tsx:75-121`, `gantt:3713-3719`.

### (4) Interactions

- **B-260** Options 1 and 2 open the quote source dialog; picking a row sends that quote's lines to `POST /api/projects/plan` and keeps the dialog open with disabled rows until generation ends. `gantt:1988`, `:2006`, `:2067-2083`, `quote-source-picker-dialog.tsx:185-197`.
- **B-261** "Upload a new quote" closes the dialog and opens the file chooser (`.pdf, .jpg, .jpeg, .png, .csv, .xlsx, .xls`); the file is parsed by `/api/quotes/parse`, saved onto the project as its quote with status "draft", and a work-phase plan is generated at once — even if the user had chosen the hybrid option. `gantt:1966-1972`, `:1726-1760`, `detail:1516-1523`.
- **B-262** Option 3 builds the bars immediately, with no dialog and no network call. `gantt:1707-1722`.
- **B-263** Option 4's "Use template" replaces the (empty) timeline with the template's milestones; there is no toast. `template-picker-dialog.tsx:62-66`, `gantt:2085-2093`.
- **B-264** Option 5 opens the "create milestone" dialog. `gantt:1261`, `:2050`.
- **B-265** Once a timeline exists, every regenerate asks a native confirm first if any milestone has dates or a status other than not-started: "Regenerate will replace every milestone on this timeline with a fresh set. Manual date and status edits will be lost.\n\nContinue?" `gantt:1609-1618`.
- **B-266** Everything is saved by the Gantt's autosave (1.5 s debounce, "Saving…/Saved" indicator); there is no Save button and no undo for a replaced timeline. `gantt:502-532`.

### (5) States

- **B-267** Busy copy on option 1: "Parsing quote..." then "Generating milestones..."; options 1–3 are disabled while busy; options 3 and 5 are disabled when the project is locked. `gantt:1989`, `:1997`, `:2007`, `:2022`, `:2051`.
- **B-268** Quote source dialog states: a dashed "Checking for a linked quote…" row with a spinner; a red box "Couldn't load this lead's quote. Check your connection and try again, or upload a quote below." with "Retry"; an empty note "No quote on file for this project. Upload a PDF or image of the contractor quote — we'll parse the line items and generate milestones from them."; and, while generating, "Generating milestones from the {project's / lead's} quote…". `quote-source-picker-dialog.tsx:246-302`.
- **B-269** Toasts: "Timeline generated from work categories"; "Timeline generated — work phases + payment milestones"; "Timeline generated from payment schedule"; "Failed to generate plan from the quote."; "Parsed {n} line items — generating plan..."; "No line items found in the uploaded quote"; "Failed to parse quote file"; "Reset timeline to “{name}”"; "Template “{name}” saved". `gantt:1653`, `:1672`, `:1699`, `:1721`, `:1741-1746`, `:1754`, `:3705`, `save-milestone-template-dialog.tsx:63`.
- **B-270** The shared template picker shows "Loading templates…" and "No templates available yet." `milestone-template-picker.tsx:70-72`, `:104-108`.

### (6) Motion

- **B-271** The onboarding card enters with `animate-fade-up`: keyframes `fadeUp` from `opacity 0, translateY(12px)` to rest, 0.4 s ease-out, fill both. `gantt:1973`, `src/app/globals.css:1222-1225`, `:1654-1656`.
- **B-272** Option rows and dialog rows change border and background with `transition-colors`; spinners use `animate-spin`; the dialogs use the shared 200 ms fade + zoom. `gantt:1990`, `quote-source-picker-dialog.tsx:78`, `:248`, `template-picker-dialog.tsx:94`.

### (7) Rules and logic — what each source seeds

- **B-273** **Work phases** come from `POST /api/projects/plan`: an AI model (`google/gemini-2.5-flash` through OpenRouter) turns the quote lines into milestones with durations and colours, plus tips and risk warnings; it never returns tasks; on failure the route falls back to a plan built from the quote's categories or the static template. `src/app/api/projects/plan/route.ts:14`, `:205`, `:270-288`, `:398-459`, `gantt:1624-1656`.
- **B-274** Each work milestone is tagged `milestoneKind: "work"` and, when its phase is fed by exactly one quote category, `sourceCategory`. `generators:272-302`.
- **B-275** Quote lines are sorted into thirteen fixed phases by keyword — Preliminaries, Demolition, Masonry & Tiling, Plumbing, Electrical, Partition & Ceiling, Carpentry, Countertop, Flooring, Glass & Mirror, Doors & Hardware, Painting, Cleaning & Handover — with unmatched lines falling into Preliminaries and free / by-client / inclusive lines ignored. `src/lib/canonical-phases.ts:11-17`, `:31-45`, `:50-63`.
- **B-276** **The payment schedule** is resolved in this order: payment milestones already on the timeline → the contract quote's schedule (signed, else primary, else first; never a variation order) → the studio's default template → the platform default 10/30/30/30. `generators:126-136`, `gantt:399-419`.
- **B-277** "Payment schedule only" makes one amber (`#F19E2B`) bar per stage, tiled evenly across the existing span or 56 days from today, each `not-started`, `commissionTrigger: true`, `milestoneKind: "payment"`, carrying its percent or fixed amount. `generators:39-43`, `:145-177`, `gantt:1707-1722`.
- **B-278** "Hybrid" keeps the work bars free of money and adds each payment stage as its own one-day marker spread evenly from the first day to handover, then sorts everything by date with a payment marker ahead of a work bar on the same day. `generators:197-259`.
- **B-279** A **property-type template** seeds only name, duration and colour, laid end to end **starting today**, all `not-started`; no payment percentages, no dependencies, no tasks. The dialog preselects a template from the project's property type by keyword (BTO → new build, office/retail → commercial, landed/terrace → premium, condo/apartment → standard, otherwise "full reno"). `gantt:453-473`, `property-type-templates.ts:400-409`.
- **B-280** A **studio-saved milestone template** stores, per milestone, name, day offsets, description, colour, payment percent, commission flag and dependencies; applying it rebuilds a fresh timeline anchored on the first existing start date or today, all `not-started`, with no tasks or comments. `src/lib/milestone-templates.ts:41-82`, `:87-116`, `gantt:3696-3706`.
- **B-281** **Built-in milestone templates** are one "{project type} — Standard" per project type, generated from the static timeline list with a fixed payment split — e.g. Renovation-Full Home 10/25/15/25/10/10/5 across Hacking & Demolition, Masonry & Tiling, Electrical & Plumbing, Carpentry Fabrication, Painting, Cleaning & Touch-up, Handover & Defect Check. `src/data/system-milestone-templates.ts:25-38`, `:62-84`, `src/data/mock-timeline-templates.ts:9-56`.
- **B-282** No generator starts a milestone: every seed is `not-started`, by an explicit rule. `generators:163-165`, `docs/rules/projects.md:70`.

### (8) Data

- **B-283** All of the above write `projects.timeline` (a JSON array) and, for generated plans, `timeline_status: "draft"` and `ai_plan_metadata`. Studio templates live behind `/api/studio/milestone-templates`. `detail:2912-2925`, `src/lib/queries/milestone-templates.ts:16-34`.

### (9) Responsive

- **B-284** The Gantt, with this onboarding card, is wrapped in a desktop-only block; below 1024px the Milestones tab shows a list whose empty state is "No timeline yet" / "Add milestones to build the project timeline." with one button, "Add milestone". A phone user cannot use a quote, a schedule or a template to start the timeline. `detail:2627-2631`, `:2705`, `:2927`, `src/components/projects/mobile-milestone-list.tsx:87-95`.

### (10) Problems

- **B-285** Four overlapping template stores exist for the same job: the static list per project type, the five-per-region property-type templates, studio milestone templates (with built-ins) and per-studio "timeline templates" in document templates — and the two pickers show different ones. `gantt:39`, `:397`, `:422-449`, `template-picker-dialog.tsx:14-20`, `milestone-template-picker.tsx:8`.
- **B-286** Templates from the "Start from a template" picker carry no payment milestones, so a project started that way has a timeline (gate passed, project Active) but nothing that can trigger billing. **[inferred]** `gantt:453-473`, `checks:50-51`.
- **B-287** Template and schedule bars are dated from today, not from the project's Start Date entered at creation. `gantt:454`, `:1713`.
- **B-288** Choosing "Upload a new quote" from the hybrid option silently produces the work-only plan. `gantt:1750-1751`, `:2076-2080`.
- **B-289** The regenerate guard is a native browser `confirm`. `gantt:1614-1617`.
- **B-290** The quote dialog says the lines are fed "into AI" for both options, and the option-3 caption names "your studio's schedule" although the quote's own schedule takes precedence. `quote-source-picker-dialog.tsx:217-220`, `gantt:2030`, `generators:131-135`.
- **B-291** `useTimelineTemplates(undefined, projectType)` is called with a second argument the hook does not take. `gantt:397`, `src/lib/queries/studio-config.ts:451`.

---

## 7. Clone

### (1)–(4) What exists

- **B-292** `CloneProjectDialog` (max 448px): title Copy icon + "Clone project"; "Cloning {name}. Who is the new project for?"; three radio-style rows — "Same customer" ("Attach to {lead name}" or "Reuse the source project's customer"; only when the source has a lead), "A different existing customer" ("Pick from your leads"), "A new customer" ("Create their record now"). `clone-project-dialog.tsx:150-186`.
- **B-293** "A different existing customer" reveals a searchable select "Customer" (placeholder "Search by name or phone...", empty "No customers found"); "A new customer" reveals "Customer name" ("e.g. Jane Tan", autofocus), "Phone (optional)", "Email (optional)" ("jane@example.com"). Buttons: "Cancel" and "Clone project" ("Cloning..."). `clone-project-dialog.tsx:188-244`.
- **B-294** The default choice is "Same customer" when the source has a lead, otherwise "A new customer"; the submit button is enabled only when the chosen mode has what it needs. `clone-project-dialog.tsx:56`, `:88-94`.

### (7)–(8) Rules and data

- **B-295** "A new customer" mints a parked lead (as in B-146) named after the clone before cloning; errors toast the message or "Couldn't prepare the clone". `clone-project-dialog.tsx:108-132`.
- **B-296** The clone route requires `projectId` and `leadId`, takes the next sequence number, and inserts "Clone of {name}" as a Draft with status "planning", progress 0, `budget_used` 0, `commission_locked: false`, no dates. `clone/route.ts:21-26`, `:44-51`, `:56-94`.
- **B-297** Copied from the source: client name and profile, phase, budget total, both designer fields, next milestone, notes, customer phone and email, property type / name / address, project type, scope, floor-plan and contract file names, the whole timeline, the quote snapshot and its status, the AI plan metadata, the country. `clone/route.ts:59-89`.
- **B-298** Not copied: `project_assignees` rows, `company_id` / entity lock, commission rules, files, invoices, tasks. **[inferred from the insert list]** `clone/route.ts:56-94`.

### (10) Problems

- **B-299** Nothing opens the dialog and nothing calls the hook: clone is unreachable. The rules file and the PRD both list project clone as a feature. `hook:791-826`, `docs/rules/projects.md:42`, `docs/prd/09-projects.md:49`, `:67`.
- **B-300** The route has no one-project-per-lead guard, so "Same customer" would make a second project on one lead — the case the create route forbids. `clone/route.ts:54-68`, `records:194-211`.
- **B-301** The timeline is copied with its statuses, dates, comments and tasks intact, and a new customer keeps the old customer's name, phone and email on the project row. **[inferred]** `clone/route.ts:60`, `:73-74`, `:83`.
- **B-302** The clone carries the source's contract file name, so it starts with "Contract uploaded" ticked. **[inferred]** `clone/route.ts:81`, `checks:41`.

---

## 8. The mAIson agent's `create_project`

- **B-303** Tool description: "Create a new project. Can optionally be created from an existing lead (which moves the lead to CLOSED)." Arguments: `name` (required), `lead_identifier`, `client_name`, `client_phone`, `client_email`, `project_type` ("E.g., 'Renovation-Full Home', 'New-Full Home'"), `property_type` (HDB / Condo / Landed), `scope`, `budget`, `assigned_to_name`, `start_date`, `notes`. `src/lib/agents/tools.ts:301-325`.
- **B-304** Allowed for callers tagged owner, admin or id. `agent:2382`.
- **B-305** With a lead it first moves the lead to the Signed bucket with sub-status `PROJECT_STARTED`, logs "Project created — lead moved to {bucket}" and sends the stage-change notification; then it inserts the project as Draft / planning with the arguments, the lead's country and an idempotency key. `agent:2386-2438`, `:2447-2476`.
- **B-306** The chat then shows a "View Project" link, and the result summary reads "Created project “{name}” from lead — Draft stage". `src/components/layout/id-buddy-panel.tsx:431-439`, `agent:2486-2489`.
- **B-307** **Problem:** the insert supplies no `project_seq_id`, a NOT NULL column with no default or trigger, and sends `budget_total: null` when no budget is given although that column is `NOT NULL DEFAULT 0`; either should make the insert fail. **[inferred]** `agent:2447-2468`, `supabase/migrations/20260503000001_project_sequential_id.sql:47`, `scripts/migrations/241_fix_project_seq_drift.sql:71`, `scripts/migrations/006_projects.sql:50`.
- **B-308** **Problem:** the lead is moved and the notification sent before the insert, so a failed insert leaves a lead marked Project started with no project; there is no one-project-per-lead check; a project created without a lead gets no parked lead (`lead_id` null) and no client name other than the project name. `agent:2386-2438`, `:2450`, `:2463`.
- **B-309** **Problem:** the agent's system prompt tells the model the lead "auto-moves to CLOSED/PROJECT_CREATED", a status that no longer exists. `src/lib/agents/system-prompt.ts:449`, `src/data/lead-bucket-config.ts:171-173`.

---

## 9. The project's quote page, and the quote / contract / payment-schedule routes

### `/projects/{id}/quotes/new` — "Digitize Quote"

- **B-310** Reached only from the setup card's "Add quote" link. Layout: `max-w-5xl` centred, sticky header (parent = project name, back to the project, title "Digitize Quote", subtitle "Upload a PDF or image of your contractor quote to digitize it."). `src/app/(main)/projects/[projectId]/quotes/new/page.tsx:44-51`.
- **B-311** Step "upload": a dashed card, upload icon in a 64px disc, "Click to upload or drag and drop" / "PDF, PNG, JPG up to 10MB". Clicking it opens no file chooser; it starts a timer. `quotes/new/page.tsx:30-41`, `:53-61`.
- **B-312** Step "scanning": the shape loader with a percent in its centre, "Analyzing Document...", "Our AI is extracting line items, quantities, and prices. This usually takes a few seconds.", a progress bar and three lines that tick at 30 / 60 / 90% — "Extracting Text", "Identifying Tables", "Calibrating Margins". The percent rises 5 points every 100 ms (two seconds in all). `quotes/new/page.tsx:33-40`, `:63-90`.
- **B-313** Step "review" (slides up, `animate-in slide-in-from-bottom-4 duration-300`): a yellow note "AI detected 12 line items. Please review the extracted data below. **2 items had low confidence scores.**"; a table "Extracted Line Items" (Description · Qty · Unit Cost · Total · Margin %) with four fixed rows; chips "Total Cost: $18,450.00" and "Est. Margin: 22%"; "Add Manual Item"; buttons "Save as Draft" and "Finalize Quote". `quotes/new/page.tsx:92-158`.
- **B-314** **Problem:** the whole page is a mock. No file is read, the rows and totals are hard-coded (and do not match "12 line items"), "Save as Draft", "Add Manual Item" and the row trash icons do nothing, and "Finalize Quote" only navigates to `/projects`. The "Quote added" check cannot be satisfied here. `quotes/new/page.tsx:30-41`, `:123-128`, `:148-156`.

### Routes

- **B-315** `GET /api/projects/{id}/quote/list` returns the lead's quote documents for the project (empty when the project has no lead); `GET …/quote/download?source=` redirects to the lead's download route. `projects/[id]/quote/list/route.ts:12-39`, `projects/[id]/quote/download/route.ts:11-43`.
- **B-316** `POST /api/projects/{id}/contract` uploads a contract (PDF, Word, JPG, PNG; 10 MB) into the `contract-files` bucket and writes `contract_file_name` + `contract_file_url`; errors "File too large (max 10MB)" and "Invalid file type. Allowed: PDF, Word, JPG, PNG". It is used by the project page's Contract card, not by creation. `projects/[id]/contract/route.ts:19-27`, `:44-52`, `:83-98`, `detail:4931`.
- **B-317** `POST /api/projects/{id}/contract/from-signature` renders the client-signed quote PDF from the lead's signature request and attaches it to the project as its contract — the bridge for "signed online in Leads, so no file was ever uploaded". `projects/[id]/contract/from-signature/route.ts:1-21`.
- **B-318** `GET /api/projects/{id}/contract/list` lists downloadable contracts in priority order: files uploaded to the project's contract folder → the lead-side upload → the old `contract_file_url` → the signed quote. `projects/[id]/contract/list/route.ts:1-15`.
- **B-319** `POST /api/projects/{id}/payment-schedule/rebalance` is retired: it answers HTTP 410 "Retired — percentages are not edited to absorb an over-bill; run POST /api/finance/records/rebalance". `projects/[id]/payment-schedule/rebalance/route.ts:25-35`.
- **B-320** `POST /api/quotes/templates/apply-project` is not a project template: it applies a full-quote ("project" scope) quote template to an empty quote on a lead, and its hook has no caller. `src/app/api/quotes/templates/apply-project/route.ts:1-52`, `src/lib/queries/studio-quote-templates.ts:123-168`.

---

## 10. Vocabulary: project types, property types, scope, numbering

- **B-321** **Project types** offered in the drawer are the studio's `project_type` taxonomy when it has rows, else six defaults: "Renovation-Full Home", "New-Full Home", "Renovation-Partial", "New-Partial", "Commercial", "Others". `drawer:139-140`, `src/data/lead-bucket-config.ts:293-301`.
- **B-322** A second, unrelated project-type store exists: tables `project_types` + `milestone_templates`, served by `/api/reference/project-types` (GET lists studio rows plus global defaults; PUT replaces a studio's types and each type's milestone templates with start offsets, durations, payment percentages, payout models and split logic). It feeds only the Accounts "project milestones" settings screen; the create drawer does not read it. `src/app/api/reference/project-types/route.ts:39-198`, `src/components/accounts/project-milestones.tsx:17`, `:59`.
- **B-323** Its categories are "Residential – HDB", "Residential – Condo", "Residential – Landed", "Commercial". `reference/project-types/route.ts:28-33`.
- **B-324** **Property types** come from the region config. Singapore's eighteen: HDB 2-Room, HDB 3-Room, HDB 4-Room, HDB 5-Room, HDB Executive, BTO 3-Room, BTO 4-Room, BTO 5-Room, Executive Condo, Condo, Penthouse, Landed — Terrace, Landed — Semi-D, Landed — Bungalow, Commercial — Office, Commercial — Retail, Others. `src/lib/region-config.ts:157-175`, `drawer:63`.
- **B-325** The project stores the property type as its label text, and the project header shows "{project type or "Renovation"} · {property type}" under the client. `drawer:437`, `detail:1674-1680`, `:1696-1702`.
- **B-326** **Scope** is a fixed list of twelve room names in the drawer, saved as one comma-separated string; it is not the lead's questionnaire, not the quote's sections and not the visualizer's rooms. `drawer:58-61`, `:441`.
- **B-327** **Project number.** Each studio has its own counter in `studio_sequences` (`sequence_name = 'project'`); `next_project_seq_id` returns the next integer, self-healing against the real maximum; `(studio_id, project_seq_id)` is unique. `supabase/migrations/20260503000001_project_sequential_id.sql:5-51`, `scripts/migrations/241_fix_project_seq_drift.sql:39-59`.
- **B-328** It is shown as "#{n}" in small grey tabular figures before the project name on the project page, and as "{name} — #{n}" in the closure dialog. There is no prefix, padding or year. `detail:1647-1651`, `:571-574`, `src/components/projects/closure-dialog.tsx:115`.
- **B-329** `src/lib/numbering.ts` does not number projects: it resolves invoice / PO / ticket prefixes (defaults "INV", "PO", "T"; an issuing entity's override beats the studio's) and formats "{prefix}-{0001}". `src/lib/numbering.ts:26-30`, `:58-83`.
- **B-330** The number is taken before the insert and by clones too, so a failed create leaves a gap in the sequence. **[inferred]** `records:233-239`, `clone/route.ts:44-51`.

---

## 11. `project_templates` — a template store with no screen

- **B-331** Table `project_templates`: name (unique per studio), description, project type, property type, a free-form `template_data` JSON, `is_default`, creator. `supabase/migrations/20260419000003_project_templates.sql:1-16`.
- **B-332** It has two parallel API surfaces: `/api/projects/templates` (+ `/{id}`: GET, POST, PUT, DELETE through the service role; errors "Template name is required", "Template data is required", "A template with this name already exists", "Template not found") and `/api/project-templates/records` (+ `/{id}`: GET, POST, PATCH, DELETE through the scoped client). `src/app/api/projects/templates/route.ts:10-99`, `src/app/api/projects/templates/[id]/route.ts:10-112`, `src/app/api/project-templates/records/route.ts:20-90`, `src/app/api/project-templates/records/[id]/route.ts:17-89`.
- **B-333** The hooks `useProjectTemplates`, `useSaveProjectTemplate`, `useUpdateProjectTemplate` and `useDeleteProjectTemplate` are imported by no component, and nothing calls `/api/projects/templates`. `src/lib/queries/project-templates.ts:32-118`.
- **B-334** `ProjectTemplateData` is typed as `Record<string, unknown>`; no code defines what a project template contains or applies one to a project. `src/types/app.ts:4839-4853`.

---

## 12. Where the docs and the code disagree

- **B-335** `docs/rules/projects.md` describes a "Project Create Dialog (`project-create-dialog.tsx`)", "max-w-3xl, 85vh"; that file does not exist — the form is a drawer. `docs/rules/projects.md:18`, `:47-49`, `:106`.
- **B-336** The same file lists the dialog's sections without Payment Schedule and Commission Structure. `docs/rules/projects.md:50`, `drawer:961-1274`.
- **B-337** Rules, the leads rules and the user guide all say conversion moves the lead to "CLOSED / PROJECT_CREATED" (guide: "Closed / Project Created"); the code writes sub-status `PROJECT_STARTED` under Signed, and `PROJECT_CREATED` survives only as a deprecated alias. `docs/rules/projects.md:52`, `docs/rules/leads.md:325`, `docs/PROJECTS_AND_FINANCE_GUIDE.md:217-218`, `src/data/lead-bucket-config.ts:171-173`.
- **B-338** Rules and guide say an AI timeline plan is generated in the background when a project is created from a lead with an approved quote; the code removed that on purpose. `docs/rules/projects.md:53`, `docs/PROJECTS_AND_FINANCE_GUIDE.md:218-219`, `drawer:604-608`.
- **B-339** The rules file groups stages as Design / Execution / Closed; the app uses Draft / Active / Closed. `docs/rules/projects.md:14`, `list:31-68`.
- **B-340** The rules file lists "Project clone: `useCloneProject` mutation" and "`SetupProgress`" among live features; clone has no entry point and the progress indicator is never rendered. `docs/rules/projects.md:42-43`, `checks:61`.
- **B-341** The guide says the timeline's empty state "offers three ways to start: Generate from a quote, Start from a template, or Start from scratch"; the screen offers five. `docs/PROJECTS_AND_FINANCE_GUIDE.md:149-150`, `gantt:1983-2061`.
- **B-342** The leads rules say the footer's "Create Project" shows "When status is Met or Signed"; the code shows it whenever the prerequisites are met, whatever the status. `docs/rules/leads.md:341`, `lead-drawer:2467-2484`.
- **B-343** The PRD's lifecycle line mentions clone and "studio-default timeline templates with per-project overrides" but says nothing about Draft, the five checks or activation. `docs/prd/09-projects.md:46-52`, `:63-67`.
- **B-344** `docs/features/projects-overhaul/backend-dependencies.md` covers indexes and joins for the project page's feeds and has nothing on creation. `docs/features/projects-overhaul/backend-dependencies.md:63-115`.
- **B-345** `src/lib/lifecycle/transitions.ts` is about archiving and un-archiving leads and projects (and cancelling their open tasks and reminders), not about Won → project; there is no lifecycle module for conversion. `src/lib/lifecycle/transitions.ts:1-21`, `:285-357`.

---

## Uncertain / not verified

- Nothing was run. Every visual fact (sizes, colours, what shows when) is read from Tailwind classes and conditions, not from a rendered screen.
- **B-155** (per-milestone commission request dropped) and **B-233** (dead "Complete setup") are worked out from the code paths; both look certain on reading but were not reproduced.
- **B-307** (the agent's insert failing): I found no default or trigger for `project_seq_id` in `supabase/migrations` or `scripts/migrations`, and `budget_total` is `NOT NULL DEFAULT 0` in `006_projects.sql`; a later migration I did not find could have relaxed either. Migration 241 itself notes that 69 production projects once had a NULL sequence number.
- **B-180** (the old page's "Dec 2024" rejected by the `date` column) depends on Postgres' date parsing; not tested.
- **B-184** (status stays "Planning"): based on finding no caller that passes `status` to the update hook or route; the agent's `update_project` can set it, and I did not read the closure route in full.
- **B-237**: I searched the leads, quotes and signing routes for a write to `projects.quote_status` / `quote_data` and found none besides the create route and the project page's own upload handlers; a database trigger could exist.
- **B-162**: whether the generated draft invoices are later re-linked to milestones (for example by the finance rebalance) was not checked — that belongs to the finance reader.
- **B-256**: milestone counts are read from the file; the week figures are my arithmetic (`Math.round(days / 7)`).
- **B-135**: the item titles of the Singapore checklist were not listed here; a script read of the file gave, for HDB, "Apply for HDB renovation permit" first, for condo "Obtain MCST renovation approval", for landed "Check if URA planning permission is required".
- The enter animation's easing for `animate-in slide-in-from-right` comes from the `tw-animate-css` package defaults, which I did not open.
- The general files route (`/api/projects/{id}/files`) was read only around its validation; I saw no size check there, so the wizard's "up to 25MB" may be unenforced.
- I did not open `PhoneNumberInput`, `SecondaryPageHeader`, `SearchableSelect` or the commission hooks; their internals are described only as the drawer uses them.
- The listing itself, the project page's tabs, the Gantt beyond its empty state, archive / delete and closure are other readers' slices and are touched here only where they bear on creation and Draft.
