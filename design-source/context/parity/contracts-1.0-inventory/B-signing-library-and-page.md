# OpenMaison 1.0 — Contracts inventory · Slice B: the signing library, packets and the signing page

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader or an earlier audit, and only named here. Readers of this audit: **A** = the contract flow dialog and the contract document (composing, templates, merge fields, render-pdf, send-to-client); **C** = the contract after signing (project contract, contract value / freeze, VO, portal signing, notifications); **D** = data model. Earlier audits: "quote-editor C-nn / D-nn" = `../quote-editor-1.0-inventory/C-lifecycle-and-client.md` / `D-data-model.md`; "templates A-nn … D-nn" = `../quote-templates-1.0-inventory/`. Abbreviations: `SIGN` = `src/app/sign/[token]/page.tsx`; `CFD` = `src/components/leads/contract-flow-dialog.tsx`; `RS` = `src/app/api/quotes/request-signature/route.ts`; `SUBMIT` = `src/app/api/sign/[token]/submit/route.ts`; `TAB` = `src/app/(main)/accounts/signing-documents-tab.tsx`; `PICKER` = `src/components/leads/signing/signing-document-picker.tsx`; `PACKET` = `src/lib/signing/build-signed-packet.ts`.

## Vocabulary

- **Library document** — a `studio_signing_documents` row (UI type `SigningLibraryDocument`): a reusable `pdf_upload` or `rich_text` document the studio keeps in Accounts › Signing Documents (migration `242`).
- **Signing document** — one `SigningDocument` object inside `quote_signature_requests.documents` (JSONB, migration `120`): a per-request snapshot with `type` (`quote · tnc · contract · document`) and `render` (`pdf · html · quote`) (`src/types/app.ts:1967-1990`).
- **Signing request** — a `quote_signature_requests` row: token, frozen quote snapshot, documents, signer evidence (quote-editor C-64; hand-off D).
- **Picker** — the send form's ordered documents list (`SigningDocumentPicker`) with the quote pinned inside it.
- **Picker path / auto-compose path** — the two ways `RS` builds `documents`: from the list the dialog sends, or — when no list is sent (only *"Regenerate link"*) — quote + default T&C + default contract.
- **Sequence (the walk)** — the client's one-document-per-screen reading of `documents` on `/sign/<token>`, ending in one signature.
- **Gate** — a document's `requires_scroll` (reach the end) and `requires_accept` (tick its `accept_label`).
- **Acknowledgement** — `{ id, hash, viewedAt?, acceptedAt? }` per document in `quote_signature_requests.document_acknowledgements` (migration `246`).
- **Document hash** — `signingDocumentHash`: SHA-256 over `render`, `title` and the body (a PDF's storage path, an HTML body, or the quote lines).
- **Whole-set hash** — SHA-256 of the stored document hashes joined by `|`, written to `signing_hash` when acknowledgements arrive.
- **Packet** — the combined signed PDF `signed-quotes/{requestId}-packet.pdf`: one audit certificate page, then every document in stored order (`signed_packet_path`).
- **Packet certificate** — the packet's first page (*"Signing Audit Certificate"*); not the in-app **signature certificate** card (quote-editor C-86).
- **Executed PDF** — `signed-quotes/{requestId}.pdf`, the signed quote (templates B-86); it is also the packet's quote pages.
- **Canonical PDF** — `shared-quotes/{studioId}/{quoteId}.pdf` (templates B-82).
- **Overlay signature** — a signature image drawn onto finished PDF bytes at a slot marker, never re-rendering (`overlaySignatureOnCanvaPdf`).
- **Slot marker** — the invisible `om-sigslot:prepared_by` / `om-sigslot:client` Link annotation the quote renderer places in a signature footer column (templates B-83).
- **Member signature** — a `member_signatures` row: one member's own drawn or uploaded image in the private `member-signatures` bucket, with an `auto_apply` opt-in (migration `267`).
- **Designer bake** — `bakePreparedBySignature`: the member signature overlaid on the canonical at the quote's first finalize (templates B-85).
- **Issuing entity** — the `studio_companies` row named by `quote_signature_requests.company_id`.
- **Archival guard** — `requireNotArchived(…, { public: true })`: a dead-link 410 when the request's lead is archived.

---

## The signing documents library

### B-01 · Where the library lives and who reaches it
- Where: `src/app/(main)/accounts/page.tsx:70, 97, 1378-1379`; `src/lib/access-control.ts:123-126`; `src/app/api/signing-documents/route.ts:6-113`; `src/app/api/signing-documents/upload/route.ts:11-67`; `src/lib/api-auth.ts:23-33`.
- Entry: Accounts Setup › group *Quotes & Pricing* › *"Signing Documents"* (`/accounts?tab=signing-documents`).
- Does: mounts `SigningDocumentsTab` — the studio's shelf of reusable documents that the send form can add to a signing request (B-17).
- Rules: `/accounts` opens for tags `owner · admin · id · accounting` (or a role's page map); the menu item carries no `ownerOnly` flag, so all four see and use the tab — the access-control comment that the page "filters tabs to viewable subset" for ID / accounting has no counterpart in the page, which filters only `ownerOnly` items. The four library handlers and the upload route check only `requireSession` — any signed-in member of the studio; no role or permission check; `studio_id` always comes from the session, never the body.
- Data: `studio_signing_documents` (hand-off D).
- States: —
- Words: *"Signing Documents"*; *"Build a library of reusable signing documents — PDFs and rich-text — that can be assembled into multi-document signing flows for your clients."*
- Reachable: yes.

### B-02 · What a library document is
- Where: `scripts/migrations/242_signing_documents_library.sql:2-30`; `src/types/app.ts:4935-4948`; `src/types/database.ts:3068-3082`; `src/lib/transformers.ts:3337`; `scripts/security/rls-manifest.json:95`.
- Entry: —
- Does: one row per document — `kind` `pdf_upload` (a PDF in storage, `file_path`) or `rich_text` (HTML in `body_html`); `title`; the gates `requires_scroll`, `requires_accept` and the tick-box text `accept_label`; optional `company_id` (issuing entity); `is_active`; `created_at` / `updated_at`.
- Rules: column defaults `requires_scroll true`, `requires_accept true`, `accept_label 'I have read and agree to this document'`, `is_active true`. There is no version, status, sort order, default flag, "required / optional" flag, expiry or author column. `company_id → studio_companies ON DELETE SET NULL` (deleting an entity turns its documents studio-wide). Tenant table: `FORCE ROW LEVEL SECURITY`, policy `scoped` on the JWT's `studio_id`, anon revoked. Nothing but the library routes reads the table — the signing request copies what the browser sends (B-22).
- Data: `studio_signing_documents`.
- States: —
- Words: —
- Reachable: yes.

### B-03 · The library list
- Where: `TAB:591-783` (list `772-783`, row `543-587`, badges `88-106`, skeleton `73-84`); `src/app/api/signing-documents/route.ts:6-24`.
- Entry: opening the tab.
- Does: one row per active document, newest first: title, a kind badge, one badge per gate that is on, and edit / delete actions.
- Rules: the server returns only `is_active = true` rows ordered by `created_at` descending (the client filters `isActive` again); no search, paging, preview, file size, entity name or "used in N requests" count.
- Data: `GET /api/signing-documents[?companyId=]` → `{ documents: SigningLibraryDocument[] }`.
- States: loading — three skeleton rows; error card; empty card with its own *Add* menu.
- Words: badges *"PDF"* / *"Rich text"*, *"Scroll"*, *"Accept"*; icon titles *"Edit signing document"*, *"Delete signing document"*; error *"Could not load signing documents"* — *"Check your connection and try refreshing the page."*; empty *"No signing documents yet"* — *"Add your first signing document — upload a PDF or write one from scratch — to start building signing flows for your clients."*, button *"Add your first signing document"*; menu *"Add document"* › *"Upload PDF"* · *"Create document"*.
- Reachable: yes.

### B-04 · Per-entity documents and the entity switcher
- Where: `TAB:595-605, 672-703, 794-812`; `src/app/api/signing-documents/route.ts:9-17`; `src/lib/queries/signing-documents.ts:38-63`.
- Entry: the tab on a studio with two or more active legal entities.
- Does: a *"Viewing documents for"* select — *"All entities"* or one entity; new documents created or uploaded while an entity is selected are tagged with it (`company_id`), under *"All entities"* they are studio-wide (`company_id` null).
- Rules: *All entities* lists every active row of every entity; one entity lists that entity's rows **plus** studio-wide rows (`company_id.eq.<id>,company_id.is.null`, the id interpolated into the filter unvalidated). Rows never show which entity they belong to; a document's entity cannot be changed after creation (PATCH ignores `companyId`, B-07). Single-entity studios never see the switcher and every document they add here is studio-wide — but a document saved from the send form is tagged with the dialog's selected entity (usually set, even on a single-entity studio; B-18, B-19). The send form scopes the library the same way to the request's issuing entity (B-17).
- Data: `studio_signing_documents.company_id`; `useStudioCompanies`.
- States: —
- Words: *"Viewing documents for"*, *"All entities"*, *"(Default)"*.
- Reachable: yes (multi-entity studios).

### B-05 · Upload a PDF
- Where: `TAB:394-533`; `src/app/api/signing-documents/upload/route.ts:9-67`; `src/lib/queries/signing-documents.ts:125-153`.
- Entry: *"Add document"* › *"Upload PDF"*.
- Does: pick a PDF, confirm a title (pre-filled from the file name without `.pdf` when empty), *"Upload PDF"* → the file is stored and a `pdf_upload` row inserted.
- Rules: browser guards before any network call — MIME must be `application/pdf`, size ≤ 5 MB; the server repeats both (MIME from the browser, no byte sniffing). Object `signing-documents/{studioId}/{random UUID}.pdf`, `upsert: false`. The row is inserted **without** gate fields, so it takes the column defaults: scroll on, accept on, *"I have read and agree to this document"* — the upload dialog offers no gate controls. If the row insert fails the object is removed (orphan cleanup). An uploaded PDF's file can never be replaced; only title and gates are editable (B-07).
- Data: `POST /api/signing-documents/upload` multipart `file`, `title`, `companyId?` → the row.
- States: *"Uploading…"*; upload button disabled until a valid file is picked.
- Words: *"Upload PDF"*, *"Title"* (placeholder *"e.g. Terms and Conditions"*), *"PDF file"*, *"Click to select a PDF"*, *"Maximum 5 MB"*, *"<n> MB"*; errors *"Only PDF files are allowed."*, *"File must be under 5 MB (selected: <n> MB)."*; toasts *"Please select a PDF file"*, *"Title is required"*, *"PDF uploaded successfully"*, *"Upload failed"* (or the server's code, B-10); *"Cancel"*.
- Reachable: yes.

### B-06 · Create a rich-text document
- Where: `TAB:250-383`; `src/components/templates/RichTextTemplateEditor.tsx:85-309`; `src/components/templates/template-sample-data.ts:25-60`.
- Entry: *"Add document"* › *"Create document"*.
- Does: title, a rich-text body in the shared template editor (with its variable palette), the two gate switches and, when acceptance is on, the tick-box label; *"Create document"* inserts a `rich_text` row.
- Rules: in this dialog both gates start **off** (the table default is on, B-02); the label starts *"I have read and agree to the above document."*; title required. The editor's *Insert* palette offers `client_name`, `studio_name`, `quote_total`, `project_address`, `start_date`, `current_date` (resolution at send time, B-13).
- Data: `POST /api/signing-documents` `{ kind: "rich_text", title, bodyHtml, requiresScroll, requiresAccept, acceptLabel, companyId }`.
- States: *"Creating…"*.
- Words: *"Create signing document"*, *"Title"* (placeholder *"e.g. Service Agreement"*), *"Content"*, *"Require client to scroll"* — *"Client must reach the bottom of the document before they can sign."*, *"Require explicit acceptance"* — *"Client must tick a checkbox to confirm they accept this document."*, *"Checkbox label"*, *"Create document"*, *"Cancel"*; toasts *"Title is required"*, *"Signing document created"*, *"Create failed"*.
- Reachable: yes.

### B-07 · Edit a document
- Where: `TAB:116-239`; `src/app/api/signing-documents/route.ts:56-88`; `src/lib/queries/signing-documents.ts:84-123`.
- Entry: a row's pencil icon.
- Does: edits title, the gates, the tick-box label and — for `rich_text` only — the body.
- Rules: PATCH maps only `title`, `bodyHtml`, `requiresScroll`, `requiresAccept`, `acceptLabel` (+ `updated_at`); a blank title → 400. Turning acceptance off saves the label as `""`. An empty stored label re-opens as *"I have read and agree to the above document."*. The hook also posts `companyId`, which the route ignores. Edits never reach requests already sent — each request holds its own copy (B-22); there is no revision history.
- Data: `PATCH /api/signing-documents` `{ id, …fields }` → the row.
- States: *"Saving…"*.
- Words: *"Edit signing document"*, *"Save changes"*, *"Cancel"*; toasts *"Title is required"*, *"Signing document updated"*, *"Save failed"*.
- Reachable: yes.

### B-08 · Delete — a soft delete
- Where: `TAB:617-626`; `src/app/api/signing-documents/route.ts:90-113`; `src/lib/queries/signing-documents.ts:155-173`.
- Entry: a row's bin icon → browser confirm.
- Does: sets `is_active = false`; the row and its storage object stay.
- Rules: the confirm says the delete *"cannot be undone"* and there is no restore, archive list or "deleted" view anywhere; a PDF object is kept so requests that already copied its `file_path` keep serving it. No check whether the document is in a pending request.
- Data: `DELETE /api/signing-documents` `{ id }` → `{ ok: true }`.
- States: —
- Words: confirm *"Delete "<title>"? This cannot be undone."*; toasts *"Signing document deleted"*, *"Delete failed"*.
- Reachable: yes.

### B-09 · Ordering, defaults and "required" — what the library does not do
- Where: `src/app/api/signing-documents/route.ts:16`; `CFD:171-186`; `PICKER:79-145`; `scripts/migrations/118_seed_default_document_templates.sql:38-43`.
- Entry: —
- Does: nothing studio-wide is pre-selected: every send form starts with the quote alone, and the studio adds library documents per send (B-17).
- Rules: the library has no order (newest first only), no "include by default", no per-project-type or per-entity default set, and no "required" notion — every document placed in a request must be walked; a document with both gates off is passed with *Continue* alone. The only studio defaults that ever reach a request are the default T&C and contract **document templates** (`studio_document_templates`, hand-off A), and only on the auto-compose path (B-23). The seeded `signing_flow` template's `docOrder` is never read (B-24).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-10 · The library API contract and its errors
- Where: `src/app/api/signing-documents/route.ts:6-113`; `src/app/api/signing-documents/upload/route.ts:11-67`; `src/lib/queries/signing-documents.ts:21-34`.
- Entry: B-03…B-08, B-18, B-19.
- Does: `GET ?companyId=` → `{ documents }`; `POST` (rich text only) → row; `PATCH { id, … }` → row; `DELETE { id }` → `{ ok: true }`; `POST /upload` (multipart) → row. All through the studio-scoped client.
- Rules: POST refuses anything but `kind: "rich_text"` or a blank title; POST defaults gates to `true` when absent, but the hook always sends `false` when absent (B-06). Errors are machine codes, and the hook shows the code itself as the toast text (fallback *"Request failed (<status>)"*).
- Data: as above.
- States: —
- Words (codes): `load_failed`, `invalid`, `save_failed`, `missing_id`, `invalid_body`, `delete_failed`, `invalid_form`, `pdf_required`, `too_large`, `upload_failed`.
- Reachable: yes.

### B-11 · The library hooks
- Where: `src/lib/queries/signing-documents.ts:45-173`.
- Entry: `TAB`, `PICKER`.
- Does: `useSigningDocuments(studioId, companyId)` (key `["signing-documents", studioId, companyId ?? null]`, stale after 60 s, disabled without a studio); `useSaveSigningDocument` (no `id` → POST, `id` → PATCH); `useUploadSigningDocument`; `useDeleteSigningDocument`. Every mutation invalidates `["signing-documents"]`.
- Rules: `companyId` null/undefined = all rows (B-04). The delete hook's comment reads "Soft-deletes (or hard-deletes) a signing-library document by id."; it is always soft.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-12 · The `signing-documents` bucket
- Where: `src/app/api/signing-documents/upload/route.ts:34-44`; `src/lib/signing/sign-pdf-urls.ts:13-30`; `PACKET:250-268`; `docs/superpowers/specs/2026-06-30-multi-document-signing-design.md` §4b; `docs/superpowers/plans/2026-07-05-qanvast-vo-finance-commission-port.md:288`.
- Entry: —
- Does: holds library PDFs at `{studioId}/{uuid}.pdf`; the signing page reads them through one-hour signed URLs, the packet downloads their bytes.
- Rules: private by design; no migration creates the bucket or any `storage.objects` policy for it — it is a manual per-environment step. Uploads run through the studio-scoped (anon-key + scoped JWT) client; reads on the public signing routes run through the service-role client. Objects are never deleted (soft delete, B-08).
- Data: storage bucket `signing-documents`.
- States: —
- Words: —
- Reachable: yes (where the bucket was created).

### B-13 · Merge fields in signing documents
- Where: `RS:504-510, 539-547`; `src/lib/notifications/templates/substitute.ts:18-27`; `src/components/templates/variable-node.tsx:13-16, 135-140`; `src/components/templates/template-sample-data.ts:25-60`.
- Entry: a rich-text document (library or inline) that contains `{{token}}` chips.
- Does: when the link is created, every `render: "html"` document's body is run through `substituteVariables` with five values — `client_name` (the name typed in the send form), `studio_name` (the studio's name, not the entity's), `quote_total` (formatted in the studio currency), `current_date` and `start_date` (both today as `YYYY-MM-DD`).
- Rules: any other `{{token}}` becomes an empty string — including the palette's own *Project address* (`project_address`) and the editor's auto-resolved `company_*` tokens. The editor stores a chip as `<span data-variable="x">{{x}}</span>`, so the literal is found. Substitution happens once, on the copy frozen into the request; the library row keeps its tokens. PDFs are not touched. The quote templates audit could not find this substitution site (templates C, Uncertain) — it is `RS:543-547`.
- Data: `quote_signature_requests.documents[].content_html`.
- States: —
- Words: palette labels *"Client name"*, *"Studio name"*, *"Quote total"*, *"Project address"*, *"Start date"*, *"Current date"*.
- Reachable: yes.

### B-14 · Library tests
- Where: `src/__tests__/signing-documents-library.test.ts:1-21`; `docs/superpowers/plans/2026-06-30-multi-document-signing-test-plan.md` Phase 2A.
- Entry: —
- Does: one unit test — the snake_case → camelCase transformer. The CRUD, upload guards, soft delete, entity switcher and states are covered only by the manual test plan (2A.1–2A.9).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Picking documents into a request

### B-15 · The documents list in the send form (touchpoint)
- Where: `CFD:163-186, 1033-1041`; quote-editor C-66, C-72.
- Entry: lead drawer › Contract & Signing › the **send** state (quote-editor C-65, C-66).
- Does: see quote-editor C-72 — an ordered list whose first item is the quote; *Upload PDF · Create document · From library*; reorder. The list sits under the client fields and the *"Issuing entity"* select, with no heading of its own. This slice records the list's rules (B-16…B-22); the dialog around it is hand-off A.
- Rules: the list is mounted only when the session has a studio. Whatever the list holds is posted as `documents` on *"Send for digital signature"* (B-21).
- Data: component state `signingDocs: SigningDocument[]`.
- States: —
- Words: —
- Reachable: yes.

### B-16 · The quote as a list item
- Where: `CFD:171-186`; `src/components/leads/signing/signing-doc-row.tsx:29-105`; `PICKER:105-114, 136-140`.
- Entry: every send form.
- Does: the list is seeded with one quote document: `id` = the drawer's open quote id (else `"quote"`), `type`/`render` `"quote"`, `title` *"Quotation"*, `requires_scroll false`, `requires_accept true`, `accept_label` *"I have read and agree to this quotation"*, `requires_signature true`, `hash ""`.
- Rules: the quote row can be dragged anywhere but has no remove control and the picker re-appends it if a list ever lacks it; it shows *"· signed"* and gate badges *"review"*, plus *"accept"*. The seed's `id` is the drawer's quote, not necessarily the quote picked in the *"Which quotes are being signed?"* radios (quote-editor C-66, C-70). The server replaces its content and tick-box text (B-22), so *"I have read and agree to this quotation"* never reaches the client.
- Data: —
- States: —
- Words: *"Quotation"*, *"· signed"*, *"review"*, *"scroll"*, *"accept"*; handle *"Drag to reorder"*.
- Reachable: yes.

### B-17 · Add from the library
- Where: `PICKER:59-77, 94, 116-125, 142-145, 263-298`.
- Entry: *"From library"*.
- Does: a list of library documents to add; picking one appends a copy to the end of the list.
- Rules: the library is read for the send form's issuing entity — that entity's documents plus studio-wide ones (B-04); documents already in the list (matched by `source_library_id`) are hidden, so each library document can be added once. The copy is taken **in the browser at pick time**: `id` a new random UUID, `type "document"`, `render` `pdf` (upload) or `html` (rich text), `title`, `file_path` or `content_html`, the gates and label from the row, `source_library_id`, `hash ""`, `requires_signature false`. Changing the entity afterwards does not remove documents already added.
- Data: `useSigningDocuments(studioId, companyId)`.
- States: *"Loading…"*; empty *"No saved documents to add. Upload or create one."*
- Words: *"From library"*; kind tags *"PDF"* / *"Text"*.
- Reachable: yes.

### B-18 · Upload a PDF from the send form — always saved to the library
- Where: `PICKER:147-171, 237-256`.
- Entry: *"Upload PDF"* in the send form.
- Does: picks a PDF, uploads it through the library upload route (B-05) and appends the returned row as a document.
- Rules: same 5 MB / PDF-only guards; the title is the file name without `.pdf` (no title field); gates are the library defaults (scroll on, accept on). Because the upload route always inserts a library row, **every** PDF added here becomes a permanent library document for the issuing entity — there is no "this send only" option for PDFs.
- Data: `POST /api/signing-documents/upload`.
- States: *"Uploading…"* (button disabled).
- Words: *"Upload PDF"*; toasts *"Please choose a PDF file"*, *"PDF must be 5 MB or smaller"*, *"PDF added"*, *"Could not upload the PDF"*.
- Reachable: yes.

### B-19 · Write a document from the send form
- Where: `PICKER:173-219, 301-334`.
- Entry: *"Create document"* in the send form.
- Does: a title and a rich-text body (the shared editor with its palette); *"Add to signing"* appends it; a switch also saves it to the library.
- Rules: the inline document is fixed at scroll on, accept on, *"I have read and agree to this document"* — no gate or label controls; title required. With *"Save to my library for reuse"* on, a `rich_text` library row is created with the same values (tagged to the issuing entity); if that save fails the document is still added. Without it the document exists only on this request.
- Data: component state; optional `POST /api/signing-documents`.
- States: *"Add to signing"* disabled while saving.
- Words: *"Create signing document"*, *"Title"* (placeholder *"e.g. Scope of Work"*), *"Content"*, *"Save to my library for reuse"*, *"Cancel"*, *"Add to signing"*; toasts *"Give the document a title"*, *"Saved to your library"*, *"Added to this signing, but couldn't save to library"*.
- Reachable: yes.

### B-20 · Reorder and remove
- Where: `PICKER:86-92, 127-140, 223-235`; `src/lib/signing/signing-sequence.ts:7-25`; `signing-doc-row.tsx:40-102`.
- Entry: the list's drag handles and remove buttons.
- Does: drag any item (quote included) to a new position; remove any item except the quote.
- Rules: pointer drag starts after 8 px; touch after a 250 ms press (5 px tolerance) so a tap still scrolls; keyboard sorting is on. `reorder(from, to)` returns a new array and ignores out-of-range indices. List order is the client's reading order. No limit on the number of documents.
- Data: —
- States: —
- Words: *"Drag to reorder"*, *"Remove <title>"*.
- Reachable: yes.

### B-21 · What the send form posts, and when the list resets
- Where: `CFD:182-186, 281-309, 502-568, 1880-1925`; `src/lib/queries/leads.ts:1432-1470`.
- Entry: *"Send for digital signature"*; *"Regenerate link"*.
- Does: the send posts `documents: signingDocs` (every item, in order, with `hash ""`) alongside the quote, client and entity fields (quote-editor C-66).
- Rules: the list is re-seeded to the quote alone only when the drawer's quote id changes; closing the dialog does not clear it, so re-opening on the same quote shows the documents assembled last time. *"Compose a contract first"* → *"Send for signature"* posts the list **and** `contractBodyHtml`; since the list is never empty the server takes the picker path and drops the composed contract (quote-editor C-72; composing is hand-off A). *"Regenerate link"* posts no `documents`, so the new link auto-composes (B-23; quote-editor C-89) — documents the studio had picked are not carried over.
- Data: `POST /api/quotes/request-signature` body `documents?: SigningDocument[]`.
- States: —
- Words: —
- Reachable: yes.

### B-22 · The server builds the request's documents — picker path
- Where: `RS:478-565`; `src/lib/signing/signing-document-hash.ts:15-25`.
- Entry: `RS` with a non-empty `documents`.
- Does: keeps the posted order and, per item: a `render: "quote"` item gets the request's line items as `content_data` and the tick-box text *"I have reviewed the quotation from <studio name|the studio> and agree to proceed."*; a `render: "html"` item's body gets the five merge values (B-13); every item gets a server-computed `hash` (B-26). Then exactly one item keeps `requires_signature: true` — the quote, else the last item the browser flagged, else the last item.
- Rules: the server does **not** re-read `studio_signing_documents` — `title`, gates, labels, `content_html`, `file_path`, `source_library_id` and `id` are taken from the browser as sent, and `file_path` is not checked against the studio's folder. There is no `signing_mode = 'single'` guard (moot while multi-quote signing is off, quote-editor C-71); the quote item's lines are the flat line list of every quote in the request. `requires_signature` is re-set after hashing and is not part of the hash.
- Data: `quote_signature_requests.documents` (hand-off D).
- States: —
- Words: *"I have reviewed the quotation from <studio|the studio> and agree to proceed."*
- Reachable: yes.

### B-23 · The auto-compose path (touchpoint)
- Where: `RS:478-502, 566-630`; quote-editor C-68, C-89; templates C-53.
- Entry: `RS` with no `documents` — in the product only *"Regenerate link"*.
- Does: see quote-editor C-68 / templates C-53 — quote first, then the studio's default active T&C template (`render: "html"`, scroll + accept, *"I have read and accept the Terms & Conditions."*), then the composed contract or the default contract template (*"I have read and accept the Contract Agreement."*, `requires_signature`), else the signature flag moves to the last document.
- Rules: order is fixed (quote · T&C · contract); library documents never appear on this path; each document is hashed the same way (B-26). Contract template content is hand-off A.
- Data: `studio_document_templates` (`tnc`, `contract`).
- States: —
- Words: titles fall back to *"Terms & Conditions"*, *"Contract Agreement"*.
- Reachable: yes (regenerate only).

### B-24 · The `signing_flow` document template — seeded, never read
- Where: `scripts/migrations/117_studio_document_templates.sql:24-26`; `118_seed_default_document_templates.sql:38-43`; `src/lib/queries/document-templates.ts:8`; templates C-65.
- Entry: —
- Does: every studio got a *"Default Signing Flow"* row with `config {"docOrder":["quote","tnc","contract"]}` — meant to set the carousel order.
- Rules: no code reads `signing_flow` rows or `docOrder`; the auto-compose order is hard-coded (B-23) and the picker order is per request (B-20). No Accounts tab edits it.
- Data: `studio_document_templates` `type = 'signing_flow'`.
- States: —
- Words: *"Default Signing Flow"*.
- Reachable: no (dead config).

---

## Packets, sequence and hashes

### B-25 · The per-request document snapshot
- Where: `src/types/app.ts:1967-1990`; `scripts/migrations/120_signing_documents_column.sql:19-23`; `src/types/database.ts:1846-1849`.
- Entry: —
- Does: `documents` is an ordered array of `{ id, type, render, title, content_html?, content_data?, file_path?, hash, source_library_id?, requires_scroll, requires_accept, accept_label, requires_signature }`; array order is the reading order; `signedUrl` is added only when served (B-55) and never stored.
- Rules: `documents` is `NOT NULL DEFAULT '[]'`; an empty array means a request created before migration 120. Every request created by current code holds at least the quote item (B-21, B-23). Library edits or deletes never alter a sent request — it holds its own copy (a PDF's copy is only its `file_path`, B-26).
- Data: `quote_signature_requests.documents` (hand-off D).
- States: —
- Words: —
- Reachable: yes.

### B-26 · The per-document hash
- Where: `src/lib/signing/signing-document-hash.ts:15-25`; `RS:548-551, 569, 587, 616, 626`.
- Entry: link creation.
- Does: SHA-256 hex of `"<render>\n<title>\n<body>"`, body = `file_path` (pdf), `content_html` after merge substitution (html) or `JSON.stringify(content_data ?? null)` (quote).
- Rules: `id` is excluded, so equal content hashes equal; a PDF's hash covers its **storage path, not its bytes**; gates, `accept_label`, `type`, `requires_signature` and `source_library_id` are outside the hash. The browser's `""` stubs are always replaced by the server; the hash is computed once and never recomputed from stored content (B-29).
- Data: `documents[].hash`.
- States: —
- Words: —
- Reachable: yes.

### B-27 · The sequence helpers
- Where: `src/lib/signing/signing-sequence.ts:7-65`.
- Entry: `PICKER`, `SIGN`.
- Does: `reorder(docs, from, to)`; `enumerateForAgreement(docs)` — non-quote titles joined by `", "`; `gateSatisfied(doc, { scrolledToEnd, accepted })` — scroll needed only when `requires_scroll`, tick only when `requires_accept`; `allReviewed(docs, state)`.
- Rules: `allReviewed` has no production caller (the page moves one document at a time, B-57).
- Data: —
- States: —
- Words: —
- Reachable: yes (`allReviewed`: tests only).

### B-28 · The acknowledgements the page records
- Where: `SIGN:486-527, 749-763`.
- Entry: *"Sign & Submit"* on a request with documents.
- Does: posts one acknowledgement per document in the sequence: `id`, the stored `hash`, `viewedAt` = the first time that item was on screen in the walk, `acceptedAt` = only when its box is ticked.
- Rules: the tick time is not kept — `acceptedAt` is set to the item's `viewedAt` (or the submit time when none). Documents with no accept gate never get `acceptedAt`. `viewedAt` is recorded only while on the walk (`doc_review`); a quote-only request is read on the older review screen, so its single acknowledgement has no times unless the client came back through *"Back to review"* (B-62).
- Data: `documentAcknowledgements[]` in the submit body.
- States: —
- Words: —
- Reachable: yes.

### B-29 · Submit — acknowledgement checks and the whole-set hash (touchpoint)
- Where: `SUBMIT:190-292, 300-315`; quote-editor C-82, C-83.
- Entry: `POST /api/sign/<token>/submit`.
- Does: see quote-editor C-82 / C-83. In detail: the block runs only when the request has stored documents **and** the body carries a non-empty acknowledgement array; each acknowledgement's `id` must exist and its `hash` equal the stored `hash` (else audit `signature_refused_hash_mismatch` + 409); `signing_hash` = SHA-256 of the stored hashes joined by `|` in stored order; the stored acknowledgements are the server's id + hash with the client's two times.
- Rules: the check compares the client's hash with the stored hash the client was given, and never re-hashes stored content — a document body changed in the database after sending (hash left as is) signs without complaint; the quote lines are guarded separately by `document_hash` (quote-editor C-82). Acknowledging only some documents is accepted. A signing without acknowledgements (the homeowner portal, B-66) keeps the snapshot hash in `signing_hash` and `document_acknowledgements` stays `[]`. The audit event's `hashMatch` still compares the snapshot hash only.
- Data: `signing_hash`, `document_acknowledgements`, `audit_trail`.
- States: —
- Words: *"document_hash_mismatch"* (unknown id), *"This signing link can no longer be trusted — a document has changed since it was sent. Please ask the studio for a fresh link."*
- Reachable: yes.

### B-30 · One signature — no initials, no per-document signatures
- Where: `SIGN:1794-1960`; `RS:554-564`; `src/types/app.ts:1989`; spec `2026-06-30-multi-document-signing-design.md` §1.
- Entry: —
- Does: the client draws one signature on the final step; it covers the whole set via the agreement sentence (B-63).
- Rules: `requires_signature` is stored (exactly one `true`) but nothing on the page or in the packet reads it; there is no initials capture on any document; only the quote's executed PDF carries a signature image — T&C, contract and uploaded PDF documents enter the packet unsigned (B-31, B-39); no studio countersignature after the client signs (quote-editor C-81).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-31 · The combined signed packet — how it is built
- Where: `PACKET:196-419`.
- Entry: B-33.
- Does: loads the request; renders the certificate page (B-32) to A4 PDF through `POST /api/quote-pdf/render`; then per stored document, in order — `pdf`: the bytes from `signing-documents`; `html`: the body through `sanitizeContractHtml`, rendered A4 by the same route; `quote`: the executed PDF (`getOrRenderSignedQuotePdfBuffer`, quote = the request's `quote_id`, mode = its `signing_mode`); merges every page with pdf-lib (`copyPages`) — certificate first; uploads `signed-quotes/<requestId>-packet.pdf` (upsert); writes `signed_packet_path`.
- Rules: any source that fails is skipped and only logged — the certificate included; nothing rendered → no packet. The render call uses `INTERNAL_RENDER_ORIGIN` else the caller's origin and sends `x-internal-render-secret: <CRON_SECRET>`. A failed pointer write leaves the object in place. No per-document separator, stamp, page numbering or bookmark.
- Data: bucket `signed-quotes`; `quote_signature_requests.signed_packet_path`.
- States: —
- Words: —
- Reachable: yes.

### B-32 · The packet's certificate page
- Where: `PACKET:50-194`.
- Entry: the packet's first page.
- Does: a branded header strip (studio logo, primary colour, studio name) over a neutral body: signer information, the whole-set hash, and one row per document — title, hash, viewed at, accepted at.
- Rules: *"Signer Name"* is `client_name` — the name the studio typed, not the name the client typed; the phone is `signer_phone` (the portal session's phone for portal signings); times in UTC formatted with the studio country's date locale (`long` date, `medium` time); rows join acknowledgements by document id (*"—"* when absent); the signature image is not on the page; branding comes from `studios.settings.branding` (defaults `#5500FF`, name *"Studio"*), never the issuing entity; every value HTML-escaped.
- Data: the request row.
- States: —
- Words: *"Signing Audit Certificate"*, *"Signer Information"*, *"Signer Name"*, *"OTP-Verified Phone"*, *"Signed At (UTC)"*, *"IP Address"*, *"User Agent"*, *"Integrity"*, *"Whole-Set Hash"*, *"Document Acknowledgements"*, *"Document"*, *"Hash"*, *"Viewed At (UTC)"*, *"Accepted At (UTC)"*, *"No documents recorded"*, *"This certificate was generated automatically at the time of signing and forms part of the legally binding agreement."*
- Reachable: yes.

### B-33 · When a packet is built
- Where: `SUBMIT:689-697`; `src/app/api/sign/[token]/packet/route.ts:70-106`.
- Entry: a recorded signature; a packet download with no object yet.
- Does: builds in the background after the executed PDF, for any request whose `documents` is non-empty; rebuilds on demand when the download finds no object.
- Rules: since every current request holds the quote item, **every** signing builds a packet — for a quote-only request it is the certificate page + the executed PDF; pre-120 requests never get one. The comments say legacy single-quote signings "skip this" — only pre-120 rows do. Background failures only log.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-34 · The packet download route
- Where: `src/app/api/sign/[token]/packet/route.ts:24-122`.
- Entry: the done page's *"Download signed documents"* (B-64).
- Does: `GET /api/sign/<token>/packet` → request by token → `status = signed` (409) → `signer_phone` set (403) → `documents` non-empty (404) → download `<id>-packet.pdf` from storage (not via the pointer) → build and re-download when missing → stream `attachment; filename="signed-documents.pdf"`, `Cache-Control: private, no-store`.
- Rules: after signing, anyone holding the token can fetch it — `signer_phone` is the only proof (quote-editor C-85); no archival check (B-74); 60 s ceiling; once the request is flipped to `expired` (B-65) it answers 409.
- Data: `signed-quotes/<id>-packet.pdf`.
- States: —
- Words: *"Missing token"*, *"Not found"*, *"Quote not yet signed"*, *"Verify your phone to download the signed documents."*, *"No combined document packet for this signing."*, *"Failed to build signed packet"*, *"Failed to retrieve signed packet"*.
- Reachable: yes.

### B-35 · Who can get the packet
- Where: `SIGN:1336-1345`; `src/app/api/homeowner/projects/[id]/documents/route.ts:84-93, 227-273`; `SUBMIT:703-742`; `src/components/leads/drawer-sections/quote-summary-card.tsx:92-106`; `src/app/api/quotes/signature-requests/route.ts:47-57`.
- Entry: —
- Does: the client, from the done page (B-64); the homeowner portal's project Documents list, as an extra *"Signed document packet"* entry with a one-hour signed URL when `signed_packet_path` is set (portal surfaces hand-off C).
- Rules: the studio has **no** surface that lists or downloads a packet — the drawer's *View* / download of a signed quote serve the executed quote PDF (`source=signed:<id>`); nor does any studio surface show which documents a sent request carries or which were acknowledged (the in-flight dialog's request summary selects no `documents`, and the certificate reads neither, B-77). The `quote.signed_by_client` notification passes `has_document_packet: "yes"` but no template reads it and no packet link is sent (hand-off C). The portal lists only `status = signed` requests.
- Data: `signed_packet_path`.
- States: a missing or failed signed URL drops the portal entry silently.
- Words: *"Signed document packet"*, *"Download signed documents"*.
- Reachable: yes.

### B-36 · Where signing artifacts are stored
- Where: `src/app/api/signing-documents/upload/route.ts:35`; `PACKET:397-400`; `src/lib/quote-canva/signed-quote-pdf.ts:50-52, 96-120`; `src/lib/queries/member-signatures.ts:94-97`; `SUBMIT:653-686`; templates B-82, B-87.
- Entry: —
- Does: `signing-documents/{studioId}/{uuid}.pdf` — library PDFs; `shared-quotes/{studioId}/{quoteId}.pdf` — the canonical (templates B-82); `signed-quotes/{requestId}.pdf` — the executed quote (templates B-86, B-87); `signed-quotes/{requestId}-packet.pdf` — the packet; `member-signatures/{studioId}/{userId}/{uuid}.png` — member signatures; `contract-files/{studioId}/{projectId}/signed-contract.pdf` — the executed quote copied onto linked projects (quote-editor C-84; hand-off C).
- Rules: the executed PDF and the packet sit at the bucket root keyed by the request id (no studio folder). `signed_pdf_url` stores the public-URL form; `signed_packet_path` stores the object key. Every signed URL minted for these (library PDFs, packet, member-signature preview) lives 3600 s. Library and member-signature objects are never deleted.
- Data: buckets as named.
- States: —
- Words: —
- Reachable: yes.

### B-37 · Packet, sequence and hash tests
- Where: `src/__tests__/signing-packet.test.ts`, `signing-sequence.test.ts`, `signing-document-hash.test.ts`, `signing-multidoc.test.ts`.
- Entry: —
- Does: packet — null for a missing or errored request; certificate rendered first via `/api/quote-pdf/render`; certificate then documents in stored order; upload to `signed-quotes` at `<id>-packet.pdf`; pointer update; a failing document skipped; `pdf` documents read from `signing-documents`; `INTERNAL_RENDER_ORIGIN` precedence; branding failure tolerated. Sequence — reorder immutability and bounds, enumeration, gates, `allReviewed`. Hash — id excluded; content changes the hash. Multidoc — local copies of the page logic plus source-text checks on `SIGN` (unified flag, `renderQuoteReview(false)`, the PDF mount fallback, *Back to review* → `doc_review`, `enumerateForAgreement(unifiedSequence)`).
- Rules: the multidoc suite still asserts the legacy-carousel code (`isLastCarouselDoc` → `"review"`), which sits in a dead branch (B-56).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Overlay signatures

### B-38 · The overlay module (touchpoint)
- Where: `src/lib/quote-canva/overlay-signature.ts:1-260`; templates B-83.
- Entry: B-39.
- Does: see templates B-83. Adds: exactly two slots, `prepared_by` and `client`; the image is fitted with its aspect ratio into the marker rectangle inset 4 pt on every side and centred; every occurrence of the slot's marker is stamped; only stamped markers are removed.
- Rules: no marker for the slot, or an image that fails to embed → the same input bytes back; a failed draw leaves that marker; save failure → the original bytes; an unreadable PDF throws to the caller. `findSlotRects(doc, slot)` is exported and used as a probe by both callers.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-39 · Where overlay signatures apply — the quote PDF only
- Where: `src/lib/quote-signatures/apply-on-approval.ts:48-227`; `src/lib/quote-canva/signed-quote-pdf.ts:127-220`.
- Entry: the designer bake (templates B-85); client signing (B-41).
- Does: two callers — the member signature onto the canonical, the client signature onto the executed PDF.
- Rules: there is no way to place a signature field on an uploaded PDF — no placement tool, no stored coordinates, no marker in a library PDF; T&C / contract HTML documents and composed contracts carry no markers either; none of them is ever stamped — their only evidence is the packet certificate (B-32) and the acknowledgements. Legacy `@react-pdf` quotes keep their in-renderer signature (templates B-81, B-86); bundle / variations signings re-render (templates B-114).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-40 · Slot markers and the fallback signing footer (touchpoint)
- Where: `src/lib/quote-canva/signature-footer-columns.ts:81-153`; `src/components/leads/quote-canva/blocks/signature-footer.tsx:159-228`; `src/lib/quote-canva/render-to-html.tsx:265-293`; templates B-30, B-69, B-84.
- Entry: every canva quote render on the HTML → Chromium path.
- Does: see templates B-30 (the block), B-84 (which column takes which signature), B-69 (the fallback footer).
- Rules: markers exist only on the Chromium path; the three-column footer's centre column never gets one; a canonical rendered before markers shipped, or a quote printed in the legacy layout, is never overlaid (the bake skips it; client signing re-renders instead). Serve-canonical Fix 3 (2026-08-05) makes a footer-less canva body carry the fallback footer and both markers before anyone signs (`shouldInjectSigningFooter`); the editor canvas does not show that footer.
- Data: —
- States: —
- Words: default columns *"Prepared by"* / *"Accepted by"* (templates B-30).
- Reachable: yes.

### B-41 · The client's signature on the executed quote (touchpoint)
- Where: `src/lib/quote-canva/signed-quote-pdf.ts:36-48, 127-220`; `SUBMIT:612-651`; templates B-86.
- Entry: a recorded signature.
- Does: see templates B-86. Adds: `decodeSignatureDataUrl` accepts `data:image/png|jpg|jpeg;base64,…` (trimmed, case-insensitive), else nothing; the quote is `selected_quote_id ?? quote_id`; the overlay runs only for `signing_mode = single`, a stored canonical and a `client` marker — otherwise the quote is re-rendered from the request's frozen lines and schedule with the signature in the render context.
- Rules: the overlay lands on top of any baked designer signature (other slot), so the executed PDF shows both. On the overlay path no *"Signed by <typed name>"* caption is added — the footer shows what the canonical printed; the typed name appears only on the re-render path's caption.
- Data: `signed-quotes/<id>.pdf`, `signed_pdf_url`.
- States: —
- Words: —
- Reachable: yes.

### B-42 · Overlay and marker tests
- Where: `src/__tests__/overlay-signature.test.ts`, `signature-marker-emission.test.ts`, `signed-quote-overlay.test.ts`, `signature-footer-fallback.test.ts`; `scripts/spikes/sigslot-annotation-spike.mjs`.
- Entry: —
- Does: overlay — the rect per slot, no cross-slot match, marker removed, an image drawn, the exact input bytes when no (or another slot's) marker, the text layer unchanged, every per-page marker stamped, the other slot's marker left alone. Emission — both markers inside their columns with no visible ink, positional markers for token-less columns, none in the three-column centre, the fallback footer with both markers. Decode — png / jpeg / jpg, whitespace, non-data and non-image URLs. Fallback — `needsFallbackSignatureFooter` / `shouldInjectSigningFooter` truth tables.
- Rules: whether Chromium emits the Link annotations at all is proven only by the manual spike script (plan Task 6).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Member and studio signatures

### B-43 · "My Signature" — a member captures their own signature
- Where: `src/components/settings/member-signature-card.tsx:18-149`; `src/app/(main)/settings/page.tsx:460-471`; `src/components/homeowner/signature-pad.tsx`; `src/lib/access-control.ts:128`.
- Entry: `/settings` › *"My Signature"* (`#my-signature`).
- Does: with no signature — *"Draw"* (a pad) or *"Upload"* (PNG / JPG), then *"Save signature"*; with one — the image, the *"Auto-apply on approval"* switch (B-45), *"Drawn | Uploaded · saved <date>"* and *"Remove"* (B-46).
- Rules: self-service only — a member sees and sets only their own. `/settings` opens for `owner · admin · id`, so an Accounting-only member has no screen for it (the API would accept them). The card has no *replace*: a member removes, then saves a new one (the API itself can replace, B-47). The pad has no minimum-stroke check (the client's pad has one, quote-editor C-80). The saved date prints in the browser's locale.
- Data: `member_signatures`; bucket `member-signatures` (B-49).
- States: loading skeleton; no preview URL → *"Signature stored"*; buttons disabled while a save / remove runs.
- Words: *"My Signature"*, *"Draw"*, *"Upload"*, *"Clear"*, *"Save signature"*, *"PNG or JPG, up to 1 MB."*, *"Auto-apply on approval"*, *"Automatically stamp your signature on quotes you prepare when they are approved. Revocable anytime."*, *"Drawn"* / *"Uploaded"*, *"saved <date>"*, *"Remove"*, alt *"Your signature"*; toasts *"Signature saved"*, *"Failed to save signature"*, *"Signature removed"*, *"Failed to remove signature"*, *"Failed to update preference"*.
- Reachable: yes.

### B-44 · Image rules for a member signature
- Where: `src/lib/queries/member-signatures.ts:8-52, 71-110`; `src/lib/storage-client.ts:21-41`.
- Entry: *"Save signature"*.
- Does: an upload must be ≤ 1 MB, is redrawn as PNG with its longest edge ≤ 1000 px and re-checked ≤ 1 MB; a drawing is the pad's PNG, checked ≤ 1 MB; the file goes to `member-signatures/{studioId}/{userId}/{uuid}.png` through the shared `/api/storage/upload` route (`upsert: false`), then the record is posted (B-47).
- Rules: every stored member signature is a PNG (JPG uploads are converted); a failed record post leaves the uploaded object orphaned (accepted in the code comment).
- Data: storage object; `member_signatures.storage_path`, `style`.
- States: —
- Words: *"No studio context — please sign in."*, *"Signature too large (<n>KB). Max 1MB."*, *"Signature too large after processing. Max 1MB."*, *"Signature too large. Max 1MB."*, *"No signature provided."*, *"Could not read the image file."*, *"Could not process the image (no canvas context)."*, *"Could not process the image."*
- Reachable: yes.

### B-45 · The auto-apply opt-in
- Where: `src/app/api/member-signatures/records/route.ts:74-101, 111-134`; `member-signature-card.tsx:66-73, 89-102`.
- Entry: the *"Auto-apply on approval"* switch.
- Does: `PATCH { autoApply }` sets `auto_apply` and `consent_at` (now when on, null when off) on the member's active row.
- Rules: a new signature starts opted out; saving a new image through the API carries the previous row's opt-in and its original `consent_at` forward; after *Remove* there is no active row, so the next signature starts opted out again. Turning it off never un-stamps quotes already baked (templates B-85). The copy says "when they are approved"; the bake also runs at submit and at send-for-signature (B-50).
- Data: `member_signatures.auto_apply`, `consent_at`.
- States: switch disabled while saving.
- Words: *"No signature to update"* (404), *"Failed to update signature"*.
- Reachable: yes.

### B-46 · Remove a member signature
- Where: `src/app/api/member-signatures/records/[id]/route.ts:5-23`; `member-signature-card.tsx:55-64`.
- Entry: *"Remove"*.
- Does: `DELETE /api/member-signatures/records/<id>` sets `is_active = false` where the id **and** the caller's user id match.
- Rules: soft delete — the image object stays and quotes already stamped keep their snapshot; nobody can remove another member's signature.
- Data: `member_signatures.is_active`.
- States: —
- Words: *"Failed to remove signature"*.
- Reachable: yes.

### B-47 · The member-signature API
- Where: `src/app/api/member-signatures/records/route.ts:1-134`; `src/app/api/member-signatures/roster/route.ts:1-28`; `src/lib/queries/member-signatures.ts:54-143`.
- Entry: B-43…B-46, B-48.
- Does: `GET /records` — the caller's active row + a one-hour signed preview URL (service-role); `POST /records { storagePath, style }` — deactivates the caller's active row, inserts a new one; `PATCH /records { autoApply }`; `DELETE /records/<id>`; `GET /roster` → `{ memberUserIds }` of the studio's members with an active signature.
- Rules: every route is scoped to the session (`member_user_id = session.userId`, studio from the session, never the body); POST refuses a path outside `{studioId}/{userId}/` and a `style` other than `drawn` / `uploaded`; a missing table (unmigrated environment) reads as "no signature" / an empty roster. One active row per member is also enforced by a partial unique index (quote-editor D-19).
- Data: `member_signatures`.
- States: —
- Words: *"Failed to load signature"*, *"storagePath and style are required"*, *"Invalid storage path"*, *"Failed to save signature"*, *"Failed to load roster"*.
- Reachable: yes.

### B-48 · Who has a signature — the owner's view
- Where: `src/components/settings/team-settings.tsx:69-70, 417-421`.
- Entry: Accounts › *Team Members*.
- Does: a *"Signature"* chip beside each member with an active signature.
- Rules: presence only — never the image; nothing marks members without one; nobody can set or remove another member's signature.
- Data: `GET /api/member-signatures/roster`.
- States: —
- Words: *"Signature"*.
- Reachable: yes.

### B-49 · Member signature data (touchpoint)
- Where: `scripts/migrations/267_member_signatures.sql`, `268_member_signatures_bucket.sql`, `269_quotes_signature_columns.sql`; quote-editor D-19, D-33.
- Entry: —
- Does: see quote-editor D-19 (`member_signatures`, the private `member-signatures` bucket with no storage policies — reads are service-role, writes go through the upload route) and D-33 (`quotes.prepared_by_signature`, `quotes.submitted_by`). Hand-off D.
- Rules: —
- Data: as cited.
- States: —
- Words: —
- Reachable: yes.

### B-50 · The designer bake (touchpoint)
- Where: `src/lib/quote-signatures/apply-on-approval.ts:48-227`; `src/lib/quote-signatures/resolve-signer.ts:3-8`; `src/lib/quote-signatures/prepared-by-signature.ts:5-29`; templates B-85.
- Entry: a quote's first finalize — submit for review, approve (transition, record PATCH, task approval) or send for signature.
- Does: see templates B-85 — once per quote, the preparer's (`submitted_by ?? created_by`) active opted-in signature is hashed, snapshotted into `quotes.prepared_by_signature` and overlaid on the canonical at `om-sigslot:prepared_by`.
- Rules (for contracts): the first finalize wins, so the stamp usually lands at **submit**, before approval, whatever the switch copy says; the approver's own signature is never applied; only the quote PDF carries it — no library document, T&C or contract is ever signed by the studio; send-for-signature skips variation quotes (quote-editor C-69).
- Data: `quotes.prepared_by_signature`.
- States: —
- Words: —
- Reachable: yes (members with an active opted-in signature).

### B-51 · The frozen "Prepared by" text — written, never read
- Where: `RS:284-306, 733-735`; `supabase/migrations/20260520000003_signature_prepared_by_display.sql`; `src/lib/quote-prepared-by.ts`; test `src/__tests__/u1-pr3-prepared-by.test.ts`; quote-editor C-68.
- Entry: link creation.
- Does: `prepared_by_display` = the lead's assignees (first added first) shaped by `settings.branding.quotePreparedByMode` — `team_list` (default: *"A"*, *"A and B"*, *"A, B & C"*), `studio_only`, `first_assignee` — falling back to the branding company name, else the studio name, else *"Studio"*.
- Rules: stored on every request "so the legal record stays immutable", but no route, page, PDF, packet or certificate reads the column; printed documents resolve their own live `{prepared_by}` (templates B-61).
- Data: `quote_signature_requests.prepared_by_display`.
- States: —
- Words: —
- Reachable: written yes; read no.

### B-52 · The older, manual designer signature (touchpoint)
- Where: templates A-43, A-61; `scripts/migrations/177_studio_assets.sql:10, 36`; `docs/prd/01-quote-designer-pdf.md:52`.
- Entry: the Quote PDF layout editor's *Signature block* (templates A-43).
- Does: see templates A-43 (a pasted *Signature image URL*, a second-signatory slot with no control) and A-61 (uploading a `studio_assets` signature and copying its URL).
- Rules (added): no owner, consent or audit record; the image sits in the public-read `studio-assets` bucket; it prints on legacy `@react-pdf` quotes, while member signatures target canva quotes only (spec 2026-07-24 §6.4).
- Data: `studio_assets` `type = 'signature'`; layout `blocks.signatureBlock.designerImageUrl`.
- States: —
- Words: —
- Reachable: yes.

### B-53 · Member signature tests
- Where: `src/__tests__/quote-signatures.test.ts`, `src/__tests__/u1-pr3-prepared-by.test.ts`.
- Entry: —
- Does: `submittedBy` mapping; `resolveSignerUserId` (submitted → created → null); `shouldAutoApply` (null, not opted in, inactive, active + opted in); the snapshot builder; client / designer column matchers; `selectFooterSignatures` cases (a)–(k); `resolvePreparedBy` for all three modes, blanks, trimming and fallbacks.
- Rules: the capture card, the API routes, the roster and the bake itself have no tests.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## The signing page (documents)

### B-54 · The signing page — steps, OTP, review and sign (touchpoint)
- Where: `SIGN:1-1965`; `src/app/sign/[token]/layout.tsx`; quote-editor C-73…C-80, C-82, C-85.
- Entry: `/sign/<token>` (public).
- Does: see quote-editor C-74 (steps, what is withheld before OTP), C-75 (OTP), C-76 (the quote review), C-77 (optional add-ons), C-79 (CaseTrust), C-80 (the sign step), C-85 (done). This slice covers only what the page does with documents (B-55…B-66).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-55 · What the page receives about documents, and when
- Where: `src/app/api/sign/[token]/route.ts:227-298`; `src/app/api/sign/[token]/verify-otp/route.ts:159-173`; `src/lib/signing/sign-pdf-urls.ts:13-30`.
- Entry: page load; OTP verified.
- Does: before OTP the GET returns `documents: []`; verify-otp returns the stored documents with a fresh one-hour signed URL on every PDF; on a `signed` request the GET itself returns the documents with fresh signed URLs, without OTP.
- Rules: URLs are minted with the service-role client for whatever `file_path` the request holds (B-22); a failed mint leaves that document without `signedUrl` (logged, B-58). URLs are not refreshed — a client still on the walk after an hour holds dead PDF links. Each GET also flips `pending → viewed` and appends `link_opened` (quote-editor C-93).
- Data: `quote_signature_requests.documents`.
- States: —
- Words: —
- Reachable: yes.

### B-56 · Which path a request takes on the page
- Where: `SIGN:486-509, 679-688, 1519-1760, 1763`.
- Entry: OTP verified.
- Does: any document besides the quote → the walk (`doc_review`) over **all** documents, quote included, in stored order; the quote alone → the older review screen (`review`), then sign (B-62); no documents (pre-120 rows) → review, then sign.
- Rules: the second, "legacy carousel" branch inside `doc_review` (T&C / contract only, quote on its own screen) can never render — it runs only when `documents` is empty, and then has nothing to show; so the "legacy path" in quote-editor C-78 is dead code, and every request with documents takes the unified walk or the quote-only screen.
- Data: —
- States: —
- Words (dead branch): *"Document <i> of <n>"*, *"Continue to Next Document"*, *"Continue to Quote"*.
- Reachable: the walk yes; the legacy carousel no.

### B-57 · The walk — progress and navigation
- Where: `SIGN:1519-1680`; `src/lib/signing/signing-sequence.ts:45-52`.
- Entry: B-56.
- Does: one document per screen — its title and *"<i> of <n>"*, a segmented progress bar, the document, its tick box when gated, and a single button: *"Continue"*, or *"Proceed to Sign"* on the last item (→ CaseTrust or sign, quote-editor C-79 / C-80).
- Rules: the button stays disabled until `gateSatisfied`; there is no *Back* between documents — the sign step's *"Back to review"* reopens only the **last** item, with no way to earlier ones; ticks and scroll state last while the page stays open. The quote may sit at any position; inside the walk its own *"Proceed to Sign"* is hidden so a mid-sequence quote cannot skip later documents (the 09143079 fix).
- Data: page state `currentDocIndex`, `docAccepted`, `docScrolledToBottom`, `pdfMounted`, `seqViewedAt`.
- States: —
- Words: *"<i> of <n>"*, *"Continue"*, *"Proceed to Sign"*, *"Back to review"*.
- Reachable: yes.

### B-58 · A PDF document on the page
- Where: `SIGN:1565-1606`; `src/components/homeowner/portal-pdf-preview.tsx:32-138`.
- Entry: a `render: "pdf"` item in the walk.
- Does: the PDF drawn inline with pdf.js (fetched as a blob, retried once on the main thread when the worker fails) with *"Open / download PDF"* above it.
- Rules: the scroll gate counts as met as soon as the viewer mounts, so for a PDF only the tick box is enforced. When the item has no `signedUrl` (mint failed) but has a `file_path`, the viewer and the link both point at `/api/sign/<token>/preview-pdf` — the **quote's** PDF, shown under the document's title. A fetch or pdf.js failure shows a card with a direct link.
- Data: `documents[].signedUrl`.
- States: loading; error card.
- Words: *"Open / download PDF"*, *"Preview couldn't load here"*, *"Open <title> in a new tab"*.
- Reachable: yes.

### B-59 · A rich-text document on the page
- Where: `SIGN:1607-1631`; `src/lib/sanitize-contract-html.ts:18-48`.
- Entry: a `render: "html"` item (library rich text, inline document, auto-composed T&C / contract).
- Does: the frozen HTML (merge values already in, B-13) through `sanitizeContractHtml`, in a scroll box.
- Rules: the scroll gate is met within 40 px of the end, or at once when the text fits. The allowlist keeps headings, paragraphs, lists, block quotes, links (`http`, `https`, `mailto`, `tel`) and inline emphasis, with only `class` / `style` attributes — so `mark` (the editor's highlight), images, tables and `data-*` attributes (the editor's text colours) are removed. The packet uses the same sanitizer (B-31).
- Data: `documents[].content_html`.
- States: —
- Words: —
- Reachable: yes.

### B-60 · The quote as a walk item (touchpoint)
- Where: `SIGN:796-1262, 1560-1564`; quote-editor C-76, C-77.
- Entry: the `render: "quote"` item.
- Does: see quote-editor C-76 / C-77 — the designed PDF, optional add-ons, the frozen schedule, the branded footer — and, in the walk, the quote's tick box *"I have reviewed the quotation from <studio> and agree to proceed."* (B-22) gating *Continue*.
- Rules: inside the walk the quote needs the tick (accept on, scroll off); on the older review screen (B-62) it has no tick at all.
- Data: —
- States: —
- Words: as quoted.
- Reachable: yes.

### B-61 · The tick box
- Where: `SIGN:1633-1648`.
- Entry: an item with `requires_accept`.
- Does: a checkbox whose text is the item's `accept_label`; ticking sets the item's accepted flag.
- Rules: the label is whatever the library, the inline default or the server wrote (B-06, B-19, B-22, B-23); it can be unticked until the item is left; no tick time is kept (B-28).
- Data: `accept_label`.
- States: —
- Words: per document.
- Reachable: yes.

### B-62 · The quote-only request on the page
- Where: `SIGN:679-688, 749-763, 1935-1955`.
- Entry: a request whose only document is the quote — the default when the studio adds nothing.
- Does: opens on the older review screen with its own *"Proceed to Sign"* and no tick box, then the sign step.
- Rules: it still counts as a documents request — the agreement uses the documents sentence (*"… as set out in the documents above."*, B-63), a quote acknowledgement is posted (usually with no times), the whole-set hash replaces the snapshot hash (B-29) and a packet is built (B-33). *"Back to review"* takes this client into the walk at the quote, where the tick box now appears and gates *"Proceed to Sign"*.
- Data: —
- States: —
- Words: *"Proceed to Sign"*, *"Please review all items before signing."*
- Reachable: yes.

### B-63 · The agreement sentence names the documents
- Where: `SIGN:1872-1902`; `src/lib/signing/signing-sequence.ts:32-37`.
- Entry: the sign step.
- Does: on a request with documents: *"I, <name|[your name]>, agree to the quotation[ and <titles>] from <issuer|the studio> totalling <total> as set out in the documents above. I understand that this constitutes my digital agreement to proceed."* — `<titles>` = every non-quote title, comma-joined, in sequence order; a pre-120 request gets the single-document sentence (quote-editor C-80).
- Rules: documents are bound by title only (no hash or version in the sentence); the total is the frozen quote total; the issuer follows B-68; the signer must tick it to submit.
- Data: —
- States: —
- Words: as quoted.
- Reachable: yes.

### B-64 · The done page and documents (touchpoint)
- Where: `SIGN:1319-1349`; quote-editor C-85.
- Entry: after submit; reopening a signed link.
- Does: see quote-editor C-85. *"Download signed documents"* appears whenever the loaded request has any documents — every current request — and fetches the packet (B-34).
- Rules: the copy speaks only of a quote (*"Quote Signed!"*, *"You have successfully signed the quotation."*) whatever documents were signed; the top bar reads *"Quote for Signature"* throughout; there is no link to the executed quote PDF on its own.
- Data: —
- States: —
- Words: *"Download signed documents"*.
- Reachable: yes.

### B-65 · A signed link reopened after 7 days turns `expired`
- Where: `src/app/api/sign/[token]/route.ts:36-46`; `src/app/api/sign/[token]/packet/route.ts:44-46`; `src/app/api/sign/[token]/download/route.ts:41-43`; `src/app/api/homeowner/projects/[id]/documents/route.ts:86-91`.
- Entry: loading `/sign/<token>` after `expires_at`.
- Does: the GET checks expiry first and writes `status = 'expired'` for any other status — **`signed` included** — then answers 410.
- Rules: after that write the done page is gone (*"This signing link has expired"*), the packet and executed-PDF downloads answer 409 *"Quote not yet signed"*, and the portal's Documents list (it reads `status = 'signed'`) drops the signed quote and its packet. Studio-side effects of the flipped status are hand-off C; quote-editor C-73 covers the unsigned case.
- Data: `quote_signature_requests.status`.
- States: —
- Words: *"This signing link has expired"*.
- Reachable: yes.

### B-66 · Signing documents in the homeowner portal (touchpoint)
- Where: `src/app/api/homeowner/engagement/[linkId]/route.ts:146-193`; `src/app/my/engagement/[linkId]/page.tsx:230-440`; quote-editor C-92.
- Entry: the portal's engagement page for a lead whose newest request is pending / viewed and unexpired (portal: hand-off C).
- Does: the portal's own wizard — the portal quote list, then each **non-quote** document one per step, then sign; no OTP (the portal login counts).
- Rules: documents are rendered only as sanitized HTML (`content_html`), so a PDF library document shows an empty panel; the gate is the tick box alone (no scroll gate; a *"Skip to end"* jump); *Back* works between steps; the submit sends **no** acknowledgements — the signing keeps the snapshot hash, stores no document times, and its packet certificate prints *"—"* for every viewed / accepted time.
- Data: the engagement payload `signature.documents`.
- States: —
- Words: *"Step <i> of <n>"*, *"Your quote"*, *"Continue to documents"*, *"Continue to sign"*, *"Document <i> of <n>"*, *"Skip to end"*, *"Back"*, *"Next document"*, *"Your quote isn't available to preview here"*, *"You can still review the documents and sign below."*
- Reachable: yes (portal).

---

## Entity-aware signing

### B-67 · Choosing the issuing entity (touchpoint)
- Where: `CFD:255-278, 1010-1031`; `RS:632-671`; `src/lib/quote-canva/resolve-entity-paynow-qr.ts:107-114`; quote-editor C-66, C-68.
- Entry: the send form's *"Issuing entity"* select (studios with ≥ 2 active entities).
- Does: see quote-editor C-66 (the select, defaulting to the lead's entity, else the studio default) and C-68 (a posted id must be an active entity of the studio, else 400; none posted → `selectDefaultEntity`: the default active entity, else the first active by name).
- Rules (added): the chosen entity also scopes the documents list (B-17); *"Regenerate link"* re-posts the dialog's current entity (B-21); single-entity studios still get `company_id` stamped (posted by the dialog, or filled by the ladder when the dialog's selection was reset to none on close). Nothing locks the entity once a link exists.
- Data: `quote_signature_requests.company_id`.
- States: —
- Words: *"Issuing entity"*, *"Default entity"*, *"(default)"*, *"Determines UEN, GST status, and bank details on the signed quote."*
- Reachable: yes.

### B-68 · What the signing page shows for the entity
- Where: `src/app/api/sign/[token]/route.ts:124-275`; `src/lib/entity-branding.ts:126-256`; `SIGN:779-786, 810-823, 1213-1245, 1258-1287`; `src/components/ui/entity-tag.tsx:15-28`.
- Entry: every load of `/sign/<token>`.
- Does: the GET resolves the entity — the request's `company_id` (read even if the entity has since been deactivated), else the default ladder — and merges it over studio branding: company name, address, registration, logo, primary colour, tagline, accreditations, social links, footer text, contact phone / email / website, tax rate. The page uses the entity name as the issuer (*"from <issuer>"*, *"by <issuer>"*, the agreement sentence, *"Thank you for choosing <issuer>!"*) and shows the *"Issued by · <entity>"* chip — both only when the studio has ≥ 2 active entities; otherwise the issuer is the request's frozen `studio_name`.
- Rules: bank details and the GST registration number are never sent (M13); `entity.gstRegistered`, `countryCode` and `currencyCode` are sent but unused — money is formatted by the lead's country, else the entity's, else the studio's, and the footer's registration label follows that country (*"UEN"*, *"SSM Number"*, *"Trade License"*, …). The quote PDF inside the page resolves its own entity by the same ladder (templates B-62). Library documents show whatever entity text they contain — no entity tokens are filled (B-13).
- Data: `studio_companies`; `studios.settings.branding`.
- States: —
- Words: *"Issued by · <entity>"*, *"Quote for Signature"*, *"from <issuer>"*, *"Prepared for"*, *"by <issuer>"*, *"Thank you for choosing <issuer>!"*
- Reachable: yes.

### B-69 · Entity on the executed quote and the confirmation email
- Where: `SUBMIT:571-601, 703-742`; templates B-62, B-86.
- Entry: a recorded signature.
- Does: the submit route loads the entity by `company_id` (no active filter) and resolves branding; the executed PDF comes from the quote renderer or the overlay, which resolve the entity themselves (templates B-62, B-86); the `quote.signed_by_client` dispatch uses the entity's name as both `sender_display_name` and `studio_name` (fallbacks: branding company name → studio name → the request's studio name → *"Your studio"*).
- Rules: the packet's certificate is branded by the studio, never the entity (B-32).
- Data: —
- States: —
- Words: *"Your studio"*.
- Reachable: yes.

### B-70 · The "Issued by" chip in the studio app
- Where: `src/components/leads/lead-detail-drawer.tsx:687-689, 2233-2239`; `src/app/(main)/projects/[projectId]/page.tsx:826-832, 3685`; `src/lib/queries/leads.ts` (`useLatestSignatureRequestForLead`); `src/app/api/quotes/signature-requests/route.ts` (latest mode).
- Entry: the Classic drawer's *Quotes* section; a project's Contracts sub-tab.
- Does: *"Issued by · <entity>"* next to the section title.
- Rules: the entity is the one on the lead's newest signature request of any status (cancelled and expired included); no request → no chip, even when the lead or its quote names an entity; hidden unless the studio has ≥ 2 active entities; the drawer's *Quotes* section exists only in Classic mode, so Journey mode never shows it.
- Data: `quote_signature_requests.company_id` (newest by `created_at`).
- States: —
- Words: *"Issued by · <entity>"*.
- Reachable: yes (multi-entity studios).

### B-71 · Signature requests are not held to the project's entity
- Where: `docs/openmaison-v1-feature-requirements.csv` row 55; `RS:632-671`.
- Entry: —
- Does: the CSV records that a project's entity is DB-locked and four finance tables must match it, "but commission tables and signature requests are NOT covered by that same guard".
- Rules: in code `RS` checks only that the posted entity is an active entity of the studio; nothing compares it with the lead's `company_id`, the quote's entity or a linked project's locked entity (project lock: hand-off C). The same row records that any role, Designer and Accounting included, can edit entities and their bank details.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-72 · Entity-aware signing tests
- Where: `src/__tests__/h10-entity-aware-signing.test.ts:7-237`.
- Entry: —
- Does: source-text checks — the GET counts active entities and returns `multiEntity` at ≥ 2; submit imports `resolveDocumentBranding`, loads the entity only when `company_id` is set and uses `resolved.companyName` for the sender; `EntityTag` renders nothing for an empty name; the dialog shows its select at ≥ 2 and forwards `companyId`; the page reads `entity` / `multiEntity` and prefers the entity name; the latest-request hook reads newest-first, limit 1; drawer and project page mount the chip; bank-detail keys are normalised.
- Rules: nothing renders a signed PDF under two entities (the spec's acceptance check).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Archival guards

### B-73 · The archival guard on the signing routes
- Where: `src/lib/lifecycle/archival.ts:44-138`; `src/app/api/sign/[token]/route.ts:56-65`; `SUBMIT:85-96`; `src/app/api/sign/[token]/preview-pdf/route.ts:174-177`.
- Entry: any GET of the link, the on-demand quote PDF, a signature submit.
- Does: when the request's lead has `archived_at`, these three routes answer 410 with a generic dead-link message instead of loading, rendering or signing.
- Rules: leads "freeze", projects do not — only the lead is checked; the public variant never says "archived"; the guard fails **open** (a lookup error lets the request through). In the GET it runs after the expiry and cancelled checks and before the `viewed` write and the `link_opened` event; in submit it runs after the already-signed check (a client who finished is told so) and before any write — no signature, lead move, PDF or notification.
- Data: `leads.archived_at`.
- States: —
- Words: *"This link is no longer active. Please contact your designer for an updated link."* (410); studio variant `ENTITY_ARCHIVED` — *"This record has been archived. Revive it before making changes."* (409, not used on these routes).
- Reachable: yes.

### B-74 · What the archival guard does not cover
- Where: `src/app/api/sign/[token]/request-otp/route.ts`; `verify-otp/route.ts`; `download/route.ts`; `packet/route.ts`; `src/app/api/sign/certificate/[id]/route.ts`.
- Entry: —
- Does: OTP request and verify, the executed-PDF download, the packet download and the certificate carry no archival check.
- Rules: an archived lead's signed link fails on the page (GET 410) while its packet and signed quote still download by direct URL; a page opened before the archive can still request and verify an OTP — only the submit refuses.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-75 · Archival tests
- Where: `src/__tests__/archival-signing-guard.test.ts`, `archival-signing-preview-guard.test.ts`, `archival-signing-submit-guard.test.ts`.
- Entry: —
- Does: GET — refuses an archived lead's link, never leaks "archived", does not mark it viewed, writes no `link_opened`, still marks a live lead's link viewed; preview-pdf — refuses and renders nothing; submit — refuses, writes nothing, dispatches no `quote.signed_by_client`, lets a live lead through.
- Rules: no test covers OTP, download or packet on an archived lead (B-74).
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Certificate

### B-76 · The in-app signature certificate (touchpoint)
- Where: `src/components/leads/drawer-sections/signature-certificate.tsx:1-264`; `src/app/api/sign/certificate/[id]/route.ts:7-89`; quote-editor C-86.
- Entry: under a signed primary quote in the drawer (quote-editor C-86).
- Does: see quote-editor C-86.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-77 · Certificate details quote-editor C-86 did not list
- Where: `signature-certificate.tsx:12-73, 144-150, 184-188`; `src/app/api/sign/certificate/[id]/route.ts:46-82`; `supabase/migrations/20260406000001_signature_certificate.sql`.
- Entry: B-76.
- Does: renders the evidence of one signing request for the studio.
- Rules: the verification badge always reads *"Phone OTP verified"* — `verification_method` is never written (column default `phone_otp`), so portal signings (no OTP) show it too; *"Signed by"* is `client_name`, the name the studio typed; the date is `en-SG` medium date + short time in the signer's recorded time zone (else the region's), suffixed with the zone's city; IPs are masked (`a.b.***.***`, IPv6 tail `:****:****`); the device is parsed to *"<browser> on <OS>"*; phone, audit trail, IP and device reach only owners / admins (tags read server-side); the legal-act line has its own table that differs from the signing page's (SG *"Singapore Electronic Transactions Act (Cap 88)"* vs *"Singapore Electronic Transactions Act"*; MY *"Malaysia Digital Signature Act 1997"* vs *"Malaysian Electronic Commerce Act 2006"*; AE *"UAE Federal Law No. 46 of 2021 on Electronic Transactions"* vs *"UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions"*), falling back to Singapore's; the card lists no documents, acknowledgements, whole-set hash or packet link.
- Data: `quote_signature_requests` (`verification_method`, `signer_timezone`, `audit_trail`, `signer_ip`, `signer_user_agent`).
- States: skeleton; nothing when unsigned.
- Words: *"Phone OTP verified"*, *"Signed under the <act>."*, *"Signer IP: <ip>"*, *"Device: <browser> on <OS>"*, *"Unknown device"*, *"Unknown"*.
- Reachable: yes.

### B-78 · The integrity line on document signings
- Where: `src/app/api/sign/certificate/[id]/route.ts:57-59`; `SUBMIT:256-262`; `signature-certificate.tsx:152-170`.
- Entry: B-76.
- Does: `hashMatch` = `document_hash === signing_hash`.
- Rules: on every signing that posted acknowledgements — every public-page signing of a current request, quote-only included (B-62) — `signing_hash` is the whole-set hash (B-29), which can never equal the snapshot hash, so the card reads *"Document may have been modified after signing"*; portal signings (no acknowledgements) read *"Document integrity verified"*; rows from before the certificate columns read *"Signed before integrity tracking was enabled"*. Read from code, not observed (settles quote-editor C-86's uncertain item as far as reading goes).
- Data: `document_hash`, `signing_hash`.
- States: —
- Words: *"Document integrity verified"*, *"Document may have been modified after signing"*, *"Signed before integrity tracking was enabled"*.
- Reachable: yes.

### B-79 · Two certificates that disagree
- Where: B-32; B-77.
- Entry: —
- Does: the packet's certificate page and the in-app card describe the same signing differently.
- Rules: the packet prints the full phone, IP and user agent for anyone holding the packet; the card masks the IP and hides the phone from non-owners; the packet prints the whole-set hash and per-document times, the card only its pass / fail line (which fails, B-78); UTC on the packet, the signer's zone on the card; neither prints the name the client typed; neither shows the other exists.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-80 · The signing audit trail and documents (touchpoint)
- Where: `src/lib/audit-trail.ts:24-60`; `SUBMIT:215-240, 300-315`; quote-editor C-93.
- Entry: —
- Does: see quote-editor C-93.
- Rules (added): no event is written when a document is viewed or ticked — document evidence exists only in `document_acknowledgements`, written once at submit; `signature_submitted` records `multiDocAcknowledgements` (a count); a refused acknowledgement is logged as `signature_refused_hash_mismatch` with the document id (and `reason: "unknown_doc_id"` for an unknown one).
- Data: `quote_signature_requests.audit_trail`.
- States: —
- Words: —
- Reachable: yes.

---

## Docs vs code discrepancies

### B-81 · Spec 2026-06-30 "Multi-Document Signing" vs code
- Where: `docs/superpowers/specs/2026-06-30-multi-document-signing-design.md` §3–§13.
- Entry: —
- Does: the spec says — inline documents "default to this-send-only with a 'Save to library for reuse' checkbox"; library gates default on; a "Document N of M" label; the packet reaches the studio on the "lead/project contract card + download" and through a notification "with a secure signed-URL link"; `request-signature` "Replaces the current 'auto-pull default tnc + contract' composer"; integrity: "the submit route rejects on hash mismatch (tamper-evident)"; an empty state with an "Add your first document" CTA; per-entity resolution "entity-specific → studio-wide → none".
- Rules: the code — inline **PDFs** always become library rows (B-18), only inline rich text has the switch (B-19); the tab's create dialog starts both gates off (B-06); the walk shows *"<i> of <n>"* (B-57); no studio surface and no notification link for the packet (B-35); the auto-compose composer still runs on *"Regenerate link"* (B-23); the hash check compares stored hashes with themselves and a PDF's hash covers only its path (B-26, B-29); the CTA reads *"Add your first signing document"*; entity resolution as specified (B-04, B-17).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-82 · Test plan 2026-06-30 vs code
- Where: `docs/superpowers/plans/2026-06-30-multi-document-signing-test-plan.md`.
- Entry: —
- Does: the plan says — 2B.3 the inline "save to library" toggle persists; 3A.3 "'Document N of M' correct"; 5.5 `/packet` on a single-quote signing → 404; 5.6 mutating `documents[].content` in the DB makes submit return 409 `document_hash_mismatch`; 6.1 a send without extra documents stores `documents[]` "empty/absent" and runs "the OLD carousel→review→sign flow"; 6.2 "no packet built; no `has_document_packet`".
- Rules: the code — 2B.3 PDFs bypass the toggle (B-18); 3A.3 the label is *"<i> of <n>"*; 5.5 holds only for pre-120 rows; 5.6 a content-only mutation is not detected (B-29); 6.1 / 6.2 every send stores at least the quote, opens on the review screen, builds a packet and sends `has_document_packet: "yes"` (B-33, B-35, B-62).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-83 · Plan 2026-06-30 vs code
- Where: `docs/superpowers/plans/2026-06-30-multi-document-signing.md` (Tasks 4, 9, 10, 13).
- Entry: —
- Does: the plan says — migration `243_signature_request_packet.sql`; `request-signature` "Guard: only when `signing_mode='single'`"; Upload / Create "on success append … and, if 'save to library' ticked, also persist"; `GET` returns an array.
- Rules: the code — migration `246` (renumbered at merge); no single-mode guard (B-22); an upload always persists (B-18); `GET` returns `{ documents }` (B-10); soft delete with retained objects as planned (B-08).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-84 · Spec + plan 2026-08-04 "Overlay Signature Signing" vs code
- Where: `docs/superpowers/specs/2026-08-04-overlay-signature-signing-design.md`; `docs/superpowers/plans/2026-08-04-overlay-signature-signing.md`.
- Entry: —
- Does: the spec says — "Make **every** canva quote signable — designer AND client signatures — without ever re-rendering"; footer-less templates get no marker (known limitation); "No canonical yet … skip"; bundle / variations keep the combined render; per-page markers for repeating footers may not exist (to be proven by the spike).
- Rules: the code — as specified, with two later changes: footer-less canva bodies now get the fallback footer and markers before signing (B-40), and an absent canonical is rendered on the fly before the bake (templates B-85). "Every canva quote" is the quote only — no signing document is ever stamped (B-39).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-85 · Spec 2026-08-05 "Serve-the-Canonical Signing Fixes" vs code
- Where: `docs/superpowers/specs/2026-08-05-serve-canonical-signing-fixes-design.md`; `src/components/leads/drawer-sections/quote-summary-card.tsx:92-106`; `src/components/leads/quote-digitizer-dialog.tsx:5487-5496`; `src/app/api/leads/[id]/quote/download/route.ts:50-52`; `signature-footer-columns.ts:138-153`.
- Entry: —
- Does: the spec says — Fix 1: the drawer's *View* opens the canonical (the executed PDF once signed) for finalized quotes through a new `onViewQuotePdf(kind, id)` prop and a `view=1` inline parameter; Fix 2: the digitizer's *Download PDF* serves the canonical for finalized quotes; Fix 3: footer-less canva bodies get a signing footer on the marker path; Fix 4: the bake renders an absent canonical first.
- Rules: the code — all four shipped; Fix 1 is an internal `openQuotePdf` in the summary card, not a prop. Fixes 1–2 are quote-editor surfaces (quote-editor audit); none touches signing documents or the packet.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-86 · Spec 2026-07-24 "Member Signature Repository + Auto-Sign" vs code
- Where: `docs/superpowers/specs/2026-07-24-member-signature-repository-auto-sign-design.md`; `docs/superpowers/plans/2026-07-24-member-signature-repository-auto-sign.md`.
- Entry: —
- Does: the spec says — the preparer's signature applies "when their quote is approved"; §6.5 approval deletes the canonical and the next read re-renders it with the stamp; the toggle's helper "notes the approver (owner/admin) may trigger the stamp on the member's behalf"; the Team tab shows "Signature ✓ / —"; "Replacing a signature soft-deletes the prior active row"; VO auto-sign, typed and multiple signatures are out of scope.
- Rules: the code — the bake runs at the first finalize, submit included (B-50); since 2026-08-04 it overlays the canonical rather than deleting and re-rendering; the helper has no approver note (B-43); the Team chip shows presence only (B-48); the card offers remove-then-save, not replace, though the API replaces (B-43, B-47); variation quotes are skipped at send (B-50).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-87 · Spec 2026-05-07 "H10 entity-aware quote signing" vs code (touchpoint)
- Where: `docs/superpowers/specs/2026-05-07-h10-entity-aware-quote-signing-design.md` (+ plan); quote-editor C-123.
- Entry: —
- Does: see quote-editor C-123.
- Rules (added): §4.2 passes merged branding into `renderQuotePdfBuffer` at submit — that renderer path is gone; the executed PDF now comes from the canva renderer / overlay, and the submit route's branding feeds only the email sender (B-69). §4.3's "GST footer line prefers `entity.gstRegistrationNumber`" and "Bank details block prefers `entity.bankDetails`" — the page receives neither (B-68). §8 Q2 (lock the entity once a link exists) — nothing locks it (B-67).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-88 · PRD 11 "Quote Signing Flow" vs code
- Where: `docs/prd/11-quote-signing.md`.
- Entry: —
- Does: the PRD says — "a per-document carousel (T&C + Contract) before the quote review"; "the signed PDF URL is included in the notification"; "the signing page shows the issuing legal entity ('Issued by' chip)"; the send flow "picks documents + entity".
- Rules: the code — the quote is one item placed anywhere in the walk, and T&C / contract appear only when picked (or on regenerate, B-23, B-57); the notification carries `signed_pdf_url` in its stored public-URL form (the bucket is private, templates B-87) plus the studio-gated `signed_quote_url`; the chip shows only on multi-entity studios (B-68); the PRD never mentions the library, acknowledgements or the packet.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-89 · PRD 04 and PRD 01 vs code
- Where: `docs/prd/04-multi-entity-finance.md:47-49, 66`; `docs/prd/01-quote-designer-pdf.md:52, 68`.
- Entry: —
- Does: PRD 04 says "entity branding and bank details on the signing page and PO portal ('Issued by' chip)" and that the signing page shows "the issuing entity's name and details"; PRD 01 says studios "upload their own … designer signatures".
- Rules: the code — the signing page never receives bank details or the GST number (B-68); designer signatures now come from each member's repository (B-43), with the older pasted-URL knob still live (B-52).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-90 · Plan 2026-04-29 "Customization P6" §4 vs code
- Where: `docs/superpowers/plans/2026-04-29-customization-p6-document-templates.md:1253-1456`; `scripts/migrations/118_seed_default_document_templates.sql:38-43`.
- Entry: —
- Does: the plan says — the carousel's last item offers "Continue to Signature" only when `requires_signature`, else "Submit" with no signature; each document's `accept_label` replaces the hard-coded agreement text; the `signing_flow` template orders the carousel.
- Rules: the code — every signing ends in one drawn signature whatever `requires_signature` says (B-30); the agreement sentence is still hard-coded, now listing titles (B-63); `docOrder` is never read (B-24).
- Data: —
- States: —
- Words: —
- Reachable: —

### B-91 · `docs/rules/leads.md` §Quote Signing Flow (touchpoint)
- Where: `docs/rules/leads.md:407-435`; quote-editor C-119.
- Entry: —
- Does: see quote-editor C-119.
- Rules (added): the rules file never mentions the signing documents library, per-document acceptance, acknowledgements, the packet or the `packet` route; no other file under `docs/rules/` has a signing section.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-92 · `docs/openmaison-v1-feature-requirements.csv` vs this slice
- Where: `docs/openmaison-v1-feature-requirements.csv` (all rows searched for signing terms).
- Entry: —
- Does: no row covers the signing documents library, multi-document signing, the packet, member signatures or the certificate; row 55 is the only one that names signature requests (B-71).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### B-93 · In-code comments and copy that contradict the code
- Where: as cited.
- Entry: —
- Does: (1) the library delete confirm says *"This cannot be undone."* — it is a soft delete (B-08); (2) the hooks file says delete "Soft-deletes (or hard-deletes)" — always soft (B-11); (3) migration 246 and `DbQuoteSignatureRequest` call `signed_packet_path` a "future" combined PDF — built (B-31); (4) submit ("Legacy single-quote signings (no documents array) skip this") and the packet route ("a combined packet only exists for multi-document signings") — every current signing has one (B-33); (5) `SIGN`'s comment that the carousel "only engages when the studio has tnc/contract templates seeded" and the multidoc test header's "Quote always sits in the rich review step" — the quote is a walk item (B-56); (6) migration 120's comment that requests are built from "the studio's signing_flow + tnc + contract document templates" — `signing_flow` is unread (B-24); (7) the switch copy *"…when they are approved"* — the bake runs at submit (B-50); (8) the `prepared_by_display` migration's "legal record stays immutable" — nothing reads it (B-51).
- Rules: —
- Data: —
- States: —
- Words: as quoted.
- Reachable: —

### B-94 · Earlier audits' readings adjusted here
- Where: templates C (Uncertain, "Signing-library documents and variables"), templates C-55, C-65; quote-editor C-72, C-78, C-86.
- Entry: —
- Does: templates C found "no substitution site" for library bodies — `RS:543-547` substitutes five values and blanks the rest (B-13); quote-editor C-78's "legacy path" (T&C / contract only, quote on its own step) cannot render (B-56), and a quote-only request opens on the review screen rather than the walk (B-62); quote-editor C-86's uncertain integrity line — by reading, every public-page document signing shows "modified" (B-78); quote-editor C-72's "auto-compose only on regenerate" holds, and even quote-only signings get a packet (B-33).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Uncertain / not verified

1. **The `signing-documents` bucket per environment.** No migration creates it or any `storage.objects` policy for it (B-12). Uploads go through the studio-scoped anon-key client; whether that upload succeeds without a policy, and which environments have the bucket, is not visible in code.
2. **Cross-studio `file_path`.** `RS` copies `file_path` from the browser unchecked and the public routes mint signed URLs / download with the service-role client (B-22, B-55, B-31). That a crafted request could reference another studio's object follows from the code; not exercised.
3. **Tamper detection on documents.** The claim that a database edit of `documents[].content_html` (hash left alone) signs without complaint (B-29) is read from the submit route; not run. Likewise that a PDF swapped in storage at the same path keeps its hash (B-26).
4. **The integrity line reads "modified" for every document signing** (B-78) — derived from the two hash definitions; not observed on a real certificate.
5. **Acknowledgement times.** `acceptedAt = viewedAt` and the quote-only request posting no times (B-28, B-62) are read from `SIGN:749-763`; not observed in stored rows.
6. **The PDF fallback to the quote preview** (B-58) — follows from `doc.signedUrl ?? "/api/sign/<token>/preview-pdf"`; a failed mint was not produced.
7. **Signed links flipping to `expired`** (B-65) — read from the GET's order of checks; not run; its effect on the drawer's deal-won state and project surfaces is hand-off C.
8. **Packet build in the background.** The submit route builds the executed PDF and the packet in an un-awaited async block after responding; whether the serverless platform lets it finish is not visible — the packet route's cold-start build covers a missing object, the 60 s ceiling may not cover many large documents. Not run.
9. **The portal wizard and PDF documents** (B-66) — a PDF document rendering as an empty panel follows from `content_html || ""`; not observed in the portal.
10. **Chromium Link annotations for slot markers**, especially on repeating (running) footers — proven only by the manual spike (B-42); not re-run.
11. **`signed_pdf_url` in the notification** — whether the stored public-URL form opens depends on which of migrations 233 / 234 applies per database (templates B-87, B-115).
12. **Member-signature privacy between members.** Per-member scoping is enforced in the API routes only; the table's RLS scopes by studio. Whether any other route exposes another member's `storage_path` was not checked beyond this slice's routes.
13. **The send form's documents list surviving a close** (B-21) — the dialog stays mounted with an `open` prop; whether a drawer re-mount clears it in practice was not exercised.
14. **CaseTrust** on the walk is quote-editor C-79 (dead in practice); not re-read for documents.
15. **The executed PDF's entity** is resolved inside the quote renderer (templates B-62); not re-read here.
