# OpenMaison 1.0 — Quote X-Ray inventory · Slice C: everything around the X-Ray

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. Nothing was run; git history was read with `git log` / `git show` only.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader, only named here. Readers of this audit: **A** = the screens (tool page, upload card, result views, public page layout); **B** = the engine (parse, match, real gap, verdict, synthesis, brand extraction maths); **D** = the data model. Earlier audits: "Leads B-nn / C-nn" = `../leads-1.0-inventory/B-detail.md` / `C-engine-settings-touchpoints.md`; "QE D-nn" = `../quote-editor-1.0-inventory/D-data-model.md`. Abbreviations: `CREATE` = `src/app/api/quote-xrays/create/route.ts`; `IDR` = `src/app/api/quote-xrays/[id]/route.ts`; `SHARE` = `src/app/api/quote-xrays/[id]/share/route.ts`; `PUB` = `src/app/api/quote-xrays/share/[token]/route.ts`; `PUBPAGE` = `src/app/sign/quote-xray/[token]/page.tsx`; `REC` = `src/app/api/quote-xrays/records/route.ts`; `REC1` = `src/app/api/quote-xrays/records/[id]/route.ts`; `PAGE` = `src/app/(main)/tools/quote-xray/page.tsx`; `HOOKS` = `src/lib/queries/quote-xrays.ts`; `BDS` = `src/lib/quote-xray/brand-dossier-service.ts`; `SCAN` = `src/lib/quote-xray/brand-scan.ts`; `CRON` = `src/app/api/cron/brand-dossier-scan/route.ts`; `ADMINAPI` = `src/app/api/admin/brand-dossiers/route.ts`; `ADMINPAGE` = `src/app/admin/brand-dossiers/page.tsx`; `LDD` = `src/components/leads/lead-detail-drawer.tsx`; `AC` = `src/lib/access-control.ts`; `MBASE` = `supabase/migrations/20260519000001_quote_xrays.sql`; `M217` / `M272` / `M277` / `M278` = `scripts/migrations/217_lock_quote_xrays.sql` / `272_quote_xrays_outcome.sql` / `277_quote_xrays_verdict_objective.sql` / `278_brand_dossiers.sql`.

## Vocabulary

- **X-Ray row** — one `quote_xrays` row per run (MBASE:11-35; D). The UI has said "comparison" since 2026-08-14; "run", "X-Ray" and "comparison" mean the same row here.
- **Verdict row** — `objective = 'verdict'`, `ai_synthesis.kind = 'verdict'`: the rebuilt one-answer flow (M277, 2026-08-14). The only kind the UI still creates or lists.
- **Legacy row** — `objective` = `gap-finder` · `sales-justifier` · `market-intel` · `package-ladder` (2026-05-14 → 2026-08-14). A **combined row** is a legacy run analysed against all four, stored with `objective` = the first fitting one and `ai_synthesis.kind = 'combined'` (CREATE:344-378).
- **Lead-bound / standalone** — `lead_id` set / null.
- **Own side from the lead** — the lead's digitized quote copied into `inputs` at run time, tagged `sourceFileName = "digitized:<quoteId>"` (CREATE:590; C-50).
- **Session** — the `qanvast_session` cookie, verified to `{ userId, studioId }` with no tags or role (C-04). **Scoped client** — `scopedSupabase(studioId)`: a per-request JWT carrying a `studio_id` claim, filtered by RLS (C-14). **Service role** — the server client that bypasses RLS.
- **Shareable row** — `isShareableXray`: a sales-justifier row, or a combined row holding a sales-justifier slice (C-34). **Share link** — `/sign/quote-xray/<token>`, valid 24 h.
- **Brand dossier** — a platform-wide, cross-studio cache of one brand's web-scanned findings (`brand_dossiers`, M278). **Ammo** — the per-run snapshot of dossier findings on `quote_xrays.brand_ammo`. **Negative cache** — a dossier with `status = 'empty'`. **Kill switch** — `platform_config` key `quote_xray_brand_ammo_enabled`.
- **Outcome** — the win/loss columns `outcome` · `outcome_note` · `outcome_at` (M272).
- **Platform admin** — a Qanvast staff account (`admin_users`) with cookie `qanvast_admin_session` carrying `role` and `allowedPages` (C-67, C-68).
- **Market observations** — rows appended to the cross-studio `market_quote_observations` table after a run (C-75).

---

## Timeline and surfaces

### C-01 · Timeline, 2026-05-14 → 2026-08-17
- Where: `git log` on `MBASE` (`b29f1b6cd`, 2026-05-14), `M217` (`ae819479b`, 2026-06-22), `M272` (`3369bab8c`, 2026-07-27), `M277`/`M278` + `shareability.ts` + `CRON` + `ADMINPAGE` + `lead-quotes` route (`d000261fa`, 2026-08-14), `parse-file` route (`7d5a100b7`, 2026-08-17); `LDD` link history (`3f63999ba`, 2026-05-15); `src/components/landing/v2/changelog-data.ts:396-411`.
- Entry: —
- Does: 2026-05-14 — launch: four objectives, the table plus `market_quote_observations`, the share mint and public route; changelog entry the same day. 2026-05-15 — a drawer link *"X-Ray this quote"* (`?objective=gap-finder`). 2026-06-22 — RLS lock and the scoped routes. 2026-07-27 — win/loss outcomes with an outcome picker on the result. 2026-08-14 — the Verdict rebuild (one screen, one competitor, WhatsApp draft), brand dossiers with cron and admin page, the lead-quotes probe, the combined-row share fix; `OutcomeSelector.tsx` and `UploadStep.tsx` deleted; the drawer link renamed *"Beat this quote"*. 2026-08-17 — file parsing split into one request per file (413 fix, "shipped on the fork lines in 82d36fa1 but never reached prod", `parse-file/route.ts:10-12`).
- Rules: every legacy route still answers; only the UI moved on (C-08, C-57).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-02 · Every way in and out
- Where: `src/components/layout/app-sidebar.tsx:19-29`; `LDD:1902-1911`; `PAGE:36-38`; `PUBPAGE`; `ADMINPAGE`; `vercel.json:61-62`; `src/components/quote-xray/SendToClientDialog.tsx:63-67`; `src/components/quote-xray/shared/FixInDigitizerLink.tsx:10-29`; `src/components/quote-xray/views/SalesJustifierView.tsx:37-39`.
- Entry: —
- Does: **In** — the desktop sidebar's Tools › *"Quote X-Ray"* (C-23); the lead drawer's *"Beat this quote"* (C-48); deep links `/tools/quote-xray?leadId=` and `?xrayId=`; a typed URL; the public `/sign/quote-xray/<token>` (C-37); Admin › *"Brand Dossiers"* (C-67); the hourly cron (C-65). **Out** — *"Send comparison to client"* → WhatsApp's share page (C-38); *"Fix in Quote Digitizer"* (C-53); *"Share with client"* on legacy sales rows (C-33); *"Download PDF"* on legacy rows (C-39); source links to forums in the ammo panel (C-70).
- Rules: absent from the topbar tools grid, the phone bottom nav, the homeowner portal, mAIson's tools, notifications and every activity log (C-23, C-71, C-72, C-79).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Routes and their checks

### C-03 · The edge (`src/proxy.ts`)
- Where: `src/proxy.ts:147-151, 153-205, 316-318, 393-396, 431-444, 461-477`.
- Entry: every request.
- Does: `/tools/quote-xray` and every `/api/quote-xrays/*` path need a valid HMAC `qanvast_session` (401 JSON *"Not authenticated"* / *"Invalid session"* for APIs, redirect to `/login` for pages). `/api/quote-xrays/share/*` passes untouched (the token is the secret). `/sign/quote-xray/<token>` passes under the generic `/sign` segment rule written for quote signing. `/admin/brand-dossiers` needs `qanvast_admin_session` and, unless `super_admin`, the page key `brand-dossiers` in `allowedPages` (else redirect to the first allowed admin page or `/admin/login`); `/api/admin/brand-dossiers` needs any valid admin cookie at the edge and checks the page itself (C-68). `/api/cron/brand-dossier-scan` passes the edge and checks `CRON_SECRET` itself (C-65).
- Rules: `BYPASS_AUTH=true` outside production skips every non-admin check. The edge checks only that the cookie is signed; it never looks at tags.
- Data: —
- States: 401 / redirect.
- Words: *"Not authenticated"*, *"Invalid session"*.
- Reachable: yes.

