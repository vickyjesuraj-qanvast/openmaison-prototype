# OpenMaison 1.0 — Accounts Setup inventory · Slice B: Lead Management

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. 2.0 names appear only for orientation (hand-off E).

Conventions: *Words* are quoted verbatim from code; `{x}` marks an interpolated value; icon glyphs are omitted. "Hand-off A / C / D / E" = Studio (A), Quotes & Pricing (C), the data model, migrations and route permission checks in depth (D), 2.0 today (E) — named, not inventoried. Behaviour the Leads audit already records is cited, not repeated: "leads A-nn / B-nn / C-nn" = `../leads-1.0-inventory/` (read at the same commit). This slice records what the six Lead Management screens show, save and enforce, what the rest of the app reads from what they save, and the lead settings that live elsewhere. Abbreviations: `ACC` = `src/app/(main)/accounts/page.tsx`; `LX` = `src/app/(main)/accounts/lead-experience-tab.tsx`; `JCE` = `src/app/(main)/accounts/journey-config-editor.tsx`; `LWT` = `src/app/(main)/accounts/lead-webhooks-tab.tsx`; `FE` = `src/components/accounts/funnel-editor.tsx`; `TLE` = `src/components/accounts/taxonomy-list-editor.tsx`; `J` = `src/lib/leads/journey.ts`; `FT` = `src/lib/leads/funnel-transitions.ts`; `FV` = `src/lib/leads/funnel-validation.ts`; `LBC` = `src/data/lead-bucket-config.ts`; `DA` = `src/lib/leads/drawer-autosave.ts`; `DD` = `src/lib/leads/duplicate-detection.ts`; `DRW` = `src/components/leads/lead-detail-drawer.tsx`; `CTX` = `src/context/app-context.tsx`; `SC` = `src/lib/queries/studio-config.ts`; `QS` = `src/lib/queries/studio.ts`; `ID` = `src/components/leads/journey/inactivation-dialog.tsx`; `WH` = `src/app/api/webhooks/leads/[token]/route.ts`; `WP` = `src/lib/webhook-lead-parser.ts`; `SS` = `src/app/studio-setup/page.tsx`; `TR` = `src/lib/transformers.ts`; `M033` / `M090` … = `scripts/migrations/033_…sql`, `090_…sql` ….

## Vocabulary (where each word is defined)

- **Accounts Setup / Lead Management group** — the page `/accounts`, header *"Accounts Setup"* (`ACC:615`); its sidebar group *"Lead Management"* holds six items (`ACC:84-91`). Four more lead-related items sit in other groups: *"Workflow Rules"* and *"AI Assignment Logic"* (Workflow, `ACC:109-114`), *"Project Types"* and *"Pipeline Stages"* (Projects, `ACC:116-121`).
- **Lead experience / mode** — *"Classic"* (bucket + status + sub-status dropdowns) or *"Journey"* (step tracker); one studio-wide flag `studios.settings.features.lead_journey_mode` (B-04). Journey is the code default.
- **Funnel** — the studio's pipeline: ordered **buckets** (board columns), each with ordered **statuses**, each with optional **sub-statuses**; stored whole as JSON in `studio_lead_funnel.config` (B-12). A lead's place = `leads.bucket` / `lead_status_code` / `sub_status_code` (leads C-01).
- **Bucket flag / status flags** — bucket *"Requires assignment"* (`requiresAssignment`); status flags F *"Follow-up"*, Q *"Quote req."*, C *"Contract req."*, P *"Project type req."* = `followUpRequired`, `requiresApprovedQuote`, `requiresContract`, `requiresProjectType` (`src/types/app.ts:3779-3805`).
- **Positional roles** — first bucket = intake, last bucket = terminal, the bucket with id `ON_HOLD` (else one whose id or label contains "hold") = hold, the rest = active (`FT:253-269`; B-16).
- **Known ids** — bucket / status / sub-status ids the code reads by name: `SIGNED`, `CLOSED`, `INACTIVE`, `ON_HOLD` + `HOLD_*`, `CONTACTED`, `QUOTE_CREATED`, `PROJECT_STARTED`, `NEW`, `UNASSIGNED`, `ASSIGNED`, `ONGOING` … (B-17). A renamed label keeps its id; a status or bucket the studio adds gets an id made from its name.
- **Journey step** — one of eight fixed ids `assigned · outreach · site_visit · concept · floor_plan · quote · contract · signed`, each with a label, an order and an **evidence rule** `none | optional | required` (`J:13-39, 62-74`).
- **Inactivation reason** — why a lead is closed in Journey mode: `code`, `label`, `requiresProof` (*"Proof"*), `gateAfterAttempts` (*"Gate after"*), detail `fields` (`J:244-273`). Classic mode has no such list (B-10).
- **Lead category** — a named, coloured item in *"Lead Categories"*; no lead carries one (B-21).
- **Lead source** — a name in `studio_taxonomies` with `type = 'lead_source'`; `leads.source` itself is free text (B-22). Not the same thing as Settings › *"Email Lead Sources"* (Gmail ingestion, B-38).
- **Custom field / value** — a studio-defined lead field (`lead_custom_fields`) and one lead's answer (`lead_custom_field_values`) (B-25…B-27).
- **Webhook endpoint** — a per-studio public URL `/api/webhooks/leads/{token}`; **platform** `generic` (also used for Meta via Zapier / Make) or `google_ads`; **signing key** = `signing_secret`, Google endpoints only; **outcome** = the result written to the log for each request (B-28…B-32).
- **Review queue** — *"Leads Pending Review"* above the board, where webhook and email leads and flagged duplicates wait (leads A-49).
- **Duplicate detection switch** — `settings.features.duplicate_detection_enabled` (B-06).
- **Workflow toggles** — `studios.settings.workflow.*` booleans (Accounts › Workflow Rules; B-33).
- **Studio Setup** — the owner's first-login wizard at `/studio-setup`; it writes the first funnel (B-20; the wizard itself is hand-off A).
- **2.0 names (hand-off E)** — 2.0 has fixed stages `New · Contacted · Met · Quote Sent · Won` + `On Hold · Lost` (`lib/leads/enums.ts:10-11` in openmaison-prototype), Settings › Leads cards *Stage movement · Lead sources · Reasons · Lead capture · Who sees leads*, a custom-fields card, and Company › Integrations / Members / Questionnaire.

---

## The group and who may change it

### B-01 · The Lead Management group, its six items and how to reach them
- Where: `ACC:74-160` (`MENU_GROUPS`, group at `:84-91`), `:217-256` (initial tab, group-label resolution, `setActiveTab`), `:615-684` (header, sidebar search, group rendering), panes `:690` (categories), `:948` (fields), `:1397` (lead-webhooks), `:1439` (lead-experience), `:1443-1449` (funnel), `:1784-1792` (lead-sources); entry links `src/components/layout/topbar.tsx:494-510`, `src/app/(main)/leads/page.tsx:1268-1275`; route access `src/lib/access-control.ts:126`; setup redirect `src/app/(main)/layout.tsx:138-141`; coach mark `src/components/ui/page-coach-marks.tsx:72-78`.
- Entry: topbar profile menu → *"Accounts Setup"* (rendered for owners only); Leads ⋮ menu → *"Lead experience: Journey"* / *"Lead experience: Classic"* (owners only) → `/accounts?tab=lead-experience`; any typed `/accounts?tab=<id>` URL. No rail or bottom-nav entry.
- Does: items in order — *"Lead Experience"* (`lead-experience`), *"Lead Funnel"* (`funnel`), *"Lead Categories"* (`categories`), *"Lead Sources"* (`lead-sources`), *"Custom Fields"* (`fields`), *"Lead Webhooks"* (`lead-webhooks`). `?tab=` picks the pane (default `team`); `?tab=lead-management` (the group label slugified) opens the group's first item. Choosing an item rewrites the URL with `history.replaceState` to `/accounts?tab=<id>` — browser Back leaves Accounts instead of stepping through items, and any other query parameter is dropped. The sidebar search filters by item label (so *"Custom Fields"* does not match "lead"). The group expands when one of its items is active.
- Rules: no item in the group is role-filtered; the only `ownerOnly` item on the page is *"Studio Health"* (`ACC:80, 637`). The route admits owner, admin, designer (`id`) and accounting tags (`access-control.ts:126`); the owner-only topbar button is a UI choice (its comment cites architecture.md, `topbar.tsx:494-502`). Owners who have not finished Studio Setup are redirected to `/studio-setup`; other roles are not (`layout.tsx:138-141`).
- Data: —
- States: —
- Words: *"Accounts Setup"*; *"Configure your studio's lead pipeline, AI rules, and workspace settings."*; *"Search settings..."*; *"Lead Management"* and the six item labels; owner coach mark *"Studio settings"* / *"Invite your team here. Leads can only be assigned to active team members."*
- Reachable: yes.

### B-02 · Who may change lead settings
- Where: `ACC:630-640`; routes `src/app/api/studio-config/{funnel,journey,features,workflow,taxonomies,custom-field-values}/route.ts`, `src/app/api/lead-config/{categories,custom-fields,pipeline-stages}/route.ts`, `src/app/api/webhooks/leads/endpoints/**`; role action `settings.editFunnel` at `src/lib/access-control.ts:349`, editor row `src/components/accounts/role-editor.tsx:133-139`; comments `LWT:3-8`, `src/lib/queries/lead-webhooks.ts:17`; `docs/features/leads-revamp/spec.md:465`; requirements CSV `docs/openmaison-v1-feature-requirements.csv:11, 32`.
- Entry: —
- Does: every screen and route in this slice accepts any signed-in member of the studio — owner, admin, designer or accounting can rewrite the funnel, switch the lead mode, edit journey steps and reasons, categories, sources and custom fields, and create, regenerate or revoke webhooks. The only role check that touches this slice is the features route's guard on `leadManagerHierarchy` (owner / admin, B-40).
- Rules: the Roles & Permissions editor offers *"Edit funnel"* (`settings.editFunnel`, tag default admin) but nothing reads it — the funnel editor, its route and the page never check a permission. The Lead Webhooks tab and its hooks say "Owner-only" in comments; nothing enforces it (leads C-48). The leads-revamp spec calls the journey editors owner-only (`spec.md:465`); they are not. The requirements CSV already records that none of these tabs is role-gated (row 11). Route checks in depth: hand-off D; the role model: leads C-52…C-57.
- Data: `studio_roles.permissions.actions.settings.editFunnel` (saved, never read).
- States: —
- Words: role editor *"Edit studio"*, *"Edit funnel"*, *"Edit notifications"*.
- Reachable: n/a (rules).

