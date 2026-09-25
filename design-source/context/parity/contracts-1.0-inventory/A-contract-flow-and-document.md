# OpenMaison 1.0 — Contracts inventory · Slice A: the contract flow and the contract document

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (B signing library / C after signing / D data) or an earlier audit, and only named here. Earlier audits: "quote-editor C-nn / D-nn" = `../quote-editor-1.0-inventory/C-lifecycle-and-client.md` / `D-data-model.md`; "templates A-nn … D-nn" = `../quote-templates-1.0-inventory/`; "Leads B-nn / C-nn" = `../leads-1.0-inventory/B-detail.md` / `C-engine-settings-touchpoints.md`; "B-nn" = this folder's `B-signing-library-and-page.md`. Abbreviations: `CFD` = `src/components/leads/contract-flow-dialog.tsx`; `LDD` = `src/components/leads/lead-detail-drawer.tsx`; `RS` = `src/app/api/quotes/request-signature/route.ts`; `RPDF` = `src/app/api/contracts/render-pdf/route.ts`; `STC` = `src/app/api/contracts/send-to-client/route.ts`; `PANE` = `src/components/leads/contract-preview-pane.tsx`; `SAN` = `src/lib/sanitize-contract-html.ts`; `H2P` = `src/lib/quote-html-to-pdf.ts`; `QC` = `src/lib/queries/contracts.ts`; `RTE` = `src/components/templates/RichTextTemplateEditor.tsx`. Emoji glyphs in UI strings are omitted from quotes.

## Vocabulary (where each word is defined)

- **Contract (1.0)** — there is **no contract record**. The word covers four different things: (a) a paper contract flagged on the lead — `leads.contract_uploaded` + `leads.contract_file_name`, the bytes a `lead_files` row (A-18); (b) a `type: "contract"` entry in a signing request's `documents` (`src/types/app.ts:1970-1990`; A-28); (c) the composed contract PDF emailed from the dialog — one more `lead_files` row (A-62); (d) the "executed signed contract" — the signed quote PDF `signed-quotes/{sigReqId}.pdf` (`docs/rules/leads.md:458`; templates B-86).
- **Contract & Signing dialog** — `CFD`, component `ContractFlowDialog`, title *"Contract & Signing"*; docs and tests call it "Contract Flow Dialog" (A-01).
- **Paper path** — `paperPath: "none" | "upload" | "compose"` (`CFD:136-143`): *upload* = attach an already-signed file (Path A), *compose* = write a contract from a template (Path B).
- **Contract template** — a `studio_document_templates` row with `type = 'contract'`, an HTML `body_html` with `{{token}}` merge fields, optional `company_id` (per-entity override), `is_default`, `is_active` (templates C-52, D-01).
- **T&C** — a `studio_document_templates` row with `type = 'tnc'`; it reaches a client only as a signing document (templates C-53; A-31).
- **Merge field / token / variable** — `{{snake_case}}` (`[a-z_]+` only); the editor stores it as a chip `<span data-variable="x">{{x}}</span>` (templates C-49).
- **previewVars** — the dialog's resolved map of the 11 contract tokens (`CFD:401-441`; A-39).
- **Signing request** — a `quote_signature_requests` row (quote-editor C-64); **signing document** — one `SigningDocument` in its `documents` (B vocabulary).
- **Picker path / auto-compose path** — the two ways `RS` builds `documents`: from the list the dialog sends, or — only when no list is sent — quote + default T&C + default (or composed) contract (`RS:531-632`; A-28, A-67).
- **Contract quote** — `resolveContractQuoteId` (`src/lib/leads/resolve-contract-quote.ts:52-72`): latest signed → primary → first (quote-editor C-52; A-48).
- **Issuing entity** — a `studio_companies` row; the lead's choice is `leads.company_id` (migration 154), a request's is `quote_signature_requests.company_id` (A-76).
- **Deal won / signed** — hand-off (Leads C-09, quote-editor C-12).

---

## Entry points

### A-01 · The dialog, its one mount and its props
- Where: `CFD:61-84, 105-119`; mount `LDD:3320-3364`.
- Entry: every entry in A-02…A-05 flips the drawer's `showContractFlow`.
- Does: one `ContractFlowDialog` is rendered permanently inside the lead drawer and shown by its `open` prop. Props from the drawer: `leadName = lead.name`, `leadPhone = lead.phone`, `leadId = lead.id`, `quoteId = activeQuoteId` (the quote last opened in the drawer, else undefined), `countryCode = lead.countryCode`, `quoteStatus` (passed, never read — `CFD:79-83, 116-118`), and three callbacks: `onContractUploaded(fileName)`, `onSignatureRequestCreated(token)`, `onSignatureLinkRegenerated()` (drawer behaviour: Leads B-73, quote-editor C-70).
- Rules: the dialog is not mounted anywhere else — no project page, quote editor, Tools page or finance surface opens it (grep of `ContractFlowDialog`: `LDD:29, 3320` only). The drawer passes `activeQuoteId`, not the drawer's own `scopedQuoteId` fallback (`LDD:339`), so a drawer opened on a plain `?openLead=` link sends `quoteId` undefined (A-11).
- Data: see A-08.
- States: —
- Words: title *"Contract & Signing"*; screen-reader description *"Get the approved quote signed — digitally via a secure link, or via a contract document."*; close button label *"Close dialog"*.
- Reachable: yes.

