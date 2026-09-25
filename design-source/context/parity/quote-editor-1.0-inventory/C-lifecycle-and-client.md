# OpenMaison 1.0 — Quote editor inventory · Slice C: a quote's life and the client's side

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader or audit, and only named here. Readers of this audit: **A** = editor surface and lines, **B** = money and the price book, **D** = data model (this folder); "templates A-nn … D-nn" = `../quote-templates-1.0-inventory/`; "Leads C-nn" = `../leads-1.0-inventory/C-engine-settings-touchpoints.md`. `QDD` = `src/components/leads/quote-digitizer-dialog.tsx`; `LDD` = `src/components/leads/lead-detail-drawer.tsx`; `CFD` = `src/components/leads/contract-flow-dialog.tsx`; `SIGN` = `src/app/sign/[token]/page.tsx`. Emoji glyphs in UI strings are omitted from quotes.

## Vocabulary (where each word is defined)

- **Quote** — a `quotes` row: a container that owns `quote_line_items`; `quote_type` ∈ `standard | variation | ai_generated` (`src/lib/queries/quotes.ts:1-15`; D-01). Lead-stage quotes carry `lead_id`; variation orders carry `project_id`.
- **Status** — `quotes.status`, Postgres enum `quote_status`: `draft · sent · accepted · rejected · expired` (`scripts/migrations/001_enums.sql:64`) plus `submitted · approved · sent_for_signature · client_signed` (`102_quote_status_enum_extend.sql:20-23`). Code writes only `draft · submitted · approved · rejected · sent_for_signature · client_signed` (`src/lib/quote-status.ts:7-13`).
- **Lead mirror** — `leads.quote_status` (TEXT), kept equal to the primary quote's status by triggers (C-10; D-08).
- **Transition** — `POST /api/quotes/[id]/transition` with an action `submit · approve · reject · revise` (C-02). Most status changes do not use it (C-04).
- **Approver** — an owner (always) or a member listed in `studios.settings.workflow.approvers.quoteApproval` (`resolveQuoteSubmitDecision`, `src/lib/access-control.ts:441-505`; C-03).
- **Approval rule** — the only rule that gates is the workflow toggle `quoteApprovalRequired` (C-17). Accounts › *Quote Approval Rules* thresholds are stored and never read (C-29; D-07).
- **QuoteApproval task** — a `tasks` row, `type: "QuoteApproval"`, `approval_status: "pending"`, `related_entity_id` = the quote id (C-20).
- **Version** — a `quote_versions` row: a numbered snapshot per **lead** (not per quote) of lines, milestones, totals, status, hierarchy and quote metadata (C-32; D-03).
- **Primary quote** — the single `is_primary = true` quote of a lead (partial unique index `quotes_one_primary_per_lead`, `105_quote_single_primary_per_lead.sql:28-30`; C-43).
- **Contract quote** — `resolveContractQuoteId` (`src/lib/leads/resolve-contract-quote.ts:52-72`): the latest signed standard quote, else the primary, else the first (C-52).
- **Signature request** — a `quote_signature_requests` row (`042_quote_signature_requests.sql`): token, frozen line snapshot, total, schedule and documents; status `pending · viewed · signed · expired · cancelled` (C-64; D-06).
- **Signing mode** — `single · bundle · variations` (`161_quote_signature_multi_quote.sql`): bundle = several quotes signed as one; variations = the client picks one (C-71).
- **Signing document** — one `SigningDocument` in `quote_signature_requests.documents` (`quote` · `tnc` · `contract` · `document`), each with a content hash (C-72; Contracts audit).
- **Client selections** — `quote_signature_requests.client_selections` `{ selectedPackageId?, optionalItemsAccepted[] }` (`supabase/migrations/20260414000005_quote_packages.sql:20-22`); nothing writes it (C-77; D-04).
- **Milestone** — `QuotePaymentMilestone` `{ id, name, type?: "fixed" | "percent", percent, amountCents?, trigger?, notes? }` (`src/types/app.ts:950-962`) in `quotes.payment_schedule` (C-94).
- **Payment schedule template** — a `payment_schedule_templates` row `{ name, stages[{ name, percent, trigger }], is_default }` (`061_finance_commission_journal_tables.sql:87-96`; C-101).
- **Canonical PDF** — the stored `shared-quotes/{studioId}/{quoteId}.pdf` (templates B-82).
- **Deal won** — the drawer's flag (journey Signed step done, `client_signed`, or a signed request) that suppresses quote actions (C-12, C-13).

---

## Statuses and transitions

### C-01 · The status vocabulary and its labels
- Where: `scripts/migrations/001_enums.sql:64`; `102_quote_status_enum_extend.sql:1-23`; `src/lib/quote-status.ts:7-49`; `src/components/leads/drawer-sections/multi-quote-section.tsx:37-52`; `src/components/leads/drawer-sections/quote-section.tsx:38-162`; `src/components/finance/quotes-table.tsx:33-95`; `src/components/leads/quote-version-drawer.tsx:26-43`.
- Entry: every status badge.
- Does: six statuses are live; new quotes insert as `draft`. Legacy lead-level data also uses `none` (mapped to `draft` by triggers, C-10).
- Rules: `sent`, `accepted`, `expired` are enum values nothing writes (*"they're just unused"*, migration 102). There is no `cancelled`, `archived` or `void` quote status, although `/api/quote-preview/<token>` refuses `rejected · cancelled · archived` (templates B-93) and the finance list colours and sorts a `void` status. Three label tables disagree for the same status (below). The version drawer prints the raw value with `_` → space.
- Data: `quotes.status` (D-01); `leads.quote_status` (D-08).
- States: —
- Words: `quote-status.ts` — *"Draft"*, *"Awaiting Review"*, *"Approved"*, *"Rejected"*, *"Awaiting Signature"*, *"Client Signed"*. Drawer quote list — *"Draft"*, *"Awaiting Approval"*, *"Approved"*, *"Rejected"*, *"Sent for Signature"* (sub-states *"Pending"*, *"Viewed"*), *"Signed"*. Legacy card — *"Draft"*, *"Awaiting Approval"*, *"Quote Approved"*, *"Quote Rejected"*, *"Awaiting Client Signature"*, *"Client Signed"*. Finance list pills — *"All"*, *"Signed"*, *"Approved"* (approved + sent_for_signature), *"Pending"* (submitted), *"Drafts"*.
- Reachable: yes.

### C-02 · The transition route — the server state machine
- Where: `src/app/api/quotes/[id]/transition/route.ts:36-84` (`lookupRule`), `86-454`; hook `src/lib/queries/quotes.ts:134-169` (`useQuoteTransition`); test `src/__tests__/quote-transition-endpoint.test.ts`.
- Entry: `POST /api/quotes/<id>/transition { action, comment? }` — callers in C-04.
- Does: (1) session cookie → 401; (2) `action` must be one of the four; `comment` trimmed, cut to 4,000 characters, required for `reject`; (3) loads the quote scoped to the session studio; (4) merges `DEFAULT_WORKFLOW` + `settings.workflow` + the member's `workflow_overrides`, computes the submit decision (C-03); (5) looks up the rule; (6) approver-only rules refuse non-approvers — except that for `quote_type = variation` an admin or owner tag also passes; (7) `submit` takes its target from the decision, other rules from the table; target = current → returns `noop: true`, no write; (8) `revise` of a variation whose `variation_orders.invoice_id` is set → 409; (9) writes `status` (+ `submitted_by` only when `submit` lands on `submitted`; `prepared_by_signature = null` when the target is `draft` or `rejected`); (10) side effects (C-07, C-16); (11) inserts a `quote_status_history` row (C-05).
- Rules: rule table — `submit` from `draft · rejected · none` (or null) → decision (`submitted` or `approved`); `approve` from `submitted` **or `draft`** → `approved`, approver only; `reject` from `submitted` → `rejected`, approver only, comment required; `revise` from `approved · rejected · sent_for_signature` → `draft`, **no approver gate**. Every other pair → 409 `INVALID_TRANSITION`. `client_signed` has no exit. Revise never cancels an open signing request.
- Data: `quotes.status`, `submitted_by`, `prepared_by_signature`; `quote_status_history`; storage bucket `shared-quotes`; `leads.quote_metadata.portalSharedQuotes`; `variation_orders`.
- States: response `{ quote: { id, status }, history: { id } | null, decision, noop, warnings? }`.
- Words: *"Not authenticated"*, *"Invalid session"*, *"action is required"*, *"Unknown action '<a>'"*, *"comment is required when rejecting"*, *"Failed to load quote"*, *"Quote not found"*, *"Not a studio member"*, *"Action '<a>' is not allowed from current status '<s>'"*, *"You don't have permission to approve or reject this quote"* (`NOT_APPROVER`), *"This variation order has been billed. Cancel its invoice before revising."* (`VO_BILLED`), *"Failed to update quote status"*, *"Internal server error"*; warning *"The VO's finance record could not be reverted automatically — its amount may still show in the contract value. Re-approve or contact support."*
- Reachable: yes — from Revise and the VO surfaces only (C-04).

### C-03 · The submit decision — `resolveQuoteSubmitDecision`
- Where: `src/lib/access-control.ts:396-517`; test `src/__tests__/quote-status-state-machine.test.ts`.
- Entry: drawer submit (C-19), the standalone page (C-27), the transition route (C-02).
- Does: returns `{ nextStatus, createTask, isApprover, approverUserIds }`. `requireApproval` = the workflow's `quoteApprovalRequired !== false`, or **true** when the workflow is null. `isApprover` = owner tag → true; else, when `approvers.quoteApproval` is non-empty, the user id is in it; else false. Approval off → `approved`, no task. Approval on and approver → `approved`, no task (one-click self-approve, "Policy (updated 2026-05-20)"). Otherwise → `submitted` + a task.
- Rules: an admin is not an approver unless listed; an owner is an approver even when a list exists without them; `canApproveQuote` returns the same `isApprover`. The finance quotes table re-implements the rule with a different fallback (C-28).
- Data: `studios.settings.workflow`, `studio_members.workflow_overrides` (D-07).
- States: —
- Words: —
- Reachable: yes.

### C-04 · Where status changes are actually written
- Where: `LDD:2937-3236` (submit / approve / reject), `3336-3358` (after a link is created), `3445-3478` (revise); `src/app/api/quotes/records/[id]/route.ts:20-199` (PATCH); `src/app/api/tasks/records/[id]/approve/route.ts`, `.../reject/route.ts`; `src/app/api/quotes/request-signature/route.ts`; `cancel-signature/route.ts`; RPC `finalize_signed_mirror` (`307_finance_contract_freeze.sql:54-143`); `src/app/(main)/tools/quote-digitizer/page.tsx:145-326`; `src/components/finance/quotes-table.tsx:540-640`; `src/components/finance/vo-editor/vo-editor-host.tsx:320-440`.
- Entry: —
- Does: path per move — drawer submit, direct approve and direct reject → `PATCH /api/quotes/records/<id>` (`useUpdateQuote`) plus a lead-mirror write; task approve / reject → the task routes (C-24); revise → the transition route; send → `request-signature` (+ a drawer PATCH, C-70); cancel → `cancel-signature`; signature → `finalize_signed_mirror`; standalone page and finance list (standard quotes) → PATCH; VO approve / reject → transition.
- Rules: PATCH applies no state machine to standard quotes — any status value is accepted; for variations it refuses a move into or out of `approved · client_signed · sent_for_signature` (400 `USE_TRANSITION_ROUTE`). PATCH stamps `submitted_by` on `submitted`, clears `prepared_by_signature` on `draft · rejected`, bakes the designer signature on `submitted · approved` and drops the portal share on `draft · submitted · rejected` (C-07). `useUpdateQuote` logs a deprecation warning on every status write; the drawer still uses it for submit / approve / reject. Consequence: `quote_status_history` records only revise and VO moves (C-05; D-05).
- Data: as above.
- States: —
- Words: *"A variation order's approval, rejection and signature moves go through their own routes (transition, sign, request-signature); use those."*; *"Totals of a <status> quote are frozen — revise it first"* (`QUOTE_TOTAL_FROZEN`, C-06).
- Reachable: yes.

### C-05 · `quote_status_history` — a write-only log
- Where: `scripts/migrations/157_quote_status_history.sql`; writer `transition/route.ts:419-441`; restore RPC `243_restore_quote_version_payment_schedule.sql:121-128`.
- Entry: —
- Does: one row per transition-route move `{ quote_id, studio_id, from_status, to_status, action, actor_user_id, comment, created_at }`; cascades with the quote.
- Rules: no reader anywhere in `src/` (grep): no screen shows who submitted, approved, rejected or revised a quote, or why. An insert failure is logged, never fails the move. The version-restore RPC inserts columns this table does not have (C-39).
- Data: D-05.
- States: —
- Words: —
- Reachable: written; never displayed.

### C-06 · What each status locks
- Where: `QDD:2251-2266` (`isReadOnly`, `isPaymentScheduleReadOnly`); `src/app/api/quotes/line-items/route.ts:337-365`; `records/[id]/route.ts:90-98` (PATCH totals), `225-255` (DELETE); `src/app/api/leads/[id]/quote-line-items/[itemId]/comments/route.ts:115-144`; `src/lib/quote-editor/close-confirm.ts:33-67`; UI detail A-23, A-24.
- Entry: automatic.
- Does / Rules, per status:
  - `draft`, `rejected` — editable everywhere.
  - `submitted` — editor read-only (UI; the editor's trash is hidden); the server still accepts line saves and comments; the drawer list's Delete and the legacy card's Discard still work.
  - `approved` — read-only; line saves 409 `QUOTE_LOCKED`; comments 409; delete 409 `QUOTE_APPROVED`; editor discard refused; totals still writable through PATCH.
  - `sent_for_signature` — read-only; line saves 409; totals frozen; delete 409 `QUOTE_APPROVED`; comments accepted by the server.
  - `client_signed` — read-only; line saves 409 with the variation-order hint; totals frozen; delete refused while a signed request points at it (`SIGNATURE_EXISTS`, C-48).
  - At every status PATCH still accepts `label`, `notes`, `docSections`, `paymentSchedule`, `parsedDocMetadata`, `refNumberOverride` and `status` — the locks on those are UI only (C-99).
- Data: `quotes.status`.
- States: —
- Words: *"Cannot edit a quote that is <status> — revise it first"*; for signed *"Cannot edit a quote that is client_signed — it is signed — raise a variation order for changes"*; *"Cannot comment on an approved quote"*; *"Locked — quote <status>. Revise the quote to reopen for edits."*; *"This quote is locked. Revise the quote first to make edits."*; *"This quote is approved and locked. Revise it to make changes — it can't be discarded from here."*
- Reachable: yes.

### C-07 · Side effects of finalizing and un-finalizing, by path
- Where: `transition/route.ts:245-326`; `records/[id]/route.ts:106-192`; `tasks/records/[id]/approve/route.ts:111-118`; `.../reject/route.ts:38-80`; `request-signature/route.ts:876-892`; `QDD:9500-9506, 10507-10534` (`freezeCanonicalQuotePdf`).
- Entry: status moves.
- Does: entering `submitted` / `approved` bakes the author's signature into the canonical PDF (templates B-85) on the transition route, PATCH and the task-approve route; the editor also re-uploads its own render after submit and approve (templates B-82). Leaving to `draft` / `rejected`:
  - transition route — clears `prepared_by_signature`, **deletes** the canonical object, drops `portalSharedQuotes[quote]`;
  - PATCH — clears `prepared_by_signature`, drops the portal share (also on `submitted`), leaves the canonical object;
  - task-reject route — changes status and `rejection_comment` only: signature, canonical object and portal share stay.
- Rules: the invalidation a studio gets depends on which surface moved the status. Request-signature bakes for non-VO quotes that skipped finalize (approval-off flows).
- Data: `quotes.prepared_by_signature`; storage `shared-quotes`; `leads.quote_metadata.portalSharedQuotes`.
- States: all best-effort (logged, never fail the move).
- Words: —
- Reachable: yes.

### C-08 · Revise — reopen an approved quote
- Where: `LDD:1939-1961` (target), `3424-3478` (confirm + call); `multi-quote-section.tsx:408-438`; `quote-section.tsx:76-91`.
- Entry: *"Revise"* on the **primary** approved quote's card in the drawer list (hidden once the deal is won); *"Revise"* on the legacy card.
- Does: resolves the target (the clicked id → the drawer's active quote → the contract quote → primary → first), asks to confirm, calls the transition `revise`, sets the local status to `draft`, shows any warnings.
- Rules: no approver gate — any member can reopen an approved quote. The server also allows revise from `rejected` and `sent_for_signature`, but no UI offers it there: a sent quote must first be cancelled back to `approved` (C-90), and a non-primary approved quote must first be made primary. Revise keeps the same row and number, cuts no version and does not cancel an open signing link (the confirm says so).
- Data: C-02.
- States: —
- Words: confirm *"Reopen this quote for editing?"* — *"It will move back to draft. Any signing link you've already sent will keep showing the previously approved version — you'll need to re-approve and re-send to push your edits to the client."* — *"Reopen for editing"*; toasts *"This lead has no quote to reopen"*, *"No quote selected to reopen — refresh and try again"*, *"Quote reopened for editing"*, *"Failed to reopen quote for editing"*.
- Reachable: yes.

### C-09 · Status moves driven by sending and signing
- Where: `request-signature/route.ts:764-826`; `LDD:3336-3358`; `cancel-signature/route.ts:91-118`; `src/app/api/sign/[token]/submit/route.ts:344-518`; `307_finance_contract_freeze.sql:54-143`.
- Entry: C-67, C-90, C-82.
- Does: send — the quotes in the request → `sent_for_signature`; any other quote of the lead still at `sent_for_signature` → `approved`; the lead mirror → `sent_for_signature` with `signature_request_id`. Cancel — the request's quotes at `sent_for_signature` → `approved`; the lead mirror at `sent_for_signature` → `approved`, `signature_request_id` → null. Sign — the marked quotes → `client_signed` (+ `signed_at` once); for a base (non-variation) signing, every other `client_signed` standard quote of the lead → `approved`, and the lead → `client_signed` + SIGNED stage (Leads C-26).
- Rules: none of these write `quote_status_history`. The sequential fallback in the submit route runs only when the RPC errors (C-84).
- Data: D-06.
- States: —
- Words: —
- Reachable: yes.

### C-10 · The lead mirror — triggers 158 / 304 and the reverse trigger of 103
- Where: `scripts/migrations/103_quote_lifecycle_hardening.sql:140-205`; `158_quote_status_sync_trigger.sql`; `304_quote_status_mirror_clears_on_last_delete.sql`; `docs/rules/leads.md:369-383`; tests `quote-status-sync-trigger.test.ts`, `quote-status-sync-trigger-v2.test.ts`.
- Entry: every write to `quotes` or `leads.quote_status`.
- Does: `trg_sync_lead_quote_status_iud` (158, v2 in 304) — after insert, delete, or update of `status` / `is_primary` / `lead_id` on `quotes`, sets `leads.quote_status` to the primary quote's status; when the last primary is deleted it sets NULL (v2). Migration 103 also installed `trg_sync_lead_to_primary_quote` (after update of `leads.quote_status` → the primary quote's status, `none` → `draft`), `trg_sync_primary_quote_to_lead` and `trg_sync_on_primary_flag_change`; no later migration drops them.
- Rules: where 103's reverse trigger is live, every direct write of `leads.quote_status` (drawer mirrors, the standalone page's `draft` writes, `request-signature`, `cancel-signature`, the signing RPC) also rewrites the primary quote's status — the column is not purely a mirror (see Uncertain). A non-primary quote's status never reaches the lead.
- Data: D-08.
- States: —
- Words: —
- Reachable: yes (DB).

