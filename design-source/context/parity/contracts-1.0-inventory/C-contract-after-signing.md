# OpenMaison 1.0 — Contracts inventory · Slice C: the contract's life and its reach into other modules

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader or an earlier audit, and only named here. Readers of this audit: **A** = the contract flow dialog and the contract document (`A-contract-flow-and-document.md`); **B** = the signing library, packets, the signing page and member signatures (`B-signing-library-and-page.md`); **D** = the data model (`D-data-model.md`). Earlier audits: "QE C-nn / D-nn" = `../quote-editor-1.0-inventory/C-lifecycle-and-client.md` / `D-data-model.md`; "templates A-nn … D-nn" = `../quote-templates-1.0-inventory/`; "Leads B-nn / C-nn" = `../leads-1.0-inventory/B-detail.md` / `C-engine-settings-touchpoints.md`. Finance and Projects are later modules: their rows here are touchpoints — what the contract must carry for them — not their internals. Abbreviations: `CFD` = `src/components/leads/contract-flow-dialog.tsx`; `LDD` = `src/components/leads/lead-detail-drawer.tsx`; `PROJ` = `src/app/(main)/projects/[projectId]/page.tsx`; `SUBMIT` = `src/app/api/sign/[token]/submit/route.ts`; `SR` = `src/app/api/quotes/signature-requests/route.ts`; `ENG` = `src/app/my/engagement/[linkId]/page.tsx`; `ENGAPI` = `src/app/api/homeowner/engagement/[linkId]/route.ts`; `PORTAL` = `src/app/my/projects/[projectId]/page.tsx`. Emoji glyphs in UI strings are omitted from quotes.

## Vocabulary

- **Contract (1.0)** — no table, number or status; four artefacts stand in for it: a `signed` signature request, the lead's paper-contract flag + its lead file, a composed contract PDF e-mailed from the lead, and the project's contract file (C-01; D-01).
- **Contract record** — used in this slice for any of those four; only the signature request (`quote_signature_requests`, QE C-64, D-02) has a status and an audit trail.
- **Lead contract flag** — `leads.contract_uploaded` + `leads.contract_file_name` (`017_projects_and_leads_extended.sql:40-41`; C-02; D-10).
- **Phantom file name** — `client-signed-quote.pdf`: written by the signing mirror, seeded by the drawer; no file carries that name (C-02).
- **Project contract** — `projects.contract_file_name` + `projects.contract_file_url` (bucket `contract-files`) plus `project_files` rows in folder `contract` (C-28 … C-42; D-11).
- **Executed PDF** — `signed-quotes/{requestId}.pdf`, the signed quote with the client's signature stamped in (templates B-86); its **project copy** is `contract-files/{studioId}/{projectId}/signed-contract.pdf` (C-30, C-31).
- **Newest request** — the lead's latest `quote_signature_requests` row by `created_at`, whatever its status; most surfaces read this one (C-03, C-06).
- **Contract quote** — the quote a surface treats as the deal; eight different rules exist (C-22).
- **Contract value** — `resolveContractValueCents`: latest signed base quote's `total_cents`, else the primary quote at `approved` / `sent_for_signature`, else `projects.budget_total` × 100; plus approved client VOs; floored at 0 (C-43). **Contract base** — the same without VOs.
- **Contract loader** — `resolveProjectContract` / `resolveProjectContractsBatch` (design D7): the only server reader of a project's contract value and GST fraction (C-44).
- **Freeze** — migration 307: `quotes.signed_at`, `finalize_signed_mirror` v5 and the trigger `trg_quote_totals_frozen` (C-47 … C-49).
- **Certificate total** — `quote_signature_requests.quote_total` (NUMERIC dollars), which the 307 repair treats as the legal record of what was signed (C-50).
- **VO omission** — a variation-order line with `is_omission = true`: a credit against the contract (C-52 … C-56).
- **Contract before / revised contract** — `computeVoContext`: the contract value excluding this VO, and that value plus the VO's signed net (C-52).
- **Engagement page** — `/my/engagement/<linkId>`, the portal's lead-stage page where a homeowner signs without OTP (C-58 … C-60).

---

## Contract records and statuses

### C-01 · No contract record — the four things that stand for "the contract"
- Where: `scripts/migrations/017_projects_and_leads_extended.sql:20, 40-41`; `140_projects_contract_url.sql:13-16`; `210_contract_files_bucket.sql:30-47`; `042_quote_signature_requests.sql`; `src/lib/queries/contracts.ts:1-98`; repository search for `project_contracts`, `signed_contract`, a `contracts` table (none); D-01.
- Entry: —
- Does: 1.0 has no contract entity, no contract number and no contract status. Four artefacts stand in, each read by different surfaces: (1) a `signed` signature request — the e-signed quote, its documents and executed PDF (QE C-64, C-83; B); (2) a paper contract on the lead — a `lead_files` row plus the lead contract flag (A-18, C-02); (3) a composed contract PDF e-mailed to the client — one more `lead_files` row, never signable on the platform (A; C-08); (4) the project contract — `projects.contract_file_name` / `contract_file_url` and `project_files` rows in folder `contract` (C-28 … C-42). `src/lib/queries/contracts.ts` holds only the composed-contract hooks `useRenderContractPdf` and `useSendContractToClient` (hand-off A) and the helper `triggerBlobDownload`.
- Rules: nothing links the four. A project knows its lead (`projects.lead_id`), the lead knows its newest request (`leads.signature_request_id`), and every other join is by `lead_id` or by **file name** (C-34). There is no "void", "superseded" or "terminated" state for a signed contract, no second signatory (QE C-81) and no countersignature by the studio beyond the designer's baked signature (B-50).
- Data: D-01, D-02, D-10 … D-12.
- States: —
- Words: —
- Reachable: yes.

### C-02 · The lead contract flag after signing — who sets it, what never clears it
- Where: writers `scripts/migrations/307_finance_contract_freeze.sql:85-90` (`finalize_signed_mirror` v5), `SUBMIT:410-418` (fallback), `LDD:847-848, 940-941, 1100-1124` (seed + autosave diff), `src/app/api/leads/mutations/[id]/route.ts:48-54` (allow-list), lead intake `src/app/api/webhooks/leads/[token]/route.ts:218`, `src/app/api/cron/poll-emails/route.ts:323`; readers `src/lib/leads/drawer-autosave.ts:70-95`, `src/lib/leads/journey.ts:355-356`, `CFD:585-586, 612`, `src/components/leads/drawer-sections/quote-summary-card.tsx:216-230`, `src/components/leads/drawer-sections/bucket-status-section.tsx:190-235`; D-10.
- Entry: a client signature; the paper upload (A-18); any drawer autosave.
- Does: says "a contract is on file" for the lead. A base-contract signing (QE C-84) sets `true` + `client-signed-quote.pdf`; a VO-only signing leaves it. A paper upload sets `true` + the uploaded file's name through the drawer autosave (A-18). Leads from webhooks and Gmail start `false`. For a `client_signed` lead the drawer seeds `true` + the phantom name even when the columns say otherwise, and writes only real changes back; its validation ignores the phantom name (`LDD:1061-1062`).
- Rules: the lead PATCH accepts both columns from any studio member with no check that a file exists. Nothing ever sets the flag back to `false` — not Cancel signing (QE C-90), not Revise, not deleting the quote, not deleting the uploaded lead file (Leads B-49), not an expired or cancelled request. After a signing the lead reads "on file" under the phantom name, which is also what project creation copies into `projects.contract_file_name` (C-28).
- Data: `leads.contract_uploaded BOOLEAN NOT NULL DEFAULT false`, `leads.contract_file_name TEXT`.
- States: —
- Words: `client-signed-quote.pdf` (a stored value shown as a file name).
- Reachable: yes.

### C-03 · The signature request as the executed-contract record
- Where: QE C-64 (statuses), C-83 (what signing writes), C-93 (audit trail); B-65; `SR:47-113`; `src/app/api/projects/[id]/contract/from-signature/route.ts:69-79`; `src/app/api/projects/[id]/contract/list/route.ts:106-122`; `src/app/api/homeowner/projects/[id]/documents/route.ts:82-93`; `ENGAPI:145-160`; `src/app/api/homeowner/engagement/[linkId]/document/route.ts:181-191`.
- Entry: —
- Does: the only contract artefact with a lifecycle — `pending → viewed → signed`, or `cancelled` / `expired` (QE C-64). A `signed` row holds the drawn signature, signer evidence, the frozen snapshot, total, schedule, documents, hashes and the paths of the executed PDF and the packet (D-02).
- Rules: readers choose "the" request two ways. **Newest by `created_at`, any status** — the contract dialog, the drawer's cards, the project page's banner / card / setup check, the portal engagement page and its document proxy (C-06). **Newest `status = 'signed'` by `signed_at`** — the project's contract routes (C-31, C-34, C-35), the portal Documents tab (C-64), the 307 repair (C-50). A newer request therefore hides an older signed one from the first group only. A signed row is never reopened or voided; loading its link after 7 days rewrites it to `expired` (B-65, C-41).
- Data: `quote_signature_requests` (D-02).
- States: —
- Words: —
- Reachable: yes.

### C-04 · The contract's life — every transition that exists
- Where: QE C-02, C-09, C-48, C-64, C-69, C-83, C-84, C-88 … C-90; B-65; A-18, A-19; `307_finance_contract_freeze.sql:121-141`; `src/lib/lifecycle/transitions.ts:61-99, 190-243`.
- Entry: —
- Does: the moves a lead's contract can make:
  - none → **paper on file** (upload, A-18; replace, A-19) or **link out** (`pending`, QE C-69);
  - link out → `viewed` → `signed` (QE C-83) · `cancelled` (Cancel signing, a newer send, deleting a covered quote) · `expired` (lazily, when the link is loaded after 7 days);
  - `signed` → `expired` (the same lazy write, B-65) — and nothing else: no unsign, void or revise (`client_signed` has no exit, QE C-02); the signed quote cannot be deleted (`SIGNATURE_EXISTS`, QE C-48); later changes are variation orders (C-25).
- Rules: signing another base quote of the same lead demotes the older signed base quote to `approved` (C-23) — the only way a signed quote stops being the contract; its request stays `signed`. Paper and digital are not exclusive: a lead can hold the paper flag and a signed request at once, and each surface shows one of them (C-05). Archiving a lead leaves a live link `pending` / `viewed` (C-10). The request status and the lead flag never move each other back.
- Data: C-02, C-03.
- States: —
- Words: —
- Reachable: yes.

### C-05 · How each surface names the contract's state
- Where: `bucket-status-section.tsx:176-235` (Leads B-40); `quote-summary-card.tsx:140-146, 201-230`; `src/lib/leads/journey.ts:72, 355-358`; `CFD:603-626` (QE C-65, A-08); `PROJ:1897-1924, 4952-4964`; `src/components/projects/setup-progress.tsx:40-41`; `src/components/projects/key-files-rail.tsx:92, 188`; `ENG:173-228`; `src/app/api/homeowner/dashboard/route.ts:82-90`.
- Entry: —
- Does: each surface derives its own state from its own inputs:

| Surface | Reads | States |
|---|---|---|
| Classic *Lead Status* block (Leads B-40) | lead flag; newest request | file name + *"Replace"*; *"Signed digitally — on file"* / *"Awaiting signature — client viewed the link"* / *"Sent for signature — awaiting client"* + *"Upload signed copy"*; *"Upload or create contract"* |
| Journey *Contract* step (Leads C-09) | `contractUploaded` or `signatureRequestId` | done / not done |
| Deal card rows (C-14) | primary quote status; newest request; lead flag | *"Signed"* / *"Viewed"* / *"Awaiting signature"*; *"On file"* / *"Signed quote"* / *"Not uploaded"* |
| Contract & Signing dialog (A-08) | newest request; lead flag | signed › in flight › paper signed › send |
| Project banner (C-38) | newest request of the project's lead | shown for `pending` / `viewed` only |
| Project *Contract document* card (C-33) | `contract_file_url`; newest request `signed` | file · e-signed · none |
| Project setup check (C-37) | `contract_file_name`; project `quote_status`; newest request `signed` | *"Contract uploaded"* done / open |
| Key Files *Contract* tile (C-36) | `project_files` folder `contract`; `contract_file_name`; project `quote_status` | file name or *"Signed"*; *"No contract yet"* |
| Portal engagement banner (C-59) | newest request | *"Contract signed"* · *"Ready for your signature"* · *"Signing link unavailable"* |
| Portal dashboard card (C-65) | lead mirror `quote_status` | *"Signed"* · *"Awaiting signature"* · *"Quote ready"* · *"Quote in review"* · *"Getting started"* |

- Rules: no two surfaces read the same inputs. The Classic block checks the lead flag first (`bucket-status-section.tsx:201`), and the drawer seeds that flag for every `client_signed` lead, so a signed lead shows the phantom *client-signed-quote.pdf* row with *"Replace"*; *"Signed digitally — on file"* shows only while the flag is off. Sending a link already completes the journey's Contract step; the project setup check is satisfied by a bare file name (including the phantom); the portal card follows the lead mirror, not the request.
- Data: C-02, C-03.
- States: —
- Words: as in the table.
- Reachable: yes.

### C-06 · Reading the newest request — `/api/quotes/signature-requests`
- Where: `SR:25-198`; hooks `src/lib/queries/leads.ts:1410-1430` (`useGetSignatureRequest`), `1547-1594` (`useLatestSignatureRequestForLead`), `714-777` (`validateLeadEntityChange`), `785-821` (`useMigrateLeadEntity`); consumers `PROJ:830`, `CFD:134`, `LDD:687`, `src/components/leads/drawer-sections/multi-quote-section.tsx:140`, `quote-summary-card.tsx:67`, `src/components/projects/draft-setup-card.tsx:32`.
- Entry: every surface in C-05 that shows a request.
- Does: `GET ?leadId=&latest=1` returns the newest request by `created_at` as a raw summary `{ id, company_id, status, created_at, signed_at, token, quote_id, quote_ids, signing_mode, selected_quote_id, client_name, client_phone, content_drifted }`; `content_drifted` is computed only for `pending` / `viewed` single-mode requests, comparing `id | qty | unit_price | discount_amount | amount_marker` of the snapshot's quote lines with the live lines (QE C-87), and the snapshot itself is stripped. `GET ?leadId=&count=1` returns how many requests the lead has (the entity-change probe, Leads B-64). `GET ?leadId=` returns the newest full row, transformed, with `signed_pdf_url` re-signed for an hour. `POST { op: "migrate-company" }` is C-07.
- Rules: session + RLS-scoped client; no role check. The full-row mode's hook `useGetSignatureRequest` has no caller.
- Data: `quote_signature_requests`.
- States: a failed latest read logs and returns `null` (surfaces then show "no request").
- Words: *"leadId required"*, *"unknown op"*, *"Unknown legal entity for this studio"*, *"Internal server error"*.
- Reachable: yes (latest, count, migrate); the full-row mode no (dead).