### B-03 · How the six screens save
- Where: `ACC:166-186` (`SaveButton`), `:350-387` (hydration and dirty flags), `:434-470` (save handlers), `:610-611` (`isSaving`); `LX:33-42, 100-112`; `JCE:50-64, 170-172`; `FE:26, 36-50, 200-213, 381-388`; `TLE:30-39, 77-106, 159-164`; `LWT` (per action).
- Entry: —
- Does: three save models. (1) Instant: the Lead Experience mode cards and duplicate switch save on click; webhook create / regenerate / revoke call the API at once. (2) Component draft + Save: Lead Funnel (*"Save Funnel"*, disabled until something changed, with *"Unsaved changes"*), Lead Sources (*"Save"*, always enabled), journey steps + reasons (*"Save journey settings"*, always enabled). (3) Page draft + Save: Lead Categories (*"Save Categories"*) and Custom Fields (*"Save Fields"*), both always enabled.
- Rules: the page's dirty flags `categoriesDirty` / `fieldsDirty` / `stagesDirty` are reset after a save but never set to true anywhere (`ACC:355-360`; grep) — the guard they were meant to be is dead. Hydration runs once and only when the server list is non-empty (`ACC:363-387`), so an edit made before the list arrives is overwritten by it. Category and field drafts live in page state: they survive switching to another Accounts item and are lost on reload or navigation; no screen warns about unsaved edits on leave. One page-wide `isSaving` disables every page-level Save while any is in flight (`ACC:610-611`).
- Data: —
- States: *"Saving..."* on the pressed button; *"Saved!"* for 2.5 s (page) or 2 s (sources).
- Words: *"Saved!"*, *"Unsaved changes"*, *"Saving..."*.
- Reachable: yes.

---

## Lead Experience

### B-04 · Classic / Journey switch
- Where: `LX:19-127` (tab), `:129-174` (`ModeCard`); `src/app/api/studio-config/features/route.ts:44-54` (defaults), `:56-89` (GET), `:91-153` (PUT); `SC:648-717`; readers `src/app/(main)/leads/page.tsx:162`, `DRW:541`, `TR:1575`.
- Entry: Accounts › Lead Management › *"Lead Experience"*; Leads ⋮ → *"Lead experience: …"* (owners, B-01).
- Does: two cards; clicking the unselected one writes `settings.features.lead_journey_mode = true | false` (merged into `studios.settings`) and toasts. While Journey is on, an explainer and the journey editors (B-07, B-09) appear under the cards. What the switch changes: B-05 and leads C-34.
- Rules: the code default is Journey (`lead_journey_mode !== false`, `features/route.ts:48, 75`; `SC:675-676`; `TR:1575`), yet the Classic card carries the badge *"Default"* (`LX:59`) and the hook's type comment still reads "Leads Revamp — opt into Journey Mode. Off = Classic bucket/status flow." (`SC:655`); the leads-revamp spec asked for default off (`docs/features/leads-revamp/spec.md:32, 67`). The explainer's *"An 8-step tracker (Assigned → … → Signed)"* is fixed text that ignores the studio's configured steps (`LX:80`). No confirmation before switching; clicking the selected card does nothing (`LX:34`). A features read error answers the defaults with HTTP 200 (`features/route.ts:64-67`), so the tab can show Journey for a Classic studio. The leads page and drawer read the flag as `?? false` while it loads (`leads/page.tsx:162`, `DRW:541`), so a Journey studio briefly renders Classic.
- Data: `studios.settings.features.lead_journey_mode` (boolean; missing = on).
- States: *"Loading…"* until features load (`LX:27-29`); cards disabled while saving.
- Words: *"Lead Experience"*; *"Choose how your team works leads day-to-day. Switching is reversible — your lead data is identical in both modes, only the screen changes."*; *"Classic"* · *"Default"* · *"Bucket + Status + Sub-Status dropdowns. Kanban grouped by bucket."*; *"Journey"* · *"New"* · *"Step-by-step tracker, one clear next action, evidence capture, and structured inactivation. Recommended for teams who want guidance."*; *"Journey mode is on"* + four bullets (verbatim in leads C-34); toasts *"Journey mode enabled"*, *"Switched back to Classic"*, *"Could not save setting"*.
- Reachable: yes.

### B-05 · What the mode changes, and the "data is identical" claim
- Where: `DRW:541, 615-616, 1793-1821, 2072, 2231, 2496`; `src/app/(main)/leads/page.tsx:162-167`; journey routes `src/app/api/leads/mutations/[id]/{journey-step,engagement,close}/route.ts`; grep of `lead_journey_mode` (only the features route reads it on the server).
- Entry: —
- Does: Journey swaps the drawer's Classic status block and readiness card for the tracker, active step card, outreach log, hold and close wizards (leads B-43, C-12…C-22) and adds the mini-rail and intro banner to the board (leads A-13, A-14). Classic keeps bucket / status / sub-status dropdowns with the funnel's gates (B-19, leads C-03). Board columns are the funnel's buckets in both modes (`LX:83`).
- Rules: the switch is read only in the browser — no server route checks the mode, so journey routes accept calls for a Classic studio and the mAIson agent writes stage columns the same way in both modes (leads C-28). *"your lead data is identical in both modes"* (`LX:50-51`) holds for the bucket / status columns only: outreach attempts are loaded only in Journey (`DRW:616`) and evidence and step overrides are rendered only by the Journey cards, so all three vanish from view after switching to Classic (closure reasons are shown in neither mode, B-10); sub-statuses and the F / Q / C / P gates do nothing in Journey (B-19); the journey floor moves buckets forward by itself (leads C-11). Leads worked in Classic show derived journey progress (e.g. Outreach done because the status is `CONTACTED`, `J:326-352`) with no attempts behind it.
- Data: the columns each mode writes: leads C-79.
- States: —
- Words: —
- Reachable: yes.

### B-06 · Detect duplicate leads switch
- Where: `LX:89-114`; `DD:1-8, 30-34, 90-157`; switch-gated callers `src/app/api/leads/mutations/create/route.ts:53-67`, `src/app/api/cron/poll-emails/route.ts:81, 187-209`, `src/app/api/hangouts/admin/lead/route.ts:118-133`, `src/lib/agents/executors.ts:1842-1846`; not gated `WH:154-186`, `src/app/api/leads/mutations/dup-check/route.ts:20-47` (called from `src/components/leads/new-lead-drawer.tsx:379-406`).
- Entry: Lead Experience tab, second card (both modes).
- Does: writes `settings.features.duplicate_detection_enabled`. On: the manual create route, the email cron, the hangout admin and the agent's `create_lead` look for an existing lead with the same phone (raw, or E.164 with the studio's country) or the same email (case-insensitive), archived rows included, and flag the new lead so it waits in the review queue; an archived match only adds a note. Off: those four create the lead unflagged. Per-surface outcomes: leads A-48, C-33.
- Rules: two paths ignore the switch. The public webhook always de-duplicates and drops an active match (leads A-59) — the copy calls this *"your website form"*, but it is every webhook endpoint (Google Ads, Zapier / Make, any form). The New Lead drawer's pre-save confirm calls `dup-check`, which never reads the switch and uses a different rule — phone substring of at least 6 digits, email through an unescaped PostgREST `.or()` filter, archived rows excluded (`dup-check/route.ts:26-40`) — so a studio that switched detection off still gets *"A lead with this … already exists"* (leads A-46). The detector's header comment says "excluding archived leads" (`DD:4-5`); the function includes them (`DD:97-114`). The webhook calls the detector without a country (`WH:159-162`), so phone normalisation uses Singapore rules for every studio (`DD:12-16`). The match rule is fixed; the studio can only turn it on or off.
- Data: `studios.settings.features.duplicate_detection_enabled` (missing = on); `leads.possibly_duplicate`, `leads.duplicate_of_lead_id`.
- States: switch disabled while saving.
- Words: *"Detect duplicate leads"*; *"When a new lead matches an existing lead's phone or email, hold it in the review queue so you can merge or keep both. Applies to manually added, imported (email), hangout, and AI-created leads. Leads from your website form are always de-duplicated."*; toasts *"Duplicate detection enabled"*, *"Duplicate detection off"*, *"Could not save setting"*.
- Reachable: yes.

### B-07 · Journey steps editor
- Where: `JCE:19-122, 170-172`; mounted `LX:116-124`; defaults `J:62-74`; resolver `J:442-446`.
- Entry: Lead Experience tab, third card — only while Journey is on and the journey settings have loaded.
- Does: lists the studio's steps (or the eight defaults). Per row: up / down arrows (swap with the neighbour; order rewritten), an always-editable label input, evidence chips *none* / *optional* / *required*, remove. *"Add step"* (shown only while a default step is missing) re-adds a removed default step at the end with its default label and evidence. *"Reset to default"* restores the eight defaults locally. *"Save journey settings"* saves steps and reasons together (B-11).
- Rules: only the eight default ids exist — no custom steps (`JCE:19-21, 40`). The spec promised studios could add steps (`spec.md:191`) and drew Assigned, Quote, Contract and Signed as locked (`spec.md:472-482`); here every step can be removed and given any evidence rule, including *required* on Assigned (which has no mark-done action, leads C-13) or *optional* on Signed (B-08). Reorder is by arrows only (the spec drew drag, `spec.md:473`). Labels can be saved blank. The per-step `backfillable` flag is not shown; default steps keep it through saves (`JCE:36, 117`) and `assigned · outreach · quote · contract` stay non-backfillable by id anyway (`J:335-341`). An empty list is stored as `[]` and read back as the eight defaults (`J:443-444`).
- Data: `studios.settings.journey.steps[] = {id, label, order, evidence, backfillable?}`.
- States: —
- Words: *"Journey steps"*; *"Reset to default"*; *"Reorder, rename, set evidence requirement, or remove steps your studio doesn't use."*; chips *"none"*, *"optional"*, *"required"* (capitalised by CSS); *"Add step"*; *"Save journey settings"*; toasts *"Journey settings saved"*, *"Could not save journey settings"*.
- Reachable: yes (Journey mode only).

### B-08 · What a step's order, evidence rule, label and presence do
- Where: `J:82-109, 371-439`; `src/components/leads/journey/active-step-card.tsx:58, 128-149`; `src/components/leads/journey/lead-journey-mini-rail.tsx:71-79, 168-187`; `DRW:1793-1821, 2158-2159`; `src/app/api/leads/mutations/[id]/journey-step/route.ts:97-116`; `ID:44, 64, 127-144`.
- Entry: every Journey drawer and board card.
- Does: **Order** drives derivation — backfill, the active step, *Blocked*, and "won" = the highest-order step is done (`J:386-439`); the board's *"Deal won"* chip uses that rule (`mini-rail:71`), while the drawer's "deal won" (which unlocks Create project and hides the follow-up fields) needs the step with id `signed` done or the primary quote client-signed (`DRW:1808-1821`). The floor that moves buckets is keyed on step id, not order (leads C-11). **Evidence** — *required* disables *"Mark … done"* until an artifact exists; *optional* adds *"Skip"* in the drawer (`active-step-card:140-149`) and a one-click *"Mark … done"* on board cards (`mini-rail:74-79`); *none* sends the board user into the drawer. **Label** — used by the tracker, card, rail and toasts, except that Assigned reads *"Assign Designer"* until done (`J:82-85`) and the compact drawer stepper shows the fixed short labels *"Site"*, *"Concept"*, *"Floor"* for those three ids whatever the studio calls them (`J:91-109`). **Removing a step** removes its card: without Outreach there is nowhere to log outreach (the log renders only on the outreach card, `DRW:2158-2159`), so `first_outreach_at` is never stamped from the UI (leads C-25) and the default *"Unresponsive"* reason, gated after 3 attempts, can never be chosen (`ID:64, 144`); without Signed the drawer's "deal won" needs a client-signed quote.
- Rules: the code comments promise that Quote, Contract, Signed and Outreach are never skippable and never advance from the board (`active-step-card:140-143`, `mini-rail:74-78`), but both checks read the evidence rule, not the step — a studio that sets Signed to *optional* gets a board button and a *"Skip"* that mark it done, which moves the lead to the bucket owning `SIGNED` and stamps `signed_at` (`journey-step/route.ts:97-116`). With the default *none*, *"Mark signed done"* already needs no evidence (leads C-13).
- Data: reads `studios.settings.journey.steps`.
- States: —
- Words: *"Assign Designer"*, *"Site"*, *"Concept"*, *"Floor"*, *"Deal won"*, *"Skip"*, *"Mark {label} done"*.
- Reachable: yes (Journey mode).