### C-11 · Mirror hygiene rules from the 2026-09-10 incident
- Where: `docs/rules/leads.md:369-383`; `src/app/api/leads/mutations/[id]/route.ts:266-300`; `QDD:4783-4796`; `LDD:3128-3236`; `tools/quote-digitizer/page.tsx:145-197`; `request-signature/route.ts:154-187, 320-338`; `CFD:576-627`; test `src/__tests__/quote-approve-without-quote-row.test.ts`.
- Entry: —
- Does: (1) a lead PATCH that moves `quote_status` to `approved · sent_for_signature · client_signed` on a lead with no `quotes` row → 409 `NO_QUOTE_ROW`; `draft`, `rejected` and null stay free. (2) Finalized quotes close silently and cannot be discarded from the editor. (3) Drawer approve / reject resolve or mint a quote first. (4) The standalone page never mints and hard-fails without a primary quote. (5) The editor's discard tells the drawer to drop its active quote id. (6) The signing dialog gates on real quote rows only. (7) `request-signature` validates every requested id and refuses a lead with no quote and no lines.
- Rules: the lead mirror is never to be written ahead of a quote row.
- Data: —
- States: —
- Words: *"This lead has no quote yet — save the quote before approving or sending it."*; *"Couldn't approve — no quote selected. Open the lead drawer to manage quotes."*; *"Couldn't reject — no quote selected. Open the lead drawer to manage quotes."*; *"Couldn't submit — no quote selected. Open the lead drawer to manage quotes."*
- Reachable: yes.

### C-12 · Statuses on the drawer's quote list
- Where: `multi-quote-section.tsx:136-152, 286-395, 518-531`.
- Entry: lead drawer › Quotes (Classic) or *"Manage quote(s)"* (Journey, C-13).
- Does: each standard quote shows its badge; `sent_for_signature` becomes *"Pending"* or *"Viewed"* from the lead's latest request when that request is `pending` / `viewed` and covers the quote; a `sent_for_signature` quote not in that request is shown as *"Approved"* ("stranded"); rejected quotes show the per-quote *"Rejection reason"*; an in-flight quote shows its signing URL with copy and *"Manage →"*; a signed primary quote shows the signature certificate (C-86).
- Rules: Revise and Send for Signature appear only on the primary approved quote and only while the deal is not won; the button is *"Edit"* for `draft` and *"View"* for every other status, including `rejected` (which is editable).
- Data: `quotes`, latest `quote_signature_requests` row.
- States: loading → skeleton.
- Words: *"Rejection reason"*, *"Manage →"* (title *"Manage signing — resend, regenerate, or cancel"*), title *"Copy signing link"*, toasts *"Link copied"*, *"Couldn't copy"*, *"Edit"*, *"View"*, *"Revise"*, *"Send for Signature"*.
- Reachable: yes.

### C-13 · The quote summary card (Journey "Deal" zone)
- Where: `src/components/leads/drawer-sections/quote-summary-card.tsx:53-248`; mount `LDD:2170-2192`.
- Entry: lead drawer in Journey mode.
- Does: shows the primary (or first) quote's badge, final total with a breakdown popover (hand-off B), number, *"· <n> options"*, and **one** action: a linked project → *"Go to Project"*; won → *"Create project"* (or *"View quote"*); else by status — draft *"Continue editing"*, submitted *"Review"* for approvers (others see the chip *"Awaiting approval"*), approved *"Send for signature"*, rejected *"Revise quote"* (opens the editor; no transition), sent_for_signature *"Manage signing"*, client_signed *"View signed quote"*. Secondary *"Open"* opens the editor; for finalized statuses it is *"View"* and opens the stored PDF in a new tab (`/api/leads/<lead>/quote/download?source=signed:<request>|draft:<quote>&view=1`, templates B-81). A signing row (*"Signed"* / *"Viewed"* / *"Awaiting signature"*, *"· sent <date>"*, *"Manage"*) and a contract row (*"On file"* / *"Signed quote"* / *"Not uploaded"*) follow; *"Manage quote"* / *"Manage quotes (<n>)"* expands the list (C-44).
- Rules: won = the drawer's deal-won flag or the primary quote `client_signed`; a signed request on another quote does not count. No quote → the list's create control.
- Data: `quotes`; latest request.
- States: loading skeleton.
- Words: as above; *"Quote"*, *"Signing"*, *"Contract"*.
- Reachable: yes (Journey mode, the default — Leads C-58).

### C-14 · The legacy lead-level quote card
- Where: `multi-quote-section.tsx:203-249`; `quote-section.tsx:31-168`; `LDD:1966-2034`.
- Entry: the drawer's quote area when the lead has **no** standard `quotes` row.
- Does: renders by `leads.quote_status`: client_signed *"Client Signed"* + *"View Quote"* + certificate; sent_for_signature *"Awaiting Client Signature"* + *"Resend Link"* + *"Signing link sent — waiting for client to sign."* + *"Manage →"*; approved *"Quote Approved"* + *"View Quote"* + *"Revise"*; submitted *"Awaiting Approval"* + *"View Quote"* + *"Discard"* + Approve / Reject when a pending task exists (C-26); rejected *"Quote Rejected"* + *"Revise Quote"* + reason; draft *"Draft"* + *"Edit Quote"* + *"Discard"*; otherwise *"Create Quote"*. Header *"New Quote"* creates a primary quote labelled *"Quote"*.
- Rules: after migration 304 a zero-row lead's mirror is NULL, so this card normally shows *"Create Quote"*; the other branches serve legacy data only.
- Data: `leads.quote_status`, `leads.quote_data.rejectionComment`.
- States: —
- Words: as above; title *"Create a new quote for this lead"*; toast *"Quote created"*.
- Reachable: yes (zero-quote leads).

### C-15 · Status banners inside the editor
- Where: `QDD:6941-7035, 7153-7162`; UI detail A-23.
- Entry: opening a quote.
- Does: submitted — *"Awaiting your approval"* (when the host passes an approve handler) or *"Awaiting owner approval"*, *" — review the line items and decide."*, with Reject / Approve for approvers (C-21); approved — *"Approved — read-only. Future edits create a new version."*; sent_for_signature — *"Out for signature — read-only until the client responds. Revise the quote to edit it."*; client_signed — *"Signed by the client — read-only. Raise a variation order for changes."*; rejected — *"Quote Rejected"* + the comment.
- Rules: approving does not create a new version and revise keeps the same row, so *"Future edits create a new version"* describes nothing the code does (C-126). A sent quote cannot be revised from any UI without cancelling first (C-08).
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### C-16 · Variation orders — lifecycle differences (touchpoint)
- Where: `transition/route.ts:165-172, 215-234, 328-417`; `records/[id]/route.ts:66-98, 225-270`; `vo-editor-host.tsx:84-90, 320-440`; `quotes-table.tsx:430-640`; `sign/[token]/submit/route.ts:522-557`; UI A-25, A-26.
- Entry: Projects › variation orders; Finance › Operations › Contracts › VOs.
- Does: numbered `VO-###`; left out of the drawer's quote list; approve / reject by owner or admin whatever the workflow toggle (a designer's submit sets `submitted` and routes a QuoteApproval task to an owner/admin); approve bridges into `variation_orders` as `approved` and rebalances unsent milestone invoices and re-renders the canonical PDF; revise un-bridges and rebalances; a billed VO cannot be revised; an approved or signed VO cannot be deleted; PATCH refuses contract-moving status writes; signing a VO bridges `approved` and rebalances.
- Rules: no UI caller of `revise` for a VO was found although the VO list says *"Revise this VO before deleting it"*. Money and billing are hand-off Finance.
- Data: `quotes.quote_type = 'variation'`, `variation_orders`.
- States: —
- Words: *"Approved variation orders can't be deleted — revise first."*, *"VO_APPROVED: Revise this variation order before deleting it."*
- Reachable: yes.

---

## Approval

### C-17 · The workflow toggle, the approver list and the member override
- Where: `src/app/(main)/accounts/page.tsx:1610-1705` (Workflow Rules); `src/components/accounts/workflow-approver-selector.tsx:9-80`; `src/app/api/studio-config/workflow/route.ts:16-100`; `src/lib/queries/studio-config.ts:68-82, 776-789`; `src/components/accounts/member-override-panel.tsx:24-32`; `src/app/studio-setup/page.tsx:244, 666`. The toggle list is Leads C-46.
- Entry: Accounts › Workflow › *Workflow Rules* (no role gate); Team Members › per-member overrides (Leads C-56); Studio Setup.
- Does: `quoteApprovalRequired` (default ON, also when `settings.workflow` is absent). While ON, a picker writes `settings.workflow.approvers.quoteApproval` (user ids); owners are always shown ticked and cannot be un-ticked. A member override can flip the toggle for one person (`resolveEffectiveWorkflow`: member keys win, approver maps merge).
- Rules: the PUT merges the approver map and has no role gate (CSV row 31). OFF → every submit lands on `approved` with no task; the list still decides who may approve an already-submitted quote. The same toggle drives the "Quote approved" readiness item (C-55) and the Classic stage gate (Leads C-03).
- Data: `studios.settings.workflow`, `studio_members.workflow_overrides` (D-07).
- States: toggles disabled while saving.
- Words: *"Workflow Rules"* — *"Control which actions require approval in your studio."*; *"Quote approval required"* — *"Require owner sign-off before quotes are sent to clients"*; picker *"Approvers (owners are always included; add extra members to route this approval to)"*, *"All owners (default)"* / *"<n> approver(s)"*; toasts *"Quote approval required enabled"* / *"Quote approval required disabled"*, *"Could not change "Quote approval required""*, *"Quote approval required approvers saved"*; Studio Setup — *"Your designers' quotes need your sign-off before clients receive them"*.
- Reachable: yes.

### C-18 · Who counts as an approver — the gates disagree
- Where: `src/lib/access-control.ts:441-517`; `src/context/app-context.tsx:273-302` (`canApproveTaskWithWorkflow`); `transition/route.ts:163-199`; `src/app/(main)/tasks/page.tsx:599-603`; `quotes-table.tsx:420-445`; `vo-editor-host.tsx:84-90`.
- Entry: every approve / reject control.
- Does: (1) editor and drawer — owner, or listed (C-03); (2) task approve / reject in the app context — owner, or listed; an empty list means owners only; approval types without a list fall back to admin; (3) transition route — the same as (1), plus owner/admin for variations; (4) Tasks page — non-owners never see approval-type tasks; (5) finance list — approval off → everyone; a non-empty list → listed members only (an owner missing from the list is not an approver there); no list → owners (VOs: owner/admin); (6) the task routes on the server — no check.
- Rules: a listed non-owner approver can approve from the editor and drawer but cannot find the QuoteApproval task on the Tasks page (CSV row 27). An admin not in the list is not an approver of standard quotes.
- Data: D-07.
- States: —
- Words: —
- Reachable: yes.

### C-19 · Submit for review from the lead drawer
- Where: `LDD:2937-3122`; footer `QDD:9480-9516`; approve confirm `QDD:10492-10538`; footer UI A-27.
- Entry: editor footer *"Submit for Review"* (non-approver) or *"Approve"* with a confirm (approver).
- Does: (1) the milestone gate (C-97) and an in-flight guard; (2) resolve or mint the quote (`ensureActiveQuoteId`, C-42); (3) refuse a quote at `sent_for_signature` / `client_signed` (per-quote status, else the lead mirror for a primary); (4) save the lines; (5) mirror the lead — `quote_status` only when the quote is primary or the lead's first, `quote_data` when the parsed document changed; (6) PATCH the quote to the decision's status; (7) no task → toast; task → cancel pending QuoteApproval tasks for this quote, cancel the lead's open *"Revise rejected quote"* tasks, create the task (C-20), roll the status back if that fails; a non-approver's editor closes; (8) the editor re-uploads its render as the canonical PDF.
- Rules: the toast label is the quote number, else the label, else *"Quote"*. Submit is disabled with no lines, an invalid schedule, or a submit in flight.
- Data: C-04.
- States: *"Submitting…"*.
- Words: *"Couldn't submit — quote create failed. Try again or refresh."*; *"This quote has already been sent for signature or signed — it can't be re-submitted. Revise it to create a new version."*; *"<label> approved"*; *"<label> submitted for review"*; *"Couldn't create the approval task — submission was rolled back. Please try again."*; *"Failed to submit quote: <message>"*; editor *"Submit failed — try again or contact support."*
- Reachable: yes.

### C-20 · The QuoteApproval task
- Where: `LDD:3026-3090`; `src/lib/queries/tasks.ts:37-122`; `src/app/api/tasks/records/cancel-quote-approvals/route.ts:15-43`; `src/app/api/tasks/route.ts:165-250`.
- Entry: C-19, C-27, C-16.
- Does: creates `{ title: "Approve <label> for <lead>[ — submitted by <name>]", type: "QuoteApproval", assigneeUserId, plannedDate: <today>, leadId, approvalStatus: "pending", relatedEntityId: <quote id> }` through `POST /api/tasks`, which dispatches `task.assigned` to the assignee (C-107). Assignee: the first listed approver who is a studio member → the first owner → the submitter.
- Rules: exactly one approver gets the task; other listed approvers get nothing. Before creating, one UPDATE cancels the lead's pending QuoteApproval tasks with the same `related_entity_id` (`status: "Cancelled"`, `approval_status: "cancelled"`). Older tasks carry the lead id in `related_entity_id` (C-24 falls back to "first submitted quote"). A due reminder (`task.due_reminder`) is scheduled only when the task is created before 08:30 — 09:00 minus 30 minutes, server time — of that day. Deleting a submitted quote from the list or discarding it in the editor leaves its task pending (C-47, C-49).
- Data: `tasks.type`, `approval_status`, `related_entity_id`.
- States: —
- Words: task title as above; type label *"Quote Approval"*.
- Reachable: yes.

### C-21 · Approve and reject inside the editor
- Where: `QDD:6941-7010` (banner), `9344-9408` (footer), `10492-10538` (confirm).
- Entry: a `submitted` quote opened by an approver — the drawer passes the approve / reject handlers only to approvers (C-22); the finance list passes them to everyone (C-28).
- Does: *"Approve"* → confirm → the milestone gate → the host's approve → re-upload the canonical PDF. *"Reject"* → an inline reason field (Enter or *"Reject"*; *"Cancel"* / Esc clears) → the host's reject. The same pair renders in the banner and in the footer.
- Rules: the reason is free text; the configured rejection reasons (C-29) are never offered. An empty reason cannot be sent.
- Data: —
- States: buttons disabled while a review action runs.
- Words: confirm *"Approve this quote?"* — *"Once approved the quote becomes read-only. Future edits will need to be made on a new version."* — *"Approve"*; *"Rejection reason…"*, *"Reject"*, *"Cancel"*; *"Approve failed — try again or contact support."*
- Reachable: yes.

### C-22 · Approve and reject handlers in the drawer
- Where: `LDD:3128-3236`.
- Entry: C-21 from the drawer.
- Does: approve — finds the pending QuoteApproval task of the viewed quote (`related_entity_id` = the active quote id; any pending task of the lead when there is no active id) → the app-context approve (C-23); none → resolve or mint the quote, PATCH `approved`, mirror the lead when primary or first. Reject — same targeting → the app-context reject; none → PATCH `rejected` + `rejectionComment`, mirror the lead with `quote_data.rejectionComment`; closes the editor.
- Rules: handlers exist only when the actor is an approver (C-03). A direct approve on a draft (no task) skips `submitted` entirely.
- Data: C-04.
- States: —
- Words: *"Quote approved"*, *"Couldn't approve — quote create failed. Try again or refresh."*, *"Quote rejected"*, *"Couldn't reject — quote create failed. Try again or refresh."*
- Reachable: yes.

### C-23 · Approving from the Tasks page
- Where: `src/app/(main)/tasks/page.tsx:38, 216, 300-312, 450-480, 599-603`; `src/context/app-context.tsx:304-330, 525-570`.
- Entry: Tasks — owners only in practice (the list strips approval-type tasks for everyone else).
- Does: a pending approval row offers *"Review Quote"* (→ `/leads?openLead=<lead>&openQuote=true[&quoteId=<quote>]`), *"Approve"* and *"Reject"* (inline comment). Approve → gate (C-18) → `POST /api/tasks/records/<id>/approve { leadId, relatedEntityId, quoteStatusUpdate: "approved" }`. Reject → `POST .../reject { comment, leadId, relatedEntityId, quoteStatusUpdate: "rejected", quoteData: { …rejectionComment } }`, then the revision task (C-25).
- Rules: a gate refusal only logs to the console. The status filter "approvals" and a pending-approval count exist.
- Data: C-24.
- States: —
- Words: *"Quote Approval"*, *"Review Quote"*, *"Approve"*, *"Reject"*.
- Reachable: yes (owners).

### C-24 · The task approve and reject routes
- Where: `src/app/api/tasks/records/[id]/approve/route.ts:27-148`; `.../reject/route.ts:26-87`.
- Entry: C-23, C-22, C-26.
- Does: marks the task `Completed` with `approval_status` and `approval_comment`; when `leadId` and `quoteStatusUpdate` are sent, resolves the quote — strictly by `related_entity_id` on this lead, else (legacy) the lead's first `submitted` quote — writes `quotes.status` (+ `rejection_comment`), mirrors the lead when that quote is primary (+ `quote_data` on reject); approve also bakes the designer signature and bridges a variation.
- Rules: session only — no server check that the caller is an approver (CSV row 51), and no check of the quote's current status. When no quote resolves the task is still decided and the quote untouched (logged).
- Data: `tasks`, `quotes`, `leads`.
- States: 500 with the DB message.
- Words: —
- Reachable: yes.