### C-07 · The issuing entity on the contract record, and its migration
- Where: `SR:148-198`; `src/lib/queries/leads.ts:714-821`; `src/app/api/leads/mutations/[id]/migrate-entity/route.ts`; Leads B-63, B-64; `scripts/migrations/164_projects_entity_locked_at.sql`, `165_finance_entity_match_guard.sql`; CSV row 55.
- Entry: the Quote Digitizer's entity picker (Leads B-64); a send picks the entity (QE C-66).
- Does: every request carries `company_id` — the legal entity whose name, UEN, GST status and bank details its signing page, preview PDF and executed PDF resolve (QE C-68). Changing a lead's entity when it already has quotes or requests asks to "migrate all"; the migration then rewrites `company_id` on **every** request of the lead — signed ones included — after checking the entity belongs to the studio.
- Rules: the only hard block is an existing project on the lead (Leads B-64). A signed contract's issuer can therefore be changed after signing on a lead without a project; the stored executed PDF keeps the old issuer, while what is read later — the *"Issued by"* chips in the drawer (Leads B-63) and on the project's Contract/VO sub-tab (C-39), the issuer on a reopened signed link (QE C-74) — shows the new one. Unlike invoices, POs, VOs and expenses, requests are not covered by the project entity-lock triggers (164 / 165), and a send may pick any active entity — nothing compares it with a linked project's locked `company_id` (B; QE C-68). Any studio member may run the migration (session only).
- Data: `quote_signature_requests.company_id`, `leads.company_id`, `studio_companies`.
- States: —
- Words: *"Unknown legal entity for this studio"*.
- Reachable: yes.

### C-08 · The paper and composed contracts as records (touchpoint)
- Where: A-18, A-19; `src/lib/queries/leads.ts:1644-1716`; `src/app/api/contracts/send-to-client/route.ts:118-198`; D-12.
- Entry: A's upload and *"Send to client"* paths.
- Does: a paper contract is an ordinary `lead_files` row (bucket `lead-files`, name = the uploaded name) plus the lead flag; a composed contract that was e-mailed is a `lead_files` row named `Contract — <lead slug> — <yyyy-mm-dd>.pdf` at `<studio>/<lead>/contract-<ms>.pdf`, e-mailed through a 7-day link (C-70). Neither has a status, an owner, a quote link or a signed/unsigned marker; the composed one never sets the lead flag (A-20).
- Rules: which lead file "is the contract" is decided only by name: the lead flag's `contract_file_name`, the activity action prefix (`contract_uploaded:` when the name contains "contract", else `file_uploaded:`; `contract_sent:` for e-mailed ones), and the project list's name match (C-34). Replacing uploads a second file and leaves the first (A-19). Deleting the file leaves the flag (C-02).
- Data: `lead_files`, `lead_activity_log` (D-12).
- States: —
- Words: `contract_uploaded:<name>`, `file_uploaded:<name>`, `contract_sent:<file name>` (raw activity rows, Leads B-53).
- Reachable: yes.

### C-09 · No lead activity row for sending, signing or cancelling
- Where: `src/app/api/quotes/request-signature/route.ts`, `SUBMIT`, `src/app/api/quotes/cancel-signature/route.ts`, `src/app/api/quotes/resend-signature/route.ts`, `src/app/api/projects/[id]/contract/**` (no `lead_activity_log` writes); QE C-93; Leads B-54.
- Entry: —
- Does: the lead's Activity Log records paper uploads, composed-contract sends and archive / revive, but nothing for a link sent, viewed, resent, regenerated, cancelled or signed, nor for a project contract upload or save. That history exists only in the request's `audit_trail` (QE C-93), readable through the certificate by owners and admins (QE C-86).
- Rules: status moves made by signing are notifications, not activity rows (C-73). The TAT stamp `leads.signed_at` is the only lead column signing writes besides the mirror (C-26).
- Data: `lead_activity_log`; `quote_signature_requests.audit_trail`.
- States: —
- Words: —
- Reachable: n/a.

### C-10 · Archiving and reviving a lead with a contract out
- Where: `src/lib/lifecycle/transitions.ts:61-99, 190-283`; `src/lib/lifecycle/archival.ts:44-138`; guards `src/app/api/sign/[token]/route.ts:62-66`, `SUBMIT:93-96`, `src/app/api/sign/[token]/preview-pdf/route.ts:174-177`; Leads B-65, B-66, C-31; QE C-73; tests `archival-signing-guard.test.ts`, `archival-signing-submit-guard.test.ts`, `archival-signing-preview-guard.test.ts`.
- Entry: the drawer's *Archive*; Accounts › Archived Leads *Revive*.
- Does: archive refuses (409, blocker `LIVE_SIGNATURE_REQUEST`) while any request of the lead is `pending` / `viewed` and unexpired, unless the studio confirms *"Archive anyway"*. The request is **not** cancelled: it stays `pending` / `viewed`, and the three guarded public routes (page load, preview PDF, submit) answer 410 while the lead is archived; the OTP routes carry no archive check. Reviving clears `archived_at` only, so an unexpired link becomes signable again.
- Rules: leads freeze on archive, projects do not (`ARCHIVAL`). The guard fails open on a lookup error. A signed contract is untouched by archiving; the portal still shows it (C-58). The archive log reads *"Lead archived (live signing link voided)"* although nothing on the request changes.
- Data: `leads.archived_at`; `quote_signature_requests.status` (unchanged).
- States: —
- Words: *"A signing link is still live with the client. Cancel it first, or archive anyway to void it."*, *"<n> signing links are still live with clients. Cancel them first, or archive anyway to void them."*, *"Lead archived (live signing link voided)"*, public *"This link is no longer active. Please contact your designer for an updated link."*, studio *"This record has been archived. Revive it before making changes."*
- Reachable: yes.

### C-11 · Deleting — what survives
- Where: QE C-48 (`src/app/api/quotes/records/[id]/route.ts:201-330`); `src/app/api/projects/[id]/delete/route.ts:6-99`; Leads B-49, B-65; D-10.
- Entry: the quote list's delete; a project's delete; a lead file's delete.
- Does: a signed quote cannot be deleted (`SIGNATURE_EXISTS`); deleting any other quote cancels and detaches its unsigned requests (QE C-48) but leaves `leads.signature_request_id` pointing at the cancelled row (D-10). A project hard-deletes only for an owner or admin and only with no financial rows; its `contract-files` objects stay in storage with nothing pointing at them. Leads are never hard-deleted (archive only). Deleting a paper contract's lead file leaves the lead flag (C-02).
- Rules: no route deletes a signature request, an executed PDF or a packet.
- Data: `quotes`, `quote_signature_requests`, `projects`, storage `contract-files`, `signed-quotes`.
- States: —
- Words: project delete *"Owner or admin role required"*, `reason: "has_financial_activity"`; QE C-48's words.
- Reachable: yes.

### C-12 · Every route that reads or writes a contract record
- Where: as listed.
- Entry: —
- Does: the full set, by owner:

| Route | Reads / writes | Owner |
|---|---|---|
| `POST /api/quotes/request-signature` · `resend-signature` · `cancel-signature` | request, quote statuses, lead mirror | QE C-67 … C-69, C-88 … C-90 |
| `GET/POST /api/quotes/signature-requests` | newest request, count, entity migration | C-06, C-07 |
| `/api/sign/[token]` · `request-otp` · `verify-otp` · `submit` · `download` · `packet` · `preview-pdf` | the public signing flow | QE C-73 … C-85; B |
| `GET /api/sign/certificate/[id]` | signing evidence | QE C-86 |
| `GET /api/quotes/signed-quote/[id]` · `GET /api/leads/[id]/quote/download?source=signed:` | executed PDF | templates B-87 |
| `POST /api/contracts/render-pdf` · `send-to-client` | composed contract | A; C-70 |
| `POST /api/lead-files/records` + `POST /api/leads/mutations/[id]/activity-log` | paper contract | A-18 |
| `PATCH /api/leads/mutations/[id]` | lead flag | C-02 |
| `POST /api/leads/mutations/[id]/migrate-entity` · `GET …/validate-entity` | lead entity | C-07; Leads B-64 |
| `POST /api/leads/mutations/[id]/archive` · `unarchive` | live-link blocker | C-10 |
| `DELETE /api/quotes/records/[id]` · `PATCH /api/quotes/records/[id]` | cancels unsigned requests; freeze guards | QE C-48; C-48 |
| `POST /api/projects/records` · `…/clone` · `POST /api/projects/[id]/delete` | project contract name | C-28, C-42 |
| `POST /api/projects/[id]/contract` · `…/from-signature` · `GET …/list` · `GET …/download` | project contract | C-30 … C-35 |
| `GET /api/project-aggregates/financial-summary` · `POST …/contract-values` | contract value | C-44 |
| `GET /api/quotes/records/[id]/vo-editor-context` | base contract lines | C-53 |
| `GET /api/homeowner/engagement/[linkId]` · `…/document` · `GET /api/homeowner/projects/[id]/documents` · `GET /api/homeowner/dashboard` | portal | C-58 … C-65 |
| cron `usage-rollup` | request count | C-74 |

- Rules: every studio route checks only a session and the studio scope (C-18).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Lists and search

### C-13 · The lead drawer's contract indicators (touchpoint)
- Where: Leads B-40 (`bucket-status-section.tsx:176-235`), B-58, B-62, B-63, B-70; QE C-13, C-55, C-86; A-02 … A-04; Leads C-08 … C-13; `src/lib/leads/journey.ts:72, 355-358`; `src/components/leads/journey/active-step-card.tsx:26-27`; `src/components/leads/drawer-sections/multi-quote-section.tsx:518-531`.
- Entry: the lead drawer.
- Does: a lead's contract shows in six places: the Classic *Lead Status* contract block (statuses QUOTE_CREATED, MET, SIGNED), the readiness checklist row *"Contract uploaded"*, the Journey *Contract* and *Signed* steps, the deal card rows (C-14), the signature certificate under a signed primary quote, and the *"Issued by"* chip.
- Rules: the drawer has no list of contracts — a paper contract is one more row in the lead's Files (Leads B-47). The Journey *Contract* step is done as soon as `signature_request_id` is set, i.e. on send; Cancel signing clears that id only when the lead mirror reads `sent_for_signature` (QE C-90), and a quote delete's cancel never clears it (D-10). The *Signed* step follows `quote_status = client_signed`. The places that show a request read the newest one (C-03).
- Data: C-02, C-03.
- States: —
- Words: step hints *"Attach the contract document."*, *"Capture the client's signature or upload the signed contract."*; readiness *"Contract uploaded"*, *"Upload now"* (QE C-55).
- Reachable: yes.

### C-14 · The deal card's "Signing" and "Contract" rows
- Where: `src/components/leads/drawer-sections/quote-summary-card.tsx:74-107, 136-146, 201-230`; QE C-13; Leads B-58.
- Entry: the Journey "Deal" zone of the drawer.
- Does: under the primary (else first) quote: a **Signing** row when that quote is `sent_for_signature` or `client_signed` — badge *"Signed"* / *"Viewed"* / *"Awaiting signature"*, *"· sent <date>"* from the newest request, *"Manage"* (opens the dialog); a **Contract** row when the lead flag is set or the quote is `approved` onward — *"On file"* (flag), *"Signed quote"* (won, no flag), *"Not uploaded"*. *"View"* on a finalized quote opens the lead download `source=signed:<newest request id>` when the quote is `client_signed`, else the quote's canonical PDF.
- Rules: the Signing row follows the primary quote, not the newest request, so on a lead whose signed quote is not primary the card shows no signing state. The card's contract input is the lead flag or the drawer's seed for a `client_signed` lead mirror (C-02), so a signed lead always reads *"On file"*; *"Signed quote"* appears only when the deal is won without either — the Journey's *Signed* step marked done by hand (`LDD:1821`; Leads C-10). *"View"* fails when the newest request is not `signed` (C-41).
- Data: `quotes`, newest request, lead flag.
- States: pulse placeholder while quotes load.
- Words: *"Signing"*, *"Signed"*, *"Viewed"*, *"Awaiting signature"*, *"sent <date>"*, *"Manage"*, *"Contract"*, *"On file"*, *"Signed quote"*, *"Not uploaded"*, *"View"*, *"Open"*.
- Reachable: yes (Journey mode).

### C-15 · Finance › Operations › Contracts (touchpoint)
- Where: `src/app/(main)/finance/operations/page.tsx:68-80, 146, 190-218, 253, 303-310, 396-418, 626-661`; `src/components/finance/quotes-table.tsx:123-157`; `src/app/api/quotes/records/route.ts:96-124`; QE C-28, C-54; `src/lib/access-control.ts:111`.
- Entry: Finance › Operations › *Contracts* (owner, admin, accounting); a project's *"View in Studio Finance"* link (`?tab=contracts&project=<id>`).
- Does: *"Contracts"* has two sub-tabs — *"Quotes"* (every non-VO quote of the studio, QE C-54) and *"Variation Orders"* (the unified VO list). Rows are quotes; Finance has no list of signed contracts, signature requests or contract files.
- Rules: the `project` filter keeps quotes whose `project_id` is that project. A lead-stage contract quote keeps `project_id` null (nothing links it at project creation), so the deep link from a project shows only its VOs and project-native quotes, never its signed contract. The tab badge and the *"Quotes"* sub-tab count include VOs (`quotes.length`); the table excludes them. The shared status dropdown is hidden for this tab; the table's own pills filter.
- Data: `quotes` studio feed (`GET /api/quotes/records?studio=1`, with `projectName` and `leadName`).
- States: QE C-54.
- Words: *"Contracts"*, *"Quotes and variation orders — the customer-facing agreements your studio bills against."*, *"Quotes"*, *"Variation Orders"*.
- Reachable: yes.

### C-16 · Contract values on the projects and pipeline lists (touchpoint)
- Where: `src/app/(main)/projects/page.tsx:146-159, 322-327`; `src/app/(main)/finance/pipeline/page.tsx:104-136`; `src/lib/queries/project-aggregates.ts:255-295`; `src/app/api/project-aggregates/contract-values/route.ts:36-86`.
- Entry: the Projects list KPI *"Total Pipeline"* (owner only, table view); Finance › Pipeline (owner, admin, accounting).
- Does: both lists post the visible projects' ids (and lead ids) to `POST /api/project-aggregates/contract-values`, which runs the batch loader (C-44) and returns `{ values: { <projectId>: contractValueCents } }`; the Projects list sums active projects into *"Total Pipeline"*, Finance › Pipeline shows each project's value and stage sums.
- Rules: a project missing from `values` falls back in the browser to `budgetVal × 100`. Non-UUID ids are dropped; none left → 400. The response still carries legacy `quotes` / `vos` arrays for older bundles.
- Data: C-44.
- States: —
- Words: *"Total Pipeline"*; *"projectIds must be UUIDs"*.
- Reachable: yes.

### C-17 · Search
- Where: `src/components/finance/quotes-table.tsx:141-149`; `src/app/(main)/finance/operations/page.tsx:143, 405`; repository search.
- Entry: Finance › Operations search box.
- Does: nothing searches signature requests, signers, contract files or contract states. The only contract-adjacent search is Finance › Contracts: a case-insensitive substring over a quote's number, label, project name and lead name; switching tabs clears it.
- Rules: —
- Data: —
- States: QE C-54.
- Words: —
- Reachable: yes.

---

## Roles

### C-18 · No contract permission — what the server checks
- Where: `src/types/app.ts:3821-3844` (`RolePermissions`); the routes in C-12; `src/app/api/sign/certificate/[id]/route.ts:46-83`; `src/app/api/leads/mutations/[id]/archive/route.ts:53-69`; `src/app/api/projects/[id]/delete/route.ts:54-68`; QE C-111, C-112.
- Entry: —
- Does: there is no `contracts` permission entity or slug. Every studio contract route checks a session and the studio (row ownership or RLS) and nothing else: uploading, saving, listing and downloading a project contract; composing, rendering and e-mailing a contract; sending, resending, regenerating and cancelling a link; migrating the entity; writing the lead flag. Three role gates touch contracts: the certificate strips forensic fields for anyone but owners and admins (QE C-86); archiving a lead with a live link needs `leads.delete` (C-10); deleting a project needs the owner or admin tag (C-11).
- Rules: `projects.edit` and the handover lock (`project_override`) do not gate the project's contract card (C-33); the public routes (`/api/sign/*`, the portal) authorize by token, OTP or homeowner link (QE C-82; C-58).
- Data: `studio_roles.permissions`.
- States: —
- Words: —
- Reachable: n/a.