### B-09 · Inactivation reasons editor
- Where: `JCE:25-27, 124-168`; defaults `J:265-273`; resolver `J:449-453`.
- Entry: the same card as the steps (Journey mode only).
- Does: lists the studio's reasons (or the seven defaults, verbatim in leads C-22). Per row: label input, *"Proof"* switch (`requiresProof`), *"Gate after"* number (`gateAfterAttempts`; blank = none), remove. *"Add reason"* appends `{code: "reason_{n}", label: "New reason", requiresProof: false, fields: ["free_text"]}` with n = list length + 1. *"Reset to default"* restores the defaults locally. Saved with the steps (B-11).
- Rules: codes come from the list length, so after deleting a custom reason the next *"Add reason"* can reuse a live code (seven defaults → add `reason_8`, add `reason_9`, delete `reason_8`, add → a second `reason_9`); rows are keyed and edited by code (`JCE:139-158`), so both rows then change together and the close wizard takes the first (`ID:59`). Labels can be blank; *"Gate after"* takes negatives and decimals (`Number(...)`, `JCE:154`; `min={0}` only guides the spinner). Detail fields cannot be edited — a custom reason always gets an optional note; the spec's "required-detail fields" and reordering (`spec.md:488-489`) do not exist. An empty list reads back as the defaults.
- Data: `studios.settings.journey.inactivationReasons[] = {code, label, requiresProof, fields[], gateAfterAttempts?}`.
- States: —
- Words: *"Inactivation reasons"*; *"Reset to default"*; *"Why leads get closed. “Gate after” only allows the reason once that many outreach attempts are logged."*; *"Proof"*; *"Gate after"*; *"Add reason"*; *"New reason"*.
- Reachable: yes (Journey mode only).

### B-10 · What a reason's settings do after a close
- Where: `ID:44-75, 127-247`; `src/app/api/leads/mutations/[id]/close/route.ts:37-45, 85-86, 103-108`; `TR:401-402`; Classic sub-statuses `LBC:34-38, 88-99`.
- Entry: Journey drawer → *"Close lead"* (leads C-22).
- Does: the three-step close wizard lists the studio's reasons; *"Gate after"* disables a reason until that many attempts are logged; *"Proof"* makes a file mandatory on step 2; the chosen code and details are stored on the lead and the label goes into the activity log as `lead_closed:{label}`.
- Rules: the gate and the proof rule are checked only in the browser — the close route needs just a non-empty `reasonCode` and `reasonLabel` and never checks that the code exists, is ungated or has proof (`close/route.ts:37-45`). *"Proof"* does nothing for code `unresponsive` (its proof is the attempt count, `ID:66-68`); a note is required only for code `other` (`ID:73, 206`). `closed_reason_code` and `closed_reason_detail` are written but no screen, filter, export or report reads them (grep: only the transformer) — the reason list produces no loss analytics. Classic never uses the list: its lost reasons are the fixed sub-statuses of `INACTIVE` (*"Budget constraints"*, *"Went with competitor"*, *"Unresponsive"*, *"Not a fit"*) and its hold reasons the fixed sub-statuses of the hold tiers (*"Client not ready"*, *"Budget review"*, *"Scope change"*), and the funnel editor cannot edit sub-statuses (B-14). Journey *"Move to Hold"* takes only a free-text note (leads C-20). Renaming a reason changes future log lines only; deleting one leaves stored codes with no label anywhere.
- Data: `leads.closed_reason_code`, `leads.closed_reason_detail` (details + `proofArtifactIds`); `lead_activity_log.action`.
- States: —
- Words: wizard copy verbatim in leads C-22.
- Reachable: yes (Journey mode).

### B-11 · The journey settings API and its defaults
- Where: `src/app/api/studio-config/journey/route.ts:15-66`; `SC:719-748`; `LX:23, 116-124`; test `src/__tests__/studio-config-scoped-api.test.ts:269-296`.
- Entry: —
- Does: GET returns `studios.settings.journey` or `{}`; PUT reads the current settings (500 when that read fails, no write) and replaces `settings.journey` with the body. The editor always sends both lists.
- Rules: no validation — any step ids, labels, evidence values or reason shapes are stored as sent (`journey/route.ts:41-56`). A database error on GET answers 200 `{journey: {}}` (`:23-27`), so the editor shows the defaults and a Save would overwrite the studio's real settings. Because both lists travel together, the first save of either freezes a copy of the current code defaults into the studio; later changes to `DEFAULT_JOURNEY` or `DEFAULT_INACTIVATION_REASONS` no longer reach it. The whole `settings` JSON is read and rewritten (concurrency: hand-off D). The only test is the read-error abort.
- Data: `studios.settings.journey`.
- States: —
- Words: —
- Reachable: yes (through B-07 / B-09).

---

## Lead Funnel

### B-12 · The funnel record and the default funnel
- Where: `src/types/app.ts:3779-3805` (`FunnelConfig`, `FunnelBucket`, `FunnelStatus`, `FunnelSubStatus`); `M090:10-18` (table), `:125-…` (seed for studios that existed then); `LBC:40-104` (`DEFAULT_FUNNEL_CONFIG`); `src/app/api/studio-config/funnel/route.ts:18-45`; `SC:42-52`; `ACC:1443-1449`.
- Entry: Accounts › Lead Management › *"Lead Funnel"*.
- Does: one row per studio holding the whole funnel: buckets (`id`, `label`, `color`, `order`, `requiresAssignment`, `statuses[]`), statuses (`id`, `label`, `order`, four flags, `subStatuses[]`), sub-statuses (`id`, `label`, `order`). The default has four buckets — New / Ongoing / On Hold / Closed — with the statuses and sub-statuses listed in leads C-01. Writers: this editor (B-13…B-15), Studio Setup (B-20), the migration 090 seed.
- Rules: GET answers `{config: null}` when the studio has no row or no buckets (`funnel/route.ts:35-39`); the hook returns null and the page renders nothing for this tab (`ACC:1443` requires `funnelConfig`) — a blank pane with no message, also while the config is loading — whereas every other consumer quietly uses the code default (`FT:31-34`, `LBC:146`, `src/lib/leads/load-funnel-config.ts:44-45`). A studio without a row therefore runs on the default funnel but cannot edit it here. Rows come from migration 090 (studios that existed then), Studio Setup (owners), or not at all (e.g. an admin-created studio whose owner has not finished setup, seen by its other members). The `version` column is never written or read (every access selects `config` only). A row is a copy: later changes to `DEFAULT_FUNNEL_CONFIG` do not reach it.
- Data: `studio_lead_funnel(id, studio_id UNIQUE, config JSONB, version, created_at, updated_at)`.
- States: blank pane when there is no config (Rules).
- Words: —
- Reachable: yes.

### B-13 · The funnel editor — buckets
- Where: `FE:12, 20-82, 112-146, 185-196, 216-286, 358-370`; lead counts `ACC:1447`.
- Entry: Lead Funnel tab.
- Does: a row of bucket pills in order (dot, label, status count) joined by chevrons; drag a pill onto another to reorder (rewrites `order` 0…n); click to expand one bucket (the first is expanded on load). The expanded bucket shows an 8-colour picker (`#5500FF #469E59 #F19E2B #999999 #DB382A #4E5BB4 #4400CC #666666`), its label (click to rename; Enter or ✓ commits, Escape or ✕ cancels, blank ignored), a *"Requires assignment"* switch, *"{n} leads"* when non-zero, and delete. *"Add bucket (e.g. Negotiation)"* creates a bucket whose id is the name upper-cased with spaces turned to `_`, with the next palette colour, *Requires assignment* off and no statuses.
- Rules: new ids keep punctuation and accents (e.g. "Follow-up 2" → `FOLLOW-UP_2`, `FE:57`); an existing id is refused. Delete is refused in the browser when the bucket holds loaded leads or only two buckets remain; there is no confirm. The lead count comes from the page's lead list keyed on the raw `bucket` column (`ACC:1447`), which leaves out archived leads (leads A-18) — the server guard counts them (B-15). A new bucket cannot be saved until it has a status (server 400, B-15) and the editor does not say so beforehand. Reordering and *Requires assignment* change much more than display (B-16).
- Data: in memory until Save.
- States: *"{n} leads"*; a ring on the pill being dragged over.
- Words: *"Lead Funnel"*; *"Customize your lead pipeline buckets, statuses, and validation rules. Drag to reorder."*; *"Requires assignment"*; *"{n} leads"*; *"Add bucket (e.g. Negotiation)"*; tooltip *"Delete bucket"*; toasts *"Bucket already exists"*, *"Cannot delete — {n} leads in this bucket. Move them first."*, *"Minimum 2 buckets required"*.
- Reachable: yes.

### B-14 · The funnel editor — statuses and flags
- Where: `FE:84-110, 148-183, 288-356, 372-378`; `FT:191-204` (comment on the missing sub-status editor).
- Entry: the expanded bucket.
- Does: statuses by order with a drag handle (reorder within the bucket), click-to-rename, four flag buttons F / Q / C / P, delete on hover, and *"Add status..."* (Enter or +) creating a status whose id comes from its name, all flags off, no sub-statuses. A legend explains the letters.
- Rules: the duplicate check is per bucket only (`FE:92`; the server also checks per bucket, `FV:34-41`), so a studio can add a second `SIGNED` (e.g. "Signed" under Ongoing), and "the bucket that owns SIGNED" then resolves to the first one in order (`FT:182-189`). Rename matches ids across buckets and statuses at once (`FE:191-194`), so a bucket and a status that share an id — possible because both ids come from names — are renamed together. Status delete has no confirm and no lead-count check (the server guard catches statuses that hold leads). A status cannot move to another bucket. There is no sub-status editor: default statuses keep their sub-statuses unseen, new statuses have none, and nothing can add one (`FT:196-204`). No *Reset to default*.
- Data: in memory until Save.
- States: highlighted row while dragging over.
- Words: *"Add status..."*; flag tooltips *"Follow-up"*, *"Quote req."*, *"Contract req."*, *"Project type req."*; legend *"Follow-up required"*, *"Approved quote required"*, *"Contract required"*, *"Project type required"*; toast *"Status already exists"*.
- Reachable: yes.