### C-04 · The session is the only studio check
- Where: `src/lib/session.ts:202`; `src/lib/api-auth.ts:23-34`; `CREATE:169-174`; `src/app/api/quote-xrays/parse-file/route.ts:27-32`; every other route's `requireSession` call.
- Entry: —
- Does: each studio route verifies the cookie to `{ userId, studioId }` and builds a scoped client from `studioId`. No route reads tags, a role, `studio_roles`, the member's data scope, whether the member is still active, the studio's plan or the page-visibility switch.
- Rules: anything the UI hides from a role (Accounting, a switched-off page, the designer's assigned-only lead list) is still callable by that member's session (C-18, C-24).
- Data: —
- States: 401.
- Words: —
- Reachable: yes.

### C-05 · Route table
- Where: the routes below.
- Entry: —
- Does: every route and page the X-Ray owns.

| Method | Path | Checks | Returns |
|---|---|---|---|
| POST | `/api/quote-xrays/parse-file` | edge + route session; ≤10 MB; PDF / PNG / JPEG / CSV / XLSX | the parsed document JSON (not stored) — C-06 |
| POST | `/api/quote-xrays/create` (`objective: "verdict"`) | session; body shape; currency vs studio region; scoped insert | the saved row (UI shape) — C-07 |
| POST | `/api/quote-xrays/create` (four objectives / `"combined"`) | same; 2–3 quotes | the saved row — C-08 (no UI caller) |
| GET | `/api/quote-xrays/lead-quotes?leadId=` | session; scoped | `{ quotes }` — C-09 |
| GET | `/api/quote-xrays/records[?leadId=]` | session; scoped | `{ xrays }` — every studio row, full, unbounded — C-10 |
| GET | `/api/quote-xrays/records/[id]` | session; scoped | the row or 404 — C-11 |
| PATCH | `/api/quote-xrays/[id]` `{ status }` | session; scoped; status in list | the row — C-12 (no UI caller) |
| PATCH | `/api/quote-xrays/[id]` `{ action: "unmerge-row", rowIndex }` | session; scoped; row is AI-merged | the row — C-13 |
| PATCH | `/api/quote-xrays/[id]` `{ action: "attach-lead", leadId }` | session; scoped; lead in studio | the row — C-47 (no UI caller) |
| PATCH | `/api/quote-xrays/[id]` `{ action: "set-outcome", outcome, outcomeNote }` | session; scoped; outcome in list | the row — C-44 (no UI caller) |
| DELETE | `/api/quote-xrays/[id]` | session; scoped | `{ ok, id }` — C-40 |
| POST | `/api/quote-xrays/[id]/share` | session; scoped; shareable | `{ token, expiresAt }` — C-32 |
| GET | `/api/quote-xrays/share/[token]` | none (token); service role; shareable; not expired | the row minus `brandAmmo` — C-36 |
| GET | `/api/cron/brand-dossier-scan` | `Authorization: Bearer <CRON_SECRET>` (fails closed in production); kill switch | `{ pending, staleRefreshed, scanned, failed }` or `{ skipped, reason }` — C-65 |
| GET / PATCH | `/api/admin/brand-dossiers` | admin cookie + page `brand-dossiers` (or `super_admin`) | `{ dossiers }` (≤300) / `{ dossier }` — C-68 |
| page | `/tools/quote-xray` | session; tag-based page access; page-visibility switch | the tool — C-20, C-24 |
| page | `/sign/quote-xray/[token]` | none | the public comparison — C-37 |
| page | `/admin/brand-dossiers` | admin page guard | dossier review — C-67 |

- Rules: no route has a rate limit or a plan check, and no studio route a role check (C-19, C-25, C-26).
- Data: —
- States: per row.
- Words: —
- Reachable: as marked.

### C-06 · `POST /api/quote-xrays/parse-file`
- Where: `src/app/api/quote-xrays/parse-file/route.ts:25-64`; `src/lib/quote-parse/parse-file.ts:12-19, 159-249`; callers `HOOKS:13-25, 191-200` (and the dead `HOOKS:126-138`).
- Entry: the tool's submit, once per uploaded file, in parallel.
- Does: reads multipart `file`, resolves the studio's region, runs the shared quote parser (hand-off B) and returns the parsed document. Nothing is stored: the uploaded competitor PDF is kept nowhere — only its parse later lands in `inputs` (C-07).
- Rules: session only. The client prefixes failures with the slot (*"Competitor quote (<file>): …"*, *"Your quote (<file>): …"*). With no `OPENROUTER_API_KEY` the parser returns a fixed dry-run document with 200 (C-29).
- Data: none written.
- States: 401; 400 unreadable form / no file; 413 over 10 MB; 415 wrong type; 422 unusable model output or timeout; 500.
- Words: *"Not authenticated"*, *"Could not read the uploaded file."*, *"No file provided"*, *"File too large. Maximum size is 10MB."*, *"Unsupported file type. Upload a PDF, image, CSV or Excel file."*, *"This file took too long to read — it may be a large scan or photo. Try a clearer, text-based PDF, or add items manually."*, *"Could not read this document (the AI returned an unusable response). It may be a scan or photo — try a text-based PDF, or add items manually."*, *"Could not parse document. Try again or add items manually."*
- Reachable: yes.

### C-07 · `POST /api/quote-xrays/create` — the verdict flow
- Where: `CREATE:162-202, 534-752`; caller `HOOKS:172-229` from `PAGE:107-135`; tests `src/__tests__/quote-xray-verdict-route.test.ts:158-232`.
- Entry: the tool's submit (*"For a lead"* or *"Upload 2 quotes"*).
- Does: body `{ objective: "verdict", compParsed, compFileName, compLabel?, ownParsed?, ownFileName?, ownLabel?, leadId?, ownQuoteId? }`. Own side = `ownParsed` if sent, else the lead's quote through the scoped loader (C-50); competitor = `compParsed`. Labels: own = the studio's name (`studios.name`) else *"Our quote"*; competitor = the parsed letterhead (`vendor`) else the sent label (the page sends *"The other quote"*, `PAGE:113`) else *"Competitor quote"*. Currency check on uploaded documents only; match, AI match refinement, benchmarks, brand extraction and the verdict (hand-off B); insert with `objective 'verdict'`, `status 'ready'`, `created_by = session.userId`; then market observations (C-75), one usage event (C-73) and, after the response, brand enrichment (C-60).
- Rules: session only; no role, plan, quota or rate limit. `leadId` is not checked when `ownParsed` is sent (C-17). A lead with no quote answers 422 `NO_LEAD_QUOTE`, which the page turns into the own-quote dropzone (`PAGE:127-129`). An `ownQuoteId` on another lead also answers `NO_LEAD_QUOTE` (the scoped query finds nothing), with the same "no digitized quote" words. `maxDuration` 120 s (`CREATE:51-52`).
- Data: `quote_xrays` insert; `market_quote_observations` insert; `usage_events` insert; `studios.name` read.
- States: 401; 400 `BODY_PARSE_FAILED` · `MISSING_COMP_FILE` · `NO_OWN_SOURCE` · `currency_mismatch`; 422 `NO_LEAD_QUOTE` · `DEGENERATE_COMPARISON`; 500 `LEAD_QUOTE_LOAD_FAILED` / insert failure / `UNHANDLED`; 502 `synthesis_failed`.
- Words: *"Could not read the request. Parse your files first, then retry."*, *"Missing the competitor's quote file."*, *"Provide your own quote — link a lead with a digitized quote, or upload your quote file."*, *"Could not load this lead's quote. Try again, or upload your quote file."*, *"This lead has no digitized quote yet — upload your quote file to compare."*, *"Cross-currency comparisons aren't supported. Studio currency: <X>. Detected: <list>."*, *"The comparison couldn't be completed. Please try again in a moment."*, *"Couldn't compare these quotes — one of them has no readable totals."*, *"Failed to save the comparison"*, *"Quote X-Ray failed to complete"*; page fallback toast *"Failed to run the comparison"*.
- Reachable: yes.

### C-08 · `POST /api/quote-xrays/create` — the legacy and combined flows
- Where: `CREATE:59-89, 96-160, 204-442`; the only client `HOOKS:112-163` (`useCreateQuoteXray`, no caller since 2026-08-14).
- Entry: none in the UI.
- Does: `objective` ∈ the four legacy values or `"combined"`; `quotes[]` of 2–3 pre-parsed documents with `label` / `role` (`own` · `own-version` · `competitor`) / `sourceFileName`; own quotes moved first; currency check; combined runs build all four syntheses in parallel, drop the failures, record the *weak* objectives and store `objective` = the first fitting one. Observations are appended only for Market Intel and combined runs.
- Rules: session only; `leadId` is written unchecked; no usage event. Still live for a direct call — the only way a new legacy (or shareable) row can appear today.
- Data: `quote_xrays`; `market_quote_observations`.
- States: 400 `Invalid objective` / count / missing slot / `currency_mismatch`; 502 `synthesis_failed`; 500.
- Words: *"Invalid objective"*, *"This requires <min>–3 quotes."*, *"Missing parsed quote at slot <i>"*, *"Cross-currency comparisons aren't supported in v1. Studio currency: …"*, *"The AI analysis couldn't be completed. Please try again in a moment."*, *"Failed to save X-Ray"*.
- Reachable: no (dead from the UI; the API answers).

### C-09 · `GET /api/quote-xrays/lead-quotes`
- Where: `src/app/api/quote-xrays/lead-quotes/route.ts:15-51`; caller `HOOKS:92-104` from `src/components/quote-xray/VerdictUpload.tsx:67`.
- Entry: picking a lead in *"For a lead"* mode.
- Does: returns the lead's `standard` quotes (`id, label, quoteNumber, status, isPrimary, totalCents, updatedAt`), primary first then newest; a blank label falls back to the quote number, then *"Quote"*. The card then shows none (upload fallback), one (*"Defending: …"*) or a picker (*"Which quote is the client comparing against?"*) — hand-off A.
- Rules: scoped — a lead of another studio returns `[]`. No assignment check: any member can read the quote list of any studio lead by id (C-18).
- Data: `quotes` read.
- States: 400; 500.
- Words: *"Missing leadId"*, *"Lookup failed"*, *"Internal error"*.
- Reachable: yes.

### C-10 · `GET /api/quote-xrays/records` — the studio list
- Where: `REC:43-91`; callers `PAGE:83, 321`, `src/components/quote-xray/QuoteXrayHistory.tsx:17`.
- Entry: every visit to the tool (history panel, result numbering).
- Does: `select("*")` over the studio's rows, newest first, optional `?leadId=` filter; maps each row to the UI shape (inputs, match matrix, synthesis, `brandAmmo`, share token and expiry, outcome, note).
- Rules: no limit, no pagination, no author filter; the UI never passes `leadId` (C-52). Every member gets every studio run in full, including runs on leads they are not assigned to (C-18).
- Data: `quote_xrays` read.
- States: 401; 500 (the Postgres message).
- Words: *"Internal server error"*.
- Reachable: yes.

### C-11 · `GET /api/quote-xrays/records/[id]`
- Where: `REC1:41-72`; caller `HOOKS:56-77` from `PAGE:69-78`.
- Entry: opening a result, a history row or `?xrayId=`.
- Does: returns one row in the UI shape; RLS-hidden or missing → 404, which the page shows as *"X-Ray <id> could not be loaded."* with *"Start a new X-Ray"* (`PAGE:326-332`).
- Rules: session only. The page polls it every 8 s for up to 90 s after a fresh verdict until `brandAmmo` arrives (C-70).
- Data: `quote_xrays` read.
- States: 401; 404; 500.
- Words: *"Not found"*.
- Reachable: yes.

### C-12 · `PATCH /api/quote-xrays/[id]` — status
- Where: `IDR:22-23, 186-205`; client `HOOKS:253-275` (`useUpdateQuoteXrayStatus`, no caller); test `src/__tests__/quote-xrays-scoped-api.test.ts:154-193`.
- Entry: none in the UI.
- Does: sets `status` to `draft` · `ready` · `shared` · `archived` and bumps `updated_at`.
- Rules: any value from any value — no state machine; nothing reads the status (C-41). The test pins that a body `studio_id` never reaches the update.
- Data: `quote_xrays.status`.
- States: 400 invalid JSON / status; 404; 500.
- Words: *"Invalid JSON"*, *"Invalid status"*, *"Update failed"*.
- Reachable: no (dead).

### C-13 · `PATCH /api/quote-xrays/[id]` — un-merge an AI match
- Where: `IDR:147-184`; client `HOOKS:279-297` from `src/components/quote-xray/views/GapFinderView.tsx:28, 156-163`; `src/lib/quote-xray/ai-match.ts` (`splitMergedRow`, hand-off B).
- Entry: the legacy Gap Finder table's un-merge control (hand-off A).
- Does: the server reloads the stored `match_result`, splits the requested AI-merged row back into its originals and saves the matrix.
- Rules: server-authoritative (the client sends only the index). The synthesis is not re-run, so the headline and points keep the merged numbers (hand-off B). The verdict view's evidence table gets no un-merge handler (`src/components/quote-xray/VerdictView.tsx:175-181`) — only legacy rows can be corrected, and those open only by `?xrayId=` (C-57).
- Data: `quote_xrays.match_result`.
- States: 400 bad index / no matrix / not an AI merge; 404; 500.
- Words: *"Invalid rowIndex"*, *"No match matrix to edit"*, *"That row is not an AI-merged match"*, *"Lookup failed"*.
- Reachable: legacy rows only.

---

## Tenant isolation

### C-14 · RLS on `quote_xrays`
- Where: `M217:31-45`; `MBASE:11-46`; `scripts/security/rls-manifest.json:68`; `REC:1-14`; `IDR:5-9`; `HOOKS:27-30`.
- Entry: —
- Does: row-level security is enabled and forced; one policy `scoped` (`FOR ALL`, `USING` and `WITH CHECK` `studio_id = (auth.jwt() ->> 'studio_id')::uuid`); all DML revoked from `anon`, granted to `authenticated`. Every studio route talks through the scoped client, so another studio's id reads as 0 rows (404), and inserts take `studio_id` from the session.
- Rules: RLS is the only tenant filter — the routes say so ("RLS is the backstop"). The route tests mock the client; "RLS itself is verified separately, live on staging" (`quote-xrays-scoped-api.test.ts:7`). Since 2026-06-22 the browser no longer reads the table directly. The policy is per studio; nothing narrows by member (C-18).
- Data: `quote_xrays`.
- States: 404 for a hidden row.
- Words: —
- Reachable: yes.

### C-15 · Where the service role is used
- Where: `PUB:15-20`; `CREATE:325-336, 495-532, 664-670`; `BDS:11-14, 125-226, 284-290`; `CRON:32`; `ADMINAPI:23, 55`; `M217:18-27`; `M278:43-45`; `scripts/migrations/264_platform_table_lockdown.sql:21, 61`.
- Entry: —
- Does: four paths bypass RLS: the public token lookup (C-36); the market-observation insert (C-75); the benchmark read of `platform_market_rates` (hand-off B); every `brand_dossiers` read and write (C-59). The per-run ammo write goes back through the scoped client.
- Rules: `brand_dossiers` is revoked from `anon` and `authenticated` (service role only); `market_quote_observations` carries no `studio_id` and is service-role only.
- Data: as listed.
- States: —
- Words: —
- Reachable: yes.

### C-16 · What the tests pin, and what they don't
- Where: `src/__tests__/quote-xrays-scoped-api.test.ts:94-227`; `src/__tests__/quote-xray-verdict-route.test.ts:158-302`; `src/__tests__/quote-xray-outcomes.test.ts:6-24`; `src/__tests__/quote-xray-brand-dossier.test.ts:25-129`; `src/__tests__/quote-xray-brand-enrichment.test.ts:147-199`; `src/__tests__/quote-xray-brand-scan.test.ts:13-110`; `src/__tests__/trial-anonymous-routes.test.ts:1-185`.
- Entry: —
- Does: pinned — 401 without a session on list, one, PATCH, share mint, create and lead-quotes; the scoped client keyed to the session's studio; a body `studio_id` ignored; 404 when RLS hides a row; invalid status 400; share mint on a sales-justifier row returns a token and sets `shared`; share mint 400 on a gap-finder row; verdict create's `MISSING_COMP_FILE`, `NO_OWN_SOURCE`, `NO_LEAD_QUOTE`, the lead-first and standalone happy paths (tenant stamp, observations written, competitor label from the letterhead, the real-gap numbers, no `{share_link}` in the draft); lead-quotes mapping; attach-lead validation and detach; the outcome allowlist; dossier classes, ammo building, enrichment paths (miss, fresh, kill switch off, disabled, no brands); the cite-or-drop validator.
- Rules: not covered — DELETE; the parse-file route; the public resolve (expiry 410, not-shareable 400, the `brandAmmo` strip, the payload, C-36); set-outcome and un-merge routes; `isShareableXray` on combined and verdict rows; the legacy create path; the cron and admin routes. `trial-anonymous-routes.test.ts` covers the public Visualizer trial and names the verdict-route test only as a mocking pattern (line 27): there is no anonymous or trial X-Ray (C-25).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-17 · A run's `lead_id` is written unchecked
- Where: `CREATE:209, 397-409` (legacy); `CREATE:546, 576-591, 694-706` (verdict); `MBASE:14`; `IDR:92-121` (attach-lead, checked).
- Entry: a direct API call.
- Does: `leadId` from the body goes to `lead_id` as sent on the legacy path always, and on the verdict path whenever the own quote is uploaded. Only the lead-first verdict path checks it implicitly (another studio's or a wrong lead finds no quote → 422). attach-lead does check (scoped `leads` lookup → 404).
- Rules: the RLS `WITH CHECK` covers `studio_id` only, and the foreign key to `leads(id)` is checked without RLS, so a direct call can bind a run to another studio's lead id (the run stays in the caller's studio, invisible to the other). A made-up id fails the insert and the 500 body carries the Postgres message in `details` — an existence probe for lead ids. The UI cannot do this: its picker lists the studio's own leads.
- Data: `quote_xrays.lead_id`.
- States: 500.
- Words: *"Failed to save the comparison"*, *"Failed to save X-Ray"*.
- Reachable: API only.

### C-18 · No member scope — assigned designers and managers see every run
- Where: `REC:66-91`; `src/app/api/quote-xrays/lead-quotes/route.ts:15-46`; `CREATE:542-591`; `IDR:216-239`; `src/context/app-context.tsx:121-124, 1178`; `src/lib/leads/manager-hierarchy.ts:181`; `src/app/api/leads/records/route.ts` (manager scope); `scripts/migrations/109_seed_default_system_roles.sql:87` (`"dataScope": "assigned"`).
- Entry: —
- Does: a designer's lead picker is filtered in the browser to their assigned leads, and the Dyel-only manager hierarchy narrows the lead list on the server — but no X-Ray route applies either. Any member can list every studio run in full (the own quote's lines from colleagues' leads, the competitor's whole parsed quote, the talking points, the WhatsApp draft), read any studio lead's quote list by id, run an X-Ray against any studio lead id and delete a colleague's run.
- Rules: the history panel shows the studio's five newest verdict runs to everyone, without author or lead (C-56). The role's `dataScope` is never read.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Roles and page access

