# Contracts — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the contracts parity rounds (REG-629…635). For every 1.0 table, column and rule a contract touches it says
where the same thing lives in 2.0 and which round put it there, so a migration script and the code after it have one place to look. The
audit (`07-contracts-1.0-to-2.0-audit-2026-09-25.md`) holds the reasoning and the 31 calls (§6, §9); inventory D
(`contracts-1.0-inventory/D-data-model.md`) holds the column-level diff (§4) and the full port plan (§5, D-170…D-236). The quote editor's
map is `06-quote-editor-migration-map-2026-09-24.md`; the quote templates' `04-…`.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), rules live in `lib/contracts/`, every write is a server action with
`revalidatePath`. Money is in minor units; times are unix seconds. Ids keep 1.0's UUID strings; `*_by` becomes a `members.id`. **1.0 has
no contract record** (DEF-01): a signed signing request, a paper file flagged on the lead, an e-mailed composed PDF and a project's file each
stand in for one; 2.0 keeps one `contracts` row per document.
Rounds: **R1** the record holds (REG-631) · **R2** the quote and the entity (REG-632) · **R3** signing (REG-633) · **R4** lists, roles and
follow-through (REG-634) · **R5** this map (REG-635).

## 1. Tables and columns

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `quote_signature_requests`, signed or live, one document | `contracts` ×1 | classify first (D-211): *signed* = `signed_at` and `signature_data` set, whatever `status` reads (1.0 can flip a signed row to *expired*); *live* = pending / viewed and unexpired. Signed → `Signed`; live → `Sent to Client`; the rest not ported (D-190) | — |
| a request with two or more documents | `contract_bundles` ×1 + `contracts` ×n | the bundle's id = the request's; each document a contract with `bundle_id` and `bundle_position` = its index in `documents[]` (the order the client walked) | R3 |
| `documents[i].content_html` (already substituted) | `contracts.body` **and** `signed_body` | a ported body is resolved text; for a signed one it is also the kept copy (D-229) | R1 |
| the request's `documents[i].hash` · `document_hash` · `signing_hash` | `contracts.document_hash` · `contract_bundles.signing_hash` | same algorithm (B-26, B-29): SHA-256 over `"html\n{title}\n{body}"`, the set's over the hashes joined by `|` — `documentHashOf` · `setHashOf` in `lib/contracts/snapshot.ts`. The port recomputes and logs any difference (D-224) | R1 · R3 |
| `signature_data` (PNG data URL) | `contracts.signature_kind` · `signature_data` | 2.0 draws on the member's pad and stores an SVG path (752×140); a 1.0 PNG ports as `signature_kind 'draw'` with the image kept aside (Platform) — or as `'type'` when none | R3 |
| `signer_phone` · `signer_user_agent` · `signer_timezone` · `verification_method` | same names on `contracts` (+ `contract_bundles`) | 2.0 masks the phone ("+65 •••• 4567") and summarises the device ("Chrome on macOS"); `phone_otp` → `phone_code` | R3 |
| `document_acknowledgements[i].viewedAt` · `acceptedAt`; the first `link_opened` | `contracts.viewed_at` · `accepted_at` | viewed = the first open while out for signature; accepted = when the document's words were ticked | R3 |
| `documents[i].requires_scroll · requires_accept · accept_label` | same names on `contracts` and `contract_templates` | new ones start both on (1.0's library default); ported rows keep theirs | R3 |
| `client_name` (the name the studio typed) | `recipient_name`; the name the client typed → `signed_by` | 1.0 kept only the studio's; `signed_by` = `client_name` on port (D-02 note 3) | — |
| `client_phone` | `recipient_phone` | through `phoneDigits(...).slice(-8)` — never "the first eight digits" (D-49) | R1 |
| the request's `company_id` | `contracts.issuing_entity` (the entity's name; the studio's own = null) | printed through `contractIssuer` (`lib/contracts/issuer.ts`): the entity's name, logo, address, UEN, GST number; the address falls back to the studio's; a registration number never inherits | R2 |
| `selected_quote_id` / `quote_id` / `quote_ids[0]` | `contracts.from_quote_id` | set on every contract from creation (the lead's Signed quote, else its latest); read only by id, never swapped (`pickQuote`); a demoted 1.0 quote (not Signed) → null + log (D-216) | R2 |
| `leads.contract_uploaded` + `contract_file_name` (not the phantom `client-signed-quote.pdf`) | an uploaded `Signed` contract (`source 'uploaded'`, `file_name` = `signed_copy`) | D-220; 2.0's Won step does the same for a file uploaded there (`recordWonUpload`) | R2 |
| the composed contract e-mailed (`lead_files` + `contract_sent:` log) | optional: an uploaded contract at `Sent to Client` | the HTML was never stored (D-221) | — |
| `studio_document_templates` `contract` | `contract_templates` (+ `is_default` · the gates · `updated_by`) | tokens → chips (D-132); per-entity rows not ported (Q-29); one default at most | R2 · R3 · R4 |
| `studio_signing_documents` (rich text) | `contract_templates` with its gates | PDF documents held (Q-26) | R3 |
| `member_signatures` | `members.signature_*` | QE D-111; the studio signature a contract printed is frozen with it (`signed_studio_signature`) | R1 |
| 1.0 stored no sender / marker / deleter | `contracts.sent_by · marked_by · deleted_by` | the port stamps the covered quote's sender, else the lead's first member (D-216) | R4 |
| — | `lead_tasks.contract_id` | 2.0 only: Automation's follow-up and thank-you tasks | R4 |

## 2. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| A signed contract is read from its kept copy (text, letterhead, studio signature, fingerprint), never today's records | `signedSnapshot` / `snapshotColumns`; `ContractPaper letterhead`; every signing path | R1 |
| The client's page refuses a signature when the text changed while they read | `fingerprintOf` in `fetchSigning`; `signContractOnline` / `signBundleOnline` compare | R1 |
| A link signs only a contract at Sent to Client (or a live bundle); Draft → *Not ready yet*; archived, deleted or its lead deleted → *no longer active* | `linkState` (`lib/contracts/policy.ts`) | R1 |
| A client's online signature stays; a studio-marked one moves back only for Owners and Admins, clearing every signing stamp | `unsignBlock`, `applyContractStatus` (`lib/contracts/status.ts`), `UNSIGNED` | R1 |
| The contract's HTML keeps only the editor's markup, on save and at print | `sanitizeContractHtml` (`lib/contracts/sanitize.ts`), cap 4,000,000 characters (refused, never cut) | R1 |
| Send needs a document with a Client signature field and an 8-digit mobile | `contractReadiness` (client) · `sendBlock` + `isSgPhone` (server) | R4 |
| Delete · restore · delete forever: the creator, an Owner or an Admin | `canDeleteContract`; a template's delete forever also waits while live contracts name it | R4 |
| A signed contract signs its quote (REG-626); the quote prints the contract's signer | `signQuoteThrough`; `fetchQuoteContract` → `docDataFromRecords signer` | — · R2 |

## 3. What changes in the data on the way

- 1.0's six blanked tokens at signing (D-02 note 7) stay blank in a ported body; D-228 lists the documents to check.
- A 1.0 request flipped to *expired* after it was signed lands **Signed** (D-211) — 2.0 has no expiry (Q-28).
- 1.0's contract value, freeze, variation-order signing, project contract and portal signing wait for Finance, Projects and the portal
  (Q-31; D-199…D-201).
- The demo data needed no new records: R50…R53 brought the three signed contracts' kept copies, the quote and issuer links, the Won logs'
  file names and the actor stamps into line; `fixtures/baseline.json` was rebuilt after each round.

## 4. Still the platform's

Real one-time codes, stored PDFs (the executed quote, the packet), the drawn signature as an image, delivery by e-mail and SMS, and the
link's expiry — 2.0's stand-ins are named in the audit (CP-02, CA-02, CN-08, Q-27, Q-28).