### C-25 · Rejection — the stored reason, the revision task, what the designer sees
- Where: `app-context.tsx:525-565`; `multi-quote-section.tsx:383-395`; `QDD:7153-7162`; `quote-section.tsx:133-145`; `tasks/page.tsx:305-312`; `LDD:3034-3042`.
- Entry: any rejection.
- Does: the reason lands on `quotes.rejection_comment` (and `leads.quote_data.rejectionComment` for the primary); the quote card and the editor show it. After a task rejection the app context creates a General task *"Revise rejected quote for <lead>"*, planned today, for the lead's scalar `assigned_to` member — not the submitter; its row offers *"Revise Quote"* (→ `/leads?openLead=<lead>&openQuote=true`). The next submit cancels the lead's open revision tasks.
- Rules: no revision task when the rejection bypassed a task, or when the lead has no scalar assignee. A rejected quote stays editable; resubmitting is `submit` from `rejected`.
- Data: `quotes.rejection_comment`, `tasks`.
- States: —
- Words: *"Rejection reason"*, *"Quote Rejected"*, *"Revise rejected quote for <lead|lead>"*, *"Revise Quote"*.
- Reachable: yes.

### C-26 · Legacy card approve and reject
- Where: `LDD:1966-2014`.
- Entry: the zero-quote legacy card (C-14) while a pending QuoteApproval task exists.
- Does: approve → browser confirm → the app-context approve. Reject → browser prompt → the bare task-reject mutation with only `{ taskId, comment }`.
- Rules: that reject decides the task but sends no `leadId` / `quoteStatusUpdate`, so the quote stays `submitted` and no revision task is made, while the toast claims the submitter was notified.
- Data: —
- States: —
- Words: *"Approve <lead>'s quote?\n\nThe quote becomes ready to send to the client for signature."*; *"Reason for rejection? (Sent to the submitter so they know what to fix)"*; *"Quote approved"*; *"Quote rejected — submitter notified"*; *"Failed to reject quote"*.
- Reachable: rarely (zero-quote leads with a task).

### C-27 · The standalone Quote Editor page
- Where: `src/app/(main)/tools/quote-digitizer/page.tsx:25-330`; UI A-02.
- Entry: Tools › Quote Editor (`/tools/quote-digitizer`, owner / admin / id), after picking a lead that is not closed.
- Does: always works on the lead's primary (or first) quote. Every save and autosave also writes the lead mirror `draft`. Submit mirrors the drawer (decision, task, dedupe) but hard-fails without a primary. Approve / reject handlers exist for **owners only** and pick any pending QuoteApproval task of the lead (no quote match), then PATCH the primary quote as well.
- Rules: a listed non-owner approver gets no approve controls here. Where trigger 103 is live, the per-save `draft` write reaches the primary quote (C-10; Uncertain).
- Data: C-04.
- States: —
- Words: *"Quote Editor"* — *"Upload contractor quotes and digitize them with AI. Edit, review, and send to clients."*; *"Open Quote Editor"* / *"View Quote"* / *"Revise Quote"* / *"Edit Quote"* / *"Loading…"*; errors in C-11.
- Reachable: yes.

### C-28 · Approvals from Finance › Operations › Contracts and a project's quotes
- Where: `src/components/finance/quotes-table.tsx:416-640`; mounts `src/app/(main)/finance/operations/page.tsx:654-658`, `src/app/(main)/projects/[projectId]/page.tsx:3733`.
- Entry: Finance › Operations › *Contracts* › quotes (owner / admin / accounting), or a project's finance tab; a draft, submitted or rejected row opens the editor; finalized rows open a PDF preview (`/api/quotes/<id>/download`, templates B-81).
- Does: submit — approver by this list's own rule → PATCH `approved`; otherwise PATCH `submitted` and **no task** is created. Approve / reject handlers are passed to everyone for standard quotes (PATCH `approved` / `rejected` + comment) and to owner/admin for VOs (transition).
- Rules: from here any member who reaches the list — accounting included — can approve or reject a submitted standard quote, and a designer's submit leaves the quote waiting with no approver task.
- Data: C-04.
- States: *"Loading quote…"* while lines load.
- Words: *"<Quote|Variation order> approved"*, *"<…> submitted for review"*, *"<…> rejected"*, *"Failed to approve <quote|variation order>"*, *"Failed to submit <…>"*, *"Failed to reject <…>"*.
- Reachable: yes.

### C-29 · Accounts › Quote Approval Rules — stored, never read
- Where: `accounts/page.tsx:104, 322-328, 401-409, 488-516, 1153-1265`; `src/lib/transformers.ts:1484-1490`; D-07.
- Entry: Accounts › Quotes & Pricing › *Quote Approval Rules* (every role that reaches Accounts).
- Does: a form — *"Auto-approve quotes below ($)"* (50000), *"Require approval above ($)"* (100000), *"Default Approver Role"* (the studio's assignable roles, else *"Finance"* / *"Admin"* / *"Senior ID"* / *"Studio Owner"*), *"Rejection Reasons"* (defaults *"Margin too low"*, *"Client credit risk"*, *"Resource unavailable"*, *"Scope unclear"*) — saved to `settings.quote_approval`.
- Rules: nothing outside the form reads it: no amount auto-approves or forces review, the role never routes, the reasons are never offered, and `notify_on_rejection` has no control. Validation: thresholds ≥ 0; auto-approve ≤ require-approval; duplicate reasons refused. No margin-floor rule exists anywhere (grep).
- Data: `studios.settings.quote_approval`.
- States: —
- Words: *"Quote Approval Rules"* — *"Set thresholds for auto-approval and required sign-offs."*; *"Quotes under this amount are auto-approved."*; *"Quotes above this need explicit sign-off."*; *"Pulled from your Roles & Permissions setup."*; *"New reason…"*, *"Add"*, title *"Remove reason"*; *"Save Approval Rules"*; toasts *"Thresholds must be zero or positive"*, *"Auto-approve threshold must be lower than the review-required threshold"*, *"That reason already exists"*, *"Approval rules saved"*, *"Failed to save approval rules"*.
- Reachable: the tab yes; its effect none.

### C-30 · mAIson's `update_task` tool
- Where: `src/lib/agents/executors.ts:2614-2660`.
- Entry: mAIson chat.
- Does: an owner or admin can set `approval_status` (`approved` / `rejected`) and a comment on any task, QuoteApproval included.
- Rules: writes the task row only; the quote keeps its status.
- Data: `tasks`.
- States: —
- Words: *"Only owners and admins can approve or reject tasks."*
- Reachable: yes.

### C-31 · Quote permission checks computed but unused
- Where: `QDD:1116-1130`.
- Entry: —
- Does: the editor computes `canSubmitQuote` (`quotes.submit_for_review`), `canApproveQuote` (`quotes.approve`) and `effectivePerms` (role + member override; `void effectivePerms`); none is read. Only `canOverridePaymentSchedule` gates anything (C-96).
- Rules: a member denied *Submit for review* or *Approve quote* by role or override still sees and uses both; availability follows the workflow approver rule alone (C-03).
- Data: —
- States: —
- Words: —
- Reachable: dead checks.

---

## Versions and the diff

### C-32 · What a version holds — one sequence per lead
- Where: `supabase/migrations/20260414000002_quote_versions.sql:4-21`; `supabase/migrations/20260415000001_multi_quote_support.sql:31`; `scripts/migrations/186_quote_versions_hierarchy_and_restore.sql:5-11`; `192_quote_versions_metadata_snapshot.sql`; `src/types/app.ts:900-922`; `src/lib/transformers.ts:1041-1067`; D-03, templates D-07.
- Entry: —
- Does: a row `{ id, lead_id, studio_id, quote_id, version_number, snapshot, payment_milestones, doc_sections, totals { subtotal, totalDiscount, totalTax, grandTotal }, quote_status, change_summary, hierarchy_snapshot, quote_metadata_snapshot, created_by, created_at }`; `UNIQUE (lead_id, version_number)`; lines are stored as camelCase UI objects.
- Rules: the only caller never sends `quote_id`, `doc_sections`, `change_summary` or `hierarchy_snapshot`, so those stay empty and the sequence is per **lead**: versions of different quotes on the same lead interleave and nothing tells them apart. Totals are in currency units (not cents). Versions cascade with the lead, not the quote — deleting a quote keeps them (the discard copy says so). *"Current"* = the lead's highest number.
- Data: `quote_versions`.
- States: —
- Words: —
- Reachable: yes.

### C-33 · When a version is cut
- Where: `QDD:4220-4262` (`handleSaveDraft`), `10340-10355`; A-13.
- Entry: only the close prompt's *"Save as Draft"* / *"Keep draft"* (A-11).
- Does: saves the lines, then fires `POST /api/quotes/versions` with `snapshot` = the editor's lines, `paymentMilestones`, `totals`, `quoteStatus`, `quoteMetadataSnapshot` = the lead's `quote_metadata`, `isExplicit: true` (fire-and-forget).
- Rules: autosave, *"Save now"* (A-14), submit, approve, reject, revise, sending and signing never cut a version — a quote can be approved, sent and signed with no version at all. Variation orders have no version history (A-25).
- Data: C-32.
- States: —
- Words: the empty drawer claims *"Versions are created when you save a draft or submit for review."* (C-122).
- Reachable: yes.

### C-34 · The versions route and its throttle
- Where: `src/app/api/quotes/versions/route.ts:26-123`; hooks `src/lib/queries/leads.ts:1257-1330, 1374-1405`.
- Entry: C-33, C-35, C-37.
- Does: `GET ?leadId=` → the lead's versions newest first; `GET ?leadId=&diff=a,b` → exactly those two (404 `EX_VERSION_NOT_FOUND` unless both are on the lead); `POST` → `version_number` = the lead's max + 1, insert, remember the time.
- Rules: a non-explicit POST within 30 s of the last one for the same lead returns `{ versionNumber: null }` (per server process). Two concurrent POSTs for a lead can collide on the unique key (500). Versions cannot be renamed, annotated or deleted.
- Data: `quote_versions`.
- States: —
- Words: *"leadId required"*, *"diff requires exactly two ids"*, *"EX_VERSION_NOT_FOUND"*.
- Reachable: yes.

### C-35 · The Version History drawer
- Where: `src/components/leads/quote-version-drawer.tsx:1-397`; mount `QDD:9938-9946`; header button `QDD:6737-6752`.
- Entry: the editor header's History icon button (desktop widths; hidden for VOs), title *"Version history (v<n>)"* with a *"v<n>"* chip.
- Does: lists the lead's versions — *"v<n>"*, status, *"Current"* on the highest, relative time; expanding shows *"Subtotal"*, *"Discount"* (> 0), *"Tax"* (> 0), *"Grand Total"*, the change summary, *"<n> line items"*, *"View"* and *"Restore"* (not on the current one). *"View"* opens a read-only table (*"Description"* · *"Price"* · *"Qty"* · *"Total"*) with *"Restore this version"*.
- Rules: this Restore only puts the snapshot's lines into the open editor (`setItems` + dirty) — milestones, totals, hierarchy and metadata are untouched — and autosave then writes those lines to whichever quote is open; no confirm. On a locked quote the next save is refused (C-06). Relative times: *"just now"*, *"<m>m ago"*, *"<h>h ago"*, *"<d>d ago"*, else a short date.
- Data: C-34.
- States: spinner while loading; empty *"No versions yet"*.
- Words: *"Version History"*, *"Current"*, *"View"*, *"Restore"*, *"Restore this version"*, *"No versions yet"*, *"Versions are created when you save a draft or submit for review."*
- Reachable: yes.

### C-36 · Compare mode
- Where: `quote-version-drawer.tsx:188-214, 281-326`; test `src/__tests__/quote-version-drawer-compare.test.tsx`.
- Entry: *"Compare versions"* in the drawer footer.
- Does: shows a checkbox per version; at most two selected — a third tick drops the oldest pick; *"Compare (<n>/2)"* opens the diff when two are picked; closing the diff leaves compare mode.
- Rules: —
- Data: —
- States: *"Compare (<n>/2)"* disabled below two.
- Words: *"Compare versions"*, *"Select 2 versions to compare"*, *"Cancel"*, *"Compare (<n>/2)"*, aria *"Select v<n> for compare"*.
- Reachable: yes.

### C-37 · The diff dialog
- Where: `src/components/leads/quote-canva/diff/quote-version-diff-dialog.tsx:24-178`; `diff-unified-row.tsx`; `diff-totals-block.tsx`; `diff-field-breakdown.tsx`; tests `quote-version-diff-dialog.test.tsx`, `quote-version-diff-hook.test.tsx`.
- Entry: C-36.
- Does: title *"Compare v<older> → v<newer>"*; filter *"All changes"* · *"Changes only"* · *"Items only"* · *"Milestones only"* · *"Totals only"* (kept in `sessionStorage` `quote-diff-filter`); legend *"added"* / *"removed"* / *"changed"*; one row per line (`+` added, `−` removed, a changed line as `−` then `+` with a field breakdown, fuzzy moves tagged *"moved · <n>%"*), virtualised above 100 rows; *"Payment milestones"* as *"[<kind>] <name>"*; a *"Totals"* block (*"Subtotal"*, *"Discount"*, *"Tax"*, *"Grand total"*); footer *"v<a> captured <date time> · v<b> captured <date time>"*; *"Restore v<a>"*, *"Restore v<b>"*, *"Close"*.
- Rules: Restore asks *"This will overwrite your current draft. Continue?"* (browser confirm) then runs the RPC restore (C-39); restore is offered for both versions, the newest included. The diff is cached per pair indefinitely (garbage-collected after 10 minutes unused).
- Data: C-34.
- States: *"Loading diff…"*; *"Failed to load diff. <message>"*; *"No changes between these versions."*
- Words: as above.
- Reachable: yes.

### C-38 · The diff algorithm
- Where: `src/lib/quote-canva/diff/compute-diff.ts:18-267`; `lcs.ts:10-46`; `similarity.ts:4-29`; `types.ts`; tests `quote-version-diff.test.ts`, `quote-diff-lcs.test.ts`, `quote-diff-similarity.test.ts`, `quote-version-diff-perf.test.ts`.
- Entry: C-37.
- Does: orders the pair older → newer by version number; drops duplicate line ids (first wins, warns); pass 1 matches lines by id across the whole quote → *changed* (listing differing tracked fields) or *unchanged*; pass 2, per category, runs an LCS on the rest (ids are disjoint, so it yields adds and removes); a remove and an add in the same category whose descriptions (else names) have trigram Jaccard ≥ 0.8 collapse into one *changed* row marked as moved; rows group by the newer version's category order; milestones match by id; totals compare the four sums.
- Rules: tracked line fields — `name`, `description`, `descriptionHtml`, `category`, `subcategory`, `unitPrice`, `qty`, `unit`, `isOptional`, `amountMarker` (strict equality). Not tracked — discount, tax, price type, cost, markup, notes, highlight, images. Milestones compare `name`, `percent`, `amount` and `trigger`; milestones carry `amountCents` and `type`, not `amount`, so a fixed-amount change or a %↔$ switch never shows. Errors `EX_LEAD_MISMATCH`, `EX_MALFORMED`.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-39 · The atomic restore — what the RPC writes
- Where: `src/app/api/quotes/versions/restore/route.ts:19-57`; RPC `restore_quote_version` (`243_restore_quote_version_payment_schedule.sql:16-133`, first in `186`); hook `src/lib/queries/leads.ts:1336-1372`; test `quote-version-restore.test.tsx` (route call only); D-03.
- Entry: the diff dialog's Restore (C-37).
- Does: the RPC checks the lead belongs to the caller's studio and the version to the lead; deletes **every** `quote_line_items` row of the lead (all its quotes); re-inserts the snapshot lines with `id, lead_id, studio_id, name, description, category, subcategory, unit_price, qty, unit, total, margin_percent, is_optional, sort_order, ai_suggestion, comments`; sets `leads.quote_hierarchy_metadata` (the version's, else empty); writes the milestones to `leads.quote_metadata.paymentMilestones` and, when non-empty, to one quote's `payment_schedule` (non-variation, not `sent_for_signature` / `client_signed`, primary first); inserts a `quote_status_history` row. The route then overwrites `leads.quote_metadata` with the version's metadata snapshot (errors logged only) and the client refreshes the lead, lines and versions.
- Rules: as written the insert omits `quote_id` (NOT NULL since migration 104) and the history insert names columns (`lead_id`, `old_status`, `new_status`, `changed_by`, `note`) that migration 157 never created — either error rolls the whole function back, so the restore returns 500 with the DB message on a schema built from these migrations (Uncertain). Even if it ran: no status is restored; other quotes lose their lines; price type, discount, tax, marker, cost and highlight fall to defaults; nothing checks the quote's status (a finalized quote's lines would be replaced).
- Data: `quote_line_items`, `leads.quote_hierarchy_metadata`, `leads.quote_metadata`, `quotes.payment_schedule`.
- States: RPC errors *"EX_LEAD_NOT_FOUND"*, *"EX_FORBIDDEN"*, *"EX_VERSION_NOT_FOUND"*; route *"leadId and versionId required"*.
- Words: —
- Reachable: the button yes; a successful restore unverified.

### C-40 · Two restores that do different things
- Where: C-35 (drawer), C-39 (dialog); spec `docs/superpowers/specs/2026-06-03-quote-version-diff-design.md` ("Capture + restore path updates").
- Entry: drawer *"Restore"* / *"Restore this version"*; dialog *"Restore v<n>"*.
- Does: the drawer path swaps lines in memory and saves them through the normal autosave to the **open quote**; the dialog path goes to the database for the **whole lead** (C-39).
- Rules: only the dialog path confirms; only the drawer path respects the quote's lock (the server refuses the save); neither restores the status; the spec intended the drawer path to be retired ("New surfaces MUST use this hook", `src/lib/queries/leads.ts:1329-1335`) but both remain mounted.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Many quotes per lead (primary, duplicate, delete, numbering, validity)