### B-15 · Saving the funnel — browser checks and the server guard
- Where: `FE:200-213, 380-388`; `src/app/api/studio-config/funnel/route.ts:47-140`; `FV:17-60`; `SC:54-63`; tests `src/__tests__/lead-funnel-transitions.test.ts:337-388`.
- Entry: *"Save Funnel"*.
- Does: the browser refuses fewer than two buckets, then PUTs `{config: {buckets}}`. The server validates the shape (400), compares bucket and status ids with the saved config (or the default when there is none) and answers 409 when a removed id still holds leads, then upserts the row. Success clears the dirty flag; a failure shows the server's message.
- Rules: the usage probes include archived leads and read at most 1,000 rows (`funnel/route.ts:83-88, 104-109`). Not validated: colours, `order` values, flags, duplicate status ids across buckets, removed sub-statuses (never compared, `FV:49-60`), and whether the funnel still has the ids and positions the app relies on (B-16, B-17) — deleting an empty `SIGNED` or `ON_HOLD`, or dragging Closed to the front, saves fine. Renames are safe because ids do not change. Tests cover the two helpers; no test calls the route, so the 409 guard itself is untested. No role check (B-02).
- Data: `studio_lead_funnel` upsert on `studio_id`.
- States: button disabled until something changed; *"Saving..."*; *"Unsaved changes"*.
- Words: *"Save Funnel"*; toasts *"Lead funnel saved"*, *"Failed to save funnel"*; server errors *"config is required"*, *"config must be an object"*, *"config.buckets must be an array"*, *"At least 2 buckets are required"*, *"Every bucket must be an object"*, *"Every bucket needs a non-empty id"*, *"Bucket "{id}" needs a label"*, *"Duplicate bucket id "{id}""*, *"Bucket "{label}" needs at least one status"*, *"Bucket "{label}" has an invalid status"*, *"Bucket "{label}" has a status without an id"*, *"Duplicate status id "{id}" in bucket "{label}""*, *"Cannot remove bucket "{id}" ({n} leads) — move those leads to another bucket first."*, *"Cannot remove status "{id}" ({n} leads) — move those leads to another status first."* (singular *"lead"* for one).
- Reachable: yes.