### C-19 · Who reaches which contract surface
- Where: `src/lib/access-control.ts:64-125` (`ROUTE_ACCESS`); `src/context/platform-config-context.tsx:46-51`; `PROJ:1879, 3674-3685`; QE C-113, C-115.
- Entry: —
- Does: the lead drawer (dialog, contract block, deal card) — owner, admin, designer (`leads`); project pages including the Contract/VO sub-tab and its contract card — owner, admin, designer (`projects`), the project's Finance tab showing whenever the platform page `finance/operations` is enabled (a platform switch, not a role check); Finance › Operations and Pipeline — owner, admin, accounting; the portal — the homeowner linked to the lead (C-58).
- Rules: Accounting cannot open a project, so it never sees a project's contract file, yet the project contract APIs accept its session. A designer sees *"View in Studio Finance"* on the Contract/VO sub-tab, which opens a page the designer's route access refuses.
- Data: —
- States: —
- Words: *"View in Studio Finance"*.
- Reachable: yes.

### C-20 · Workflow rules that gate on a contract
- Where: Leads C-03, C-46; `src/lib/leads/drawer-autosave.ts:70-95`; `LDD:1055-1063, 2476-2531`; `src/components/accounts/member-override-panel.tsx:24-32`; `src/app/api/projects/records/route.ts:254-262`; `src/components/projects/setup-progress.tsx:40-41`.
- Entry: a Classic move into SIGNED; project creation.
- Does: `settings.workflow.contractRequired` (*"Contract required for Signed"*, default on) holds a Classic move into SIGNED until the lead flag is set (the drawer's own seed for a signed lead does not count), the newest request is `pending` / `viewed` / `signed`, or the quote is `client_signed`. Separately, while `quoteApprovalRequired` is on, SIGNED without an uploaded contract needs a `client_signed` quote. The readiness card lists *"Contract uploaded"* only while the toggle is on (QE C-55). Projects have their own contract gate, not configurable (C-37).
- Rules: with `quoteApprovalRequired` off, a lead whose link is merely out can be moved to SIGNED. There is no member override for `contractRequired` (the override panel lists seven other toggles). Journey mode has no contract gate beyond its steps (Leads C-09). mAIson's `update_lead` bypasses both gates (Leads C-28).
- Data: `studios.settings.workflow.contractRequired` (D-16).
- States: —
- Words: *"A signed contract must be uploaded"*, *"Either e-sign the quote in-app or upload a signed contract before marking Signed"* (Leads C-03).
- Reachable: yes (Classic).

### C-21 · Role × contract action matrix (as implemented)
- Where: C-18 … C-20; QE C-116; Leads C-52, C-53.
- Entry: —
- Does: the table below, per tag, as the code behaves.
- Rules: server-side, only the three gates in C-18 differ by role; every other cell is route access.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

| Action | Owner | Admin | Designer (`id`) | Accounting |
|---|---|---|---|---|
| Send / resend / regenerate / cancel a link | yes | yes | yes | no UI |
| Upload or replace a paper contract; compose, download or e-mail a contract | yes | yes | yes | no UI |
| Change the lead's entity (rewrites every request, C-07) | yes | yes | yes | no UI |
| Read the certificate's audit trail | yes | yes | no | no UI |
| Archive a lead with a live link (`leads.delete`) | yes | yes | as its role (Leads C-52, C-53) | no UI |
| Upload / save / download a project contract | yes | yes | yes | API only |
| Delete a project (contract files orphaned) | yes | yes | no | no |
| See one project's contract value (project page, C-46) | yes | yes | yes | no |
| See the studio's contract values (*Total Pipeline* · Finance › Pipeline, C-16) | both | Pipeline only | neither | Pipeline only |

---

## Quote ↔ contract

### C-22 · Which quote is "the contract" — every rule in use
- Where: `src/lib/leads/resolve-contract-quote.ts:52-72` (QE C-52, A-48); `src/lib/finance/contract-value.ts:65-113`; `LDD:357-379` (`contractPaymentSchedule`); `307_finance_contract_freeze.sql:121-141`; `src/app/api/projects/[id]/contract/from-signature/route.ts:67-79`; `quote-summary-card.tsx:74`; `ENG:47-55`; `PORTAL:689-703`; `src/app/api/contracts/send-to-client/route.ts:75` (A-41).
- Entry: —
- Does: each consumer picks its own quote:

| Consumer | Rule |
|---|---|
| Drawer scope and Revise target (`resolveContractQuoteId`) | the only non-VO quote; else the latest `signed_at` among `client_signed` (then `updated_at`); else the primary; else the first |
| Contract value (`resolveContractValueCents`) | the latest `client_signed` non-VO quote with `total_cents > 0` (same sort); else the primary at `approved` / `sent_for_signature` with `total_cents > 0`; else the budget |
| Project creation's schedule (`contractPaymentSchedule`) | the first `client_signed` non-VO quote in list order (primary first, then oldest); else the primary; else the open quote; else the legacy lead JSON |
| One signed base per lead (`finalize_signed_mirror`) | the quotes the signature covered; older signed base quotes demoted (C-23) |
| Project contract PDF (from-signature, auto-wire) | the newest `signed` request of the lead, whatever it covered (C-30, C-31) |
| Deal card | the primary quote, else the first (C-14) |
| Portal | engagement page: the shared quote at `sent_for_signature`; Finance tab's *"Original quote"*: `client_signed` → primary → first among base quotes (C-62, C-46) |
| Composed contract `{{quote_total}}` | the primary quote's `total_cents` (A-41) |

- Rules: all agree on a lead with one quote. With alternates they split: a signed quote with `total_cents = 0` is the drawer's contract quote but not the value's base (the value falls to the primary or the budget); a primary still at `draft` is the drawer's quote but never the value's; legacy data holding two signed quotes gives the schedule and the value different quotes.
- Data: `quotes (status, is_primary, quote_type, total_cents, signed_at, updated_at, payment_schedule)`.
- States: —
- Words: —
- Reachable: yes.

### C-23 · One signed base quote per lead — demotion on re-sign
- Where: `307_finance_contract_freeze.sql:66-79, 121-141`; `SUBMIT:344-360, 387-403, 488-512`; QE C-84; D-03.
- Entry: a client signature.
- Does: when a signature covers at least one standard quote, every other `client_signed` standard quote of the lead goes back to `approved`; the covered quotes become `client_signed` with `signed_at` set once.
- Rules: a signature whose resolved quotes are all variations leaves the lead mirror, the lead stage and the older signed quotes alone. The demoted quote keeps its `signed_at`; its request stays `signed` with its executed PDF, so the project's contract list and the portal's Documents tab still offer it as a signed document (C-34, C-64). The demotion writes no history row (QE C-05). After a signing the dialog offers no second send — it shows the signed state, or the paper state once the request has flipped to `expired` (A-08, C-41) — so a re-sign needs a direct API call.
- Data: `quotes.status`, `quotes.signed_at`.
- States: —
- Words: —
- Reachable: yes (rare in the UI).

### C-24 · Signing with no quote row, or with its quotes deleted
- Where: `SUBMIT:331-403`; `303_signed_mirror_no_quote_rows.sql`; `307_finance_contract_freeze.sql:66-79`; tests `src/__tests__/quote-signing-no-quote-row-mirror.test.ts:1-139`, `src/__tests__/quote-signing-mirror-fallback.test.ts:1-105`; `docs/rules/leads.md:371-379`; QE C-11, C-84.
- Entry: a client signature.
- Does: the quotes a signature marks: `single` → the request's `quote_ids` (so a `quote_id` nulled by a quote delete still resolves); `bundle` → all of `quote_ids`; `variations` → the selected quote. An empty set (the legacy lead-level signing: `quote_id` null, `quote_ids` `{}`) and a set whose quotes were all deleted both count as a **base** signing: the lead still becomes `client_signed`, gets `contract_uploaded = true` + the phantom name and moves to the funnel's SIGNED bucket. Only a set that resolves to variations alone skips the lead.
- Rules: in the fallback path a failed quote-type lookup leaves the lead untouched. The tests pin: the RPC receives `[QUOTE_ID]` when `quote_id` is null and `quote_ids` holds it, and never an empty array then; an empty set still writes `quote_status: client_signed`, `contract_uploaded: true` and `bucket CLOSED, lead_status_code SIGNED`; a variation-only set writes no lead mirror. Incidents named: 2026-08-25 ("signed but not reflected") and 2026-09-10 (dyel lead `171bc432…`).
- Data: `quotes`, `leads`, `quote_signature_requests.quote_id / quote_ids`.
- States: —
- Words: —
- Reachable: yes (the legacy path needs a lead without `quotes` rows; the dialog no longer offers a send on such a lead, QE C-65).

### C-25 · The signed quote afterwards — locked, with no exit
- Where: `src/app/api/quotes/line-items/route.ts:339-366`; `src/app/api/quotes/records/[id]/route.ts:77-97`; `307_finance_contract_freeze.sql:145-172`; QE C-02, C-06, C-48, C-99, C-103; `docs/rules/finance.md:243`.
- Entry: —
- Does: a `client_signed` quote refuses line edits (409 `QUOTE_LOCKED`), total writes (409 `QUOTE_TOTAL_FROZEN` from the route and from the trigger), Revise (not a legal transition) and deletion (`SIGNATURE_EXISTS`). Scope changes after signing are variation orders on the project (C-52 … C-57).
- Rules: the lock follows the quote row: a re-sign that demotes it to `approved` makes it editable through Revise again (C-23). The server does not lock its payment schedule (QE C-99); the project timeline sync skips `client_signed` quotes (QE C-103). The PATCH route's message still says "revise it first" for a signed quote (C-89).
- Data: `quotes.status`.
- States: —
- Words: *"Cannot edit a quote that is client_signed — it is signed — raise a variation order for changes"*; *"Totals of a client_signed quote are frozen — revise it first"*; trigger *"QUOTE_TOTAL_FROZEN: quote <id> is client_signed — its totals are a signed/approved record. Revise the quote (transition route) or raise a variation order."*
- Reachable: yes.

### C-26 · Three signing timestamps
- Where: `quote_signature_requests.signed_at` (QE C-83); `quotes.signed_at` (`307_finance_contract_freeze.sql:15-44, 121-127`; `SUBMIT:488-497`); `leads.signed_at` (`src/lib/leads/tat-stamps.ts`; `SUBMIT:520`; Leads C-25; D-10).
- Entry: a client signature.
- Does: a signing writes three stamps: the request's `signed_at` (the submit time — read by the project list, the portal and the certificate); the quote's `signed_at` (`COALESCE(signed_at, now())` in the RPC, so a re-sign never moves it; the fallback path overwrites it with the submit time); the lead's TAT `signed_at` (write-once; also written by the journey's Signed step and by manual moves into SIGNED).
- Rules: the contract-value and contract-quote sorts use the quote's stamp, and `updated_at` only for pre-307 rows (C-49). The 307 backfill took the latest signed request per `quote_id`, then per `quote_ids`, then the lead's stamp for signed quotes with no request.
- Data: the three columns.
- States: —
- Words: —
- Reachable: yes.

### C-27 · The frozen request versus the live quote — what later modules read
- Where: QE C-68, C-99, C-100, C-103; `LDD:364-379`; `src/lib/finance/contract-loader.ts:29-50`; `scripts/finance/307_repair_signed_totals.sql:1-60`; `PORTAL:689-718`; `src/app/api/homeowner/projects/[id]/documents/route.ts:246-257`.
- Entry: —
- Does: the request freezes lines, total (dollars), schedule and documents at send; the quote row keeps its own `total_cents`, `tax_cents`, `payment_schedule` and lines. After signing, Finance and Projects read the **quote row** — contract value from `total_cents`, GST fraction from `tax_cents / total_cents`, the new project's schedule from `payment_schedule` — while the executed PDF, the signing page, the portal's *"Signed quote"* amount and the 307 repair read the **request**.
- Rules: the two agree only while nothing rewrote the quote after the send; the freeze (C-47) now refuses total writes at `sent_for_signature` and `client_signed`, and the repair put 19 drifted quotes back to their certificate (C-50). The quote's schedule stays editable (QE C-99), so a project created later can carry a schedule other than the one the client signed. A bundle request's `quote_total` is the combined total of its quotes.
- Data: C-47, C-50; D-02.
- States: —
- Words: —
- Reachable: yes.

---

## After signing: the project