### C-41 · The quote container and its create route
- Where: `src/app/api/quotes/records/route.ts:26-51` (number), `53-132` (GET), `134-273` (POST); hooks `src/lib/queries/quotes.ts:35-118, 278-299`; D-01.
- Entry: *"New Quote"* / *"Add Quote"* / *"Clone"* (C-44, C-46), `ensureActiveQuoteId` (C-42), the VO editor, `/api/copilot/records/create-quote` (touchpoint).
- Does: `POST { leadId?, projectId?, label?, quoteType?, isPrimary?, sourceQuoteId? }` → number (C-50) → insert `{ label: <label|"Quote">, quote_type: <type|"standard">, status: "draft", is_primary, created_by }`; up to 5 attempts; a primary-index collision retries once as non-primary; a number collision retries; with `isPrimary` it re-points the lead's `quote_id`-less lines (a no-op since 104); with `sourceQuoteId` it clones (C-46). `GET ?leadId=` (primary first, then oldest), `?projectId=` (oldest first), `?studio=1` (newest first + project / lead names), `?leadId=&count=1`.
- Rules: session only, no role gate; no label or type validation.
- Data: `quotes`.
- States: —
- Words: *"Missing query param (leadId|projectId|studio)"*, *"Failed to generate a unique quote number after 5 attempts"*, *"Insert failed"*, *"Internal server error"*.
- Reachable: yes.

### C-42 · Quotes minted implicitly
- Where: `LDD:445-488` (`ensureActiveQuoteId`); `src/app/api/quotes/line-items/route.ts:257-332`; A-08.
- Entry: the first save, submit, approve or reject on a lead with no active quote; any line save.
- Does: the drawer adopts the lead's first quote (fresh read) else creates one (primary when the lead has none). The line save drops a `quoteId` that is not a live quote of the lead, falls back to the primary, and with no primary creates `Quote` / `QT-###` / `draft` / primary (5 attempts; a race adopts the winner).
- Rules: a save aimed at a deleted quote lands on the primary or on a new primary rather than failing.
- Data: `quotes`.
- States: —
- Words: *"AUTH_NOT_READY: studio session not loaded — retry in a moment"*.
- Reachable: yes.

### C-43 · The primary quote
- Where: `105_quote_single_primary_per_lead.sql:28-30`; `106_fix_set_primary_rpc.sql:19-52`; `src/app/api/quotes/records/[id]/set-primary/route.ts:16-53`; `multi-quote-section.tsx:448-455, 495-507`.
- Entry: kebab *"Set as Primary"*; automatic when the primary is deleted from the list; the first quote of a lead.
- Does: RPC `set_primary_quote_atomic(lead, quote)` checks the quote is on the lead, unsets the current primary, sets the new one (falls back to two UPDATEs when the RPC is missing).
- Rules: the primary drives the lead mirror (C-10), the Revise and Send buttons (C-12), the summary card (C-13), the default quote of a signing request (C-67), the standalone page (C-27), the RPC restore's schedule target (C-39), the timeline schedule sync (C-103) and list order. Changing the primary never changes any status.
- Data: `quotes.is_primary`.
- States: —
- Words: *"<label>" is now the primary quote*; *"leadId required"*; RPC *"set_primary_quote_atomic: quote <id> is not on lead <id>"*.
- Reachable: yes.

### C-44 · The drawer's quote list — options and cards
- Where: `multi-quote-section.tsx:19-30, 98-538`; Classic `LDD:2228-2241`; Journey `quote-summary-card.tsx:233-245`; `LDD:1902-1925`.
- Entry: drawer › *"Quotes"* (Classic) or *"Manage quote(s)"* (Journey).
- Does: header *"Quotes (<n>)"* + *"Add Quote"* (label = the first free *"Option A"* … *"Option Z"*, then *"Option <n+1>"*; not primary); a synchronous guard stops double-clicks; the editor opens on the new quote. Each card: a star on the primary, label or rename field, number, badge (C-12), total or *"—"*, a type chip for non-standard, the signing row, the rejection reason, *"Edit"* / *"View"*, Revise and Send for Signature (primary + approved + not won), kebab *"Set as Primary"* · *"Rename"* · *"Clone"* · *"Delete"*. Above: *"Beat this quote"* (→ `/tools/quote-xray?leadId=<lead>`, hand-off X-Ray) and *"Download quote"* (C-62) when the lead has lines or is signed; Classic's section header shows *"Issued by · <entity>"* — the entity of the lead's latest signing request — when the studio has two or more active entities and such a request exists.
- Rules: variations are left out; *"Delete"* only with two or more quotes.
- Data: `quotes`.
- States: loading skeleton.
- Words: as above; title *"Add another quote option for this lead"*; toast *"<label>" created*; title *"More actions"*.
- Reachable: yes.

### C-45 · Rename
- Where: `multi-quote-section.tsx:153-179, 316-331, 456-464`.
- Entry: kebab *"Rename"*.
- Does: inline field; Enter or blur commits, Esc cancels; empty or unchanged cancels; a case-insensitive clash with another standard quote of the lead keeps the field open with an error; else PATCH `label`.
- Rules: uniqueness is UI-only and per lead; no length limit.
- Data: `quotes.label`.
- States: field disabled while saving.
- Words: *"A quote named "<name>" already exists"*, *"Renamed to "<name>""*, *"Failed to rename quote"*.
- Reachable: yes.

### C-46 · Clone
- Where: `multi-quote-section.tsx:465-477`; `records/route.ts:151-162, 247-266`.
- Entry: kebab *"Clone"* (any status).
- Does: a new draft, not primary, labelled with the next free *"Option X"*, with a new number; copies `total_cents`, `subtotal_cents`, `discount_cents`, `tax_cents` and every line (all columns but `id`, `created_at`, `updated_at` — comments, AI suggestions, creator and cost come along).
- Rules: not copied — `payment_schedule`, `doc_sections`, `parsed_doc_metadata` (date, issued-by, ref override, per-quote brand), `notes`, `rejection_comment`, the designer signature, the preview token; so the clone opens on the studio default schedule and design. Same lead only — no "start from another lead's quote" (CSV row 14). No error toast.
- Data: `quotes`, `quote_line_items`.
- States: —
- Words: *"Cloned "<label>" as "<new label>""*.
- Reachable: yes.

### C-47 · Delete from the list
- Where: `multi-quote-section.tsx:478-513`.
- Entry: kebab *"Delete"* (two or more quotes); no confirmation.
- Does: when the quote is primary, first makes the first other quote primary, then deletes; server errors show without their code prefix.
- Rules: no confirm; a pending QuoteApproval task of the quote stays pending; a failed promotion stops the delete.
- Data: C-48.
- States: —
- Words: *"<label>" deleted*, *"Couldn't promote another quote as primary"*.
- Reachable: yes.

### C-48 · The delete route's rules
- Where: `src/app/api/quotes/records/[id]/route.ts:201-330`; D-01.
- Entry: C-47, C-49.
- Does: 404 when unknown; a variation at `approved` / `client_signed` → 409; a standard quote at `approved` / `sent_for_signature` → 409; a variation's non-approved `variation_orders` mirror is deleted first; every **non-signed** signature request covering the quote (as `quote_id` or inside `quote_ids`) is set `cancelled`, detached (`quote_id` null, `quote_ids` empty) and audited `{ event: "cancelled", reason: "quote_deleted" }`; then the quote is deleted (lines and status history cascade); a foreign-key refusal (a signed request) → 409.
- Rules: `draft`, `submitted` and `rejected` quotes delete without further checks; versions and the canonical PDF object stay; deleting the last primary clears the lead mirror (C-10). No role gate.
- Data: `quotes`, `quote_signature_requests`, `variation_orders`.
- States: —
- Words: *"Quote not found"*, *"VO_APPROVED: Revise this variation order before deleting it."*, *"QUOTE_APPROVED: This quote is approved. Revise it before deleting it."*, *"SIGNATURE_EXISTS: This quote has been signed by the client and cannot be deleted."*
- Reachable: yes.

### C-49 · Discard paths
- Where: editor — A-11, A-12 (`QDD:4783-4889, 10291-10455`); drawer legacy card — `LDD:3480-3545`; tests `src/__tests__/quote-discard-footer-trash.test.ts`, `quote-digitizer-finalized-close.test.ts`, `quote-discard-deletes-before-saving.test.ts`.
- Entry: the editor's close prompt and header trash; the legacy card's *"Discard"*.
- Does: the editor's two paths delete the quote row through C-48 (A-11, A-12). The legacy card's Discard — shown only while the lead has no standard quote rows (C-14) — cancels the lead's pending QuoteApproval tasks for the drawer's active quote when the status is `submitted`, deletes that quote when the drawer holds an id (normally none on such a lead), and clears the lead mirror; with no id it only clears the mirror.
- Rules: the editor refuses finalized quotes before calling the server; the card relies on the server's 409s. No path cancels an open QuoteApproval task except the card's.
- Data: C-48.
- States: —
- Words: *"Discard this quote?"* — *"This permanently deletes the quote and all its line items. This can't be undone."* — *"Discard"*; *"Quote discarded"*, *"This quote has already been signed by the client and can't be discarded."*, *"Failed to discard quote — please retry"*.
- Reachable: yes.

### C-50 · The quote number
- Where: `records/route.ts:32-51`; `line-items/route.ts:292-306`; `103_quote_lifecycle_hardening.sql:98-138` (backfill + `UNIQUE (studio_id, quote_number)`); `accounts/page.tsx:3608-3700` (Document Numbering); print order templates B-79.
- Entry: every quote creation.
- Does: `QT-###` for standard and AI-generated quotes, `VO-###` for variations: highest numeric suffix of that prefix in the studio + 1, zero-padded to three digits (longer past 999); unique per studio; retried on collision.
- Rules: not configurable — Accounts › *Document Numbering* covers invoice, PO and ticket prefixes only. The number never changes (not on revise; a clone gets a new one); a deleted number is reused only if it was the highest. The PDF can print a per-quote `refNumberOverride` instead (A-22). `src/lib/quote-numbering.ts` and `quote-numbering.test.ts` are line refs (A1, A2 …), not quote numbers (A-32). The signed-quote notification invents `Q-<first 8 of the request id>` (C-106).
- Data: `quotes.quote_number`.
- States: —
- Words: Document Numbering — *"Customize the prefix used for invoices, purchase orders, and tickets."*
- Reachable: yes.

### C-51 · Validity and expiry
- Where: `leads.quote_valid_until` (D-08) — drawer `src/components/leads/drawer-sections/document-info-section.tsx:21-75`, editor A-22; `quotes.valid_until` (`006_projects.sql:108`) read only by `src/app/api/quote-preview/[token]/route.ts:20, 75`.
- Entry: drawer › Document Info, editor › Document info.
- Does: one date per **lead** that prints wherever a meta row asks for it (templates B-61).
- Rules: all quotes of a lead share it; nothing writes `quotes.valid_until`; nothing expires a quote — `expired` is never written and no job compares the date; only signing links expire (C-73).
- Data: as above.
- States: —
- Words: *"Quote Valid Until"*.
- Reachable: yes.