### B-16 · What the app reads by position and by the assignment flag
- Where: `FT:31-34, 45-52, 108-119, 165-168, 237-269, 306-313, 339-365`; `CTX:90-91, 724-741, 757-768`; `src/components/layout/app-sidebar.tsx:82, 113`; `src/components/layout/bottom-nav.tsx:70-71`; `src/components/dashboard/home-widgets.tsx:80-88, 470-478`; creation surfaces `src/app/api/leads/mutations/create/route.ts:48, 206`, `WH:192-193`, `src/app/api/cron/poll-emails/route.ts:302-303`, `src/app/api/hangouts/admin/lead/route.ts:136-137`, `src/lib/agents/executors.ts:1760`.
- Entry: —
- Does: the funnel defines no transitions and no timers; the app gives buckets roles by position instead. **First bucket** = where every new lead lands (second status when created with an assignee), the rail and bottom-nav "new leads" badge, and the browser's automatic Unassigned ↔ Assigned shift (the first bucket's first and second statuses, `CTX:724-735`). **Last bucket** = terminal: moving a lead into it cancels its open tasks (`CTX:757-768`), the dashboard counts it as Closed and Studio Pulse counts every lead in it as "Signed" — lost leads included on the default funnel (`home-widgets.tsx:478`, leads C-68) — and TAT treats it as closed (leads C-25); it is also the close target when no bucket has id `CLOSED` (`FT:165-168`). **Hold bucket** = id `ON_HOLD`, else the first bucket whose id or label contains "hold" anywhere (so "Threshold" would qualify), else none (`FT:45-52`). **Middle buckets** minus hold = active. **Requires assignment** is both the Classic gate (B-19) and a marker: the first bucket with it on is where the journey floor puts leads after outreach / quote / contract (`FT:355-363`) and where a stash-less resume lands an assigned lead (`FT:114`); among middle buckets it is where a reopened Signed step returns the lead (`FT:311-312`). With no bucket marked, the journey floor stops moving leads for outreach, quote and contract (`FT:355-366`), while resume and reopen fall back to the first bucket or the last middle bucket (`FT:114, 312`).
- Rules: array order and `order` agree because the editor rewrites `order` on every move; some readers use array order (`CTX:90`, `app-sidebar.tsx:82`), others sort by `order` (`FT:33`). The task-cancel rule looks the new status up in the **default** funnel (`getStatusByCode` without the studio's config, `CTX:737, 757-760`), so it fires for default status ids (a hold tier, if On Hold is dragged last) and never for statuses the studio created. Dragging buckets silently changes intake, terminal and hold behaviour; the editor warns about none of it.
- Data: reads `studio_lead_funnel.config`.
- States: —
- Words: —
- Reachable: yes.

### B-17 · What the app reads by id (the known ids)
- Where: `FT:48, 57-68, 167-175, 182-189, 205-232, 299, 344, 360-361`; `J:326-327`; `DA:53-60`; `LBC:171-178, 242-252`; `DRW:640, 1192-1197, 1227, 1330, 2284, 2437`; `src/components/leads/drawer-sections/bucket-status-section.tsx:159, 190`; `src/app/api/leads/mutations/[id]/route.ts:313`; `scripts/migrations/254_signed_mirror_funnel_aware.sql:1-80` (`finalize_signed_mirror`); tool pickers `src/app/(main)/tools/quote-digitizer/page.tsx:74`, `src/app/(main)/tools/quote-xray/page.tsx:89`, `src/components/copilot/lead-or-project-picker-dialog.tsx:50`, `src/components/layout/id-buddy-panel.tsx:823`.
- Entry: —
- Does: behaviour attached to fixed ids —
  - `SIGNED` (status): e-signing moves the lead to the bucket that owns it (database function and route); creating a project moves the lead there with sub-status `PROJECT_STARTED` when that sub-status exists; a manual move to it stamps `signed_at`; the Classic drawer requires an assignee for it, accepts only a client-signed quote when no contract is uploaded, and opens Create Project on it.
  - `PROJECT_STARTED` (sub-status): such leads are never moved by the journey floor or a Signed reopen.
  - `CLOSED` (bucket) / `INACTIVE` (status): the preferred close target; otherwise the last bucket and a status matching `/inactive|lost|drop|dead|not.?a.?fit/i`, else its first status. Task cancellation also fires for `CLOSED`; the Classic "moved to Closed" undo toast and the Return & Refund button key on `CLOSED`; the Quote Digitizer, Quote X-Ray, the Copilot lead picker and the ID Buddy panel hide leads whose bucket is `CLOSED`.
  - `ON_HOLD` and `HOLD_1M`, `HOLD_1_3M`, `HOLD_3_6M`, `HOLD_6_9M`, `HOLD_9M_PLUS`: the hold bucket and its restart-distance tiers (the first status otherwise).
  - `CONTACTED`, `QUOTE_CREATED`: journey floor targets (the first status otherwise).
  - `NEW`, `UNASSIGNED`, `ASSIGNED`, `ONGOING`: removing the last designer from a lead in `ONGOING` or at `ASSIGNED` writes `NEW` / `UNASSIGNED` literally (`LBC:242-252`); the Classic drawer's assignment rules and the Project Type picker (shown in bucket `ONGOING`) use them.
  - `FOLLOW_UP`, `CONTACTED`, `QUOTE_CREATED`, `MET`, `SIGNED` and buckets `ONGOING`, `ON_HOLD`, `CLOSED`: count as "outreach done" in Journey derivation; `QUOTE_CREATED`, `MET`, `SIGNED` show the Classic contract block.
  - `PROJECT_CREATED`: legacy alias of `SIGNED`, hidden from pickers.
- Rules: renaming keeps every behaviour (ids are stable). Replacing a default status with one the studio adds (an id from its name, B-14) drops the behaviour silently — e.g. a studio that deletes an empty `SIGNED` and adds "Won" gets no e-sign advance, no project-created move and no `signed_at` from manual moves. `docs/rules/leads.md:50-54` says "Backend routes must never hardcode bucket/status IDs"; the backend resolves through these ids with fallbacks, and the front end still hard-codes several of them (above).
- Data: `leads.bucket`, `lead_status_code`, `sub_status_code`, `signed_at`.
- States: —
- Words: —
- Reachable: yes.

### B-18 · Where renamed labels and chosen colours appear
- Where: `LBC:108-141`; board / list / export through `getLeadBucket` with the studio config (leads A-03, A-19); drawer dropdowns `DRW:636-642`; `CTX:737-741, 984-993, 1240-1247`; `src/lib/leads/notify-stage-change.ts:43-51, 62-65`; `src/lib/leads/notify-assigned.ts:146-147, 185-186`; `src/lib/agents/system-prompt.ts:558`.
- Entry: —
- Does: the studio's labels appear on board columns, list and mobile cards, the CSV export, the Classic drawer's dropdowns, and the mAIson assistant's prompt (bucket and status labels).
- Rules: several surfaces resolve labels from the **default** funnel instead: the drawer's activity lines *"Bucket changed to {label}"* / *"Status changed to {label}"* and activity summaries (`CTX:984-993, 1240-1247`), the follow-up task title's status label (`CTX:737-741`), and the `lead.status_changed` notification's old / new bucket and status labels (`notify-stage-change.ts:43-51`) — renamed labels never show there, and ids the studio created show raw (e.g. *NEGOTIATION*). `lead.assigned` sends the raw bucket id and looks a sub-status code up as if it were a status, so its status line is usually blank (`notify-assigned.ts:146-147, 185-186`). Colour becomes a dynamic class `bg-[{hex}]` for the board dots, except four mapped colours (`LBC:108-121`); the other four palette colours (`#DB382A`, `#4E5BB4`, `#4400CC`, `#666666`) appear nowhere in the source as a plain `bg-[…]` class, so those dots may render without colour (Uncertain 2).
- Data: —
- States: —
- Words: *"Bucket changed to {label}"*, *"Status changed to {label}"*.
- Reachable: yes.

### B-19 · The status flags and the Workflow Rules double switch
- Where: `DA:45-104`; `DRW:1063-1088, 1173-1185, 1294, 2231, 2496`; `src/components/leads/drawer-sections/bucket-status-section.tsx:86, 159-164, 190-200, 261`; `src/components/leads/conversion-readiness-card.tsx:75-110`.
- Entry: Classic drawer stage moves (leads C-03, B-16).
- Does: each flag gates a Classic move into that status only when its Workflow Rules switch is also on: *Requires assignment* (bucket) × *"Require assignment for Ongoing"*; Q × *"Quote approval required"*; P × *"Project type required"*; C × *"Contract required for Signed"*; F has no switch. A failing gate holds the stage columns while the rest of the draft saves (leads C-03). The flags also drive Classic labels — *"Signed Contract (Required)"* vs *"Contract (Optional)"*, *"Project Type"* + *"(Required)"* — and whether the follow-up field shows.
- Rules: the messages are fixed to the default funnel's words whatever bucket or status is involved (*"… before moving to Ongoing"*, *"Project type is required for Signed status"*). `SIGNED` needs an assignee even with the switch off (`DA:55`). Journey hides the status block and readiness card (`DRW:2231, 2496`), so in the default mode F / Q / C / P have no effect at all; only *Requires assignment* still matters, as a position (B-16). The readiness card reads the Workflow switches, not the flags (`conversion-readiness-card.tsx:75-110`). Nothing is enforced on the server (leads C-07). Budget bounds 1,000–5,000,000 are fixed in the drawer (`DRW:1087`).
- Data: flags in `studio_lead_funnel.config`; `studios.settings.workflow`.
- States: —
- Words: *"Assign at least one Interior Designer before moving to Ongoing"*, *"An approved quote is required"*, *"Either e-sign the quote in-app or upload a signed contract before marking Signed"*, *"Project type is required for Signed status"*, *"A signed contract must be uploaded"*, *"Follow-up date is required for this status"* (full list: leads C-03).
- Reachable: yes (Classic mode).

### B-20 · Studio Setup's funnel step (Standard / Simple / Custom)
- Where: `SS:34, 53-82, 88-98, 238-248, 369-373, 380, 388-408, 635-680`; `scripts/migrations/254_signed_mirror_funnel_aware.sql:15-21`.
- Entry: `/studio-setup` step *"Lead Funnel"* (owners, first login; the wizard itself is hand-off A).
- Does: three choices — *"Standard (recommended)"* writes `DEFAULT_FUNNEL_CONFIG`; *"Simple"* writes New (Unassigned, Assigned) → Active (In Progress, Quote Sent; requires assignment) → Closed (Won, Lost); *"Custom"* shows the Lead Funnel editor inline and writes whatever its *"Save Funnel"* last stored. Skipping the step, or the whole wizard, writes Standard when no row exists. The next step shows four Workflow switches.
- Rules: Simple has none of the ids `SIGNED`, `INACTIVE`, `ON_HOLD`, `PROJECT_STARTED` (B-17): e-signing does not move the lead (the migration comment names this case), creating a project does not move it, moving a lead to Won never stamps `signed_at` (so conversion TAT stays empty), closing lands on Lost through the "lost-like" pattern, Move to Hold only sets engagement fields (no hold bucket), and the journey floor uses Active / In Progress. The Custom card says *"customize it in Settings"* but opens an editor inline; its edits count only if the inner *"Save Funnel"* was pressed before *"Continue"* (its `onSave` only stores local state, `SS:651-656`), and that button toasts *"Lead funnel saved"* though nothing is written yet. A server rejection (e.g. a bucket with no status) surfaces only as *"Something went wrong. Please try again."* (`SS:380`). The template choice is never offered again.
- Data: `studio_lead_funnel`; `studios.settings.workflow` (the four switches; the rest default on through the route's merge).
- States: —
- Words: *"Lead Funnel"*, *"Define how leads move through your pipeline."*; *"Standard (recommended)"* · *"New → Ongoing → On Hold → Closed. Works for 90% of renovation studios."*; *"Simple"* · *"New → Active → Closed. For studios with a lean pipeline."*; *"Custom"* · *"Start with the standard funnel, then customize it in Settings."*; *"Skip, Standard pipeline used"*; Workflow step *"Quote approval required"*, *"Contract required"* · *"A signed contract is needed before marking a lead as Signed"*, *"Timeline approval required"*, *"Expense approval for team"*, *"These defaults work for most studios. More controls available in Accounts → Workflow Rules."*
- Reachable: yes (once per studio).

---

## Lead Categories

### B-21 · Lead Categories (saved, never read)
- Where: `ACC:163, 293-298, 363-368, 439-452, 689-811`; `src/app/api/lead-config/categories/route.ts:26-81`; `QS:72-85, 185-209`; RPC `M033:3-20`; table `scripts/migrations/013_studio_settings.sql:8-18`, seed `:45-49`; requirements CSV rows 11, 32; `docs/user-stories/detailed/accounts-setup.md:132-140`.
- Entry: Accounts › Lead Management › *"Lead Categories"*.
- Does: a list (drag to reorder; click the dot to cycle six colours; rename inline — Enter or blur commits, Escape cancels; delete after a browser confirm) and an add row (six swatches, a name, Enter or +). *"Save Categories"* sends the whole list; the server deletes every category of the studio and inserts the list in order.
- Rules: nothing reads categories — no lead has a category field, and there is no picker, filter, board grouping, report or AI use (grep: only this page, the route and the transformer; CSV row 11). *"Minimum 3 categories required"* is not enforced; zero saves. The AI Assignment Logic copy says ID Buddy tags a category (B-34); it does not. Rename takes any non-blank text, duplicates included; new rows carry a timestamp id the server ignores. `is_active` is always written true. New studios start with none (only one demo studio is seeded).
- Data: `lead_categories(id, studio_id, name, color default '#0d9488', order_index, is_active, created_at)`.
- States: an empty list shows only the add row.
- Words: *"Lead Categories"*; *"Group leads by property or project type. Minimum 3 categories required."*; *"New category name…"*; tooltips *"Click to change color"*, *"Rename category"*, *"Delete category"*; confirm *"Delete category "{name}"? This won't affect existing leads tagged with it."*; *"Save Categories"*; toasts *"Lead categories saved"*, *"Failed to save categories"*.
- Reachable: yes (write-only).

---

## Lead Sources

### B-22 · Lead Sources editor and its save
- Where: `ACC:273, 1783-1792`; `TLE:25-167`; `src/app/api/studio-config/taxonomies/route.ts:27-100`; `SC:423-449`; table `M090:90-101`.
- Entry: Accounts › Lead Management › *"Lead Sources"*.
- Does: the shared taxonomy editor over type `lead_source`: each row is an editable text input, rows drag to reorder, delete after a browser confirm, add with Enter or +; *"Save"* sends every name with its position. The server marks every `lead_source` row of the studio inactive, then upserts each sent name as active on `(studio_id, type, name)`.
- Rules: add refuses a case-insensitive duplicate; Save refuses blank names and duplicates. The save is not one transaction — a failure part-way leaves the rest inactive — missing from the pickers, or, if none is left active, replaced by the code fallback lists (B-24) (`taxonomies/route.ts:70-94`). A rename is "deactivate the old name, insert a new one"; the old row stays, inactive. The page passes items without `metadata`, so any source metadata is cleared on save (`ACC:1788`, `TLE:91-95`). The database key is case-sensitive while the editor's check is not. No usage check before delete. The deactivate step has no `studio_id` filter and relies on row-level security (`:70-73`; hand-off D). Save is always enabled; the list re-syncs from the server whenever it has no local edits.
- Data: `studio_taxonomies(id, studio_id, type = 'lead_source', name, is_active, order_index, metadata)`, unique `(studio_id, type, name)`.
- States: *"Saving..."*; *"Saved!"* for 2 s.
- Words: *"Lead Sources"*; *"Customize where your leads come from."*; *"New source (e.g. TikTok)"*; tooltip *"Delete"*; confirm *"Delete "{name}"?"*; *"Save"*; toasts *"Already exists"*, *"Items can't have empty names"*, *"Duplicate name: "{name}""*, *"Lead Sources saved"*, *"Failed to save"*.
- Reachable: yes.

### B-23 · Where the source list is read, and what a rename or delete does
- Where: `src/components/leads/new-lead-drawer.tsx:54, 180`; `src/app/(main)/leads/new/page.tsx:36`; `DRW:634`; `src/components/leads/drawer-sections/client-info-section.tsx:179-185`; `src/app/(main)/leads/page.tsx:121, 168-170` (filter, leads A-27); `DRW:2437, 2661` (Return & Refund); `WP:79-80`; `src/app/api/buddy/chat/route.ts:172-184`; `src/lib/agents/system-prompt.ts:1321`.
- Entry: —
- Does: the active names fill the *"Lead Source"* select on the New Lead drawer, `/leads/new` and the lead drawer (plus *"Others…"* for free text, leads A-35) and the listing's Source filter (exact match on `leads.source`, leads A-27). A lead stores the chosen name as text.
- Rules: renaming or deleting a source never touches existing leads — they keep the old text, which the Source filter can then no longer select. Behaviour keyed on literal source text breaks on rename: *"Request Return & Refund"* appears only when `lead.source === "Qanvast"` (`DRW:2437`, leads B-55), and the source chip knows a fixed vocabulary (leads A-67). Webhook, email, hangout and agent intake write sources the studio never listed — a payload's `source`, the endpoint label, the email platform name, `"hangout"` — none is checked against the list (B-31, leads A-62, C-40). The mAIson assistant was meant to get the list, but its query names columns that do not exist (`taxonomy_type`, `sort_order` for `type`, `order_index`) and swallows the error, so the prompt line *"Configured lead sources"* never renders (`buddy/chat/route.ts:172-184`, `system-prompt.ts:1321`). With no sources, the forms fall back to five names and the filter to six different ones (B-24).
- Data: `leads.source` (free text).
- States: —
- Words: *"Lead Source"*, *"Select source"*, *"Others…"*, *"Enter source name…"* (leads A-35).
- Reachable: yes.

### B-24 · The other source lists (seeds, fallbacks, admin, legacy column)
- Where: `M090:345-353`; `scripts/migrations/274_ad_lead_integration.sql:39-44`; `src/lib/studio-default-taxonomies.ts:9-11, 30-55` (called only at `src/app/api/admin/studios/route.ts:239`); `client-info-section.tsx:179-181`; `src/app/(main)/leads/page.tsx:121`; `scripts/migrations/003_studios.sql:12`; `src/app/api/identity/studio-settings/route.ts:32`; `TR:1480`; `src/app/admin/settings/page.tsx:83, 322-341`; `scripts/migrations/053_seed_audit_and_settings.sql:24`.
- Entry: —
- Does: seven source lists exist. (1) Migration 090 seeded nine names into every studio that existed then (Qanvast, Instagram, Referral, Walk-in, Facebook, Organic, Hangout, Website, Email). (2) Migration 274 added Google Ads and Meta Ads (order 100 / 101) to every studio. (3) Admin studio creation seeds eleven (those nine + Google Ads, Meta Ads). (4) The lead forms fall back to five (Referral, Instagram, Facebook, Website, Walk-in). (5) The listing filter falls back to six (Qanvast, Instagram, Referral, Walk-in, Facebook, Organic). (6) The legacy column `studios.lead_sources` (six lower-case keys) is selected and transformed but never read. (7) The admin portal's *"Allowed Lead Sources"* saves platform setting `lead_sources`, which nothing reads.
- Rules: a studio that had no source rows when migration 274 ran received only Google Ads and Meta Ads, which moves its forms off the five-name fallback onto those two (Uncertain 3). Studios created outside the admin route get no seeded sources.
- Data: `studio_taxonomies`; `studios.lead_sources` (dead); `platform_settings.lead_sources` (dead).
- States: —
- Words: admin *"Allowed Lead Sources"*, *"Sources visible in the lead source dropdown for studios"*, *"Add source…"*.
- Reachable: seeds and fallbacks yes; the admin setting and the legacy column are dead.

---

## Custom Fields

### B-25 · Custom Lead Fields editor
- Where: `ACC:307-320, 370-378, 454-470, 947-1141`; `src/app/api/lead-config/custom-fields/route.ts:25-89`; `QS:87-100, 211-235`; table `scripts/migrations/013_studio_settings.sql:23-34`, seed `:51-55`.
- Entry: Accounts › Lead Management › *"Custom Fields"*.
- Does: each field row shows the label, a *"Required"* badge, *"make optional"* / *"make required"*, *"edit options"* (dropdown and multi-select only; a comma list applied on blur or Enter), the type line *"{type} field · {n} options"*, rename (pencil) and delete (browser confirm); rows drag to reorder. The add form takes *"Field Label"*, *"Field Type"* (*"Text"*, *"Number"*, *"Date"*, *"Dropdown"*, *"Multi-select"*, *"File Upload"*), *"Options (comma-separated)"* for the two choice types, and a *"Required field"* switch. *"Save Fields"* sends the list (B-26).
- Rules: add refuses a blank label (silently), a label already used (case-insensitive) and a choice field with fewer than two options; rename and *"edit options"* check none of these — a rename can duplicate a label and options can be cut to one or none, which stores `null` and hides the field's control (B-27). A field's type cannot change after creation. There is no help text, placeholder, default value, grouping, visibility or per-role setting, and nothing on the page says where fields appear.
- Data: `lead_custom_fields(id, studio_id, label, field_type, options text[], is_required, order_index, is_active, created_at)`.
- States: an empty list shows only the add form.
- Words: *"Custom Lead Fields"*; *"Add extra data fields to capture on every lead."*; *"Required"*; *"make optional"* / *"make required"*; *"edit options"*; *"Comma-separated options"*; *"Field Label"* · *"e.g. Move-in Date"*; *"Field Type"*; *"Options (comma-separated)"* · *"e.g. Small, Medium, Large"*; *"Required field"*; *"Add Field"*; *"Save Fields"*; tooltips *"Toggle required"*, *"Edit options list"*, *"Rename field"*, *"Delete field"*; toasts *"A field with that label already exists"*, *"Dropdown / multi-select fields need at least 2 options"*, *"Custom fields saved"*, *"Failed to save custom fields"*.
- Reachable: yes.

### B-26 · Saving the field list erases every captured value
- Where: RPC `M033:22-44`; `src/app/api/lead-config/custom-fields/route.ts:55-79`; values foreign key `M090:24-30`; `ACC:454-470, 1054, 1139`; test `src/__tests__/lead-config-scoped-api.test.ts:158-173`.
- Entry: *"Save Fields"*.
- Does: the route drops the ids the page sends and calls `save_lead_custom_fields`, which deletes every `lead_custom_fields` row of the studio and inserts the list again with new ids, in one transaction. `lead_custom_field_values.field_id` references `lead_custom_fields(id) ON DELETE CASCADE`.
- Rules: every save — a reorder, a new field, or pressing *"Save Fields"* with nothing changed (the button is never disabled) — deletes every captured custom-field value on every lead of the studio. The delete confirm promises the opposite (*"This will not erase data already captured on existing leads."*, `ACC:1054`). Neither the requirements CSV (rows 11, 32) nor the user stories (`accounts-setup.md:149-157`) record this; the test checks the RPC call, not that values survive. Categories and pipeline stages use the same delete-and-insert RPC, but nothing references them. Read from the code and migrations, not run against a database (Uncertain 1).
- Data: `lead_custom_fields`, `lead_custom_field_values`.
- States: —
- Words: confirm *"Delete field "{label}"? This will not erase data already captured on existing leads."*
- Reachable: yes.

### B-27 · Where custom-field values show and how they are stored
- Where: `DRW:643-684` (drafts, batched save), `:1635-1748` (render); `src/app/api/studio-config/custom-field-values/route.ts:1-74`; `SC:479-505`; grep of custom-field readers (this page, the drawer, two routes, the transformer — nothing else).
- Entry: lead drawer → Lead Info tab → *"Custom Fields"* section, shown when the studio has at least one field (leads B-31).
- Does: renders each field by type — text, number and date inputs, a dropdown with *"Select..."*, multi-select chips — and saves through a per-lead upsert on `(lead_id, field_id)`: typing is batched and flushed 500 ms after the last keystroke or on blur, choices save at once, anything pending saves when the drawer closes. Values are JSON: text, number and date as strings (a number is kept as the input's string), multi-select as a string array.
- Rules: *"File Upload"* fields render only their label — there is no input, so they can never hold a value. *"Required"* adds an asterisk and nothing else. The section is always editable, unlike the other Lead Info sections that need *"Edit Lead Info"* (leads B-21). Custom fields appear nowhere else: not on the New Lead drawer or `/leads/new` (so *"capture on every lead"* can only happen after creation), not as board or list columns, filters, search, the CSV export (leads A-54), document fill (leads A-55), webhook / email / hangout / agent intake, project conversion or any report. Editing a field's options leaves stored values as they are — a removed dropdown option stays stored while the select shows *"Select..."*; a removed multi-select option stays in the array with no chip to clear it. The values table has no `studio_id`; its isolation rides on `leads` (route comment `:5-8`; hand-off D).
- Data: `lead_custom_field_values(id, lead_id → leads ON DELETE CASCADE, field_id → lead_custom_fields ON DELETE CASCADE, value JSONB)`, unique `(lead_id, field_id)`.
- States: skeleton rows while values load; a toast when a save fails.
- Words: *"Custom Fields"*; placeholder *"Enter {label, lower-cased}"*; *"Select..."*; *"Couldn't save custom fields — please retry"*.
- Reachable: yes.

---

## Lead Webhooks

### B-28 · The Lead Webhooks tab
- Where: `LWT:1-435` (`OutcomeBadge` `:36-51`, `LogPanel` `:55-95`, `EndpointRow` `:99-229`, `CreateEndpointForm` `:233-363`, tab `:367-435`); hooks `src/lib/queries/lead-webhooks.ts:18-129`.
- Entry: Accounts › Lead Management › *"Lead Webhooks"*.
- Does: a header and a *"How it works"* box; *"Generate webhook URL"* opens the create form (source, optional label, optional notes); after creation a panel shows the URL — and for Google a one-time signing key — with platform-specific setup steps and *"Done"*. Below, one card per active endpoint: label (or *"Webhook endpoint"*), label badge, Google badge, notes, counters, *"Last: {date}"*, the full URL with *"Copy"*, regenerate, revoke, and a *"Recent activity"* toggle. Full words: leads A-58, C-47.
- Rules: the file header says "Owner-only" (`LWT:3-8`); nothing enforces it (B-02). The URL is built from the browser's current origin (`LWT:374`), so a URL copied on a preview or alternate domain points there. The full token URL stays visible and copyable in the list at any time; only the Google key is shown once. Label and notes cannot be edited after creation; there is no test-send button, sample payload or cURL line; revoked endpoints disappear together with their history.
- Data: B-29.
- States: *"Loading endpoints…"*; *"Creating…"*; empty *"No webhook endpoints yet."* / *"Generate one above to start receiving leads from external systems."*
- Words: header, how-it-works, form, setup steps, confirms and toasts verbatim in leads A-58.
- Reachable: yes.

### B-29 · Creating, regenerating and revoking endpoints
- Where: `src/app/api/webhooks/leads/endpoints/route.ts:12-88`; `…/endpoints/[endpointId]/route.ts:8-35`; `…/[endpointId]/regenerate/route.ts:14-46`; `…/[endpointId]/logs/route.ts:11-49`; `TR:3069-3087`; `src/proxy.ts:361-364`; `scripts/migrations/133_lead_webhooks.sql:8-27`; `scripts/migrations/274_ad_lead_integration.sql:7-21`.
- Entry: the tab's buttons.
- Does: create mints a 48-hex token (24 random bytes) and stores platform (`generic` or `google_ads`; the UI's Meta option is stored as `generic` with the label *"Meta Ads"*), label, notes and creator; a Google endpoint also gets a 48-hex `signing_secret`, returned once in the create response. The list returns active endpoints, newest first, without the secret. Regenerate replaces the token of an active endpoint. Revoke sets `is_active = false`. Logs returns the last 50 rows of an endpoint belonging to the studio.
- Rules: regenerate rotates only the URL token — the Google key can never be rotated or shown again, although the success panel says *"You can regenerate later, but the old key stops working."* and the transformer comment says the secret is returned "after create / regenerate" (`TR:3078-3079`); a lost key means revoking and creating a new endpoint (new URL and key in Google). Generic endpoints never receive a secret from the UI or the API, so the receiver's `X-Signature` check (B-30) cannot be switched on without editing the database; a generic endpoint is protected by its URL alone. Revoke cannot be undone and a revoked endpoint's log is unreachable from the UI (the logs route does not check `is_active`). Label and notes are stored as sent (the 80 / 200 character limits are browser-side only). The API accepts platform `meta`, which nothing uses (`274:7-10`). The routes read the session cookie directly and check studio membership only — no role (leads C-48); the proxy lets the whole `/api/webhooks/leads/` prefix through unauthenticated, so the management routes rely on their own cookie check (hand-off D).
- Data: `lead_webhook_endpoints(id, studio_id, token UNIQUE, platform CHECK in generic | google_ads | meta, signing_secret, source_label, notes, is_active, total_received, total_leads_created, total_duplicates, last_received_at, created_at, created_by)`.
- States: —
- Words: *"Revoke this webhook? Any external system using it will stop receiving leads."*; *"Regenerate the token? The old URL will stop working immediately."*; *"Shown once — copy it now. You can regenerate later, but the old key stops working."*; toasts *"Webhook created"*, *"Failed to create webhook"*, *"Webhook revoked"*, *"Failed to revoke webhook"*, *"Token regenerated — copy the new URL"*, *"Failed to regenerate token"*.
- Reachable: yes.

### B-30 · What happens when a lead is POSTed
- Where: `WH:30-305`; `src/lib/rate-limit.ts:1-37`; `DD:115-157`; ordered algorithm in leads A-59.
- Entry: an external system POSTs to the URL.
- Does: size check, active-token lookup, rate limit, HMAC (generic endpoints with a secret only), parse (JSON or form-encoded), Google key check and test short-circuit, field mapping (B-31), name required, Google `lead_id` idempotency, phone / email de-duplication (an active match is dropped, an archived match noted), insert at the funnel's intake bucket and first status, counters and log, `lead.captured` to owners and admins (leads A-59, C-62).
- Rules: every created lead goes to the review queue (`email_lead_status: "pending_review"`, `WH:215`); a studio cannot choose auto-approve, an intake bucket or status, a default assignee, a country or a custom-field mapping per endpoint. The rate limit is an in-memory map inside each server instance (`rate-limit.ts:4`), so "10 per minute per token" holds per instance, and it runs before authentication, so rejected posts use up the quota (`WH:64-80`); a burst of more than ten genuine leads a minute gets 429s, lost unless the sender retries. De-duplication ignores the studio's switch (B-06) and normalises phones with Singapore rules. The legacy `status` column is written `"new"`.
- Data: `leads` insert (`name, phone, email, budget, property_type, notes, source, external_lead_id, ad_metadata, status, bucket, lead_status_code, email_lead_status, needs_attention, possibly_duplicate, contract_uploaded`); `lead_webhook_log`; `notifications`.
- States: responses `{status: "created" | "duplicate" | "test", lead_id?}`; errors 400 / 401 / 404 / 413 / 429 (leads A-59).
- Words: API error strings as leads A-59.
- Reachable: yes (public).

### B-31 · Payload mapping as documented and as coded
- Where: `WP:30-175`; `LWT:388-404, 306-313`; `WH:196-209`; `src/app/api/cron/poll-emails/route.ts:211`; tests `src/__tests__/nf20-lead-webhook.test.ts:197-484`.
- Entry: —
- Does: generic and Meta endpoints map flat fields by alias (leads A-60); Google endpoints flatten `user_column_data` (leads A-61).
- Rules: the tab lists seven fields and three aliases; the code also accepts `customer_name`, `contact_number`, `budget_amount`, `budget_cents`, `propertyType`, `property` and `comments`, and has no alias for email (`WP:44-76`). Name, phone, email, property and notes must be JSON strings — `"phone": 91234567` as a number is ignored (`WP:35-41`). Budget takes numbers or numeric strings; "S$50,000" or "50k" become null. A payload `source` overrides the endpoint label with any text. `property_type` is stored raw rather than as the region key the lead forms use (the email cron normalises it, `poll-emails:211`; the webhook does not), so the drawer may not recognise it. Phones keep digits and `+` only and are not normalised. Google leads never carry budget or property type; other columns and custom questions go into notes as *"{COLUMN} → {value}"*. The Meta steps ask the bridge to map `phone_number → phone` because `phone_number` is not an alias.
- Data: —
- States: —
- Words: *"Accepted JSON fields: name, phone, email, budget, property_type, notes, source. Also accepts common aliases like full_name, mobile, message."*; *"Map fields: full_name → name, phone_number → phone, email → email, plus any extras into notes."*
- Reachable: yes.

### B-32 · Webhook logs and counters
- Where: `WH:64-271` (log writes), `:309-340` (`writeLog`); `WP:227-231`; `scripts/migrations/133_lead_webhooks.sql:29-55`; `LWT:36-95, 160-178`; `src/types/app.ts:4146-4154`; `src/lib/queries/lead-webhooks.ts:33-45`; `scripts/cleanup/003_fleet_purge_demo_data.js:354`.
- Entry: endpoint card → *"Recent activity"*.
- Does: each request that reaches an active token writes one log row: outcome (`rate_limited`, `unauthorized`, `invalid`, `test`, `duplicate`, `lead_created`), the lead id when there is one, an error message, and the first 2,000 characters of the body with `google_key` redacted. The card shows 10 of the latest 50 rows: outcome badge, time, *"lead: {first 8 characters}…"*, error. Counters come from an RPC that adds one to *received* and one to *created* or *dupes*.
- Rules: the RPC runs only on the created and duplicate paths, so *"{n} received"* = created + duplicates; invalid, unauthorized, rate-limited and test requests are never counted and do not move *"Last:"*. The RPC call is fire-and-forget; a failure is silent. Google's test posts log outcome `test`, which is missing from the badge map and from the TypeScript union, so they show as a red *"Invalid"* badge (`LWT:37-44`). The stored body excerpt is never shown, so a studio cannot see what a failing sender posted. No paging, filter or auto-refresh (15 s stale time); no retention job for the log table (only a demo purge script). *"{n} dupes"* hides at zero.
- Data: `lead_webhook_log(id, endpoint_id → endpoints ON DELETE CASCADE, received_at, outcome text, lead_id → leads ON DELETE SET NULL, payload_excerpt JSONB {raw}, error_message)`; counters on `lead_webhook_endpoints`.
- States: *"Loading logs..."*; *"No requests received yet."*
- Words: badges *"Created"*, *"Duplicate"*, *"Invalid"*, *"Unauthorized"*, *"Rate limited"*; *"{n} received"*, *"{n} created"*, *"{n} dupes"*, *"Last: {date}"*; logged errors *"Rate limit exceeded"*, *"Invalid X-Signature"*, *"Invalid google_key"*, *"Parse error: {message}"*, *"Missing required field: name"*, *"Lead creation failed: {message}"*.
- Reachable: yes.

---

## Lead settings stored elsewhere

### B-33 · Workflow Rules switches that gate leads
- Where: `ACC:1609-1736` (lead switches `:1619-1621, 1633-1634`; approver map `:1646-1654`); `src/app/api/studio-config/workflow/route.ts:16-100`; `SC:68-111, 776-791`; `src/components/accounts/member-override-panel.tsx:24-32`; `CTX:787-800`; `DA:55-97`; `src/components/leads/conversion-readiness-card.tsx:75-110`.
- Entry: Accounts › Workflow › *"Workflow Rules"* (outside the Lead Management group).
- Does: five of the eleven switches concern leads, all on by default: *"Quote approval required"*, *"Contract required for Signed"*, *"Project type required"*, *"Auto-create follow-up tasks"*, *"Require assignment for Ongoing"*. Each click saves at once (deep merge). The Classic gates they pair with: B-19; follow-up automation: leads C-23; quote approval and its approver list: hand-off C.
- Rules: *"Require assignment for Ongoing"* applies to every bucket marked *Requires assignment*, not only Ongoing. On leads, the four gating switches (all but *"Auto-create follow-up tasks"*) act only in the Classic drawer and readiness card and only when the funnel status or bucket carries the matching flag (B-19); nothing is enforced on the server. *"Quote approval required"* also governs quote submission (hand-off C). *"Auto-create follow-up tasks"* runs inside the browser's lead update (`CTX:787-800`; no server code creates `LeadFollowUp` tasks), so only follow-up dates set through the drawer create tasks — the hold restart date (leads C-20) and agent writes (leads C-28) never do. Per-member workflow overrides exist (`SC:776-791`), but the override panel lists none of the lead switches (`member-override-panel.tsx:24-32`). Studio Setup shows only the quote and contract switches of these five (B-20).
- Data: `studios.settings.workflow.{quoteApprovalRequired, contractRequired, projectTypeRequired, autoCreateFollowUps, requireAssignment, approvers{}}`; `studio_members.workflow_overrides`.
- States: switch disabled while saving.
- Words: *"Workflow Rules"*, *"Control which actions require approval in your studio."*; *"Contract required for Signed"* · *"Require a signed contract before marking a lead as Signed"*; *"Project type required"* · *"Require project type selection before marking a lead as Signed"*; *"Auto-create follow-up tasks"* · *"Automatically create tasks when follow-up dates are set on leads"*; *"Require assignment for Ongoing"* · *"Require a lead to be assigned before moving to Ongoing bucket"*; toasts *"{label} enabled"*, *"{label} disabled"*, *"Could not change "{label}""*.
- Reachable: yes.

### B-34 · AI Assignment Logic (saved, never read)
- Where: `ACC:113, 331, 401, 519-533, 1267-1296`; seed `scripts/migrations/013_studio_settings.sql:60`; requirements CSV row 36; `docs/user-stories/detailed/accounts-setup.md:249`.
- Entry: Accounts › Workflow › *"AI Assignment Logic"*.
- Does: a free-text prompt saved to `studios.settings.ai_assignment_prompt`.
- Rules: nothing reads the key (grep: types, transformer, this page). The copy promises that ID Buddy uses it to pick the assignee, tag a category and set a priority; the real suggestion is fixed scoring over member preferences, performance and specialty (leads B-35), and categories are never tagged (B-21).
- Data: `studios.settings.ai_assignment_prompt`.
- States: —
- Words: *"AI Assignment Logic"*; *"Write a natural language prompt that defines how ID Buddy assigns and categorizes new leads."*; *"How it works"*; *"When a new lead comes in, ID Buddy reads your prompt below along with the lead's details to decide: who to assign it to, what category to tag, and how to prioritize it."*; *"Assignment Prompt"*; *"Use plain English. ID Buddy will interpret and apply this logic to each new lead."*; *"Save Prompt"*; toasts *"AI assignment logic saved"*, *"Failed to save AI assignment logic"*.
- Reachable: yes (dead setting).

### B-35 · Pipeline Stages (the legacy "Lead Stages" list)
- Where: `ACC:120, 164, 300-306, 380-387, 472-488, 813-945`; `src/app/api/lead-config/pipeline-stages/route.ts`; RPC `M033:46-64`; table `scripts/migrations/003_studios.sql:31-40`; seed `scripts/migrations/022_seed_studios.sql:40-56`.
- Entry: Accounts › Projects › *"Pipeline Stages"* (the pane is headed *"Lead Stages"*).
- Does: named stages with a slug badge, a colour cycle (eight colours), rename (regenerates the slug), delete (confirm), add, and *"Save Pipeline"* (delete all + insert).
- Rules: nothing outside this pane reads `pipeline_stages` (leads C-43). It predates the funnel and mirrors the legacy `leads.status` values (New, Assigned, Contacted, Meeting, Proposal, Signed, Returned, Archived — seeded for demo studios only). A studio can edit it believing it changes the lead pipeline.
- Data: `pipeline_stages(id, studio_id, name, slug, color, order_index, is_active)`, unique `(studio_id, order_index)`.
- States: —
- Words: *"Lead Stages"*; *"Define your sales pipeline stages. Drag to reorder."*; *"New stage name…"*; *"Add Stage"*; confirm *"Delete stage "{name}"?"*; *"Save Pipeline"*; toasts *"Pipeline stages saved"*, *"Failed to save pipeline stages"*.
- Reachable: yes (dead-end config).

### B-36 · Project Types as the lead's project-type list
- Where: `ACC:118, 274, 1794-1803`; `DRW:635`; `src/components/leads/drawer-sections/bucket-status-section.tsx:150-175` (leads B-39); `LBC:294` (`PROJECT_TYPES`); `src/components/settings/lead-preference-editor.tsx:11, 55-56`; seeds `M090:355-363`, `src/lib/studio-default-taxonomies.ts:13-15`.
- Entry: Accounts › Projects › *"Project Types"*.
- Does: the taxonomy editor (B-22 save semantics) over type `project_type`; its names are the options of the Classic drawer's *"Project Type"* picker, which the Signed gate may require (B-19). Other uses (projects, timelines, quote rules): hand-offs A and C.
- Rules: the picker shows only when the lead is in bucket id `ONGOING` or its status requires a project type (`bucket-status-section.tsx:159`); Journey has no picker (leads C-34). The designers' Lead Preferences *"Scope"* dimension, and so the assignment scoring, read the fixed `PROJECT_TYPES` list instead of this taxonomy (`lead-preference-editor.tsx:11, 55-56`), so a project type the studio adds or renames can never be a designer's preference, and leads carrying it never match on scope.
- Data: `studio_taxonomies` type `project_type`; `leads.project_type` (text).
- States: —
- Words: *"Project Types"*; *"Define the types of projects your studio handles."*; *"New type (e.g. Landed Renovation)"*.
- Reachable: yes.

### B-37 · Member-level assignment settings, and the assignment rules that do not exist
- Where: leads C-37 (Settings › Lead Preferences), C-38 (Team Members › Lead Assignment), B-35 (suggestion scoring), B-80 (hangout leads); `src/components/leads/new-lead-drawer.tsx:362-367`; `WH:192-193`; `docs/features/studio-customization/onboarding-questionnaire.md:34, 59`.
- Entry: Settings › *"Lead Preferences"* (designers); Accounts › Studio › *"Team Members"* (owner) — screens are hand-off A.
- Does: each designer has *"Open to New Leads"* and five weighted preference dimensions; the lead drawer's *"AI Recommendation"* uses them, with performance and a keyword specialty match, to suggest one designer while a lead has no assignee; one click assigns.
- Rules: assignment is suggestion-only. No intake surface assigns automatically — webhook, email and hand-entered leads arrive unassigned, except that a designer creating a lead is assigned to themselves (`new-lead-drawer.tsx:362-367`) and hangout leads get the participating designer (leads B-80). There is no round-robin, auto-assign rule or capacity cap: the onboarding script's `settings.workflow.leadAssignment` (`auto` / `round-robin` / `manual`) does not exist in code (grep; the only round-robin in the code assigns hangout tables). Scoring weights are fixed (Preference 0–40, Performance 0–35, Specialty 0–25). The AI Assignment Logic prompt is not used (B-34).
- Data: `studio_members.accepting_leads`, `studio_members.lead_preferences`.
- States: —
- Words: verbatim in leads C-37, C-38, B-35.
- Reachable: yes.

### B-38 · Settings › Email Lead Sources (Gmail)
- Where: leads C-40, A-63…A-66; `src/app/api/cron/poll-emails/route.ts:81, 187-212, 302-303`.
- Entry: Settings (the member settings page) › *"Email Lead Sources"* (no role gate).
- Does: connects a Gmail inbox and polls it for lead emails from known portals (region defaults plus custom domains); parsed leads land at the funnel's intake, in the review queue.
- Rules: same words as Accounts › *"Lead Sources"* but unrelated to it; the detected platform name becomes `leads.source` whether or not the studio lists it (B-23). The duplicate switch (B-06) applies here. Property type is normalised to region keys here (`poll-emails:211`), unlike webhooks (B-31).
- Data: `email_connections`, `email_sync_log` (hand-off D).
- States: —
- Words: verbatim in leads C-40.
- Reachable: yes.

### B-39 · Lead notifications a studio configures
- Where: leads C-62, C-63, C-65; `src/lib/notifications/events.ts:8-18, 154-197`; `src/components/settings/notification-settings.tsx:156-162`.
- Entry: Settings › Notifications (owner tag only, leads C-65).
- Does: preferences per category and channel (in-app, email, WhatsApp, daily digest, recipient roles); the *Leads* category covers `lead.assigned`, `lead.followup_reminder`, `lead.status_changed` and `lead.captured`.
- Rules: preferences are per category, not per event — a studio cannot keep webhook capture alerts while muting stage-change emails. *"Edit template"* opens the category's first internal event, so for Leads only `lead.assigned` is editable (`notification-settings.tsx:156-162`). `lead.hold_restart` is outside the catalogue and cannot be configured. Stage-change content uses default funnel labels (B-18).
- Data: `notification_preferences`, `notification_templates` (leads C-63, C-65).
- States: —
- Words: verbatim in leads C-65.
- Reachable: yes (owner).

### B-40 · The manager-hierarchy flag
- Where: `src/app/api/studio-config/features/route.ts:22-25, 51, 78, 100-119, 139`; `ACC:267-271, 1739-1747`; leads C-55, C-58.
- Entry: none in the UI (API only).
- Does: `settings.features.lead_manager_hierarchy` limits who can reassign leads and which leads a manager sees (leads C-55); when on, Roles & Permissions shows the Manager card.
- Rules: the only lead setting in this slice with a server role check (owner / admin); no screen offers a switch for it — it is set by an API call (the code comments call it Dyel-only, default off for every studio, `features/route.ts:22-25`).
- Data: `studios.settings.features.lead_manager_hierarchy` (missing = off).
- States: —
- Words: *"Only owners/admins can change the manager hierarchy setting."*
- Reachable: API only.

### B-41 · Lead rules a studio cannot configure
- Where: `src/lib/leads/tat-report.ts:158-164`; `J:123`; `DRW:1087`; `DD:115-157`; `WH:64, 215`; `src/components/leads/new-lead-drawer.tsx:362-367`; `FT:57-68`; `src/types/app.ts:3779-3805`; leads C-04, C-19, C-20, C-24, B-35.
- Entry: —
- Does: fixed in code, with no setting anywhere: response-time grades (assignment → first outreach ≤ 8 h good, ≤ 24 h warning, otherwise bad); the follow-up reminder 30 minutes before (leads C-24); the hold revisit ping at 09:00 on the restart date (leads C-20); hold tiers by months to restart; "stalled" after 14 idle days (`J:123`, dead code — leads C-19); budget bounds 1,000–5,000,000 in the Classic drawer; the duplicate match rule (phone or email, exact); webhook and email leads always wait for review; the webhook rate limit of 10 a minute; designers assigned to their own new leads; designers may move leads forward only and may not unassign (by tag, leads C-04); assignment scoring weights (leads B-35). The funnel schema has no timing field, so no stage can carry a target time or SLA.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### B-42 · Platform admin settings that name leads
- Where: `src/app/admin/settings/page.tsx:60-61, 83, 300-341`; `scripts/migrations/053_seed_audit_and_settings.sql:24`; grep of `auto_refund` and `lead_sources`.
- Entry: admin portal › Settings (platform admins).
- Does: *"Refund Auto-Approval"* (*"Duplicate Lead — auto-approve"*, *"Spam / Test Submission — auto-approve"*) and *"Allowed Lead Sources"* save platform settings `auto_refund` and `lead_sources`.
- Rules: nothing in the app reads either key (B-24 for the source list).
- Data: `platform_settings.auto_refund`, `platform_settings.lead_sources`.
- States: —
- Words: *"Refund Auto-Approval"*, *"Automatically approve refunds for specific reasons without manual review"*, *"Allowed Lead Sources"*, *"Sources visible in the lead source dropdown for studios"*.
- Reachable: yes (admin; dead settings).

### B-43 · Archived Leads is on the Leads page, not in Accounts
- Where: `src/components/accounts/archived-leads-section.tsx`; `src/app/(main)/leads/page.tsx:53, 1266-1267, 1473-1478`; `docs/rules/leads.md:333`.
- Entry: Leads ⋮ → *"Archived Leads"*.
- Does: the archived list (leads A-71, C-31) renders inside the Leads page with *"Back to Leads"*.
- Rules: the component file lives in `components/accounts/` and `docs/rules/leads.md:333` says leads are "revivable anytime from Accounts → Archived Leads", but no Accounts item renders it (`ACC:74-160`). The label "Accounts › Archived Leads" in leads C-31 should read Leads › ⋮ › Archived Leads.
- Data: —
- States: —
- Words: *"Archived Leads"*, *"Back to Leads"*.
- Reachable: yes (from Leads).

---

## Tests

### B-44 · Tests covering this slice
- Where: `src/__tests__/lead-config-scoped-api.test.ts` (categories, custom fields, pipeline stages: auth, studio scoping, RPC mapping); `src/__tests__/studio-config-scoped-api.test.ts:119-356` (taxonomies scoping, workflow defaults, settings-read abort for features / journey / workflow, the manager-hierarchy gate); `src/__tests__/lead-funnel-transitions.test.ts` (position resolvers, `validateFunnelConfig`, `diffRemovedFunnelIds`); `src/__tests__/lead-journey.test.ts` (default steps, derivation); `src/__tests__/duplicate-leads.test.ts` (detector, switch); `src/__tests__/nf20-lead-webhook.test.ts` (parser, HMAC, Google adapter; the receiver and management routes only by source-text assertions such as `toContain("verifyGoogleKey(")`, `:486-512`); e2e `e2e/accounts-exhaustive-walk.spec.ts:89` (clicks through every Accounts tab), `e2e/accounts-role-based-walk.spec.ts:41`, `e2e/customization-engine.spec.ts`.
- Entry: —
- Does: covers the helpers and the scoping of the routes.
- Rules: no test renders the Lead Experience tab, the journey editors, the funnel editor, the categories / sources / custom-field panes or the webhooks tab; no test calls the funnel PUT (the 409 guard), the journey PUT with content, the webhook receiver or the endpoint routes; nothing checks that custom-field values survive a field save (B-26) or that journey settings behave with a custom configuration.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Uncertain / not verified

1. **Custom-field values wiped on save** (B-26): read from `save_lead_custom_fields` (migration 033) and the `ON DELETE CASCADE` foreign key in migration 090; not run against a database. The second migration set (`supabase/migrations/`) does not define `lead_custom_field_values`, so which definition production carries, and whether any studio has captured values today, was not checked (hand-off D).
2. **Bucket dot colours** (B-18): four palette colours become runtime-built `bg-[#hex]` classes that appear nowhere as literals; whether Tailwind generates them (and so whether those dots show) was not rendered.
3. **Migration 274 on studios with no sources** (B-24): read from the SQL; which studios, if any, had an empty source list at the time was not checked.
4. **Studios with no funnel row** (B-12): the blank pane is read from `ACC:1443` and the GET route; how many studios lack a row, and whether non-owners reach Accounts before the owner's setup, was not observed.
5. **Journey settings read failure** (B-11): that a GET error shows the defaults and a Save then overwrites the stored configuration is read from the code, not exercised.
6. **Webhook rate limit reach** (B-30): per-instance behaviour depends on the hosting (serverless instances); how Google Ads and Zapier retry after a 429 was not verified.
7. **The `test` outcome badge** (B-32): read from the badge map; not rendered.
8. **Reason-code collision** (B-09): derived from `slugify` and the list length; not clicked.
9. **Agent-set follow-ups** (B-33): no server code creates `LeadFollowUp` tasks (grep), so agent writes should create none; whether the agent creates a task through another tool was not traced.
10. **Accounting and designer access** (B-01, B-02): allowed by the route table and unguarded screens; not clicked through with those roles.
11. **The `dup-check` filter** (B-06): the email goes into a PostgREST `.or()` string unescaped; whether a crafted address changes the filter was not tried (hand-off D).
12. **Classic flash for Journey studios** (B-04): read from the `?? false` defaults; not observed.
13. **Hangout lead source text** (B-23, B-37): taken from leads B-80, not re-read.
14. **Other provisioning paths** (B-12, B-24): only the admin studio-creation route was traced for seeding; scripts or partner provisioning that create studios may seed differently.
15. **Custom funnels with several assignment buckets** (B-16): which bucket the journey floor, resume and Signed reopen pick was read from the resolvers; not tried on a custom funnel.
16. **Studio Setup Custom template** (B-20): the need to press the inner *"Save Funnel"* before *"Continue"* is read from `SS:651-656`; not clicked.