### C-28 · Creating a project from a signed lead — what the contract carries (touchpoint)
- Where: Leads B-19, B-70, B-71, C-27, C-71; `LDD:3367-3385`; `src/components/projects/project-create-drawer.tsx:91-104, 126-140, 255-293, 420-458, 607-640`; `src/app/api/projects/records/route.ts:240-300`; QE C-103.
- Entry: the Create Project drawer auto-opened after a valid move into SIGNED (Leads B-19), or the drawer footer's *"Create Project"* / *"Convert to Project"* (Leads B-70, B-71).
- Does: the drawer is pre-filled from the lead: `contractFileName` (the lead flag's name — the phantom for an e-signed lead, the paper file's name otherwise), `quoteData` (the contract quote's lines, C-22), `quoteStatus` (the lead mirror), `docDiscount`, `gstEnabled`, `paymentSchedule` (`contractPaymentSchedule`, C-22). The budget is pre-filled with the canonical final of those lines (line totals − document discount + GST), else the lead budget. On create the row stores `contract_file_name`, `quote_data`, `quote_status`, `budget_total` and `lead_id`; the lead moves to the funnel's SIGNED target with sub-status `PROJECT_STARTED` (Leads C-27); invoices are generated in the background from the schedule (Finance).
- Rules: nothing on the project records which quote or which request is its contract — later readers find it through `projects.lead_id` (C-22, C-44). `projects.quote_status` is a snapshot: a signature after creation never updates it (C-37). The lead's quotes keep `project_id` null (C-15, C-39). The drawer sends stage *Draft* and no schedule, so drawer-created projects start *Draft* (C-37).
- Data: `projects.contract_file_name`, `quote_data`, `quote_status`, `budget_total`, `lead_id` (D-11).
- States: —
- Words: *"Project created"*, *"Opening your new project…"* (Leads B-71).
- Reachable: yes.

### C-29 · The create drawer's "Signed Contract" field — a file name only
- Where: `src/components/projects/project-create-drawer.tsx:197, 293, 446, 1295-1313`; `src/app/api/projects/records/route.ts:254-262, 292`.
- Entry: the Create Project drawer's documents section.
- Does: shows the inherited contract name in a green row (its trash hidden when it came from the lead), else a dashed *"Upload contract"* picker. Picking a file keeps only its **name**, which is saved as `contract_file_name`; no bytes are uploaded anywhere.
- Rules: the name alone satisfies the project's contract check (C-37) although no file exists: the Contract document card says nothing is uploaded (C-33) and the contract list can only match it against the lead's files by name (C-34). The floor-plan field next to it behaves the same way.
- Data: `projects.contract_file_name`.
- States: —
- Words: *"Signed Contract"*, *"Upload contract"*, title *"Remove contract"*.
- Reachable: yes.

### C-30 · The executed PDF copied onto the lead's projects at signing
- Where: `SUBMIT:568-687`; templates B-86; D-11, D-17.
- Entry: a client signature (the background job that runs after the response).
- Does: once the executed PDF renders, every project of the lead whose `contract_file_name` is null gets a copy at `contract-files/{studioId}/{projectId}/signed-contract.pdf` (upsert), `contract_file_name = signed-contract-<client name, spaces → _, lower-case>.pdf` and `contract_file_url = <public URL>`.
- Rules: runs for any signing of the lead, a VO-only signing included, and only for projects with no contract name at all — in practice projects created before the signature (Journey mode, or the contract gate off) on a lead without a paper contract; a project created after signing already carries the phantom name (C-28). No render → no copy (the card's save is the retry, C-33). Upload and update failures are logged per project and never reach the client.
- Data: `projects.contract_file_name`, `contract_file_url`; bucket `contract-files`.
- States: —
- Words: `signed-contract-<client>.pdf` (a stored file name).
- Reachable: yes.

### C-31 · `POST /api/projects/[id]/contract/from-signature`
- Where: `src/app/api/projects/[id]/contract/from-signature/route.ts:1-143`; `src/lib/quote-canva/signed-quote-pdf.ts` (templates B-86); caller `PROJ:4891-4924`.
- Entry: the Contract document card — automatically once per mount, or *"Save signed PDF"* / *"Retry save"* (C-33).
- Does: for a project of the session's studio that has a lead: takes the lead's newest `signed` request (by `signed_at`), gets the executed PDF bytes (the stored object, else a render that is also archived), writes them to `contract-files/{studio}/{project}/signed-contract.pdf` (upsert), sets `contract_file_name = signed-contract-<client>.pdf` and `contract_file_url = <public URL>?v=<ms>`, and answers `{ url: <one-hour signed URL>, name }`.
- Rules: idempotent (same object path). The card calls it whenever `contract_file_url` is empty, so it replaces any name-only contract — the phantom, a drawer name (C-29) or the setup wizard's name (C-37). No role check. The newest signed request may be a VO signing or a demoted re-sign (C-23). A request flipped to `expired` is not found (C-41).
- Data: C-30.
- States: —
- Words: *"Unauthorized"*, *"Missing project id"*, *"Project not found"*, *"Project has no linked lead"* (409), *"No signed contract found for this project"* (409), *"Failed to generate signed contract PDF"* (502 / 500), *"Failed to store contract PDF"*, *"Failed to attach contract"*.
- Reachable: yes.

### C-32 · `POST /api/projects/[id]/contract` — manual upload
- Where: `src/app/api/projects/[id]/contract/route.ts:1-103`; caller `PROJ:4927-4946`.
- Entry: the card's *"Upload"* / *"Replace"* (C-33).
- Does: multipart `file`, at most 10 MB, PDF / DOC / DOCX / JPEG / PNG; stores it at `contract-files/{studio}/{project}/{uuid}.{ext}` (no overwrite); sets `contract_file_name` = the original name and `contract_file_url` = the public URL; answers `{ url, name }`.
- Rules: session and project ownership only. *"Replace"* uploads a new object and leaves the old one unreferenced in storage. No `project_files` row is written (the file is not in the Files tab), and neither the lead flag nor any activity log is touched.
- Data: `projects.contract_file_name`, `contract_file_url`; bucket `contract-files`.
- States: —
- Words: *"Unauthorized"*, *"No file provided"*, *"File too large (max 10MB)"*, *"Invalid file type. Allowed: PDF, Word, JPG, PNG"*, *"Project not found"*, *"Failed to upload"*, *"Failed to attach file"*, *"Upload failed"*.
- Reachable: yes.

### C-33 · The "Contract document" card
- Where: `PROJ:4860-5018` (`ContractFileCard`); mount `PROJ:3720-3729`; URL re-signing `src/app/api/projects/records/[id]/route.ts:66-74`, `src/app/api/projects/records/route.ts:113-127`.
- Entry: project › Finance › *Contract/VO* (C-39).
- Does: three states. (1) `contract_file_url` set → the file name, *"Download"* (a one-hour signed URL minted when the project loads) and *"Replace"*. (2) No URL and the lead's newest request is `signed` → *"Signed by client via e-signature on <date> — in the leads workflow"*, *"View signed quote"* (`/sign/<token>` in a new tab) and *"Save signed PDF"*; on mount the card calls from-signature once on its own (C-31), showing *"Preparing the signed contract PDF…"*, and on failure *"Signed via e-signature — couldn't save the PDF (<error>)"* with *"Retry save"*. (3) Otherwise *"No contract document uploaded yet (PDF, Word, JPG, PNG · max 10MB)"* with *"Upload"*.
- Rules: not gated by `projects.edit` or the handover lock. The state ignores `contract_file_name`, so a name-only project (phantom, drawer or wizard name) without a signed newest request sits in state (3) while its setup check and Key Files tile say a contract exists. *"View signed quote"* loads the public signing page, which after 7 days flips the request to `expired` (C-41). The automatic save is silent; the manual one toasts.
- Data: `projects.contract_file_name`, `contract_file_url`; the newest request.
- States: *"Saving…"*, *"Preparing the signed contract PDF…"*; spinners on *"Upload"* / *"Replace"*.
- Words: *"Contract document"*, *"Download"*, *"Replace"*, *"Upload"*, *"View signed quote"*, *"Save signed PDF"*, *"Retry save"*, *"Saving…"*, *"Preparing the signed contract PDF…"*, *"Signed by client via e-signature on <date> — in the leads workflow"*, *"Signed via e-signature — couldn't save the PDF (<error>)"*, *"No contract document uploaded yet (PDF, Word, JPG, PNG · max 10MB)"*; toasts *"Contract uploaded"*, *"Signed contract saved to project"*, *"Upload failed"*, *"Failed to generate signed contract"*.
- Reachable: yes.

### C-34 · `GET /api/projects/[id]/contract/list`
- Where: `src/app/api/projects/[id]/contract/list/route.ts:1-129`; caller `src/components/projects/key-files-rail.tsx:179-194`.
- Entry: the Key Files *Contract* tile (C-36).
- Does: lists downloadable contracts in order: (1) `project_files` in folder `contract`, newest first — `<name> · uploaded <date>`, type `uploaded`; (2) the lead's `lead_files` whose name equals `projects.contract_file_name` — or **every** lead file when that name is empty — `<name> · uploaded <date>`; (3) only if nothing was found so far and `contract_file_url` does not contain `/signed-quotes/`: `legacy-url`, labelled with `contract_file_name` or *"Contract"*; (4) every `signed` request of the lead, newest first — *"Signed quote · <client name|Homeowner> · <date>"*, type `signed-quote`.
- Rules: a paper contract reaches a project only through this name match — the bytes are never copied (A-19). With an empty project name the picker offers all the lead's files (photos, quotes, floor plans) as contracts. The saved copy of an executed PDF lives in `contract-files`, not `signed-quotes`, so a project whose contract was saved from a signature lists the same signed document twice (legacy URL + signed request). Demoted re-signs still list (C-23); requests flipped to `expired` do not (C-41). Signed packets are never listed — no studio surface offers them (B-35). Dates use the server's locale.
- Data: `project_files`, `lead_files`, `projects`, `quote_signature_requests`.
- States: —
- Words: *"Unauthorized"*, *"Project not found"*, *"Internal error"*; labels as above.
- Reachable: yes.

### C-35 · `GET /api/projects/[id]/contract/download`
- Where: `src/app/api/projects/[id]/contract/download/route.ts:1-117`; `src/components/ui/download-picker.tsx:84-100, 142-171`; templates B-87.
- Entry: an entry picked in C-36.
- Does: `?source=<kind>:<id>` → 302 to: `file:` a one-hour signed `project-files` URL (download name = the file name); `lead-file:` a one-hour signed `lead-files` URL (the file must belong to the project's lead); `legacy-url:` a fresh signed URL for `contract_file_url`; `signed-quote:` `/api/sign/<token>/download` (the request must belong to the project's lead and be `signed`).
- Rules: studio session and project ownership; no role check. The signed-quote branch hands a studio user to the public token route, which again needs `status = 'signed'` and a stored `signer_phone` (templates B-87).
- Data: C-34.
- States: —
- Words: *"Unauthorized"*, *"source param required"*, *"Invalid source format"*, *"Project not found"*, *"Contract file not found"*, *"Failed to resolve file URL"*, *"Lead file not found"*, *"Failed to resolve lead file URL"*, *"Mismatched id"*, *"No contract URL"*, *"Failed to resolve contract URL"*, *"Signed quote not found"*, *"Quote not yet signed"*, *"Unknown source type"*, *"Internal error"*.
- Reachable: yes.

### C-36 · Key Files › Contract tile
- Where: `src/components/projects/key-files-rail.tsx:76-227`; `src/components/ui/download-picker.tsx:1-171`; mount `PROJ:2443-2454`.
- Entry: project › *Overview*, the *Key Files* card.
- Does: the tile is filled when a `project_files` row sits in folder `contract`, `contract_file_name` is set, or the project's `quote_status` is `client_signed`; its caption is that file's name, else `contract_file_name`, else *"Signed"*. A press fetches the list (C-34): none → *"No downloadable files yet."*; one → opens it in a new tab; several → a menu *"Choose a file to download"* with *"Upload"* / *"Signed"* badges. Empty: *"No contract yet"* with *"Upload contract"*, which only switches to the Files tab.
- Rules: the filled test and the list read different inputs, so a tile captioned with the phantom name can answer *"No downloadable files yet."*. The list is fetched on every press.
- Data: C-34.
- States: spinner in the menu rows while loading.
- Words: *"Key Files"*, *"View all →"*, *"Contract"*, *"No contract yet"*, *"Upload contract"*, *"Signed"*, *"Choose a file to download"*, *"Upload"*, *"No downloadable files yet."*, *"Failed to load downloads"*.
- Reachable: yes.

### C-37 · Setup check "Contract uploaded", the setup wizard's contract step, auto-activation
- Where: `src/components/projects/setup-progress.tsx:23-100`; `src/components/projects/draft-setup-card.tsx:24-115`; `src/components/projects/draft-setup-wizard.tsx:30-66, 79-100, 273-330`; `PROJ:1559-1588, 1993-1994`; `src/app/api/projects/records/route.ts:240-262`.
- Entry: a Draft project's *"Set up this project"* card and *"Complete setup"* wizard; the project page's auto-promotion.
- Does: five checks gate a Draft project: *"Designer assigned"*, *"Quote added"* (with *"Add quote"*), *"Contract uploaded"*, *"Project timeline created"*, *"Commission structure"*. *"Contract uploaded"* passes on any `contract_file_name`, a project `quote_status` of `client_signed`, or the lead's newest request being `signed`; an in-flight link does not count. The wizard walks the open checks; its contract step uploads one PDF or image through `/api/projects/[id]/files` into folder `contract`, then writes the file's name to `contract_file_name`. When every check passes the page flips the project to *Active* once. At insert the route already sets *Active* when designer, quote status, contract name, a seeded timeline and a locked commission are all present (the create drawer sends no timeline, so its projects start *Draft*).
- Rules: a name is enough — the phantom (C-02) and a drawer name (C-29) pass. The wizard's upload lands in `project_files`, not `contract_file_url`, so the Contract document card still says nothing is uploaded (C-33). The wizard's *"PDF or image, up to 25MB"* is copy only (neither the page nor the files route checks size). `projects.quote_status` never changes after creation, hence the extra "newest request signed" input, which a request flipped to `expired` loses (C-41).
- Data: `projects.contract_file_name`, `quote_status`, `timeline`, `commission_locked`, `stage`; `project_files.folder`.
- States: *"Uploading…"*.
- Words: *"Set up this project"*, *"Finish the remaining steps to move this project to Active and unlock invoicing, payments, and commission."*, *"<done> of <total> complete"*, *"Complete setup"*, *"Missing:"*, *"Contract uploaded"*, *"Upload signed contract"*, *"PDF or image of the signed contract. Stored in this project's Files."*, *"Click to choose a file"*, *"PDF or image, up to 25MB"*, *"Upload & next"*, *"Select a file first."*, *"Couldn't upload contract."*, *"All setup steps complete — project is now Active."*
- Reachable: yes.

### C-38 · The signing banner on the project page
- Where: `PROJ:827-830, 1897-1924`; `docs/rules/projects.md:35`.
- Entry: any project whose lead has a link out.
- Does: while the lead's newest request is `pending` or `viewed`, an amber strip reads *"Quote signing request pending client signature."* / *"Quote signing request viewed by client — awaiting signature."* with *"Open signing portal"* (`/sign/<token>`, new tab).
- Rules: `signed`, `expired` and `cancelled` show nothing (the green signed variant was removed). A studio press on *"Open signing portal"* loads the public page, which marks a `pending` request `viewed` (QE C-74) and appends *"Link opened by client"* to its audit trail (QE C-93).
- Data: the newest request.
- States: —
- Words: *"Quote signing request pending client signature."*, *"Quote signing request viewed by client — awaiting signature."*, *"Open signing portal"*.
- Reachable: yes.

### C-39 · The Contract/VO sub-tab
- Where: `PROJ:3400-3445, 3669-3760`; `src/app/api/quotes/records/route.ts:85-93`; `src/lib/queries/quotes.ts:52-65`; QE C-54.
- Entry: project › Finance › *Contract/VO* (also `?tab=finance&sub=contracts`, and where a saved VO lands).
- Does: a header with *"View in Studio Finance"* (C-15), the *"Issued by"* chip for multi-entity studios (the newest request's entity), *"Upload Quote"* (an external quote file) and *"Create Variation Order"*; then the Contract document card (C-33), a table of the project's non-VO quotes, and the VO list (C-52 … C-57).
- Rules: the table lists quotes whose `project_id` is this project; the lead-stage contract quote has `project_id` null, so the signed contract is missing from its own project's contract tab — the card and the Key Files tile are its only traces here. *"Create Variation Order"* is refused on a Draft project with a toast, and carries the hint *"Add a quote first — a variation order changes an existing contract"* when no project quote exists, but is not disabled.
- Data: `quotes` by `project_id`.
- States: QE C-54.
- Words: *"Contract/VO"*, *"Quotes and variation orders — the customer-facing agreements your studio bills against."*, *"View in Studio Finance"*, *"Upload Quote"*, *"Create Variation Order"*, *"Add a quote first — a variation order changes an existing contract"*, *"Financial actions are restricted while the project is in Draft."*
- Reachable: yes (when the platform enables `finance/operations`, C-19).

### C-40 · The Files tab's "Contract/VO" folder is not the contract folder
- Where: `PROJ:380-389, 1057-1066, 1235-1247`; `src/app/api/projects/[id]/files/route.ts:24-36, 95-103, 204-229`; `src/components/projects/draft-setup-wizard.tsx:290`; `key-files-rail.tsx:88-91`; `contract/list/route.ts:52-57`.
- Entry: project › *Files & Docs*.
- Does: the Files tab's folder chip *"Contract/VO"* has the id `contracts`: uploads made while it is selected are stored with `folder = 'contracts'`, and lead files whose name holds "contract" or "signed" are sorted into it. The Key Files tile and the contract list read `folder = 'contract'` (singular) — a value only the setup wizard writes.
- Rules: a contract uploaded through the Files tab never reaches the Key Files tile, the contract list or the setup check; the wizard's upload is missing from the *"Contract/VO"* chip (it shows under *"All Files"*). With *"All Files"* selected an upload goes to `site-photos`.
- Data: `project_files.folder`.
- States: —
- Words: *"Files & Docs"*, *"Contract/VO"*, *"All Files"*.
- Reachable: yes.

### C-41 · A signed request turns `expired` when its link is opened after 7 days — what the studio side loses
- Where: `src/app/api/sign/[token]/route.ts:35-45` (B-65); readers `contract/from-signature/route.ts:69-79`, `contract/list/route.ts:106-113`, `contract/download/route.ts:106-108`, `PROJ:1569, 3727-3728`, `CFD:604-612`, `quote-summary-card.tsx:100-107`, `ENG:175, 201`, `src/app/api/homeowner/projects/[id]/documents/route.ts:86-91`, `scripts/finance/307_repair_signed_totals.sql`.
- Entry: anyone loading `/sign/<token>` after `expires_at` — the client re-opening the e-mail link, the studio's *"View signed quote"* (C-33).
- Does: the page load rewrites the request to `expired` whatever its status, `signed` included (B-65). Every reader keyed to `status = 'signed'` then treats the contract as unsigned: *"Save signed PDF"* answers *"No signed contract found for this project"*; the contract list drops the signed entry and its download answers *"Quote not yet signed"*; the Contract document card falls to *"No contract document uploaded yet …"* unless the PDF was saved earlier; the setup check loses its e-sign input; the dialog shows *"Signed contract on file"* under the phantom name instead of *"Signed by client"*; the deal card's *"View"* and the client's executed-PDF and packet downloads fail; the portal banner reads *"Signing link unavailable"* above a quote marked *"Signed"*, and the portal Documents tab drops the signed quote and its packet; the 307 repair no longer finds the certificate.
- Rules: unaffected — the quote's `client_signed`, the lead mirror and stage, the drawer's deal-won state and the Journey's *Signed* step (both read the quote status, `LDD:1821`), the contract value, the certificate (read by id), the executed PDF object and a project copy already saved (C-30, C-31). Nothing turns the row back to `signed`.
- Data: `quote_signature_requests.status`.
- States: —
- Words: *"This signing link has expired"*; the readers' words above.
- Reachable: yes.

### C-42 · Clone and delete
- Where: `src/app/api/projects/records/clone/route.ts:60-95`; `src/app/api/projects/[id]/delete/route.ts:6-99`.
- Entry: the project's *Clone* and *Delete*.
- Does: a clone copies `contract_file_name` (not `contract_file_url`, no files, no `project_files`) into a new Draft project, so the clone's setup check counts a contract it does not have. A delete (owner or admin, no financial rows) removes the row; its `contract-files` objects stay in storage, unreferenced.
- Rules: neither touches the lead, its requests or the executed PDF.
- Data: `projects`, bucket `contract-files`.
- States: —
- Words: *"Owner or admin role required"*.
- Reachable: yes.

---

## Contract value and freeze (touchpoints)

### C-43 · The contract value rule
- Where: `src/lib/finance/contract-value.ts:1-113`; test `src/__tests__/contract-value.test.ts:1-185`; spec `docs/superpowers/specs/2026-06-10-contract-value-single-source-of-truth-design.md`; plan `docs/superpowers/plans/2026-06-10-contract-value-single-source-of-truth.md`; D-18.
- Entry: —
- Does: `resolveContractValueCents({ quotes, approvedClientVoCents, budgetTotalDollars })` → `{ contractValueCents, baseCents, source: "signed" | "primary" | "budget" | "none", baseQuoteId }`. Base: the latest `client_signed` non-variation quote with `total_cents > 0` (by `signedAt`; a stamped quote before an unstamped one; then `updatedAt`); else the primary quote at `sent_for_signature` or `approved` with `total_cents > 0`; else `budget_total × 100`; else 0. Value = base + the net of approved client VOs (additions positive, omissions negative), floored at 0.
- Rules: `total_cents` is the final the client pays (after the document discount, GST inside), so surfaces display and slice it without adding tax. A signed quote with a zero total is skipped. The floor applies to the final value, not to the VO term, so a large omission can reach 0 but not below; a budget base takes VOs too. The tests pin: signed beats primary; alternates are never summed (the "45,356 + 78,234 = 123,590" regression); a draft primary is ignored; the latest `signed_at` wins even when another signed quote was updated later.
- Data: `quotes (total_cents, status, is_primary, quote_type, signed_at, updated_at)`, `projects.budget_total` (dollars), `variation_orders.cost_change_cents`.
- States: —
- Words: —
- Reachable: yes.

### C-44 · The one contract loader and the GST fraction
- Where: `src/lib/finance/contract-loader.ts:1-113`; `src/lib/finance/gst-split.ts:3-9`; routes `src/app/api/project-aggregates/financial-summary/route.ts:25-152`, `src/app/api/project-aggregates/contract-values/route.ts:36-86`; hub `src/lib/queries/project-aggregates.ts:44-60, 176-232`; tests `src/__tests__/contract-loader.test.ts:1-158`, `src/__tests__/contract-single-loader.test.ts:1-70` (A-52); `docs/rules/finance.md:133-152`.
- Entry: —
- Does: `resolveProjectContract(db, projectId, { excludeVoQuoteId? })` reads the project, its quotes by **lead or project** (by `project_id` alone when there is no lead), the project's approved VOs whose direction is client (`null`, `client` or legacy `client_positive`) and the lead's `quote_metadata.gstEnabled`; it returns `{ contractValueCents, baseCents, source, baseQuoteId, baseQuoteNumber, approvedClientVoCents, gstFraction, countryCode, leadId }`. `gstFraction` = the base quote's `tax_cents / total_cents`, else the region rate as `r / (1 + r)` when the lead's GST toggle is not `false` (budget-sourced contracts included), else 0. `resolveProjectContractsBatch` does the same for many projects in three queries.
- Rules: the financial-summary route returns this `contract` beside the raw rows; the browser hub maps `source` `signed` / `primary` to `"quote"`, anything else to `"budget"`. A source guard pins seven server files to the loader and forbids a second resolver; reports use the batch loader; margin alerts divide by the base. Load errors are logged and fall to the budget. Country defaults to `SG`. Both routes still return legacy fields for one release (`leadQuotes`; `quotes` + `vos`).
- Data: `projects`, `quotes`, `variation_orders`, `leads.quote_metadata`.
- States: —
- Words: *"projectId is required"*, *"projectIds must be UUIDs"*.
- Reachable: yes.

### C-45 · Who consumes the contract value
- Where: `src/lib/finance/apply-milestone-rebalance.ts:111-150`; `src/app/api/projects/[id]/invoices/milestone/route.ts:242-265`; `src/app/api/finance/records/invoices/auto-milestone/route.ts:100-133`; `src/app/api/finance/generate-invoices/route.ts:140-160`; `src/app/api/projects/[id]/invoices/adhoc/route.ts:199`; `src/lib/finance/milestone-true-up.ts:58-94`; `src/lib/project-closure-summary.ts:14-95`; `src/lib/project-closure.ts:28-145`; `src/lib/financial-issues.ts:125-240`; `src/app/api/finance/reports/[report]/route.ts:218, 458`; `src/app/api/homeowner/projects/[id]/route.ts:224, 325`; `src/app/api/pay/[token]/route.ts:62, 140`; `src/lib/finance/vo-render-context.ts:173`; `src/lib/agents/executors.ts:3738, 5205, 5764, 5894`; `PROJ:2119-2133, 2521-2557, 2658-2678, 2717, 2793-2862, 4016, 4836`.
- Entry: —
- Does: the value is the base for milestone invoice amounts (percent × value, GST split out by the fraction), the rebalance of unsent invoices (target = value + issued rebalance credits), the true-up, auto-milestone and generated invoices (the loader's figure over the browser's), closure gap and margin, financial alerts (VO share, cost overrun), reports (P&L, margins), the homeowner's milestone amounts and headline, the public pay page's budget line, VO documents (C-52), mAIson's invoice tools, and the project page's Contract Value, Gantt and completion prompts.
- Rules: without a qualifying quote every one of these runs on `budget_total`. At 0 the project page skips milestone invoices with a toast.
- Data: C-44.
- States: —
- Words: *"Milestone "<name>" completed but no contract value set."*, *"Milestone "<name>" completed but no contract value set — skipping invoice."*
- Reachable: yes.

### C-46 · Where the contract value is shown, and its copy
- Where: `PROJ:2119-2133`; `src/components/projects/financial-summary-card.tsx:423-455`; `PORTAL:689-763`; `src/app/api/homeowner/projects/[id]/route.ts:318-326`; C-16.
- Entry: the project header; the project's Financial Summary card; the portal's Finance tab; the lists (C-16).
- Does: the project header shows *"Contract Value"* captioned *"From quote"* (and *"· Budget <amount>"*) when the source is a quote, else the budget cell; the Financial Summary card shows *"Contract Value"* with *"From signed quote · <n> line item(s) · includes <±amount> VOs"* or *"From project budget · no signed quote yet"* and a formula tooltip; the portal shows the server value (the client roll-up only when it is missing) with *"Original quote"*, *"Approved variation orders (<n>)"*, *"Pending your approval (<n>)"*.
- Rules: *"From signed quote"* and *"signed primary quote total"* also show when the base is only an approved or out-for-signature primary (`primary` maps to `"quote"`). The portal's *"Original quote"* row is picked in the browser (signed → primary → first shared base quote) and can differ from the server's base. With the portal feature *"View Quotes"* off, the portal headline is labelled *"Approved changes"* (shown when VOs exist) yet still displays the full server contract value.
- Data: C-44.
- States: —
- Words: *"Contract Value"*, *"From quote"*, *"From signed quote"*, *"From project budget · no signed quote yet"*, *"Contract Value = signed primary quote total + approved client variation orders."*, *"Updates automatically when a VO is approved or the quote is re-signed."*, *"Contract Value = the agreed total amount with the client."*, *"Pulled from the project budget — no signed quote exists yet. Once a quote is signed, this number switches to the quote total (+ approved VOs)."*; portal *"Approved changes"*, *"Original quote"*, *"Approved variation orders (<n>)"*, *"Pending your approval (<n>)"*.
- Reachable: yes.

### C-47 · The freeze — trigger `trg_quote_totals_frozen`
- Where: `scripts/migrations/307_finance_contract_freeze.sql:145-172`; `307_finance_contract_freeze_down.sql`; `scripts/finance/verify-307.sql`; spec `docs/superpowers/specs/2026-09-09-finance-ledger-design.md` (D5); plan `docs/superpowers/plans/2026-09-09-finance-ledger-2-contract-freeze.md`.
- Entry: any write to a quote's totals.
- Does: `BEFORE UPDATE OF total_cents, subtotal_cents, tax_cents, discount_cents ON quotes`: when one of the four changes on a row that is `client_signed` or `sent_for_signature`, or on a variation at `approved`, it raises `QUOTE_TOTAL_FROZEN` (`check_violation`).
- Rules: a transaction opts out with `set_config('finance.allow_signed_total_write','on',true)` (the repairs do; a NOTICE is raised); the code calls this "a guardrail against buggy writers, not an authorization boundary". Unchanged totals pass. A standard quote at `approved` is not frozen here (the line-items route locks it, C-48). Lines are not frozen by the database.
- Data: `quotes` totals.
- States: —
- Words: *"QUOTE_TOTAL_FROZEN: quote <id> is <status> — its totals are a signed/approved record. Revise the quote (transition route) or raise a variation order."*
- Reachable: yes (where 307 is applied).

### C-48 · The freeze in the routes and the re-roll
- Where: `src/app/api/quotes/line-items/route.ts:1-12, 339-366`; `src/app/api/quotes/records/[id]/route.ts:66-97`; `src/lib/quotes/recompute-lead-quote-totals.ts:40-75, 111-157`; `docs/rules/finance.md:237-243`; QE C-06.
- Entry: saving lines; PATCHing a quote; changing the lead's GST toggle or document discount.
- Does: the line-items save refuses `approved`, `sent_for_signature` and `client_signed` quotes (409 `QUOTE_LOCKED`, naming the way out); the quote PATCH refuses total fields on `client_signed` / `sent_for_signature` quotes and approved variations (409 `QUOTE_TOTAL_FROZEN`) and a variation's status moves into or out of `approved`, `client_signed`, `sent_for_signature` (400 `USE_TRANSITION_ROUTE`); a lead-level GST or discount change re-rolls only the lead's `draft`, `submitted` and `rejected` quotes (a quote bound to an entity follows that entity's GST registration).
- Rules: the re-roll leaves optional lines out when the studio's Optional Works section is out of the total. `rejected` is deliberately not contract-moving. What is frozen is the quote row's total, not its lines (C-50).
- Data: `quotes`, `quote_line_items`.
- States: —
- Words: *"Cannot edit a quote that is <status> — it is signed — raise a variation order for changes"* / *"Cannot edit a quote that is <status> — revise it first"*; *"Totals of a <status> quote are frozen — revise it first"*; *"A variation order's approval, rejection and signature moves go through their own routes (transition, sign, request-signature); use those."*
- Reachable: yes.

### C-49 · `quotes.signed_at`
- Where: `307_finance_contract_freeze.sql:15-44, 121-127`; `SUBMIT:488-497`; `src/lib/finance/contract-value.ts:36-39, 86-96`; `src/lib/leads/resolve-contract-quote.ts:27-33, 56-64`; `docs/rules/leads.md:367`.
- Entry: —
- Does: a `timestamptz` stamped by `finalize_signed_mirror` v5 with `COALESCE(signed_at, now())`; backfilled from the latest signed request per `quote_id`, then per `quote_ids` element, then from the lead's `signed_at` for `client_signed` quotes with no request.
- Rules: the tiebreak for "latest signed" in both contract rules; `updated_at` only when neither quote carries a stamp, and a stamped quote beats an unstamped one. A demoted quote keeps its stamp. The fallback path writes the submit time and can move an existing stamp (C-26).
- Data: `quotes.signed_at`.
- States: —
- Words: —
- Reachable: yes.

### C-50 · The 307 repairs — the certificate as the legal record
- Where: `scripts/finance/307_repair_signed_totals.sql:1-269`; `307_repair_preflight.sql:1-153`; `307_repair_vo_mirrors.sql:1-182`; `307_repair_omission_lines.sql:1-90`; `307_probe.sql`; `verify-307.sql`; plan task 7.
- Entry: operator scripts (dry run ends in `ROLLBACK`; flipped to `COMMIT` by hand).
- Does: **signed totals** — for each `client_signed` standard quote, its latest signed request in the same studio gives the certificate: the request's `quote_total` when it covers one quote, else the quote's own `quote_snapshot` entry `total` (both dollars → cents); drift over 1 cent is written to `total_cents`, and `tax_cents`, `subtotal_cents`, `discount_cents` are scaled by the same ratio (a quote whose old total was 0 gets subtotal = certificate, tax and discount 0, and is listed for GST review); zero certificates and multi-quote requests with no snapshot entry are listed, never written. **VO mirrors** — mirrors not `approved` under an `approved` / `client_signed` quote become `approved`; `vo_direction 'client_positive'` → `'client'`. **Omission lines** — legacy VOs flagged `is_omission` at quote level whose lines are positive get every line flagged and their totals negated.
- Rules: the certificate, not the lines, is the record — lines are left alone, so a repaired signed quote's lines may not foot to its total. Scale named: 19 drifted signed quotes on prod, 12 re-rolled ×1.09 on 2026-06-19. The dry-run report is the only record of the old values (no audit column on `quotes`). A request flipped to `expired` (C-41) is invisible to the repair.
- Data: `quotes`, `quote_signature_requests`, `variation_orders`, `quote_line_items`.
- States: —
- Words: —
- Reachable: operator scripts.

### C-51 · What the contract record must carry for Finance and Projects
- Where: C-43 … C-50; D-02, D-07, D-18; `docs/rules/finance.md:133-170`.
- Entry: —
- Does: what later modules read from "the contract" today: the base quote's id and number; its final `total_cents` (after the discount, GST inside) and `tax_cents` (the GST fraction), `subtotal_cents` / `discount_cents` for breakdowns; its `status`, `is_primary`, `quote_type`, `signed_at`, `updated_at`; `lead_id` / `project_id`; the lead's `quote_metadata.gstEnabled` and `docDiscount`; the quote's `payment_schedule` rows `{ name, type?, percent, amountCents?, trigger? }` for the project's schedule; the issuing entity (`company_id`); the signing request's `quote_total`, per-quote snapshot `total` and `signed_at` as the legal record; the executed PDF path; `projects.budget_total` (dollars) as the fallback; the approved client VOs' signed `cost_change_cents`.
- Rules: money is cents except `quote_total` and `budget_total` (dollars). Totals are frozen from the send (C-47). Only the loader's rule links a project to its base quote (C-22).
- Data: as listed.
- States: —
- Words: —
- Reachable: n/a.

---

## VO omissions (touchpoints)

### C-52 · Contract before, revised contract
- Where: `src/lib/finance/vo-render-context.ts:1-220` (`computeVoContext`, `resolveVoBaseFacts`, `resolveVoRenderContext`); `docs/rules/finance.md:233-241`.
- Entry: the VO editor's impact strip; every VO PDF.
- Does: a VO shows the contract it changes: `contractBeforeCents` = the loader's contract value **excluding this VO** (`excludeVoQuoteId`); `netCents` = the VO's signed net incl. GST; `revisedCents` = before + net; additions and omissions as gross pre-tax magnitudes; `baseQuoteNumber` = the base quote's number.
- Rules: a VO without a `project_id`, or a loader source of `none`, has no contract before (null). A VO's GST follows the lead's toggle × the studio's region rate, never the entity; a VO never carries a document discount. The editor (client-side) and the PDFs (server) use the same function and facts.
- Data: C-44.
- States: —
- Words: —
- Reachable: yes.

### C-53 · "Omit from contract"
- Where: `src/components/finance/vo-editor/contract-omit-picker.tsx:1-157`; `src/app/api/quotes/records/[id]/vo-editor-context/route.ts:23-85`; `src/lib/queries/quotes.ts:67-90`; `src/components/finance/vo-editor/vo-editor-host.tsx:117-120, 262-271`; `src/components/leads/quote-digitizer-dialog.tsx:641-644, 8511-8522, 10812-10826`; spec `docs/superpowers/specs/2026-07-23-vo-contract-line-omission-design.md`; plan `docs/superpowers/plans/2026-07-23-vo-contract-line-omission.md`.
- Entry: a VO in the editor → the Items toolbar's *"Omit from contract"* (scissors; the label hides on small screens).
- Does: `GET /api/quotes/records/<vo id>/vo-editor-context` returns the base contract's lines (`contractLineItems`, by `sort_order`) with the contract facts (C-52). The button shows only on a VO whose list is non-empty. The modal groups the lines by category (first-seen order; none → *"Others"*), searches label and category, and shows a tick and the line total per row; lines already omitted in this VO are greyed with *"Omitted"* and cannot be ticked. *"Add <n> omissions"* appends one omission line per ticked row (C-54) as one undoable edit and highlights the last; closing discards the ticks.
- Rules: the "contract" is the loader's base — the latest signed quote, else the **primary at `approved` / `sent_for_signature`** — so a VO on a project whose quote is not yet signed lists the approved primary's lines. Non-VO quotes answer 400 `NOT_A_VARIATION`. No link is stored between an omission and its contract line.
- Data: `quote_line_items` of the base quote.
- States: *"No matching contract items."*
- Words: *"Omit from contract"*, title *"Omit items from the signed contract"*, *"Pick the contract items being removed. Each becomes an editable credit on this variation."*, placeholder *"Search contract items…"*, *"No matching contract items."*, *"Omitted"*, *"Others"*, *"Untitled item"*, *"Cancel"*, *"Add omissions"* / *"Add <n> omission"* / *"Add <n> omissions"*; route *"Quote not found"*, *"NOT_A_VARIATION: this quote is not a variation order"*.
- Reachable: yes.

### C-54 · The omission line and the double-omit guard
- Where: `src/lib/finance/vo-omission.ts:1-58`; test `src/__tests__/vo-omission.test.ts:1-128`.
- Entry: C-53.
- Does: `contractLineToOmission` builds a new line — fresh id, `isOmission: true`, `source: "manual"` — copying `name`, `description`, `category`, `subcategory`, `qty`, `unit`, `unitPrice`, `total`, `priceType`, `discountType`, `discountValue`, `taxInclusive`, `taxRate`, `wastePercent`, `amountMarker`, so the credit equals the contract line's value; comments, AI suggestion, source id, quote id and creator are dropped. `isContractLineAlreadyOmitted` compares name + description + category (trimmed, lower-case) + unit price against the VO's omission lines.
- Rules: a partial omission is made by editing the created line's quantity or price. Renaming an omission line defeats the guard, so a second credit for the same contract line can be added. The tests pin the copied and dropped fields, zero totals, and a case- and space-insensitive match that fails on a different price, category or description.
- Data: `quote_line_items.is_omission` (D-08).
- States: —
- Words: —
- Reachable: yes.

### C-55 · Bulk Omit / Restore
- Where: `src/lib/finance/vo-omission.ts:60-71`; `src/components/leads/quote-digitizer-dialog.tsx:8883-8896`; spec `docs/superpowers/specs/2026-07-24-bulk-vo-omission-design.md`.
- Entry: a VO in the editor → select rows → the selection bar.
- Does: *"Omit"* sets `is_omission = true`, *"Restore"* sets it `false`, on every selected row as one undoable edit, then clears the selection.
- Rules: VO only; both always enabled (idempotent).
- Data: `quote_line_items.is_omission`.
- States: —
- Words: *"Omit"*, *"Restore"*; undo labels *"Omit <n> row(s)"*, *"Restore <n> row(s)"*.
- Reachable: yes.

### C-56 · A VO's sign and what an omission does to the money
- Where: `src/lib/variation-orders/sync-vo-from-quote.ts:119`; `src/app/api/projects/[id]/invoices/adhoc/route.ts:130-170`; `src/lib/finance/contract-value.ts:44-50, 69-84`; test `src/__tests__/vo-sign-single-source.test.ts:1-36`; `docs/rules/finance.md:239-267`.
- Entry: —
- Does: a VO's stored `total_cents` is signed (negative when omissions outweigh additions) and is the only source of its sign: the finance mirror copies it into `variation_orders.cost_change_cents`; lists, the quotes table and the project page's proposed-variation chips show it as stored. Approved client VOs add their signed amount to the contract value (floored at 0). A zero or net-credit VO cannot be billed; the omission reduces the contract and the rebalance spreads it over unsent milestone invoices, issuing a draft credit note when needed (Finance).
- Rules: the quote-level `is_omission` is a derived hint (`total_cents < 0`) that no money path reads; the source-guard test forbids re-deriving the sign from it or PATCHing it from the editor.
- Data: `quotes.total_cents`, `variation_orders.cost_change_cents`.
- States: —
- Words: *"This variation is an omission (a credit). It reduces the contract value and cannot be billed as an invoice."* (`OMISSION_NOT_INVOICEABLE`).
- Reachable: yes.

### C-57 · Approving a VO by e-signing
- Where: `SUBMIT:522-558`; `src/app/api/homeowner/projects/[id]/variation-orders/route.ts:83`; `src/app/api/homeowner/projects/[id]/variation-orders/[voId]/respond/route.ts:86-100`; `PORTAL:1040-1070`; `CFD:603-630`; `src/components/finance/vo-editor/vo-editor-host.tsx:190-215`; QE C-16.
- Entry: the client signs a link that covers a variation quote; the portal's VO card.
- Does: a VO backed by a variation quote (`variation_orders.quote_id` set) is client-approved only by signing: signing bridges its mirror to `approved` (it then counts toward the contract) and rebalances the project's unsent milestone invoices; the lead's mirror, stage and older signed quotes are untouched (C-23, C-24). In the portal such a VO shows the e-sign notice and *"Decline"*; an in-portal approve answers 409 `REQUIRES_SIGNATURE`. VOs without a quote keep *"Approve change"* / *"Reject"*.
- Rules: VO quotes carry the lead's id, so an approved VO appears among the dialog's selectable quotes — but the dialog shows only its signed or paper state once the newest request is `signed` or the lead flag is set (A-08). A VO link can therefore be sent only from a lead with no signed and no paper contract; once the base contract is signed, no screen sends one (Uncertain 1). The studio can approve a VO itself through the transition route (QE C-16).
- Data: `variation_orders.quote_id`, `status`.
- States: —
- Words: *"To approve this change, open the signing link your designer sent and e-sign the variation. You can decline it here."*, *"Approve change"*, *"Decline"*, *"Reject"*, *"This change must be approved by signing it. Please open the signing link your designer sent to review and e-sign this variation."*
- Reachable: the portal notice yes; the studio send path only on a lead without a signed or paper contract.

---

## The homeowner portal

### C-58 · The engagement page and its payload
- Where: `ENGAPI:18-204`; `ENG:36-151`; `src/lib/queries/homeowner.ts` (`useHomeownerEngagement`); `src/app/api/homeowner/dashboard/route.ts:79-116`; `src/components/homeowner/project-card.tsx:34-38`; QE C-58, C-92, C-109; B-66; D-13.
- Entry: the portal dashboard's lead-only card; the bell *"Ready for your signature"* (every link, project-linked ones too).
- Does: for the homeowner's own active link that has a lead, returns the studio's branding, the lead name, the lead's quotes that are both shared (`quote_metadata.portalSharedQuotes`) and at `approved` / `sent_for_signature` / `client_signed` — each with its lines and a proxied PDF URL when it has lines — and the lead's **newest** request: status, `signedAt`, a proxied executed-PDF URL when `signed_pdf_url` is set, `quoteTotal` (the certificate total), its non-quote documents, and a token with `canSign` only while it is `pending` / `viewed` and unexpired. The page shows the banner (C-59), then the signing wizard (C-60), the quotes (C-62) or *"No quote shared yet"*; the scope questions show only while no quote is shared.
- Rules: preview sessions get 403 (lead-stage preview is not wired); another studio's or an inactive link → 404. The lead's archive state is not checked here (C-10). A send adds the signing quote to the shared set (QE C-69), so it normally shows.
- Data: `homeowner_project_links`, `leads.quote_metadata`, `quotes`, `quote_line_items`, `quote_signature_requests`.
- States: loader while fetching; the error card.
- Words: *"Back"*, *"Your engagement with <studio>."*, *"No quote shared yet"*, *"<studio> will share your quote here once it's ready."*, *"A few questions"*, *"Something went wrong loading this engagement."*, *"Try again"*; route *"Invalid link id"*, *"Not authenticated"*, *"Preview not available for lead-stage"*, *"Not found"*, *"This link has no lead-stage engagement"*, *"Internal server error"*.
- Reachable: yes.

### C-59 · The signature banner
- Where: `ENG:173-228`.
- Entry: the engagement page.
- Does: newest request `signed` → *"Contract signed"*, *"Signed on <date>"* and *"Download"* (the proxied executed PDF as an attachment) when a PDF exists; `pending` / `viewed` and signable → *"Ready for your signature: <quote>"* with *"Only <quote> is being sent for signing. Review it below, then sign at the bottom."*, or the generic lines when no shared quote is out for signature; anything else → *"Signing link unavailable"* / *"This signing request has expired — please ask your studio to send a fresh one."*
- Rules: a `cancelled` request, a pending link past its date and a signed request flipped by a late load (C-41) all read as expired — the last one above a quote card still marked *"Signed"*. No request, no banner.
- Data: C-58.
- States: —
- Words: as above; *"Ready for your signature"*, *"Review the quote below, then sign at the bottom of this page."*
- Reachable: yes.

### C-60 · Signing in the portal
- Where: `ENG:230-529`; `SUBMIT:98-156`; B-66; QE C-92; D-13.
- Entry: the engagement page when `canSign`.
- Does: a wizard *"Step <i> of <n>"* with a progress bar: (1) the shared quotes (C-62) → *"Continue to documents"* / *"Continue to sign"*; (2 … n−1) each non-quote document of the request as sanitized HTML, *"Skip to end"*, its accept tick when required, *"Back"*, *"Next document"* / *"Continue to sign"*; (n) *"Sign: <quote>"*, the CaseTrust box when on, *"Your full name"* (pre-filled with the homeowner's name, else the lead's), a signature pad (C-61), the agreement tick, *"Back"*, *"Sign & submit"*. Submit posts `{ signerName, signatureData, signerTimezone, casetrust_acknowledged? }` to `/api/sign/<token>/submit`; the portal login stands in for the OTP and the homeowner's phone becomes `signer_phone`.
- Rules: submit needs a drawing, a name, the agreement and, when shown, the CaseTrust tick. No acknowledgements, client selections or `selectedQuoteId` are sent — a `variations` request cannot be signed here (the route requires a pick). The agreement sentence names no documents, unlike the public page's (B-63), and names the portal's studio name rather than the issuing entity. The CaseTrust box never opens: it needs a region with CaseTrust and none has it (QE C-79). On success the page refetches and the banner turns *"Contract signed"*.
- Data: C-58; QE C-83.
- States: *"Submitting…"*.
- Words: *"Step <i> of <n>"*, *"Your quote"*, *"Document"*, *"Sign"*, *"Your quote isn't available to preview here"*, *"You can still review the documents and sign below."*, *"Continue to documents"*, *"Continue to sign"*, *"Document <i> of <n>"*, *"Skip to end"*, *"Back"*, *"Next document"*, *"Sign: <quote>"*, *"You're signing this quote only. Any other quotes shared with you are for reference."*, *"CaseTrust Deposit Protection"*, *"This studio is a CaseTrust-Renovation accredited business. Your deposit is protected under the CaseTrust deposit-protection scheme up to the accredited amount."*, *"The deposit is held in a CaseTrust-protected account."*, *"You may request reimbursement under specified conditions."*, *"Full terms: case.org.sg/casetrust-renovation"*, *"I have read and understood the CaseTrust disclosure."*, *"Your full name"*, placeholder *"Full name"*, *"Signature"*, agreement *"I, <name|[your name]>, agree to the quotation from <studio>[ totalling <total>] as set out in the quote. I understand this constitutes my digital agreement to proceed."*, *"Sign & submit"*, *"Your signature is legally binding under the <Singapore Electronic Transactions Act|Malaysian Electronic Commerce Act 2006|UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions|Indian Information Technology Act, 2000|applicable electronic transactions law>."*; toasts *"Please draw your signature"*, *"Please enter your name"*, *"Please check the agreement box to proceed"*, *"Please acknowledge the CaseTrust disclosure"*, *"Signed — thank you!"*, *"Could not submit signature"*.
- Reachable: yes (portal).

### C-61 · The signature pad
- Where: `src/components/homeowner/signature-pad.tsx:1-108`; users `ENG:487`, `src/components/settings/member-signature-card.tsx:6, 126` (B-43).
- Entry: the portal's sign step.
- Does: a 160 px canvas drawn with mouse or touch (2 px round dark stroke, scaled to the device pixel ratio); every stroke emits a PNG data URL; *"Clear"* wipes it and emits nothing.
- Rules: no minimum — a single dot counts, unlike the public page's 50 × 20 bounding box (QE C-80); no typed signature; no undo. The same component captures a member's own signature (B-43).
- Data: `signatureData` (PNG data URL).
- States: —
- Words: *"Clear"*.
- Reachable: yes.

### C-62 · Which quote the portal says is being signed, and which was signed
- Where: `ENG:47-55, 531-674`.
- Entry: the engagement page.
- Does: the "signing quote" is the first shared quote at `sent_for_signature`. The quotes block shows one quote at a time — a picker when several are shared, defaulting to the `client_signed` one, else the signing quote, else the first — with suffixes *" — signed"* / *" — for signing"*, a status pill (*"Approved"*, *"Awaiting signature"*, *"Signed"*), the designed PDF inline with *"Open / download PDF"*, or, for a quote without lines, an itemized fallback with *"Total"*.
- Rules: pills follow the quote's own status, not the request's — a quote stays *"Signed"* after its request is flipped to `expired` (C-41), and a demoted re-sign shows *"Approved"* (C-23).
- Data: C-58.
- States: —
- Words: *"Your Quotes"* / *"Your Quote"*, *" — signed"*, *" — for signing"*, *"The quote marked “signed” is the one you agreed to. The others were shared for comparison."*, *"These are shared for your reference. Only the quote marked “for signing” needs your signature."*, *"Multiple quotes were shared for you to compare."*, *"Approved"*, *"Awaiting signature"*, *"Signed"*, *"Open / download PDF"*, *"Total"*, *"(optional)"*, *"Quote"*, *"Item"*.
- Reachable: yes.

### C-63 · The engagement document proxy
- Where: `src/app/api/homeowner/engagement/[linkId]/document/route.ts:1-286`.
- Entry: the portal's quote previews; the banner's *"Download"*.
- Does: `?type=quote&quoteId=` streams the shared quote's stored PDF (the share map's URL, else the deterministic `shared-quotes/{studio}/{quote}.pdf`), rendering and caching it on demand when missing; `?type=signed-contract` streams the `signed_pdf_url` object of the lead's **newest** request. `&download=1` makes it an attachment; responses are `private, no-store`; only Supabase URLs in `shared-quotes` and `signed-quotes` are fetched.
- Rules: an executed PDF is never re-rendered here — a missing object answers 404 — while `/api/sign/<token>/download` renders and archives one (templates B-87). A newer request without a PDF hides an older executed one. File names `quote.pdf` / `signed-contract.pdf`.
- Data: C-58.
- States: —
- Words: *"Invalid link id"*, *"Invalid document type"*, *"Invalid quote id"*, *"Not authenticated"*, *"Preview not available for lead-stage"*, *"Not found"*, *"Document not available"*, *"Internal server error"*.
- Reachable: yes.

### C-64 · The project Documents tab
- Where: `src/app/api/homeowner/projects/[id]/documents/route.ts:1-365`; `PORTAL:1243-1370`; `src/components/settings/portal-features-config.tsx:75`.
- Entry: portal › project › *Documents* (portal feature *"Documents"*).
- Does: lists, for the homeowner's project: every `signed` request of the project's lead, newest first — *"Signed quote · <client|Homeowner>"*, *"Signed <date> · <certificate total>"*, downloading through `/api/sign/<token>/download` — plus *"Signed document packet"* (a one-hour signed URL) when a packet exists; the project's contract as *"Contract"* (label = `contract_file_name`; a fresh signed URL when `contract_file_url` is set, else *"Stored on file with your studio"*); documents the studio shared; selection and payment receipts; project and lead files marked homeowner-visible, grouped by a name guess (*"Contracts"* when the name holds "contract" or "signed", then *"Quotes"*, *"Variation orders"*, *"Renders"*, *"Floor plans"*, *"Site photos"*, *"Other"*).
- Rules: an e-signed project shows the executed PDF twice — as the signed quote and as the saved *"Contract"* copy (C-30, C-31). A phantom or drawer name (C-29) shows as a *"Contract"* that cannot be downloaded. A request flipped to `expired` drops out (C-41). The packet link lasts an hour. A preview session resolves the lead through any active link of the project.
- Data: `quote_signature_requests`, `projects`, `homeowner_shared_assets`, `project_files`, `lead_files`, `payment_records`.
- States: *"No documents yet"* empty state.
- Words: *"No documents yet"*, *"Your signed contract, signed quote, selection and payment receipts, and shared documents will appear here."*, *"Signed quote"* / *"Signed quotes"*, *"Signed <date>"*, *"Contract"*, *"Click to download"*, *"Stored on file with your studio"*, *"Signed document packet"*, *"Other documents"*; route *"Access denied"*.
- Reachable: yes (portal, feature on).

### C-65 · The portal dashboard — "Unsigned Quotes" and the lead-stage labels
- Where: `src/app/api/homeowner/dashboard/route.ts:79-116, 161-236`; `src/components/homeowner/pending-actions.tsx:12-17`; `src/components/homeowner/project-card.tsx:22-38`; `src/app/my/page.tsx:78`; `src/app/my/[studioSlug]/page.tsx:65`.
- Entry: the portal dashboard.
- Does: *"Unsigned Quotes"* counts the homeowner's linked leads whose **lead mirror** `quote_status` is `sent_for_signature`; a lead-only card's stage label maps the same mirror — `client_signed` *"Signed"*, `sent_for_signature` *"Awaiting signature"*, `approved` *"Quote ready"*, `submitted` *"Quote in review"*, else *"Getting started"* — and opens the engagement page.
- Rules: the count ignores the request: an expired link, or one on an archived lead, keeps counting until the mirror changes (a Cancel or a Revise moves it, QE C-09; expiry does not, QE C-73). Chips hide at 0.
- Data: `leads.quote_status`, `homeowner_project_links`.
- States: —
- Words: *"Unsigned Quotes"*, *"Signed"*, *"Awaiting signature"*, *"Quote ready"*, *"Quote in review"*, *"Getting started"*.
- Reachable: yes.

### C-66 · The portal's milestone amounts and contract headline (touchpoint)
- Where: `src/app/api/homeowner/projects/[id]/route.ts:215-326`; `PORTAL:650-763`; C-46.
- Entry: portal › project › Overview / Finance.
- Does: the portal project route resolves the contract value through the loader (C-44); a published, client-visible milestone's amount is the sum of its non-ad-hoc, non-void invoices (drafts included, top-ups summed), else `contract value × paymentPercent`; it returns `budget` = the contract value in dollars and `contractValueCents`, which the Finance tab shows as *"Contract Value"* (C-46).
- Rules: once invoices exist the amounts follow them, so a rebalance or a top-up changes what the homeowner sees; with no qualifying quote the slices come from the budget.
- Data: C-44; `project_invoices`.
- States: —
- Words: C-46.
- Reachable: yes.

### C-67 · "View and Sign Contracts" — stored, never read
- Where: `src/components/settings/portal-features-config.tsx:20, 50, 71`; `src/lib/portal-branding-resolve.ts:89`; `PORTAL:66-71, 99-107`; `ENG` (reads no feature).
- Entry: the studio's portal features editor (`PortalConfigHub` in Tools › Homeowner Portal, owner only, and in Accounts).
- Does: offers *"View and Sign Contracts"* — *"View and digitally sign contracts"* / *"Homeowners can review and sign contracts directly in the portal."* (default on). Nothing reads `contractSigning`: the engagement page offers signing whenever a link is live, whatever the toggle.
- Rules: the neighbouring *"Documents"* toggle does gate the Documents tab (C-64), and *"View Quotes"* gates the Finance tab's quote card.
- Data: the portal features settings (D).
- States: —
- Words: *"View and Sign Contracts"*, *"View and digitally sign contracts"*, *"Homeowners can review and sign contracts directly in the portal."*
- Reachable: the toggle yes; its effect no.

---

## Notifications and reminders

### C-68 · `quote.signature_requested` (touchpoint)
- Where: QE C-105, C-88, C-89; `src/lib/notifications/events.ts:210-224`; `src/lib/notifications/dispatch.ts:449-450`; D-14.
- Entry: every send, resend and regenerate.
- Does: QE C-105 — the studio's Quotes recipients (default owner, admin) by in-app, e-mail and WhatsApp per preferences; the client by e-mail only, always (functional), when the lead has an e-mail.
- Rules: the in-app body reads *"<client> has been sent a quote to sign[ for <total>]"* under the title *"Quote Signature Requested: Lead: <name>"*. Nothing is sent when a link is viewed, expires or is cancelled.
- Data: `notifications` (D-14).
- States: —
- Words: *"<client> has been sent a quote to sign for <total>"*; QE C-105.
- Reachable: yes.

### C-69 · `quote.signed_by_client` (touchpoint)
- Where: QE C-106; `SUBMIT:566-736`; D-14.
- Entry: a client signature.
- Does: QE C-106 — after the executed-PDF attempt, the studio's Quotes recipients get it in-app, by e-mail (with *"↓ Download signed quote (PDF)"* → the studio-gated route) and WhatsApp; never the client.
- Rules: it fires whether or not the PDF rendered (the link is left out when it did not); `quote_number` is the synthetic `Q-<first 8 of the request id>`; the sender name is the issuing entity's; it is critical (never held for a digest); a VO-only signing sends the same event. It passes `has_document_packet: "yes"` for document signings, but no template reads it, so no packet link is ever sent (B-35). No event reports whether the project copy (C-30) was saved.
- Data: `notifications`.
- States: —
- Words: QE C-106.
- Reachable: yes.

### C-70 · `contract.composed_sent`
- Where: `src/app/api/contracts/send-to-client/route.ts:159-198`; `src/lib/notifications/events.ts:225-235`; `src/lib/notifications/templates/base/quotes.ts:91-110`; `src/lib/notifications/dispatch.ts:196-221, 354-392, 396-469`; `src/lib/notifications/dedupe.ts:19-60`; QE C-108; D-14.
- Entry: the compose path's *"Send to client"* (A).
- Does: after the composed contract is stored as a lead file (C-08), the client gets an e-mail at `leads.email` (functional — always sent) with a 7-day download link, and the studio's Quotes recipients (default owner, admin) get in-app, e-mail and WhatsApp per preferences. Variables: `client_name`, `studio_name` (studio name, else *"mAIson"*), `download_link`, `current_date`, `action_url` (= the download link).
- Rules: internal recipients are the roles each channel enables for the Quotes category in the studio's notification settings (catalogue default owner and admin; Leads C-63, C-65); a demo studio sends nothing at all, a paused studio still sends the client e-mail. Not critical, so it can be held for a digest. The e-mail card's *"Total"* and subtitle are empty (no `quote_total` or `project_type` is passed) and its title falls back to *"Your contract"*. The in-app title is *"Contract Sent to Client: Lead: <name>"* and its body the bare *"Lead: <name>"*. The event has no WhatsApp text or template. A second send for the same lead within 2 minutes is de-duplicated (same title and body), so the second client e-mail is dropped although its file and activity row are written. A lead without an e-mail is refused before anything is stored.
- Data: `notifications`; `lead_files`; `lead_activity_log`.
- States: —
- Words: *"Your contract is ready, <first name>."*, *"<studio> has sent you a contract. Tap below to open and review it."*, *"Your contract"*, *"From"*, *"Total"*, *"Contract sent"*, *"Open contract"*, *"Contract Sent to Client: Lead: <name>"*; route *"This lead has no email on file — add an email before sending."*
- Reachable: yes.

### C-71 · Homeowner bells for signing (touchpoint)
- Where: QE C-109; `src/lib/homeowner-binding.ts:537-573`; `SUBMIT:737-770`; `src/components/homeowner/notification-bell.tsx:54`; D-13.
- Entry: a send; a signature.
- Does: a send rings *"Ready for your signature"* / *"Your studio sent a quote for you to review and sign."* on every active link of the lead (→ the engagement page); a signature rings *"Contract signed"* / *"Your signed contract is now available in your portal."* only on links that already have a project (→ `?tab=documents`).
- Rules: lead-only links get no signed bell (the engagement page shows the state live). Nothing rings for a cancel, an expiry, a regenerate's cancel, a paper contract or a composed contract (the last is e-mail only, C-70).
- Data: `homeowner_notifications`.
- States: —
- Words: as above.
- Reachable: yes.

### C-72 · No reminders, no expiry notice, no chase (touchpoint)
- Where: QE C-104, C-73; `vercel.json` (crons); `src/app/api/cron/*`; `src/app/api/notifications/schedule/route.ts`; `src/lib/lifecycle/transitions.ts:61-99`; D-16.
- Entry: —
- Does: no cron or scheduled notification concerns contracts: the scheduled rows are task, follow-up and hold reminders. Nothing reminds the client before the 7-day expiry, tells the studio a link lapsed or went unviewed, or chases a signed contract that has no project. The only nudges are manual: *"Resend email"* (QE C-88), *"Open signing portal"* on the project (C-38), the archive blocker (C-10).
- Rules: `expired` is written only when someone loads the link (C-41), so no surface knows a link lapsed until then. The setting `quoteLinkExpiryDays` is not read (D-16).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-73 · The stage-change notification on signing (touchpoint)
- Where: QE C-84; `SUBMIT:404-480`; Leads C-26, C-62.
- Entry: a client signature.
- Does: a signing moves the lead to the funnel's SIGNED bucket, but `lead.status_changed` is dispatched only on the fallback path (when the RPC failed), naming the client as the actor; the normal RPC path moves the stage silently.
- Rules: the TAT stamp is written on both paths (C-26).
- Data: `notifications`.
- States: —
- Words: —
- Reachable: yes.

### C-74 · Usage events and the daily rollup (touchpoint)
- Where: QE C-110; `src/app/api/cron/usage-rollup/route.ts:80-125`; `src/lib/usage/track.ts`.
- Entry: —
- Does: `quote_sent` and `quote_signed` usage events (QE C-110); the nightly rollup counts each studio's `quote_signature_requests` created the previous day as its `quotes` figure, at studio level and — unattributed — on every active user's row.
- Rules: it counts requests, not quotes: each regenerate adds one; a signature adds none.
- Data: `usage_daily_rollup.metrics` (Platform).
- States: —
- Words: —
- Reachable: yes.

---

## Bulk and admin

### C-75 · Bulk assign — no contract effect
- Where: `src/components/leads/bulk-assign-dialog.tsx:1-146`; `src/app/api/leads/mutations/bulk-assign/route.ts:1-200`; `src/lib/leads/bulk-assign.ts:15-47`; tests `src/__tests__/dyel-bulk-assign-plan.test.ts:1-76`, `src/__tests__/dyel-bulk-assign-route.test.ts:1-178`.
- Entry: the leads list's filter-driven *Bulk assign* (built for Dyel).
- Does: sets one assignee (or none) on up to 2,000 leads, in chunks of 400, after the same actor and manager-scope checks as a single assignment.
- Rules: contracts are not looked at: leads with a live link, a signed contract or a project are reassigned like any other, and their requests, flags and projects are untouched. The new assignee reaches contracts only through the next send, whose *"prepared by"* is resolved from the lead's assignees at send time (QE C-68; B-51); existing requests keep their frozen text. The tests cover id normalisation, chunking and the route's policy only.
- Data: `lead_assignees`, `leads.assigned_to`.
- States: —
- Words: *"Too many leads at once — 2000 maximum per request."*, *"Your role can't reassign leads."*, *"Assignee not found"*, *"That member is deactivated."*, *"<n> lead(s) assigned to <name>."* / *"<n> lead(s) unassigned."*, *"<n> skipped — outside your access."*
- Reachable: yes.

### C-76 · Admin routes — none touch contracts
- Where: `src/app/api/admin/**` (searched for contract, signature, signing).
- Entry: —
- Does: no platform-admin route reads or writes a signature request, a lead contract flag, a project contract or a contract value. "Signature" there is the HMAC `X-Signature` header of the fork-ingest routes (`notifications/log-ingest`, `whatsapp/register-wamid`, `analytics/ingest`). Platform admins have no view of a studio's contracts.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-77 · Look-alikes that are not studio contracts
- Where: `src/app/admin/agreements/page.tsx`; `src/components/admin/agreement-pdf-template.tsx`; `docs/agreements/trial-agreement-sg.md`, `trial-agreement-dubai.md`; `src/lib/access-control.ts:81`; `src/types/app.ts:2815-2827` (`CreditContract`); `src/data/mock-credits.ts:314`; CSV row 18.
- Entry: Admin › Agreements; Qanvast Ops › Credits.
- Does: Admin › Agreements generates Qanvast's own trial-agreement PDFs for studios (geography, pricing); Qanvast Ops › Credits shows the studio's lead-credit contracts with Qanvast, proxied from Qanvast's platform (`CreditContract { contractId, startDate, contractAmount, creditAmount, minBudgetOfLeads, entitlements, status: active | expired }`, owner only). Neither is a studio ↔ homeowner contract.
- Rules: Platform, not this module.
- Data: —
- States: —
- Words: *"Agreement PDF downloaded"*.
- Reachable: yes.

### C-78 · mAIson — no contract tools
- Where: `src/lib/agents/tools.ts`; `src/lib/agents/executors.ts:3738, 5205, 5764, 5894`; Leads C-28; test `src/__tests__/agents-tool-signed-stamp.test.ts`.
- Entry: the chat agent.
- Does: no tool sends, resends, cancels or reads a signing link, attaches a contract or reads a certificate. `update_lead` can move a lead to SIGNED with no contract, no signature and no gate, stamping `signed_at` (Leads C-28); the invoice tools read the contract value and GST fraction from the loader (C-45).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Docs vs code discrepancies

### C-79 · `docs/prd/11-quote-signing.md` — the post-signing parts
- Where: `docs/prd/11-quote-signing.md:44-72`.
- Entry: —
- Does: the PRD says — on submission a branded signed PDF is rendered and uploaded and "the signed PDF URL is included in the notification"; "Record: On submit, the signed PDF is generated, stored, and notified; the lead's quote status updates."
- Rules: the code — the notification carries a studio-gated route, not the stored URL, and goes to the studio only; the client gets no confirmation (QE C-106). Submission also moves the lead to SIGNED, sets the lead contract flag with a phantom name, writes three timestamps, bridges and rebalances VOs, copies the PDF onto the lead's projects, builds a packet and rings the homeowner (C-24, C-26, C-30, C-57, C-71). The PRD says nothing about what follows: the project contract, the contract value, the freeze, the portal documents, or a signed record turning `expired` (C-41).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-80 · `docs/rules/leads.md` — gates, signing and the executed contract
- Where: `docs/rules/leads.md:45, 321-325, 367, 407-433, 458`.
- Entry: —
- Does: the document says — `requiresContract` "Contract file must be uploaded" (45); "SIGNED requires: approved quote + project type + contract (relaxed by an in-flight/`signed` signature request)" and, on create, "moves lead to CLOSED/PROJECT_CREATED" (323-325); `quotes.signed_at` — "Plan 3's loader is what feeds it — until then the loader still passes `updated_at`" (367); "Owner generates signing link", statuses `pending/viewed/signed/expired` (412-421); the executed contract — "`/sign/[token]/download` + `/projects/[id]/contract/from-signature` serve it via `getOrRenderSignedQuotePdfBuffer`" (458).
- Rules: the code — lines 45 and 323 disagree; the code follows 323, plus a `client_signed` quote (C-20). The sub-status is `PROJECT_STARTED` (Leads C-27; CSV row 13). The loader passes `signed_at` (C-49). Any member sends; `cancelled` exists; `expired` also overwrites `signed` (C-41). from-signature does not serve the executed PDF — it copies it into `contract-files` and points the project at the copy (C-31), as the submit route does for existing projects (C-30).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-81 · `docs/rules/projects.md` and the projects guide
- Where: `docs/rules/projects.md:33-35, 47-53`; `docs/PROJECTS_AND_FINANCE_GUIDE.md:102-104, 176-183, 273`.
- Entry: —
- Does: the documents say — "Signature request banner: … amber for pending/viewed, green for signed, with 'Open signing portal' link"; the create dialog `project-create-dialog.tsx`, "On create from lead: Also moves lead to CLOSED/PROJECT_CREATED", "Auto-generates AI plan when creating from lead"; the project's Finance › *Contracts* is "All quotes for the project. Upload, download, share with client, mark as primary, check signature status."; the Financial Summary card has "**View contracts** and **View invoices** shortcuts".
- Rules: the code — no green signed banner (C-38); the drawer `project-create-drawer.tsx`, `PROJECT_STARTED`, no AI plan on the drawer path (CSV rows 13, 44); the sub-tab is *"Contract/VO"*, lists only project-scoped quotes (the signed lead quote is absent) and adds the Contract document card and the VO list (C-39); no *View contracts* shortcut exists in the code.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-82 · `docs/rules/finance.md` — the contract value and the freeze
- Where: `docs/rules/finance.md:133-170, 233-249`.
- Entry: —
- Does: the document says — `resolveProjectContract` is "the ONLY way a server surface learns a project's contract value", `budget_total` "is the resolver's last fallback and nothing else"; the freeze covers "an `approved`/`client_signed` variation"; the VO editor shows a live contract-impact readout; "Every client-VO status change rebalances".
- Rules: the code — true for server surfaces, while browser surfaces keep fallbacks of their own (`budgetVal × 100` on the lists, C-16; the project page's `contractTotalCents` fallbacks, `PROJ:2717, 4016, 4836`; the portal's client roll-up, C-46). The freeze text matches the trigger (a signed variation falls under its plain `client_signed` clause, C-47). The "signed" contract of its prose is "signed, else the approved or out-for-signature primary" in code (C-43).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-83 · Contract value spec and plan (2026-06-10)
- Where: `docs/superpowers/specs/2026-06-10-contract-value-single-source-of-truth-design.md`; `docs/superpowers/plans/2026-06-10-contract-value-single-source-of-truth.md`; `scripts/audit-contract-value-invoices.mjs`.
- Entry: —
- Does: the spec and plan say — the base is signed → primary {sent, approved} → budget; for the tax basis, "Use the **ex-GST subtotal** for payment-schedule math; GST added per-entity at invoice time" (marked VERIFY); linking lead quotes to the project is out of scope; Phase 4 cleans up wrong invoices with a one-off `scripts/fix-contract-value-invoices.js`; Phase 5 "Consider stamping the signed `quote_id` onto the project at signing for O(1) resolution"; the result has three fields.
- Rules: the code — both quote rungs also need `total_cents > 0`, and the floor applies after VOs (C-43); the tax question was settled the other way — `total_cents` is incl-GST and invoices slice it, splitting GST by the base's fraction (C-44); lead quotes are still unlinked (C-15, C-39); no quote id is stamped on projects; the result carries `baseQuoteId`; everything now sits behind one server loader the spec did not have (C-44). Only a read-only detection script (`audit-contract-value-invoices.mjs`) exists for Phase 4.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-84 · Contract freeze plan (2026-09-09)
- Where: `docs/superpowers/plans/2026-09-09-finance-ledger-2-contract-freeze.md`; `docs/superpowers/specs/2026-09-09-finance-ledger-design.md` (D5, D6, D12); `scripts/backfill-signature-discount-totals.js:1-189`.
- Entry: —
- Does: the plan says — the repair sets `total_cents` to the request's `quote_total` for any signed request covering the quote, scales `tax_cents` proportionally and leaves subtotal and discount; repairs are dry-run scripts that turn on `finance.allow_signed_total_write` inside their transaction; "The signing certificate (quote_signature_requests.quote_total) is the legal record."
- Rules: the shipped repair differs — multi-quote requests use the quote's own snapshot entry, subtotal and discount are scaled too, zero certificates are only listed, and the lookup is scoped by studio (C-50). An older operator script, `backfill-signature-discount-totals.js`, rewrites every quote's `total_cents` and open requests' `quote_total` — and signed requests' certificates with `--include-signed` — without the GUC, so after 307 its quote writes fail on sent and signed quotes while request totals have no guard (Uncertain 10).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-85 · VO omission spec and plan (2026-07-23)
- Where: `docs/superpowers/specs/2026-07-23-vo-contract-line-omission-design.md`; `docs/superpowers/plans/2026-07-23-vo-contract-line-omission.md`; `src/lib/queries/quotes.ts:77-79`; `src/components/finance/vo-editor/vo-editor-host.tsx:117-120`; `src/components/leads/quote-digitizer-dialog.tsx:477-478`.
- Entry: —
- Does: the spec says — the designer sees "the signed contract's line items"; for *"No signed base quote"* the button is *"hidden"*; the guard matches "name+category+unit price"; the omission copies "name/category/subcategory/qty/unit price/unit".
- Rules: the code — the base is the loader's, which falls back to an approved or out-for-signature primary, so an unsigned contract's lines are offered (C-53), while the comments in the hook, host and dialog still say "no signed base quote"; the guard also compares the description (C-54); the copy carries every amount-defining field the spec's edge-case note asked for (C-54). Bulk Omit / Restore came later (C-55).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-86 · Comments in migrations and routes that no longer hold
- Where: `scripts/migrations/140_projects_contract_url.sql:1-16`; `210_contract_files_bucket.sql:1-26`; `src/app/api/projects/[id]/contract/route.ts:9-11`; `src/app/api/projects/[id]/contract/list/route.ts:1-16, 67-70, 90-93`; `src/app/api/homeowner/projects/[id]/documents/route.ts:71-73`; `src/types/database.ts:287`; `LDD:1103-1105`.
- Entry: —
- Does: (1) 140, 210 and the upload route call `contract-files` public and `contract_file_url` "a public Supabase Storage URL" — 233 made the bucket private and every reader re-signs (234 can reverse it; D-17). (2) The list route says it "Falls back to surfacing every lead_files row if the name didn't match" — it does so only when the project has **no** name (C-34); and that skipping `/signed-quotes/` URLs avoids showing "the same PDF twice" — the saved copy lives in `contract-files`, so it is shown twice (C-34). (3) The documents route and `DbProject` date `contract_file_url` to "migration 111" — it is 140 (D-11). (4) The drawer says "in-app signing sets quote_status, not the contract flag" — the signing mirror sets the flag (C-02).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-87 · PRDs 08 and 09
- Where: `docs/prd/08-leads.md:50`; `docs/prd/09-projects.md:51`.
- Entry: —
- Does: PRD 08 — "accept an uploaded signed contract as proof for "Signed"; show "Create Project" whenever prerequisites are met". PRD 09 — "H13 handover lock gates edits (Gantt, progress updates, contract trash) unless the user has the override permission."
- Rules: the code — an uploaded contract counts for SIGNED, and so does a link merely out when quote approval is off (C-20). The handover lock does not gate the project's contract card — upload, replace and save stay open on a locked project — and the project page has no contract delete (C-33).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-88 · `docs/openmaison-v1-feature-requirements.csv` rows
- Where: CSV rows 5, 10, 13, 44, 55, 66.
- Entry: —
- Does: row 5 — every gate "assignment/quote-approval/contract/project-type/…" is "enforced"; row 10 — the Journey's hard prerequisites "Assigned/Outreach/Quote/Contract/Signed" are never backfilled; row 13 — the contract prerequisite is "individually toggle-able", the final sub-status `PROJECT_STARTED`; row 44 — a project can "auto-open pre-filled from a SIGNED lead"; row 55 — "signature requests are NOT covered by that same guard" (the entity lock); row 66 — portal contract-value formulas "deliberately match the studio side exactly".
- Rules: the code — row 5 holds in Classic only and mAIson bypasses it (C-20, C-78); row 10 holds, but the Contract step completes on a mere send (C-13); row 13 holds, while projects keep a separate, fixed contract check (C-37); row 44 holds (Leads B-19); row 55 confirmed — and the entity migration rewrites signed requests too (C-07); row 66 holds for the headline and the milestone slices (server loader), not for the portal's *"Original quote"* row (C-46).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-89 · In-code copy that contradicts the code
- Where: as cited.
- Entry: —
- Does: (1) *"From signed quote"* and *"Contract Value = signed primary quote total + approved client variation orders."* also show for an approved or out-for-signature primary (C-46). (2) *"Totals of a client_signed quote are frozen — revise it first"* — Revise is not legal from `client_signed` (C-25). (3) The setup wizard's *"PDF or image, up to 25MB"* — no size check exists (C-37). (4) The portal's *"This signing request has expired — please ask your studio to send a fresh one."* also shows for a cancelled request and for a signed one flipped by a late load (C-59). (5) *"Lead archived (live signing link voided)"* — the link is blocked while archived, not voided (C-10). (6) The omit button's title *"Omit items from the signed contract"* shows for an unsigned base (C-53). (7) The Contract/VO line *"Quotes and variation orders — the customer-facing agreements your studio bills against."* — the signed lead quote is not in that list (C-39). (8) *"View and Sign Contracts"* — no effect (C-67). (9) *"Open signing portal"* opens the client's public page, and the studio's visit counts as the client's view (C-38). (10) The portal's *"Approved changes"* heading sits over the full contract value when *"View Quotes"* is off (C-46).
- Rules: —
- Data: —
- States: —
- Words: as quoted.
- Reachable: —

---

## Uncertain / not verified

1. **VO e-signing reachability** (C-57): the dialog's state order (A-08) keeps a lead with a signed or paper contract from reaching the send form, and every send cancels the lead's other open links (QE C-69), so a VO link seems unsendable after the base contract; not exercised — only a direct call to `/api/quotes/request-signature` could still carry a VO.
2. **How many signed requests are now `expired`** (C-41): the rewrite is certain from `src/app/api/sign/[token]/route.ts:35-45`; whether clients or studios re-open signed links after 7 days in practice was not measured.
3. **`contract-files` visibility per database**: 233 made it private, 234 is an emergency rollback; which applies where is not visible (readers re-sign either way).
4. **Duplicated signed documents** (C-34, C-64): inferred from the code paths (the saved copy's path lacks `/signed-quotes/`; the portal lists both the request and the project copy); not observed on data.
5. **De-duplication of a second composed-contract e-mail** (C-70): inferred from `dedupe.ts` (2-minute window keyed on title and body); not run.
6. **`useGetSignatureRequest` has no caller** (C-06): by repository search only.
7. **Portal signing of `bundle` / `variations` requests** (C-60): read from the submit route; the multi-quote modes are off in the dialog (QE C-71), so no such request should exist.
8. **Existing `project_files.folder` values** (C-40): the mismatch is in code; stored rows may carry either `contract` or `contracts`.
9. **307 repairs per fork** (C-50): whether each fork ran the three repairs is not visible.
10. **`backfill-signature-discount-totals.js` after 307** (C-84): whether it was run after the trigger landed, and with `--include-signed`, is not visible.
11. **Projects created by Quick Convert or by mAIson** (Leads C-71, C-28): their `contract_file_name` source and insert-time stage were not traced; this slice read only the Create Project drawer path (C-28, C-29).
12. **The portal on an archived lead** (C-58): the engagement route does not check `archived_at`; the combination with a live link (signing refused with 410 on submit) was not exercised.
13. **`/api/pay/[token]`** (C-45): only the contract-value call site was read.
