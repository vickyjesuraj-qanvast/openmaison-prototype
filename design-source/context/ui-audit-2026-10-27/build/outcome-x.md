# X — the cross-lane requests, applied in main (the calm UI build, 2026-10-27)

Scope: every §7 request from B1 · B3 · B4 (+ fork A / fork B) · B6 that targets a file owned by B1 · B3 · B4 · B6; then (orchestrator,
mid-run) the §7 requests from B2 · B5 (+ B5/parts) that target those lanes' files, every "other lanes' probes" list across the six
outcomes and Y §4, the two stale probes (pm2-s09 · pm2-s31), and two lists of consistency follow-ups. Rules as the brief's §1–§2:
display words and layout only, nothing lost, every handle kept, every restated probe line marked
`(the calm UI build 2026-10-27, a deliberate change)` (the stale-rule one `…: restated to the rule already in force`). No build, no server,
no `local.db`, no commit.

## 1 · Requests — one row each

### B1's §7 (to B3 · B4 · B6)

| # | Request | Status | Where |
|---|---|---|---|
| B1→B3 1a | "says they paid INV-…" (drop "for") | already done | lib/projects/money-needs.ts |
| B1→B3 1b | "Refund S$… to {client} (CN-…)" · verb **Record** | applied (title was done; verb now "Record", the header keeps "Record the refund" via `HEADER['money-to-refund']`) | lib/projects/money-needs.ts · lib/projects/needs-you.ts · components/projects/money/needs-list.tsx |
| B1→B3 1c | "Bill {no} from {company}" | already done | lib/projects/money-needs.ts |
| B1→B3 2a | 'Move the schedule' → **Update schedule** (W-557) | applied (row verb; header "Update the schedule for VO-n"; the dialog's own confirm keeps "Move the schedule") | lib/projects/needs-you.ts |
| B1→B3 2b–2e | Share n schedule changes · You're all caught up · Overview head · scope pill | already done | — |
| B1→B3 3a–3c | Issues words · Flag to the Owner · Note · team only · bell templates | already done (the Activity lines are lib/leads/activity.ts — B2) | — |
| B1→B3 3d | Issues ghost: the chips' radius + the remembered row count (1-45) | applied (`r` = radius-1; `om.shape.studio-tickets.rows`, written by the page's Open list, read by the ghost; a fresh browser draws the demo's 3) | components/projects/tickets/studio-tickets-ghost.tsx · studio-tickets.tsx |
| B1→B3 4a–4b | STUDIO tag · Client tag | already done | — |
| B1→B3 4c | "Search messages" (W-611) | applied (placeholder; aria-label "Search conversations" kept) | components/projects/messages/chat-inbox.tsx |
| B1→B3 4d | lists end with `--fab-clearance` | already done (the pages' `pageStyles.content` / the frame's `.centre` already pad by it) | — |
| B1→B3 (B3's own) | drop `help={null}` + the `p:empty` rule now EmptyState's help is optional | applied | chat-inbox.tsx · messages.module.css |
| B1→B3 5 | MetaChip fact on the frame's chips; `countTone: 'late'` | already done / n/a (B3 removed the chips, 3-31; no project tab count is "overdue and yours" alone — `tasksDue` counts anyone's — so none opts into red) | — |
| B1→B3 6 | Choices: one figure both sides "+S$457.80 incl. GST" (3-21) | applied (display only; the option dialog's own line passes the GST too) | lib/projects/choices-model.ts · choices/option-dialog.tsx · choice-card.tsx |
| B1→B3 7 | project dates through relativeTime / displayDate (3-20) | skipped — B3 kept the listing's "On hold till: Sun, 29 Nov ’26" on purpose to mirror the Leads listing (B3 §1 touches) | — |
| B1→B4 1 | `savedLabel` for every editor's "Saved …" (4-43) | applied (quote editor's local copy removed; `lib/contracts/model.ts` re-exports the house one; the quote template editor uses it) | quote-editor.tsx · lib/contracts/model.ts · templates/editor/template-editor.tsx |
| B1→B4 2 | editors' header chips as facts | already done (B4 4-11 dropped them) | — |
| B1→B4 3 | `lib/templates/ago.ts` spelled out | applied ("3 hours ago", "2 days ago") | lib/templates/ago.ts |
| B1→B6 1 | X-Ray card ⋮ grey | already done | — |
| B1→B6 2 | planner's "Make a 3D picture" as a door to Floorplan to 3D | already done — B6's call (▲4): the planner keeps its own path, renamed "Trace a floor-plan photo" | — |
| B1→B6 3 | MetaChip fact in tools' top bars | already done | — |

### B3's §7 (to B1 · B4 · B6)

| Request | Status |
|---|---|
| B1: rail · ⌘K Issues · FAB · EmptyState help · relativeTime · date field · health · pulse · Review pane | already done (B1 §7) |
| B1 FYI: dash-d2's DOORS list may need "Write" | applied — probe restated (see §2) |
| B4: the quote editor's VO pill reads `variationLabel` | already done (both say "With client") |
| B6: Compliance Navigator shares ItemRow | already done (B3 landed it) |

### B4's §7 — the quotes part, fork A, fork B

| Request | Status | Where |
|---|---|---|
| B1 · meta-chip sentence-case option | already done (B1's `kind="fact"`) — **applied its use** for W-484's tags: Default · Studio default · At handover · PDF · the T&Cs kind · the template picker's Default / version / paper · the editor's origin chip · Create quote's Default | company/templates/{payment,contract,quote}-templates-gallery.tsx · editors/{text,payment}-template-editor.tsx · templates/template-picker.tsx · templates/editor/editor-topbar.tsx · quotes/create-quote-modal.tsx |
| B1 · `QuotesListGhost`: the header's "New quote" slot; drop the toolbar's title + create | applied in part — the header's slot (new additive ghost Action `{ desk }`, gone on a phone, none on the first run); **the toolbar half is `QuotesTabGhost` in components/leads/detail/tab-ghosts.tsx (B2's)** → handed on (§5) | components/shell/ghost-kit.tsx · list-ghosts.tsx |
| B1 · ⌘K old words (Create Quote, Category, Vendor/Sub, Sent to Client, Sent for Approval, Waiting on client, Sent it another way, Issuing Entity, My Templates…) | applied (rows that exist; "Due", "Section label", "Round Prices" have no row / already match) — and the Create row reads **New quote** (§2), "create quote" in its words | lib/global-search/model.ts |
| B3 · Documents card / VO rows / `variationLabel` through `quoteStatusLabel` | applied (Documents card, Project info rows, the direct project's other documents — quote and contract states through their display maps) | components/projects/overview/documents.ts |
| fork A · contract-header editable title, then four library editors drop their meta row (4-17 · 4-18) | **left for later** — a header restructure across five files that moves `library-meta` and the rows' other contents (task switches, schedule note, kind chip); needs its own visual pass at every width | — |
| fork A · `galleryFacts` "n clauses" (+ rc-c4 probes) | applied (also the orchestrator's item 1) | components/contracts/template-screen/template-words.ts |
| parent · Add Item list "· Waiting for approval" | already done — and the Price book dialog's chip now reads the same | quotes/editor/items/price-book-dialog.tsx |
| parent · "Print group" in the template inspector / picker | already done — and `set-value-dialog`'s field reads "Print group" too | quotes/editor/items/set-value-dialog.tsx |
| B1 · `FolderGroup head={false}` (4-37) | applied (additive; the galleries pass it, the Files tab keeps its head) | components/om/folders/folder-card.tsx · company/templates/library-gallery.tsx · library-gallery.skeleton.tsx |
| B1 · TextField `hideLabel` for table cells (4-17) | **left for later** — a new house field mode changes every empty cell's look; needs a visual pass | — |
| Landing · repair the stored Default Quote PDF's words | skipped — stored data (a repair) | — |
| B5 targets (settings words, Templates tab, brand ghost, panel badge, My Items) | handed to the B2/B5 agent (Y) | — |

### B6's §7

| # | Request | Status | Where |
|---|---|---|---|
| 1 | B3 item-row | already done | — |
| 2 | compliance ghost heads in sentence case | applied | components/projects/compliance/compliance-ghost.tsx |
| 3 | PageHeaderL2 crumb-only form; the article's h1 | applied (title optional; crumbs without the trailing slash; chips keep their row; the article's headline is its h1; ghost `GhostHead2` title optional) | components/shell/page-header-l2.tsx · ghost-kit.tsx · market-insights/article-page.tsx · article-ghost.tsx |
| 4 | PageHeader `after` slot; Beta + glyph beside the title | applied (additive; wraps under the title on a phone; ghost `GhostHead after` + `.headAfter`) | components/shell/page-header.tsx · .module.css · ghost-kit.tsx · .module.css · floorplan-3d/floorplan-tool.tsx · floorplan-ghost.tsx · marketplace-home.tsx · marketplace-ghost.tsx · insights-home.tsx · insights-ghost.tsx |
| 5 | promote `SourceInfo` → `components/om/info-tip.tsx` | applied (`InfoTip`; the three users import it; `components/marketplace/source-info.tsx` removed — it was untracked) | components/om/info-tip.tsx |
| 6 | ⌘K "Make a 3D picture" → "Trace a floor-plan photo" | applied (sub "3D Space Planner · start a layout over a floor-plan photo"; "make a 3d picture" kept in its words) | lib/global-search/model.ts |
| 7 | the project Floor plan ⋮ row → "Trace a floor-plan photo" | applied (B3 half; the Files half was B2's — Y applied it) | components/projects/floor-plan/project-floor-plan.tsx |
| 8 | LibraryGallery's title for a library with no folders "Layouts" | applied (library-gallery.tsx is B4's, not B5's; the count stays in the pill's "All · n"); the folder-libraries half was B5's (Y) | components/company/templates/library-gallery.tsx |
| 9 | the Folders row's lone select-all goes | applied (with 4-37 above; select every folder at once = the list view's Select all) | — |
| 10 | trial X-Ray "(8 items)" | applied | lib/trial/policy.ts |
| 11 | Maison AI answers render → version | applied (+ a defect fixed: the picked-versions answer's sentence had slipped into a `//` comment and never showed) | lib/maison-ai/answers/work.ts |
| 12 | `render_feedback` label, help, templates → versions | applied | lib/notifications/model.ts |
| 13 | ⌘K Visualizer words "version versions" | applied | lib/global-search/model.ts |
| 14 | Activity render → version | B2's file (Y) | — |
| 15 | MetaChip sentence case for statuses | skipped — conditional ("only if Vicky wants"); T-06 keeps capitals for a status | — |
| 16 | StatTile sentence-case option | already done (B1's StatTile caption is sentence case) | — |
| 17a | "Send via WhatsApp" → **Send on WhatsApp** (W-058) | applied — once B2/B5 had landed with "Send on WhatsApp" (meetings, PO send, files, tasks), the house `SendContractDialog` default, Send together, the three reminder subtitles and the invoice sends follow | contracts/editor/dialogs.tsx · send-bundle-dialog.tsx · leads/contracts/lead-contracts.tsx · contracts/list/contracts-workspace.tsx · contracts/editor/contract-editor.tsx · projects/money/invoice-page.tsx · use-invoices.tsx · quotes/editor/quote-editor.tsx |
| 17b | Upload a quote "N items read" | applied (+ the VO upload's twin) | components/quotes/upload-reading.tsx · projects/money/vo-upload-dialog.tsx |

### B2's §7 (to B1 · B3 · B4)

| Request | Status | Where |
|---|---|---|
| B1 tabs / rail neutral counts | already done (B1 1-04 · 2-22) | — |
| B1 EmptyState outlined primary | applied — additive prop **`primaryLook="outlined"`** (not `tone`, which already means first-run/plain); its use in components/meetings/lead-meetings.tsx is B2's | components/om/empty-state.tsx |
| B1 /tasks approvals banner | already done (B1 1-03) | — |
| B1 DateTimeField house date | already done (B1 4-16) | — |
| B1 list-ghosts /tasks | already done / n/a — the header bone already the button's width; the columns are tab-ghosts.tsx (B2) | — |
| B1 detail-skeleton | applied (no chips on the Overview's header, a facts line on other tabs, no locked-Convert bone, "Open tasks" · "Quotes" · "Questionnaire") | components/shell/detail-skeleton.tsx |
| B1 `fromLabel` | applied ("Import history", "Reports") | lib/nav.ts |
| B1 relativeTime · FAB · Dashboard stages · MetaChip | already done (B1) | — |
| B1 Qanvast Ops ghost header | applied (title + ⋮; toolbar: "All leads · n" pill, the search at its own width, Column settings desk-only) | components/shell/skeleton.tsx |
| B3 AiBriefGhost `single={false}` | applied | components/projects/overview/overview-ghost.tsx |
| B3 InfoColumn `onEditField` | applied (opens Edit details on that field) | components/projects/project-frame.tsx |
| B3 "Notes & logs" | applied (tab + view) — and ⌘K's Notes & logs scope | lib/projects/tabs.ts · lib/global-search/model.ts |
| B3 Activity Quotes chip | applied | lib/projects/tabs.ts |
| B3 Questionnaire `setUpHref` | applied (Owners / Admins; Company › Questionnaire with the way back). Note: the lead's own tab doesn't pass it either (app/leads/[id]/[tab]/page.tsx — B2's) | app/projects/[id]/[tab]/page.tsx |
| B4 status display maps · Copy link · All quotes / contracts · New contract ▾ | already done (B4) | — |

### B5's §7 + parts (to B1 · B3 · B4)

| Request | Status | Where |
|---|---|---|
| MUST: Maison AI tile lookups by label | already done (both accept old and new labels) | — |
| ⌘K old words; "What each role can do"; "Approvals"; "Message wording" kept; "Project schedules"; usage/report words | applied | lib/global-search/model.ts |
| DefinitionList row (handle · name = Edit · type as text · Required · Active · ⋮) + "New {noun}" | applied (each ⋮ row keeps the entry's name for a screen reader; `bank-question-handle` and the rows' testids kept) | components/om/definition-list.tsx · .module.css |
| studio-health words | already done — plus the trend series "AI uses" | lib/studio-health/model.ts |
| durationWords | already done (B1) | — |
| "monthly amount" → "monthly limit" | applied (+ the refusal "set monthly limits") | lib/notifications/model.ts · lib/dashboard/inbox-queries.ts · lib/maison-ai/answers/money.ts · app/credits/actions.ts |
| untouched-lead help | applied | lib/notifications/model.ts |
| Dashboard "To approve" → Approvals | already done (B1) | — |
| `lib/qanvast-listing` words | B2's prefix (`lib/qanvast`) — Y | — |
| Your profile `detailsHelp` | already done (not rendered) | — |
| Tools panel eyebrow | already done (B1) | — |
| "closed to new leads" → "not taking new leads" | skipped — optional, and Members' own snackbar still says "open to new leads" | — |
| B3 invoice "Save" · trust words · handover label | already done (B3) | — |
| B3 handover pointer | already done (a HelpLink) | — |
| B3 schedule pointer "Switched under Approvals, above." | applied (+ "Company › Templates › Project schedules") | components/projects/schedule/schedule-settings.tsx |
| B3 "Checked by" | already done | — |
| B3 handover-model `belowPlan` tone | already done (B3's `marginAgainstPlan`) | — |
| B3 `&do=approve` keyed on the step | applied (testid or the label) | components/projects/money/project-money.tsx |
| B3 Project insights bar (PickPill · HowCounted) + words | applied (Period pill, its count line as the pill's tooltip with `project-insights-scope` kept as `data-tip`, Export at the end; "By member"; the foot behind "How these are counted"; the ghost mirrors) | components/projects/insights/project-insights-view.tsx · project-insights-ghost.tsx |
| B3 portal `accessChip` · "Payments" section · "Max projects" | already done (B3) | — |
| B4 Materials' New filled | applied | components/company/templates/library-gallery.tsx |
| B4 Price book "Items · Sections" words in B4's files ("My Items" in ~30 strings) | **left for later** — one coherent words pass (quote editor menus and snackbars, the price book pages, 114 probe lines in 25 probes); a partial change would leave two names | — |
| B4 UNITS | skipped — stored words | — |

### The orchestrator's follow-ups

| Item | Status | Where |
|---|---|---|
| Clauses vs headings | applied (B4 fork A row above) | template-words.ts |
| The project brief's "This week" tag | applied (`tag: ''` — the AiBrief draws nothing for an empty tag) | lib/projects/briefs.ts |
| "Payments" view inside Client payments | applied — **"Collected"** (§2: money received → Collected); key `payments` kept; aria "Client payments view" | components/projects/money/billing-section.tsx |
| ⌘K "Answers to concerns" | applied ("objection answers" kept) | lib/global-search/model.ts |
| "Settings › Studio notifications" on Your profile | applied | components/profile/your-notifications.tsx · lib/notifications/personal.ts |
| "New quotes tab" → "Quote settings tab" | applied | company/templates/editors/{payment,text}-template-editor.tsx |
| (found on the way) View as's second lines lost their style | fixed — B5 removed `.help` from company-popover.module.css, which View as borrowed; the rule now lives in view-as-popover.module.css (`.helpLine`) | components/shell/view-as-popover.tsx · .module.css |

**Counts:** applied 75 · already done 47 · skipped 7 · left for later 4 (+ the B2/B5-file requests handed to Y).

## 2 · Probe lines restated

Every line marked. Grouped by file (line numbers approximate, after the edits).

- **B1/B3/B4/B6 lists:** pm2-s28 (⌘K Trace a floor-plan photo; project Floor plan ⋮ ×2; Files ⋮ ×4 + includes ×2 from Y) · rq-k1-pure · rc-c1-pure ×2 · rc-c4-pure · verify-rc-c4 (clauses) · qe-r5 ×2 · pm2-s41b3 ×2 (items) + lead form ×6 · pj-gap-b · pm2-s42b (VO items) · pj-gap-e (versions event) · pm2-s25 (crumb-only header) · pj-gap-c (bell → Review pane) · r2e (bell → Review pane, ⌘K Approvals) · pj-r1 (rail Projects plain; Collaborators|Members) · pm2-s46b (rail Issues count from its name; See all drawer) · pj-r5 (VO bar tooltip; Ask to approve; link row; roles drawer) · pm2-s44o (Ask to confirm; roles drawer; Try it) · dane-p5b (Ask to confirm) · cr-r3 ×4 · pm2-s19 · pm2-s42b ×6 (New quote; Send for signature + How signing works) · pm2-s21 (items) · ux-p7 ×2 · dash-d5 (With client chip; All leads) · folder-crumbs (Templates) · sw-r2 ×2 (Reminders; Rename… refused) · dane-p4 ×6 (Signatures; rename from ⋮; tooltip) · dash-d2 (Write) · pm2-s39 (AI uses) · verify-reports ×6 (pills, Project length, "—", 30 min, By member, ⋮ › Reports doors) · pj-gap-i ×2 · pm-c · pm2-s42c ×3 · pm2-s17 ×4 · sw-r4 ×2 (DefinitionList ⋮; Edit wording) · P2b (New field ×2; Contacts logged first ×2; roles drawer ×5) · pj-r6 / pm2-s07 (Collected ×5).
- **B2's list:** rwd-c1 ×5 · pj-gap-a ×4 · pm2-s41b4 ×2 · pm2-s42f ×7 · verify-overlays ×2 · P5a ×9 · P6 ×6 · P7 · kb-r1 · pm-e · pm-f · pm-h · folders-pickers ×2 · pj-gap-c · pj-r1 · pm2-s14 · P5a · pj-fix-E ×2 · KE ×2 · pm2-s46c (H2 rewritten on the listing's Not opened yet scope ×6; M3 on the one-home rule ×5; Settings line ×4) · verify-search · pm2-s46a ×2 · pj-gap-d · pm2-s42a · pm2-s42c · ghosts-film · r3 (Record a payment in ⋮).
- **B5's lists:** the roles drawer (`openRoles`) in pm-i · pb-r2 · pj-r7 · pj-fix-E · pm2-s01 · pm2-s14 · pm2-s06 · ks · P2b · KE · pj-r5 · pj-r6 · pm2-s44o; pm2-s08 · pm2-s14 ×3 · pm2-s06 ×2 · ks ×2 · rwd-w6 · pm-a ×4 · pm-i ×2 · pj-gap-f2 ×3 · pm2-s34 ×2 · st-r3 · pm2-s41b1 · first-run ×2 · pm2-s44r ×3.
- **Y §4:** s28 ×6 · s45c ×2 · viz-client ×2 · s02 · s42a ×3 · s37 · s42e ×2 · pj-gap-f2 · pj-gap-f1 ×2; and viz-studio (Designs).
- **W-058 sweep:** 24 lines in 15 probes (`/^Send (via|on) WhatsApp/`).
- **Stale rule:** pm2-s09 ×2 — Join lands on the Dashboard (`homeOfRole`, his Q-08), marked `…: restated to the rule already in force`.
- **Not restated:** pm2-s31:338 "switching wrote nothing to the demo" — not the same kind of staleness (a write into the demo's tables during a studio switch); listed for the orchestrator. pm2-s31:328 needed no restatement: its failure was the View as sub-line's lost class, fixed in the source.

## 3 · Checks

- `npx tsc --noEmit -p .` — clean.
- `npx eslint` on the 79 touched source files — 0 new errors (the three in quote-editor.tsx are HEAD's, line-shifted); warnings unchanged.
- `npm run design:lint` — nothing new; the baseline untouched.
- Guard vs `guard-before.json`: pages · server actions · handles · keys — **none gone** (142 new across all lanes).
- Every edited probe passes `node --check`; the three pure probes edited (rq-k1-pure 23/0 · rc-c1-pure 24/0 · rc-c4-pure 32/0) run green.

## 4 · ▲ For Vicky

1. **Bell approvals now land on the Dashboard pane in the probes too** (pj-gap-c, r2e restated to B1's one-home rule).
2. **pm2-s46c's H2 and M3 were rewritten** to the rules B1 set (no rail count for Leads, no approvals line on Tasks): the same counts are read from the listing's Not opened yet scope and the Dashboard.
3. **"Collected"** names Client payments' view of the money that came in (§2), where Finance's kind switch names the same list "Client payments" (W-310) — one list, two names a click apart; say if Finance's should read "Collected" too.
4. **"Send on WhatsApp"** everywhere now (W-058), including the house send dialog's default.
5. **The DefinitionList (Questionnaire, Custom fields) rows** carry one ⋮; the name opens Edit.
6. **The article's header is the crumb alone**; on a phone (crumbs never show there, REG-359) it is the Back arrow alone, the article's h1 right under it.
7. **Library galleries' grid view lost its "☐ Folders" head** — selecting every folder at once is the list view's Select all (each folder card keeps its own tick).
8. **Choices' card figure is the client's, GST in** ("+S$457.80 incl. GST"); the option dialog says both.
9. **Fixed on the way:** the picked-versions Maison AI answer's sentence never showed (it sat inside a comment); View as's second lines had lost their style when B5 removed the borrowed class.

## 5 · Left for later

- **B2:** `QuotesTabGhost` (components/leads/detail/tab-ghosts.tsx): no "All quotes" title and no toolbar create at a desk on Tools › Quotes (`studio`); the lead's tab button width. lib/leads/activity.ts: "ticket" → "issue", "escalated" → "flagged to the Owner", render(s) → version(s). components/meetings/lead-meetings.tsx: pass `primaryLook="outlined"` to the first-run EmptyState.
- **B4 (needs a visual pass):** ContractHeader editable title + the four library editors' meta rows (fork B 4-17/4-18); TextField `hideLabel` for table cells (4-17); the Price book's Items · Sections words in B4's files ("My Items", ~30 strings, 114 probe lines).
- **B2:** the lead's Questionnaire tab passes no `setUpHref` (app/leads/[id]/[tab]/page.tsx) — the project's now does.
- **Orchestrator:** pm2-s31:338 (a write into the demo's tables during a studio switch — not a words staleness).
