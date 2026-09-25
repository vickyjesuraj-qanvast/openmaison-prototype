# OpenMaison 1.0 → 2.0 — Contracts inventory · Slice D: the data model and the port plan

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` @ `67f42e469` (read only); 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` (working tree). Read on 2026-09-25.

What was read. **1.0:** both migration sets (`supabase/migrations/`, 102 files; `scripts/migrations/`, 381 files), `src/types/database.ts`, `src/types/app.ts`, `src/lib/transformers.ts`, and the code that writes or reads each table: `src/app/api/quotes/{request-signature,cancel-signature,resend-signature,signature-requests,signed-quote/[id],records/[id]}`, `src/app/api/sign/[token]/{route,request-otp,verify-otp,submit,download,packet,preview-pdf}`, `src/app/api/sign/certificate/[id]`, `src/app/api/contracts/{render-pdf,send-to-client}`, `src/app/api/signing-documents/{route,upload}`, `src/app/api/member-signatures/**`, `src/app/api/projects/[id]/contract/**`, `src/app/api/homeowner/engagement/[linkId]`, `src/lib/{audit-trail,homeowner-binding,sanitize-contract-html}.ts`, `src/lib/signing/*`, `src/lib/contracts/render-pdf.ts`, `src/lib/quote-canva/signed-quote-pdf.ts`, `src/lib/finance/{contract-value,contract-loader,vo-omission,milestone-schedule}.ts`, `src/lib/leads/resolve-contract-quote.ts`, `src/lib/lifecycle/{archival,transitions}.ts`, `src/components/leads/contract-flow-dialog.tsx`, `src/components/leads/signing/signing-document-picker.tsx`, `src/app/sign/[token]/page.tsx`, `src/app/my/engagement/[linkId]/page.tsx`, `scripts/finance/307_repair_signed_totals.sql`. **2.0:** `lib/db/schema.ts`, `drizzle/0007 · 0019 · 0026 · 0028 · 0029 · 0039 · 0040`, `lib/contracts/{tokens,model,agreement,queries}.ts`, `app/contracts/{actions,read-actions}.ts`, `app/company/contract-templates-actions.ts`, `app/leads/contracts-actions.ts`, `app/leads/{actions,quotes-actions}.ts` (the contract touchpoints), `app/quotes/actions.ts` (the quote stamps), `lib/leads/{contracts,contract-filters,activity,stage-data}.ts`, `lib/quotes/{sign,confirm,confirm-data}.ts`, `components/contracts/sign/*`, `components/leads/move-stage/panels.tsx`, `scripts/{repair-demo-data,seed-contracts}.ts`, `lib/db/baseline.ts`, `fixtures/baseline.json` (row counts and column values only; `takenAt` 2026-09-24T19:18:51Z). Nothing in either repo was modified except this file; no script, server or query was run; no `.env` was read; git was used only read-only in 2.0 (`git log --oneline -3`, `git status --porcelain` of this folder) and not at all in 1.0.

Builds on the three earlier slices — cited, not repeated: **leads D §n** = `../leads-1.0-inventory/D-data-model.md`; **templates D-nn** = `../quote-templates-1.0-inventory/D-data-model.md`; **QE D-nn** = `../quote-editor-1.0-inventory/D-data-model.md`. The two migration maps are cited as **map 04** (`../04-quote-templates-migration-map-2026-09-24.md`) and **map 06** (`../06-quote-editor-migration-map-2026-09-24.md`).

## 0. Conventions