### C-19 · No X-Ray permission exists
- Where: `AC:212-230` (`PERMISSION_SLUGS`); `scripts/migrations/109_seed_default_system_roles.sql:24-36, 57-69, 88-100, 118-130` (the `actions` maps); the routes (C-04).
- Entry: —
- Does: there is no X-Ray entity in `RolePermissions.actions` and no slug. Running, sharing, deleting and seeing every run are not distinguished by role. The only role-bearing gate is page access (C-20); the dossier admin has its own platform grant (C-68).
- Rules: —
- Data: `studio_roles.permissions` (no X-Ray key).
- States: —
- Words: —
- Reachable: n/a.

### C-20 · Page access — tag-based, client-side
- Where: `AC:64-130` (line 95: `"tools/quote-xray": ["owner", "admin", "id"]`), `AC:134-169`; `src/app/(main)/layout.tsx:131-146`; `AC:190-195` (`getDefaultRoute`).
- Entry: opening `/tools/quote-xray`.
- Does: the main layout's effect redirects a member whose tags hold none of owner / admin / id (Accounting-only) to their default route (`/finance/pipeline`). The call passes tags only (`canAccessPage(user.tags, pathname)`), so a studio's custom role `pages` map never decides the X-Ray (C-21).
- Rules: a browser-side redirect; the APIs do not check (C-04). The `manager` tag layers on `id` and changes nothing here.
- Data: `studio_members.tags`.
- States: redirect.
- Words: —
- Reachable: yes.

### C-21 · Role `pages` maps — the X-Ray rides on "tools", and nothing reads it at runtime
- Where: `scripts/migrations/109_seed_default_system_roles.sql:15-19, 49-52, 82-85, 114-117`; `scripts/migrations/090_studio_customization_engine.sql:237, 255, 273`; `AC:137-153, 197-203`; `src/components/settings/team-settings.tsx:657-673`.
- Entry: Accounts › Team (the access preview).
- Does: seeded roles carry `pages.tools = true` for owner, admin and designer, and no `tools` key for accounting; there is no `tools/quote-xray` key, so a `pages` lookup would fall back to `tools`. No runtime caller passes role permissions to `canAccessPage` for the Tools group or the route guard. Accounts › Team's access preview reads the role's `pages[route]`, the runtime reads tags.
- Rules: switching `tools` off in a custom role changes the preview, not the access.
- Data: `studio_roles.permissions.pages`.
- States: —
- Words: —
- Reachable: yes.

### C-22 · Role × action matrix (as implemented)
- Where: C-03 … C-21, C-66 … C-68.
- Entry: —
- Does: the table below, per tag, as the code behaves. "API only" = no UI offers it, the session alone is enough.
- Rules: server-side nothing differs by studio role; every studio cell is page access or UI presence.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

| Action | Owner | Admin | Designer (`id`) | Accounting | Platform admin | Outside the studio (link / secret) |
|---|---|---|---|---|---|---|
| Open `/tools/quote-xray` | yes | yes | yes | redirected (C-20) | — | — |
| See Tools › Quote X-Ray (desktop sidebar only) | yes | yes | yes | no | — | — |
| See *"Beat this quote"* on a lead | yes | yes | on leads they can open | no UI | — | — |
| Run a comparison (parse + create) | yes | yes | yes — any studio lead by id | API only | — | no |
| List and open every studio comparison | yes | yes | yes, all leads (C-18) | API only | — | no |
| Delete any comparison | yes | yes | yes | API only | — | no |
| Un-merge a row (legacy rows) | yes | yes | yes | API only | — | no |
| Change status · attach a lead · record an outcome | API only | API only | API only | API only | — | no |
| Mint a share link (legacy sales rows only) | yes | yes | yes | API only | — | no |
| Open a share link | — | — | — | — | — | yes, 24 h (C-35) |
| Send the WhatsApp draft | yes | yes | yes | no UI | — | — |
| Review, disable, enable brand dossiers | no | no | no | no | `super_admin`, or page `brand-dossiers` granted | no |
| Flip the brand-ammo kill switch | no | no | no | no | `super_admin` via the generic settings API, or the database (C-66) | no |
| Run the dossier sweep | — | — | — | — | — | `CRON_SECRET` holder |

### C-23 · Navigation — desktop sidebar only
- Where: `src/components/layout/app-sidebar.tsx:19-29, 376-447` (group gate 380, collapsed click 387, flyout 394, list 425); `src/components/layout/topbar.tsx:24-30`; `src/components/layout/bottom-nav.tsx:35-40`; `src/app/(main)/layout.tsx:180`; `src/components/ui/breadcrumb.tsx:30`; `src/components/quote-xray/VerdictView.tsx:3-7`.
- Entry: the rail.
- Does: *"Quote X-Ray"* (ScanLine) is the second item of the desktop sidebar's Tools group. The whole group shows when the member may open `/tools/quote-digitizer` — the Digitizer's entry gates the group; items then filter by the visibility switch (C-24) and owner-only flags. A click on the collapsed group goes to the Digitizer; its hover flyout lists the X-Ray. The topbar's tools grid and the phone / tablet bottom nav do not list it. Breadcrumb label *"Quote X-Ray"*.
- Rules: below `lg` the only ways in are the lead drawer's link (C-48) and a typed URL, although the verdict screen is designed for "a phone in the middle of a client conversation".
- Data: —
- States: —
- Words: *"Quote X-Ray"*, *"Tools"*.
- Reachable: yes (≥ lg).