### A-02 · Entry points in the lead drawer
- Where: `LDD:1886` (Classic contract block), `LDD:1963-1967` (quote section), `LDD:2184-2185` (quote summary card), `LDD:2562` (conversion readiness), `LDD:1837-1842` (Journey step tool), `LDD:2019-2037` (legacy resend fallback).
- Entry: the lead drawer (Leads access rules: owners / admins see every lead, designers their assigned leads, accounting none).
- Does: every one of these opens the same dialog without arguments; the dialog decides what to show from the lead's data (A-08). The entries and their words are inventoried elsewhere: the Classic *"Signed Contract (Required)"* / *"Contract (Optional)"* block with *"Replace"*, *"Upload signed copy"*, *"Upload or create contract"* (Leads B-40); the quote list's *"Send for Signature"* and per-quote *"Manage →"* (the latter first sets `activeQuoteId` to that quote, `LDD:1964-1967`) (Leads B-59); the Journey summary card's *"Send for signature"* / *"Manage signing"* / *"Manage"* (Leads B-58); the readiness card's *"Upload now"* (A-04); the Journey step tool (A-03); the resend fallback (A-05).
- Rules: none of the entries is role-gated beyond the drawer itself, and none is behind a platform page flag (the digitizer's `guardedToolOpen` is not applied to the contract flow). The quote summary card's *"Contract"* row (*"On file"* / *"Signed quote"* / *"Not uploaded"*) is display-only (quote-summary-card.tsx:228).
- Data: —
- States: —
- Words: as cited.
- Reachable: yes.

### A-03 · The Journey step tool for "Contract" and "Signed"
- Where: `LDD:1827-1846` (`nativeToolForStep`).
- Entry: Journey mode (`features.leadJourneyMode`, default on — Leads C-08, C-58) → the active step card's tool menu on the `contract` or `signed` step.
- Does: both steps offer the same tool, which opens the dialog.
- Rules: the code comment says the wording copies the deal card so the two do not read as different actions. The `contract` step itself is marked done by `contractUploaded` or a `signatureRequestId` on the lead (Leads C-09) — so an uploaded paper contract (A-18) or any signing request ticks it.
- Data: `leads.contract_uploaded`, `leads.signature_request_id`.
- States: —
- Words: *"Send for signature"*.
- Reachable: yes (Journey mode).

### A-04 · Conversion readiness — "Upload now"
- Where: `src/components/leads/conversion-readiness-card.tsx:97-106`; `LDD:2540-2565`.
- Entry: the drawer's readiness panel (quote-editor C-55).
- Does: when the workflow toggle `contractRequired` is not `false`, the checklist shows a *"Contract uploaded"* item (detail = the file name or *"Uploaded"*) whose action opens the dialog.
- Rules: complete = `editContractUploaded || lead.contractUploaded` — a digitally signed lead reads complete because the drawer seeds the flag for `client_signed` leads (Leads B-40). The card hides when the lead already has a project.
- Data: `studios.settings.workflow.contractRequired` (Leads C-46).
- States: —
- Words: *"Contract uploaded"*, *"Uploaded"*, *"Upload now"*.
- Reachable: yes.

### A-05 · The legacy resend fallback and an entry that does not exist
- Where: `LDD:2019-2037`.
- Entry: the legacy quote card's *"Resend Link"* (quote-editor C-88).
- Does: after a browser confirm, `POST /api/quotes/resend-signature`; a 404 (no active link) toasts and opens the dialog.
- Rules: the confirm tells the user to use *"Open Contract Flow"* to change client details or issue a new link — no control with that label exists anywhere in the app (grep).
- Data: —
- States: —
- Words: *"Resend the existing signing link to <lead>?\n\nThe client will get a fresh email pointing at the same link. Use "Open Contract Flow" instead if you need to change client details or issue a new link."*; toast *"No active signing link — opening Contract & Signing"*.
- Reachable: yes.

### A-06 · Opening, closing and what survives a close
- Where: `CFD:281-310` (`handleOpenChange`), `CFD:667-672`, `CFD:700-707`, `CFD:1318, 1822`.
- Entry: any entry above; closing by the header close button, an outside click, or the *"Close"* buttons of the signed states.
- Does: Escape never closes (`onEscapeKeyDown` prevented). An **outside click** calls `handleOpenChange(false)`: `onClose()` then, 200 ms later, resets the uploaded file, template choice, recipient name / dial code / phone (back to the lead's), errors and touched flags, the generated URL, the entity choice, the paper path (back to `"none"`), the narrow-screen tab, the signing mode and the quote selection. The **header close button** and both *"Close"* buttons call `onClose()` directly and reset **nothing**.
- Rules: because the dialog stays mounted in the drawer, closing with the close button keeps everything in memory — reopening lands back on the compose editor with the same draft body, or on the upload screen with the picked file. Nothing is saved server-side (A-37). `editorHtml` is never cleared even by the reset; it is overwritten by the next *"Use Template"*.
- Data: component state only.
- States: —
- Words: *"Close"*.
- Reachable: yes.

### A-07 · Which surfaces cannot reach the contract flow
- Where: grep of `ContractFlowDialog`, `/api/contracts/`, `useRenderContractPdf`, `useSendContractToClient`.
- Entry: —
- Does: the composed-contract tools (compose, Download as PDF, Send to client) exist only inside the lead drawer's dialog. The project page's *"Contract/VO"* tab, the project Contracts sub-tab and `/api/projects/[id]/contract/*` list and download contract files but never compose one (hand-off C). The quote editor (digitizer) has no contract action; its entity picker comment claims the dialog "persisted it first" (A-78). Tools and Accounts have no contract compose surface.
- Rules: once a lead becomes a project, the only way back to the dialog is reopening the lead.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## The flow's states

### A-08 · The state machine and its precedence
- Where: `CFD:574-626`; loading `CFD:725-731`.
- Entry: every open.
- Does: picks one of eight states, first match wins: (1) latest signing request `signed` → **digitally-signed** (A-15); (2) latest request `pending` or `viewed` → **digital-in-flight** (A-14); (3) the lead (from the app's lead list) has `contractUploaded` **and** a `contractFileName` → **paper-signed** (A-16); (4) `paperPath = "upload"` → **upload-paper** (A-17); (5) `paperPath = "compose"` → **compose-paper** (A-21…A-38); (6) the lead's quotes still loading → **loading**; (7) no quote at `approved`, `sent_for_signature` or `client_signed` → **not-approved** (A-10); (8) otherwise **approved-choose-path** (A-12, A-13).
- Rules: a signed or in-flight digital request outranks a paper contract on file, and a paper contract on file outranks the paper paths — so once a file is on the lead, compose and upload are unreachable except through *"Replace"* (A-16), and once the client has signed digitally no paper contract can be attached from here. The paper paths sit above the approval gate only so a slow reload does not bounce an open compose; they are **entered** only from the approved state (A-13), so a lead without an approved quote cannot attach or compose a contract at all. The request's `expires_at` is not read: an expired link still shows as in flight until something loads it and flips its status (quote-editor C-73). A cancelled or expired latest request falls through to (3)…(8). Gating reads the lead's real `quotes` rows only; the lead-level `quote_status` mirror is ignored (quote-editor C-11; test `quote-approve-without-quote-row.test.ts:183-209`).
- Data: `GET /api/quotes/records?leadId=` (`useQuotesForLead`); `GET /api/quotes/signature-requests?leadId=&latest=1` (`useLatestSignatureRequestForLead`, newest row of any status, with `content_drifted`); the app context's `leads` list for `contractUploaded` / `contractFileName`.
- States: loading = a pulsing placeholder with the accessible name *"Loading quotes"*.
- Words: —
- Reachable: yes.

### A-09 · The header — lead and quote chips
- Where: `CFD:673-708`, `CFD:630-642`.
- Entry: every state.
- Does: shows the title, a lead chip (the lead's name) and, when quotes are selected, a quote chip: one quote → *"<quote number or label>[ · Primary] · <total>"*; several → *"<n> quotes · <combined total>"*.
- Rules: totals format as the lead-country currency symbol + the browser-locale number with 2 decimals (`CFD:638-642`); combined total = Σ `totalCents` of the ticked quotes. The chips follow the send form's selection even while composing.
- Data: `quotes.quote_number`, `label`, `is_primary`, `total_cents`.
- States: —
- Words: *"Contract & Signing"*, *" · Primary"*, *"<n> quotes · <total>"*.
- Reachable: yes.

### A-10 · Not approved — the only state without a paper route
- Where: `CFD:733-772`; `CFD:597-602`.
- Entry: A-08 (7).
- Does: two messages — zero quote rows vs quotes none of which is approved. Words and gate: quote-editor C-65.
- Rules: no upload or compose button is offered here, so a studio that signed on paper without an approved quote in the system cannot record the contract through this dialog.
- Data: `quotes.status`.
- States: —
- Words: quote-editor C-65.
- Reachable: yes.

### A-11 · Which quotes the dialog works with, and how the pick is seeded
- Where: `CFD:148-161, 597-599, 628-654`; `src/app/api/quotes/records/route.ts:75-82`.
- Entry: every open, before any state renders.
- Does: `selectableQuotes` = the lead's quotes at `approved`, `sent_for_signature` or `client_signed`. The selection starts empty and an effect seeds it once quotes load: when the drawer passed a `quoteId`, the seed is **that quote only if it is selectable**; when it passed none, the primary, else the first selectable quote.
- Rules: when the drawer's `quoteId` points at a quote that is not selectable (e.g. a draft option the designer last opened) nothing is seeded — with two or more selectable quotes the radio list lets the user pick; with exactly one, only the read-only *"Signing this quote"* card shows (no control), so the send button stays disabled with *"Pick at least one approved quote to send"* (quote-editor C-66 describes the fallback as "else the primary" — the code has no such fallback when a `quoteId` is passed). The effect re-runs only when the count of selectable quotes or `quoteId` changes and never overrides a non-empty selection. The records route returns every quote carrying the lead id, variation orders included (VOs carry `lead_id`, `src/components/finance/vo-editor/vo-editor-host.tsx:197-202`); the dialog does not filter `quote_type` (Uncertain 7). The selection feeds the header chip (A-09), the preview's `{{quote_total}}` (A-41) and the send form (A-12).
- Data: `quotes.status`, `is_primary`, `quote_type`.
- States: —
- Words: *"Signing this quote"*, *"(Primary)"*, *"Which quotes are being signed?"*, *"Select the quote you want the client to sign."*, *"Pick at least one approved quote to send"*.
- Reachable: yes.

### A-12 · The send form (touchpoint)
- Where: `CFD:777-1068`; `CFD:502-568`; `RS`.
- Entry: A-08 (8).
- Does: the digital-first form — client name, phone with dial code, the issuing entity (≥ 2 active entities, A-76), the documents picker, *"Send for digital signature"*. Inventoried in quote-editor C-66 (form), C-67…C-69 (the route), C-71 (bundle / variations, off), C-72 and Leads B-74 (the documents picker; library and picker internals → B).
- Rules: what this slice adds — the form's values (name, dial code, phone, entity, picked documents, quote selection) are **shared state**: the compose path's *"Send for signature"* sends them even though the form is not on screen (A-67); the entity choice here is also what the compose preview uses for `{{company_*}}` (A-44).
- Data: quote-editor C-66.
- States: quote-editor C-66.
- Words: quote-editor C-66.
- Reachable: yes.

### A-13 · The two paper-path buttons
- Where: `CFD:1070-1103`.
- Entry: the approved state, under the send form.
- Does: two buttons set `paperPath` to `"upload"` (A-17) or `"compose"` (A-21).
- Rules: offered only in the approved state (A-08, A-10). The code comment records the redesign's intent: digital is "the 95% case", paper is "reachable but de-emphasised".
- Data: —
- States: —
- Words: *"Need a different signing method?"*, *"Upload an already-signed PDF"*, *"Compose a contract first"*.
- Reachable: yes.

### A-14 · In flight — link, copy, WhatsApp, resend, regenerate, cancel (touchpoint)
- Where: `CFD:1110-1299`, `CFD:656-663`, confirms `CFD:1874-1949`.
- Entry: A-08 (2).
- Does: inventoried in quote-editor C-87 (status pill, drift, copy, WhatsApp), C-88 (resend), C-89 (regenerate), C-90 (cancel).
- Rules: what this slice adds — (1) the state renders only when a URL exists; after a reopen the URL is rebuilt as `window.location.origin + /sign/<token>` (`CFD:659-663`), while a fresh send shows the server's `signingUrl` (`NEXT_PUBLIC_APP_URL` or the request host, quote-editor C-69) — the two can differ on custom domains; (2) the state has no entity picker and no documents picker — Regenerate silently re-sends the form's hidden entity and phone (A-79) and no documents (so the new link auto-composes the default T&C and default contract, quote-editor C-89; A-28); (3) no composed contract survives a regenerate (A-68).
- Data: quote-editor C-87.
- States: quote-editor C-87.
- Words: quote-editor C-87…C-90.
- Reachable: yes.

### A-15 · Signed by client
- Where: `CFD:1304-1326`.
- Entry: A-08 (1).
- Does: a terminal card with *"Close"*. Words: quote-editor C-65.
- Rules: the sentence telling the studio to move the lead to SIGNED is stale for a digital signing — the signature already moved the stage (quote-editor C-84, C-126). No download, certificate or packet link is offered here (the certificate lives in the quote list, quote-editor C-86). The state wins over any paper file, so a digitally signed lead cannot receive an uploaded contract from this dialog.
- Data: latest `quote_signature_requests.status`.
- States: —
- Words: quote-editor C-65.
- Reachable: yes.

### A-16 · Signed contract on file (paper)
- Where: `CFD:1794-1840`; hidden input `CFD:713-720`.
- Entry: A-08 (3) — the lead carries `contract_uploaded = true` and a `contract_file_name`.
- Does: shows the stored file **name** and *"Replace"*, which opens the file browser (PDF / DOC / DOCX, type-checked, A-17); a picked file appears in a strip with *"Replace contract"* (uploads it, A-18) and a remove button (*"Remove"*); *"Close"*.
- Rules: renders only when the lead is present in the app's lead list (`currentLead &&`). The file name is not a link — there is no view or download of the contract from here. The sentence about moving the lead to SIGNED is accurate for this path: an upload moves no stage (A-20). A lead that was signed digitally also has `contract_uploaded = true` with the name *"client-signed-quote.pdf"* (written by `finalize_signed_mirror`, quote-editor C-84), but the digitally-signed state wins (A-08).
- Data: `leads.contract_uploaded`, `leads.contract_file_name`.
- States: *"Replace contract"* shows a spinner while uploading.
- Words: *"Signed contract on file"*, *"Replace"*, *"Move the lead to SIGNED from the lead drawer to kick off project creation."*, *"Close"*, *"Replace contract"*, *"Remove"* (accessible name).
- Reachable: yes.

---

## Attach an already-signed contract (Path A)

### A-17 · The upload screen — what it accepts
- Where: `CFD:1336-1424`, `CFD:313-332`, hidden input `CFD:713-720`.
- Entry: *"Upload an already-signed PDF"* (A-13) or the compose kebab's *"Already signed? Upload PDF"* (A-35).
- Does: a drop zone and *"Browse files"*; once a file is picked it shows the name, the size in MB to two decimals, *"Save signed contract"* (A-18) and *"Replace"* (clears the pick); *"Back to digital signing"* returns to the approved state. Words: quote-editor C-91.
- Rules: **browse** checks the MIME type against `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (input `accept=".pdf,.doc,.docx"`) and toasts on anything else — a Word file whose browser-reported type is empty fails the check. **Drop** does no check at all (`CFD:1362-1367` sets the file directly), so any type is accepted by drag and drop. No size is checked anywhere: *"Max 10 MB"* is copy only, and the upload route `src/app/api/storage/upload/route.ts` has no limit of its own (Uncertain 6). The copy says *"Drop a PDF here"* although Word files are accepted.
- Data: —
- States: *"Uploading…"* while saving; the save button is disabled meanwhile.
- Words: quote-editor C-91; size line *"<n.nn> MB"*.
- Reachable: yes.

### A-18 · "Save signed contract" — what an upload writes
- Where: `CFD:334-350`; `src/lib/queries/leads.ts:1644-1715` (`useUploadLeadFile`); `src/app/api/storage/upload/route.ts:22-63`; `POST /api/lead-files/records`; drawer `LDD:3328-3334`; autosave `LDD:1061-1124, 1256-1301`.
- Entry: A-17, or *"Replace contract"* in A-16.
- Does: (1) uploads the bytes to the private bucket `lead-files` at `<studioId>/<leadId>/<random uuid>.<ext>` through the tenant-guarded upload route; (2) inserts a `lead_files` row (`file_name` = the original name, `file_url` = the storage path, size, MIME; `studio_id` and `uploaded_by` stamped from the session); (3) writes a `lead_activity_log` row whose action is `contract_uploaded:<name>` **only when the file name contains "contract"** (any case), otherwise `file_uploaded:<name>` (`leads.ts:1686-1689`; best-effort); (4) calls `onContractUploaded(name)` and closes. The drawer then sets its edit state `contractUploaded = true` + `contractFileName = name`, clears the `contract` validation error, closes the dialog and toasts; its autosave (700 ms, flushed on drawer close) PATCHes `leads.contract_uploaded` and `leads.contract_file_name` (Leads C-03 whitelist).
- Rules: the contract "record" is the lead's two columns; the file itself is an ordinary lead file — nothing links the `lead_files` row to the flag except the file **name**. A failed upload toasts and keeps the dialog open. After a save the picked file stays in dialog memory (the close bypasses the reset, A-06), so reopening shows it again in A-16's *"Replace contract"* strip and a press uploads the same file a second time. The activity log prints the raw action string (`src/lib/transformers.ts:420-435` formats only member and commission actions).
- Data: bucket `lead-files`; `lead_files (lead_id, studio_id, file_name, file_url, file_size, mime_type, uploaded_by)`; `lead_activity_log.action`; `leads.contract_uploaded`, `leads.contract_file_name`.
- States: *"Uploading…"*.
- Words: toasts *"Failed to upload contract file"*, *"Contract uploaded successfully"*; activity rows *"contract_uploaded:<name>"* / *"file_uploaded:<name>"*.
- Reachable: yes.

### A-19 · Replacing a contract
- Where: `CFD:1809-1838`; `CFD:334-350`.
- Entry: *"Replace"* in A-16.
- Does: the same upload as A-18 with the new file; the lead's `contract_file_name` becomes the new name.
- Rules: the previous file is not deleted, archived or marked superseded — both stay in the lead's files; only the name on the lead changes. No confirmation, no history of which file was "the contract" before. What a project later reads as its contract (the lead file matched by `projects.contract_file_name`) is hand-off C (`src/app/api/projects/[id]/contract/list/route.ts:1-15`).
- Data: A-18.
- States: A-18.
- Words: *"Replace"*, *"Replace contract"*.
- Reachable: yes.

### A-20 · What an uploaded contract unlocks
- Where: `src/lib/leads/drawer-autosave.ts` (Leads C-03); `LDD:1056-1063`; `conversion-readiness-card.tsx:97-106`; `lib/leads/journey.ts` (Leads C-09).
- Entry: —
- Does: the lead flag satisfies (1) the SIGNED stage gate `requiresContract` when the workflow toggle `contractRequired` is on (default on, Leads C-46) — with an uploaded contract an `approved` quote suffices, without one only `client_signed` counts (Leads C-03); (2) the readiness item (A-04); (3) the Journey `contract` step (A-03).
- Rules: an upload changes **no** quote status and **no** stage — the quote stays `approved`, the studio moves the lead to SIGNED itself, which then auto-opens project creation (Leads B-19). The drawer ignores the phantom name *"client-signed-quote.pdf"* when deciding whether a real contract is uploaded (`LDD:1056-1063`). A composed contract that was downloaded or emailed (A-56, A-62) does **not** set the flag and never counts for any of these gates.
- Data: `leads.contract_uploaded`, `contract_file_name`; `studios.settings.workflow.contractRequired`.
- States: —
- Words: gate message *"A signed contract must be uploaded"* (Leads C-03).
- Reachable: yes.

---

## Templates in the flow

### A-21 · Where the flow's contract templates come from
- Where: `CFD:122`; `src/lib/queries/document-templates.ts:54-78`; `src/app/api/document-templates/records/route.ts:23-59`.
- Entry: *"Compose a contract first"* (A-13).
- Does: `useDocumentTemplates(undefined, "contract")` → `GET /api/document-templates/records?type=contract` (scoped client) → every **active** `contract` row of the studio, studio-wide **and** every entity's override (the `companyId` argument is omitted, which means "both"), ordered `is_default` first, then `name`.
- Rules: the list is not filtered by the dialog's issuing entity or the lead's entity — a multi-entity studio sees every entity's variant side by side, and each scope's default carries its own *"Default"* mark (A-26). Inactive rows are hidden. Query cache 60 s. The comment above the hook call says the mock `CONTRACT_TEMPLATES` list was replaced by this live query (P6 §4.8).
- Data: `studio_document_templates (id, company_id, type = 'contract', name, is_default, is_active, body_html, updated_at)` (templates D-01).
- States: while loading the list is empty, so the empty state (A-23) shows until rows arrive.
- Words: —
- Reachable: yes.

### A-22 · The template picker — read-only
- Where: `CFD:1432-1552`; test `src/__tests__/contract-template-flow.test.ts:45-78`.
- Entry: the compose state with no template chosen.
- Does: one card per template — name, *"Default"* when `is_default`, *"Updated <YYYY-MM-DD>"* (`updatedAt.slice(0, 10)`), *"Use Template"* (A-34); under the list, *"Manage templates in Accounts →"* (A-24) and *"Start from blank"* (A-25); *"Back to digital signing"*.
- Rules: no rename, clone, delete, set-default or preview here — those moved to Accounts › Document Templates in the redesign (test pins the absence of `useDeleteDocumentTemplate`, `deleteTplId`, rename / clone modes, and the kebab icons). The card shows no entity name, no preview of the body and no "used" count.
- Data: A-21.
- States: A-23 when empty.
- Words: *"Pick a contract template"*, *"Templates are managed in Accounts → Document Templates."*, *"Back to digital signing"*, *"Default"*, *"Updated <date>"*, *"Use Template"*, *"Manage templates in Accounts →"*, *"Start from blank"*.
- Reachable: yes.

### A-23 · No templates yet
- Where: `CFD:1447-1481`.
- Entry: A-22 with an empty list.
- Does: two choices — open Accounts (A-24) or compose from an empty body (A-25).
- Rules: migration 118 seeded only the studios that existed when it ran (templates A-77), so a studio created later has no *"Default Contract"* and lands here until it writes one.
- Data: —
- States: —
- Words: *"No contract templates yet"*, *"Create one in Accounts to reuse next time, or compose this contract from scratch."*, *"Create in Accounts"*, *"Start from blank"*.
- Reachable: yes.

### A-24 · The jump to Accounts
- Where: `CFD:1467, 1537`; `src/app/(main)/accounts/page.tsx:217-247`; `src/app/(main)/accounts/document-templates-tab.tsx:144-151`.
- Entry: *"Create in Accounts"* or *"Manage templates in Accounts →"*.
- Does: opens `/accounts?tab=document-templates&type=contract` in a **new browser tab**; the dialog stays as it was.
- Rules: Accounts reads `tab` but never `type`; the Document Templates overlay's inner tabs start on *"Quote PDF"* (`defaultValue="quote_pdf"`), so the user must click *"Contract"* themselves (the test only pins the URL string). A template created there appears in the dialog after the list refetches (60 s stale time or a window refocus). Every role that reaches `/accounts` (owner, admin, id, accounting — `src/lib/access-control.ts:126`) sees the Document Templates item (only *"Studio Health"* is owner-only in the menu); the editor itself is templates C-52.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-25 · Start from blank
- Where: `CFD:353-370, 1475, 1544, 1570-1577`.
- Entry: *"Start from blank"* (A-22, A-23).
- Does: uses the sentinel id `"__blank__"`: the editor opens with an empty body; the editor header reads *"Blank contract"* / *"Composing from scratch — save as a template when you're done"*; Download and Send pass `templateId: null` (A-56, A-62).
- Rules: no round-trip — the sentinel is resolved in the dialog. See A-36 for what counts as empty.
- Data: —
- States: all three footer actions disabled until the body is non-blank (A-36).
- Words: *"Blank contract"*, *"Composing from scratch — save as a template when you're done"*.
- Reachable: yes.

### A-26 · Per-entity contract variants in the flow
- Where: `CFD:122`; `RS:485-502`; `src/lib/queries/document-templates.ts:44-53, 96-120`.
- Entry: a studio with two or more entities that saved entity overrides in Accounts (templates C-52: *"Editing templates for"*).
- Does: nothing entity-aware happens with templates in this slice: the compose picker lists every scope's rows unlabelled (A-21); picking a template never switches the entity; and the signing route's default-contract lookup (A-28) filters `is_default` + `is_active` but **not** `company_id`.
- Rules: the resolver that does honour the entity → studio fallback (`useResolvedDefaultDocumentTemplate`, entity default → studio-wide default) is not used by the dialog or by `RS`. With a studio-wide default **and** an entity default of the same type, the signing lookup's `.maybeSingle()` meets two rows (Uncertain 3).
- Data: `studio_document_templates.company_id`; partial unique index one default per `(studio, COALESCE(company_id), type)` (templates D-01).
- States: —
- Words: —
- Reachable: yes (multi-entity studios).

### A-27 · The seeded "Default Contract" as the flow sees it
- Where: `scripts/migrations/118_seed_default_document_templates.sql:32-39`; templates C-52.
- Entry: A-22 (first card for seeded studios).
- Does: body *"<h2>Renovation Contract</h2><p>This Contract ("Agreement") is entered into on {{current_date}} between:</p><p><strong>Studio:</strong> {{studio_name}}<br/><strong>Registration:</strong> {{company_registration}}<br/><strong>Address:</strong> {{company_address}}</p><p><strong>Client:</strong> {{client_name}}</p><h3>Scope</h3><p>Per attached quotation, total: {{quote_total}}.</p><h3>Commencement</h3><p>Project starts: {{start_date}}.</p><h3>Termination</h3><p>Either party may terminate with 14 days written notice.</p>"* with `variables` `{client_name, studio_name, quote_total, current_date, start_date, company_registration, company_address}`.
- Rules: the row's `variables` map is never read by the flow (no required-token check). How its seven tokens resolve differs by surface (A-39…A-44): in the compose preview and the PDF all seven resolve or show a bracket placeholder; on the signing page (auto-compose path) `{{company_registration}}` and `{{company_address}}` become empty strings and `{{start_date}}` becomes today (B-13; A-43, A-44). "Per attached quotation" is only true on the signing page — the downloaded or emailed contract carries no quotation (A-49).
- Data: `studio_document_templates` seed row.
- States: —
- Words: as quoted.
- Reachable: yes (studios seeded by 118).

### A-28 · Default T&C and default contract at signing — the auto-compose path
- Where: `RS:478-632`; templates C-53; quote-editor C-68, C-72, C-89.
- Entry: `POST /api/quotes/request-signature` without a `documents` array — from the UI only *"Regenerate link"* (A-14).
- Does: loads the studio's `tnc` and `contract` rows with `is_default = true` and `is_active = true`; builds quote → T&C (`render: "html"`, scroll + accept, *"I have read and accept the Terms & Conditions."*, title = template name) → contract (`render: "html"`, scroll + accept, *"I have read and accept the Contract Agreement."*, **signature-bearing**); a composed `contractBodyHtml` replaces the default contract's body and title (*"Contract Agreement"*) — see A-68 for why that never happens from the UI. No contract → the signature moves to the last document. Merge fields: `substituteVariables` with five values (B-13).
- Rules: templates without `body_html` are skipped. No entity scoping of either lookup (A-26). The first send from the dialog always takes the **picker** path instead (the dialog always sends at least the quote), which does **not** add the default T&C or contract — so a studio's contract template reaches a client only through a regenerate (quote-editor C-72, C-124; P6 UAT TC-P6-4.1 expects it on every send).
- Data: `quote_signature_requests.documents` (`SigningDocument[]`); `studio_document_templates`.
- States: —
- Words: *"Terms & Conditions"*, *"Contract Agreement"*, *"I have read and accept the Terms & Conditions."*, *"I have read and accept the Contract Agreement."*
- Reachable: yes (regenerate only).

### A-29 · "Default Signing Flow" — stored, never read
- Where: `scripts/migrations/118_seed_default_document_templates.sql:41-46`; `src/lib/queries/document-templates.ts:8`; templates C-65.
- Entry: —
- Does: every seeded studio has a `signing_flow` row `config {"docOrder":["quote","tnc","contract"]}`.
- Rules: no code reads `docOrder` or any `signing_flow` row (grep: only the type unions and a comment) — the auto-compose order is hard-coded (A-28) and the picker order is the studio's per-send arrangement (B).
- Data: `studio_document_templates` `type = 'signing_flow'`, `config.docOrder`.
- States: —
- Words: —
- Reachable: no (dead data).

### A-30 · "Save as new template" from the compose editor
- Where: `CFD:244-253, 461-498, 1761-1771, 1849-1872`; `src/lib/queries/document-templates.ts:142-179`; `src/app/api/document-templates/records/route.ts:62-116`.
- Entry: the compose footer's ⋮ → *"Save as new template"*.
- Does: opens a name prompt pre-filled *"<template name> (custom)"*, or *"Custom Contract"* for a blank start; *"Save"* (or Enter) POSTs `{ type: "contract", name, bodyHtml: <editor HTML, tokens raw>, isDefault: false, variables: {}, config: {} }` — no `companyId`, so the new row is **studio-wide**; toast; the prompt closes.
- Rules: refuses an empty body (*"Nothing to save — open a template and make edits first"*) and a missing studio; *"Save"* is disabled while the name is blank, so *"Name is required"* is unreachable. The dialog never edits the template it started from — this is the only write back to the library, always a new row. The unique index `(studio, COALESCE(company_id), type, name)` turns a duplicate name into a 500 whose database message is toasted as is. No role check on the route: any studio member with the dialog can create contract templates. After the save, the template list refetches, which re-runs the "re-substitute" effect (`CFD:383-387`) and resets the dialog's body to the **original** template's HTML (empty for a blank start) while the editor still shows the edited text — the preview and the footer then act on the reset body until the next keystroke (Uncertain 4).
- Data: `studio_document_templates` insert (`studio_id` from the session).
- States: *"Save"* disabled while pending.
- Words: menu *"Save as new template"* — *"Reuse this body next time."*; prompt *"Save as new template"*, *"Choose a name to identify this contract template."*, *"Template name"*, placeholder *"e.g., Renovation Contract — SG"*, *"Cancel"*, *"Save"*; toasts *"Template saved"*, *"Nothing to save — open a template and make edits first"*, *"Studio not loaded — please try again"*, *"Studio not loaded"*, *"Name is required"*, *"Save failed"* (or the server message).
- Reachable: yes.

### A-31 · T&C from the flow's side
- Where: `CFD` (no `tnc` reference); `RS:485-493, 571-589`; B (library documents).
- Entry: —
- Does: the dialog has no T&C step, picker or composer. A studio's T&C reaches a client in exactly two ways: the default `tnc` template on a regenerated link (A-28), or a T&C the studio keeps as a **signing library** document and adds in the send form's picker (hand-off B).
- Rules: the Accounts *"Terms & Conditions"* templates (templates C-52) and the signing library are two separate stores that do not reference each other; per-entity T&C overrides are ignored at signing (A-26). A quote's own terms printed inside the quote PDF are the quote renderer's (templates B, hand-off).
- Data: `studio_document_templates` `type = 'tnc'`; `studio_signing_documents` (B).
- States: —
- Words: —
- Reachable: yes (as described).

---

## The body and its clauses (Path B — compose)

### A-32 · The compose editor — one rich-text body
- Where: `CFD:1553-1675`; `RTE:38-309` (templates C-48).
- Entry: *"Use Template"* (A-34) or *"Start from blank"* (A-25).
- Does: the contract is **one HTML body** edited in the shared rich-text editor, with a live preview beside it (A-53). The editor runs with its defaults except `minHeight 500`: the token palette is on (*"Show tokens"* toggle + an *"Insert:"* row), edits reach the dialog debounced by 250 ms and are flushed on blur.
- Rules: the *"Insert:"* row offers six tokens — `client_name`, `studio_name`, `quote_total`, `project_address`, `start_date`, `current_date`; the five `company_*` tokens are deliberately not insertable (`template-sample-data.ts:18-43`) but resolve when typed as `{{company_name}}` or present in a template. No `sampleValues` is passed, so chips in the editor show the **platform sample values** (*"John Tan"*, *"S$45,800"*, *"123 Bukit Timah Rd, #08-12"*, *"15 May 2026"*, today's long date) while the preview next to them shows the lead's real values.
- Data: `editorHtml` (component state).
- States: —
- Words: *"Insert:"*; insert buttons *"Client name"*, *"Studio name"*, *"Quote total"*, *"Project address"*, *"Start date"*, *"Current date"*; *"Show tokens"* / *"Showing tokens"*; other editor words templates C-48.
- Reachable: yes.

### A-33 · What the body can and cannot hold
- Where: `RTE:120-133, 170-300`; `package.json:79-94` (TipTap 3.22.5).
- Entry: A-32.
- Does: toolbar — undo, redo, bold, italic, heading 2, heading 3, bullet list, numbered list, horizontal rule, highlight (palette, stored `<mark data-color>`), text colour (palette, stored `<span data-color>`). TipTap 3's StarterKit additionally accepts headings 1–6, blockquote, inline code, code block, strike, underline, links and hard breaks from paste and keyboard shortcuts; pasted inline styles are dropped (`preserveInlineStyles` off).
- Rules: there are no tables (flattened on paste), images, page breaks, signature or date fields, clause library, numbered clause scheme, sections / outline, headers / footers, letterhead, attachments, comments or versions in the contract body. Which of the allowed marks survive the preview, the PDF and the signing page differs (A-55).
- Data: HTML string.
- States: —
- Words: button labels *"Undo"*, *"Redo"*, *"Bold"*, *"Italic"*, *"Heading 2"*, *"Heading 3"*, *"Bullet list"*, *"Ordered list"*, *"Horizontal rule"*.
- Reachable: yes.

### A-34 · "Use Template" — the body is copied with tokens raw
- Where: `CFD:353-387`; `src/components/templates/variable-node.tsx:195-212`; test `signing-multidoc.test.ts:442-455`.
- Entry: *"Use Template"* on a card (A-22).
- Does: sets the chosen template and copies its `body_html` into the editor **unchanged**; raw `{{x}}` literals are wrapped into chips when the editor loads. A template with no body opens an empty editor.
- Rules: substitution happens only in the preview and the PDF, never in the editor (the 2026-05-19 redesign reversed P6's "substitute `{{client_name}}` on Use Template", test comment). An effect re-copies the template's body whenever the template **list** changes (`CFD:383-387`) — see the reset in A-30. The editor does not re-read its value after mounting (no content-sync effect in `RTE`), so the only way to load a different template is back to the picker and pick again, which replaces the body without asking.
- Data: `studio_document_templates.body_html` (read).
- States: —
- Words: *"Use Template"*.
- Reachable: yes.

### A-35 · The editor's frame — header, quote chip, footer and ⋮ menu
- Where: `CFD:1555-1595, 1682-1785`.
- Entry: A-32.
- Does: a back arrow to the picker (*"Back to templates"*); the title (template name, *"Template"* if the row vanished, or *"Blank contract"*) and subtitle (*"Composing for this client"* or the blank-start line); a *"Quote: <total>"* chip whenever the preview's `{{quote_total}}` resolved (A-41); the footer — *"Send for signature"* (A-67), *"Download as PDF"* (A-56), *"Send to client"* (A-61) — and a ⋮ (*"More actions"*) with *"Save as new template"* (A-30) and *"Already signed? Upload PDF"* — *"Skip composing and attach the signed copy."* (switches to A-17).
- Rules: going back to the picker keeps the body in memory; switching to upload keeps it too (A-37).
- Data: —
- States: A-36.
- Words: as quoted.
- Reachable: yes.

### A-36 · Validation — what counts as empty, what is never checked
- Where: `CFD:462-465, 1689-1693, 1705, 1718, 1730, 1742`.
- Entry: the footer actions.
- Does: *"Send for signature"*, *"Download as PDF"* and *"Send to client"* are disabled while `editorHtml.trim()` is empty (plus *"Send to client"* without a lead email, A-61).
- Rules: a body typed then fully deleted is TipTap's `<p></p>` and counts as content — Download then produces a header-only PDF (`H2P:69` returns no elements for `<p></p>`) and Send to client emails it. Nothing checks for unresolved bracket placeholders (they print as written), for a quote on the lead, for required tokens (the template's `variables` map is unread, A-27) or for length.
- Data: —
- States: disabled buttons; no inline errors.
- Words: —
- Reachable: yes.

### A-37 · No drafts — the composed contract lives in memory only
- Where: `CFD:197-199, 281-310`.
- Entry: —
- Does: the body is component state of the dialog mounted in the drawer.
- Rules: it survives going back to the picker, switching to upload and back, and closing with the close button (A-06); it is lost on page reload, on closing the lead drawer, and when another template is picked. There is no autosave, no draft contract record and no per-lead list of contracts. The only persistence the flow offers: a new library template (A-30), a downloaded file on the user's machine (A-56) and a PDF in the lead's files after *"Send to client"* (A-62).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-38 · A composed contract is not linked to its template
- Where: `CFD:1709, 1734`; `QC:9-15, 48-52`; `RPDF:31-35, 49`; `STC:29-33, 47`.
- Entry: —
- Does: Download and Send to client post `templateId` (null for a blank start); neither route reads it — the hook's comment says "used only for the filename", but the filename does not use it (A-60).
- Rules: nothing records which template a sent contract came from, and the template's `last_used_at` is not stamped (the only bump route is for `quote_pdf`, `src/app/api/studio-config/doc-templates/bump/route.ts`). Editing a template later changes nothing already sent (the sent PDF is a file).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Merge fields

### A-39 · The 11 contract tokens, per surface
- Where: `CFD:401-441`; `RPDF:104-125`; `STC:81-102`; `RS:504-510`; templates C-50; B-13.
- Entry: the compose preview (A-53), *"Download as PDF"* (A-56), *"Send to client"* (A-62), a signing document (A-28, B-13).
- Does: each surface builds its own map:

| Token | Compose preview (dialog) | Download PDF / Send to client (server) | Signing documents (`RS`) |
|---|---|---|---|
| `client_name` | the send form's name, else the lead name, else *"[Client name — fill in the form]"* | `leads.name`, else *"[Client name]"* | the name typed in the send form |
| `studio_name` | the session's studio name, else *"[Studio name]"* | `studios.name`, else *"[Studio name]"* | `studios.name`, else *"Studio"* |
| `quote_total` | first selected approved-or-beyond quote (A-41), else *"[Quote total — pick a quote in the form first]"*; total ≤ 0 → *"[Quote total — pending pricing]"* | the **primary** quote, any status; ≤ 0 or none → *"[Quote total — pending pricing]"* | the request's frozen total |
| `project_address` | always *"[Project address — fill in on the editor or set on lead]"* | same | empty |
| `start_date` | `leads.key_collection_date`, else *"[Start date — set on lead]"* | same | today |
| `current_date` | today `YYYY-MM-DD` | same | today `YYYY-MM-DD` |
| `company_name` | the dialog's entity name → studio name → *"[Issuing entity]"* | the lead's entity (A-44) → studio name → *"[Issuing entity]"* | empty |
| `company_registration` | entity registration → *"[Entity registration number — set in Accounts]"* | same, lead's entity | empty |
| `company_gst_number` | entity GST number → *"[Entity GST number — set in Accounts]"* | same, lead's entity | empty |
| `company_country` | entity country code → the lead's country code | entity country code → lead's `country_code` (default `SG`) | empty |
| `company_address` | entity address → *"[Entity address — set in Accounts]"* | same, lead's entity | empty |

- Rules: fallbacks use `??`, so only a missing value gets a placeholder — an empty string (e.g. a blank registration number) prints blank. `company_country` prints the raw code (`SG`), although the sample value reads *"Singapore"*. The preview and the PDF are two separate implementations with the same fallback strings; the signing map has five keys only (B-13).
- Data: `leads (name, key_collection_date, country_code, company_id)`, `studios.name`, `studio_companies (name, registration_number, gst_registration_number, country_code, address, is_default, is_active)`, `quotes (total_cents, is_primary, status)`.
- States: —
- Words: the placeholders as quoted.
- Reachable: yes.

### A-40 · `{{client_name}}` — the form's name or the lead's
- Where: `CFD:209, 286-291, 417`; `RPDF:114`; `STC:91`.
- Entry: A-39.
- Does: the preview uses the send form's client name; the PDF and the email use `leads.name`.
- Rules: the form's name is seeded from the lead's name when the dialog mounts (i.e. when the drawer mounts) and re-seeded only by an outside-click close (A-06) — a name edited in the drawer meanwhile, or a name typed into the send form, changes the preview but never the downloaded or emailed contract. When the form name is blank and the lead name is `""`, the preview prints an empty string rather than the placeholder.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-41 · `{{quote_total}}` — four different "which quote" answers
- Where: `CFD:404-407, 411-421`; `RPDF:83, 116`; `STC:75, 93`; `RS:343-352, 504-507`; `src/lib/leads/resolve-contract-quote.ts`.
- Entry: A-39.
- Does: (1) compose preview — the first of the dialog's selected quotes that is `approved` / `sent_for_signature` / `client_signed` (the send form's pick, seeded as in A-11); (2) Download / Send to client — the lead's `is_primary` quote whatever its status (a draft or rejected primary prints its total); (3) signing documents — the sum of the request's quotes' `total_cents` (or a line re-sum) frozen at send (quote-editor C-68); (4) the drawer's lead-level totals — `resolveContractQuoteId` (A-48).
- Rules: on a lead with several options the preview and the downloaded PDF can name different totals, and nothing reconciles them. A total ≤ 0 shows the pending placeholder in (1) and (2) but prints as zero in (3). The header chip and *"Quote: <total>"* chip use (1).
- Data: `quotes.total_cents`, `is_primary`, `status`.
- States: —
- Words: —
- Reachable: yes.

### A-42 · `{{project_address}}` never resolves
- Where: `CFD:422-427`; `RPDF:117`; `STC:94`.
- Entry: A-39.
- Does: every builder returns the placeholder; the signing map omits it (empty).
- Rules: the code comment says the lead "doesn't carry a free-text address yet" — it does: `leads.property_address` (migration `188_leads_property_address.sql`), edited in the drawer as the property address (`LDD:1135`). The token is on the editor's insert palette, so every contract that uses it goes out with the bracket text or, when signed, a blank.
- Data: `leads.property_address` (unread here).
- States: —
- Words: *"[Project address — fill in on the editor or set on lead]"*.
- Reachable: yes.

### A-43 · Dates in the contract
- Where: `CFD:409, 428-434`; `RPDF:111, 118-119, 133-142`; `STC:88, 95-96`; `RS:505-510`.
- Entry: A-39.
- Does: `current_date` = `new Date().toISOString().slice(0, 10)` — the UTC calendar date as `YYYY-MM-DD` (before 08:00 in Singapore it is still yesterday); `start_date` = the lead's key-collection date **as stored** (the comment calls it "the friendliest approximation" of a start date until the lead is a project) in the preview, PDF and email, but **today** on the signing page; the PDF header's *"Issued <date>"* and the filename carry the same UTC date.
- Rules: no locale formatting — the long locale date of `substituteDocumentVariables` (templates C-49) is used by the Accounts preview, not by this flow. A contract previewed with a real start date will be signed showing today's date in that sentence.
- Data: `leads.key_collection_date`.
- States: —
- Words: —
- Reachable: yes.

### A-44 · The issuing entity inside the contract, per surface
- Where: `CFD:241-278, 408, 435-439`; `RPDF:68-101`; `STC:70-79`; `RS:504-510`; `src/lib/quote-canva/resolve-entity-paynow-qr.ts:107-114`.
- Entry: A-39.
- Does: preview — the entity picked in the send form (A-76); Download — `leads.company_id` when set (matched among **all** the studio's entities, inactive included; an id that does not match resolves to no entity), else `selectDefaultEntity` (active rows, `is_default` first, else the first by name) — the "Gap D" fix so the contract names the same company as the quote; Send to client — `leads.company_id` only, **no default fallback**, so a lead without an entity gets the studio's name and three placeholders; signing — none of the five tokens is substituted (empty).
- Rules: the dialog's entity choice never reaches the PDF or the email (the routes read the lead). One contract can therefore name up to four different issuers across preview, download, email and signing. The PDF's own header prints only the studio name (A-58), never the entity.
- Data: `leads.company_id`, `studio_companies`.
- States: —
- Words: —
- Reachable: yes.

### A-45 · The Variables popover
- Where: `CFD:443-459, 1620-1652`.
- Entry: *"Variables"* above the editor.
- Does: lists the 11 tokens in a fixed order with a label, the literal `{{key}}` and the resolved preview value; a bracketed value is shown as missing, an empty value as *"—"*.
- Rules: read-only — no insert, no jump to the field that fills it. Its labels differ from the editor's (*"Today's date"* vs the palette's *"Current date"*; *"Issuing entity"* vs the chip label *"Company name"*; *"Entity registration"* vs *"Company registration"*).
- Data: `previewVars`.
- States: —
- Words: *"Variables"*, *"What each token resolves to"*, *"Client name"*, *"Studio name"*, *"Quote total"*, *"Project address"*, *"Start date"*, *"Today's date"*, *"Issuing entity"*, *"Entity registration"*, *"Entity GST number"*, *"Entity country"*, *"Entity address"*, *"—"*.
- Reachable: yes.

### A-46 · Token grammar and unknown tokens, per surface
- Where: `src/lib/notifications/templates/substitute.ts:18-27`; `H2P:71-81`; `PANE:31-35`.
- Entry: —
- Does: the grammar is `{{[a-z_]+}}` everywhere. An unknown token (e.g. `{{project_name}}`) becomes an empty string in the preview and on the signing page, but prints **literally** in the PDF (the PDF replaces only the 11 known keys; a chip for an unknown name is rewritten to `{{name}}`).
- Rules: values are inserted without HTML escaping on every surface — markup inside a value is interpreted, then sanitized (preview, signing page) or parsed (PDF). Uppercase or digit tokens are never substituted (templates C-49).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-47 · Money formatting, per surface
- Where: `CFD:411-415, 638-642`; `RPDF:107-110`; `STC:84-87`; `RS:275-283`; `src/lib/region-config.ts:630-647`.
- Entry: —
- Does: preview and PDF — the currency symbol of the **lead's** country (`countryCode` prop / `leads.country_code`, default `SG`) glued to `toLocaleString(undefined, 2 decimals)` (browser locale in the preview, server locale in the PDF), e.g. *"S$52,385.01"*; signing — `formatCurrency` with the **studio's** country: region locale, a space after multi-character symbols, e.g. *"S$ 52,385.01"*.
- Rules: a lead in another country than the studio prints two different currencies between the composed PDF and the signed documents.
- Data: `leads.country_code`, `studios.country_code`.
- States: —
- Words: —
- Reachable: yes.

---

## Attachments and the quote

### A-48 · Which quote "the contract" belongs to — `resolveContractQuoteId`
- Where: `src/lib/leads/resolve-contract-quote.ts:1-72`; test `src/__tests__/resolve-contract-quote.test.ts:4-77`; users `LDD:339-352, 409, 1950-1954`.
- Entry: —
- Does: quote-editor C-52. The test pins: none or only VOs → null; the only standard quote regardless of status; signed beats primary; primary when nothing is signed; a VO is never returned; the latest `signed_at` wins; a quote with `signed_at` beats one without; `updated_at` breaks ties for pre-307 rows; one of several drafts rather than their union.
- Rules: used only by the drawer (its scoped quote for totals / line items, and the Revise target). The contract dialog, render-pdf, send-to-client and request-signature each pick their quote their own way (A-41). The comparator mirrors Finance's `resolveContractValueCents` (hand-off C).
- Data: `quotes (status, is_primary, quote_type, signed_at, updated_at)`.
- States: —
- Words: —
- Reachable: yes.

### A-49 · A composed contract carries no quote and no attachments
- Where: `src/lib/contracts/render-pdf.ts:73-97`; `STC:104-133`.
- Entry: Download (A-56), Send to client (A-62).
- Does: the PDF is the body alone under a one-line header; no quote PDF, line items, payment schedule, T&C or other file is appended or linked, and the email links only the contract PDF.
- Rules: the only quote data a composed contract can carry is `{{quote_total}}` (A-41). The seeded contract's *"Per attached quotation"* (A-27) is untrue for a downloaded or emailed contract. A signing request, by contrast, always carries the quote as its own signature-bearing document plus the picker's documents — but never the composed contract (A-67).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-50 · Other documents in a signing — the picker (hand-off B)
- Where: `CFD:163-186, 1032-1041`; `src/components/leads/signing/signing-document-picker.tsx`; Leads B-74; quote-editor C-72; B.
- Entry: the send form.
- Does: the studio adds signing-library documents, an inline PDF or inline rich text, and reorders; the quote is pinned (library, upload, hashes and the walk → B).
- Rules: what matters for this slice — the picker draws from the **signing library** (`studio_signing_documents`), never from the Accounts contract / T&C templates; a studio that wants its contract template in a first send has to recreate it as a library document. The picker's state is shared with the compose path's *"Send for signature"* (A-67). The pinned quote document the dialog seeds carries the drawer's `activeQuoteId` (or the literal `"quote"`) as its id — which the server keeps — and the accept label *"I have read and agree to this quotation"*, which the server replaces together with the content (`RS:535-547`; quote-editor C-68).
- Data: `SigningDocument[]` (B).
- States: B.
- Words: B.
- Reachable: yes.

### A-51 · What a contract cannot reference
- Where: `CFD:401-459`; templates C-50.
- Entry: —
- Does: the 11 tokens are the whole vocabulary.
- Rules: no token for the payment schedule or milestones, line items, quote number or validity, the designer ("prepared by"), the client's phone, email or ID number, the lead's property address (A-42), a signature or a signing date. The quote PDF's single-brace `{token}` family (`quote_number`, `client_phone`, `client_ic`, `prepared_by` …, templates C-50) is a different grammar and is not substituted in contracts.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-52 · The contract value tests (hand-off C)
- Where: `src/__tests__/contract-loader.test.ts:1-158`; `src/__tests__/contract-single-loader.test.ts:1-70`.
- Entry: —
- Does: `contract-loader.test.ts` tests Finance's `resolveProjectContract` / `resolveProjectContractsBatch` (signed base quote + client-direction VOs incl. legacy `client_positive`, vendor VOs excluded, GST fraction from the base quote else the lead's toggle × region rate, budget fallback, quotes read by lead **or** project, batch isolation, error fallback). `contract-single-loader.test.ts` is a source guard that seven server files use that loader, that reports use the batch loader, that margin alerts divide by the contract base, and that `resolve-contract-quote.ts` mentions `signedAt`.
- Rules: these test the **project's contract value**, not the contract document — hand-off C.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Preview and PDF

### A-53 · The live preview
- Where: `PANE:1-56`; `CFD:1663-1675`.
- Entry: the compose editor, beside the body.
- Does: `substituteVariables(editorHtml, previewVars)` then `sanitizeContractHtml`, rendered as HTML; it re-renders when the body changes (after the 250 ms debounce) or when any token value changes — so switching the send form's entity or quote changes the preview (A-39).
- Rules: the pane's docstring says it "Mirrors what the client will actually see once the studio hits Send" — it does not: the client receives the PDF (A-58, A-59), whose tokens come from other sources (A-40…A-47) and whose rendering keeps different marks (A-55); a signed copy shows the signing page's rendering (A-55) with the five-key substitution (B-13). An empty body shows a hint instead.
- Data: `editorHtml`, `previewVars`.
- States: empty → hint.
- Words: *"The preview shows up here as you type."*; pane captions *"Edit"*, *"Preview"*, *"— what the client sees"*.
- Reachable: yes.

### A-54 · `sanitizeContractHtml` — the shared allowlist
- Where: `SAN:1-48`; users `PANE:34`, `src/app/sign/[token]/page.tsx:1632, 1721`, `src/app/my/engagement/[linkId]/page.tsx:386`, `src/lib/signing/build-signed-packet.ts:271`.
- Entry: every HTML rendering of a contract or T&C except the PDF.
- Does: `sanitize-html` 2.17.3 with tags `h1`–`h6`, `p`, `br`, `hr`, `div`, `span`, `strong`, `em`, `b`, `i`, `u`, `s`, `code`, `pre`, `ul`, `ol`, `li`, `blockquote`, `a`; attributes `href`, `target`, `rel` on links and `class`, `style` on every tag; link schemes `http`, `https`, `mailto`, `tel` (a `javascript:` or `data:` href is dropped, leaving a bare link).
- Rules: any other tag is removed with its text kept — `mark` (highlight), tables, images — and every `data-*` attribute goes (`data-color` text colour, `data-variable` chips). `style` is kept with no `allowedStyles` list: parsed on a server every declaration survives; in a browser the library's postcss parse can fail, in which case the whole `style` attribute is dropped (Uncertain 5). Protocol-relative links pass (library default). Its comment records why it exists: the public signing page used to inject `content_html` unsanitized. No test exercises the allowlist (`contract-template-flow.test.ts:87-90` only checks that the pane mentions sanitising).
- Data: —
- States: empty input → empty string.
- Words: —
- Reachable: yes.

### A-55 · What survives where — editor, preview / signing page, PDF
- Where: `RTE:120-133`; `SAN:20-38`; `H2P:64-452`.
- Entry: —
- Does:

| In the body | Editor | Preview and signing page (`SAN`) | PDF (`H2P`) |
|---|---|---|---|
| Headings 1–3 | yes (toolbar: 2, 3) | yes | bold 14 / 11 / 10 pt |
| Headings 4–6 | paste only | yes | plain body text |
| Bold, italic, underline, strike | yes (underline / strike by shortcut) | yes | yes |
| Highlight `<mark data-color>` | yes | text kept, highlight lost | printed in the palette colour |
| Text colour `<span data-color>` | yes | text kept, colour lost | printed in the palette colour |
| Bullet / numbered list | yes | yes | yes, *"•"* / *"1."* rows |
| Nested list | yes | yes | collapsed into the parent item (A-59) |
| Horizontal rule | yes | yes | nothing printed |
| Blockquote, code block | shortcut / paste | yes | plain paragraph |
| Link | paste | `http(s)`, `mailto`, `tel` only | any scheme, underlined |
| Inline `style` | dropped on load | kept or dropped (A-54) | colour, font size (px × 0.75), font family mapped to Helvetica / Times-Roman / Courier, background |

- Rules: the same body therefore looks different in the preview, the downloaded PDF and the signed copy; highlight and colour — two of the editor's toolbar buttons — never reach a client in HTML.
- Data: —
- States: —
- Words: *"•"*, *"1."*.
- Reachable: yes.

### A-56 · "Download as PDF" — the dialog side
- Where: `CFD:1701-1725`; `QC:22-46, 88-98`.
- Entry: the compose footer.
- Does: POSTs `{ leadId, templateId, bodyHtml }` (the raw body, tokens unresolved) to `/api/contracts/render-pdf`; on success reads the blob, takes the filename from `Content-Disposition` (`filename="…"`, else *"contract.pdf"*), downloads it through a hidden link (the object URL is revoked after 1 s) and toasts.
- Rules: the server rebuilds every token (A-39) — nothing from the preview is sent. The studio keeps no copy: a download is not stored in the lead's files and leaves no activity. Errors toast the server's message or *"Render failed (<status>)"*. See A-60 for why this may always fail.
- Data: —
- States: *"Generating PDF…"*; disabled while pending or with an empty body.
- Words: *"Download as PDF"*, *"Generating PDF…"*, *"Contract PDF downloaded — share it with your client however you like."*, *"Couldn't render the PDF"*, *"Render failed (<status>)"*.
- Reachable: yes.

### A-57 · `POST /api/contracts/render-pdf`
- Where: `RPDF:1-156`; test `contract-template-flow.test.ts:112-136`.
- Entry: A-56.
- Does: session cookie `qanvast_session` → `verifySession` (401) → body `leadId` + string `bodyHtml` (400) → the lead by id **and** the session's studio (404) → in parallel the studio name, the studio's entities (ordered `is_default` desc, `name` asc) and the lead's primary quote total → the token map (A-39) → the PDF (A-58) → `200 application/pdf`, `attachment`, `Cache-Control: private, no-store`.
- Rules: `runtime = "nodejs"`; uses the **service-role** client (`createServerSupabase`) with explicit studio filters, not the scoped client the 2026-06-27 security baseline (1.0 `CLAUDE.md` §3) asks for; no role check and no lead-visibility check (a designer can render a contract for any lead id of the studio); no size limit on `bodyHtml`; nothing stored or logged; `templateId` ignored. The test pins only the auth call, the studio filter, the 400 message, the helper import and the attachment header.
- Data: `leads (id, studio_id, name, key_collection_date, country_code, company_id)`, `studios.name`, `studio_companies`, `quotes.total_cents` (primary).
- States: —
- Words: *"Not authenticated"*, *"Invalid session"*, *"leadId and bodyHtml are required"*, *"Lead not found"*, *"Failed to render contract PDF"*, *"Internal server error"*.
- Reachable: yes.

### A-58 · The contract PDF's page — `renderContractPdfBuffer`
- Where: `src/lib/contracts/render-pdf.ts:1-97`.
- Entry: A-57, A-62.
- Does: one `@react-pdf/renderer` document, A4, 56 pt margins, Helvetica 10 pt: a header row — *"Contract"* on the left; the studio name and *"Issued <YYYY-MM-DD>"* on the right; a rule — then the body (A-59) at 10 pt, line height 1.55.
- Rules: the header has no `fixed` prop, so it prints once at the top of page 1, although the option's comment says "every page" (Uncertain 2). The title is always *"Contract"* whatever the template is called. There is no logo, brand colour, issuing-entity letterhead (name, registration, GST, address), client block, page numbers, footer, signature or date lines, initials, witness block, quote or payment schedule. Server-only module (Node dependencies).
- Data: —
- States: —
- Words: *"Contract"*, *"Issued <date>"*.
- Reachable: yes.

### A-59 · How the PDF reads the body — `htmlToPdfElements`
- Where: `H2P:64-148, 160-278, 291-452`; test `src/__tests__/quote-html-to-pdf-nested.test.tsx`.
- Entry: A-58.
- Does: replaces the 11 known `{{keys}}`, rewrites leftover chips, splits the top level into blocks (`p`, `h1`–`h6`, `ul`, `ol`, `img`, `div`, `br`, `blockquote`; anything else becomes a paragraph), prints `h1`–`h3` bold, lists as marker rows, images as images and everything else as paragraphs; inline `strong` / `b`, `em` / `i`, `u`, `s`, `a`, `mark` (palette colour), `span` (palette colour, inline colour, font size, font family, background); strips any other tag; decodes `&amp; &lt; &gt; &quot; &#39; &nbsp;`; turns `<br>` into a line break.
- Rules: a **nested** list collapses into its parent item — an item "A" with a sub-item "A1" prints as one bullet *"AA1"* (the item pattern stops at the first `</li>`; checked with a copy of the pattern, `H2P:366-385`); `<hr>` prints nothing; `h4`–`h6`, blockquote and code blocks print as body paragraphs. The test file covers flat lists whose items wrap `<p>`, ordered numbering, stray tags and `<br>` — not sub-lists. The converter is shared with quote line descriptions (templates / quote-editor audits).
- Data: —
- States: `""` or `<p></p>` → no elements.
- Words: —
- Reachable: yes.

### A-60 · The download's filename — a header the runtime refuses
- Where: `RPDF:141-150`; `STC:120-121`; `QC:40-42`.
- Entry: A-56.
- Does: filename `Contract — <slug> — <YYYY-MM-DD>.pdf` (slug = the lead name lower-cased, runs of non-alphanumerics → `-`, trimmed; empty → `client`), sent as `Content-Disposition: attachment; filename="…"`.
- Rules: the name carries two em dashes (U+2014). A Web `Response` refuses header values with characters above 255 — on Node 24, `new Response("x", { headers: { "Content-Disposition": 'attachment; filename="Contract — …"' } })` throws *"Cannot convert argument to a ByteString because the character at index 31 has a value of 8212 which is greater than 255."* (checked outside the app). `NextResponse` extends `Response`, so the route's success return would throw into its catch and answer 500 *"Internal server error"* — *"Download as PDF"* would then never succeed (Uncertain 1: the route was not run). The same name is harmless in `STC` (a `lead_files` value and a URL-encoded signed-URL parameter).
- Data: —
- States: —
- Words: *"Contract — <slug> — <date>.pdf"*, *"contract.pdf"*.
- Reachable: yes (as far as the code goes).

---

## Sending

### A-61 · "Send to client" — the button
- Where: `CFD:1726-1752`; `QC:54-80`.
- Entry: the compose footer.
- Does: POSTs `{ leadId, templateId, bodyHtml }` to `/api/contracts/send-to-client`; on success toasts the recipient returned by the server.
- Rules: disabled while pending, with an empty body (A-36), or when the lead in the app's lead list has no email (A-75) — the title then says why. The recipient is always `leads.email`; the send form's name and phone are ignored; there is no subject, message, CC, preview of the email or other channel (no WhatsApp or copy-link for a composed contract — the download toast tells the studio to share the file "however you like").
- Data: —
- States: *"Sending…"*.
- Words: *"Send to client"*, *"Sending…"*, title *"This lead has no email on file"*, toasts *"Contract sent to <email>"*, *"Couldn't send the contract"*, *"Send failed (<status>)"*.
- Reachable: yes.

### A-62 · `POST /api/contracts/send-to-client`
- Where: `STC:1-210`; test `contract-template-flow.test.ts:138-161`.
- Entry: A-61.
- Does: session (401) → body (400) → the lead, studio-scoped (404) → no `leads.email` → 400 → the studio name, the lead's entity by `company_id` only (A-44), the primary quote total → the token map → the PDF (A-58) → upload to the private `lead-files` bucket at `<studioId>/<leadId>/contract-<epoch ms>.pdf` → a `lead_files` row (`file_name` = `Contract — <slug> — <date>.pdf`, `file_url` = the path, size, `application/pdf`, `uploaded_by` = the session user; a failure is logged and ignored) → a 7-day signed URL that downloads under that name → a `lead_activity_log` row `contract_sent:<file name>` (failure logged) → `dispatchNotification("contract.composed_sent", …)` without awaiting → `{ ok: true, recipient, fileUrl, fileId }`.
- Rules: service-role client, no role or lead-visibility check, no size limit (as A-57). The file is stored before anything is emailed, so every press leaves a new PDF in the lead's files — a resend is a new file, never a replacement. The emailed link dies after 7 days and cannot be refreshed from the email. The hook invalidates `["leads"]` and `["lead-files", leadId]`, but the lead files list is keyed `["leadFiles", leadId]` (`src/lib/queries/leads.ts:1624`), so the drawer's Files list does not show the new PDF until something else refetches it.
- Data: bucket `lead-files`; `lead_files`; `lead_activity_log (lead_id, action, performed_by)`; notification rows.
- States: —
- Words: *"This lead has no email on file — add an email before sending."*, *"Failed to render contract PDF"*, *"Failed to store contract PDF"*, *"Failed to create download link"*, *"Lead not found"*, *"leadId and bodyHtml are required"*, *"Not authenticated"*, *"Invalid session"*, *"Internal server error"*.
- Reachable: yes.

### A-63 · The email the client receives (touchpoint)
- Where: `src/lib/notifications/events.ts:21-26, 225-235`; `src/lib/notifications/templates/base/quotes.ts:92-113`; `src/lib/notifications/dispatch.ts:254-261, 354-399, 401-443`; `src/lib/notifications/channels/email.ts:48, 55-120`; `src/lib/notifications/dedupe.ts:40, 79`; quote-editor C-108.
- Entry: A-62.
- Does: event `contract.composed_sent` — category `quotes`, not critical, external type `functional` (always sent to the client; no customer opt-out), variables `client_name`, `studio_name`, `download_link`, `current_date`, `action_url` (required: `client_name`, `download_link`). Body: heading *"Your contract is ready, <first name>."*, intro *"<studio> has sent you a contract. Tap below to open and review it."*, a card titled *"Your contract"* (no quote number is passed) with the badge *"Awaiting signature"* and *"From"* = the studio (its *"Total"* field is empty — no total is passed), button *"Open contract"* → the signed PDF link; event label *"Contract sent"*.
- Rules: the email's **subject** is the dispatcher's title *"Contract Sent to Client: Lead: <lead name>"* and its text part *"Lead: <lead name>"* (`email.ts:106-112` uses `params.title` / `params.body`), from *"OpenMaison Notifs <updates@mail.openmaison.ai>"*, not the studio or the entity. The badge says *"Awaiting signature"* though a composed contract cannot be signed. With `RESEND_API_KEY` unset, or the address outside `NOTIFY_ALLOWLIST`, nothing is sent (a `pending` row is recorded) while the dialog still toasts success. A second identical dispatch within 120 s (same lead, same title and body) is suppressed for the client and the studio, so pressing twice stores two PDFs but emails once (Uncertain 8).
- Data: `notifications` rows (hand-off C).
- States: —
- Words: as quoted.
- Reachable: yes.

### A-64 · The studio's side of a send — bell and history
- Where: `events.ts:225-235`; `STC:169-198`; `dispatch.ts:277-290, 396-399`; `src/components/leads/drawer-sections/activity-log-section.tsx:30-38`; `src/lib/transformers.ts:420-435`.
- Entry: A-62.
- Does: owners and admins (the event's default recipient roles) get an in-app notification titled *"Contract Sent to Client: Lead: <name>"* with the body *"Lead: <name>"*, linking to `/leads?leadId=<id>`; the lead's activity log shows the raw action *"contract_sent:Contract — <slug> — <date>.pdf"* with the sender's name.
- Rules: the route's docstring promises "Contract sent: <filename> to <recipient>" — the stored action carries no recipient and is never formatted. The event's default recipients are owners and admins (`defaultRecipientRoles`); recipient resolution and per-studio notification settings are hand-off C. User stories describe the bell as "Contract sent to <client>" (`docs/user-stories/generic.md:29`, `docs/user-stories/detailed/generic.md:42`).
- Data: `notifications`; `lead_activity_log`.
- States: —
- Words: as quoted.
- Reachable: yes.

### A-65 · What a sent composed contract does not do
- Where: `STC:35-210`; `CFD:1729-1741`.
- Entry: —
- Does: nothing beyond A-62…A-64.
- Rules: no `contract_uploaded` flag, no quote or stage change, no signing request, no contract record, no follow-up task or reminder, no tracking of whether the client opened the link, and no way for the client to sign, accept or reply from the email. It never satisfies the SIGNED gate, the readiness item or the Journey `contract` step (A-20).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-66 · Finding a contract afterwards
- Where: `STC:118-157`; `src/app/api/projects/[id]/contract/list/route.ts:1-15, 66-88`.
- Entry: —
- Does: a sent composed contract is a lead file named *"Contract — <slug> — <date>.pdf"* (lead Files, hand-off Leads); a downloaded one exists only on the user's machine; an uploaded paper contract is a lead file whose name is on the lead (A-18).
- Rules: nothing in the lead drawer lists "contracts" as such. On a project, the contract picker lists the lead file whose name equals `projects.contract_file_name` (copied from the lead at conversion) — or, when that is empty, **every** file of the lead — plus project uploads and signed quotes (hand-off C). A composed contract never sets the lead's contract name, so it reaches a project only through that "every lead file" fallback.
- Data: `lead_files`; `projects.contract_file_name`.
- States: —
- Words: —
- Reachable: yes.

### A-67 · Compose "Send for signature" — what actually happens
- Where: `CFD:1683-1700, 502-568`; `RS:531-566`.
- Entry: the compose footer.
- Does: calls the send form's `handleGenerateLink` with `contractBodyHtml: editorHtml`; on success the dialog returns to the digital path and shows the link in flight.
- Rules: the request always carries `documents: signingDocs` (at least the pinned quote), so `RS` takes the **picker path**, which ignores `contractBodyHtml` — the composed contract never reaches the signing request, and the client signs the quote plus whatever the picker held (by default the quote alone) (quote-editor C-72). The code comments on both sides say the opposite (`CFD:1683-1685` "the composed contract becomes the signing contract document (alongside the default T&C), and the client reviews + signs it in the homeowner portal"; `RS:82-87`). The send uses the send form's hidden state — client name, dial code and phone (seeded from the lead), the quote selection, the entity and the picked documents — none visible from the compose screen: an empty phone toasts; a phone that fails the region rule sets an error shown only on the send form and returns **silently** (`CFD:525-529`); an empty quote selection sends no `quoteIds`, so the server falls back to the drawer's `quoteId` or the primary (quote-editor C-67). Unlike the send form's button it is not disabled for an invalid form or an empty selection. On success the drawer marks its active quote `sent_for_signature` (quote-editor C-70).
- Data: `quote_signature_requests` (quote-editor C-64).
- States: *"Sending…"*.
- Words: *"Send for signature"*, *"Sending…"*; toasts as quote-editor C-66.
- Reachable: yes.

### A-68 · `contractBodyHtml` on the auto-compose path — unreachable from the UI
- Where: `RS:73-89, 591-619`; `CFD:1884-1923`.
- Entry: —
- Does: when a request arrives **without** `documents` and with a non-blank `contractBodyHtml`, the composed body replaces the default contract as the signature-bearing *"Contract Agreement"* document (five-key substitution, B-13).
- Rules: the only UI call without `documents` is *"Regenerate link"*, which never passes `contractBodyHtml` (`CFD:1896-1906`); the dialog's own sends always pass `documents`. So no screen puts a composed contract into a signing request — only a direct API call could.
- Data: `quote_signature_requests.documents`.
- States: —
- Words: *"Contract Agreement"*, *"I have read and accept the Contract Agreement."*
- Reachable: no (from the UI).

---

## Statuses and permissions

### A-69 · There is no contract record — what 1.0 stores instead
- Where: `scripts/migrations/017_projects_and_leads_extended.sql` (`leads.contract_uploaded`, `contract_file_name`); `120` (`quote_signature_requests.documents`); `lead_files`; hand-off D.
- Entry: —
- Does: the four meanings of "contract" (vocabulary) live in four unrelated places: a boolean + a file **name** on the lead; a lead file; a JSON entry inside a signing request; the executed signed-quote PDF (`signed_pdf_url`) and packet (`signed_packet_path`, B).
- Rules: no contract id, number, status, version, parties, dates, template reference or author; one flag per lead, so a lead cannot hold two contracts (e.g. a main contract and an addendum) other than as loose files. The composed body is never stored as HTML anywhere (A-37).
- Data: as listed (hand-off D for columns).
- States: —
- Words: —
- Reachable: —

### A-70 · Where contract status shows, and its words
- Where: `CFD:1141-1161, 1311-1316, 1801-1807`; `quote-summary-card.tsx:212, 228`; `bucket-status-section.tsx:176-250`; `conversion-readiness-card.tsx:97-106`; `lib/leads/journey.ts`.
- Entry: —
- Does: the dialog (*"Signing link sent"* with *"Pending"* / *"Viewed"*, *"Signed by client"*, *"Signed contract on file"*); the Journey summary card's contract row (*"On file"* / *"Signed quote"* / *"Not uploaded"*, Leads B-58); the Classic contract block (*"Signed digitally — on file"*, *"Awaiting signature — client viewed the link"*, *"Sent for signature — awaiting client"*, *"Sent <d MMM>"*, Leads B-40); the readiness item (A-04); the Journey `contract` step (Leads C-09); the quote statuses *"Awaiting Signature"* / *"Client Signed"* (quote-editor C-01).
- Rules: every one of these reads the lead flag, the latest signing request or the quote status — a composed, downloaded or emailed contract has **no** status anywhere (no "draft", "sent", "viewed"). The dialog ignores `expires_at` (A-08).
- Data: `leads.contract_uploaded`, `contract_file_name`, `signature_request_id`; `quote_signature_requests.status`; `quotes.status`.
- States: —
- Words: as quoted.
- Reachable: yes.

### A-71 · Permissions — who can do what, as implemented
- Where: `src/lib/access-control.ts:100-133, 134-170`; `docs/rules/architecture.md:210-225`; routes as cited.
- Entry: —
- Does:

| Action | Who can, in practice | Server check |
|---|---|---|
| Open the dialog | anyone who can open the lead drawer — owners and admins every lead, designers their assigned leads, accounting none | — |
| Send for signature, regenerate, cancel, resend | same | session only; `quotes.send` not enforced (quote-editor C-112) |
| Upload a paper contract | same | session + the studio's path prefix (`/api/storage/upload`); session on `/api/lead-files/records` |
| Compose, preview | same | none (client-side) |
| Download as PDF, Send to client | same | session + the lead belongs to the session's studio; no role, no lead-visibility check (A-57, A-62) |
| Save as new template | same | session only; creates a studio-wide contract template (A-30) |
| Edit contract / T&C templates in Accounts | every tag that reaches `/accounts` (owner, admin, id, accounting — only *"Studio Health"* is owner-only in its menu) | templates A (roles) |

- Rules: there is no contract-specific permission slug (`PERMISSION_SLUGS` has none) and no approval step for a composed contract. The route matrix in `docs/rules/architecture.md:224` says Accounts is owner-only; the code allows all four tags (`access-control.ts:123-126`, comment "P1 UAT TC-2.2").
- Data: `studio_members.tags`.
- States: —
- Words: —
- Reachable: —

### A-72 · The H7 lock and the contract paths
- Where: `RS:235-249`; `src/__tests__/customization-p1.test.ts:141-168`; `docs/features/studio-customization/requirements.csv:21`; quote-editor C-63.
- Entry: —
- Does: with `features.lock_quote_actions_until_approved` on, request-signature refuses a quote below `approved` (403). The dialog itself shows the not-approved state rather than greyed-out buttons (test pins `"not-approved"`, *"Approve the quote before sending"*, `hasAnyApprovedQuote`, the empty-selection guard).
- Rules: render-pdf and send-to-client never read the flag; they are reachable only from the approved state anyway (A-08). The requirement says H7 "Hides share send-to-client download copy-link — anything that can leak quote"; for contracts the only thing that hides them is the approval gate, which holds whether or not the flag is on. The test's comment still mentions a fallback to `lead.quote_status` that the code removed (A-08).
- Data: `studios.settings.features.lock_quote_actions_until_approved`.
- States: —
- Words: *"Quote must be approved before sending for signature (studio policy)."* (quote-editor C-63).
- Reachable: behind flag `lock_quote_actions_until_approved`.

### A-73 · Hardening of the two contract routes
- Where: `RPDF`; `STC`; 1.0 `CLAUDE.md` "Security Architecture".
- Entry: —
- Does: both routes authenticate by the signed session cookie and filter the lead by the session's studio.
- Rules: both use the service-role client for every read and write (the baseline reserves it for storage and cross-tenant work); no rate limit; `bodyHtml` is unbounded and never sanitized server-side (the PDF parser strips unknown tags, and passes any link `href` through to the PDF); the emailed link is a bearer URL valid for 7 days to whoever holds it; the stored PDF sits in the private `lead-files` bucket. No test exercises either route's behaviour — `contract-template-flow.test.ts` matches source text only.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-74 · Flags and environment that change the flow
- Where: as cited.
- Entry: —
- Does: `MULTI_QUOTE_SIGNING_ENABLED = false` — a code constant, not a setting: one quote per link, `single` mode (`CFD:93-99`; quote-editor C-71); `features.lock_quote_actions_until_approved` (A-72); `features.leadJourneyMode` (the Journey entry, A-03); `workflow.contractRequired` (A-04, A-20); `RESEND_API_KEY`, `NOTIFY_ALLOWLIST` (whether *"Send to client"* emails anyone, A-63); `NEXT_PUBLIC_APP_URL` (the signing link's origin, A-14).
- Rules: no flag hides compose, upload, *"Download as PDF"* or *"Send to client"*.
- Data: `studios.settings.features`, `studios.settings.workflow`; environment.
- States: —
- Words: —
- Reachable: —

### A-75 · The dialog reads the lead from the app's lead list
- Where: `CFD:242-243, 261, 403, 584-587, 1217-1224, 1742-1745`.
- Entry: —
- Does: `useApp().leads` (the board's list, role-filtered) supplies the lead's email (Send to client), contract flag and file name (paper-signed), entity (the seed), key-collection date (`{{start_date}}`) and name / phone (WhatsApp fallbacks).
- Rules: a lead missing from that list (not loaded yet, or outside the board's scope) reads as no email (*"Send to client"* disabled with *"This lead has no email on file"*), no contract on file (paper-signed never shows), no entity (default entity) and no start date (placeholder). The quote editor fetches the lead directly in the same situation (`quote-digitizer-dialog.tsx:1738-1748`); the dialog does not. After an upload, the paper-signed state appears only once the drawer's autosave has written the flag and the list has refreshed.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Entity-aware contracts

### A-76 · The issuing entity in the send form
- Where: `CFD:241-278, 1010-1031`; quote-editor C-66, C-123; `docs/superpowers/specs/2026-05-07-h10-entity-aware-quote-signing-design.md` §4.1.
- Entry: the send form, when the studio has two or more **active** entities.
- Does: a dropdown of the active entities (the default marked); seed = the lead's `company_id` (chosen in the quote editor, migration 154) → the studio's default entity → the first active one; the selection follows the seed until the user changes it, then stays; an outside-click close clears it and re-seeds.
- Rules: the choice becomes the signing request's `companyId` (validated as an active entity of the studio, quote-editor C-68) and drives the compose preview's `{{company_*}}` (A-44). It does not reach the downloaded or emailed PDF (A-44), is not written to the lead (A-78) and is not shown while a link is in flight (A-79). With one entity no dropdown shows and the request still carries the seed.
- Data: `studio_companies (id, name, is_default, is_active)`; `leads.company_id`.
- States: —
- Words: *"Issuing entity"*, *"Default entity"*, *" (default)"*, *"Determines UEN, GST status, and bank details on the signed quote."*
- Reachable: yes (multi-entity studios).

### A-77 · Which company the contract document names
- Where: A-44; A-58; quote-editor C-74, C-123; templates B-86.
- Entry: —
- Does: the signed quote (executed PDF, signing page header) is entity-aware (hand-off templates B-86, quote-editor C-123). The **contract** document is not: preview → the send form's entity; downloaded PDF → the lead's entity, else the default; emailed PDF → the lead's entity, else the studio name with placeholders; signing documents → `{{company_*}}` blank and `{{studio_name}}` = the studio; the contract PDF's header → the studio name only.
- Rules: inside one signing packet the quote names the issuing entity while an auto-composed contract (A-28) prints blank registration and address lines; nothing warns the studio.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-78 · The dialog never saves the entity on the lead
- Where: `CFD:241-278, 549-559`; `src/components/leads/quote-digitizer-dialog.tsx:1733-1737, 1864-1870`; Leads B-64.
- Entry: —
- Does: the dialog's pick is stored only on the new signing request (`quote_signature_requests.company_id`).
- Rules: `leads.company_id` changes only through the quote editor's entity picker and the migrate flow (Leads B-64). The quote editor's comments — "We persist on every change so the Contract Flow Dialog pre-fills from the same source" and "(e.g. Contract Flow Dialog persisted it first)" — imply the dialog writes the lead's entity; it does not.
- Data: `leads.company_id`, `quote_signature_requests.company_id`.
- States: —
- Words: —
- Reachable: —

### A-79 · Regenerate and the entity — the H10 open question
- Where: `CFD:1884-1906`; H10 spec §8 question 2; `docs/uat/customization-phase-3-onward-uat.csv` TC-24.
- Entry: *"Regenerate link"* (A-14).
- Does: posts `companyId = selectedCompanyId` — the form's hidden value — not the in-flight request's `company_id` (which the summary route returns and the dialog never reads).
- Rules: after an outside-click close the hidden value is re-seeded from the lead's entity or the default, so a link first issued under entity B can be regenerated under entity A without anyone choosing A. The in-flight state has no picker, so TC-24's "Re-open Contract Flow Dialog → pick Entity A → Generate" cannot be done without cancelling first. The spec's question — lock the entity once a link exists? (default answer "yes") — is not implemented either way.
- Data: `quote_signature_requests.company_id`.
- States: —
- Words: —
- Reachable: yes.

### A-80 · `h10-entity-aware-signing.test.ts` — what it pins for this slice
- Where: `src/__tests__/h10-entity-aware-signing.test.ts:104-122`.
- Entry: —
- Does: Task 5 asserts only that the dialog's source contains `useStudioCompanies`, `companyId` and a `length >= 2`-style comparison.
- Rules: nothing pins the seed order, the lead's entity, regenerate, or any contract-document behaviour. The other tasks cover the sign routes, `EntityTag`, the drawer and project chips and the signing page (hand-off B / C, quote-editor C-123); the first test ("plan placeholder") always passes.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Docs vs code discrepancies

### A-81 · PRD 11 "Quote Signing Flow" (contract parts) vs code
- Where: `docs/prd/11-quote-signing.md:20, 48-56, 63-72`.
- Entry: —
- Does: the PRD (status *Launched*, 2026-06-12) says studios need to "generate a contract (not just upload one)"; the solution lists "a per-document carousel (T&C + Contract) before the quote review" and "Contract compose: split the paper path into 'Upload PDF' vs 'Compose Contract', with a split-pane editor + live preview and composed-contract Download/Send"; goal "Studios compose or upload the contract and brand the ceremony".
- Rules: the code — the split, the editor, the preview, Download and Send exist (A-17, A-32, A-53, A-56, A-61); a composed contract cannot enter the signing ceremony (A-67, A-68); a first send carries the quote plus the picker's documents, the default T&C and contract only on regenerate (A-28); the quote is first in the picker by default, not after the documents (B); the composed contract's PDF carries no branding (A-58).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-82 · `docs/rules/leads.md` (contract parts) vs code
- Where: `docs/rules/leads.md:45, 299, 323, 365, 405-431, 458, 956`.
- Entry: —
- Does: the rules say `requiresContract` = "Contract file must be uploaded", SIGNED adds a required "Contract Upload", the SIGNED gate is "relaxed by an in-flight/`signed` signature request", `sent_for_signature` follows "generating a signing link via Contract Flow Dialog", the signing flow is phone → OTP → review → sign, and the "Executed signed contract" is the signed quote PDF `signed-quotes/{sigReqId}.pdf`.
- Rules: gate and relaxation match (A-20; Leads C-03); the "Contract Upload" is the Classic block that opens this dialog (A-02); the step list omits the document walk (quote-editor C-78, B). The file says nothing about composing, contract templates, render-pdf or send-to-client — the file map lists the dialog only as "Contract workflow".
- Data: —
- States: —
- Words: —
- Reachable: —

### A-83 · `docs/openmaison-v1-feature-requirements.csv` vs code
- Where: rows 5 (Leads · CRM Basics), 10 (Journey View), 13 (Leads → Projects Flow), 55 (Legal Entities), 66 (User Portal · Data layer).
- Entry: —
- Does: no row covers the contract flow, contract composing, contract templates or sending a contract. Row 5 and row 13 list the contract gate as enforced and toggle-able; row 10 lists Contract among the hard, never-backfilled Journey prerequisites; row 55 flags that any role can edit legal entities and their bank / GST details; row 66's "contract value" is the finance figure.
- Rules: rows 5, 10 and 13 match the code (A-20, A-03). Row 55 matters here because the entity's registration, GST number and address are exactly what a contract's `{{company_*}}` tokens print (A-44). Row 66 is hand-off C.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-84 · `docs/features/studio-customization/requirements.csv` vs code
- Where: rows P6 (line 7), H7 (line 21), H3 (line 17), NF1 (line 45), NF19 (line 63).
- Entry: —
- Does: P6 — "studio_document_templates table with variables for quote PDF TnC Contract signing flow …"; H3 — "Quotation, TnC, Contract signing flow … Studios can customize which docs are shown and the signing flow"; NF1 — "signature on final page"; NF19 — timelines "alongside quote/contract templates"; H7 — "Hides share send-to-client download copy-link".
- Rules: the template `variables` maps are never read (A-27, A-36) and the `signing_flow` row is dead (A-29); the doc set is chosen per send in the picker, not per studio (B); the sign step is last (quote-editor C-80) while the signature flag sits on the quote document on the picker path (`RS:554-564`); H7 → A-72.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-85 · The P6 document-template plan vs code
- Where: `docs/superpowers/plans/2026-04-29-customization-p6-document-templates.md:24, 444-475, 1266-1290, 1457-1491`.
- Entry: —
- Does: the plan has request-signature substitute T&C and contract with `substituteDocumentVariables` (a locale long date for `current_date`), the dialog load `tpl.bodyHtml` into a TipTap editor instead of the hard-coded `CONTRACT_TEMPLATES` and `execCommand`, and the `signing_flow` `docOrder` drive the carousel.
- Rules: the code uses `substituteVariables` with ISO dates and `start_date` = today (A-43, B-13); the editor and the live list shipped (tests pin both, A-93); `docOrder` was never wired (A-29); the plan's "Use Template" tab and hand-off to a signing tab were replaced by the state-driven dialog (A-08).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-86 · The multi-document signing spec vs code
- Where: `docs/superpowers/specs/2026-06-30-multi-document-signing-design.md:82-94, 234-244, 395-404`.
- Entry: —
- Does: the spec adds "Documents to include" to the send modal, with merge fields "resolved with this lead's data", and says the ordered selection "Replaces the current 'auto-pull default tnc + contract' composer".
- Rules: shipped as described for the send form (B): a first send no longer pulls the default T&C and contract; *"Regenerate link"* still uses the old composer (A-28). Merge fields resolve five keys only, `client_name` from the form (B-13). The spec never mentions the compose path — the composed contract was not moved into the picker, which is why its *"Send for signature"* stopped carrying it (A-67).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-87 · The H10 entity-aware signing spec and plan vs code — the document
- Where: `docs/superpowers/specs/2026-05-07-h10-entity-aware-quote-signing-design.md` §4.1, §8; `docs/superpowers/plans/2026-05-07-h10-entity-aware-quote-signing.md:496-620`; quote-editor C-123.
- Entry: —
- Does: the spec's picker defaults to the `is_default` entity; its helper text names "the signed PDF"; §8 asks whether the entity should lock once a link exists.
- Rules: the code seeds from the lead's entity first (A-76); the helper text is C-123; §8 is open (A-79). Both documents concern the quote PDF and the signing page only — the contract document stays studio-branded with unresolved or blank entity tokens (A-77); nothing in H10 touches `render-pdf` or `send-to-client`.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-88 · `docs/uat/quote-features-uat.md` §4.2 and §5 vs code
- Where: `docs/uat/quote-features-uat.md:146-230`.
- Entry: —
- Does: the UAT expects a *"Send for Signature"* tab, *"Generate Signing Link"* with the phone "(optional)", *"Copy Link"* / *"Link copied!"*, *"Share via WhatsApp"*, *"Resend Link"* opening the dialog on the signature tab with the old token "still valid", an *"Upload Contract"* tab with a *"Done"* button, CF-03 rejecting `.txt` / `.xlsx`, a *"Use Template"* tab whose *"Continue to Sign"* advances to the send tab, *"Save as Template"*, and *"Generate a new link"* that resets the form.
- Rules: the code is state-driven with no tabs (A-08); the phone is required and region-validated (quote-editor C-66); *"Copy"* / *"Link copied"*, *"WhatsApp"*; resend re-emails the same link and a new link cancels the old one (quote-editor C-69, C-88); upload saves with *"Save signed contract"* (A-18); only the file browser rejects other types — a drop accepts anything (A-17); there is no *"Continue to Sign"* (A-35, A-67); *"Save as new template"* (A-30); regenerate lives in the in-flight ⋮ menu with no form (A-14).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-89 · `docs/uat/cowork-uat-plan.md` phases 5–6 vs code
- Where: `docs/uat/cowork-uat-plan.md:180-236`.
- Entry: —
- Does: TC-5.1 expects "3 tabs: Upload, Template, Send for Signature" and *"Generate Signing Link"*; TC-6.1 a "Contract Upload input" when the status is set to Signed; TC-6.2 a template editor that is "contentEditable" with a *"Save & Use"* button whose result "Counts as 'contract uploaded' for SIGNED validation".
- Rules: no tabs (A-08); the Signed status's contract control opens this dialog (A-02); the editor is TipTap (A-32); there is no *"Save & Use"*, and nothing on the compose path sets the contract flag — only an upload or a digital signing satisfies the gate (A-20, A-65).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-90 · The P6 and phase-3 UATs vs code
- Where: `docs/uat/customization-p6-uat.md:13-76` (quote-editor C-124); `docs/uat/customization-phase-3-onward-uat.csv` TC-17, TC-18, TC-22, TC-24.
- Entry: —
- Does: TC-P6-4.1 / TC-18 expect every new link to walk "Document 1 of 3 — Terms & Conditions" → "Contract Agreement" → review; TC-P6-4.3 a T&C-only studio with the signature on the last document; TC-P6-4.4 `{{client_name}}` substituted into the editor on *"Use Template"* and a *"Continue to Sign"*; TC-17 "New signing links pick up latest TnC"; TC-22 an "Issuing legal entity" picker "at top of dialog" with a "(Default)" tag; TC-24 re-open → pick another entity → Generate.
- Rules: the default T&C and contract appear only on a regenerated link (A-28); TC-P6-4.3 holds on that path only; tokens stay raw in the editor and there is no *"Continue to Sign"* (A-34, A-35); the picker is *"Issuing entity"* with *" (default)"*, seeded from the lead's entity (A-76); TC-24 cannot be done while a link is in flight (A-79).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-91 · The onboarding script vs code
- Where: `docs/training/onboarding-script.md:264-272, 344-351, 407-415`.
- Entry: —
- Does: the script has the trainer click *"Generate Signing Link"*, promises a "24-hour default expiry … configurable per studio", *"Send via WhatsApp"* / *"Send via Email"* buttons, a "Preferred delivery channel" setting that "Drives which buttons appear in the Contract Flow Dialog", and T&Cs appended as "a PDF or … markdown".
- Rules: the button is *"Send for digital signature"* (quote-editor C-66); links last 7 days, fixed (quote-editor C-73); after sending the dialog offers *"Copy"*, *"WhatsApp"* and *"Resend email"* — the first email goes out automatically (quote-editor C-69, C-87, C-88); no delivery-channel setting exists and every button always shows; T&Cs are signing-library PDFs or rich text, no markdown (B).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-92 · In-code comments and copy that contradict the code
- Where: as cited.
- Entry: —
- Does: (1) `CFD:87-91` — selecting a template fills the editor "with {{var}} tokens substituted from the lead/studio context"; the editor keeps tokens raw (A-34). (2) `CFD:1683-1685` — the composed contract "becomes the signing contract document (alongside the default T&C)" and is signed "in the homeowner portal" (A-67). (3) `RS:82-87` — "When absent, the default contract template is used as before" — only when `documents` is absent too (A-28, A-68). (4) `PANE:7-11` — the preview "Mirrors what the client will actually see" (A-53). (5) `CFD:422-427`, `RPDF:117`, `STC:94` — the lead "doesn't carry a free-text address yet" (A-42). (6) `QC:11`, `RPDF:19` — `templateId` "used only for the filename" — unused (A-38). (7) `src/lib/contracts/render-pdf.ts:28` — the studio name shows in "the top-right header of every page" (A-58). (8) `STC:12-15` — history shows "Contract sent: <filename> to <recipient>" (A-64). (9) `LDD:2020` — *"Open Contract Flow"* (A-05). (10) `quote-digitizer-dialog.tsx:1736, 1867` — the dialog persists the lead's entity (A-78). (11) *"Max 10 MB"* and *"Drop a PDF here"* (A-17). (12) *"Move the lead to SIGNED from the lead drawer to kick off project creation."* after a digital signing (A-15; quote-editor C-126). (13) The client email's *"Awaiting signature"* badge on a contract that cannot be signed (A-63). (14) `customization-p1.test.ts:156-157` — the gate "falls back to lead.quote_status" (A-72). (15) `CFD:93-98` — the public page "does not yet branch on signing_mode" (quote-editor C-126).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### A-93 · The slice's tests — what they pin and what they do not
- Where: `src/__tests__/contract-template-flow.test.ts`; `signing-multidoc.test.ts:427-455`; `quote-approve-without-quote-row.test.ts:183-209`; `customization-p1.test.ts:141-168`; `quote-signing.test.ts:644-800`; `h10-entity-aware-signing.test.ts`; `resolve-contract-quote.test.ts`; `contract-loader.test.ts`; `contract-single-loader.test.ts`; `design-template-picker-items.test.ts`; `quote-html-to-pdf-nested.test.tsx`; `e2e/`.
- Entry: —
- Does: `contract-template-flow.test.ts` matches source text — the `paperPath` union and both buttons, the read-only picker (no delete / rename / clone), the Accounts URL string, the preview's wiring, the three footer labels, the email-less disable, render-pdf's auth / studio filter / 400 / helper / attachment header, send-to-client's email refusal / bucket / `lead_files` insert / `contract_sent` log / dispatch + signed URL, the event's catalog entry, the hooks' endpoints and the download helper. `signing-multidoc.test.ts` pins the live `useDocumentTemplates(undefined, "contract")` call and substitution in the pane, not the editor. `quote-approve-without-quote-row.test.ts` pins the empty seed, no mirror fallback, the loading state and the zero-quote copy. `customization-p1.test.ts` pins the not-approved state and the empty-selection disable. `quote-signing.test.ts` pins the props, *"Send for digital signature"*, copy / WhatsApp wiring and the drawer's props. `h10-entity-aware-signing.test.ts` → A-80; `resolve-contract-quote.test.ts` → A-48; the two loader tests → A-52 (hand-off C); `quote-html-to-pdf-nested.test.tsx` → A-59.
- Rules: `design-template-picker-items.test.ts` is not about contracts — it covers the quote editor's Design Template picker (templates audit). No test renders the dialog, runs either contract route, exercises `sanitizeContractHtml`, the compose *"Send for signature"*, the preview's token values, the Content-Disposition header or the client email; no `e2e/` spec touches the contract flow (grep: only the workflow copy *"Contract required"* in two UAT walks).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Uncertain / not verified

1. **The download's header** (A-60): Node 24's `Response` rejects the em-dash filename (checked outside the app); the route itself was not run, so whether *"Download as PDF"* fails in every deployment was not observed.
2. **The PDF header on later pages** (A-58): inferred from react-pdf's `fixed` semantics; no multi-page contract was rendered.
3. **Two default templates at signing** (A-26, A-28): supabase-js `.maybeSingle()` returns an error and `null` data when two rows match (a studio-wide default plus an entity default of the same type); `RS` ignores the error, so a regenerated link would carry no T&C / contract — not exercised.
4. **The body reset after "Save as new template"** (A-30, A-34): read from the effect's dependencies and the list refetch; not exercised in a browser.
5. **Inline styles in the browser** (A-54): on a server every style survives; in the browser it depends on whether `sanitize-html`'s postcss parse works in the bundle (else the whole `style` attribute is dropped).
6. **Upload size** (A-17): no app limit; the host's serverless request-body limit (e.g. Vercel's) may cap `/api/storage/upload` below the *"Max 10 MB"* copy — not verified.
7. **Variation orders in the dialog** (A-11): VO quotes carry `lead_id` and are not filtered out, but whether an approved VO can reach a lead's send form (such leads are normally signed or paper-signed) was not exercised.
8. **Notification dedupe on "Send to client"** (A-63): two identical dispatches within 120 s should be suppressed per `findRecentlyNotified`'s inputs — not exercised; likewise the email subject reading *"Contract Sent to Client: Lead: <name>"* assumes no studio-authored template overrides it (quote-editor Uncertain 4).
9. **Nested lists in the PDF** (A-59): verified on a copy of the item pattern with one sample; other nesting shapes were not tried.
10. **What survives a close** (A-06, A-37, A-40): read from the drawer's JSX (the dialog is always rendered); whether the drawer itself unmounts when switching leads — which would drop the draft and re-seed the form — was not traced.
11. **Other sanitizer users** (A-54): the homeowner portal's engagement page and the signed packet use the same allowlist; read at the call sites only (hand-off B / C).
12. **The Accounts deep link** (A-24): the inner tab's `defaultValue="quote_pdf"` and the unread `type` parameter were read from code; the overlay was not opened.