- **Effective 1.0 schema = the union of both migration sets** (leads D §0.1, templates D §0, QE D §0), cross-checked against `DbQuoteSignatureRequest` and the routes. For signing the split is sharp. **Only in `supabase/migrations/`:** the evidence columns `document_hash · signing_hash · audit_trail · signer_phone · signer_timezone · verification_method` and the RPC `append_signature_audit_event` (`sb:20260406000001`), `client_selections` (`sb:20260414000005`), `quote_id` (`sb:20260415000001`), `prepared_by_display` (`sb:20260520000003`). **Only in `scripts/migrations/`:** `payment_schedule` (113), `signed_pdf_url` (119), `documents` (120), `company_id` (128), `quote_ids · signing_mode · selected_quote_id` (161), `signed_packet_path · document_acknowledgements` (246), the `quote_id` FK (104), the library (242), member signatures (267–269), the mirror RPC (202 → 244 → 254 → 303 → 307), the totals freeze (307), the OTP limiter (201), the buckets (119, 123, 210, 233, 268). `104` adds an FK to a column only `sb:20260415000001` creates, so production applied the supabase-only columns too.
- **Citations.** `NNN` or `NNN:lines` = `scripts/migrations/NNN_*.sql`; `sb:YYYYMMDDNNNNNN` = `supabase/migrations/…`; a bare `:lines` cites the file named last before it in the same cell or paragraph — in D-02's column table, a row that says *insert* cites `src/app/api/quotes/request-signature/route.ts` and a row that says *submit* cites `src/app/api/sign/[token]/submit/route.ts`. 1.0 paths start with `src/`; 2.0 paths start with `lib/`, `app/`, `components/`, `scripts/` or `drizzle/`.
- **Ids · time · money.** 1.0: `uuid DEFAULT gen_random_uuid()`, `timestamptz`, `quote_total NUMERIC(12,2)` **dollars**, payment-schedule `amountCents` **cents**, `quotes.*_cents` **cents**. 2.0: `text` ids written by the server action, `integer` unix **seconds** (`{ mode: 'timestamp' }`), money `integer` **cents** (`*_minor`), one studio (no `studio_id`), no RLS.
- **1.0 RLS end state.** `quote_signature_requests` sits in `226_lock_tenant_tables.sql`'s direct-scope loop (`:51`): FORCE RLS, a `scoped` policy on the JWT's `studio_id`, `anon` revoked, `service_role` bypasses. Every public signing route and the homeowner portal use `createServerSupabase()` (service role) and bypass it. `studio_signing_documents` (242:19-30) and `member_signatures` (267:26-34) create their own `scoped` policy. `otp_rate_limits` is excluded as platform (226:187). Stated once here.
- **Ids in this file.** D-01…D-18 = 1.0 tables and stores (§1); D-20…D-31 = 1.0 JSON shapes (§2); D-40…D-52 = 2.0 (§3); D-60…D-79 = table map (§4.1); D-80…D-139 = column diffs (§4.2); D-140…D-146 = statuses (§4.3); D-150…D-167 = enums and units (§4.4); D-170…D-236 = port plan (§5: 5.A D-170…D-172, 5.B D-175…D-189, 5.C D-190…D-205, 5.D D-210…D-229, 5.E D-230…D-236).
- **Verdicts** (§4): *same* · *rename* · *merge* · *split* · *missing in 2.0* · *2.0 only* · *derived* (2.0 computes it; no column) · *superseded* (2.0 does the job another way) · *Later* (Projects / Finance / portal) · *Platform* (tokens, OTP, stored objects, delivery — never a studio's data in the prototype) · *dead* (nothing reads or writes it).
- **Other citations.** *QE Q-nn* = the owner's calls in `../05-quote-editor-1.0-to-2.0-audit-2026-09-24.md` §6; *leads Q-nn* = `../01-leads-…` §9; *templates Q-nn* = `../03-quote-templates-…` §9; *REG-nnn* = `design-source/REGISTER.md`; *R-nn* = 2.0's repair rules in `scripts/repair-demo-data.ts`.

---

## 1. 1.0 — tables

### D-01 · Where a 1.0 "contract" lives — there is no contracts table

1.0 has no table named for contracts. A "contract" is one of six shapes, each stored somewhere else:

| Shape | What it is | Stored in | Written by |
|---|---|---|---|
| (a) The e-signed packet | A signing link on the lead: the quote plus T&C / contract / library documents, one drawn signature over all of them | `quote_signature_requests` (D-02); the executed PDF `signed-quotes/{id}.pdf` and the packet `signed-quotes/{id}-packet.pdf` (D-17) | `/api/quotes/request-signature` → `/api/sign/[token]/*` |
| (b) A composed contract, e-mailed | The Contract & Signing dialog's HTML editor, rendered to PDF and e-mailed; never signed on the platform | a `lead_files` row + `lead-files/{studio}/{lead}/contract-{ms}.pdf` + a `lead_activity_log` line `contract_sent:{file}` (D-12). **The HTML is not stored** | `/api/contracts/send-to-client` |
| (c) A composed contract sent for signature | The same HTML meant to become the packet's contract document | `quote_signature_requests.documents[]` — but only on the route's legacy path, which the dialog never takes (D-02 note 5) | `/api/quotes/request-signature` (`contractBodyHtml`) |
| (d) A paper contract at the lead | An already-signed PDF or Word file | a `lead_files` row (+ `contract_uploaded:{name}` log line) and `leads.contract_uploaded = true`, `leads.contract_file_name` (D-10) | the dialog's upload path → `useUploadLeadFile` + the lead drawer's save |
| (e) A project's contract | An uploaded file, or the e-signed PDF copied onto the project | `projects.contract_file_name · contract_file_url`, bucket `contract-files`, `project_files` rows with `folder = 'contract'` (D-11) | `/api/projects/[id]/contract`, `…/from-signature`, the submit route's auto-wire |
| (f) The contract's value | Which quote is "the contract", and its sum | derived — no column (D-18) | `src/lib/finance/contract-value.ts`, `contract-loader.ts`, `src/lib/leads/resolve-contract-quote.ts` |

The templates behind (a)–(c) are `studio_document_templates` rows `contract · tnc · signing_flow` (D-04) and the signing library `studio_signing_documents` (D-05).

### D-02 · `quote_signature_requests` — the signing request, the contract side

QE D-06 owns the quote side (the gate on quote statuses, the quote and lead mirrors, the portal share) and templates D-11 lists the DDL once; leads D §1.2 has the column table. This entry adds who writes each column, the contract-side rules, and what the stored values really are.

**DDL history:** `042:5-28` ≡ `sb:20240302000001:5-28` (create + `leads.signature_request_id`) → `sb:20260406000001:4-10` → `sb:20260414000005:21-22` → `sb:20260415000001:30` → `104:24-29, 54-58` (backfill + FK) → `113:12-13` → `119:11-12` → `120:19-20` → `128:80-84` → `161:21-37` → `246:6-8` → `sb:20260520000003:11-12`.

**Columns** (34):

| # | Column | Type | Null / default | Written by (1.0) | Notes |
|---|---|---|---|---|---|
| 1 | `id` | uuid | PK, `gen_random_uuid()` | insert | |
| 2 | `lead_id` | uuid | NOT NULL → `leads` CASCADE | insert | index `idx_qsr_lead` |
| 3 | `studio_id` | uuid | NOT NULL → `studios` CASCADE | insert | the RLS key |
| 4 | `token` | text | NOT NULL, UNIQUE | insert: `randomUUID()` (`request-signature/route.ts:357`) | the public URL `/sign/{token}`; `idx_qsr_token` duplicates the UNIQUE index; Resend reuses it (`resend-signature/route.ts:112`) |
| 5 | `status` | text | NOT NULL, default `'pending'`, **no CHECK** | insert `pending`; GET → `viewed` (`sign/[token]/route.ts:68-73`) and → `expired` (`sign/[token]/route.ts:37-46`); submit → `signed` (`submit/route.ts:270-298`); `cancelled` by cancel-signature (`cancel-signature/route.ts:82-83`), by request-signature for every open request of the lead (`request-signature/route.ts:684-708`) and by the quote delete (`quotes/records/[id]/route.ts:294-307`) | D-140; note 2 |
| 6 | `client_name` | text | NOT NULL | insert (the dialog's recipient, trimmed) | the addressee; the signer's typed name is not stored (note 3) |
| 7 | `client_phone` | text | null | insert: `"{country code} {local}"` as typed (`contract-flow-dialog.tsx:531`) | request-otp refuses a phone whose local digits differ (`request-otp/route.ts:86-97`) |
| 8 | `quote_snapshot` | jsonb | NOT NULL | insert | D-20 |
| 9 | `quote_total` | numeric(12,2) | null | insert: Σ `quotes.total_cents / 100` of the covered quotes when every one is > 0, else the line sum (`request-signature/route.ts:346-354`) | **dollars**; for several quotes it is their sum (`scripts/finance/307_repair_signed_totals.sql:9-31`) |
| 10 | `studio_name` | text | null | insert: `studios.name` | the studio, not the issuing entity |
| 11 | `expires_at` | timestamptz | NOT NULL | insert: now + 7 days (`:358`) | `settings.quoteLinkExpiryDays` is not read (QE D-21) |
| 12 | `signed_at` | timestamptz | null | submit (`:271`) | |
| 13 | `signature_data` | text | null | submit | a `data:image/png` or `data:image/jpeg` base64 URL, at most 1,000,000 characters (`submit/route.ts:53-59`); D-29 |
| 14 | `signer_ip` | text | null | submit: first `x-forwarded-for` hop, else `x-real-ip`, else `'unknown'` (`src/lib/audit-trail.ts:71-77`) | |
| 15 | `signer_user_agent` | text | null | submit | |
| 16 | `created_at` | timestamptz | NOT NULL, `now()` | default | the table has **no `updated_at`** |
| 17 | `document_hash` | text | null | insert: SHA-256 hex of the snapshot (`:396`) | D-25 |
| 18 | `signing_hash` | text | null | submit (`:166-168, 252-261, 276`) | D-25 |
| 19 | `audit_trail` | jsonb | default `'[]'` (nullable) | insert `[link_created]`; appends by the RPC (D-03) and by read-modify-write on cancel | D-23 |
| 20 | `signer_phone` | text | null | verify-otp: E.164 (`verify-otp/route.ts:118-122`); submit: the same, or the portal session's phone (`submit/route.ts:112-138, 282`) | proof of phone control |
| 21 | `signer_timezone` | text | null | submit: the browser's IANA zone (`src/app/sign/[token]/page.tsx:738`; `src/app/my/engagement/[linkId]/page.tsx:306`) | |
| 22 | `verification_method` | text | default `'phone_otp'` | **never written** (grep) | a portal signing (no OTP) also reads `phone_otp` |
| 23 | `client_selections` | jsonb | null | **never written** (grep; QE D-04) | dead (D-26) |
| 24 | `quote_id` | uuid | null → `quotes` **ON DELETE RESTRICT** (104) | insert: the primary quote (`:716`); set NULL by the quote delete's cancel (`quotes/records/[id]/route.ts:298`) | "mirrors `quote_ids[0]` / `selected_quote_id`" (`database.ts:1837`) |
| 25 | `payment_schedule` | jsonb | null | insert (`:398-476`) | D-24 |
| 26 | `signed_pdf_url` | text | null | after submit: `renderAndStoreSignedQuotePdf` (`src/lib/quote-canva/signed-quote-pdf.ts:94-116`) | a `getPublicUrl` URL of a bucket made private by 233 — readers re-sign it (D-17) |
| 27 | `documents` | jsonb | NOT NULL, `'[]'` | insert (`:519-630`) | D-21 |
| 28 | `company_id` | uuid | null → `studio_companies` SET NULL; partial index `WHERE company_id IS NOT NULL` | insert (`:637-670`); `POST /api/quotes/signature-requests` op `migrate-company` rewrites **every** request of the lead, signed ones included (`signature-requests/route.ts:185-190`) | the issuing entity |
| 29 | `quote_ids` | uuid[] | NOT NULL, `'{}'`; GIN `idx_qsr_quote_ids` | insert (`:717`); emptied by the quote delete's cancel (`quotes/records/[id]/route.ts:299`) | backfilled from `quote_id` (161:29-32) |
| 30 | `signing_mode` | text | NOT NULL, `'single'`, CHECK `single · bundle · variations` | insert (`:718`) | the dialog pins `single` (`contract-flow-dialog.tsx:99`, `MULTI_QUOTE_SIGNING_ENABLED = false`) |
| 31 | `selected_quote_id` | uuid | null → `quotes` SET NULL | submit, `variations` only (`:284-286`) | |
| 32 | `signed_packet_path` | text | null | `buildSignedPacket` after submit: `{id}-packet.pdf` (`src/lib/signing/build-signed-packet.ts:248-265`) | only for requests with `documents` |
| 33 | `document_acknowledgements` | jsonb | NOT NULL, `'[]'` | submit, when the page sends them (`:288-291`) | D-22 |
| 34 | `prepared_by_display` | text | null | insert (`:735`) | **never read** (grep) — QE D-226 |

**Keys.** PK `id`; UNIQUE `token`; FKs `lead_id` CASCADE, `studio_id` CASCADE, `quote_id` RESTRICT, `selected_quote_id` SET NULL, `company_id` SET NULL; reverse FK `leads.signature_request_id → quote_signature_requests(id)` with no ON DELETE clause, i.e. NO ACTION (042:28). **Indexes:** `idx_qsr_lead (lead_id)`, `idx_qsr_token (token)`, `idx_quote_signature_requests_company (company_id) WHERE company_id IS NOT NULL`, `idx_qsr_quote_ids GIN (quote_ids)`. **Triggers:** none on this table. **RLS:** 226:51.

**Written by:** `request-signature` (insert; cancels the open ones), `sign/[token]` GET (`viewed`, `expired`, `link_opened`), `request-otp` (`otp_requested`), `verify-otp` (`signer_phone`, `otp_verified`), `submit` (the signature, the evidence, `signed`), `renderAndStoreSignedQuotePdf` (`signed_pdf_url`), `buildSignedPacket` (`signed_packet_path`), `cancel-signature`, the quote delete (`quotes/records/[id]`), `signature-requests` POST (`company_id`), the RPC `append_signature_audit_event`.

**Read by:** the public routes `sign/[token]` (GET, `download`, `packet`, `preview-pdf`, `verify-otp`, `submit`), `sign/certificate/[id]` (studio, owner/admin see the audit trail, IP and user agent: `route.ts:47-82`), `quotes/signature-requests` GET (latest + `content_drifted`, `:52-111`), `resend-signature`, `quotes/signed-quote/[id]`, `leads/[id]/quote/download`, `projects/[id]/contract/{list,download,from-signature}`, `homeowner/engagement/[linkId]` (+ `/document`), `homeowner/projects/[id]/documents`, `src/lib/lifecycle/transitions.ts:71-96` (archive blockers: live links), `cron/usage-rollup/route.ts:88` (monthly count), `src/lib/quote-download.ts`, `src/lib/quote-canva/render-quote-pdf-server.ts`, `src/components/leads/drawer-sections/multi-quote-section.tsx`.

**Types.** `DbQuoteSignatureRequest` (`database.ts:1815-1862`) — the status comment omits `cancelled`, and `prepared_by_display` is missing. `QuoteSignatureRequest` (`app.ts:1747-1786`) — status union `pending · viewed · signed · expired`. The transformer (`transformers.ts:1937-1972`) drops `studio_id`, `signer_ip`, `signer_user_agent`, `client_selections`, `documents`, `signed_packet_path`, `document_acknowledgements`, `prepared_by_display`.

**Notes — the rules the data carries:**

1. **One live request per lead.** Every `pending` / `viewed` request of the lead is set `cancelled` before the insert, with audit event `cancelled_for_regenerate` or `cancelled_superseded` (`request-signature/route.ts:684-708`). A lead therefore holds any number of dead requests and at most one live one.
2. **`status` is not a reliable "signed" flag.** The GET route rewrites *any* status to `expired` when the link is opened after `expires_at` (`sign/[token]/route.ts:37-46`: the only guard is `status !== 'expired'`), so a signed or cancelled request opened after its seventh day reads `expired`. `signed_at IS NOT NULL AND signature_data IS NOT NULL` is the reliable test. The backfills of 262 (`leads.signed_at`) and 307 (`quotes.signed_at`), the client's download (`sign/[token]/download/route.ts:41-43`), the project contract list (`projects/[id]/contract/list/route.ts:106-113`) and the portal's documents route (`homeowner/projects/[id]/documents/route.ts:86-91`) all test `status = 'signed'`.
3. **The signer's typed name is not stored.** Submit requires `signerName` (`submit/route.ts:46-48`) and uses it only in the executed PDF (`:616-640`) and the e-mail; no column holds it. `client_name` is who the studio addressed.
4. **The sender is not stored.** There is no `created_by`; `link_created` has no actor (`request-signature/route.ts:730`). The cancel events carry `actor_user_id` (`cancel-signature/route.ts:79`; `request-signature/route.ts:700`).
5. **Which documents a request carries depends on the path.** The dialog always sends `documents` — at least the quote document it seeds (`contract-flow-dialog.tsx:171-182, 558`) — so the route takes its *picker* path (`request-signature/route.ts:533-564`): the studio's default `tnc` and `contract` templates are **not** added, and `contractBodyHtml` (the composed contract) is **ignored**. Only the dialog's "Regenerate link" call sends no `documents` (`contract-flow-dialog.tsx:1888-1906`) and takes the legacy path (`:565-630`): quote → the default T&C → the composed contract, else the default contract. Rows whose `documents[]` hold `type 'tnc'` or `'contract'` therefore come from Regenerate or from before the picker shipped.
6. **The default-template lookup ignores the entity.** The legacy path reads `type = 'tnc' / 'contract' AND is_default AND is_active` with `.maybeSingle()` and no `company_id` filter (`:484-501`); 166 allows one default per (studio, entity, type), so a studio with an entity-scoped default gets several rows and no document (read from the code, not executed).
7. **Merge fields at signing are five.** `client_name · studio_name · quote_total · current_date · start_date` (`:504-510`; `start_date` = today, not the lead's key-collection date the editor preview uses); any other `{{token}}` becomes an empty string (`src/lib/notifications/templates/substitute.ts:18-27`). D-28.
8. **Tamper guard.** Submit answers 409 when the recomputed snapshot hash differs from `document_hash`, or when an acknowledgement names an unknown document or a different hash (`submit/route.ts:166-252`), and appends `signature_refused_hash_mismatch`.
9. **Proof of phone.** Submit needs `signer_phone` (set only by a successful OTP to the request's own `client_phone`) or a homeowner portal session linked to the lead (`:112-138`).
10. **Archived leads.** The GET and the submit answer 410 while the lead is archived (`sign/[token]/route.ts:62-65`; `submit/route.ts:91-94`); archiving itself does not touch the request (`src/lib/lifecycle/transitions.ts:71-96` only warns).
11. **Resend keeps the token** and refuses (`snapshot_diverged`) when the current line sum differs from `quote_total` by more than 0.5 (`resend-signature/route.ts:73-107`).
12. **Variation orders sign here too.** A `quote_type = 'variation'` quote goes through the same route; the mirror then leaves the lead alone (D-03).

### D-03 · Functions and triggers that signing runs

| Object | Migration | What it does | Called by |
|---|---|---|---|
| `append_signature_audit_event(p_id uuid, p_event jsonb) RETURNS void` | `sb:20260406000001:13-22` | `audit_trail = COALESCE(audit_trail, '[]') \|\| p_event`; plain plpgsql (not SECURITY DEFINER) | `appendAuditEvent` (`src/lib/audit-trail.ts:35-66`; falls back to read-modify-write on `42883`) |
| `finalize_signed_mirror(p_lead_id uuid, p_studio_id uuid, p_quotes_to_mark uuid[])` SECURITY DEFINER | v1 `202:15-51` → v2 `244:28-87` (a variation-only signing leaves the lead alone; other signed **base** quotes are demoted, never variations) → v3 `254` (the bucket that owns `SIGNED` in `studio_lead_funnel.config`, else `CLOSED`; skip when the funnel has none) → v4 `303` (an empty or unresolvable set is a base signing) → v5 `307:54-143` (+ `quotes.signed_at = COALESCE(signed_at, now())`; `SET search_path = public, pg_temp`) | the lead mirror (`quote_status 'client_signed'`, `contract_uploaded true`, `contract_file_name 'client-signed-quote.pdf'`), the stage advance (never past `PROJECT_STARTED`), the quote marks and demotions | `submit/route.ts:356-360`, with a TypeScript fallback when the RPC errors (`:361-535`). QE D-06, leads D §1.3 |
| `finance_trg_quote_totals_frozen()` + trigger `trg_quote_totals_frozen` `BEFORE UPDATE OF total_cents, subtotal_cents, tax_cents, discount_cents ON quotes` | `307:146-172` | raises `QUOTE_TOTAL_FROZEN` (check_violation) when the quote is `client_signed` or `sent_for_signature`, or is an `approved` variation; bypassed by `set_config('finance.allow_signed_total_write','on',true)` | every totals write |
| Template RPC refusal | `185:25, 85`; `191:41, 136` | the apply / create-from-quote template RPCs refuse while `leads.quote_status IN ('client_signed','sent_for_signature')` | the template pickers |
| `check_otp_rate_limit(p_key text, p_window_ms int, p_max int) RETURNS boolean` SECURITY DEFINER; `prune_otp_rate_limits()` | `201:24-62` | D-15 | request-otp, verify-otp |

### D-04 · `studio_document_templates` — the `contract` · `tnc` · `signing_flow` rows

**Columns:** templates D-01 (117 → 166 → 197; `body_html` holds the `tnc` / `contract` body, `variables` is an informational JSON map, `config` is type-specific). What contracts add:

- **Seeds** (`118:22-43`, once per studio existing when 118 ran — later studios are not auto-seeded, `118:7-9`): `Default Terms & Conditions` (`variables` client_name · studio_name · quote_total · current_date), `Default Contract` (… + start_date · company_registration · company_address), `Default Signing Flow` (`config {"docOrder":["quote","tnc","contract"]}`). The two bodies are D-28's tokens in plain HTML.
- **Written by** Accounts › Document Templates (templates D-01) and the dialog's *Save as template*, which inserts `type 'contract'`, `is_default false`, `name`, `body_html` = the editor's HTML with its `{{tokens}}` (`contract-flow-dialog.tsx:483-490`).
- **Read by** the request route's legacy path (the default active `tnc` and `contract`, D-02 notes 5–6) and the dialog, which lists the `contract` rows (`useDocumentTemplates(undefined, "contract")`, `:122`) and loads a row's `body_html` raw, tokens kept (`:353-368`).
- **`signing_flow.config.docOrder` has no reader** (grep: only a comment in `src/lib/queries/document-templates.ts:8`); the legacy path hard-codes quote → T&C → contract. Dead.
- Where they go in 2.0: `tnc` → templates D-167 (`quote_text_templates`, `kind 'terms'`); `contract` → templates D-52 (`contract_templates`) with the token mapping of D-132 below.

### D-05 · `studio_signing_documents` — the signing library

**Columns** (`242:2-16`): `id uuid PK`; `studio_id uuid NOT NULL → studios CASCADE`; `company_id uuid NULL → studio_companies SET NULL`; `kind text NOT NULL CHECK (kind IN ('pdf_upload','rich_text'))`; `title text NOT NULL`; `file_path text NULL`; `body_html text NULL`; `requires_scroll boolean NOT NULL DEFAULT true`; `requires_accept boolean NOT NULL DEFAULT true`; `accept_label text NOT NULL DEFAULT 'I have read and agree to this document'`; `is_active boolean NOT NULL DEFAULT true`; `created_at · updated_at timestamptz NOT NULL DEFAULT now()`. **Index** `idx_signing_docs_studio (studio_id, is_active)`. **RLS** its own `scoped` policy (`242:19-30`). No `updated_at` trigger (PATCH sets it, `signing-documents/route.ts:71`).

**Written by:** `POST /api/signing-documents` (rich text only; `route.ts:26-54`), `PATCH` (`title · body_html · requires_scroll · requires_accept · accept_label`; `kind`, `company_id`, `file_path` never change; `:56-88`), `DELETE` = `is_active false` (`:90-113`), `POST /api/signing-documents/upload` (PDF only, ≤ 5 MB, object `{studioId}/{uuid}.pdf` in bucket `signing-documents`, `kind 'pdf_upload'`, title = the form's title or the file name without `.pdf`; removes the object when the insert fails; `upload/route.ts:9-66`), the picker's *Save to library* (`signing-document-picker.tsx:198-214`).

**Read by:** `GET /api/signing-documents` (active rows, newest first; with `companyId`, the entity's rows plus the studio-wide ones; `route.ts:6-24`) → the dialog's picker, which **copies** a row into a request's `documents[]` as `type 'document'`, `render 'pdf'` or `'html'`, `source_library_id` = the row id (`signing-document-picker.tsx:61-76`). A sent request keeps its copy; a PDF shares the library's `file_path` (the object is not copied, and a soft-deleted row keeps its object).

**Types** `DbStudioSigningDocument` (`database.ts:3068-3082`), `SigningLibraryDocument` (`app.ts`, after `MemberSignature`); transformer `transformers.ts:3337-3352`. **Seeds:** none. Verdict: templates D-67 (Later).

### D-06 · `member_signatures` and the quote's frozen signature

**Columns:** QE D-19 (`267:4-34`; private bucket `member-signatures`, 268). What contracts add:

- **Writers:** `POST /api/member-signatures/records` deactivates the member's active row and inserts a new one, carrying `auto_apply` and `consent_at` over (`records/route.ts:64-104`); `PATCH` toggles `auto_apply` and stamps or clears `consent_at` (`:118-126`); `DELETE records/[id]` deactivates the caller's own row (`[id]/route.ts:13-17`). Objects at `{studio_id}/{member_user_id}/{uuid}.{ext}` (`database.ts:2967-2970`).
- **What reaches an executed contract.** The signing documents carry no studio signature field: the packet renders an HTML document as `sanitizeContractHtml(content_html)` alone (`build-signed-packet.ts:270-273`). The only studio signature on an executed 1.0 contract is the quote's `quotes.prepared_by_signature` (`269:6`; `DbPreparedBySignature {memberUserId, storagePath, sha256, signerName, role, appliedAt, appliedByUserId}`, `database.ts:705-713`), baked at approval when the author opted in (QE D-19) and printed by the quote PDF's signature footer.

### D-07 · `quotes` — the contract-side columns

QE D-01 lists every column. The ones signing reads or writes:

| Column | Type / default | Migration | Role in contracts |
|---|---|---|---|
| `status` = `sent_for_signature` · `client_signed` | enum `quote_status` | 102 | set by request-signature, `finalize_signed_mirror`, cancel-signature (QE D-06) |
| `signed_at` | timestamptz null | `307:16`; backfill `307:19-44` (from requests with `status = 'signed'`, then the lead's `signed_at`) | stamped once by the mirror v5 (`COALESCE(signed_at, now())`) and by the submit fallback (`submit/route.ts:493-494`); the tiebreak for "the latest signed quote" (D-18) |
| `prepared_by_signature` | jsonb null | `269:6` | D-06 |
| `submitted_by` | uuid null | `269:5` | the author stamped at submit |
| `quote_type` = `'variation'`, `is_omission` | text; boolean NOT NULL false | 213 (derived from the lines since 245) | a VO; the mirror leaves the lead alone (D-03) |
| `total_cents · subtotal_cents · tax_cents · discount_cents` | bigint cents | sb:20260415000001 | frozen by `trg_quote_totals_frozen` (D-03) |
| `is_primary` | boolean | sb:20260415000001 | the contract value's second rung (D-18) |

A quote named by a request's `quote_id` cannot be deleted (FK RESTRICT); the delete route first cancels every **unsigned** request that covers it and answers 409 `SIGNATURE_EXISTS` when a signed one remains (`quotes/records/[id]/route.ts:272-318`).

### D-08 · `quote_line_items.is_omission` and the "Omit from contract" copy

`245:7-8`: `is_omission boolean NOT NULL DEFAULT false` — the line is a credit (a positive amount the math subtracts). The variation-order editor's *Omit from contract* lists the base contract quote's lines (`quotes/records/[id]/vo-editor-context/route.ts:60-70`, `baseQuoteId` from `resolveVoBaseFacts`) and copies each picked line into the VO as a **new** line (`contractLineToOmission`, `src/lib/finance/vo-omission.ts:16-37`: fresh id, `isOmission true`, the amount fields copied, comments / AI / source / quote id / creator dropped). **No link is stored** between the credit and the contract line: "already omitted" matches name + description + category + unit price (`:48-58`). Verdict: Later (QE D-210).

### D-09 · `variation_orders` — the links to the contract (Finance)

`214:24-38`: `quote_id uuid → quotes ON DELETE SET NULL` (the bridged VO's source quote), `invoice_id uuid → project_invoices ON DELETE SET NULL`, `invoiced_at timestamptz`; index `idx_variation_orders_quote_id`; partial unique `uq_variation_orders_project_quote (project_id, quote_id) WHERE quote_id IS NOT NULL`; backfills by `vo_number = quote_number` (`:46-53`) and of `subtotal_cents / gst_cents` (`:59-66`). `company_id` (`128:48-52`). `cost_change_cents` (incl. GST, incl. discount; omissions negative), `vo_direction` and `status 'approved'` feed the contract value (D-18). 244 (B) and 251 repair the stored splits and the bridge. Verdict: Later.

### D-10 · `leads` — the contract mirror

leads D §1.2 has the column table. The contract columns:

| Column | Type | Migration | Written by | Read by |
|---|---|---|---|---|
| `contract_uploaded` | boolean NOT NULL false | `017:40` | the mirror (true); the lead PATCH allow-list (`leads/mutations/[id]/route.ts:54`) from the drawer's save after a paper upload (`lead-detail-drawer.tsx:3329-3335`; `src/lib/queries/leads.ts:475`); lead capture writes false (`webhooks/leads/[token]/route.ts:218`, `cron/poll-emails/route.ts:323`) | the drawer's SIGNED gate (`src/lib/leads/drawer-autosave.ts:71-91`), the journey's contract step (`src/lib/leads/journey.ts:356`: `contractUploaded` or `signatureRequestId`), the quote summary card |
| `contract_file_name` | text | `017:41` | the mirror (`'client-signed-quote.pdf'`); the drawer (the paper file's name, `leads.ts:476`) | the project list's lead-file match; copied to `projects.contract_file_name` at project create (`projects/records/route.ts:292`) |
| `signature_request_id` | uuid → `quote_signature_requests` | `042:28` | request-signature (`:770-785`, retried once); cleared by cancel-signature (`:110-116`) — **not** by the quote delete's cancel, **not** by signing | the drawer, the journey |
| `signed_at` | timestamptz, write-once | `262:9` | `src/lib/leads/tat-stamps.ts:53` (e-sign or the first move to SIGNED); backfill `262:33-46` | the TAT report |
| `quote_status`, `journey_overrides.contract / .signed` | | QE D-08; 178 | | leads D §1.1 |

### D-11 · `projects` and `project_files` — the project's contract (Later)

- `projects.contract_file_name text` (`017:20`) and `projects.contract_file_url text` (`140:13-14`: a `getPublicUrl` URL in `contract-files`; private since 233, so the download route re-signs it, `projects/[id]/contract/download/route.ts:85-96`; `DbProject` says "Migration 111", `database.ts:287` — the column is 140's).
- **Written by** `POST /api/projects/[id]/contract` (upload to `{studio}/{project}/{uuid}.{ext}`, sets both; `route.ts:70-88`), `…/from-signature` (renders the signed request to `{studio}/{project}/signed-contract.pdf`, upsert; `:107-125`), the submit route's auto-wire for the lead's projects with `contract_file_name IS NULL` (name `signed-contract-{client_name}.pdf`; `submit/route.ts:653-687`), project create (copies the lead's `contract_file_name`, `projects/records/route.ts:292`) and clone (`clone/route.ts:81`).
- `project_files.folder = 'contract'` (`148:13` renamed `category → folder`; index `(project_id, folder)`, `148:21`).
- **Read by** the list route in priority order — `project_files` in the contract folder → the lead's `lead_files` row by name → `contract_file_url` unless it points at `signed-quotes` → every signed request (`list/route.ts:1-15, 42-125`) — and the download route (`file:` · `lead-file:` · `legacy-url:` · `signed-quote:`), and the portal's documents route.

### D-12 · `lead_files` and `lead_activity_log` — composed and paper contracts

leads D §1.2 has both tables. The contract rows:

- **A composed contract, e-mailed** (`contracts/send-to-client/route.ts`): renders the editor's HTML server-side with eleven variables resolved from the lead, the lead's entity and the primary quote — a missing value prints `[Label — hint]` (`:83-102`); uploads `lead-files/{studio}/{lead}/contract-{Date.now()}.pdf` (`:122-126`); inserts `lead_files` with `file_name 'Contract — {lead slug} — {yyyy-mm-dd}.pdf'`, `file_url` = the **storage path**, `file_size`, `mime_type 'application/pdf'`, `uploaded_by` (`:120-147`; a failed insert is logged and the send goes on); mints a 7-day download URL (`:161-163`); inserts `lead_activity_log.action = 'contract_sent:{file_name}'` (`:170-176`); dispatches `contract.composed_sent` (D-14). Needs an e-mail on the lead (`:63-68`). The HTML itself is not kept.
- **Download only** (`contracts/render-pdf/route.ts`): the same render (`:113-125`), no write.
- **A paper upload** (the dialog's `handleUploadDone`, `contract-flow-dialog.tsx:334-350`): `useUploadLeadFile` writes the object, the `lead_files` row and the activity line `contract_uploaded:{name}` when the file name contains "contract", else `file_uploaded:{name}` (`src/lib/queries/leads.ts:1660-1700`); the drawer then saves D-10's two columns.

### D-13 · Portal signing — `homeowner_project_links`, `homeowner_notifications`

leads D §1.2 has the homeowner tables. The signing touchpoints:

- The lead-stage portal page `/my/engagement/[linkId]` reads the lead's latest request (`token · status · signed_at · signed_pdf_url · quote_total · documents · expires_at · created_at`, `homeowner/engagement/[linkId]/route.ts:147-160`) and shows its non-quote documents. Its wizard posts to the same `/api/sign/{token}/submit` **without an OTP and without acknowledgements** (`src/app/my/engagement/[linkId]/page.tsx:300-308`); submit accepts it when an active `homeowner_project_links` row ties the session's homeowner to the lead and records the session's phone as `signer_phone` (`submit/route.ts:112-138`).
- `homeowner_notifications` (206 made `project_id` nullable, added `lead_id → leads CASCADE`, CHECK project or lead): `signature_requested` per active link (`src/lib/homeowner-binding.ts:544-573`; `entity_type 'signature_request'`, `entity_id` = the request, `action_url /my/engagement/{linkId}`) and `contract_signed` per link that has a project (`submit/route.ts:744-768`; `entity_type 'quote'`, `entity_id NULL`, `action_url '?tab=documents'`).

### D-14 · `notifications` and `notification_templates` — the signing events

QE D-22 lists the rows. The catalogue entries (`src/lib/notifications/events.ts:199-235`):

| Event | Category · critical | Default recipients | External | Variables | Dispatched by |
|---|---|---|---|---|---|
| `quote.signature_requested` | quotes · yes | owner, admin | functional (always to the client) | client_name · studio_name · quote_number · quote_total · signing_link · action_url | request-signature (`:1003-1018`), resend (`resend-signature/route.ts:127-147`) |
| `quote.signed_by_client` | quotes · yes | owner, admin | informational | recipient_name · lead_name · quote_number (synthetic `Q-{first 8 of the request id}`, `submit/route.ts:708`) · action_url · signed_pdf_url · signed_quote_url · client_name · quote_total · studio_name · sender_display_name | submit (`:711-736`) |
| `contract.composed_sent` | quotes · no | owner, admin | functional | client_name · studio_name · download_link · current_date · action_url | send-to-client (`:181-198`) |

Seeded template: `quote.signature_requested` e-mail and text (`sb:20260314000001:101-105`, "This link expires in 7 days"). `usage_events` rows `quote_sent` / `quote_signed` (`src/lib/usage/track.ts:23`; request-signature `:1030`, submit `:773`) are Platform.

### D-15 · `otp_rate_limits` and `platform_config.bypass_otp` (Platform)

`otp_rate_limits (bucket_key text PRIMARY KEY, hits timestamptz[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now())` (`201:15-19`). Signing keys: `sign-otp-req:{token}` (6 per 10 min) and `sign-otp-verify:{token}` (10 per 5 min) (`request-otp/route.ts:40-43`; `verify-otp/route.ts:46-49`), behind in-memory per-IP caps (3 per 60 s; 5 per 5 min). The quote share link uses the same table (QE D-21). The code itself is Twilio Verify (`src/lib/twilio.ts:37, 153`): **no OTP is stored**. A super-admin bypass code sits in `platform_config` key `bypass_otp` `{code, set_at}`, honoured for 72 hours (`src/lib/bypass-otp.ts:1-40`).

### D-16 · Settings and flags signing reads

| Store · key | Shape / default | Read by |
|---|---|---|
| `studios.settings.workflow.contractRequired` | boolean, default true (090 seed; `DEFAULT_WORKFLOW`, `src/lib/queries/studio-config.ts:70`) | the drawer's SIGNED gate (`drawer-autosave.ts:86`; `lead-detail-drawer.tsx:2476-2531`) |
| `studio_lead_funnel.config.buckets[].statuses[].requiresContract` | boolean; on the default funnel only `SIGNED` is true (`090:199`) | the same gate; the mirror moves the lead to the bucket that owns `SIGNED` (D-03) |
| `studios.settings.features.casetrust_signing_step` | boolean (`database.ts:894`) | the signing page and the portal show the CaseTrust disclosure when on and the region supports it (`engagement/[linkId]/page.tsx:270`); the client's tick is stored only as the audit event `casetrust_acknowledged` (`submit/route.ts:322-329`) |
| `studios.settings.branding.quotePreparedByMode` | `team_list` (default) · `studio_only` · `first_assignee` | `prepared_by_display` (D-02 #34) |
| `studios.settings.quoteLinkExpiryDays` | 7 · 14 · 30 · 60 · 90 | **not read** — `expires_at` is 7 days fixed (QE D-21) |
| `studios.settings.features.lock_quote_actions_until_approved` | boolean | request-signature answers 403 below approval (`:236-250`; QE D-06) |
| `studios.settings.branding.{logoUrl, primaryColor}` | | the packet's certificate header (`build-signed-packet.ts:50-78`) |

### D-17 · Storage buckets and object paths

| Bucket | Created · visibility | Objects | Written by | Read by |
|---|---|---|---|---|
| `signed-quotes` | `119:21-23` (10 MB, PDF only) → `123:47-55` policies → private since `233:27-31` (`234` is the emergency rollback) | `{requestId}.pdf` — the executed quote PDF with the signature stamped in (`signed-quote-pdf.ts:14-15, 51, 94-116`); `{requestId}-packet.pdf` — the audit certificate then every document in stored order (`build-signed-packet.ts:1-12, 248-265`) | submit's background job | `sign/[token]/download` · `packet`, `quotes/signed-quote/[id]` (re-signs on click), the project list / download, the portal |
| `signing-documents` | **no migration creates it**; the test `src/__tests__/scoped-client-storage-guard.test.ts:11-35` describes it and its `authenticated` INSERT / SELECT policies (scoped by `foldername(name)[1] = studio_id`) as existing in prod | `{studioId}/{uuid}.pdf` (library PDFs) | `signing-documents/upload` | `attachSignedPdfUrls` (1-hour URLs, never persisted; `src/lib/signing/sign-pdf-urls.ts:13-29`), the packet builder (`build-signed-packet.ts:256-262`) |
| `contract-files` | `210:30-47` (public, no caps) → private since 233 | `{studio}/{project}/{uuid}.{ext}`, `{studio}/{project}/signed-contract.pdf` | the project contract routes, submit's auto-wire | the project download (re-sign), the portal |
| `lead-files` | leads D §1.4 → private since 233 | `{studio}/{lead}/contract-{ms}.pdf`; paper uploads | send-to-client, `useUploadLeadFile` | the lead's files, the project download (`lead-file:`) |
| `member-signatures` | `268:7-9`, private | `{studio}/{member}/{uuid}.{ext}` | the member-signature routes | server-side signed URLs |
| `shared-quotes` | QE D-20, public | `{studio}/{quoteId}.pdf` | request-signature renders each covered quote (`:827-980`) | the signing page's inline PDF after the OTP (`verify-otp/route.ts:153-157`) |

`signed_pdf_url` and `projects.contract_file_url` store `getPublicUrl` URLs of buckets that are private since 233; every reader re-signs the path.

### D-18 · The contract's value — derived, no column (Later)

- `resolveContractValueCents` (`src/lib/finance/contract-value.ts:67-113`): the base is the latest `client_signed` non-variation quote with `total_cents > 0`, ordered by `signed_at` (else `updated_at`); else the primary quote in `sent_for_signature · approved`; else `projects.budget_total` (dollars × 100); else 0. Plus Σ approved client VOs' `cost_change_cents` (incl. GST; omissions negative), floored at 0.
- `resolveProjectContract` (`src/lib/finance/contract-loader.ts`) reads the quotes by lead **or** project, the approved VOs (`isClientVoDirection`: `null · client · client_positive`) and the lead's `quote_metadata.gstEnabled` for the GST fraction.
- `resolveContractQuoteId` (`src/lib/leads/resolve-contract-quote.ts:52-72`): the lead's contract quote is its only non-variation quote, else the latest signed, else the primary, else the first.
- The 307 repair (`scripts/finance/307_repair_signed_totals.sql:1-45`) put 19 signed quotes' totals back to their signing record (12 had been re-rolled ×1.09 on 2026-06-19): the figure is `quote_total` for a one-quote request, else the quote's own `quote_snapshot` entry `total` — both dollars.

---

## 2. 1.0 — JSON shapes

### D-20 · `quote_snapshot` — what the client signs

- **`single`** (every request the dialog makes at this commit): the lead's `quote_line_items` rows for the covered quote **as stored rows** — `select("*")`, snake_case columns (`id, quote_id, lead_id, studio_id, category, description, qty, unit, unit_price, total, sort_order, price_type, amount_marker, discount_*, tax_rate, is_optional, comments, …`), ordered by `sort_order` (`request-signature/route.ts:256-266, 369-370`). The types say `QuoteLineItem[]` (camelCase; `database.ts:1823`, `app.ts:1754-1755`); the stored JSON is not that shape, and its readers use snake_case keys (the drift check, `signature-requests/route.ts:88-104`: `quote_id · qty · unit_price · discount_amount · amount_marker`).
- **`bundle` / `variations`:** `QuoteSnapshotEntry[]` (`app.ts:1736-1743`) — `{quoteId, quoteNumber (quotes.quote_number), quoteName (quotes.label), isPrimary, lineItems (the same stored rows), total (dollars: total_cents / 100, else the line sum)}` (`request-signature/route.ts:371-393`).
- **The legacy lead-level path** (a lead with no `quotes` row): the items by `lead_id` alone, `quote_id NULL`, `quote_ids '{}'` (`:256-266`; 303's header). Since 2026-09-10 a lead with neither quotes nor items is refused (`:333-339`).
- No writer changes it after the insert. It is the input of `document_hash` (D-25).

### D-21 · `documents` — `SigningDocument[]` (`app.ts:1970-1990`)

| Field | Type | Values and source |
|---|---|---|
| `id` | string | server `randomUUID()` on the legacy path; on the picker path the client's — the quote document keeps `id = quoteId` (`contract-flow-dialog.tsx:172`), library copies and inline documents `crypto.randomUUID()` (`signing-document-picker.tsx:64, 188`) |
| `type` | `quote · tnc · contract · document` | picker path: `quote` + `document`; legacy path: `quote` + `tnc` + `contract` (D-02 note 5) |
| `render` | `pdf · html · quote` | a library PDF → `pdf`; T&C, contract, rich-text library and inline documents → `html`; the quote → `quote` |
| `title` | string | "Quotation"; the T&C template's name; "Contract Agreement" or the default contract's name; the library row's title |
| `content_html?` | string | html documents: the body **after** the five-variable substitution (D-28) — resolved text; a TipTap variable span survives as `<span data-variable="x">value</span>` |
| `content_data?` | unknown | quote documents: the same stored line rows as D-20 |
| `file_path?` | string | pdf documents: the `signing-documents` object path (D-17) |
| `hash` | string | D-25; the client's `""` is replaced on the server |
| `source_library_id?` | string | the `studio_signing_documents` row it was copied from |
| `requires_scroll` · `requires_accept` | boolean | quote `false · true`; T&C and contract `true · true`; library rows their own; inline `true · true` |
| `accept_label` | string | quote "I have reviewed the quotation from {studio} and agree to proceed." (set by the server on both paths, `request-signature/route.ts:519-529, 537-545`); T&C "I have read and accept the Terms & Conditions."; contract "I have read and accept the Contract Agreement."; library and inline "I have read and agree to this document" unless edited |
| `requires_signature` | boolean | exactly one `true`: picker path → the quote document, else the last flagged, else the last (`:555-564`); legacy path → the contract, else the last document (`:596-629`) |
| `signedUrl?` | string | serve-time only (1-hour URL), **never persisted** (`app.ts:1984-1985`; `sign-pdf-urls.ts:11`) |

`[]` = a row older than 120 (the page falls back to `quote_snapshot`).

### D-22 · `document_acknowledgements`

`{id: string, hash: string, viewedAt?: string, acceptedAt?: string}[]` (`database.ts:1849`; `246:1-5`). Written only on the public link when the page ran its document sequence (`src/app/sign/[token]/page.tsx:745-762`). `id` and `hash` are re-read from the stored documents (server-sourced, `submit/route.ts:262-266`); the timestamps are the browser's, and `acceptedAt` is that document's `viewedAt` (or the submit time) when it was accepted — not a separate moment (`page.tsx:757-760`). The portal's wizard sends none, so a portal signing stores `[]`.

### D-23 · `audit_trail` — `AuditTrailEvent[]`

The type (`app.ts:1992-1998`) is `{event, timestamp, ip?, userAgent?, metadata?}` with `event` one of five words. What is written:

| `event` | When | Extra fields | Where |
|---|---|---|---|
| `link_created` | the insert | — (no actor) | `request-signature/route.ts:730` |
| `link_opened` | every page load that passes the expiry, cancel and archive checks | `ip`, `userAgent` | `sign/[token]/route.ts:76-82` |
| `otp_requested` | an OTP is sent | `metadata {phone}` (E.164) | `request-otp/route.ts:108-113` |
| `otp_verified` | the code is accepted | `ip`, `userAgent` | `verify-otp/route.ts:123-128` |
| `signature_submitted` | the signature is stored | `ip`, `userAgent`, `metadata {hashMatch, multiDocAcknowledgements, signerTimezone}` | `submit/route.ts:306-317` |
| `signature_refused_hash_mismatch` | submit refuses | `ip`, `userAgent`, `metadata` `{signingHash, expectedHash}` · `{ackId, reason: 'unknown_doc_id'}` · `{docId, submittedHash, expectedHash}` | `:176-182, 215-221, 235-242` |
| `casetrust_acknowledged` | the CaseTrust tick was sent | `ip`, `userAgent`, `metadata {}` | `:322-329` |
| `cancelled` | cancel-signature | `actor_user_id` | `cancel-signature/route.ts:79` |
| `cancelled` | the quote was deleted | `reason: 'quote_deleted'` | `quotes/records/[id]/route.ts:300-304` |
| `cancelled_for_regenerate` · `cancelled_superseded` | a newer request for the lead | `actor_user_id` | `request-signature/route.ts:696-702` |

Five of the ten events and the `actor_user_id` / `reason` fields are outside the type. Appends go through the RPC (atomic); the cancels rewrite the whole array (read-modify-write).

### D-24 · `payment_schedule` — the frozen split

Stage `{label, percentage, triggerEvent, type?: 'fixed', amountCents?}` (`PaymentScheduleSnapshotStage`, `request-signature/route.ts:53-59`; `type` is written only for a fixed row). `PaymentScheduleMilestone` (`app.ts:1719-1729`) lacks `type`. **Source order:** the primary covered quote's `quotes.payment_schedule` → the studio's default `payment_schedule_templates` row (`config ?? stages`; no migration creates `config`, QE §Uncertain) → the platform default Deposit 10 · Commencement 30 · Mid-Project 30 · Completion 30 with triggers `deposit · start · midway · handover` (`:37-42, 440-452`). **Normalised** `label ← label ?? name`, `percentage ← percentage ?? percent`, `triggerEvent ← triggerEvent ?? trigger`; rows with no label and no money dropped (`:415-437`). **Amounts** frozen off `quote_total × 100` by `computeMilestoneAmounts`: a fixed row keeps its amount, the percent rows share the rest, the last absorbs the rounding when they reach 100 % (`:465-476`). NULL = a row older than 113. The warning in `src/lib/finance/milestone-schedule.ts:52-66` that this writer drops `type` is stale at this commit.

### D-25 · The hashes

| Hash | Computed as | Stored in |
|---|---|---|
| Snapshot hash | SHA-256 hex of `stableStringify(quote_snapshot)` — keys sorted at every depth so the JSONB round trip keeps it stable (`src/lib/audit-trail.ts:17-28`) | `document_hash` at insert (`request-signature/route.ts:396`); recomputed at submit (`submit/route.ts:166-168`) |
| Document hash | SHA-256 hex of `"{render}\n{title}\n{body}"`, body = `file_path` (pdf) · `content_html` (html) · `JSON.stringify(content_data ?? null)` (quote); the `id` is left out (`src/lib/signing/signing-document-hash.ts:15-25`) | `documents[].hash`; copied into `document_acknowledgements[].hash` |
| Whole-set hash | SHA-256 hex of the document hashes joined by `"\|"` in stored order (`submit/route.ts:252-261`) | `signing_hash` when acknowledgements were sent; otherwise `signing_hash` = the recomputed snapshot hash |

The certificate's `hashMatch` is `document_hash === signing_hash` (`sign/certificate/[id]/route.ts:57-59`), so every multi-document signing on the link reads as a mismatch although submit verified it. A PDF document's hash covers its storage path, not the file's bytes.

### D-26 · `client_selections`

`{selectedPackageId?: string, optionalItemsAccepted?: string[]}` (`sb:20260414000005:22`; `app.ts:1774`). Never written (QE D-04, QE D-212). Dead.

### D-27 · `prepared_by_display`

A string frozen at insert: `lead_assignees` ordered by `added_at` → the members' full names, then `branding.quotePreparedByMode` — `team_list` (default) = the Oxford list, else the company name; `studio_only` = `branding.companyName`, else `studios.name`; `first_assignee` = the first name, else the company name (`src/lib/quote-prepared-by.ts:35-57`; `request-signature/route.ts:284-306`). Never read (grep). QE D-226.

### D-28 · Contract merge fields — the `{{tokens}}`

| Token | The dialog's preview, `render-pdf`, `send-to-client` | At signing (`request-signature`) |
|---|---|---|
| `{{client_name}}` | the recipient typed in the dialog, else the lead's name | the request's `client_name` |
| `{{studio_name}}` | `studios.name` | `studios.name` |
| `{{quote_total}}` | the picked (preview) or primary (server) quote's `total_cents` in the lead's currency; `[Quote total — pending pricing]` when ≤ 0 | `quote_total` in the studio's currency |
| `{{project_address}}` | always `[Project address — fill in on the editor or set on lead]` | `''` |
| `{{start_date}}` | `leads.key_collection_date`, else `[Start date — set on lead]` | today, `yyyy-mm-dd` |
| `{{current_date}}` | today, `yyyy-mm-dd` | today, `yyyy-mm-dd` |
| `{{company_name}}` | the entity's name, else the studio's, else `[Issuing entity]` | `''` |
| `{{company_registration}}` | `studio_companies.registration_number`, else `[Entity registration number — set in Accounts]` | `''` |
| `{{company_gst_number}}` | `gst_registration_number`, else a bracket | `''` |
| `{{company_country}}` | the entity's `country_code`, else the lead's country | `''` |
| `{{company_address}}` | the entity's `address`, else a bracket | `''` |

Sources: `contract-flow-dialog.tsx:401-459` (preview + the Variables list), `contracts/render-pdf/route.ts:113-125`, `send-to-client/route.ts:83-102`, `request-signature/route.ts:504-510`. The server renders take the lead's entity (`leads.company_id`); render-pdf falls back to the default entity, send-to-client does not (`render-pdf/route.ts:70-101`; `send-to-client/route.ts:72-74`). **Form in the HTML:** a literal `{{x}}` or the editor's TipTap node `<span data-variable="x">{{x}}</span>` (`src/components/templates/variable-node.tsx:13-17, 135-140`). **Unknown tokens:** the signing substitution prints `''` (`substitute.ts:22-26`); the PDF render leaves a literal `{{x}}` (`src/lib/quote-html-to-pdf.ts:71-81`).

### D-29 · `signature_data` — the drawn signature

A `data:image/png;base64,…` or `data:image/jpeg;base64,…` URL of at most 1,000,000 characters (`submit/route.ts:53-59`), drawn on the page or in the portal's wizard. No size or stroke data is kept. It is stamped into the executed quote PDF's signing placeholder (`renderAndStoreSignedQuotePdf`, `submit/route.ts:616-640`) and shown on the certificate. 2.0 signs with a typed name (D-163).

### D-30 · The per-document gates

`requires_scroll` → the page's "scrolled to the end"; `requires_accept` → the tick; `gateSatisfied` / `allReviewed` (`src/lib/signing/signing-sequence.ts:45-65`) must pass for every document before the signature step; the agreement sentence lists every non-quote title (`enumerateForAgreement`, `:32-37`). Nothing stores the gate state beyond D-22's timestamps.

### D-31 · What 1.0 derives instead of storing

The certificate (`sign/certificate/[id]/route.ts:57-82`: `hashMatch`, owner / admin extras), the latest request's `content_drifted` verdict (`signature-requests/route.ts:70-111`), "live" vs "expired" (from `expires_at` at read time — until the GET writes `expired`), the packet's audit-certificate page (`build-signed-packet.ts:98-160`), the synthetic quote number `Q-{8}` in the e-mail, the contract value (D-18).

---

## 3. 2.0 — tables and JSON

Drizzle over libSQL (`lib/db/schema.ts`), history `drizzle/0000…0041`. A contract in 2.0 is a **document on a lead** — an editable HTML body (or an uploaded PDF's name), a recipient, and three statuses; the signing link is the contract's own id. There is no token, no expiry, no stored PDF and no evidence beyond the typed name and a masked NRIC.

### D-40 · `contracts` (`schema.ts:577-610`)

**DDL history:** `drizzle/0007_brainy_namor.sql:1-16` (11 columns + `contracts_lead_idx`) → `0026_lonely_enchantress.sql:12-24` (the document columns) → `0028_round1_quotes.sql:23` (`signed_nric`) → `0029_studio_requests.sql:15` (`bundle_id`).

| # | Column | Type | Null / default | Written by | Notes |
|---|---|---|---|---|---|
| 1 | `id` | text | PK | `createContractDoc`, `duplicateContract` (`randomUUID()`, `app/contracts/actions.ts:55, 158`) | the signing link is `/sign/{id}` (`lib/contracts/model.ts:6-7`) |
| 2 | `lead_id` | text | NOT NULL → `leads` CASCADE | create | index `contracts_lead_idx` |
| 3 | `title` | text | NOT NULL | create: the template's title, else `Interior Design Service Agreement`, else the upload's title or file name; a lead's later ones get " 2", " 3" from its live count (`actions.ts:35-39, 56-64`); the editor's save (≤ 120 characters) | |
| 4 | `status` | text | NOT NULL, `'Draft'`; no CHECK | D-143 | `Draft · Sent to Client · Signed` (`lib/leads/contract-filters.ts:8`) |
| 5 | `created_at` | integer ts | NOT NULL | create | |
| 6 | `sent_at` | integer ts | null | `sendContract` (first time), the status menus, `markContractSigned` / sign online (`?? the signing time`), `sendBundle` | |
| 7 | `signed_at` | integer ts | null | `markContractSigned` (the date the studio picks), `signContractOnline`, `signBundleOnline`, the tab's menu → Signed (first time) | cleared by the editor's pill leaving Signed (`actions.ts:130`), kept by the tab's menu (`app/leads/contracts-actions.ts:28-40`) |
| 8 | `signed_copy` | text | null | a **file name** only: `{title}.pdf` (tab menu), the attached name or `{title}.pdf` (mark signed), `{title} — signed online.pdf` (online), the upload's name (an imported signed PDF) | no bytes are stored |
| 9 | `updated_at` | integer ts | null | every write | |
| 10 | `archived_at` | integer ts | null | `archiveContract` (+ its Undo) | |
| 11 | `deleted_at` | integer ts | null | `deleteContracts` (soft), `restoreContracts`; `deleteContractsForever` / `emptyContractTrash` hard-delete | |
| 12 | `body` | text | null | create: the template's body or `agreementHtml()`; NULL for an upload; `saveContractDoc` stores `safeHtml` (scripts, `on…=` handlers and `javascript:` removed, ≤ 400,000 characters; `actions.ts:31-32`) | D-45 |
| 13 | `recipient_name` | text | null | create (the lead's name), save (≤ 80), `sendContract`, `sendBundle` | |
| 14 | `recipient_phone` | text | null | create / save / send: `digits()` = the first 8 digits of the input (`actions.ts:30`) | "8 digits, +65 implied" (`schema.ts:595`); D-49 |
| 15 | `contract_date` | integer ts | null | create (now), save | the `date.contract` chip |
| 16 | `template_id` | text | null (no FK) | create from a template (also bumps `contract_templates.last_used_at`, `actions.ts:57-59`) | |
| 17 | `from_quote_id` | text | null (no FK, no index) | create from the quote editor (`components/quotes/editor/quote-editor.tsx:629-630`); R49 | `signQuoteThrough` (D-44); `contractHolds` (D-49) |
| 18 | `source` | text | NOT NULL, `'composed'` | create | `composed · uploaded` |
| 19 | `file_name` | text | null | create from an upload (the PDF's name only) | |
| 20 | `issuing_entity` | text | null | save (≤ 120) | null = the studio; prints as the `studio.name` chip (D-45) |
| 21 | `reminders` | integer bool | NOT NULL, false | `setContractAutomation` | stored only — nothing sends |
| 22 | `thank_you` | integer bool | NOT NULL, false | same | stored only |
| 23 | `signed_by` | text | null | the name typed on the signing page (≤ 80) | NULL = marked signed by the studio (Activity reads it so, `lib/leads/activity.ts:177`); cleared by the editor's pill |
| 24 | `created_by` | text | null (members.id, no FK) | create / duplicate: the session member | whose saved signature the signing page prints (D-43) |
| 25 | `signed_nric` | text | null | sign online: `maskNric` of a valid NRIC / FIN (`lib/format.ts:224-226`), e.g. `•••••567A` | never the whole number (REG-563); not cleared by un-signing |
| 26 | `bundle_id` | text | null (no FK, no index) | `sendBundle` | D-41 |

**Keys:** PK `id`; FK `lead_id → leads` ON DELETE CASCADE; index `contracts_lead_idx (lead_id)`. `template_id`, `from_quote_id`, `bundle_id`, `created_by` are plain text ids. **Readers:** `fetchLeadContracts` (`lib/leads/contracts.ts:17-26`, live rows), `fetchContractEditor` · `fetchSigning` · `fetchStudioContracts` · `fetchDeletedContracts` · `fetchContractTemplates` (usage counts) · `fetchContractOptions` · `fetchBundleSigning` (`lib/contracts/queries.ts`), the Move stage window's lists (`app/leads/quotes-actions.ts:311-331`), `contractHolds` (`:364-368`), `countLiveSigningLinks` (`app/leads/actions.ts:191-199`), Activity (`lib/leads/activity.ts:44, 171-178`).

### D-41 · `contract_bundles` (`schema.ts:634-646`; `drizzle/0029_studio_requests.sql:1-13`)

`id text PK` (made by the client when the Send together dialog opens; checked against `/^[0-9a-f-]{8,64}$/i`, `actions.ts:203`) · `lead_id text NOT NULL → leads CASCADE` · `recipient_name` · `recipient_phone` (8 digits) · `created_at NOT NULL` · `sent_at` (= `created_at` at send) · `signed_at` (the first signing only, `actions.ts:226, 229`) · `signed_by` · `signed_nric` (masked) · `created_by`. **No status column:** a bundle is live while `sent_at` is set and `signed_at` is NULL (`countLiveSigningLinks`). Its documents are the `contracts` rows with its `bundle_id`, ordered by `created_at` (`lib/contracts/queries.ts:167`). Written by `sendBundle` (`actions.ts:202-217`) and `signBundleOnline` (`:220-233`).

### D-42 · `contract_templates` (`schema.ts:649-660`; `drizzle/0026_lonely_enchantress.sql:1-10`)

`id text PK` · `title text NOT NULL` · `body text NOT NULL` (HTML with chips; `''` for a blank template) · `created_by` · `created_at NOT NULL` · `updated_at NOT NULL` · `last_used_at` (bumped when a contract starts from it) · `deleted_at` (soft). **No** versions, default flag, entity scope, kind or file. **Written by** `app/company/contract-templates-actions.ts` (create blank · the starter agreement · from a contract; save; rename; duplicate; soft delete; restore; delete forever; empty trash; `:21-72`) and *Save as template* in the contract editor (`app/contracts/actions.ts:168-176`). **Read by** the gallery (with each template's usage count from `contracts.template_id`, `lib/contracts/queries.ts:121-133`), the template editor (placeholder client values, `:135-147`), the pickers (`:150-152`, ordered by `last_used_at` desc). A deleted template leaves its contracts as they are — each holds its own copy of the body.

### D-43 · `members.signature_*` — the studio's side of a contract

QE D-62 (`drizzle/0019_youthful_clea.sql:1-3`: `signature_kind` `draw · type · NULL`, `signature_name`, `signature_data` = an SVG path, viewBox 752 × 140). On a contract the signing page prints the **live** signature of `contracts.created_by`, else the session member — `contract_bundles.created_by` for a bundle (`lib/contracts/queries.ts:92-93, 172-173`); the `studio-signature` field is where it prints. Nothing is frozen at signing: a member who changes their signature changes it on every signed contract's page.

### D-44 · `quotes` — the stamps contracts write or read

| Columns | Migration | Written by | Notes |
|---|---|---|---|
| `status 'Signed'`, `signed_at`, `visibility 'Shared'`, `client_sent_at ?? signedAt`, `updated_at` | `0040:2` (`signed_at`); `0039:7` (`client_sent_at`) | `signQuoteThrough` (`lib/quotes/sign.ts:13-21`) whenever a contract with `from_quote_id` is signed — online, in a bundle, marked signed, or picked Signed in a list | skips a quote already Signed or deleted; un-signing the contract does not reverse it (REG-626) |
| `confirmed_at` · `confirmed_by` | `0029:19-20` | `confirmQuoteOnline` on `/confirm/{quoteId}` (REG-587) | a quote-level step before the contract; the optional picks go to `quote_items.client_choice` (`0040:1`) |
| `nric` · `client2_name` · `client2_nric` · `issuing_entity` · `client_signature_required` | 0013 · 0029 · 0015 · 0019 | the quote editor | the quote's own signature block (QE D-50); contracts do not read them |

Revise clears `signed_at`, `confirmed_*` and `client_sent_at` (`app/quotes/actions.ts:171`).

### D-45 · The document HTML and its chips

- **Chips** `<span class="om-token" data-token="{key}" contenteditable="false">{Label}</span>&nbsp;` — 16 keys in five groups (`lib/contracts/tokens.ts:8-23`): `client.name · client.phone · client.email · lead.address · lead.propertyType · lead.projectRef · studio.name · studio.address · studio.phone · studio.email · studio.uen · quote.number · quote.total · quote.validUntil · date.today · date.contract`.
- **Sign fields** `<span class="om-sign" data-sign="{key}" contenteditable="false">{Label}</span>` — `studio-signature · client-signature · studio-initial · client-initial` (`:26-39`).
- **Resolution** on every render (Preview, the signing page, the PDF): `resolveTokens` puts each value in escaped; an empty value prints `[Label]` (`:42-48`). The values (`tokenValuesFor`, `lib/contracts/queries.ts:38-57`): `client.name` = `recipient_name`, else the lead's name; `client.phone` = `+65 ` + the digits; `client.email`, `lead.propertyType` = the lead's; `lead.address` = `property_address`, else `lead_address`; `lead.projectRef` = the quote's `project_ref`; `studio.name` = `issuing_entity`, else `settings.brand.details.name`; `studio.address · phone · email · uen` = the **studio's** details — an entity's own `address` / `uen` (`IssuingEntity`, REG-618, `lib/templates/model.ts:47-53`) are not read; `quote.*` from `pickQuote` = `from_quote_id`, else the lead's Signed quote, else its latest live quote (`:62-63`), `quote.total` = `money2(amount_minor)`; `date.today` = now (moves every day); `date.contract` = `contract_date`, else `created_at`. Dates print "25 August 2026" (`longDate`, `lib/contracts/model.ts:28`).
- **Nothing is frozen:** a signed contract re-resolves its chips on every render against today's records.
- Helpers: `outlineOf` (h1–h3), `isBlankDoc`, `excerptOf`, `tokensIn`, `signFieldsIn` (`tokens.ts:50-79`). The seeded bodies are `agreementHtml()` (11 clauses + signatures) and `variationHtml()` (`lib/contracts/agreement.ts:8-63`; REG-534, invented copy).

### D-46 · The Won stage log's contract fields

`stage_logs.payload` (JSON) for Won: `wonContractTab 'system' · 'upload'`, `wonContract` = a **file name** — the picked Signed contract's `signed_copy ?? '{title}.pdf'` — and `wonContractUploaded` = the uploaded name (`lib/leads/stage-data.ts:38-40, 140-141`; `components/leads/move-stage/panels.tsx:287-291`). `SYSTEM_CONTRACT = 'Contract_OliviaM_signed.pdf'` is the empty-state default (`stage-data.ts:47`). No contract id is stored. leads D §2.

### D-47 · Notifications and Activity

- `notifications.kind = 'quote_signed'` goes to the lead's members plus the Owners and Admins when a client signs online or signs a bundle (`app/contracts/actions.ts:148, 230`); channels per `settings.notification_rules` (`lib/notifications/model.ts:24, 45, 84-85`). Marking signed by hand raises nothing; sending raises nothing.
- Activity is derived from the rows (`lib/leads/activity.ts:171-178`): created or uploaded · sent (skipped for an upload whose sent equals signed) · signed online (when `signed_by`) or marked signed · deleted. The actor is `created_by`'s name, else **"You"** (`:174`). `lead_events` has no contract kinds (`lib/leads/events.ts:11`).

### D-48 · Settings

No contract settings key (the tab kebab's *Contracts Settings* is inert, `components/leads/contracts/contracts-toolbar.tsx:93-97`). Read: `settings.brand.details` (`name · address · phone · email · uen`; `entities[]` only by name through `issuing_entity`) and `settings.notification_rules.quote_signed`.

### D-49 · Rules 2.0 enforces on contracts

- **Send:** a composed contract with a blank body is refused (`isBlankDoc`, `actions.ts:103`); `sent_at` is stamped once; sending a Signed contract keeps it Signed (`:105`).
- **Sign online:** no status gate — a Draft or archived contract's page signs (`fetchSigning` drops only deleted rows; `signContractOnline` returns early only when Signed, `actions.ts:136-151`). The code is simulated — any six digits (`components/contracts/sign/signing-page.tsx:18-21, 87-95`). The signature is the typed name (≤ 80); the NRIC is optional and masked.
- **Bundle:** at least two live documents (not Signed, not a blank composed one), one lead, at most 20 ids (`actions.ts:202-217`); one signature signs every unsigned member, and the bundle keeps its first `signed_at` (`:220-233`).
- **Un-sign:** the editor's pill clears `signed_at`, `signed_by`, and `signed_copy` for a composed contract (`actions.ts:124-133`); the tab's status menu keeps every stamp (`app/leads/contracts-actions.ts:28-40`); neither clears `signed_nric` or un-signs the quote (REG-626).
- **Delete:** soft by anyone; *Delete forever* by anyone, a Signed contract included; a quote a live contract reads (`from_quote_id`, not deleted) cannot be deleted forever (`contractHolds`, `app/leads/quotes-actions.ts:364-368`); the lead's Delete warns with the count of live links (`countLiveSigningLinks`, REG-607).
- **Phone:** `digits()` keeps the first eight digits of whatever arrives (`actions.ts:30`) — `+65 9123 4567` becomes `65912345`. `phoneDigits` (`lib/format.ts:134-137`), which drops a leading 65 from ten digits, is not used here.

### D-50 · Seeds, repair rules and the baseline

- `scripts/seed-contracts.ts:11-19`: Olivia Martinez → `General Contract Agreement`, Draft, 25 Aug '26.
- **R4/R5** (`scripts/repair-demo-data.ts:189-222`): every Won lead without a contract gets `General Contract Agreement`, Signed, sent = its quote + 2 days, signed = Won − 2 hours, `signed_copy 'General Contract Agreement.pdf'` (id `sid(lead, 'contract')`).
- **R34** (`:838-859`): the templates `Interior Design Service Agreement` (40 days old) and `Variation Order` (26 days) by `dane`; every composed contract with no body gets the starter agreement, the lead's name and phone as recipient, `contract_date = created_at`, `template_id` = the agreement, `created_by 'dane'`; `last_used_at` backfilled.
- **R49** (`:1111-1123`): a Signed contract names its lead's Signed quote when the lead has exactly one of each; Signed quotes take `signed_at` from their contract, else `updated_at`.
- **R27** (`:656-660`): the signed-in member signs `type`, with their name.
- **Checks** (`:1126-1181`): `signed quote with no signing date` (1128), `signed contract whose quote is not signed` (1129), `composed contract with no document` (1148), `contract with no recipient` (1149), `Won lead with no signed contract` (1160), a contract older than its lead (1162-1163).
- **`fixtures/baseline.json`** (`takenAt` 2026-09-24T19:18:51Z; tables in `BASELINE_TABLES`, `lib/db/baseline.ts:17`): `contracts` **4** — Signed 3 · Draft 1, all `composed`, all four with `template_id` = the agreement, `from_quote_id` on the three Signed, none with `signed_by` or `signed_nric` (all marked signed, none signed online), none in a bundle; `contract_bundles` **0**; `contract_templates` **2**; members with a signature **1** (`dane`, `type`); `quotes` Signed **3**, each with `signed_at`; `notifications` **3** (`new_lead` only).

### D-51 · What 2.0 derives instead of storing

A live link (a contract at *Sent to Client*, a bundle sent and unsigned); the document's text (re-resolved on every render, D-45); the "signed copy" (a name, no file); the lead's contract state (its `contracts` rows; the Won step lists the Signed ones); who sent and who signed (Activity from the stamps, D-47); the quote a contract reads (`pickQuote`).

### D-52 · The portal records — no signing surface

`homeowner_profiles` · `homeowner_lead_links` (REG-609; `schema.ts:932-959`) hold the invite and the questionnaire ask; nothing in `lib/leads/portal.ts` or `app/leads/portal-actions.ts` reads or writes a contract (grep). The client signs only on `/sign/{id}` and `/sign/bundle/{id}`.

---

## 4. The diff

### 4.1 Table map

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-60 | `quote_signature_requests` (D-02) — a signed or live request and its documents | `contracts` (one row per non-quote document) + `contract_bundles` (several documents under one signature) + the covered quote's `status` / `signed_at` (QE D-107, QE D-238) | **split** | 1.0 signs a request over a packet; 2.0 signs a document, or a bundle of them. The link is the contract / bundle id (QE Q-33). leads D §3.2, templates D-66, QE D-76 |
| D-61 | `quote_signature_requests` — cancelled, expired and superseded requests | — | **missing in 2.0** | 2.0 keeps no history of links (5.A D-170) |
| D-62 | the evidence on the request: `signature_data`, `signer_*`, `verification_method`, `document_hash`, `signing_hash`, `audit_trail`, `document_acknowledgements`, `signed_pdf_url`, `signed_packet_path` | — | **missing in 2.0** | 2.0 keeps `signed_by` (typed name) and `signed_nric` (masked); 5.B |
| D-63 | `studio_document_templates` `type 'contract'` (D-04) | `contract_templates` (D-42) | **rename** | templates D-52; the tokens → D-132 |
| D-64 | `studio_document_templates` `type 'tnc'` | `quote_text_templates` `kind 'terms'` (templates D-51, templates D-167); inside a signed packet, a `contracts` row (5.D) | **merge** | |
| D-65 | `studio_document_templates` `type 'signing_flow'` | — | **dead** | `docOrder` has no reader (D-04); a bundle's order is its contracts' `created_at`. templates D-54, templates D-144 |
| D-66 | `studio_signing_documents` (D-05) | — (nearest: a `contract_templates` row for rich text; an `uploaded` contract for a PDF) | **Later** | templates D-67; 5.A D-171 |
| D-67 | `member_signatures` (D-06) | `members.signature_kind · signature_name · signature_data` | **merge** (format change) | QE D-111 |
| D-68 | `quotes.prepared_by_signature` (D-06) | — | **missing in 2.0** | QE D-187, templates D-140 |
| D-69 | `quotes.signed_at` (307), `status sent_for_signature · client_signed` | `quotes.signed_at` (0040), `Sent to Client · Signed` | **same** / **rename** | map 06 R4; QE D-144, QE D-145 |
| D-70 | `leads.contract_uploaded · contract_file_name · signature_request_id · signed_at` (D-10) | derived from the lead's `contracts` rows and the Won log | **superseded** | QE D-215; leads D §3.2 |
| D-71 | a composed contract e-mailed (`lead_files` + `contract_sent:` line, D-12) | `lead_files` (leads D); optionally a `contracts` row `source 'uploaded'` (5.D D-221) | **split** | the HTML was never stored |
| D-72 | a paper contract at the lead (D-10, D-12) | a `contracts` row `source 'uploaded'`, Signed (5.D D-220) | **rename** | |
| D-73 | `projects.contract_file_name · contract_file_url`, `project_files` folder `contract`, bucket `contract-files` (D-11) | — | **Later** (Projects) | |
| D-74 | `quotes.is_omission`, `quote_line_items.is_omission`, `variation_orders.quote_id · invoice_id · invoiced_at` (D-07–D-09) | — | **Later** (Finance) | QE D-210 |
| D-75 | the contract value (D-18) | `pickQuote` picks the quote a contract reads (`lib/contracts/queries.ts:62-63`); no value is computed | **Later** (Finance) | |
| D-76 | `finalize_signed_mirror`, `trg_quote_totals_frozen`, the template-RPC refusals (D-03) | `signQuoteThrough` (`lib/quotes/sign.ts`); no totals freeze | **superseded** / **missing** | a Signed 2.0 quote stays editable (QE D-215) |
| D-77 | portal signing and `homeowner_notifications` `signature_requested · contract_signed` (D-13) | — (the portal records have no pages, D-52) | **Later** / **Platform** | |
| D-78 | `notifications` events (D-14), `otp_rate_limits` + `bypass_otp` (D-15), the buckets (D-17), `usage_events` | `notifications.kind 'quote_signed'` (D-47) | **Platform** | delivery records are not a studio's data (leads D §3.4) |
| D-79 | — | `contracts.body · recipient_* · contract_date · template_id · source · file_name · issuing_entity · reminders · thank_you · signed_by · signed_nric · created_by · archived_at · deleted_at · bundle_id`; `contract_bundles`; the `contract_templates` library lifecycle; `quotes.confirmed_*` | **2.0 only** | 1.0's request has no editable document (leads D §3.3) |

### 4.2 Column-level diffs

**A · `quote_signature_requests` → `contracts` / `contract_bundles`** (one 1.0 request lands as one contract, or as a bundle with one contract per document — 5.D)

| Id | 1.0 column | 2.0 `contracts` | 2.0 `contract_bundles` | Verdict | Note |
|---|---|---|---|---|---|
| D-80 | `id` | `id` for a request that lands as one contract (5.D D-213, D-215) | `id` (several documents, D-214) | **rename** | the request's id goes to the one contract it lands as, or to the bundle; inside a bundle each contract takes its document's `id` (D-114) |
| D-81 | `lead_id` | `lead_id` | `lead_id` | **same** | |
| D-82 | `studio_id` | — | — | **dead** | one studio |
| D-83 | `token` | — (the link is `/sign/{contracts.id}`) | — (`/sign/bundle/{id}`) | **Platform** | QE Q-33 |
| D-84 | `status` | `status` (§4.3) | `sent_at` / `signed_at` | **rename** | classify by the evidence, not the word (D-02 note 2) |
| D-85 | `client_name` | `recipient_name`; also `signed_by` on a signed request | `recipient_name`; `signed_by` | **rename** | 1.0 keeps no typed signer name (D-02 note 3) |
| D-86 | `client_phone` | `recipient_phone` | `recipient_phone` | **unit change** | `"+65 9123 4567"` as typed → the 8 digits via `phoneDigits`, never `digits()` (D-49) |
| D-87 | `quote_snapshot` | — (the lines stay on the quote; a frozen copy only as a `quote_versions` row, QE D-107) | — | **missing in 2.0** | read by the port's hash check (D-224) |
| D-88 | `quote_total` | — | — | **missing in 2.0** | dollars; the port's money check (D-225); 5.B D-186 |
| D-89 | `studio_name` | — (`settings.brand.details.name` at render) | — | **derived** | |
| D-90 | `expires_at` | — | — | **missing in 2.0** | the platform's (QE Q-33); 5.B D-184 |
| D-91 | `signed_at` | `signed_at` | `signed_at` | **same** | timestamptz → seconds |
| D-92 | `signature_data` | — | — | **missing in 2.0** | 2.0 signs with a typed name; 5.B D-175 |
| D-93 | `signer_ip` | — | — | **missing in 2.0** | 5.B D-177 |
| D-94 | `signer_user_agent` | — | — | **missing in 2.0** | 5.B D-177 |
| D-95 | `created_at` | `created_at`; `sent_at` = `created_at` | `created_at`, `sent_at` | **same** | |
| D-96 | `document_hash` | — | — | **missing in 2.0** | 5.B D-179 |
| D-97 | `signing_hash` | — | — | **missing in 2.0** | 5.B D-179 |
| D-98 | `audit_trail` | — (Activity comes from the stamps) | — | **missing in 2.0** | 5.B D-180 |
| D-99 | `signer_phone` | — (2.0's code is simulated; `recipient_phone` is the target) | — | **missing in 2.0** | 5.B D-176 |
| D-100 | `signer_timezone` | — | — | **missing in 2.0** | 5.B D-177 |
| D-101 | `verification_method` | — | — | **missing in 2.0** | always `phone_otp` in 1.0 (D-02 #22) |
| D-102 | `client_selections` | — | — | **dead** | QE D-212; 2.0's picks are `quote_items.client_choice` (map 06 R4) |
| D-103 | `quote_id` | `from_quote_id` | — (each document carries its own) | **rename** | |
| D-104 | `payment_schedule` | — | — | **missing in 2.0** | the frozen split; QE D-107 keeps it only inside a `quote_versions` row; 5.B D-187 |
| D-105 | `signed_pdf_url` | `signed_copy` (the object's **name** only) | — | **unit change** | the file stays on the platform (D-202) |
| D-106 | `documents` | one `contracts` row per non-quote document (Table B) | the grouping | **split** | |
| D-107 | `company_id` | `issuing_entity` (the entity's `name`) | — | **unit change** | uuid → a name in `brand.details.entities[]` (templates D-77) |
| D-108 | `quote_ids` | — | — | **superseded** | 2.0 bundles documents, not quotes |
| D-109 | `signing_mode` | — | a bundle row ⇔ several documents | **superseded** | expected `single` everywhere (D-02 #30) |
| D-110 | `selected_quote_id` | `from_quote_id` (variations) | — | **rename** | |
| D-111 | `signed_packet_path` | `signed_copy` of each member (a name) | — | **unit change** | 5.B D-185 |
| D-112 | `document_acknowledgements` | — | — | **missing in 2.0** | 5.B D-181 |
| D-113 | `prepared_by_display` | — | — | **superseded** | never read in 1.0; `{prepared_by}` resolves at print (QE D-226) |

**B · One `SigningDocument` (an element of `documents[]`) → a `contracts` row**

| Id | 1.0 field | 2.0 `contracts` | Verdict | Note |
|---|---|---|---|---|
| D-114 | `id` | `id` | **rename** | inside a bundle only; a one-document request's contract takes the request's id (D-80). Document ids are server or client UUIDs (D-21) |
| D-115 | `type` | — | **missing in 2.0** | `quote` is skipped (it is the quote); `tnc`, `contract`, `document` each become a row, told apart only by title; 5.B D-183 |
| D-116 | `render` | `source` | **rename** | `html` → `composed`; `pdf` → `uploaded`; `quote` → not a contract |
| D-117 | `title` | `title` | **same** | 2.0's " 2" numbering applies only when 2.0 creates a contract; the port writes the title as it is |
| D-118 | `content_html` | `body` | **unit change** | resolved text with no chips (D-21); `safeHtml` accepts it; a leftover `<span data-variable>` prints as plain text; it stays frozen (D-229) |
| D-119 | `content_data` | — | **superseded** | the quote's own lines |
| D-120 | `file_path` | `file_name` (the object's name) | **unit change** | the bytes stay on the platform (D-202) |
| D-121 | `hash` | — | **missing in 2.0** | 5.B D-179 |
| D-122 | `source_library_id` | — | **missing in 2.0** | `template_id` points at `contract_templates`, not a library |
| D-123 | `requires_scroll` · `requires_accept` · `accept_label` | — | **missing in 2.0** | 5.B D-182 |
| D-124 | `requires_signature` | — | **superseded** | every 2.0 contract or bundle takes one signature; where it prints is the `client-signature` field of the body, which a ported body does not carry |

**C · `studio_document_templates` (`type 'contract'`) → `contract_templates`** (templates D-52; the `tnc` rows follow templates D-167)

| Id | 1.0 column | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-125 | `id` · `created_at` · `updated_at` · `last_used_at` | same names | **same** | uuid string; times to seconds |
| D-126 | `studio_id` · `company_id` | — | **missing in 2.0** | no entity scope; 5.B D-189 |
| D-127 | `name` | `title` | **rename** | |
| D-128 | `body_html` | `body` | **rename** | tokens rewritten to chips (D-132); `NULL` → `''` |
| D-129 | `is_default` | — | **missing in 2.0** | 1.0's legacy path attaches the default to a link (D-02 note 5); 2.0 starts a contract from a picked template or the starter agreement; 5.B D-188 |
| D-130 | `is_active = false` | `deleted_at` | **rename** | |
| D-131 | `variables` · `body_react_component` · `body_json` · `config` · `type` | — | **dead** | informational or unused for `contract` rows (templates D-145) |

**D-132 · The tokens: 1.0 `{{token}}` → 2.0 chip.** Both 1.0 forms — a literal `{{x}}` and the TipTap node `<span data-variable="x">{{x}}</span>` — become `<span class="om-token" data-token="{key}" contenteditable="false">{Label}</span>&nbsp;` (`lib/contracts/tokens.ts:38`).

| 1.0 | 2.0 chip | Note |
|---|---|---|
| `{{client_name}}` | `client.name` | |
| `{{studio_name}}` | `studio.name` | prints the contract's `issuing_entity` when set |
| `{{quote_total}}` | `quote.total` | 2.0 reads `pickQuote`'s `amount_minor`; 1.0 the primary quote or the request total |
| `{{project_address}}` | `lead.address` | 1.0 never resolved it (always a bracket, or `''` at signing) |
| `{{current_date}}` | `date.contract` | the agreement's date; `date.today` would move every day |
| `{{company_name}}` | `studio.name` | with `issuing_entity` = the entity |
| `{{company_registration}}` | `studio.uen` | 2.0 prints the studio's UEN, not the entity's (D-45) |
| `{{company_address}}` | `studio.address` | same caveat |
| `{{start_date}}` | — | no chip; 1.0 = `key_collection_date` (editor) or today (signing) |
| `{{company_gst_number}}` | — | no chip (`StudioDetails.gstReg` exists) |
| `{{company_country}}` | — | no chip |

2.0-only chips: `client.phone · client.email · lead.propertyType · lead.projectRef · studio.phone · studio.email · quote.number · quote.validUntil · date.today`, and the four sign fields (D-45).

**E · `studio_signing_documents` → 2.0** (only if ported; templates D-67 holds it Later)

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-133 | a `rich_text` row: `title`, `body_html`, `is_active`, times | a `contract_templates` row (`title`, `body`, `deleted_at`) | **merge** | `accept_label`, `requires_*`, `company_id` have no home (5.A D-171) |
| D-134 | a `pdf_upload` row: `file_path` | — | **missing in 2.0** | a template needs a body; 2.0 stores no files |

**F · `member_signatures` → `members.signature_*`**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-135 | the active row (`storage_path`, `style`, `auto_apply`, `consent_at`) | `signature_kind 'type'` + `signature_name` = the member's name, or unset | **merge** | a stored PNG is not an SVG path (QE D-111, QE D-227) |

**G · The lead's and the quote's contract columns**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-136 | `leads.contract_uploaded` | derived: the lead has a Signed contract | **derived** | the paper upload lands as a contract (D-220) |
| D-137 | `leads.contract_file_name` | the landed contract's `signed_copy` / `file_name` | **superseded** | `'client-signed-quote.pdf'` is the mirror's marker, not a file (D-03) |
| D-138 | `leads.signature_request_id` · `leads.signed_at` | derived: the lead's contract at *Sent to Client*; `min(contracts.signed_at)` / the Won log | **derived** | leads D §3.4 offers `signed_at` as a column |
| D-139 | `quotes.signed_at` · `prepared_by_signature` · `is_omission` · `quote_type 'variation'` | `quotes.signed_at` · — · — · — | **same** · **missing** · **Later** · **Later** | map 06 R4 · QE D-187 · QE D-210 |

### 4.3 Status mapping (1.0 → 2.0)

**D-140 · The 1.0 request's statuses.** `pending · viewed · signed · expired · cancelled` — free text, no CHECK (042:10); who writes each is D-02 #5. `cancelled` is missing from both TypeScript unions (`database.ts:1820`, `app.ts:1751`). `expired` can overwrite `signed` and `cancelled` (D-02 note 2).

**D-141 · Request → contract.**

| 1.0 request | The test at port time | 2.0 `contracts.status` | Stamps |
|---|---|---|---|
| signed | `signed_at IS NOT NULL AND signature_data IS NOT NULL`, whatever `status` reads | `Signed` | `sent_at` = `created_at`; `signed_at`; `signed_by` = `client_name`; `signed_copy` (D-217); `signed_nric` NULL |
| live | `status IN ('pending','viewed')`, `expires_at` in the future, not signed | `Sent to Client` | `sent_at` = `created_at` (a `viewed` state has no 2.0 word; 5.B D-181) |
| expired unsigned, or `pending` / `viewed` past `expires_at` | | not ported | 5.C D-190 |
| cancelled unsigned | | not ported | 5.C D-190 |

**D-142 · Request → bundle.** Signed → `contract_bundles.signed_at · signed_by` and every member `Signed`; live → `sent_at` only and every member `Sent to Client`.

**D-143 · 2.0's contract statuses.** `Draft → Sent to Client → Signed` (send · the menus · sign online · a bundle · mark signed). Back to Draft or Sent through the editor's pill (clears the signing stamps) or the tab's menu (keeps them) (D-49). No *viewed*, *expired* or *cancelled*; archive and delete are columns.

**D-144 · The quote side.** A signed request's covered quotes → `Signed` with `signed_at` (QE D-145, QE D-238); a live request's → `Sent to Client` (QE D-144); expired or cancelled → no change (QE D-150). A 1.0 quote demoted from `client_signed` to `approved` by a later base signing (D-03, v2+) lands *Approved*, while its old signed request still lands as a Signed contract — see D-216 for `from_quote_id`.

**D-145 · The lead side.** `leads.quote_status`, `contract_uploaded` and the funnel's `SIGNED` → 2.0's Won stage and its log (leads D §3.4, stage mapping); the log's `wonContract` = the landed contract's `signed_copy` (D-222).

**D-146 · Soft states.** `studio_document_templates.is_active = false` → `contract_templates.deleted_at`; `studio_signing_documents.is_active = false` → `deleted_at` (if ported); `member_signatures.is_active` → only the active row lands (QE D-111).

### 4.4 Enums and units

| Id | Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|---|
| D-150 | Signing mode | `single · bundle · variations` (161) | — | one contract per document, a bundle when there are two or more; `variations` → `from_quote_id` = the selected quote |
| D-151 | Document type | `quote · tnc · contract · document` (`app.ts:1967`) | — | D-115 |
| D-152 | Render | `pdf · html · quote` | `source composed · uploaded` | D-116 |
| D-153 | Library kind | `pdf_upload · rich_text` (242) | — | D-133, D-134 |
| D-154 | Request status | `pending · viewed · signed · expired · cancelled` | `Draft · Sent to Client · Signed` | D-141 |
| D-155 | Audit events | the ten of D-23 | — (Activity: created · uploaded · sent · signed online · marked signed · deleted) | kept verbatim only with 5.B D-180 |
| D-156 | Verification | `phone_otp` (default, never changed) | — (a simulated code) | — |
| D-157 | Member signature | `style drawn · uploaded` (an image in storage) | `signature_kind draw · type` (an SVG path or a name) | QE D-111 |
| D-158 | Merge fields | 11 `{{snake_case}}` (+ TipTap spans) | 16 `data-token` chips | D-132 |
| D-159 | Signature places | one document per request with `requires_signature` | `data-sign` `studio-signature · client-signature · studio-initial · client-initial` | 2.0 only |
| D-160 | Money | `quote_total` NUMERIC(12,2) **dollars**; `amountCents` **cents**; a snapshot entry's `total` **dollars** | no money on a contract; the chip reads `quotes.amount_minor` (**cents**) | × 100, rounded once |
| D-161 | Time | `timestamptz`; `yyyy-mm-dd` inside resolved bodies | integer unix seconds; `longDate` ("25 August 2026") for chips | `Date.parse(ts) / 1000`; resolved text kept as written |
| D-162 | Phone | `client_phone` as typed (`"+65 9123 4567"`); `signer_phone` E.164 (`+6591234567`) | 8 digits (`isSgPhone` `^[689]\d{7}$`, `lib/format.ts:132`) | `phoneDigits` (D-49) |
| D-163 | The client's signature | PNG / JPEG data URL ≤ 1,000,000 characters | a typed name ≤ 80 characters | no 2.0 column for an image (5.B D-175) |
| D-164 | NRIC | none on the request (1.0's is `leads.ic_number`, printed plain; QE D-08) | `signed_nric`, masked `•••••567A`, only when the client types it | NULL on ported rows |
| D-165 | Ids | uuid; the token a uuid string | text; the link is the id | the UUID string; the token is dropped |
| D-166 | Hashes | SHA-256 hex (64 characters) | — | 5.B D-179 |
| D-167 | Issuing entity | `company_id` uuid → `studio_companies` | `issuing_entity` text; NULL = the studio | the entity's `name`; NULL for the default entity (templates D-77) |

---

## 5. Port plan

A port is a one-shot import of one 1.0 studio's contract data into the 2.0 tables, run after the Leads port (leads D §3.4), the Templates port (templates §5, map 04) and the Quotes port (QE §5, map 06). Ids keep the 1.0 UUID strings, so a re-run is `INSERT OR IGNORE`; every `*_by` becomes a `members.id`; times are `Date.parse(ts) / 1000`; money is dollars × 100 → cents, cents unchanged (D-160). Nothing below is built until the owner marks it.

### 5.A New 2.0 tables

Everything a 1.0 studio's contracts need has a home in `contracts`, `contract_bundles` and `contract_templates` (§4) — except the two below. Each is conditional, with an alternative that needs no table. Names keep 1.0's, without the `quote_` / `studio_` prefix (2.0 signs contracts and has one studio).

| Id | 1.0 table | Why 2.0 would need it | Columns to carry | Alternative |
|---|---|---|---|---|
| D-170 | `quote_signature_requests` rows that never signed, and each link's life (`pending → viewed → signed / expired / cancelled`) | 2.0 has one link per contract or bundle, with no history, no expiry and no *viewed* or *cancelled* state (QE Q-33 leaves the token and the expiry to the platform) | `signature_requests`: `id` (the 1.0 id), `lead_id → leads CASCADE`, `contract_id` / `bundle_id` (the rows it produced, if any), `status` (the five words), `created_at`, `expires_at`, `viewed_at`, `recipient_name`, `recipient_phone`, `audit_trail` (JSON); index `(lead_id, created_at)` | not ported; the port log lists them per lead (D-190) |
| D-171 | `studio_signing_documents` (D-05) | the reusable scroll-and-accept documents a studio attaches to a link, per entity | `signing_documents`: `id`, `issuing_entity` (text), `kind` (`pdf_upload · rich_text`), `title`, `file_name`, `body`, `requires_scroll`, `requires_accept`, `accept_label`, `created_at`, `updated_at`, `deleted_at` | rich-text rows → `contract_templates` (D-133); PDF rows not ported (D-134). templates D-67 holds the library **Later** |
| D-172 | — | Not new tables: the signing evidence goes on `contracts` / `contract_bundles` (5.B); `member_signatures` follows QE D-111; the portal, projects and variation orders are Later (5.C) | | |

### 5.B Columns to add to existing 2.0 tables

| Id | 2.0 table | 1.0 source | 2.0 column | Type / unit | Note |
|---|---|---|---|---|---|
| D-175 | `contracts` · `contract_bundles` | `signature_data` | `signature_data` | text — a PNG / JPEG data URL | the drawn signature of an e-signed 1.0 contract; the signing page and Preview would print it where 2.0 prints the typed name. Without it the image survives only inside the stored PDF (Platform) |
| D-176 | `contracts` · `contract_bundles` | `signer_phone` | `signer_phone` | text, E.164 | the phone that proved control (the OTP or the portal session) |
| D-177 | `contracts` · `contract_bundles` | `signer_ip` · `signer_user_agent` · `signer_timezone` | same names | text | |
| D-178 | `contracts` · `contract_bundles` | `verification_method` | `verification_method` | text (`phone_otp`) | 1.0 wrote no other value (D-02 #22) |
| D-179 | `contracts` (+ `contract_bundles.signing_hash`) | `documents[i].hash`; the request's `document_hash` · `signing_hash` | `document_hash` (the document's own hash) · `signing_hash` (a one-contract request's; the whole-set hash on the bundle) | text, SHA-256 hex | D-25 |
| D-180 | `contracts` · `contract_bundles` | `audit_trail` | `audit_trail` | JSON — `AuditTrailEvent[]`, the ten events verbatim (D-23) | leads D §3.4 proposes the same column |
| D-181 | `contracts` | `document_acknowledgements[i]`; the first `link_opened` | `viewed_at` · `accepted_at` | ts | also carries 1.0's *viewed* state |
| D-182 | `contracts` | `documents[i].requires_scroll · requires_accept · accept_label` | same names | bool · bool · text | only with D-171, or if the page's gates are kept |
| D-183 | `contracts` | `documents[i].type` | `doc_kind` | text — `contract · tnc · document` | so a ported T&C reads as one (D-115) |
| D-184 | `contracts` · `contract_bundles` | `expires_at` | `expires_at` | ts | only if the expiry is kept (QE Q-33: the platform's) |
| D-185 | `contracts` · `contract_bundles` | `signed_pdf_url` · `signed_packet_path` | `signed_pdf_path` | text — a storage path | the executed PDF the platform serves; 2.0 keeps a name in `signed_copy` today |
| D-186 | `contracts` | `quote_total` (dollars) | `signed_total_minor` | integer, cents | the figure the client signed; lets 2.0 show it, and the money check (D-225) run after the port |
| D-187 | `contracts` | `payment_schedule` | `schedule_json` | JSON — `{label, pct, amountMinor, trigger}[]` | the split frozen at signing; QE D-107's alternative is a `quote_versions` row |
| D-188 | `contract_templates` | `studio_document_templates.is_default` (`contract`) | `is_default` | bool, one row at most | only if "the default contract joins every link" (D-129) is kept |
| D-189 | `contract_templates` | `company_id` (166) | `issuing_entity` | text | only if entity-scoped templates are kept (D-126) |

Not added: `prepared_by_display` (QE D-226, superseded); the quote's frozen signature is QE D-187's. Against leads D §3.4's list for `contracts` (`expires_at, viewed_at, signature_data, signer_ip, signer_user_agent, audit_trail, document_hash, signing_hash, verification_method, prepared_by_display`) this plan drops `prepared_by_display` and adds `signer_phone`, `signer_timezone`, `accepted_at`, `doc_kind`, `signed_pdf_path`, `signed_total_minor`, `schedule_json`, and the same evidence on `contract_bundles`.

### 5.C Not ported

| Id | 1.0 table / column | Reason |
|---|---|---|
| D-190 | unsigned requests: `cancelled`, `expired`, and `pending` / `viewed` past `expires_at` | no home without D-170; their documents come back in the lead's later request; the port logs them per lead |
| D-191 | `token`, `expires_at`, the OTP (Twilio Verify), `otp_rate_limits` + `check_otp_rate_limit` / `prune_otp_rate_limits`, `platform_config.bypass_otp`; `settings.quoteLinkExpiryDays` | **Platform** (QE Q-33); the expiry setting is **dead** (D-16) |
| D-192 | `quote_snapshot`, `quote_total`, `payment_schedule` as stored JSON | read by the checks (D-224, D-225) and by QE D-107 (a `quote_versions` row); kept only with D-186 / D-187 |
| D-193 | `client_selections` | **dead** (QE D-212) |
| D-194 | `prepared_by_display` | never read; **superseded** by `{prepared_by}` at print (QE D-226) |
| D-195 | `quote_ids[]`, `signing_mode`, the unselected quotes of a `variations` request | **superseded**: 2.0 bundles documents, not quotes; the selected quote → `from_quote_id` |
| D-196 | `studio_document_templates` `signing_flow` | **dead** (`docOrder` unread, D-04) |
| D-197 | `leads.contract_uploaded · contract_file_name · signature_request_id · signed_at`; `finalize_signed_mirror`; `trg_quote_totals_frozen`; the template-RPC refusals | **superseded** (QE D-215; leads D §3.4) |
| D-198 | `studios.settings.workflow.contractRequired`; the funnel's `requiresContract` | **superseded** by the Won step (leads Q-26: "No — the Won step is the mock") |
| D-199 | `projects.contract_file_*`, `project_files` in the `contract` folder, bucket `contract-files`, `from-signature`, the submit's auto-wire | **Later** (Projects) |
| D-200 | `variation_orders` links, `is_omission` on quotes and lines, variation-order signings, the contract value | **Later** (Finance; QE D-210) |
| D-201 | portal signing (`/my/engagement`, `homeowner_notifications` `signature_requested · contract_signed`) | **Later / Platform** (2.0's portal records have no pages, D-52) |
| D-202 | stored objects: `signed-quotes` (`{id}.pdf`, `{id}-packet.pdf`), `signing-documents`, `contract-files`, `member-signatures`, the composed PDFs in `lead-files` | **Platform**; 2.0 keeps names (`signed_copy`, `file_name`, `lead_files`) unless D-185 is built |
| D-203 | `member_signatures` images; `quotes.prepared_by_signature` | QE D-111, QE D-227, QE D-187 |
| D-204 | `features.casetrust_signing_step` and the `casetrust_acknowledged` event | **Later**: 2.0 has no CaseTrust step; the event survives inside `audit_trail` if D-180 is built |
| D-205 | `notifications` rows, `notification_templates`, `usage_events` | delivery and platform records (leads D §3.4) |

### 5.D The order a contract lands

One lead at a time, in this order, because of the references:

| Id | Step | Rows written | Rules |
|---|---|---|---|
| D-210 | Before | — | the Leads port (leads D §3.4: leads, members, `lead_files`, the portal records); the Templates port (map 04: `settings.brand` with `entities[]`, templates D-77; `contract_templates` from the `contract` rows, templates D-52 / templates D-167, tokens by D-132); the Quotes port (map 06; QE D-230…D-244 — QE D-238 lands a signed request's quotes *Signed* with `signed_at`) |
| D-211 | Classify the requests | — | newest first: **signed** = `signed_at IS NOT NULL AND signature_data IS NOT NULL`, whatever `status` reads (D-02 note 2); **live** = `pending` / `viewed`, `expires_at` in the future, not signed; **dead** = the rest (D-190). A request whose covered quotes are all `quote_type 'variation'` → Later (D-200). At most one live request per lead (D-02 note 1) |
| D-212 | Its documents | — | `documents[]` minus `type 'quote'`, in stored order; none for a row older than 120 (`[]`) or a quote-only request |
| D-213 | One document | `contracts` ×1 | `id` = the request's `id` (D-80); `title` = the document's `title`; `html` → `source 'composed'`, `body` = `content_html`; `pdf` → `source 'uploaded'`, `file_name` = the last segment of `file_path`, `body` NULL; `template_id` = the ported `contract_templates` row of the same title when `type 'contract'`, else NULL; `bundle_id` NULL |
| D-214 | Two or more documents | `contract_bundles` ×1 + `contracts` ×n | the bundle's `id` = the request's `id`; each document as D-213 but with `id` = the document's own `id` (D-114) and `bundle_id` = the request's `id`; the contracts' `created_at` = the request's `created_at` + the document's index in seconds (2.0 orders a bundle by `created_at`, `lib/contracts/queries.ts:167`) |
| D-215 | A signed request with no document | `contracts` ×1 | `id` = the request's `id`; `source 'uploaded'`; `file_name` = `signed_copy` = `{request id}.pdf` (the executed PDF, D-17); `title` = the signed quote's title (a naming choice, flagged) — QE D-107's row |
| D-216 | Every landed contract | — | `lead_id`; `recipient_name` = `client_name`; `recipient_phone` = `phoneDigits(client_phone)`, never through `digits()` (D-49); `contract_date` = the request's `created_at`; `from_quote_id` = `selected_quote_id`, else `quote_id`, else `quote_ids[0]` — **only when that quote landed *Signed***: a signed request whose quote a later signing demoted lands with an *Approved* quote (D-144) and would trip the check at `repair-demo-data.ts:1129`, so it takes NULL and a log line; `issuing_entity` = the entity's `name` unless it is the default entity (D-167); `created_by` = the covered quote's `submitted_by`, else the lead's first assignee (1.0 stores no sender; NULL prints "You" in Activity, D-47); `reminders`, `thank_you` false; `created_at` = `updated_at` = the request's `created_at` |
| D-217 | The stamps | — | signed → `status 'Signed'`, `sent_at` = `created_at`, `signed_at`, `signed_by` = `client_name` (D-02 note 3), `signed_nric` NULL, `signed_copy` = `{request id}-packet.pdf` when `signed_packet_path` is set (the packet holds every document), else `{request id}.pdf`; live → `status 'Sent to Client'`, `sent_at` = `created_at` |
| D-218 | The bundle's stamps | `contract_bundles` | `recipient_*` as D-216; `created_at` = `sent_at` = the request's `created_at`; `signed_at` · `signed_by` as D-217; `signed_nric` NULL; `created_by` as D-216 |
| D-219 | The evidence | 5.B columns | only if 5.B is built: D-175…D-187 from the request; each contract's `document_hash` = its document's `hash`; `viewed_at` / `accepted_at` from the matching acknowledgement |
| D-220 | A paper contract at the lead | `contracts` ×1 | when `leads.contract_uploaded` and `contract_file_name` is not `'client-signed-quote.pdf'`: `source 'uploaded'`, `status 'Signed'`, `file_name` = `signed_copy` = `contract_file_name`, `signed_at` = `sent_at` = the matching `lead_files` row's upload time (else the `contract_uploaded:` line's, else `leads.signed_at`), `title` = the file name without its extension, the lead's client as recipient |
| D-221 | A composed contract e-mailed | optional: `contracts` ×1 each | one per `lead_activity_log` line `contract_sent:{file}` with its `lead_files` row: `source 'uploaded'`, `status 'Sent to Client'`, `file_name` = the file, `sent_at` = the line's time, no body (the HTML was never stored, D-12). Otherwise they stay lead files (leads D) |
| D-222 | The Won log | `stage_logs.payload.wonContract` | = the landed Signed contract's `signed_copy` — the Won step lists signed contracts by `signed_copy ?? '{title}.pdf'` (`panels.tsx:287-291`); the Leads port writes the log (leads D §3.4) |
| D-223 | The quotes | none | already *Signed* by the Quotes port (QE D-238); writing contract rows directly never calls `signQuoteThrough`, which would skip a Signed quote anyway (`lib/quotes/sign.ts:15-17`) |
| D-224 | Check — hashes | port log | `sha256(stableStringify(quote_snapshot))` = `document_hash`; each document's `sha256("{render}\n{title}\n{body}")` = its `hash`; with acknowledgements, `sha256(hashes joined by "\|")` = `signing_hash` (D-25). A difference = the record changed after it was sent |
| D-225 | Check — money | port log | `quote_total × 100` against the signed quote's `amount_minor` (a one-quote request), or the quote's own snapshot entry `total × 100` (several) — the 307 repair's rule (D-18). Each difference names its cause (a GST re-roll, the document discount, optional lines; QE D-242) |
| D-226 | Check — the repair rules | `npm run db:repair`'s checks | every Signed contract with `from_quote_id` names a Signed quote (`repair-demo-data.ts:1129`); every Won lead has a Signed contract (`:1160`); no composed contract without a body (`:1148`); no contract without a recipient (`:1149`); none older than its lead (`:1162-1163`) |
| D-227 | Check — people and phones | port log | `recipient_phone` passes `isSgPhone`; `signed_by` is set on every signed row landed from a request; `issuing_entity` names an entry of `brand.details.entities[]`; `created_by` is a member |
| D-228 | Check — tokens | port log | no ported `contract_templates` body keeps a `{{…}}` outside D-132's map (`start_date`, `company_gst_number`, `company_country` have no chip); a body landed from a signing may hold the blanks D-02 note 7 left — flag the documents whose source template used those six tokens |
| D-229 | What changes in the data | — | 1.0 froze a document when it was sent (resolved text + a hash); 2.0 re-resolves chips on every render (D-45). A ported body is resolved text, so it stays as signed; a 2.0-authored one does not. The executed PDF and the evidence stay on the platform unless 5.B is built |

### 5.E Demo data — 1.0 seeds vs 2.0 seeds and repairs

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-230 | `118:22-43` | `Default Terms & Conditions`, `Default Contract` (the parties, then three short clauses — Scope · Commencement · Termination — with D-28's tokens), `Default Signing Flow` — for the studios existing when 118 ran | R34 (`repair-demo-data.ts:838-859`): `Interior Design Service Agreement` (11 clauses, chips and sign fields; REG-534 invented copy) and `Variation Order`; R26's terms library (QE D-254) | different copy: 1.0's contract is a stub, 2.0's the full starter |
| D-231 | none — no seed inserts `quote_signature_requests`, `studio_signing_documents` or `member_signatures`, or sets `contract_uploaded` (grep of both migration sets, `scripts/seed/`, `scripts/tenants/`) | — | `scripts/seed-contracts.ts:11-19` (Olivia's Draft); R4/R5 (`:189-222`, a Signed `General Contract Agreement` per Won lead); R34 (bodies, recipients, the template link); R49 (`:1111-1123`, quote links and dates) | 2.0's rule — every visible state backed by its records (REG-343) — has no 1.0 counterpart |
| D-232 | Flo `100:789-790`; `scripts/tenants/flo-design/seed.mjs:648` | a `quote.signature_requested` notification with no request behind it (QE D-252) | R40: `new_lead` rows only | 1.0's row points at nothing |
| D-233 | `sb:20260314000001:101-105` | the `quote.signature_requested` e-mail and text templates | `lib/notifications/model.ts:84-85` (`quote_signed` e-mail and WhatsApp) | a different event: 2.0 tells the studio when the client signs, and nothing on send |
| D-234 | — | — | R27 (`:656-660`): the signed-in member's typed signature, the one the signing pages print | 2.0 only |
| D-235 | — | — | `fixtures/baseline.json` (2026-09-24T19:18:51Z): `contracts` 4 (Signed 3 · Draft 1; composed 4; `template_id` on 4; `from_quote_id` on 3; `signed_by` / `signed_nric` on 0; `bundle_id` on 0); `contract_bundles` 0; `contract_templates` 2; members with a signature 1; `quotes` Signed 3 (all with `signed_at`); `notifications` 3 (`new_lead`) | a port adds rows to `contracts`, `contract_bundles`, `contract_templates` and the Won payloads in `stage_logs` |
| D-236 | `scripts/finance/307_*.sql` (probe · preflight · repair signed totals · repair VO mirrors · verify) | repairs, not demo rows | — | the port reuses their certificate rule (D-225) |

## Uncertain / not verified

- **Rows that are not `single`.** The dialog pins `signing_mode = 'single'` (`contract-flow-dialog.tsx:99`) and is the request route's only caller (`src/lib/queries/leads.ts:1464`); `bundle` / `variations` rows could exist only from a build where the flag was on. No live database was queried.
- **How many signed requests now read `expired`.** The GET's overwrite (D-02 note 2) is read from the code; the count per environment needs a query. The 262 and 307 backfills, which filter on `status = 'signed'`, may have missed such rows.
- **The `signing-documents` bucket** has no migration in either set; its existence and policies come from a test's comment (`src/__tests__/scoped-client-storage-guard.test.ts:11-35`). An environment without it holds no library PDFs.
- **The composed contract sent for signature** (D-01 (c)): at this commit the route ignores `contractBodyHtml` whenever `documents` is non-empty, and the dialog always sends `documents` (D-02 note 5). Read from the code, not executed; an older build may have used it, so a `type 'contract'` document titled "Contract Agreement" may carry a composed body.
- **Entity-scoped default templates** would make the legacy path's `.maybeSingle()` return nothing (D-02 note 6). Not executed; whether any studio has entity-scoped `tnc` / `contract` defaults is unknown.
- **The six tokens blanked at signing** (D-02 note 7) come from reading `substituteVariables`; no stored row was inspected.
- **"Never written / never read"** for `verification_method`, `client_selections`, `prepared_by_display` and `signing_flow.docOrder` are greps of `src/` at this commit; a script, an SQL console or another branch could touch them.
- **`signer_timezone` and the acknowledgement timestamps** come from the browser and are not validated by the server.
- **Drift in the types**: `DbProject.contract_file_url` says "Migration 111" (the column is 140's); `DbQuoteSignatureRequest` lacks `prepared_by_display` and the `cancelled` status; the stored `quote_snapshot` is stored rows, not the `QuoteLineItem[]` the types name. The migrations and the routes were taken as the truth.
- **The milestone-schedule warning** (`src/lib/finance/milestone-schedule.ts:52-66`) contradicts the request route, which carries `type` for a fixed row (D-24); the route was taken as the truth.
- **The ×1.09 re-roll** (D-18) is quoted from the 307 repair script's header; the affected rows per environment were not queried.
- **2.0 rules read, not run**: the tab's status menu keeping the signing stamps and neither un-sign clearing `signed_nric`; a Draft contract being signable on its page; `digits()` truncating a `+65` number (D-49).
- **2.0 is a moving target**: the working tree carries uncommitted rounds (the quote editor's `drizzle/0038…0041`); the baseline figures are from `fixtures/baseline.json` (`takenAt` 2026-09-24T19:18:51Z), not `local.db`.
- **D-215's title and D-221** are naming and scope choices for the owner; this file records where each would land, not whether to do it.