### C-52 · Which quote is "the contract"
- Where: `src/lib/leads/resolve-contract-quote.ts:52-72`; test `src/__tests__/resolve-contract-quote.test.ts`; users `LDD:1945-1953`, `LDD:1870, 3384` (project schedule), contract value (hand-off Finance).
- Entry: —
- Does: among standard quotes: one → it; several → the latest signed (`signed_at`, else `updated_at`) → the primary → the first.
- Rules: used wherever one quote must stand for the deal (revise fallback, project creation's schedule, contract value).
- Data: `quotes`.
- States: —
- Words: —
- Reachable: yes.

### C-53 · Deep links and resolving a quote to its lead
- Where: `src/app/api/quotes/resolve-lead/route.ts:15-34`; `tasks/page.tsx:460-478`; A-03.
- Entry: links from Tasks and elsewhere.
- Does: `GET ?quoteId=` → `{ leadId }` (null when hidden); links take the form `/leads?openLead=<lead>&openQuote=true&quoteId=<quote>`.
- Rules: —
- Data: —
- States: —
- Words: *"quoteId required"*.
- Reachable: yes.

### C-54 · Studio-wide and project quote lists
- Where: `src/components/finance/quotes-table.tsx:1-400`; `finance/operations/page.tsx:303-330, 640-660`; `projects/[projectId]/page.tsx:829-832, 3685, 3733`; `useAllQuotes` `quotes.ts:278-299`.
- Entry: Finance › Operations › *Contracts* (quotes / VOs sub-tabs); a project's finance tab.
- Does: rows show number, a *"(VO)"* pill, label, project and lead; pills *"All"* / *"Signed"* / *"Approved"* / *"Pending"* / *"Drafts"*; sort signed → approved / sent → submitted → draft → rejected, newest first within; finalized rows open a PDF lightbox (`/api/quotes/<id>/download`, file `<number|quote>.pdf`); others open the editor (C-28). The project tab shows *"Issued by · <entity>"* (the latest signing request's entity) for multi-entity studios.
- Rules: quotes stored only in legacy `projects.quote_data` do not appear.
- Data: `quotes`.
- States: *"No quotes yet"*, *"No quotes match this filter"*.
- Words: as above; *"Variation Order"*, *"Quote"*, title *"View project"*.
- Reachable: yes.

### C-55 · Conversion readiness
- Where: `src/components/leads/conversion-readiness-card.tsx:1-189`; `LDD:1785-1790, 2465-2560`.
- Entry: drawer footer, Classic mode, while a prerequisite is missing and no project exists.
- Does: rows per enabled workflow gate — *"Designer assigned"*, *"Quote approved"* (the drawer's quote status in `approved · sent_for_signature · client_signed`, shown with the canonical total), *"Contract uploaded"*, *"Project type selected"* — each missing row with *"Assign"*, *"Create quote"*, *"Upload now"* or *"Select type"*; *"Convert to Project"* enables when all pass; collapsed bar *"<done> of <total> ready to create project"*. Once everything passes, the footer shows *"Create Project"* instead.
- Rules: turning `quoteApprovalRequired` off removes the quote row. Journey mode uses the tracker (Leads C-12); project creation is Leads C-71.
- Data: —
- States: —
- Words: as above; *"Ready to create project"*.
- Reachable: yes (Classic).

### C-56 · AI quote insights (touchpoint)
- Where: `src/app/api/quotes/insights/route.ts:1-467`; callers `QDD:2610, 3177`.
- Entry: after a parse or an explicit re-analysis in the editor (A-18).
- Does: posts the lines (+ lead name / email / phone, the quote's client name, country) to Gemini 2.5 Flash through OpenRouter (45 s); returns suggestions typed `underquote · upsell · missing · client_mismatch · margin_warning`; market rates come from `platform_market_rates`, else hard-coded region tables; an "underquote" at or above the cited range's low end is dropped; a fixed dry-run answer without an API key.
- Rules: advisory only — no effect on status or approval; display A-18, money context B.
- Data: `platform_market_rates`; `quote_line_items.ai_suggestion` (hand-off A).
- States: empty suggestions on any error.
- Words: —
- Reachable: yes.

---

## Sending (share link, portal, download)

### C-57 · The editor's Share menu (flow)
- Where: `QDD:6753-6817`, handler `1548-1578`; templates B-89 (menu), B-93 (preview page), B-82 (canonical).
- Entry: the share icon in the editor header — desktop widths, saved standard quotes (hidden for VOs).
- Does: *"Copy preview link"* mints or reuses the quote's token and copies the no-OTP live preview URL; *"Send to homeowner portal"* (C-58); *"Re-sync PDF"* re-uploads the editor's render as the canonical without sharing.
- Rules: the button is enabled only at `approved · sent_for_signature · client_signed` and not while an upload is parsing — for every studio, independent of the lock flag (C-63).
- Data: templates B-88.
- States: —
- Words: title *"Share quote"*; reasons *"Wait for the upload to finish before sharing"*, *"Quote must be approved before it can be shared"*; menu words in templates B-89.
- Reachable: yes.

### C-58 · Send to homeowner portal — visibility and its withdrawal
- Where: `src/app/api/quotes/share-to-portal/route.ts:17-145`; `src/lib/homeowner-binding.ts:500-531` (`notifyQuoteShared`); withdrawal `transition/route.ts:280-326`, `records/[id]/route.ts:162-192`; templates B-82.
- Entry: Share menu; implicitly at send-for-signature (C-69).
- Does: stores the editor's PDF as the canonical object (or reuses the stored one when the quote carries a baked designer signature), then records `leads.quote_metadata.portalSharedQuotes[<quote>] = { pdfUrl, sharedAt }` (merged onto a fresh read) and bells linked homeowners (C-109). `storeOnly: true` only stores the bytes.
- Rules: the homeowner portal lists only quotes present in `portalSharedQuotes` (portal hand-off). No status check on the server — the menu's gate is the only one. The entry is removed when the quote moves to `draft · submitted · rejected` through PATCH or to `draft · rejected` through the transition route; the task-reject route leaves it (C-07).
- Data: storage `shared-quotes`; `leads.quote_metadata.portalSharedQuotes`.
- States: —
- Words: editor toasts in templates B-82; route errors *"Not authenticated"*, *"leadId and quoteId are required"*, *"Lead not found"*, *"Failed to store PDF"*, *"Failed to record share"*.
- Reachable: yes.

### C-59 · The live links (flow)
- Where: templates B-88 … B-93, B-96, B-102; tests `src/__tests__/quote-share-link-*.test.ts(x)` (generate, meta, pdf, OTP, status, rate-limit key, audit log, proxy, page, viewer — templates B-96).
- Entry: *"Copy preview link"* (C-57).
- Does: one token per quote opens two public pages — the copied no-OTP live HTML preview and an OTP-gated live PDF viewer whose URL no UI builds.
- Rules: no expiry and no revocation UI; revise leaves the link live, so a quote reopened to draft keeps showing its in-progress edits on the preview link; the preview refuses only `rejected` (and the non-existent `cancelled` / `archived`); the preview JSON carries internal line fields (templates B-98).
- Data: `quotes.preview_token`, `preview_view_count`.
- States: —
- Words: templates B-89 … B-93.
- Reachable: yes.

### C-60 · Accounts › Quote Sharing (touchpoint)
- Where: templates B-94.
- Entry: Accounts › Quotes & Pricing › *Quote Sharing*.
- Does: stores the sharing method, a standalone-link expiry (7–90 days, default 30) and four display toggles.
- Rules: nothing reads any of it — signing links always last 7 days (C-73), preview links never expire, optional add-ons always show on the signing page (C-77).
- Data: `studios.settings` keys in templates B-94.
- States: —
- Words: templates B-94.
- Reachable: the tab yes; its effect none.

### C-61 · Downloads by status (flow)
- Where: `QDD:9329-9340, 9460-9472`; `src/app/api/quotes/[id]/download/route.ts`; `src/app/api/leads/[id]/quote/download/route.ts`; `src/app/api/quotes/signed-quote/[id]/route.ts`; templates B-81, B-82, B-87.
- Entry: editor *"Download PDF"*; summary card *"View"* (C-13); drawer picker (C-62); finance list preview (C-54); the signed notification's link (C-106).
- Does: before approval the editor renders in the browser (and, with the canva editor on, stores the result as the canonical); from `approved` on it serves the canonical (rendering it when missing); signed sources serve the executed PDF through a short-lived signed URL.
- Rules: renderer choice and file names are templates B-81; the executed PDF is templates B-86 / B-87.
- Data: storage `shared-quotes`, `signed-quotes`.
- States: *"Generating…"*.
- Words: templates B-81.
- Reachable: yes.

### C-62 · The drawer's download picker
- Where: `src/app/api/leads/[id]/quote/list/route.ts:11-39`; `src/lib/quote-download.ts:23-114`; `src/components/ui/download-picker.tsx:55-96`; `LDD:1912-1922`.
- Entry: *"Download quote"* above the drawer's quote list.
- Does: lists, newest signed first, every signed request (*"Signed quote · <client|Homeowner> · <date>"*, source `signed:<request>`); then every quote with at least one line, skipping signed quotes a request already covers (*"Signed quote · <label|Primary|Alternate> · <n> line item(s)"* or *"Quote · <label|Primary|Alternate> · <n> line item(s)"*, source `draft:<quote>`); with no quote rows but lead lines, *"Draft quote · <n> line item(s)"* (`lead-draft:<lead>`). One entry downloads at once; several open a menu with chips.
- Rules: sources resolve in the lead download route (templates B-81, B-87). A quote signed outside the signing flow still lists as signed.
- Data: `quote_signature_requests`, `quotes`, `quote_line_items`.
- States: *"No downloadable files yet."*, *"Failed to load downloads"*.
- Words: chips *"Signed"*, *"Draft"*, *"Upload"*.
- Reachable: yes.

### C-63 · "Lock quote sharing until approved"
- Where: `src/app/(main)/accounts/feature-flags-tab.tsx:84-89`; `src/app/api/studio-config/features/route.ts:16, 45, 72, 133`; `QDD:1188-1195, 9337-9338, 9468-9469`; `request-signature/route.ts:234-250`; Leads C-58.
- Entry: Accounts › Workflow › *Feature Flags* (no role gate); default off.
- Does: disables the editor's *"Download PDF"* until the quote is approved or later; makes `request-signature` answer 403 below approval.
- Rules: the server check repeats the approval gate every studio already has (C-67) and the Share menu is approval-gated for every studio (C-57), so the flag's only unique effect is the Download button — the description also promises Share Link, Copy Link and WhatsApp buttons.
- Data: `studios.settings.features.lock_quote_actions_until_approved`.
- States: —
- Words: *"Lock quote sharing until approved"* — *"Disable Download PDF, Share Link, Copy Link, and WhatsApp share buttons on a quote (with an inline notice) until the quote has been approved."*; tooltip *"Quote must be approved before it can be shared"*; *"Quote must be approved before sending for signature (studio policy)."*
- Reachable: yes (behind the flag).

---

## Signing (request, OTP, bundle, client selections, cancel, resend, what signing triggers)

### C-64 · The signature request and its statuses
- Where: `scripts/migrations/042_quote_signature_requests.sql`; `104_quote_fk_and_notnull.sql:49-58`; `113_quote_payment_schedule_snapshot.sql`; `161_quote_signature_multi_quote.sql`; test `src/__tests__/quote-signing.test.ts` (schema, types, public routes in the proxy); D-06, templates D-11.
- Entry: C-67.
- Does: one row per send — token (random UUID), `status`, `client_name`, `client_phone`, `quote_snapshot`, `quote_total` (currency units), `studio_name`, `expires_at`, `document_hash`, `audit_trail`, `payment_schedule`, `documents`, `company_id`, `prepared_by_display`, `quote_id` / `quote_ids` / `signing_mode` / `selected_quote_id`, then signer fields, `signing_hash`, `document_acknowledgements`, `signed_pdf_url`, `signed_packet_path`. `leads.signature_request_id` points at the newest.
- Rules: `pending` on insert → `viewed` on the first page load (before any OTP) → `signed`; `expired` is set lazily when an expired link is loaded; `cancelled` by Cancel signing, by a newer send for the lead, or by deleting the quote. At most one `pending` / `viewed` request per lead. The TypeScript unions omit `cancelled`.
- Data: `quote_signature_requests`.
- States: —
- Words: —
- Reachable: yes.

### C-65 · The Contract & Signing dialog — entry and states
- Where: `CFD:103-1952` (states `604-627`); mount `LDD:3320-3365`.
- Entry: *"Send for Signature"* (quote card), *"Send for signature"* / *"Manage signing"* / *"Manage"* (summary card), *"Manage →"* (in-flight row, legacy card), readiness *"Upload now"*.
- Does: picks a state — latest request `signed` → **signed**; `pending` / `viewed` → **in flight** (C-87…C-90); a contract file on the lead → **paper signed**; a paper path chosen → **upload** / **compose** (C-91); quotes still loading → placeholder; no quote at `approved · sent_for_signature · client_signed` → **not approved** (zero quotes → "create a quote" copy); otherwise **send** (C-66). Escape does not close it; the header shows the lead and the selected quote with its total.
- Rules: gates on real `quotes` rows only, never on the lead mirror (C-11).
- Data: `quotes`, latest request.
- States: loading placeholder.
- Words: *"Contract & Signing"*; not approved — *"Create a quote before sending"* / *"This lead doesn't have a quote yet. Signing locks a quote in as a legal commitment, so there has to be one to sign."* / *"Build the quote in the Quote section of this lead, approve it, then come back to send it for signature."*, or *"Approve the quote before sending"* / *"Signing locks a quote in as a legal commitment. Once a quote is approved you'll be able to send it for digital signature or attach a paper contract from here."* / *"Approve the quote from the Quote section of this lead, then come back to send it for signature."*; signed — *"Signed by client"* / *"The client signed this quote digitally. The signed PDF is on file."* / *"Close"* / *"Move the lead to SIGNED from the lead drawer to kick off project creation."*; paper signed — *"Signed contract on file"*, *"Replace contract"*.
- Reachable: yes.

### C-66 · The send form
- Where: `CFD:141-230, 502-566, 777-1100`.
- Entry: the **send** state.
- Does: a *"Signing this quote"* card (one approved quote) or *"Which quotes are being signed?"* radios (several); the pick defaults to the drawer's quote when it is eligible, else the primary, else the first. Fields *"Client name"* (≤ 120) and *"Client phone (for OTP)"* (country-code select + number ≤ 20 characters, validated by the region rule on blur and live afterwards); *"Issuing entity"* when the studio has two or more active entities (defaults to the lead's entity, else the default); the documents picker (C-72); *"Send for digital signature"*.
- Rules: disabled until one quote is picked and name and phone are valid. Body sent: `leadId`, `quoteId` (the drawer's), `quoteIds` (the pick), `signingMode: "single"`, `clientName`, `clientPhone` `"<code> <number>"`, `companyId`, `documents`. The picker offers `sent_for_signature` and `client_signed` quotes too (the server refuses the latter, C-67).
- Data: —
- States: *"Generating…"*.
- Words: *"(Primary)"*; *"Select the quote you want the client to sign."*; *"Send a signing link"* — *"Client reviews and signs in their browser. OTP-verified by phone."*; placeholders *"Client name"*, *"Phone number"*; *"Client name is required"*, *"Phone number is required"*; *"Default entity"*, *"(default)"*, *"Determines UEN, GST status, and bank details on the signed quote."*; titles *"Pick at least one approved quote to send"*, *"Fill in a valid client name and phone to continue"*; *"Need a different signing method?"*, *"Upload an already-signed PDF"*, *"Compose a contract first"*; toasts *"No lead associated — cannot generate signing link"*, *"Please enter the client name"*, *"Add the client's phone number to send for signature"*, *"Failed to generate signing link"*.
- Reachable: yes.

### C-67 · `request-signature` — resolving the quotes and the gate
- Where: `src/app/api/quotes/request-signature/route.ts:57-351`; tests `quote-approve-without-quote-row.test.ts`, `h10-entity-aware-signing.test.ts`.
- Entry: C-66, C-89.
- Does: session → body (`leadId` and `clientName` required; `quoteIds` wins over `quoteId`; one quote forces `single`, several default to `bundle`) → the lead (studio-scoped) → the lead's quotes (primary first) → every requested id must exist on the lead (404); no ids → the only quote, or the primary with a warning; no quote rows → the legacy lead-level path. Gate: every quote `approved` or `sent_for_signature`; any `client_signed` → 409; legacy path uses `leads.quote_status`. Lock flag → 403 (C-63). Lines loaded per quote set; a lead with no quote and no lines → 400.
- Rules: `sent_for_signature` is resendable here (a new request supersedes the old, C-69). No role check — `quotes.send` is not enforced (C-112). The phone is optional server-side; without one the OTP accepts any number (C-75).
- Data: `quotes`, `quote_line_items`, `leads`.
- States: —
- Words: *"leadId and clientName are required"*, *"Lead not found"*, *"Quote <id> not found for this lead"*, *"This quote has already been signed by the client."*, *"Quote must be approved before sending for signature"*, *"Already signed — cannot re-send for signature: <numbers>"*, *"Cannot send for signature — these quotes are not approved: <numbers>"*, *"Failed to fetch quote items"*, *"There's nothing to sign yet — add line items to the quote before sending it for signature."*
- Reachable: yes.

### C-68 · `request-signature` — what it freezes
- Where: `request-signature/route.ts:284-476, 478-671`.
- Entry: C-67.
- Does: **total** — the sum of the quotes' `total_cents` when every one is > 0, else a line re-sum (hand-off B); **snapshot** — `single`: the raw line rows; `bundle` / `variations`: one entry per quote `{ quoteId, quoteNumber, quoteName, isPrimary, lineItems, total }`; **hash** — SHA-256 of the stable-stringified snapshot; **schedule** (C-100); **documents** — the picker's list with the quote content merged and every item hashed, exactly one `requires_signature` (the quote first), or, when no list is sent, the auto-composed quote + default T&C + default contract (C-72); **entity** — the posted `companyId` (must be an active entity of the studio) or the default-entity ladder; **prepared by** — the lead's assignees resolved by the studio's `quotePreparedByMode` (`team_list` default · `studio_only` · `first_assignee`); **expiry** — now + 7 days.
- Rules: merge fields in HTML documents are substituted with `client_name`, `studio_name`, `quote_total`, `current_date`, `start_date` (both today). The quote document's accept line is rewritten by the server.
- Data: `quote_signature_requests` (C-64).
- States: —
- Words: *"Invalid companyId for this studio"*; quote accept line *"I have reviewed the quotation from <studio|the studio> and agree to proceed."*; document titles *"Quotation"*, *"Terms & Conditions"*, *"Contract Agreement"*; accept lines *"I have read and accept the Terms & Conditions."*, *"I have read and accept the Contract Agreement."*
- Reachable: yes.

### C-69 · `request-signature` — side effects
- Where: `request-signature/route.ts:673-1047`.
- Entry: C-67.
- Does: (1) cancels every `pending` / `viewed` request of the lead (audit `cancelled_for_regenerate` or `cancelled_superseded`); (2) inserts the request (audit `link_created`); (3) lead `quote_status = sent_for_signature` + `signature_request_id` (one retry, else a warning); (4) the request's quotes → `sent_for_signature`; any other of the lead's quotes at `sent_for_signature` → `approved`; (5) bakes the designer signature for non-VO quotes; (6) shares each quote to the portal — reusing the stored canonical unless regenerating or a VO, else rendering one server-side (templates B-82); (7) `quote.signature_requested` (C-105); (8) the homeowner bell (C-109); (9) usage `quote_sent`; returns `{ token, signingUrl, warning? }` where the URL uses `NEXT_PUBLIC_APP_URL` or the request host.
- Rules: all of (5)–(8) are best-effort. No `quote_status_history` row.
- Data: C-64, C-09.
- States: —
- Words: *"Failed to create signature request: <message>"*; warning *"Signing link created, but the lead status couldn't be updated — refresh to re-sync."*
- Reachable: yes.

### C-70 · What the drawer writes after a link is created
- Where: `LDD:3336-3364`; `LDD:557-614` (`shareQuotePdfForSigning`).
- Entry: C-66 success.
- Does: PATCHes the drawer's **active** quote to `sent_for_signature` and, when that quote is primary, the lead mirror; toasts; for studios with the canva editor off, renders the legacy PDF in the browser and shares it to the portal.
- Rules: the active quote is not necessarily the one the dialog sent — picking another quote in the radio can leave the open quote (even a draft) marked `sent_for_signature` through a PATCH with no state check. Regenerate does not run this handler.
- Data: C-04.
- States: —
- Words: *"Signing link created — share it with your client"*.
- Reachable: yes.

### C-71 · Several quotes in one signing — bundle and variations
- Where: `CFD:93-99, 882-925`; `request-signature/route.ts:110-117, 360-392, 436-438`; `SIGN:877-990`; `submit/route.ts:141-156, 331-348`.
- Entry: none in the UI — `MULTI_QUOTE_SIGNING_ENABLED = false` forces one quote and `single`.
- Does: server and page support both: bundle — every quote listed, one combined total, the signature marks them all; variations — radio options seeded with the primary, the client signs one (`selectedQuoteId` required), only that quote becomes `client_signed`. The schedule comes from the primary.
- Rules: the flag's comment says the public page cannot render these modes — it can (C-126). No designed PDF is shown for these modes (single only).
- Data: `signing_mode`, `quote_ids`, `selected_quote_id`.
- States: *"Pick one of the options above to continue."*
- Words: *"How should the client sign these?"*, *"Bundle"* — *"Sign all together as one commitment"*, *"Variations"* — *"Client picks one of these to sign"*; page *"Pick one of these <n> options to sign"*, *"Signing <n> quotes together as one commitment"*, *"Choose the package you'd like to commit to. Your signature applies only to the option you select."*, *"Your signature applies to every quote listed below. The combined total is shown at the bottom."*, *"You'll sign for"*, *"Combined Total"*, *"Sign all <n> quotes"*, *"Sign <label|selected option>"*.
- Reachable: behind the code flag (off).

### C-72 · Signing documents and the picker (touchpoint)
- Where: `src/components/leads/signing/signing-document-picker.tsx`; `CFD:162-194`; `request-signature/route.ts:478-630`; `src/lib/signing/signing-document-hash.ts`; `src/lib/signing/signing-sequence.ts`; Contracts audit.
- Entry: the send form's documents list.
- Does: an ordered list whose pinned first item is the quote; the studio adds library documents, uploads a PDF (≤ 5 MB) or writes rich text, and reorders.
- Rules: the dialog always sends this list, so the route's picker path always runs and the studio's default T&C and contract templates are **not** added unless picked — the auto-compose path (quote + default T&C + default contract) runs only for a regenerate (C-89). On the picker path a composed contract body (*"Compose a contract first"* → *"Send for signature"*) is ignored. Library, templates and the walk are the Contracts audit's.
- Data: `quote_signature_requests.documents`.
- States: *"Please choose a PDF file"*, *"PDF must be 5 MB or smaller"*.
- Words: —
- Reachable: yes.

### C-73 · The link's lifetime
- Where: `request-signature/route.ts:356-358`; `src/app/api/sign/[token]/route.ts:36-73`; `request-otp/route.ts:78-84`; `verify-otp/route.ts:81-87`; `submit/route.ts:75-85`.
- Entry: —
- Does: expires 7 days after creation; the first page load after that marks it `expired` and answers 410; OTP and submit refuse a passed `expires_at` too.
- Rules: fixed 7 days (C-60's setting is unread); no reminder before expiry, no notice after; resend reuses the same token and does not extend it (C-88); only a new send or regenerate gives a new window. A cancelled link answers 410 on load; the OTP and submit routes do not check `cancelled` (Uncertain).
- Data: `expires_at`, `status`.
- States: —
- Words: *"This signing link has expired"*, *"This signing link has been cancelled. Please contact your designer for a new link."*, archived lead *"This link is no longer active. Please contact your designer for an updated link."*
- Reachable: yes.

### C-74 · The signing page — steps and what is withheld before OTP
- Where: `SIGN:157, 417-560, 1270-1965`; `src/app/sign/[token]/layout.tsx`; `api/sign/[token]/route.ts:227-298`; `src/proxy.ts:316`.
- Entry: `/sign/<token>` (public).
- Does: steps `loading → phone → otp → doc_review | review → casetrust → sign → done`, or `error`. The first GET returns identity and branding only: client name, studio name, status, dates, masked phone, entity name / GST flag / country / currency, the multi-entity flag, CaseTrust flag, signing mode, quote ids; the snapshot, total, PDF URL, schedule, documents and discount arrive only from verify-otp. A signed link opens straight on **done** and the GET then returns the full content without OTP. Tab title *"Sign Your Quote — Qanvast"*; the page is forced light.
- Rules: the entity's bank details and GST number are never returned (M13). Loading counts as *viewed* even without OTP.
- Data: —
- States: *"Loading your quote…"*; error *"Link Unavailable"* + the server message (fallback *"This signing link has expired or is invalid."* / *"Could not load the signing link. Please try again."*) + *"Please contact your interior designer for a new link."*
- Words: top bar *"Quote for Signature"*, *"from <issuer>"* (the entity name for multi-entity studios, else the studio); *"Issued by · <entity>"* chip for multi-entity studios.
- Reachable: yes.

### C-75 · OTP on the signing page
- Where: `SIGN:574-693, 1351-1517`; `src/app/api/sign/[token]/request-otp/route.ts:9-120`; `.../verify-otp/route.ts:12-179`; `src/lib/rate-limit.ts`; `src/lib/twilio.ts`.
- Entry: the **phone** step.
- Does: the client types the national number (digits only, region max length; prefix shown from the lead's or studio's country) → request-otp validates the format, checks the link and — when the request has a phone — that the local digits match it, sends a Twilio Verify SMS (a send failure still answers success with `smsFailed`) and audits `otp_requested` with the phone → the client enters 6 digits → verify-otp re-checks format, link and phone match, verifies the code, stores `signer_phone` (awaited), audits `otp_verified`, and returns the quote content (snapshot, total, canonical PDF URL, the lead's **current** document discount and GST switch, schedule, documents with signed URLs).
- Rules: limits — request: 3 per 60 s per IP + token (memory) and 6 per 10 min per token (durable); verify: 5 per 5 min per IP + token and 10 per 5 min per token. Page: resend after a 30 s cooldown, at most 3 resends per session. No phone on the request → any valid number verifies and becomes the signer. Test-number and bypass rules of the shared Twilio helper apply (templates B-91).
- Data: `signer_phone`, `audit_trail`.
- States: *"Sending OTP…"*, *"Verifying…"*.
- Words: *"Verify your identity"*, *"Enter the mobile number ending in <last 4> to receive a verification code."* / *"Enter your mobile number to receive a verification code."*, *"Mobile Number"*, *"Send Verification Code"*, *"A 6-digit code will be sent via SMS to your mobile number."*, *"Enter verification code"*, *"We sent a 6-digit code to <code> <number>"* / *"We couldn't send the code to <code> <number> just now."*, *"The verification SMS could not be delivered. Wait a moment and tap Resend code below — if it still doesn't arrive, contact your designer and they can re-issue this signing link."*, *"Verify & Continue"*, *"<n>s before you can resend"*, *"Resend code"*, *"Need help? Contact your designer."*, *"Change phone number"*; errors *"Phone number is required"*, *"Invalid phone number: <reason>"*, *"Too many OTP requests. Please wait a minute before trying again."*, *"Too many OTP requests for this link. Please wait a few minutes before trying again."*, *"This document has already been signed"*, *"This phone number doesn't match our records for this quote"*, *"Phone and OTP are required"*, *"Too many failed attempts. Please wait 5 minutes and request a new OTP."*, *"Too many failed attempts for this link. Please wait 5 minutes and request a new OTP."*, *"Invalid OTP. Please try again."*, *"Please enter the 6-digit OTP"*, *"Failed to send OTP. Please try again."*, *"Failed to resend code. Please try again."*, *"Network error. Please try again."*
- Reachable: yes.

### C-76 · The review step
- Where: `SIGN:796-1265`.
- Entry: after OTP (the legacy **review** step, or the quote item inside the document walk, C-78).
- Does: branding, the issuer chip, *"Link expires <date>"*; single mode shows the designed PDF inline — the stored canonical, else an on-demand render (templates B-81) — with *"Open / download PDF"*; bundle / variations show their lists (C-71); a line table appears only when there are optional lines (C-77); the frozen schedule (*"Payment Schedule"*, *"Locked once signed"*, rows *"<label> · <trigger>"* and *"<percent>% · <amount>"*, footnote); *"Proceed to Sign"* — *"Please review all items before signing."*; a footer with accreditations, address, registration (*"UEN"* and regional equivalents), contacts and footer text.
- Rules: triggers print as stored — codes such as `contract_signed` or `deposit` when the schedule came from a template or the platform snapshot (C-94). The discount applied in the add-ons block is the lead's current one, not a frozen value (hand-off B).
- Data: C-75.
- States: —
- Words: as above.
- Reachable: yes.

### C-77 · Optional add-ons and client selections
- Where: `SIGN:992-1158, 707-745`; `submit/route.ts:32-44`; D-04; templates B-99.
- Entry: the review step when the snapshot has optional lines (single mode).
- Does: lists required lines and *"Optional Add-ons"* with accept / decline toggles and *"<n> of <m> accepted"*; the block's *"Grand Total"* = required + accepted optional lines − the document discount, with *"Discount"*, *"Tax"*, *"Optional add-ons"* rows; the submit body carries `clientSelections.optionalItemsAccepted`.
- Rules: the submit route never reads `clientSelections` and nothing writes `client_selections` — the choices are lost. The Sign step, the agreement sentence and the executed PDF all use the frozen total and the canonical document, which include every optional line under the default pricing-table mode (templates B-99). The Accounts toggle for these controls is unread (C-60).
- Data: `quote_signature_requests.client_selections` (never written).
- States: —
- Words: *"Optional Add-ons"*, *"Toggle items you would like to include"*, *"<n> of <m> accepted"*, *"Discount"*, *"Discount (<v>%)"*, *"Tax"*, *"Optional add-ons"*, *"Grand Total"*.
- Reachable: yes (display); the choice has no effect.

### C-78 · The document walk (touchpoint)
- Where: `SIGN:462-526, 1519-1764`; `src/lib/signing/signing-sequence.ts`; tests `signing-multidoc.test.ts`, `signing-sequence.test.ts`; Contracts audit.
- Entry: after OTP when the request has documents.
- Does: unified path (any `documents`) — every item in the studio's order with a progress bar *"<title>"* *"<i> of <n>"*; the quote renders the review (C-76), PDFs render inline (*"Open / download PDF"*), HTML is sanitized; each gate needs scroll-to-end when flagged (a mounted PDF counts) and the accept checkbox; *"Continue"* → next, the last → *"Proceed to Sign"*; first-view times are recorded. Legacy path (T&C / contract only, quote in its own step) — *"Document <i> of <n>"*, *"Continue to Next Document"* / *"Continue to Quote"*, gate = the checkbox only.
- Rules: every request created today has `documents`, so the unified path is the live one.
- Data: `documents`, `document_acknowledgements` (C-83).
- States: —
- Words: as above.
- Reachable: yes.

### C-79 · The CaseTrust step
- Where: `SIGN:697-706, 1766-1792`; `api/sign/[token]/route.ts:218-224`; `src/lib/region-config.ts:119`; Leads C-61.
- Entry: after review, when the region config says CaseTrust and the studio flag `casetrust_signing_step` is on.
- Does: a disclosure and *"I Understand — Continue to Sign"*, recorded as `casetrust_acknowledged` in the audit trail.
- Rules: no region sets `features.casetrust`, so the step never shows (Leads Uncertain 1).
- Data: `audit_trail`.
- States: —
- Words: *"CaseTrust Deposit Protection"*, *"This studio is a CaseTrust-Renovation accredited business. Your deposit is protected under the CaseTrust deposit-protection scheme up to the accredited amount. Please review the disclosure below before signing."*, *"The deposit will be held in a CaseTrust-protected account."*, *"You may request reimbursement under specified conditions."*, *"Full terms: case.org.sg/casetrust-renovation"*, *"I Understand — Continue to Sign"*.
- Reachable: no (dead in practice).

### C-80 · The sign step
- Where: `SIGN:200-348, 708-778, 1794-1962`.
- Entry: *"Proceed to Sign"*.
- Does: *"Signing for"* the client and the frozen total (*"Total"*, *"Combined Total"* for bundle, the picked option's total for variations); *"Full Name"*; a drawing pad (*"Sign above"*, *"Clear signature"*); an agreement checkbox whose sentence names the signer, the other documents, the issuer and the frozen total; submit.
- Rules: name required; the drawing's bounding box must be at least 50 × 20 canvas pixels; agreement required; variations need a picked option; the timezone is sent. *"Back to review"* returns to the last document or the review.
- Data: C-82.
- States: *"Submitting…"*.
- Words: placeholder *"Type your full name as it appears on <NRIC|MyKad|Emirates ID|Aadhaar|National ID|Civil ID|Qatar ID|your official ID>"*; agreement *"I, <name|[your name]>, agree to the quotation[ and <documents>] from <issuer|the studio> totalling <total> as set out in the documents above. I understand that this constitutes my digital agreement to proceed."* (single-document form ends *"as set out above."*); *"Sign & Submit"*; *"Your signature is legally binding under the <Singapore Electronic Transactions Act|…|applicable electronic transactions law>."*; errors *"Please enter your full name"*, *"Please draw a complete signature"*, *"Please check the agreement box to proceed"*, *"Please select one of the quotes above before signing."*, *"Submission failed. Please try again."*
- Reachable: yes.

### C-81 · Who signs — one signer, no ID number
- Where: `request-signature/route.ts:72-104`; `CFD:208-229`; `SIGN:1826-1840`; `submit/route.ts:270-290`.
- Entry: —
- Does: one recipient per request (`client_name`, `client_phone`); the signer types a name and draws once; the record keeps the typed name only in the executed PDF caption (templates B-86) — `client_name` stays the name the studio entered.
- Rules: no second signer, co-owner or witness; no studio countersignature beyond the designer's baked signature (templates B-85). The NRIC / IC is not captured — the placeholder only asks for the name as it appears on the ID; the lead's `ic_number` prints on the PDF when a meta row asks (templates B-61).
- Data: `client_name`, `client_phone`, `signer_phone`.
- States: —
- Words: —
- Reachable: yes.

### C-82 · The submit route — checks and proof of phone
- Where: `src/app/api/sign/[token]/submit/route.ts:21-267`; tests `archival-signing-submit-guard.test.ts`, `quote-signing-mirror-fallback.test.ts`, `quote-signing-no-quote-row-mirror.test.ts`.
- Entry: *"Sign & Submit"*; the homeowner portal's signing wizard (C-92).
- Does: requires `signerName` and `signatureData` (a `data:image/png|jpeg;base64,` URL ≤ 1,000,000 characters); loads the request by token; refuses expired (by date or status) and signed; refuses an archived lead (410); phone proof = the OTP-set `signer_phone`, else a real (non-preview) homeowner session actively linked to the lead (its phone becomes `signer_phone`); variations need a `selectedQuoteId` in the set; recomputes the snapshot hash and refuses a mismatch (audited); with stored documents and acknowledgements, every acknowledged id and hash must match the stored documents (audited), and `signing_hash` becomes SHA-256 of the stored documents' hashes joined by `|`.
- Rules: `cancelled` is not checked here (Uncertain). Unacknowledged documents are not required to be acknowledged — only mismatches refuse.
- Data: C-83.
- States: —
- Words: *"Missing token"*, *"signerName and signatureData are required"*, *"Signature too large"*, *"Invalid signature format"*, *"Signing link not found"*, *"This signing link has expired"*, *"This document has already been signed"*, *"Phone verification is required before signing. Please complete the OTP step."*, *"selectedQuoteId is required for variations signing"*, *"selectedQuoteId is not part of this signing request"*, *"This signing link can no longer be trusted — the document has changed since it was sent. Please ask the studio for a fresh link."*, *"This signing link can no longer be trusted — a document has changed since it was sent. Please ask the studio for a fresh link."*, *"document_hash_mismatch"*, *"Failed to record signature"*.
- Reachable: yes.

### C-83 · What signing writes on the request
- Where: `submit/route.ts:269-329`.
- Entry: C-82.
- Does: `status: "signed"`, `signed_at`, `signature_data`, `signer_ip`, `signer_user_agent`, `signing_hash`, `signer_timezone`, `signer_phone`, `selected_quote_id` (variations), `document_acknowledgements` (server id + hash, client viewed / accepted times); audit `signature_submitted` `{ hashMatch, multiDocAcknowledgements, signerTimezone }` and `casetrust_acknowledged` when sent.
- Rules: the update is scoped by id and studio only (no status condition).
- Data: `quote_signature_requests`.
- States: —
- Words: —
- Reachable: yes.

### C-84 · What signing triggers
- Where: `submit/route.ts:331-780`; RPC `finalize_signed_mirror` (`307_finance_contract_freeze.sql:54-143`); Leads C-26, C-27; templates B-86, B-87.
- Entry: a recorded signature.
- Does: (1) `finalize_signed_mirror(lead, studio, quotes to mark)` — quotes → `client_signed` + `signed_at` once; for a base signing, other signed standard quotes of the lead → `approved`, the lead → `client_signed`, `contract_uploaded`, `contract_file_name 'client-signed-quote.pdf'` and the funnel's SIGNED stage unless `PROJECT_STARTED`; a variation-only signing skips the lead; on RPC error a sequential fallback does the same and notifies the stage change; (2) the lead's `signed_at` TAT stamp (write-once); (3) each signed variation is bridged `approved` and its project's unsent milestone invoices rebalanced (Finance); (4) in the background: the executed PDF (templates B-86), copied as `signed-contract.pdf` onto every linked project without a contract file, the multi-document packet build, `quote.signed_by_client` (C-106), homeowner bells (C-109); (5) usage `quote_signed`; returns `{ success, signedAt }`.
- Rules: no `quote_status_history` row. `lead.status_changed` is dispatched only inside the fallback branch (`submit/route.ts:466`), so a normal (RPC) signing advances the stage without that notification — Leads C-26 reads it as always fired. Project creation is not triggered — the drawer offers it (Leads C-71).
- Data: `quotes`, `leads`, `projects.contract_file_*`, storage `signed-quotes`, `contract-files`.
- States: background failures are logged only.
- Words: —
- Reachable: yes.

### C-85 · The done page and the client's downloads
- Where: `SIGN:1319-1349`; `src/app/api/sign/[token]/packet/route.ts`; `download/route.ts`; templates B-87.
- Entry: after submit, or reopening a signed link.
- Does: a confirmation; when the request has documents, *"Download signed documents"* → the combined packet (`signed-documents.pdf`).
- Rules: packet and signed-PDF downloads need `status = signed` and a stored `signer_phone` — nothing else — so anyone holding the token can fetch them after signing. The single executed PDF has no link on this page.
- Data: `signed_packet_path`.
- States: —
- Words: *"Quote Signed!"*, *"You have successfully signed the quotation. Your interior designer will be in touch shortly to confirm next steps."*, *"Thank you for choosing <issuer>!"*, *"Download signed documents"*, *"You can safely close this tab."*; packet errors *"Quote not yet signed"*, *"Verify your phone to download the signed documents."*, *"No combined document packet for this signing."*, *"Failed to build signed packet"*.
- Reachable: yes.

### C-86 · The signature certificate
- Where: `src/components/leads/drawer-sections/signature-certificate.tsx:1-264`; `src/app/api/sign/certificate/[id]/route.ts:7-90`; mounts `multi-quote-section.tsx:518-531`, `quote-section.tsx:46-52`.
- Entry: under a signed primary quote in the drawer list (needs `leads.signature_request_id`), or the legacy card.
- Does: shows the signature image, *"Signed by"*, *"Date"*, *"Verification"*, *"Quote total"*; owners and admins also get *"Audit Trail"* (*"<n> events"*) with IP, device, *"Verified phone: <phone>"* and a legal-act line per country.
- Rules: `hashMatch` = `document_hash === signing_hash`; for a document-walk signing `signing_hash` is the hash of the document hashes (C-82), so it never equals `document_hash` and the certificate reads *"Document may have been modified after signing"* for every such signing (Uncertain). The forensic fields are stripped server-side for other roles. Audit labels cover five events; others print their raw code (C-93).
- Data: `quote_signature_requests`.
- States: skeleton while loading; nothing when unsigned.
- Words: *"Signature Certificate"*, *"Digital signing evidence"*, *"Signed by"*, *"Date"*, *"Verification"*, *"Document integrity verified"*, *"Signed before integrity tracking was enabled"*, *"Document may have been modified after signing"*, *"Quote total"*, *"Audit Trail"*, *"<n> events"*, *"Verified phone: <phone>"*; errors *"Signature request not found"*.
- Reachable: yes.

### C-87 · In flight — status pill and drift
- Where: `CFD:1110-1300`; `src/app/api/quotes/signature-requests/route.ts:47-113`; editor banner A-23.
- Entry: the dialog's **in flight** state.
- Does: *"Signing link sent"* to the client on the send date, a *"Pending"* / *"Viewed"* pill, the link with *"Copy"* and *"WhatsApp"* (a `wa.me` message to the request's phone, else the form's, else the lead's), *"Resend email"* (C-88) and a menu (*"Regenerate link"*, *"Cancel signing"*). A drift banner shows when the live lines differ from the snapshot by id, qty, unit price, line discount or marker (single mode only).
- Rules: drift ignores header, schedule and design edits; the editor shows its own in-flight banner (A-23). No last-viewed time or expiry countdown is shown.
- Data: latest request summary + `content_drifted`.
- States: —
- Words: *"Signing link sent"*, *"to <name>"*, *"on <date>"*, *"Viewed"*, *"Pending"*, *"This quote was edited after the link was sent."*, *"Regenerate to push the latest version — the client currently sees the snapshot from <date>."*, *"Signing link"*, *"Copy"*, *"Link copied"*, *"Couldn't copy — copy manually"*, *"WhatsApp"*, WhatsApp text *"Hi <name|there>, please review and sign your quote here: <url>"*, *"No phone number on file"* — *"Opening WhatsApp — pick the contact manually, the message is prefilled."*, *"Cancels the current link."*, *"Rolls back the quote to Approved."*
- Reachable: yes.

### C-88 · Resend
- Where: `src/app/api/quotes/resend-signature/route.ts:20-164`; `CFD:1238-1258`; `LDD:2015-2037` (legacy card *"Resend Link"*).
- Entry: *"Resend email"* (dialog), *"Resend Link"* (legacy card, with a browser confirm).
- Does: finds the lead's newest `pending` / `viewed` request; when it has a frozen total, re-sums the current lines of its quote(s) and refuses when they differ by more than 0.5; re-dispatches `quote.signature_requested` with the same token (dedupe skipped).
- Rules: the check compares the frozen `quote_total` (the quote's canonical total — discount and GST rule applied) with a plain sum of line totals, so a quote with a document discount or with optional lines left out of the total reads as changed (Uncertain). Expiry is not checked or extended. Only the lead's email receives it; no SMS or WhatsApp to the client.
- Data: C-105.
- States: *"Resending…"*.
- Words: *"leadId is required"*, *"Lead not found"*, *"Failed to look up signing request"*, *"No active signing link found. Generate a new link instead."*, *"Failed to verify the quote is up to date"*, *"This quote has changed since the link was created. Generate a new signing link so the client signs the current pricing."* (`snapshot_diverged`); toasts *"Email resent to <name>"*, *"Couldn't resend"*; legacy *"Resend the existing signing link to <lead>?\n\nThe client will get a fresh email pointing at the same link. Use "Open Contract Flow" instead if you need to change client details or issue a new link."*, *"Signing link resent to <lead>"*, *"No active signing link — opening Contract & Signing"*, *"Failed to resend signing link"*.
- Reachable: yes.

### C-89 · Regenerate
- Where: `CFD:1874-1925`; `request-signature/route.ts:95-101, 673-709, 914-925`.
- Entry: in-flight menu *"Regenerate link"* → confirm.
- Does: posts a new request with `regenerate: true`: the old link is cancelled (410), a fresh token, snapshot, total, hash, schedule and 7 days are frozen, the canonical PDF is re-rendered and overwritten (VOs always), and the drawer re-shares the legacy PDF when canva is off.
- Rules: the body carries the request's client name but the **form's** phone (re-seeded from the lead's phone after a close) and no `documents` or composed contract — so the new link auto-composes quote + default T&C + default contract, whatever the original carried (C-72).
- Data: C-64.
- States: —
- Words: *"Regenerate the signing link?"* — *"This cancels the current link — the client will need the new URL. Use this when the previous link wasn't received or after editing the quote."* — *"Regenerate link"*; *"New signing link generated — old link is no longer valid."*, *"Couldn't regenerate the link"*.
- Reachable: yes.

### C-90 · Cancel signing
- Where: `src/app/api/quotes/cancel-signature/route.ts:25-125`; `CFD:1926-1950`.
- Entry: in-flight menu *"Cancel signing"* → confirm.
- Does: cancels the lead's newest `pending` / `viewed` request (audit `cancelled`), returns its quotes at `sent_for_signature` to `approved`, and resets the lead mirror (only when it reads `sent_for_signature`) to `approved` with `signature_request_id` null.
- Rules: the way back to editing a sent quote is Cancel then Revise (C-08). No history row; the canonical PDF and portal share stay.
- Data: C-09.
- States: —
- Words: *"Cancel the signing request?"* — *"The link will stop working immediately and the quote rolls back to Approved. You can send a fresh link later from the same dialog."* — *"Cancel signing"*; *"Signing cancelled — the quote is back to Approved."*, *"Couldn't cancel the signing request"*; route *"No active signing link to cancel."*, *"Failed to look up signing request"*, *"Failed to cancel signing request"*.
- Reachable: yes.

### C-91 · The paper paths (touchpoint)
- Where: `CFD:313-352, 1336-1790`; Contracts audit.
- Entry: *"Upload an already-signed PDF"*, *"Compose a contract first"*.
- Does: upload — drop or browse a PDF / DOC / DOCX, *"Save signed contract"* files it on the lead and marks the lead's contract uploaded (drawer); compose — pick a contract template (or blank), edit with a live preview, then *"Send for signature"* (C-72), *"Download as PDF"*, *"Send to client"* (email, C-108) or save as a template.
- Rules: a paper contract changes no quote status — the quote stays `approved` and the deal can still close (Leads C-03); *"Max 10 MB"* is copy only (the dialog checks the type).
- Data: lead files; `leads.contract_uploaded`, `contract_file_name`.
- States: *"Uploading…"*.
- Words: *"Attach a signed contract"*, *"Drop the PDF the client signed, or browse to pick from disk."*, *"Back to digital signing"*, *"Save signed contract"*, *"Replace"*, *"Drop a PDF here"*, *"— or —"*, *"Browse files"*, *"PDF, DOC, or DOCX. Max 10 MB."*, *"Please upload a PDF or Word document"*, *"Failed to upload contract file"*; drawer toast *"Contract uploaded successfully"*.
- Reachable: yes.

### C-92 · Signing inside the homeowner portal (touchpoint)
- Where: `submit/route.ts:98-139`; `src/lib/homeowner-binding.ts:540-570`; portal audit (`/my/engagement/[linkId]`, not read).
- Entry: the homeowner bell *"Ready for your signature"* → the engagement page's signing wizard.
- Does: the portal posts to the same submit route; a logged-in homeowner linked to the lead counts as phone proof, so no OTP step.
- Rules: preview sessions cannot sign.
- Data: `homeowner_project_links`.
- States: —
- Words: —
- Reachable: yes (portal).

### C-93 · The signing audit trail
- Where: `src/lib/audit-trail.ts:24-60`; writers `request-signature/route.ts:696-705, 734`, `api/sign/[token]/route.ts:75-82`, `request-otp/route.ts:108-113`, `verify-otp/route.ts:123-128`, `submit/route.ts:180-188, 212-240, 305-330`, `cancel-signature/route.ts:76-80`, `records/[id]/route.ts:293-305`.
- Entry: —
- Does: appends `{ event, timestamp, ip?, userAgent?, actor_user_id?, reason?, metadata? }` to `audit_trail` (RPC `append_signature_audit_event`, read-modify-write fallback): `link_created`, `link_opened` (every page load, signed links included), `otp_requested` (+ phone), `otp_verified`, `signature_submitted`, `casetrust_acknowledged`, `signature_refused_hash_mismatch`, `cancelled` (studio or quote deleted), `cancelled_for_regenerate`, `cancelled_superseded`.
- Rules: fire-and-forget. Only owners/admins can read it (C-86); the certificate names five of the events; the signed packet adds its own audit page (templates B-87).
- Data: `quote_signature_requests.audit_trail`.
- States: —
- Words: *"Signing link created"*, *"Link opened by client"*, *"OTP verification requested"*, *"Phone number verified via OTP"*, *"Signature submitted"*.
- Reachable: yes.

---

## Payment schedule

### C-94 · The milestone shape and the four "defaults"
- Where: `src/types/app.ts:950-962`; `QDD:214-225`; `request-signature/route.ts:33-41`; `src/lib/quote-canva/render-quote-pdf-server.ts:139-162` (templates B-63); `src/components/projects/project-create-drawer.tsx:205-210`; `scripts/migrations/062_seed_chart_of_accounts.sql:87-95`; `src/components/finance/PaymentScheduleEditor.tsx:70-80`.
- Entry: —
- Does: a milestone is `{ id, name, type?, percent, amountCents?, trigger?, notes? }`; a missing `type` means percent.
- Rules: four different defaults — (1) editor, PDF and project form: *"Deposit"* 10 % *"Upon signing"*, *"Commencement"* 30 % *"Works commence"*, *"Mid-Project"* 30 % *"50% completion"*, *"Completion"* 30 % *"Handover"*; (2) the signing snapshot's last resort: the same names and percents with trigger codes `deposit`, `start`, `midway`, `handover`; (3) the seeded studio template *"Standard 4-Stage"*: *"Deposit"* 10, *"Commencement"* 40, *"Mid-Project"* 40, *"Final Payment"* 10 with codes `contract_signed`, `work_started`, `milestone_completed`, `project_completed`; (4) Accounts' *"New Template"* pre-fills the same 10/40/40/10. The editor once stamped default (1) on every quote, so a stored schedule equal to it is treated as "unset" (C-95).
- Data: `quotes.payment_schedule` (D-01).
- States: —
- Words: as above.
- Reachable: yes.

### C-95 · Where a quote's schedule comes from when opened
- Where: `QDD:1131-1186`; resets `QDD:2754, 3123, 4741`; `src/lib/queries/finance.ts:317-360`.
- Entry: opening the editor.
- Does: studio default = the **first** `is_default` template (by creation) mapped to percent milestones `pm-default-<i>` whose trigger is the template's trigger **code**. The quote's saved schedule is shown unless it is empty or equals the platform default exactly (names and percents) — then the studio default (else the platform default) is shown. Starting over (new start, template reset) resets to the studio default.
- Rules: every viewer sees the same resolved schedule; the permission only gates editing (C-96). The shown schedule is written back only when the layout autosave fires (`QDD:2507-2540`) — when the quote has any layout content (doc sections, brand overrides, styles) or the schedule was edited — so a quote with neither reaches signing with an empty `payment_schedule` (C-100). Template trigger codes (e.g. `contract_signed`) appear as the milestone's trigger text in the editor, on the PDF and on the signing page.
- Data: `payment_schedule_templates`.
- States: —
- Words: —
- Reachable: yes.

### C-96 · Editing the schedule inside a quote
- Where: `QDD:4154-4190` (handlers), `7603-7735` (card), `1128-1130` (`canOverridePaymentSchedule`), `2266`.
- Entry: the editor's left sidebar card *"Payment schedule"* — only when the quote has lines; never for VOs.
- Does: each row — number, name, percent (or an amount when fee-first is on), trigger / notes, and its computed amount; add (a blank percent row at 0), delete (hover trash), the $/% toggle (zeroes the other field); the header pill shows the percent sum (green when valid); the footer *"Total"* is the quote's canonical grand total (hand-off B).
- Rules: read-only when the quote is read-only (C-06) or the member lacks `payment_schedule.override` — role JSON, else tags: owner and admin yes, designer and accounting no; per-member overrides are not applied here (C-114). No reordering. The server accepts any schedule from anyone (C-99).
- Data: C-99.
- States: —
- Words: *"Payment schedule"*, title *"Add milestone"*, placeholders *"Milestone name"*, *"Trigger / notes"*, title *"Toggle fixed amount vs percent"*, *"$"*, *"%"*, *"Total"*.
- Reachable: yes.

### C-97 · Validation and the submit / approve gate
- Where: `src/lib/finance/milestone-schedule.ts:241-295`; `QDD:4192-4217, 9480-9515, 10503, 10523`.
- Entry: Submit for Review, Approve (footer, banner, confirm).
- Does: `validateMilestoneSchedule` — empty → invalid; fixed rows over the total → invalid; an all-fixed schedule must equal the total within one cent; percent rows must sum to 100 (± 0.01).
- Rules: blocks Submit and Approve for standard quotes that have at least one milestone (button disabled with a tooltip; the confirm paths toast and stop); a schedule with no rows is not checked; drafts save regardless; VOs are never blocked. No server validation: PATCH stores any schedule and `request-signature` freezes whatever is there.
- Data: —
- States: —
- Words: *"No milestones defined."*, *"Fixed milestones total <amount>, which exceeds the contract value."*, *"Milestones total <amount>, which doesn't match the contract value of <amount>."*, *"Percent-type milestones must sum to 100% of the remaining amount — currently <n>%."*, toast suffix *" Edit the milestones in the right sidebar and try again."*, fallback *"Payment schedule has remaining unallocated amount — edit the milestones in the right sidebar and try again."*, tooltip *"Payment schedule has remaining unallocated amount"*.
- Reachable: yes.

### C-98 · How milestone amounts are computed (rule; formulas hand-off B)
- Where: `milestone-schedule.ts:97-231`; print templates B-35, B-63.
- Entry: —
- Does: fixed rows keep their `amountCents`; percent rows share what is left; when the percents sum to about 100 the last percent row absorbs the rounding remainder; the displayed % is rebased on the total only when a fixed row exists.
- Rules: the base differs by surface — the editor's canonical grand total, the frozen `quote_total` at signing (C-100), the PDF's grand total (templates B-35).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-99 · Where the schedule is stored, and what locks it
- Where: drawer layout autosave `LDD:2808-2832`; standalone page `tools/quote-digitizer/page.tsx:200-230`; `records/[id]/route.ts:123`; `QDD:2424-2589` (autosaves skip read-only), `4228-4233` (explicit save); legacy `leads.quote_metadata.paymentMilestones`.
- Entry: edits in C-96.
- Does: `quotes.payment_schedule` is written by the layout autosave (together with doc sections and the per-quote `__layout`) through PATCH; the explicit save also copies `{ name, type, percent, amountCents, trigger }` rows into the parsed-document metadata.
- Rules: nothing on the server locks it — PATCH takes it at any status; the project timeline sync rewrites it on approved quotes (C-103); the RPC restore rewrites it (C-39). Only the editor's read-only mode and the permission stop edits.
- Data: `quotes.payment_schedule`, `quotes.parsed_doc_metadata`.
- States: *"Couldn't save quote changes — please retry"*.
- Words: —
- Reachable: yes.

### C-100 · The schedule frozen at send-for-signature
- Where: `request-signature/route.ts:398-476`; `113_quote_payment_schedule_snapshot.sql`; `SIGN:1163-1195`; templates B-86; `milestone-schedule.ts:52-66`.
- Entry: C-67.
- Does: source = the request's primary (or first) quote's own schedule → the studio's default template → the last-resort snapshot default (C-94); rows normalized to `{ label, percentage, triggerEvent, type?, amountCents? }` (a row with no label and no money is dropped); amounts frozen from the frozen total. The signing page and the executed PDF read this snapshot.
- Rules: the template fallback selects `config, stages` and no `config` column exists (D-06), so a quote with no schedule of its own may be frozen with the 10/30/30/30 last resort (codes `deposit` … `handover`) instead of the studio's default (Uncertain). Bundle and variations use the primary's schedule. Later quote edits never reach a sent link; regenerate re-freezes.
- Data: `quote_signature_requests.payment_schedule`.
- States: —
- Words: C-76.
- Reachable: yes.

### C-101 · Accounts › Payment Schedules — the templates
- Where: `src/components/finance/PaymentScheduleEditor.tsx:1-426`; `src/app/api/finance/records/payment-schedule-templates/route.ts:26-124`; `accounts/page.tsx:128, 1406`; templates D-17.
- Entry: Accounts › Finance › *Payment Schedules*.
- Does: lists templates (default badge, a stage bar); *"New Template"*; edit name, stages (name, %, trigger from a fixed list, drag to reorder) and a *"Default"* checkbox; delete non-default templates with a confirm.
- Rules: stages must total exactly 100 and all be named; percent only — no fixed rows (C-102); several templates can be default (no exclusivity; quotes take the first by creation); the UI is read-only without `payment_schedule.override`, the API has no role gate (CSV row 35); triggers are stored as codes.
- Data: `payment_schedule_templates`.
- States: loading skeleton; empty *"No payment schedule templates yet"* — *"Create one to streamline invoice generation for new projects."*
- Words: *"Payment Schedules"* — *"Define reusable payment schedule templates for projects."*; *"New Template"*; *"Read-only — only owners/admins can override the payment schedule."*; *"Default"*; *"Edit"*; placeholders *"Template name"*, *"Stage name"*; triggers *"Contract Signed"*, *"Work Started"*, *"Milestone Completed"*, *"Project Completed"*, *"Custom Date"*; toasts *"Template name is required"*, *"Stages must sum to 100%, currently <n>%"*, *"All stages need a name"*, *"Template updated"* / *"Template created"*, *"Failed to save template"*, *"Template deleted"*, *"Failed to delete template"*; confirm *"Delete payment schedule template "<name>"? Existing invoices already generated from it are unaffected."*
- Reachable: yes.

### C-102 · Fee-first (fixed-amount) milestones
- Where: `milestone-schedule.ts:19-95`; `QDD:1191-1194`; `src/app/api/studio-config/features/route.ts:28-37, 45-53`; plans `docs/superpowers/plans/2026-08-25-fee-first-milestones-{a,b,c,d}-*.md`; `FIXES-REPORT-ROUND2-fee-first-milestones.md`.
- Entry: the $/% toggle in C-96.
- Does: a fixed row (e.g. design fees) holds `amountCents` with percent 0 and is deducted before the percent split.
- Rules: on only when the global constant `FEE_FIRST_MILESTONES_ENABLED` (false) or the studio feature `feeFirstMilestones` (default false; API only, no toggle) is on. The module header lists consumers not ready for fixed rows (templates, invoice line types, the agent's invoice tool).
- Data: `studios.settings.features.fee_first_milestones`.
- States: —
- Words: —
- Reachable: behind flags (off).

### C-103 · The project side of the schedule (touchpoint)
- Where: `src/lib/projects/sync-timeline-to-quote-schedule.ts:59-125`; callers `src/app/api/projects/records/[id]/route.ts:137`, `.../timeline/route.ts:54`; `project-create-drawer.tsx:205-222, 369-371, 623-624`; `LDD:1870, 3384`; Finance audit.
- Entry: project creation; every Gantt save.
- Does: project creation takes the contract quote's schedule (else the studio default / platform default, which must total 100 %); afterwards the project timeline is the source — each timeline save mirrors its payment-bearing milestones (name as trigger) into the lead's primary standard quote (every eligible quote when none is primary), skipping variations and `sent_for_signature` / `client_signed` quotes, never wiping, skipping no-op writes. Milestone invoices are generated from the timeline, not the quote (Finance).
- Rules: an **approved** quote's schedule can change under it from the Gantt — only signing protects it.
- Data: `projects.timeline`, `quotes.payment_schedule`.
- States: non-fatal.
- Words: —
- Reachable: yes.

---

## Follow-ups and notifications

### C-104 · No quote-level follow-ups, due dates or reminders
- Where: repository search (no quote due date, follow-up or reminder field); `src/app/api/cron/*` (no signing job); Leads C-23, C-24.
- Entry: —
- Does: quotes carry no due date and raise no follow-up task; nothing chases a sent quote, reminds the client before a link expires, or tells the studio it expired. The only quote-driven tasks are QuoteApproval (C-20) and *"Revise rejected quote"* (C-25); follow-ups live on the lead.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-105 · `quote.signature_requested` — the send notification
- Where: `src/lib/notifications/events.ts:210-224`; `request-signature/route.ts:995-1022`; `resend-signature/route.ts:126-150`; `src/lib/notifications/templates/base/quotes.ts:67-89`; `templates/whatsapp.ts:25`; `src/lib/notifications/dispatch.ts:196-221, 354-392`.
- Entry: C-69, C-88.
- Does: category *quotes*, critical; internal recipients per the studio's Quotes notification settings (catalogue default owner + admin; the preference defaults are Leads C-63) by in-app, email and WhatsApp when enabled; an external email to `leads.email` (functional — always sent, deduped); variables `client_name`, `signing_link`, `quote_total` (studio currency), `studio_name`; a resend adds `is_resend` and skips the dedupe.
- Rules: dispatch sets `action_url` to the absolute `/leads?leadId=<lead>`, and the base template prefers `action_url` over `signing_link` for its card link and button — so the client's *"Review & sign"* opens the studio's lead page rather than `/sign/<token>` (Uncertain: a studio's custom template may differ). Internal recipients receive the same client-worded email. No email when the lead has no email; nothing by SMS or WhatsApp to the client.
- Data: `notifications`.
- States: —
- Words: title *"Quote Signature Requested: Lead: <name>"*; email *"Your quote is ready, <first name>."*, *"Your quote is ready for review and signature. Tap the button below to open it."*, badge *"Awaiting signature"*, fields *"Project"*, *"Total"*, label *"Quote ready"*, button *"Review & sign"*; WhatsApp *"Hi {{client_name}}, please review and sign the quote from {{studio_name}}: {{action_url}}"*.
- Reachable: yes.

### C-106 · `quote.signed_by_client` — the signed notification
- Where: `events.ts:199-209`; `submit/route.ts:700-735`; `quotes.ts:118-149`; `whatsapp.ts:24, 100-103`; `dispatch.ts:402-406`.
- Entry: C-84.
- Does: after the executed-PDF attempt, to the studio's Quotes recipients (catalogue default owner + admin; critical): in-app *"<client> has signed the quote[ for <total>]"*; email with *"↓ Download signed quote (PDF)"* → `/api/quotes/signed-quote/<request>` (studio login, templates B-87); WhatsApp template `quote_signed_internal`.
- Rules: no `externalEmail` is passed, so the client's confirmation email (Customer Notifications *"Send signing confirmation email to client"*, Leads C-65) never sends for this event. `quote_number` is `Q-<first 8 characters of the request id>`; `quote_total` = studio currency symbol + en-US grouping; the sender name is the issuing entity's.
- Data: `notifications`.
- States: —
- Words: *"<client> has signed the quote."*, badge *"Signed"*, label *"Quote signed"*, button *"Open lead"*, *"↓ Download signed quote (PDF)"*; WhatsApp *"Great news — {{client_name}} signed your quote for {{quote_total}}. View: {{action_url}}"*; label *"Quote Signed by Client"*.
- Reachable: yes.

### C-107 · Approval notifications are task notifications
- Where: `src/app/api/tasks/route.ts:165-250`; `events.ts` (no approval events for quotes); Leads C-62.
- Entry: C-20, C-25.
- Does: a submit notifies only the QuoteApproval assignee via `task.assigned` (*"Task: Approve …"*); a task rejection notifies the lead's assignee via the revision task's `task.assigned`.
- Rules: nothing on approval, nothing to the submitter on approve or reject, nothing to other listed approvers, and no "client viewed" notification (only the dialog's pill changes).
- Data: `notifications`.
- States: —
- Words: —
- Reachable: yes.

### C-108 · `contract.composed_sent` (touchpoint)
- Where: `events.ts:225-233`; `quotes.ts:91-110`; Contracts audit.
- Entry: the compose path's *"Send to client"* (C-91).
- Does: emails the composed contract to the lead's email and bells the studio.
- Rules: —
- Data: —
- States: —
- Words: *"Your contract is ready, <first name>."*, *"<studio> has sent you a contract. Tap below to open and review it."*, *"Contract sent"*, *"Open contract"*.
- Reachable: yes.

### C-109 · Homeowner portal bells (touchpoint)
- Where: `src/lib/homeowner-binding.ts:500-570`; `submit/route.ts:742-770`; portal audit.
- Entry: C-58, C-69, C-84.
- Does: share → `quote_shared` (*"A new quote was shared"* / *"Your studio shared a quote for you to review."*, → `?tab=finance` on project links, else `/my/engagement/<link>`); send → `signature_requested` (*"Ready for your signature"* / *"Your studio sent a quote for you to review and sign."*, → `/my/engagement/<link>`, lead-stage links included); signed → `contract_signed` (*"Contract signed"* / *"Your signed contract is now available in your portal."*, → `?tab=documents`) for project-linked homeowners only.
- Rules: only homeowners with an active link to the lead.
- Data: `homeowner_notifications`.
- States: —
- Words: as above.
- Reachable: yes.

### C-110 · Usage events
- Where: `request-signature/route.ts:1030-1037`; `submit/route.ts:773-779`; `src/lib/usage/track.ts`.
- Entry: C-69, C-84.
- Does: records `quote_sent` (studio, user, lead, request) and `quote_signed` (studio, no user, lead, request).
- Rules: —
- Data: usage store (not read here).
- States: —
- Words: —
- Reachable: yes.

---

## Permissions

### C-111 · Quote permission slugs and their defaults
- Where: `src/lib/access-control.ts:212-230, 245-352`; `src/components/accounts/role-editor.tsx:60-100, 150-170, 250-266`; `src/app/api/studio-config/role-permissions/route.ts`; Leads C-52, C-53.
- Entry: Accounts › Roles & Permissions (owner-only API).
- Does: `RolePermissions.actions.quotes { create, edit, submit_for_review, approve, send }` and `payment_schedule.override`; the role editor shows Quotes › *"Create"* / *"Edit"* / *"Submit for review"* / *"Approve"* / *"Send"* and Payment schedule › *"Override schedule on a quote (H9 / E3)"*. The editor's system-role seeds give Owner all four of create/edit/approve/send, Admin create/edit/send, Designer create/edit, Accounting none, and leave out `submit_for_review` and `payment_schedule` (so tags decide). A new custom role: create/edit on, the rest off. Tag fallback: owner and admin everything; designer denied approve, submit_for_review, send and `payment_schedule.override`; accounting nothing on quotes.
- Rules: the member's role is picked owner > admin > accounting > id. `PERMISSION_SLUGS` spells them `quote.submit_for_review` / `quote.approve` while the checks use entity `quotes` — the slug constants are unused.
- Data: `studio_roles.permissions`.
- States: —
- Words: as above.
- Reachable: yes.

### C-112 · What the server enforces for quotes
- Where: the routes cited in C-02, C-24, C-41, C-48, C-58, C-67, C-88 … C-90, C-101; `src/app/api/sign/certificate/[id]/route.ts:46-83`.
- Entry: —
- Does: every studio route checks the session and scopes by studio (RLS); the transition route requires an approver for approve / reject; the certificate strips forensic fields for non-owner/admin; the public signing routes check token, expiry, phone proof and archived leads.
- Rules: nothing checks `quotes.create`, `edit`, `approve` (outside the transition route), `send`, `submit_for_review` or `payment_schedule.override`: creating, editing, deleting, PATCHing statuses, task approve / reject, request / resend / cancel signature, portal sharing, preview links, schedule templates and workflow settings are open to any studio member.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-113 · Client-side gates
- Where: `access-control.ts:64-171` (route access); `LDD:303-308` (`guardedToolOpen`); C-18; C-96; C-101; `signature-certificate.tsx:86`.
- Entry: —
- Does: `/leads` and `/tools/quote-digitizer` for owner, admin, designer; the editor opens only when the tool page is enabled for the studio; approve controls by the approver rule; schedule editing and templates by `payment_schedule.override`; the certificate's audit trail by owner/admin; approval tasks listed to owners only.
- Rules: gates differ by surface (C-18).
- Data: —
- States: —
- Words: *"This tool is turned off for your studio"* — *"A studio owner can enable it in the workspace's page settings."*
- Reachable: yes.

### C-114 · Member overrides for quotes
- Where: `src/components/accounts/member-override-panel.tsx:24-48`; `role-permissions/route.ts`; Leads C-56.
- Entry: Team Members › a member › overrides.
- Does: workflow override *"Quote approval required"*; permission toggles Quotes › *"Submit for review"*, *"Approve quote"*, *"Send quote"*; Payment schedule › *"Override schedule on a quote"*.
- Rules: only the workflow override changes behaviour. The permission toggles are read by nothing — the role-permissions route returns the role's JSON without member overrides, and the editor's and templates' checks use that (C-31, C-96, C-101).
- Data: `studio_members.workflow_overrides`, `permission_overrides`.
- States: —
- Words: as above.
- Reachable: the panel yes; the permission toggles have no effect on quotes.

### C-115 · The Accounting role's reach
- Where: `access-control.ts:64-131, 249-313`; `finance/operations/page.tsx:654-658`; `quotes-table.tsx:416-640`; `accounts/page.tsx`; CSV row 14.
- Entry: —
- Does: no `/leads` or `/tools`; reaches Finance › Operations › *Contracts* — PDF previews of finalized quotes, and the editor for draft / submitted / rejected ones, where standard quotes can be submitted (no task), approved or rejected (C-28); VO editing and approval stay owner/admin; reaches Accounts (Quote Approval Rules, Workflow Rules, Feature Flags, Payment Schedules read-only).
- Rules: every quote API is open to its session (C-112). The CSV's "No access — the entire Quote Digitizer is restricted to owner/admin/id" holds for the lead pages only.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-116 · Role × quote action matrix (as implemented)
- Where: C-18, C-28, C-96, C-101, C-111 … C-115; `src/lib/access-control.ts:64-131`.
- Entry: —
- Does: the table below, per role as the code behaves today.
- Rules: server-side, only the transition route's approve / reject is restricted (C-112); every other cell is a UI rule.
- Reachable: n/a.

| Action | Owner | Admin | Interior Designer | Accounting | Listed approver (non-owner) |
|---|---|---|---|---|---|
| Open a lead's quotes / the editor | yes | yes | yes | only via Finance › Contracts | as their role |
| Create, edit lines, rename, clone, delete (status rules apply) | yes | yes | yes | edit via Finance › Contracts | as their role |
| Submit with approval on | lands `approved`, no task | `submitted` + task | `submitted` + task | `submitted`, no task (Finance list) | lands `approved` |
| Approve / reject in the drawer's editor | yes | only if listed | only if listed | — | yes |
| Approve / reject in the Finance list editor (standard) | yes | yes | yes (if reachable) | yes | yes |
| Approve / reject on the standalone page | yes | no | no | — | no |
| Approve / reject from Tasks | yes | task hidden | task hidden | task hidden | task hidden |
| Approve / reject a VO | yes | yes | no | no | as their tags |
| Revise | yes | yes | yes | — | yes |
| Send / resend / regenerate / cancel signing | yes | yes | yes | no UI | yes |
| Portal share, preview link | yes | yes | yes | no UI | yes |
| Edit a quote's payment schedule | yes | yes | no | no | as their role |
| Payment schedule templates | edit | edit | read-only UI | read-only UI | as their role |
| Workflow toggle, approver list, Approval Rules tab | yes | yes | yes | yes | yes |
| Certificate audit trail | yes | yes | no | no | as their tags |
| Restore a version | yes | yes | yes | — | yes |


---

## Docs vs code discrepancies

### C-117 · `docs/rules/leads.md` §Quote Status Values
- Where: `docs/rules/leads.md:359-367`.
- Does: the document says — `draft → submitted → approved | rejected → sent_for_signature → client_signed`; `submitted` "Creates a `QuoteApproval` task for owner review"; approved / rejected "Set by owner via task approval workflow".
- Rules: the code — approvers are owners **or** listed members, and an approver's submit skips `submitted` with no task (C-03); approval off skips review for everyone; most approvals are direct status writes, not task approvals (C-22, C-28); undocumented edges — `revise` (approved / rejected / sent → draft), cancel (sent → approved), stranded reset (sent → approved), the demotion of an older signed quote (signed → approved) (C-09).
- Reachable: —

### C-118 · `docs/rules/leads.md` §Quote Digitizer Dialog
- Where: `docs/rules/leads.md:347-356`.
- Does: the document says — a two-panel dialog (40 / 60) whose footer holds Total, *"Save as Draft"*, *"Submit for Review"* (creates a QuoteApproval task), *"Export & Send"*; access from the lead drawer and `/tools/quote-digitizer`.
- Rules: the code — the footer is *"Cancel"* · *"Download PDF"* · *"Submit for Review"* or *"Approve"* (A-27); saving is autosave plus the close prompt (A-13); there is no Export & Send; the editor also opens from Finance › Contracts and the VO editor (A-01).
- Reachable: —

### C-119 · `docs/rules/leads.md` §Quote Signing Flow
- Where: `docs/rules/leads.md:407-435`.
- Does: the document says — "Owner generates signing link"; statuses `pending/viewed/signed/expired`; "Review quote snapshot (read-only line items table)"; after signing "Lead's `quoteStatus` updated to `client_signed`"; four API routes.
- Rules: the code — any member sends (C-112); `cancelled` exists (C-64); the review shows the designed PDF and a line table only for optional add-ons (C-76, C-77); signing also moves the stage, stamps TAT, bridges VOs, renders and files the executed PDF and builds a packet (C-84); more public routes exist — `preview-pdf`, `download`, `packet`, `certificate`.
- Reachable: —

### C-120 · "`leads.quote_status` is a mirror, never the source"
- Where: `docs/rules/leads.md:369-383`; `103_quote_lifecycle_hardening.sql:140-205`.
- Does: the document says — three triggers on `quotes` derive the lead column from the primary quote.
- Rules: the code — migration 103 also installed a trigger on `leads` that copies the lead column onto the primary quote, and no migration drops it (C-10); the app itself writes the lead column directly in many places (C-04, C-09, C-27).
- Reachable: —

### C-121 · `docs/rules/leads.md` §Line-Item Comments
- Where: `docs/rules/leads.md:466-488`; comments route `:115-144`.
- Does: the document says — "When the quote's status is `approved`, line items are locked — no comment mutations allowed (server returns 409)."
- Rules: the code — true for `approved` only — the server still accepts comments on `submitted`, `sent_for_signature` and `client_signed` quotes, which the editor shows as locked (A-24).
- Reachable: —

### C-122 · Spec 2026-06-03 "Quote Version Diff" vs code
- Where: `docs/superpowers/specs/2026-06-03-quote-version-diff-design.md`; `docs/superpowers/plans/2026-06-03-quote-version-diff-plan.md`.
- Does: the spec says — capture points "status transitions + manual save" stay; restore brings back items, milestones, totals and hierarchy in one transaction and is permission-checked ("ID lacks `quotes.edit`"); totals in cents; a confirmation modal; migration test `187_…`.
- Rules: the code — versions are cut only by the close prompt's save (C-33) and never carry the hierarchy; the RPC restores lines, hierarchy and milestones but not totals or status, has no permission check, runs through a server route, and as written cannot complete (C-39); totals are stored in currency units; the confirm is a browser dialog; the drawer's items-only restore is still mounted (C-40); the diff also tracks `name` and milestone fields the spec omits, and misses milestone amounts (C-38); the migration test is `186_quote_versions_hierarchy.test.sql`.
- Reachable: —

### C-123 · Spec 2026-05-07 "H10 entity-aware quote signing" vs code
- Where: `docs/superpowers/specs/2026-05-07-h10-entity-aware-quote-signing-design.md` (+ plan).
- Does: the spec says — picker helper "Determines the UEN, GST status, and bank details on the signed PDF."; the signing page shows the entity's GST number and bank details; NULL `company_id` falls back to studio-only branding; the chip "Issued by · <entity>" in the drawer's Quote Section and the project Quote tab.
- Rules: the code — helper reads *"…on the signed quote."*; the signing GET never returns bank details or the GST number (M13), only name, GST flag, country and currency; a NULL `company_id` resolves through the default-entity ladder (R3-3); the chip sits on the Classic drawer's Quotes section, the project Contracts sub-tab and the signing page; the confirmation email's sender name is the entity's.
- Reachable: —

### C-124 · `docs/uat/customization-p6-uat.md` §4 multi-document signing vs code
- Where: `docs/uat/customization-p6-uat.md:11-80`.
- Does: the UAT says — a new link walks *"Document 1 of 3 — Terms & Conditions"* → contract → rich quote review, with a scroll-to-bottom gate that keeps the checkbox disabled; the template tab substitutes `{{client_name}}` on "Use Template".
- Rules: the code — the dialog always sends the picker's list, which starts with the quote alone, so default T&C and contract appear only if picked (auto-compose only on regenerate) (C-72); the live walk is the unified sequence with the quote inside it and *"Continue"* / *"Proceed to Sign"* (C-78); the legacy path's checkbox is always clickable; the compose editor keeps tokens raw and substitutes in the preview.
- Reachable: —

### C-125 · `docs/openmaison-v1-feature-requirements.csv` rows vs code
- Where: CSV rows 14, 27, 31, 35, 51.
- Does: the CSV says — row 14 — "duplicate a Previous Quote does NOT exist anywhere in code"; row 27 — a delegated approver can't see approval tasks; row 31 — workflow toggles ungated; row 35 — schedule templates' gate UI-only; row 51 — task routes bypass the VO approver check.
- Rules: the code — row 14 holds across leads but a same-lead *"Clone"* exists (C-46); rows 27, 31, 35 and the task-route half of 51 confirmed (C-18, C-17, C-101, C-24); row 14's "Accounting: no access" does not hold for Finance › Contracts (C-115).
- Reachable: —

### C-126 · In-code copy and comments that contradict the code
- Where: as cited.
- Does: (1) *"Approved — read-only. Future edits create a new version."* and *"Once approved the quote becomes read-only. Future edits will need to be made on a new version."* — nothing creates a version or a new quote; Revise reopens the same row (C-08, C-33). (2) The approval banner's comment says it is informational only and the buttons live in the footer — it renders Approve / Reject (`QDD:6941-6945`). (3) The signed dialog says *"Move the lead to SIGNED from the lead drawer to kick off project creation."* — the signature already moved it (C-84). (4) *"Quote rejected — submitter notified"* — no notification, and the quote stays submitted (C-26). (5) `MULTI_QUOTE_SIGNING_ENABLED`'s comment says the public page does not branch on `signing_mode` — it does (C-71). (6) The submit route's comment says the transition-route VO bridge lands `pending_client` — it lands `approved` (C-16). (7) The Feature Flags copy for the lock flag (C-63). (8) The version drawer's empty copy (C-33). (9) *"Resend email"* also re-notifies the studio and emails only when the lead has an email (C-88).
- Reachable: —

---

## Uncertain / not verified

1. **Trigger 103's reverse trigger** (`trg_sync_lead_to_primary_quote`) is in the migration set and never dropped, but which databases carry it is not visible; C-10, C-27 and C-120 describe its effect where present (e.g. the standalone page's per-save `draft` write reaching a submitted primary quote, `request-signature`'s lead write reaching the primary).
2. **The RPC restore** (C-39) is read from migration text: the missing `quote_id` (NOT NULL since 104) and the history columns that 157 never created should make it fail; the live function body may differ from the migrations; not executed.
3. **`payment_schedule_templates.config`** (C-100): no migration creates it, so the fallback read should error and fall to the platform default; not run against a database.
4. **The client's "Review & sign" link** (C-105) follows from `dispatch.ts:196-221` and the base template; a studio-authored template in `notification_templates` would override it; no email rendered.
5. **The certificate's integrity line** (C-86) is inferred from the two hashes' definitions; not observed on a real signing.
6. **Cancelled links at OTP and submit** (C-73, C-82): the routes do not check `cancelled`; whether a page already past the first load can still verify and sign after a cancel was not exercised.
7. **Resend's divergence check** (C-88): the claim that document discounts and excluded optional lines read as changed rests on `computeLineTotals` / `computeQuoteTotals` (hand-off B), not a test.
8. **The homeowner portal's signing wizard** (`/my/engagement/[linkId]`) and the portal's quote list were not read (portal audit).
9. **Executed PDF, packet and certificate page** internals are taken from templates B-86 / B-87, not re-read.
10. **VO flows** (`variation-orders-section.tsx`, bridge, rebalance, billing) were grepped, not read (Finance audit); the "creator never approves own VO" helper from CSV row 51 was not checked.
11. **CSV row 15's** "capped at 8 and prioritized by revenue impact" for AI insights was not found in the route read here (the prompt builder was skimmed, not read in full).
12. **`contract-value.ts`** and its use of `quotes.signed_at` (leads.md) were not read (Finance).
13. `src/app/sign/quote-xray/[token]` is the X-Ray share page, not quote signing — not read (X-Ray audit).
14. **The drawer's deal-won flag** and the Journey step card's quote actions are Leads C-09 / C-13, not re-read.
15. The **Quote Approval Rules seed shape** `{enabled, required_roles[]}` for the Flo tenant is from D-07, not re-read.