### C-24 · The page-visibility switch — on everywhere, no admin control, bypassed by the drawer
- Where: `src/context/platform-config-context.tsx:46-51`; `src/app/api/config/pages/route.ts:8-50`; `src/app/(main)/layout.tsx:120-129, 187-199`; `src/app/admin/settings/page.tsx:36-41`; `src/app/admin/studios/[id]/page.tsx:68-80, 118-143`; `LDD:299-308, 1906-1911`.
- Entry: —
- Does: page keys come from `platform_config.page_visibility` merged with `studios.settings.page_visibility` (studio wins); a missing key means on. `tools/quote-xray` is in neither admin editor (Admin › Settings lists six tools, Admin › Studios › [id] seven plus mAIson, and that page's access matrix omits it too), so the X-Ray is on for every studio and can be switched off only by writing the key by hand. When off: the sidebar hides it and the page body shows *"Coming Soon"*; the drawer's *"Beat this quote"* is a plain link, not routed through the drawer's own `guardedToolOpen` (built for exactly this case); every API keeps working.
- Rules: —
- Data: `platform_config.page_visibility`, `studios.settings.page_visibility`.
- States: *"Coming Soon"* page.
- Words: *"Coming Soon"*, *"This feature is not yet available. Check back later!"*; the drawer guard's unused *"This tool is turned off for your studio"* / *"A studio owner can enable it in the workspace's page settings."*
- Reachable: yes (the switch only by hand).

---

## Plans, limits and cost

### C-25 · No plan gate, trial, credit or quota
- Where: repository search for plan gates (`PLAN_FEATURES`, `planAllows`, `requirePlan`, `hasFeature` — none exist); `CREATE:162-202`; `src/app/api/quote-xrays/parse-file/route.ts:25-45`; `src/__tests__/trial-anonymous-routes.test.ts:1-20`; `docs/rules/tools.md:32` (the Visualizer trial); the marketing pages (no X-Ray copy).
- Entry: —
- Does: the X-Ray is not tied to a plan, tier, trial, credit balance or allowance. Every studio with the page on — every studio (C-24) — can run it without limit. There is no anonymous or marketing trial (the public trial is the Visualizer's, 3 generations per signed cookie), and the pricing surfaces do not mention it.
- Rules: no counter exists, not even for display; the only per-run trace outside the row is one usage event for verdict runs (C-73). No per-studio AI spend is recorded (`ai_query_log` has no writer). The studio feature flags (`studios.settings.features`, `src/lib/queries/studio-config.ts:647-686`, nine flags) and the workflow toggles have no X-Ray entry either.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-26 · No rate limit
- Where: `src/lib/rate-limit.ts:8-37` (the in-memory limiter used by auth, OTP, demo, quote chat and line-item routes); the X-Ray routes (none import it).
- Entry: —
- Does: nothing throttles parse-file, create, lead-quotes, the list, delete or the public resolve. A member can fire unlimited parses (each up to 10 MB and 120 s of model time) and verdict runs, each with follow-on web scans (C-27).
- Rules: the public resolve relies on token entropy (32 random bytes) rather than throttling.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-27 · What one run costs, and the time budgets
- Where: `CREATE:51-52, 655-677, 742-749`; `src/lib/quote-parse/parse-file.ts:14-16, 207-215`; `src/lib/quote-xray/ai-match.ts:260`; `src/lib/quote-xray/brand-comparison.ts:190`; `src/lib/quote-xray/verdict.ts:346`; `SCAN:21-29`; `BDS:25-27`; `CRON:8-9, 20-24`.
- Entry: —
- Does: a lead-first verdict run = one parse call (two when the own quote is uploaded; Gemini 2.5 Flash, token retry 32k → 64k, 120 s abort) + an AI match pass + a brand/material extraction pass + a phrasing pass (hand-off B), then, after the response, up to three web-grounded brand scans (`google/gemini-2.5-flash:online`, 45 s timeout each, "~1¢" per scan by the code's own note). The hourly sweep adds up to 15 scans. Parse-file, create and the cron each have `maxDuration` 120 s.
- Rules: every call goes through the platform's one OpenRouter key; no cost is attributed to a studio or member.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-28 · File limits
- Where: `src/lib/quote-parse/parse-file.ts:17-19, 21-32, 159-174`; `HOOKS:13-25, 188-200`; `src/app/api/quote-xrays/parse-file/route.ts:1-12`; `src/app/api/copilot/competitor-quote/route.ts:5-18`.
- Entry: the dropzones.
- Does: one file per request; at most 10 MB; PDF, PNG, JPEG / JPG, CSV and XLSX (by MIME, else by extension). The verdict flow takes one competitor file, plus the own file in *"Upload 2 quotes"* mode; the legacy flow took 2–3.
- Rules: the 10 MB check runs inside the route; the platform's own request-body ceiling (noted as ~4.5 MB on Vercel in the Copilot route's comment) may refuse a larger file before the route runs — the 413 that motivated the one-file-per-request split. Which limit a studio meets first is not verified (Uncertain).
- Data: —
- States: 413; 415.
- Words: C-06.
- Reachable: yes.

### C-29 · Without an AI key, fixtures are saved as real runs
- Where: `CREATE:54-57, 313-315, 339-342, 647-650`; `src/lib/quote-parse/parse-file.ts:176-180`; `src/lib/quote-xray/dryrun-fixtures.ts`; `SCAN:189-192`.
- Entry: an environment without `OPENROUTER_API_KEY` (a fork, a preview).
- Does: parse-file answers 200 with a fixed dry-run document whatever the file; the verdict is phrased deterministically from those numbers; legacy synthesis uses `dryRunSynthesis`; brand extraction is skipped; a scan returns empty.
- Rules: the rows save as ordinary `ready` runs and feed the cross-studio observations table (C-75); nothing on the row or screen says the analysis is a fixture — only a server log warning. A scan without a key negative-caches the brand for 90 days (C-64).
- Data: `quote_xrays`, `market_quote_observations`, `brand_dossiers`.
- States: —
- Words: —
- Reachable: environment-dependent.

### C-30 · Deployment notes
- Where: `next.config.ts:36-71`; `src/lib/quote-parse/parse-file.ts:55-65`; `src/app/api/quote-xrays/parse-file/route.ts:10-12`; `docs/superpowers/specs/2026-08-17-fleet-dashboard-design.md:20-22, 164-166`; `vercel.json:61-62`.
- Entry: —
- Does: (1) the file-tracing list traces the pdfjs worker into `/api/quote-xrays/create`, which has not parsed files since 2026-08-17; `/api/quote-xrays/parse-file`, where `require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")` now runs, has no entry — and the config's own comment says a missing trace makes "PDF text extraction silently fall back to the slow vision path". (2) The fleet spec records that "40 Quote X-Ray commits … never reached two of the three lines", and the parse-file split had shipped on fork lines but not prod — X-Ray parity across branch lines is not guaranteed. (3) The dossier sweep is a Vercel cron; a deployment without Vercel crons never drains the pending queue (C-62).
- Rules: none of the three was checked against a live deployment (Uncertain).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

---

## Sharing

### C-31 · Two sharing models, one per generation
- Where: `src/lib/quote-xray/shareability.ts:1-22`; `src/components/quote-xray/SendToClientDialog.tsx:1-7`; `src/components/quote-xray/views/SalesJustifierView.tsx:29, 37-39, 178-183`; `src/components/quote-xray/views/CombinedResultView.tsx:102`; `src/lib/quote-xray/verdict.ts:28, 282`.
- Entry: —
- Does: legacy sales-justifier rows — and, since 2026-08-14, combined rows — share as a public 24-hour page (C-32 … C-37). Verdict rows cannot: "the rebuilt flow's client artifact is an editable WhatsApp message, not a portal page (product decision 2026-08)" (C-38). The verdict prompt asks for a draft with "No links, no placeholders" that never names the other studio in writing, and the legacy `{share_link}` placeholder is stripped (hand-off B).
- Rules: on the verdict flow the only client-facing artefact is text the designer pastes; nothing records that it went out (C-38).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-32 · `POST /api/quote-xrays/[id]/share` — minting
- Where: `SHARE:17-70`; client `HOOKS:319-336`; test `src/__tests__/quote-xrays-scoped-api.test.ts:195-227`.
- Entry: *"Generate link"* / *"Regenerate (invalidates old link)"* (C-33).
- Does: loads the row (scoped), refuses a non-shareable row (C-34), draws 32 random bytes as a base64url token, sets `share_token`, `share_expires_at = now + 24 h`, `status = 'shared'`, `updated_at`, answers `{ token, expiresAt }`.
- Rules: session only — any member can share any studio row. One token per row: a new mint overwrites the old one, which stops working at once. Minting writes nothing else (no activity, event or notification).
- Data: `quote_xrays.share_token` (unique), `share_expires_at`, `status`.
- States: 401; 400; 404; 500.
- Words: *"This X-Ray has no client-facing view to share."*, *"Lookup failed"*, *"Failed to create share link"*, *"Not found"*.
- Reachable: legacy shareable rows only, which open only by `?xrayId=` (C-57).

### C-33 · The "Share with client" dialog
- Where: `src/components/quote-xray/ShareLinkDialog.tsx:19-87`; `SalesJustifierView.tsx:37-39, 178-183`.
- Entry: *"Share with client"* on the legacy Sales Justifier view (alone, or as a tab of a combined run).
- Does: with a stored token, shows `<browser origin>/sign/quote-xray/<token>` read-only with a copy button, its expiry and a regenerate button; without one, *"Generate link"*.
- Rules: an expired token still shows as a working-looking URL with a past *"Expires …"* date — no expired state. The link is built from the viewer's origin, not a configured domain.
- Data: C-32.
- States: —
- Words: *"Share with client"*, *"Share with the client"*, *"Generates a public link the client can open without logging in. Expires automatically after 24 hours."*, *"Generate link"*, *"Generating…"*, *"Expires <date>."*, *"Regenerate (invalidates old link)"*, *"Failed to generate link"*, *"Could not copy to clipboard"*.
- Reachable: legacy rows only.

### C-34 · The shareability gate
- Where: `shareability.ts:1-22`; `SHARE:1-3, 38-43`; `PUB:27-30`.
- Entry: —
- Does: `isShareableXray(objective, ai_synthesis)` is true for `objective === 'sales-justifier'`, or for `ai_synthesis.kind === 'combined'` holding a `results['sales-justifier']` slice. The mint and the public resolve both call it, "so the two gates can never drift apart again".
- Rules: before 2026-08-14 the mint checked the objective alone, so combined runs (stored under their primary objective, often gap-finder) could not be shared though the page could render them. Verdict rows fail both gates. The mint route's header still names "verdict" among the shareable kinds (`SHARE:1-3`); the code excludes it. No test covers combined or verdict rows (C-16).
- Data: `quote_xrays.objective`, `ai_synthesis.kind`.
- States: 400.
- Words: —
- Reachable: yes.

### C-35 · Link lifetime, rotation, no revocation
- Where: `SHARE:17, 45-58`; `PUB:31-33`; `IDR:216-239`; `PUBPAGE:223-226`.
- Entry: —
- Does: a link lives 24 h from its mint, checked against the clock on each request (410 after). A new mint rotates the token. There is no revoke: the only ways to end a live link early are to regenerate (which issues a new live link) or to delete the run (C-40). Expiry does not touch the row — `status` stays `shared`, the token stays stored.
- Rules: no studio setting for the lifetime, no extension, no warning before expiry, no view count.
- Data: `share_token`, `share_expires_at`.
- States: 410 expired; 404 rotated or deleted.
- Words: *"Link has expired"*, *"Invalid or expired link"*.
- Reachable: yes.

### C-36 · `GET /api/quote-xrays/share/[token]` — the whole row goes public
- Where: `PUB:11-40`; `src/lib/transformers.ts:3219-3240`; `docs/features/portal-merge-integration/uat-qa-sheet.csv:532-537`.
- Entry: the public page's fetch — anyone holding the token.
- Does: a service-role `select("*")` by token; if shareable and unexpired, the UI-shaped row minus `brandAmmo` ("ID-only intelligence — NEVER on a public surface").
- Rules: every other field is in the JSON: `studioId`, `leadId`, `createdBy` (a user id), `status`, `outcome` and `outcomeNote`, `shareToken`, `inputs` (both quotes' parsed documents — vendor, client name, reference, source file names, every priced line), the full match matrix and the whole synthesis — for a combined row the studio-facing Gap Finder, Market Intel and Package Ladder slices as well. The page renders the sales slice only (C-37); the rest is one request away. The UAT sheet asked testers to "Verify the public page only shows what's appropriate (no internal margin data)" — the page was checked, not the API.
- Data: `quote_xrays` (service role).
- States: 400 missing token / not shareable; 404; 410; 500.
- Words: *"Missing token"*, *"Invalid or expired link"*, *"This X-Ray is not shareable"*, *"Link has expired"*, *"Lookup failed"*.
- Reachable: legacy shareable rows with a live token.

### C-37 · The public page — access and presentation
- Where: `PUBPAGE:23-241`; `src/proxy.ts:316-318`; `src/app/robots.ts:29, 34-44`.
- Entry: `/sign/quote-xray/<token>`.
- Does: a client-rendered page that fetches C-36 and lays out the sales slice (layout hand-off A): hero, market positioning, *"On equal scope"*, *"What's only in our quote"*, head-to-head items, below-market flags, brand differences, the competitor's arithmetic flags, *"Things worth asking the other studio"*, methodology, *"Save as PDF"* (the browser's print) and the expiry line.
- Rules: no login, OTP, studio branding (no name or logo — *"prepared by your interior design team"*), view logging, or notice to the studio when opened. It is public because of the `/sign` rule written for quote signing. `robots.ts` disallows `/sign/` for general crawlers but lets ChatGPT-User and PerplexityBot fetch everything outside `/api/`, `/admin/` and `/dashboard/`.
- Data: —
- States: *"Loading…"*; *"Link unavailable"* with the API's message, else *"Could not load this link."*, or *"This share link has expired or is invalid."* for a row without a sales slice.
- Words: *"Your quote comparison"*, *"Why choose this team"*, *"Our quote"*, *"Other quote"*, *"Extra scope included"*, *"On equal scope"*, *"What's only in our quote"*, *"Things worth asking the other studio"*, *"Re: “<line>”"*, *"Save as PDF"*, *"This is a personalised comparison prepared by your interior design team. It expires <date>."* (or *"soon"*).
- Reachable: yes (legacy shareable rows).

### C-38 · The WhatsApp draft — nothing is recorded
- Where: `src/components/quote-xray/SendToClientDialog.tsx:18-102`; `src/components/quote-xray/VerdictView.tsx:139-148`; `src/lib/quote-xray/verdict.ts:238-248, 282` (hand-off B).
- Entry: *"Send comparison to client"* on a verdict result.
- Does: an editable textarea seeded with the run's stored `whatsappMessage`; *"Reset to draft"*; a character count; *"Copy"*; *"Open WhatsApp"* opens `https://api.whatsapp.com/send?text=<draft>` in a new tab — WhatsApp's contact picker, not the lead's number.
- Rules: no server call: the edited text is not saved, the run is not marked sent, the lead's activity gets nothing, and the lead's phone is not used even on a lead-bound run. Closing the dialog discards the edits (it remounts from the AI draft).
- Data: none written.
- States: —
- Words: *"Send comparison to client"*, *"Send to client"*, *"Edit the message so it sounds like you, then copy it into your WhatsApp chat with the client."*, *"Reset to draft"*, *"<n> characters"*, *"Copy"*, *"Copied"*, *"Open WhatsApp"*, *"Message copied — paste it into WhatsApp."*, *"Couldn't copy — select the text and copy manually."*
- Reachable: yes.

### C-39 · PDF export and print
- Where: `PAGE:137-176`; `src/lib/quote-xray/download-xray-pdf.ts:1-97`; `src/lib/quote-xray/build-xray-report.ts:210-214`; `PUBPAGE:91-100`.
- Entry: *"Download PDF"* in the tool's header; *"Save as PDF"* on the public page.
- Does: legacy and combined results only — a jsPDF file built in the browser (title *"Quote X-Ray"*, subtitle objective · date · currency; content hand-off A). Verdict results have no PDF. The public page prints through the browser.
- Rules: generated client-side; nothing stored or logged; no studio letterhead.
- Data: —
- States: —
- Words: *"Download PDF"*, *"Preparing…"*, *"Couldn't generate the PDF. Please try again."*
- Reachable: legacy rows only (by `?xrayId=`).

---

## The run as a record

### C-40 · Delete — hard, by anyone, and what survives
- Where: `IDR:212-239`; `HOOKS:303-317`; `src/components/quote-xray/QuoteXrayHistory.tsx:30-39, 69-78`; `MBASE:13-14, 65`; `scripts/cleanup/003_fleet_purge_demo_data.js:353`.
- Entry: the trash icon on a *"Recent comparisons"* row.
- Does: a browser confirm, then a hard delete through the scoped client; `{ ok, id }`; toast.
- Rules: any member deletes any studio run (no author check). No trash, restore, undo or activity row. Survivors: the market observations (`source_xray_id` is a plain uuid, "intentionally left untouched"), the brand dossiers, the usage event. The share link dies with the row. A studio delete cascades; a lead delete sets `lead_id` null (leads are archived, not deleted, in practice). Runs past the five shown cannot be deleted from the UI (C-56). The fleet demo purge deletes runs of demo leads only.
- Data: `quote_xrays`.
- States: 404; 500.
- Words: *"Delete this comparison from your history? This can't be undone."*, *"Comparison deleted."*, *"Couldn't delete that comparison."*, *"Delete comparison"*; API *"Delete failed"*, *"Not found"*.
- Reachable: yes (the five newest verdict runs).

### C-41 · Status — written, never read
- Where: `MBASE:22-23`; `CREATE:404, 701`; `SHARE:53`; `IDR:186-205`; repository search for readers (none in `src/components/quote-xray`, `PAGE`, `PUBPAGE`).
- Entry: —
- Does: `draft` is the column default and never written by code; every insert writes `ready`; every mint writes `shared`; `archived` only through the dead status PATCH (C-12).
- Rules: no screen, filter or route reads it: the history lists every status, an `archived` run still opens and its link still resolves, an expired link leaves `shared`.
- Data: `quote_xrays.status`.
- States: —
- Words: —
- Reachable: write-only.

### C-42 · A run is a snapshot — no re-run, no drift, no correction
- Where: `CREATE:571-591, 638-644`; `src/lib/quote-xray/own-quote-from-lead.ts:56-161`; `IDR:147-184`; `BDS:284-290`.
- Entry: —
- Does: a run freezes both parsed documents, the match and the synthesis; the own quote copied from a lead keeps only `digitized:<quoteId>` as a pointer. Afterwards only these change: the matrix by un-merge (legacy, C-13), the late ammo write (C-60), share fields, status, outcome and the lead binding (the last three server-only).
- Rules: no re-run, no "refresh from the lead's current quote", no warning when the lead's quote changes, no way to correct a misread competitor line (the fix is a new run), no versions.
- Data: `quote_xrays.inputs`, `match_result`, `ai_synthesis`.
- States: —
- Words: —
- Reachable: n/a.

### C-43 · Identity and numbering
- Where: `src/components/quote-xray/QuoteXrayHistory.tsx:49-66`; `src/lib/quote-xray/combined-number.ts:1-12`; `PAGE:339-350`; `CREATE:596-622`.
- Entry: —
- Does: a verdict run has no number, title or name; it lists as *"vs <competitor>"* (the competitor's parsed letterhead, else *"The other quote"*) with a date. Combined legacy runs show *"Comparison <n>"*, counted in the browser from the studio's combined runs by creation order.
- Rules: *"Comparison <n>"* is recomputed on every load, so deleting an older combined run renumbers the others (the file calls the number "stable"). Two runs against the same competitor differ only by date; no lead name or author is shown.
- Data: —
- States: —
- Words: *"vs <competitor>"*, *"Comparison <n>"*, *"Comparison"*.
- Reachable: yes.

---

## Outcomes and lead binding

### C-44 · Outcome columns and `set-outcome`
- Where: `M272:1-15`; `IDR:123-145`; `src/lib/quote-xray/outcomes.ts:6-25`; `src/types/database.ts:2861, 2871`; test `src/__tests__/quote-xray-outcomes.test.ts:6-24`.
- Entry: none in the UI since 2026-08-14 (C-45).
- Does: `outcome` (`pending` default · `won` · `lost_price` · `lost_silence` · `lost_other`, CHECK constraint), `outcome_note`, `outcome_at`. `PATCH { action: "set-outcome", outcome, outcomeNote }` validates the value, writes the note (non-strings become null), stamps `outcome_at` (null for `pending`) and `updated_at`.
- Rules: any member; works on standalone runs (no lead needed, whatever C-47's comment says); no length cap on the note; no record of who set it; a new value overwrites without history. Nothing reads the outcome — no win rate, no benchmark of winning prices (the "future phase" in `M272:3-5`). The public resolve exposes outcome and note (C-36).
- Data: `quote_xrays.outcome`, `outcome_note`, `outcome_at`.
- States: 400; 404; 500.
- Words: labels *"Not recorded"*, *"Won"*, *"Lost — price"*, *"Lost — no response"*, *"Lost — other"*; API *"Invalid outcome"*, *"Update failed"*.
- Reachable: API only.

### C-45 · The outcome picker existed for three weeks
- Where: `git show d000261fa^:src/components/quote-xray/OutcomeSelector.tsx`; `git show d000261fa^:src/lib/queries/quote-xrays.ts` (lines 142-160); `git show d000261fa^:src/app/(main)/tools/quote-xray/page.tsx` (lines 349, 370); `HOOKS:299-301`.
- Entry: (was) under every result.
- Does: 2026-07-27 → 2026-08-14 a studio-only strip asked *"Did you win this deal?"* with the four selectable outcomes; clicking the active one reset it to *"Not recorded"*; hidden from the share page and the PDF. The hook could send a note; the strip never did. The rebuild deleted it: "Outcome capture was removed with the verdict rebuild (2026-08): no win/loss tracking UI exists anymore. The server's set-outcome action and the outcome columns remain for old rows, but no client calls them."
- Rules: outcomes recorded in those weeks are stored and invisible.
- Data: C-44.
- States: —
- Words: (removed) *"Did you win this deal?"*, *"Used to track your win rate — and, over time, benchmark against the quotes that actually win."*, *"Outcome cleared."*, *"Recorded: <label>"*, *"Couldn't save the outcome."*
- Reachable: no (removed).

### C-46 · The outcome and the lead's fate never meet
- Where: `IDR:123-145`; Leads B-46 and C-22 (close lead); Leads D (`leads.closed_reason_code`); `src/lib/lifecycle/`, `src/app/api/leads/mutations/**` (no `quote_xrays` access).
- Entry: —
- Does: moving a lead to Signed, or closing it *"Lost to competitor"* (with the competitor's name, *"Their budget"* / *"Our quote"* and the gap — Leads C-22), never touches its runs; a run set to `won` never moves the lead. The vocabularies differ (`lost_price` / `lost_silence` / `lost_other` against the lead's close reasons).
- Rules: the close dialog asks for the competitor's name and budget without offering the lead's X-Ray, which holds both.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-47 · Attach / detach a lead — server only
- Where: `IDR:89-121`; `HOOKS:231-251` (`useAttachXrayToLead`, no caller); test `src/__tests__/quote-xray-verdict-route.test.ts:273-302`; `scripts/security/archival-manifest.json:119`.
- Entry: none in the UI.
- Does: `PATCH { action: "attach-lead", leadId }` checks the lead exists in the studio (scoped read; 404 otherwise) and sets `lead_id`; `leadId: null` detaches without a lookup.
- Rules: the comment says attaching "restores outcome tracking + lead-scoped history" — neither exists (C-45, C-52). No archived-lead check (the route sits on the archival manifest's grandfathered list). In the UI a standalone run stays standalone.
- Data: `quote_xrays.lead_id`.
- States: 400; 404; 500.
- Words: *"Invalid leadId"*, *"Lead lookup failed"*, *"Lead not found"*, *"Update failed"*.
- Reachable: no (dead from the UI).

---

## Lead integration

### C-48 · "Beat this quote" in the lead drawer
- Where: `LDD:1899-1924`; Leads B-59; history `3f63999ba` (2026-05-15, *"X-Ray this quote"*, `&objective=gap-finder`) → `d000261fa` (2026-08-14).
- Entry: the drawer's Quotes section (Classic) or the Journey Quote step (the same block).
- Does: a link to `/tools/quote-xray?leadId=<lead>` beside *"Download quote"*, shown when the drawer has quote lines or the lead's quote status is `client_signed`.
- Rules: a plain `<Link>`, not routed through `guardedToolOpen`: it shows and navigates even when the X-Ray page is switched off (C-24). Shown to anyone who can open the drawer, and on signed leads too. It does not pass the quote in view; the tool picks the lead's quote itself (C-50). The only way in on a phone (C-23).
- Data: —
- States: —
- Words: *"Beat this quote"*, *"Download quote"*.
- Reachable: yes.

### C-49 · `?leadId=` and the lead picker
- Where: `PAGE:36-45, 89, 93-105, 196-198`; `src/components/quote-xray/VerdictUpload.tsx:63, 115-145`; `src/context/app-context.tsx:121-124`.
- Entry: the drawer link; the picker.
- Does: `?leadId=` pre-selects the lead in *"For a lead"* mode. The picker lists the app context's leads (a designer's assigned leads only) outside the `CLOSED` bucket, by name with the property type (*"Unknown"* when blank). *"New comparison"* / *"Back to Quote X-Ray"* clear the state and drop the query string.
- Rules: a signed lead (Closed bucket) is left out of the picker although its drawer shows the link, so the deep link pre-selects an id the list does not hold (display unverified, Uncertain). The server trusts whatever id arrives (C-17, C-18).
- Data: —
- States: —
- Words: *"Lead"*, *"Pick the lead this quote belongs to"*, *"No matching leads"*, *"We take your quote from the lead — you don't need to upload it."*, *"New comparison"*, *"Back to Quote X-Ray"*.
- Reachable: yes.

### C-50 · Which of the lead's quotes is defended
- Where: `src/lib/quote-xray/own-quote-from-lead.ts:56-161`; `CREATE:547-549, 576-591`; `VerdictUpload.tsx:66-98`.
- Entry: submit in *"For a lead"* mode.
- Does: the explicit pick (`ownQuoteId`, confined to the lead by the query), else the primary `standard` quote, else the newest by `updated_at` — any status, drafts included, never a variation order. Its lines (else the lead's legacy lines with no quote id), omission lines dropped, rich text flattened, FOC / inclusive markers kept as the price type, totals from the quote row else summed (maths hand-off B). The run records `digitized:<quoteId>`.
- Rules: the card sends the id even for a single quote, "so the server defends exactly what the card displayed".
- Data: `quotes`, `quote_line_items` (read).
- States: `no_quote` / `no_items` → 422 `NO_LEAD_QUOTE`; `load_failed` → 500.
- Words: C-07.
- Reachable: yes.

### C-51 · Switching to "Upload 2 quotes" keeps the lead
- Where: `VerdictUpload.tsx:84-104`; `PAGE:107-118`.
- Entry: the mode tabs.
- Does: switching mode clears the quote pick but not the chosen lead, and submit always sends `leadId` — a lead picked and then abandoned for two uploads still binds the run.
- Rules: the files-mode card shows no lead, so the binding is invisible; with an uploaded own quote the server does not check the lead (C-17).
- Data: `quote_xrays.lead_id`.
- States: —
- Words: *"For a lead"*, *"Upload 2 quotes"*.
- Reachable: yes.

### C-52 · No lead-scoped history anywhere
- Where: `HOOKS:40-54` (the `leadId` option); its callers `PAGE:83, 321`, `QuoteXrayHistory.tsx:17` (none pass it); `REC:71-77`; `LDD` (no X-Ray list); Leads B-59.
- Entry: —
- Does: the list route can filter by lead, but no screen asks. The drawer shows no past comparisons, the tool shows the studio's five newest, and a result does not name its lead.
- Rules: after a run there is no way back from the lead to its comparisons.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-53 · "Fix in Quote Digitizer" lands on an empty picker
- Where: `src/components/quote-xray/shared/FixInDigitizerLink.tsx:7-29`; `src/components/quote-xray/shared/VarianceTable.tsx:124`; `VerdictView.tsx:175-181`; `src/app/(main)/tools/quote-digitizer/page.tsx:36`.
- Entry: each row of a lead-bound run's evidence table.
- Does: links to `/tools/quote-digitizer?leadId=<lead>` — "X-Ray is read-only by design (spec §15.3) — every row that hints at a fix offers this escape hatch".
- Rules: the Digitizer page never reads `leadId` (its selection starts empty), so the designer lands on an unselected picker. Hidden on standalone runs.
- Data: —
- States: —
- Words: *"Fix in Quote Digitizer"*.
- Reachable: yes (the link; the pre-selection does not work).

### C-54 · Archived and closed leads
- Where: `CREATE:542-591`; `own-quote-from-lead.ts:63-87`; `IDR:96-108`; `scripts/security/archival-manifest.json:119`; `src/lib/lifecycle/` (no X-Ray reference); `PAGE:89`.
- Entry: —
- Does: no X-Ray route checks `leads.archived_at`: a run, an attach and a share all work on an archived lead; archiving or reviving a lead leaves its runs and live links alone. Closed-bucket leads are only hidden from the picker (C-49).
- Rules: the archive guard that blocks other lead writes (*"This record has been archived. Revive it before making changes."*, Contracts C-10) does not apply here.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-55 · The X-Ray never writes back to the lead or its quotes
- Where: `FixInDigitizerLink.tsx:7-9`; `CREATE` (writes only `quote_xrays`, `market_quote_observations`, `usage_events`); `src/app/api/quotes/line-items/route.ts:573-574`; QE D-219.
- Entry: —
- Does: nothing flows from a run to the lead: no line prices, no `quote_line_items.competitor_benchmark_cents` / `competitor_source` (written only by the line-items route), no lead field (competitor name, budget gap), no file (the competitor's PDF is not kept, C-06), no task or follow-up.
- Rules: the competitor's quote exists only as parsed JSON inside the run.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

---

## History and visibility

### C-56 · "Recent comparisons"
- Where: `src/components/quote-xray/QuoteXrayHistory.tsx:12-90`; `PAGE:80-87, 193-216`.
- Entry: the tool's upload screen.
- Does: the studio's five newest verdict runs: *"vs <competitor>"*, date, open, delete (C-40). A skeleton while loading; nothing at all when there are none (the upload card takes the full width).
- Rules: studio-wide for every member; legacy runs hidden "regardless of whether the environment's purge has run" (no purge script is in the repository); *"+<n> older"* is plain text — older runs cannot be opened or deleted from the UI.
- Data: C-10.
- States: skeleton; empty.
- Words: *"Recent comparisons"*, *"vs <competitor>"*, *"+<n> older"*.
- Reachable: yes.

### C-57 · Legacy runs open only by `?xrayId=`
- Where: `PAGE:36-42, 312-402`; `QuoteXrayHistory.tsx:22-24`.
- Entry: an old bookmark or a hand-typed id.
- Does: `?xrayId=<id>` opens any studio run; legacy runs render their old views, and their writes stay live — un-merge (C-13), share (C-32), PDF (C-39).
- Rules: nothing in the UI links to a legacy run any more.
- Data: —
- States: *"X-Ray <id> could not be loaded."* + *"Start a new X-Ray"*; a verdict row without a result: *"This comparison has no stored result."* + *"Start a new comparison"*.
- Words: as in States.
- Reachable: by URL only.

### C-58 · Every visit loads every run in full
- Where: `REC:74-86`; `PAGE:83, 321`.
- Entry: —
- Does: to show five titles (and number combined runs) each visit fetches every studio run with both parsed quotes, the matrix and the synthesis.
- Rules: the payload grows with the studio's history; no pagination or column projection.
- Data: C-10.
- States: —
- Words: —
- Reachable: yes.

---

## Brand dossiers (admin page, cron, service)

### C-59 · What a dossier is
- Where: `M278:1-53`; `scripts/migrations/278_brand_dossiers_down.sql:1-17`; `src/types/database.ts:2878-2900`; `BDS:1-14`; `src/lib/quote-xray/brand-normalize.ts:42-52`.
- Entry: —
- Does: one row per canonical brand key (`brand_canonical`, unique): `display_name` (the first spelling seen in a studio's quote), `aliases` (text[]), `category_hint` (the first category seen), `status` (`pending` · `ready` · `empty` · `disabled`), `findings` (claim, sentiment, severity, sources `{ url, domain }`, quoted evidence, retrieved-at), `scan_count`, `last_scanned_at`. Platform-level: "nothing in it is tenant-owned; every scan makes the whole platform smarter"; the down migration calls it a rebuildable cache and keeps `quote_xrays.brand_ammo`.
- Rules: no studio, region or country column: a brand first named in one studio's competitor quote is scanned once and served to every studio in every region (C-63); nothing records which studio or run first named it. Service role only (C-15).
- Data: `brand_dossiers`.
- States: —
- Words: —
- Reachable: yes.

### C-60 · When enrichment runs
- Where: `CREATE:652-657, 671-673, 738-749`; `BDS:228-294`.
- Entry: a successful verdict run.
- Does: after the response is sent (`after()`), when live AI is on and the run found brands that differ on the competitor side or brands only the own quote names, `enrichXrayWithBrandAmmo` reads the kill switch (C-66), canonicalises both sides' brands, fetches their dossiers (by key, then by alias), queues misses as `pending`, scans up to three at once, builds the ammo and writes it onto the run through the scoped client.
- Rules: best effort — every failure is swallowed ("must never surface to the ID"). Legacy runs never get ammo. No ammo → `brand_ammo` stays null. A run deleted meanwhile simply isn't written.
- Data: `brand_dossiers`; `quote_xrays.brand_ammo`.
- States: —
- Words: —
- Reachable: yes.

### C-61 · Cache classes and the 90-day TTL
- Where: `BDS:25, 31-42`; `CRON:49-61`; test `src/__tests__/quote-xray-brand-dossier.test.ts:25-35`.
- Entry: —
- Does: no row → miss; `disabled` → disabled; `pending` or never scanned → miss; scanned within 90 days → fresh; older → stale. Fresh and stale attach at once; stale ones are refreshed only by the sweep (five per hour, stalest first) — stale-while-revalidate.
- Rules: the TTL is a constant, not a setting; a stale dossier keeps attaching until the sweep reaches it.
- Data: `brand_dossiers.status`, `last_scanned_at`.
- States: —
- Words: —
- Reachable: yes.

### C-62 · Inline scans and the pending queue
- Where: `BDS:26-27, 175-191, 265-279`; `CRON:37-47`; `PAGE:65-78`.
- Entry: —
- Does: every miss gets a `pending` row (upsert, duplicates ignored); the first three misses of a run are scanned in parallel before the ammo is built; the rest wait for the sweep (ten oldest pending per hour).
- Rules: a run's ammo is written once, from what resolved at that moment; brands scanned later reach only future runs, and the page stops polling after 90 s (C-70).
- Data: `brand_dossiers`.
- States: —
- Words: —
- Reachable: yes.

### C-63 · Scan validation, and one region's forums for everyone
- Where: `SCAN:1-17, 21-29, 90-143, 147-171`; test `src/__tests__/quote-xray-brand-scan.test.ts:13-80`.
- Entry: —
- Does: one web-grounded model call per brand; the model drafts claims and code decides: a source must be a URL the search actually returned ("cite-or-drop"); negative or mixed claims need two distinct domains, positive claims one; unknown sentiment is held to the mixed bar; at most six findings; claims capped at 400 characters, evidence at 300 (prompt detail hand-off B).
- Rules: every search is framed as "Singapore/Malaysia home renovation" and names RenoTalk, HardwareZone, Reddit and Lowyat; since dossiers carry no region, a UAE or India studio is served SG/MY forum findings.
- Data: `brand_dossiers.findings`.
- States: —
- Words: —
- Reachable: yes.

### C-64 · A failed scan reads as "users report no real problems"
- Where: `SCAN:16-17, 184-242`; `BDS:71-83, 194-226`; `src/components/quote-xray/VerdictView.tsx:303-306`; `CRON:68-76`; `ADMINPAGE:132-135`.
- Entry: —
- Does: every scan failure — no key, HTTP error, timeout, unparseable output — returns `{ status: "empty", findings: [] }` and is stored with `last_scanned_at = now` (negative cache). The ammo builder lists every `empty` dossier as a clean brand, and the result says *"We also checked <brands> — users report no real problems."*
- Rules: a provider outage therefore certifies brands as clean for 90 days. The sweep counts such rows as `scanned`, not `failed` (`failed` = missing or disabled rows and write errors). The admin list shows them as `empty` / *"No validated findings (negative-cached)"*, the same as a genuine nothing-found.
- Data: `brand_dossiers`.
- States: —
- Words: *"We also checked <brands> — users report no real problems."*
- Reachable: yes (bug).

### C-65 · `GET /api/cron/brand-dossier-scan` — the hourly sweep
- Where: `CRON:1-88`; `vercel.json:61-62`; `src/lib/cron-auth.ts:11-20`; `src/proxy.ts:431-444`.
- Entry: Vercel cron `20 * * * *`.
- Does: requires `Authorization: Bearer <CRON_SECRET>`; reads the kill switch (off → `{ skipped: true, reason: "kill switch off" }`); takes the ten oldest `pending` and the five stalest `ready` / `empty` dossiers past 90 days; scans them one at a time; answers `{ pending, staleRefreshed, scanned, failed }`.
- Rules: fails closed in production when the secret is unset (open in development). 15 serial scans at up to 45 s can exceed `maxDuration` 120 s — the remainder waits an hour (each scan saves on its own). Disabled dossiers are never picked, and a disable during a scan wins (the write skips `disabled`). `staleRefreshed` counts rows selected, not refreshed. Nobody is told the outcome.
- Data: `brand_dossiers`; `platform_config`.
- States: 401; 500.
- Words: *"Unauthorized"*, *"Internal error"*.
- Reachable: yes (Vercel deployments).

### C-66 · The kill switch
- Where: `M278:13-16, 50-53`; `BDS:123-142`; `CRON:33-35`; `src/app/api/admin/platform-settings/route.ts:43-85`; `src/app/admin/settings/page.tsx:99-117, 160-361`; `VerdictView.tsx:151`; `REC:55`.
- Entry: none in any UI.
- Does: `platform_config.quote_xray_brand_ammo_enabled`, seeded `true`. Read before each enrichment and each sweep: a read error → off ("no ammo beats wrong ammo"); a missing key → on.
- Rules: no admin screen shows or edits it — Admin › Settings saves a fixed set of keys; a `super_admin` could send it through the generic `PATCH /api/admin/platform-settings` (any key), otherwise the database. Off stops new enrichment and scans only; ammo already on runs keeps rendering (the view shows `brandAmmo` whenever present and the routes return it) — contrary to M278's "Flip to false to hide all ammo instantly". The helper's comment ("Fails OPEN on read error only if the row is missing entirely") muddles the rule it implements. Global only — no per-studio opt-out.
- Data: `platform_config`.
- States: —
- Words: —
- Reachable: database / API only.

### C-67 · Admin › Brand Dossiers
- Where: `ADMINPAGE:1-173`; `src/app/admin/layout.tsx:34`; `src/lib/admin-pages.ts:16`; `src/proxy.ts:167-205`.
- Entry: Admin sidebar *"Brand Dossiers"* (ScanLine icon).
- Does: one list of up to 300 dossiers, most recently updated first: display name, status chip, finding count with the notable count (negative or mixed, notable), *"scanned <date> (×<n>)"* or *"never scanned"*, and *"Enable"* / *"Disable"*. Expanding a row shows each finding: sentiment (and severity) chip, claim, quoted evidence in italics, source domains as links (new tab).
- Rules: platform staff only (C-03, C-68). No search, filter, sort or paging; no editing of name, aliases, category or findings; no manual rescan, delete or merge; no view of the runs or studios a dossier reached. One toggle at a time (all buttons disable while one saves). The intro calls the studio panel the "Ammo panel"; studios see *"Key points you can use"* (C-70).
- Data: `brand_dossiers` (via C-68).
- States: *"Loading dossiers…"*; the load error's message; empty.
- Words: *"Brand Dossiers"*, *"Web-sourced brand intelligence shown to IDs in Quote X-Ray's Ammo panel. Disable a dossier to remove it from every future comparison and re-scan."*, *"Loading dossiers…"*, *"No dossiers yet — they accumulate as X-Ray runs encounter branded competitor quotes."*, *"<n> finding"* / *"<n> findings"*, *"· <n> notable"*, *"scanned <date> (×<n>)"*, *"never scanned"*, *"Enable"*, *"Disable"*, *"No validated findings"*, *" (negative-cached)"*, *"Failed to load dossiers"*, *"Update failed"*.
- Reachable: yes (platform admins).

### C-68 · `GET` / `PATCH /api/admin/brand-dossiers`
- Where: `ADMINAPI:1-91`; `src/lib/admin-route-auth.ts:30-52`; `src/app/api/admin/login/route.ts:39-58`; `src/app/api/admin/audit-log/route.ts:8-30`.
- Entry: C-67.
- Does: `GET` → `{ dossiers }` (≤300 by `updated_at`). `PATCH { id, action }`: `disable` → `disabled`; `enable` → `ready` (findings present) or `empty` (none) when scanned before, else `pending`; answers `{ dossier }`.
- Rules: `requireAdminPage("brand-dossiers")` — 401 without a valid admin cookie, 403 unless `super_admin` or the page is in the cookie's `allowedPages` (fixed at login, so a grant change needs a new login). No audit row: the platform `audit_log` behind Admin › Activity has no writer in code (seeded rows only). Re-enabling restores the old findings however old they are.
- Data: `brand_dossiers`.
- States: 400; 401; 403; 404; 500.
- Words: *"Not authenticated"*, *"Invalid session"*, *"Forbidden"*, *"Failed to load dossiers"*, *"Invalid JSON"*, *"Expected { id, action: 'disable' | 'enable' }"*, *"Lookup failed"*, *"Not found"*, *"Update failed"*, *"Internal error"*.
- Reachable: yes.

### C-69 · Disabling is not retroactive; aliases have no writer
- Where: `BDS:77, 105, 145-173, 284-290`; `ADMINPAGE:3-7, 60-61`; `ADMINAPI:4-6`; `src/lib/quote-xray/brand-normalize.ts:42-52`; repository search for `aliases` writers (none).
- Entry: —
- Does: a disabled dossier is left out of future ammo and scans; ammo already written onto runs keeps its findings (C-66). Every miss also runs an alias lookup (`contains("aliases", [key])`), but nothing writes `aliases` — no code, no admin control — so the lookup never hits and two spellings that canonicalise differently stay two dossiers.
- Rules: the page intro ("every future comparison") and the API header ("every future attach AND every future scan") are accurate; the page file's header ("one click disables a dossier everywhere") is not, for stored runs.
- Data: `brand_dossiers.aliases`; `quote_xrays.brand_ammo`.
- States: —
- Words: —
- Reachable: yes.

### C-70 · Ammo on the result — polling, ID-only
- Where: `PAGE:65-78`; `VerdictView.tsx:150-151, 222-310`; `PUB:35-39`; `BDS:44-47`; `src/types/app.ts:4749-4801`.
- Entry: a verdict result.
- Does: after a fresh run the page re-reads the run every 8 s until `brandAmmo` appears or 90 s pass; reopened runs never poll. The panel *"Key points you can use"* lists own-brand advantages, competitor-brand issues with impact chips, a suggested question and source links, and the clean-brands line (layout hand-off A).
- Rules: ID-only: stripped from the public resolve, absent from the WhatsApp draft (written before the ammo exists) and from every PDF. Links open third-party forums. No "still checking brands" indicator; after 90 s new ammo shows only on reload.
- Data: `quote_xrays.brand_ammo`.
- States: —
- Words: *"Key points you can use"*, *"your advantage"*, *"Your quote names <brand> — and users rate it well: <claim>"*, *"The other quote doesn't say what brand the client would get."*, *"<category> · in their quote"*, *"Impact: high"*, *"Impact: mild"*, *"Users on <domains> say: <claim> You can ask the other studio how they handle this with <brand>."*, *"We also checked <brands> — users report no real problems."*
- Reachable: yes.

---

## Notifications, activity and analytics

### C-71 · No notifications
- Where: `src/lib/notifications/**` (no X-Ray event or template); repository search.
- Entry: —
- Does: no bell, e-mail, WhatsApp or push for anything X-Ray: a run finishing (it is synchronous), ammo arriving (polling only), a share link minted, opened or expiring, a colleague deleting a run, a dossier disabled, the sweep failing.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-72 · No activity or audit trail
- Where: `CREATE`, `IDR`, `SHARE`, `PUB` (no `lead_activity_log`, `audit_log` or event writes); `MBASE:15, 33-34`.
- Entry: —
- Does: a run's only trail is its own `created_by`, `created_at` and `updated_at`. The lead's activity log records no run, share, send, delete or outcome; there is no studio audit, and no platform audit of dossier changes (C-68).
- Rules: `updated_at` moves on every PATCH and on the ammo write, so it does not say what changed; `created_by` is stored but shown nowhere (C-43).
- Data: `quote_xrays.created_by`, `created_at`, `updated_at`.
- States: —
- Words: —
- Reachable: n/a.

### C-73 · Usage events
- Where: `CREATE:721-736`; `src/lib/usage/track.ts:13-38`; `src/lib/usage/types.ts:63-77`; `src/lib/usage/rollup.ts:24-26`.
- Entry: a successful verdict run.
- Does: one `usage_events` row: `feature_succeeded`, feature `quote_xray`, properties `flow`, `lead_linked`, `own_from_lead`, `points_count`, `material_points`, `comp_brand_mentions`, `comp_named_any_brand`, `differing_brands`, `unknown_materials` (up to ten raw material names read from the quotes — the catalog-gap signal). Fire-and-forget through the scoped client; the daily rollup turns it into `feature.quote_xray.successes`.
- Rules: nothing for failures (`feature_failed` is never sent), legacy runs, parses, shares, sends or deletes.
- Data: `usage_events`.
- States: —
- Words: —
- Reachable: yes.

### C-74 · The funnel's "Opened" step is never fed — Admin analytics reads zero
- Where: `src/lib/usage/funnels.ts:57-64`; `src/lib/usage/client-event-names.ts:11-35`; `src/components/usage/page-view-tracker.tsx:6-25`; `src/app/api/admin/analytics/feature-matrix/route.ts:40-55`; `src/components/admin/analytics/feature-matrix.tsx:44-58, 86-93`.
- Entry: Admin › Analytics.
- Does: the funnel defines Quote X-Ray as *"Opened"* → *"Parsed successfully"*. Nothing emits `feature_opened` for `quote_xray` (it is not in the client allowlist; page views go in as `page_view` with a route and no feature). The admin feature matrix counts opens only, so Quote X-Ray always shows zero runs and zero adopting studios and never counts toward *"Features in use"*.
- Rules: *"Parsed successfully"* actually counts verdict runs, not parses. The Digitizer's parse route emits `feature_opened` for its own feature (`src/app/api/quotes/parse/route.ts:202`); the X-Ray's parse-file route reuses the parser library and emits nothing.
- Data: `usage_daily_rollup`, `fork_usage_rollup`.
- States: —
- Words: *"Quote X-Ray"*, *"Opened"*, *"Parsed successfully"*, *"Total runs"*, *"Features in use"*.
- Reachable: yes (bug).

### C-75 · Market observations — a write-only flywheel
- Where: `CREATE:423-427, 495-532, 718-719`; `MBASE:48-74`; `IDR:212-215`; `src/app/api/cron/aggregate-rates/route.ts:40, 97`; repository search (no reader).
- Entry: after a run.
- Does: every verdict run (and every legacy Market Intel or combined run) turns each present cell of the match matrix — own and competitor lines alike — into a cross-studio row: country, currency, category, `canonical_item` (the raw description of the row's first line), unit price, qty, line total, `source_xray_id`.
- Rules: no consent or opt-out. No studio id is stored, but the line text goes in verbatim and `source_xray_id` leads back to the studio through `quote_xrays`; deleting the run leaves the rows. Nothing reads the table — the "v2 Market Insights read path" (MBASE:49-51) was never built; benchmarks come from `platform_market_rates`, fed from `crowd_rate_signals` (hand-off B). Fixture runs feed it too (C-29).
- Data: `market_quote_observations`.
- States: failures logged only.
- Words: —
- Reachable: yes.

---

## Look-alikes and neighbours

### C-76 · Meeting Copilot's competitor-quote analyser
- Where: `src/app/api/copilot/competitor-quote/route.ts:1-262`; `src/components/copilot/copilot-session.tsx:959`; `src/__tests__/copilot-scoped-api.test.ts:576`.
- Entry: mAIson Live during a meeting.
- Does: a separate, older analyser: an image or text in; parsed items, missing items, pricing gaps, talking points, strengths and weaknesses out; its own prompt; nothing stored; a DRY_RUN mock without a key.
- Rules: session only (and `BYPASS_AUTH`-aware); shares no code, record or history with the X-Ray.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-77 · mAIson's `benchmark_quote`
- Where: `src/lib/agents/tools.ts:1524-1530, 1674`; `src/lib/agents/executors.ts:521-523`; `src/lib/agents/page-tool-map.ts:9-13, 35-39`.
- Entry: the assistant on the Quote Digitizer page.
- Does: *"Quote Benchmarker"* — "Compare a lead's quote against market rate benchmarks and optionally against a competitor quote (uploaded as file)", with a per-line verdict (competitive / overpriced / underpriced). Reads quote lines; writes no X-Ray row.
- Rules: mAIson has no X-Ray tool and no page mapping for `tools/quote-xray`.
- Data: —
- States: —
- Words: *"Quote Benchmarker agent — comparing pricing..."*
- Reachable: yes.

### C-78 · Purchase-order quote compare
- Where: `src/app/api/po/quote-compare/route.ts:1-30`.
- Entry: Finance purchase orders (hand-off to a later module).
- Does: compares a PO's draft lines with the project's signed quote (deterministic matcher, AI fallback for leftovers, a one-line insight) — a vendor-cost check, not a competitor comparison.
- Rules: shares the idea of line matching only.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-79 · Homeowner portal — no X-Ray, despite the type file
- Where: `src/types/app.ts:4222-4224`; `src/app/my/**`, `src/app/api/homeowner/**` (no X-Ray code).
- Entry: —
- Does: the type file's section header lists "Quote X-Ray" among homeowner-portal extensions, but the portal has no X-Ray surface. A homeowner meets a comparison only through a legacy share link (C-37) or a pasted message (C-38).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### C-80 · Operator scripts
- Where: `scripts/xray-tune.ts:1-118`; `scripts/cleanup/003_fleet_purge_demo_data.js:353`; `scripts/runners/migration-plan.js:431`; `scripts/fleet/git-state.mjs`, `scripts/fleet/__tests__/git-state.test.mjs:7-10`.
- Entry: the command line.
- Does: `xray-tune.ts` — a "Throwaway tuning harness" running the legacy pipeline with real AI calls on a fabricated own-vs-competitor pair (about four Gemini calls, no database). The fleet purge deletes runs of demo leads (standalone runs and observations stay). The migration plan orders the base-table migration. The fleet git-state inventory exists partly because the X-Ray once went missing from branch lines (C-30).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

---

## Docs vs code

Docs that mention the X-Ray: `docs/prd/12-quote-xray.md` (+ `docs/prd/README.md:22`), `docs/rules/tools.md`, `docs/rules/admin.md`, `src/components/landing/v2/changelog-data.ts`, the seven portal-merge UAT files under `docs/features/portal-merge-integration/`, and eight plans / specs / hand-offs under `docs/superpowers/` (C-86). `CLAUDE.md` and `docs/openmaison-v1-feature-requirements.csv` do not mention it (C-88).

### C-81 · PRD 12 (`docs/prd/12-quote-xray.md`)
- Where: `docs/prd/12-quote-xray.md:1-67`; `docs/prd/README.md:1-7, 22`.
- Entry: —
- Does: the doc says — status *Launched*, last updated 2026-06-12, a retrospective "as-shipped" PRD: a studio "uploads a competitor's (or its own) quote PDF/image; the AI parses and scores it per line item against market rates, flags missing items, and produces a shareable public link"; "Mounted into the lead drawer's Quotes section for in-context use"; target users include the homeowner ("Understand how a quote stacks up"); "A shareable result link is a low-friction acquisition/marketing surface".
- Rules: the code has been rebuilt twice since. The verdict flow compares exactly two quotes (never one), answers with a real-gap headline and up to three points, and cannot be shared as a link (C-31); only legacy sales / combined rows share, for 24 h, from rows the UI no longer lists (C-57). The drawer holds a link to the tool, not a mounted tool (C-48). The homeowner has no surface (C-79). The public page carries no studio branding, so it markets nothing (C-37). The PRD says nothing on outcomes, brand dossiers, roles, limits or the admin page.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-82 · `docs/rules/tools.md`
- Where: `docs/rules/tools.md:7, 11-16, 25`.
- Entry: —
- Does: the doc says tools are reachable "from sidebar, topbar grid, and bottom nav"; the X-Ray row: the 2026-08 verdict flow, lead-first through *"Beat this quote"*, "NO shareable portal, NO outcome capture", brand intelligence with a "platform-level `brand_dossiers` cache (90d TTL, SWR, negative-cache; migrations 277–278)", an "ID-only "Ammo" panel", an "hourly cron", "admin pruning", a "kill switch", and "Legacy 4-objective rows still render read-only; legacy sales-justifier share links unchanged."
- Rules: the X-Ray is in the sidebar only (C-23). "NO outcome capture" holds for the UI; the server still records outcomes (C-44). The dossiers came in 278 (277 is the verdict objective). The panel is titled *"Key points you can use"*, not "Ammo" (C-70). Legacy rows are not read-only — un-merge, share and PDF still run (C-57) — and combined rows share too, not only sales-justifier rows (C-34). The negative cache also stores scan failures (C-64). The TTL, the cron, the admin page and the kill switch are as described.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-83 · `docs/rules/admin.md`
- Where: `docs/rules/admin.md:11-16, 40, 54-65`.
- Entry: —
- Does: the doc's routes table: `/admin/brand-dossiers` — "Disable a dossier to remove it from every attach/re-scan. Wired to Supabase via `/api/admin/brand-dossiers`." Its Access section: password `admin123`, cookie `qanvast_admin_session=authenticated` (24 h). Its Data section: "Most admin data is **hardcoded mock data** (no Supabase)… **Exception**: `/admin/hangouts`".
- Rules: the dossier row holds for future attaches and scans, not for ammo stored on runs (C-69). Access has moved on: `admin_users` accounts with bcrypt passwords and an active flag, an HMAC-signed session carrying `role` and `allowedPages`, per-page guards at the edge and in the API (C-68). The Data section contradicts the doc's own dossier row.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-84 · The changelog entry
- Where: `src/components/landing/v2/changelog-data.ts:396-411`.
- Entry: the public `/changelog`.
- Does: one entry, 2026-05-14, *"X-ray any quote in seconds"*: *"Drop in a quote — yours or a competitor's — and see straight through it."*, *"AI reads every line and sorts it by trade."*, *"Prices are checked against local market rates, with under- and over-priced items flagged."*, *"Spot the items a quote quietly leaves out."*, *"Share the analysis with a private link."*
- Rules: no entry for the 2026-08-14 rebuild or brand intelligence. Today a comparison needs two quotes; the verdict's points flag below-market prices, not over-priced ones (the over-priced count lived in the legacy Gap Finder, hand-off B); the "private link" is an unauthenticated public link, 24 h, legacy rows only (C-35, C-36).
- Data: —
- States: —
- Words: as quoted.
- Reachable: —

### C-85 · The portal-merge UAT documents
- Where: `docs/features/portal-merge-integration/uat-plan.md:177-181, 249`; `uat-findings.md:93, 98, 127`; `uat-deep-findings.md:37-40, 72-73, 271, 287`; `uat-qa-sheet.csv:518-537`; `uat-transition-findings.md:133`; `uat-transition-scope.md:155`; `uat-qa-instructions.md:137`.
- Entry: —
- Does: the docs test four objective cards, two uploaded PDFs and *"Run X-Ray"*; X5.2 "Public share link `/sign/quote-xray/[token]` renders read-only"; X5.4 "Sidebar "Quote X-Ray" entry visible to owner/admin/id"; the share test asks to "Verify the public page only shows what's appropriate (no internal margin data)"; W4 records create 422s from malformed model JSON.
- Rules: written against the four-objective UI, which is gone (C-01). The share page is legacy-only now, and the API behind the "read-only" page returns the whole row (C-36). W4's path moved — parsing now runs per file with the shared parser's retries (C-06); its current rate was not re-measured. X5.4 still holds (C-20, C-23).
- Data: —
- States: —
- Words: —
- Reachable: —

### C-86 · Plans, specs and hand-offs that mention the X-Ray
- Where: `docs/superpowers/plans/2026-06-22-per-domain-port-playbook.md:41, 54`; `docs/superpowers/specs/2026-09-08-multi-region-branch-unification-design.md:86, 463`; `docs/superpowers/plans/2026-09-08-sp1-multi-region-branch-unification.md:1624`; `docs/superpowers/specs/2026-08-17-fleet-dashboard-design.md:20-22, 164-166`; `docs/superpowers/plans/2026-08-17-fleet-dashboard.md:706-749`; `docs/superpowers/specs/2026-08-21-ai-quote-drafter-grounding-redesign-design.md:69`; `docs/superpowers/plans/2026-06-23-individual-studio-analytics.md:610`; `docs/superpowers/handoff/2026-09-17-vendor-management/decision-ledger.md:229-231, 250-252`.
- Entry: —
- Does: the port playbook lists `quote_xrays` as a clean single-file domain and 217 as its lock, "public share-token route left service-role" (holds, C-15). The multi-region spec and plan fence off `quote-xrays/create/route.ts:447`, the currency-detection regex (line 447 is the SGD hint row — holds). The fleet spec and plan record 40 X-Ray commits missing from two branch lines (C-30). The drafter spec says `platform_market_rates` is "currently only consumed by Quote Insights/X-Ray" (hand-off B). The studio-analytics plan adds the `quote_xray` feature key (holds; its funnel never counts, C-74). The vendor-management ledger finds `VerdictUpload.tsx` to be an eleventh `SearchableSelect` consumer (holds).
- Rules: none of them describes roles, limits, sharing or outcomes for the X-Ray.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-87 · Source documents the code cites but the repository lacks
- Where: `MBASE:3, 71-72`; `CREATE:10, 252` ("spec §15.2"); `src/components/quote-xray/shared/FixInDigitizerLink.tsx:8` ("spec §15.3"); the `docs/features/` listing (no `quote-comparison/`).
- Entry: —
- Does: the table comment and two code comments point to `docs/features/quote-comparison/spec.md` (§15.2 cross-currency, §15.3 read-only); the folder is not in the repository. No spec or plan exists for the verdict rebuild, the outcomes feature ("Feature 6") or brand intelligence ("Phase 7", "workstream B/C", "the 2026-08-14 spike").
- Rules: the only written account of today's X-Ray is `docs/rules/tools.md:25` plus code comments.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-88 · The v1 feature-requirements sheet
- Where: `docs/openmaison-v1-feature-requirements.csv` rows 22-26.
- Entry: —
- Does: the Tools rows list AI Visualizer, 3-D Space Planner, Meetings-copilot (mAIson Live), Market Insights and Compliance Navigator.
- Rules: Quote X-Ray has no row — no stated approach, priority, status or per-role access.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-89 · Comments in code that no longer hold
- Where: as cited.
- Entry: —
- Does: (1) `SHARE:1-3` lists "verdict" as shareable — excluded (C-34). (2) `IDR:1-3` describes the route as a status update or un-merge — it also attaches leads and records outcomes. (3) `CREATE:1-16` describes the objective wizard and "For Objective C: append anonymised line observations" — the verdict path is its own handler and every verdict run writes observations. (4) `IDR:89-91` and `HOOKS:231-232`: attaching "restores outcome tracking + lead-scoped history" — neither exists (C-47). (5) `M278:50` "Flip to false to hide all ammo instantly" — stored ammo stays; `BDS:123-124` misstates the fail-open rule (C-66). (6) `ADMINPAGE:5-7` "one click disables a dossier everywhere" (C-69). (7) `combined-number.ts:3-5` calls the number "stable" (C-43). (8) `MBASE:48-51` "consumption is the v2 Market Insights read path" and "No studio_id / lead_id / vendor name retained — those are stripped server-side before insert" — never read, and line text is stored verbatim (C-75). (9) `src/types/app.ts:4223` lists the X-Ray among homeowner-portal extensions (C-79). (10) `next.config.ts:61-63` traces pdfjs for the route that no longer parses (C-30). (11) `QuoteXrayHistory.tsx:4-5` mentions "the environment's purge" — no purge exists in the repository. (12) `REC:11-13` and `IDR:11-12` keep inline copies of the transformer "on purpose" for a parallel slice — the row now has three hand-written shapes (`transformQuoteXray` and two `toQuoteXrayUi`).
- Rules: —
- Data: —
- States: —
- Words: as quoted.
- Reachable: —

---

## Uncertain / not verified

1. **Live legacy data** (C-32 … C-37, C-57): whether any legacy sales or combined rows with unexpired share tokens exist in any environment is not visible; the mint is reachable only through `?xrayId=`.
2. **"The environment's purge"** (C-56, C-89): the history comment implies a purge of legacy rows somewhere; no script in the repository does it.
3. **pdfjs tracing for parse-file on Vercel** (C-30): inferred from `next.config.ts` and the `require.resolve` call; whether deployed parses fall back to the vision path was not observed.
4. **Which upload limit bites first** (C-28): the route's 10 MB versus the platform's request-body ceiling (~4.5 MB per a code comment) was not exercised.
5. **Cross-tenant `lead_id`** (C-17): relies on Postgres checking foreign keys without RLS; not exercised.
6. **The picker with a Closed-bucket `?leadId=`** (C-49): `SearchableSelect`'s display of a value outside its options was not checked.
7. **An archived lead's drawer** (C-48, C-54): whether the read-only drawer still renders *"Beat this quote"* was not checked.
8. **Crons per deployment** (C-30, C-65): whether each fork line runs Vercel crons, and whether a 15-scan sweep finishes inside 120 s, were not measured.
9. **`after()` and `maxDuration`** (C-60): the verdict itself plus up to three 45 s scans may outlast the create route's 120 s budget and cut the enrichment; not verified.
10. **Page-visibility keys in data** (C-24): whether any environment holds a `tools/quote-xray` key is not visible.
11. **Cost figures** (C-27): "~1¢ per scan" comes from code comments only.
12. **Outcomes recorded 2026-07-27 → 2026-08-14** (C-45): how many rows hold an outcome was not queried.
13. **W4's current failure rate** (C-85): the parse path changed; not re-run.
14. **`created_by`** (C-72): the column references `profiles(id)`; that the session's `userId` is always a profile id is hand-off D.
15. **Designer lead scoping in the picker** (C-18, C-49): read from `app-context.tsx` and `filterLeadsForViewer`; the manager-hierarchy variant (Dyel flag) was not traced.
