# OpenMaison 1.0 — Quote X-Ray inventory · Slice B: the engine

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. Nothing was run — no server, no script, no test.

Conventions: *Words* are quoted verbatim from code; `{…}` marks an interpolated value. "Hand-off" = owned by another reader and only named here. Readers of this audit: **A** = screens (upload, result views, history, send dialog); **C** = routes and permissions, brand dossiers admin + cron, outcomes UI, docs; **D** = data (tables, migrations, row shapes). Abbreviations: `L/` = `src/lib/quote-xray/`; `CREATE` = `src/app/api/quote-xrays/create/route.ts`; `PF` = `src/lib/quote-parse/parse-file.ts`; `AI` = `src/lib/ai.ts`; `QC` = `src/lib/quote-compare.ts`; `Q` = `src/lib/queries/quote-xrays.ts`; `PAGE` = `src/app/(main)/tools/quote-xray/page.tsx`; `TYPES` = `src/types/app.ts`; `SEED` = `supabase/migrations/20260414000004_seed_market_rates.sql`. Money inside the engine is integer cents; parsed documents carry dollars.

## Vocabulary

- **Verdict flow / verdict row** — the live engine since the 2026-08 rebuild: the studio's quote vs one competitor quote → a code-computed "real gap" headline, at most 3 talking points and a WhatsApp draft; row `objective = 'verdict'`.
- **Legacy flow** — the four objectives *Gap Finder · Sales Justifier · Market Intel · Package Ladder* and the **combined** run (all four in one row). Still in the create route, no longer called by the UI; stored rows still render.
- **Own / competitor** — quote index 0 is always "ours" (`OWN_IDX = 0`); every other index is a competitor. Roles on inputs: `own · competitor · own-version`.
- **Parsed document** — `XrayParsedQuoteDocument`: vendor, date, issuer, client, ref, totals (dollars) and `lineItems` (`section · itemNumber · description · priceType · unitPrice · qty · unit · total`).
- **Match matrix** — rows = one logical scope item, one **cell** per quote (`present`, `lineIdx`, cents, `matchKind` `exact | tokens | ai`, `matchConfidence` for AI cells); plus `totals` per quote. **Orphan row** = present in exactly one quote. **AI-merged row** = carries `aiMergedFrom` (its original rows).
- **Canonical category** — the stable token `canonicaliseCategory()` makes of a section heading (`hacking`, `flooring`, … or the section's own words); **display label** = its human name. **Category gate** = lines only ever match within one canonical category.
- **Real gap** — `rawGap − missingScope + ownMissingScope`, where raw gap = own total − competitor total, missing scope = own lines the competitor lacks (at our prices), own missing scope = competitor lines we lack (at theirs).
- **Candidate fact** — a code-built, money-preformatted fact the verdict model may cite by index; **point** = `{ sayThis, evidence, confidence }`; **one-liner** = the headline sentence; **WhatsApp draft** = the editable client message.
- **Benchmark / band** — a `platform_market_rates` row (min · typical · max per unit, per country); **bridge** = the canonical-token → platform-category map; **item band** vs **category band** (blended fallback).
- **Below-market flag · arithmetic flag · matched-item defense** — deterministic line checks: competitor price ≥ 20 % under typical; stated total ≠ unit × qty; head-to-head on a shared row (`cheaper | premium`).
- **Material fact** — a curated, physics-only weakness of a material (MDF, laminate, …) matched on competitor lines; **glass-house rule** = never fire when our quote uses the same material; **context gate** = wet-area / heat-area words required.
- **Brand mention** — an AI (NER) extraction `{ quoteIdx, lineIndex, brand }`; **differing brand** = a competitor brand our quote never names; **own-brand advantage** = a brand only our quote names.
- **Dossier** — a platform-wide cached web scan of one brand (`brand_dossiers`); **brand ammo** = the per-run ID-only findings written to `quote_xrays.brand_ammo` after the response; **kill switch** = `platform_config.quote_xray_brand_ammo_enabled`.
- **Observation** — an "anonymised" line written to `market_quote_observations` after a run (the "market-data flywheel").
- **Live AI / fixture** — `liveAI = !DRY_RUN && OPENROUTER_API_KEY`; without it the engine persists deterministic fixtures.
- **Weak objective** — an objective the uploaded roles do not fit (combined runs only).

---

## The two flows and the pipeline

### B-01 · Two engines behind one route; only Verdict is live
- Where: `CREATE:1-16, 162-208, 542-752`; `Q:112-163` (legacy caller), `Q:172-231` (verdict caller); `PAGE:63, 339-397`; `docs/rules/tools.md` (Quote X-Ray row); `docs/prd/12-quote-xray.md`.
- Entry: `POST /api/quote-xrays/create` with `objective`.
- Does: `objective: "verdict"` → `handleVerdictCreate` (own vs one competitor → real-gap headline + ≤ 3 points + WhatsApp draft). `gap-finder · sales-justifier · market-intel · package-ladder` → the legacy single-objective path (B-03); `"combined"` → all four objectives in one row (B-04).
- Rules: the tool page only uses `useCreateVerdictXray`; `useCreateQuoteXray` (the only legacy/combined caller) has no importer, so the legacy engines run only on a direct API call. Stored legacy rows still render read-only (`PAGE:339-397`). The PRD (last updated 2026-06-12) still describes per-line scoring of every line against market rates and a shareable link — neither is what the Verdict engine does (docs hand-off C).
- Data: one `quote_xrays` row per run: `studio_id, lead_id, created_by, objective, status "ready", currency_code, inputs, match_result, ai_synthesis` (hand-off D).
- States: —
- Words: —
- Reachable: verdict yes; legacy and combined API only.

### B-02 · The Verdict pipeline, step by step
- Where: `CREATE:542-752`.
- Entry: B-01 with `objective: "verdict"`.
- Does: (1) validate: `compParsed` required; `ownParsed` or `leadId` required; (2) in parallel — own side (uploaded parse → `toXrayParsedDoc`, else `loadOwnQuoteFromLead(scoped, leadId, ownQuoteId)`, B-18), competitor side, the studio's name; (3) labels (B-21); (4) currency check on uploaded sides only (B-22); (5) `inputs` = [own (`role own`), competitor (`role competitor`)], both stamped with the studio currency; (6) start brand + material NER (B-76) so it overlaps the next steps; (7) `buildMatchMatrix` (B-27) then `refineMatchWithAI` (B-30) when live; (8) `fetchMarketBenchmarks` for every canonical category in the matrix, awaited together with the NER; (9) `deriveBrandComparison` + `deriveOwnBrandAdvantages` (B-77, B-78); (10) `buildVerdict` (B-38…B-52); (11) insert the row with `objective "verdict"`; (12) append market observations (B-101); (13) telemetry (B-102); (14) `after()` brand-ammo enrichment when live and any brand differs (B-81).
- Rules: exactly two quotes, own always index 0. Benchmarks are fetched on every verdict run (the legacy path fetched them only for Sales Justifier / combined). All numbers are computed in code; the model only phrases (B-46).
- Data: body `{ objective, compParsed, compFileName?, compLabel?, ownParsed?, ownFileName?, ownLabel?, leadId?, ownQuoteId? }` → the saved row through `transformQuoteXray`.
- States: B-09.
- Words: B-09.
- Reachable: yes.

### B-03 · The legacy single-objective pipeline
- Where: `CREATE:59-69, 162-245, 272-315, 327-336, 379-391, 397-429`; `CREATE:96-160` (`buildObjectiveSynthesis`).
- Entry: `POST /create` with one of the four objectives (API only).
- Does: each objective needs 2–3 quotes (`OBJECTIVE_MIN_QUOTES` = 2 for all four, `OBJECTIVE_MAX_QUOTES` = 3). Each slot `{ parsed, label (default "Quote {n}"), role (default "competitor"), sourceFileName (default "quote-{n}") }`; slots are reordered own-first (`own` and `own-version` first, stable within groups); currency check (B-22); `inputs`; matrix + AI refine (gated on `!DRY_RUN && key`); benchmarks only for Sales Justifier; `buildObjectiveSynthesis` = base AI synthesis (B-87) + the Sales Justifier's deterministic attachments (B-93) + Market Intel anonymising (B-94); insert; observations only for Market Intel.
- Rules: roles are never checked against the objective — a Sales Justifier run on two competitor quotes treats the first competitor as "ours" and every own-side derivation reads it; a Market Intel run anchors its matrix on its first competitor.
- Data: body `{ objective, leadId?, quotes: [{ parsed, label, role, sourceFileName }] }`.
- States: B-08.
- Words: B-08.
- Reachable: API only.

### B-04 · The combined run (all four objectives at once)
- Where: `CREATE:192-208, 217, 328, 350-378, 425-427`; `TYPES:4674-4680`.
- Entry: `objective: "combined"`.
- Does: runs `buildObjectiveSynthesis` for the four objectives concurrently; each failure is caught to `null` and dropped; stores `{ kind: "combined", primary, results, weak }`; the row's `objective` column is `primary` = the first objective (fixed order gap-finder → sales-justifier → market-intel → package-ladder) that fits the upload and produced a result, else the first that produced one, else `"gap-finder"`. Benchmarks are fetched and observations appended.
- Rules: all four run even when weak — e.g. the model is still asked for package tiers from one own + one competitor quote. Minimum 2 quotes. All four failing → 502.
- Data: `CombinedXraySynthesis`.
- States: all objectives failed → 502 `synthesis_failed`.
- Words: *"The AI analysis couldn't be completed. Please try again in a moment."*
- Reachable: API only.

### B-05 · Weak objectives
- Where: `CREATE:75-89`.
- Entry: B-04.
- Does: own = count of roles `own` + `own-version`; comp = count of `competitor`. Gap Finder and Sales Justifier are weak unless own ≥ 1 and comp ≥ 1; Market Intel is weak when comp < 2; Package Ladder is weak when own < 2.
- Rules: computed for combined runs only; a single-objective run with the wrong roles is not refused (B-03).
- Data: `weak: QuoteXrayObjective[]` on the combined synthesis.
- States: —
- Words: —
- Reachable: API only.

### B-06 · Live AI vs fixtures (DRY_RUN and a missing key)
- Where: `CREATE:54-57, 313, 339-342, 647-650`; `PF:176-180`; `L/ai-match.ts:256`; `L/brand-comparison.ts:157`; `L/matched-item-defense.ts:102`; `L/brand-scan.ts:189-192`; `L/verdict.ts:297-315, 367-369`.
- Entry: every run.
- Does: `DRY_RUN` is a hard-coded `false` (commented toggle); `liveAI = !DRY_RUN && OPENROUTER_API_KEY set`. Without the key: every uploaded file parses to one fixture document (B-15); AI match, NER, premium justifications and brand scans are skipped; legacy runs persist `dryRunSynthesis` (B-96…B-99); verdict runs persist `buildVerdictFixture` (B-51); no brand enrichment.
- Rules: fixture output is saved as an ordinary `ready` row with no marker. The legacy comment "Surface a real retry instead of leaking DRY_RUN placeholder content" (`CREATE:383`) covers a thrown synthesis only; the no-key path persists the *"(DRY_RUN) …"* copy.
- Data: —
- States: console warnings only (*"OPENROUTER_API_KEY not set — using DRY_RUN synthesis"*, *"… using deterministic verdict fixture"*).
- Words: fixture copy in B-15, B-51, B-96…B-99.
- Reachable: environments without `OPENROUTER_API_KEY`.

### B-07 · Time budgets, runtime and concurrency
- Where: `CREATE:47-52, 652-673, 738-749`; `src/app/api/quote-xrays/parse-file/route.ts:20-23`; `PF:14-16, 182-183`; `L/brand-scan.ts:26`; `Q:13-25, 128-139, 190-201`; `PAGE:64-78`.
- Entry: —
- Does: both routes run on Node with `maxDuration = 120` s. The browser parses each file in its own request, in parallel; the parse aborts at 120 s; a brand scan aborts at 45 s. The verdict overlaps the NER with matching and the benchmark read. Brand enrichment runs in `after()` once the response is sent; the page polls the row every 8 s for up to 90 s for ammo, only for a verdict run created in this session.
- Rules: the NER, AI match, verdict and legacy synthesis calls carry no timeout or abort signal of their own — only the platform's 120 s ceiling, so a hung model call ends as a platform timeout, not the route's JSON error. The route comment speaks of "the 60-second verdict promise" (`CREATE:739`); nothing enforces 60 s.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-08 · Legacy create — errors and codes
- Where: `CREATE:168-241, 258-269, 365-370, 380-390, 413-421, 430-441`.
- Entry: B-03, B-04.
- Does: returns JSON errors with an HTTP status and, where set, a `code`.
- Rules: 401 without a `qanvast_session` cookie; body must be JSON; the cross-currency refusal returns the per-quote `detected` list; insert failures return the database `code`, `details` and `hint`; unhandled errors include the stack in development.
- Data: —
- States: as Words.
- Words: *"Not authenticated"*; *"Could not read the request. Parse your files first, then retry."* (`BODY_PARSE_FAILED`, 400); *"Invalid objective"*; *"This requires {min}–3 quotes."*; *"Missing parsed quote at slot {i}"*; *"Cross-currency comparisons aren't supported in v1. Studio currency: {code}. Detected: {codes}."* (`currency_mismatch`); *"The AI analysis couldn't be completed. Please try again in a moment."* (`synthesis_failed`, 502); *"Failed to save X-Ray"* (500); *"Quote X-Ray failed to complete"* (`UNHANDLED`, 500).
- Reachable: API only.

### B-09 · Verdict create — errors, codes and defaults
- Where: `CREATE:546-565, 576-594, 616-636, 675-716`; `PAGE:123-133`.
- Entry: B-02.
- Does: returns JSON errors with a `code`; the page maps `currency_mismatch` to its currency-error step and `NO_LEAD_QUOTE` to the own-upload step (hand-off A).
- Rules: `NO_LEAD_QUOTE` covers both "the lead has no standard quote" and "the quote has no scope lines" — the copy says "no digitized quote yet" in both cases (B-18). `DEGENERATE_COMPARISON` cannot fire with two quotes (B-37).
- Data: —
- States: as Words.
- Words: *"Missing the competitor's quote file."* (`MISSING_COMP_FILE`, 400); *"Provide your own quote — link a lead with a digitized quote, or upload your quote file."* (`NO_OWN_SOURCE`, 400); *"Could not load this lead's quote. Try again, or upload your quote file."* (`LEAD_QUOTE_LOAD_FAILED`, 500); *"This lead has no digitized quote yet — upload your quote file to compare."* (`NO_LEAD_QUOTE`, 422); *"Cross-currency comparisons aren't supported. Studio currency: {code}. Detected: {codes}."* (`currency_mismatch`, 400); *"The comparison couldn't be completed. Please try again in a moment."* (`synthesis_failed`, 502); *"Couldn't compare these quotes — one of them has no readable totals."* (`DEGENERATE_COMPARISON`, 422); *"Failed to save the comparison"* (500). Defaults: labels *"Competitor quote"*, *"Our quote"*; file names `competitor-quote`, `own-quote`, `digitized:{quoteId}`.
- Reachable: yes (`DEGENERATE_COMPARISON`: no).

---

## Parsing the uploaded quotes

### B-10 · One file per request
- Where: `src/app/api/quote-xrays/parse-file/route.ts:1-64`; `Q:13-25, 128-139, 190-201`.
- Entry: the tool's upload, once per file, in parallel from the browser.
- Does: multipart `file` → `parseQuoteFile(file, studioRegion)` → the parsed document as JSON, or `{ error, detail }` with the helper's status. The browser then posts only parsed JSON to `/create`.
- Rules: split out so no request carries more than one file (the platform's request-size 413; restored 2026-08-17 per the header). The browser names the failing slot. Session cookie only, no role check (hand-off C).
- Data: `ParsedQuoteDocument` (`src/app/api/quotes/parse/route.ts:51-110`).
- States: as Words.
- Words: *"Not authenticated"*; *"Could not read the uploaded file."*; *"No file provided"*; *"Could not parse document. Try again or add items manually."*; browser wrappers *"Quote {n} ({label}): {error}"* (legacy), *"Competitor quote ({file name}): {error}"*, *"Your quote ({file name}): {error}"* (verdict), *"Parse failed"*, *"Request failed: {status}"*.
- Reachable: yes.

### B-11 · File guards and the text-vs-vision decision
- Where: `PF:18-48, 54-87, 159-202`.
- Entry: B-10.
- Does: ≤ 10 MB (413). MIME from the browser, else from the extension (`pdf png jpg jpeg csv xlsx`; unknown → the browser MIME or `application/pdf`). Accepted: CSV and XLSX (text), PDF, PNG and JPEG (image). CSV → its text; XLSX → the first sheet only, as CSV; PDF → the pdfjs text layer (at most 40 pages, items joined by spaces, pages by newlines) — ≥ 200 characters → text path, fewer → the whole PDF goes to vision as a base64 data URL; PNG / JPEG → vision.
- Rules: `.xls`, `.docx`, HEIC and every sheet after the first are never read. The 40-page cap applies to text extraction only — a long scan still goes whole to vision. Text extraction never throws; any failure silently falls back to vision.
- Data: —
- States: 413 / 415.
- Words: *"File too large. Maximum size is 10MB."*; *"Unsupported file type. Upload a PDF, image, CSV or Excel file."*
- Reachable: yes.

### B-12 · The extraction prompt and model
- Where: `PF:13, 89-132, 186-215`; `AI:301-313` (`buildImageMessage`), `AI:368-373` (`buildTextMessage`); `src/app/api/quotes/parse/route.ts:112-161` (the digitizer's copy).
- Entry: B-10.
- Does: `google/gemini-2.5-flash` through OpenRouter, JSON mode, 32 768 output tokens (65 536 on a truncated retry, B-13), no temperature. The prompt opens *"You are an expert at parsing {region label} interior design contractor quotations. Extract ALL individual line items from this document and return them as JSON."* Rules it gives: section headings (examples "A HACKING & PROTECTION WORKS", "AUTHORITY APPROVALS & PRELIMINARIES", "JOINERY: KITCHEN & WARDROBES") are the `section` of the items under them, never items; sub-total, section-total and grand-total rows are skipped; per item `itemNumber, description, priceType, unitPrice, qty, unit, total`; `priceType` ∈ `amount`, `foc` (unitPrice 0), `kiv` (null), `inclusive` (0), `by_client` (null), `lump_sum` (null, for "L/S"); BOQ documents → the numbered sub-items; missing qty/unit → `1` / `"lot"`; header/footer `vendor, date, issuedBy, clientName, subTotal, discount, grandTotal`; a payment schedule as `paymentSchedule` when present; JSON only. The text path appends `\n\n---\nDOCUMENT CONTENT:\n{text}` to the prompt.
- Rules: `parse-file.ts` claims to be "1:1 — same prompt, same model" as `/api/quotes/parse`, but that route keeps its own copy with *CRITICAL ANTI-HALLUCINATION RULES* (only literal values; unclear price → `kiv` + null; never compute a missing total unless both numbers are visible) and a per-line `confidence` — the X-Ray parse has neither, so it may infer prices and compute totals, which feeds the arithmetic check (B-64) and every total downstream. The digitizer route also has no PDF-text fast path. Region label = `Singapore · Malaysia · UAE · India · Egypt`.
- Data: —
- States: B-16.
- Words: —
- Reachable: yes.

### B-13 · JSON calls, retries and repair
- Where: `AI:48-88, 135-205`; `src/lib/json-repair.ts:107-136`.
- Entry: parse, AI match, NER, premium justifications, legacy synthesis, verdict (every engine call except the brand scan, B-83).
- Does: `callOpenRouterJson` makes at most two attempts. Attempt 2 uses `retryMaxTokens` only when attempt 1 ended `finish_reason = length` and a larger budget exists (the parse only); otherwise the same budget. A thrown call (HTTP error, "no choices", network) or unparseable JSON triggers attempt 2; the last error is thrown. `safeParseJson` tries five tiers: direct → strip fences → escape control characters and bad escapes inside strings → drop dangling commas → close truncated JSON. JSON mode sends `response_format: { type: "json_object" }`; every call sends `HTTP-Referer: https://qanvast.com`, one user message, no system prompt.
- Rules: deliberately no deeper structural repair ("plausible-but-wrong" is worse than a retry). Token usage and cost are never recorded.
- Data: —
- States: callers' fallbacks (parse → B-16; AI match / NER / premium → empty; verdict / legacy synthesis → 502).
- Words: —
- Reachable: yes.

### B-14 · After the parse — sanitising and the X-Ray shape
- Where: `PF:233-243`; `CREATE:272-304, 471-493`; `TYPES:4419-4456`; `L/three-way-match.ts:42-45, 179-182`.
- Entry: B-10 → B-02 / B-03.
- Does: the parser forces `lineItems` to an array and coerces `vendor, date, issuedBy, clientName, refNumber, description` to string or null. Create reshapes each document: `section ?? ""`, `itemNumber ?? 0`, `description ?? ""`, `priceType ?? "amount"`, `unitPrice`, `qty ?? 1`, `unit ?? "lot"`, `total`; `paymentSchedule` is dropped.
- Rules: numbers are never coerced — a price or total the model returns as a string (`"450"`) fails `Number.isFinite` and becomes null (unpriced), and a string grand total becomes 0. No check that the lines add up to the stated sub-total or grand total; discounts and GST lines are carried as header numbers only.
- Data: `QuoteXrayInputs` (`inputs` column).
- States: —
- Words: —
- Reachable: yes.

### B-15 · The no-key parse fixture
- Where: `PF:134-150, 176-180`.
- Entry: B-10 without `OPENROUTER_API_KEY`.
- Does: every file parses to one fixed document: vendor *"Home Create Pte Ltd"*, date 2024-01-15, issued by *"James Tan"*, sub-total 28 500, discount 1 500, grand total 27 000, seven lines — *"Hacking of existing floor tiles"*, *"Build new partition wall (115mm brick)"*, *"Waterproofing to wet area floor"*, *"Supply & install shower mixer"*, *"13A power points (addition)"*, *"Kitchen top & bottom cabinets (laminate finish)"*, *"Supply & lay 60x60 homogeneous tiles to living area"*.
- Rules: a verdict run then labels the competitor *"Home Create Pte Ltd"* (B-21), and a two-upload run compares the fixture with itself.
- Data: —
- States: —
- Words: as Does.
- Reachable: no-key environments.

### B-16 · Parse failures
- Where: `PF:216-230, 244-249`.
- Entry: B-10.
- Does: a model failure after retries → 422 with an abort/timeout message or a generic one; any other throw → 500; `detail` carries the raw reason.
- Rules: "add items manually" points at the digitizer — the X-Ray has no manual line entry.
- Data: —
- States: as Words.
- Words: *"This file took too long to read — it may be a large scan or photo. Try a clearer, text-based PDF, or add items manually."*; *"Could not read this document (the AI returned an unusable response). It may be a scan or photo — try a text-based PDF, or add items manually."*; *"Could not parse document. Try again or add items manually."*
- Reachable: yes.

---

## The own quote from the lead

### B-17 · The lead's quotes (picker data)
- Where: `src/app/api/quote-xrays/lead-quotes/route.ts:1-51`; `Q:77-106`.
- Entry: the upload card, when a lead is chosen (screens hand-off A).
- Does: `GET ?leadId=` → the lead's `standard` quotes, primary first, then newest `updated_at`: `{ id, label (label → quote_number → "Quote"), quoteNumber, status (default "draft"), isPrimary, totalCents (BIGINT string → Number, else 0), updatedAt }`. The card shows 0 → own upload, 1 → confirmation, 2+ → a picker that posts `ownQuoteId`.
- Rules: no status filter (drafts, rejected and expired quotes are offered) and no line-item check — a quote with no lines is offered, then fails as `NO_LEAD_QUOTE` (B-18). The ordering is the loader's default pick.
- Data: `quotes` through the scoped client.
- States: as Words.
- Words: *"Missing leadId"*; *"Lookup failed"*; *"Internal error"*; fallback label *"Quote"*.
- Reachable: yes.

### B-18 · Which quote becomes "ours"
- Where: `L/own-quote-from-lead.ts:56-119`.
- Entry: B-02 with `leadId` and no own upload.
- Does: the lead's `standard` quotes (variation orders excluded), narrowed to `ownQuoteId` when given, ordered primary first then newest, first one taken → its `quote_line_items` by `sort_order`; none → the lead's legacy lines with `quote_id` null; omission lines (`is_omission`) removed; none left → `no_items`. Returns `{ ok, parsed, quoteId, label }` or `{ ok: false, reason: no_quote | no_items | load_failed }`; never throws.
- Rules: the legacy fallback also runs when an explicitly picked quote has no lines — that quote's totals are then paired with another set of lines. Any status is accepted. `no_quote` and `no_items` share the same 422 (B-09).
- Data: `quotes`, `quote_line_items` (hand-off D).
- States: `load_failed` → 500 (B-09).
- Words: —
- Reachable: yes.

### B-19 · A digitized line as a parsed line
- Where: `L/own-quote-from-lead.ts:21-54`.
- Entry: B-18.
- Does: `section` = the line's `category`, else *"General"* (→ canonical `misc`); `description` = HTML-stripped `"{name} — {description}"` (either alone when the other is empty or both are equal); `priceType` = `foc` / `inclusive` when `amount_marker` says so, else `price_type`, else `amount`; `unitPrice` = `unit_price`; `qty` (default 1); `unit` (default `lot`); `total`; `itemNumber` = position + 1.
- Rules: name and specification are joined "for the matcher — more tokens"; the own side's descriptions are therefore longer than a parsed competitor's, which defeats exact matches while the smaller-set overlap (B-26) still passes. A studio that categorises lines by room gets room categories (B-24).
- Data: `quote_line_items.name, description, category, price_type, amount_marker, unit_price, qty, unit, total`.
- States: —
- Words: *"General"*.
- Reachable: yes.

### B-20 · Own totals, and what the loader ignores
- Where: `L/own-quote-from-lead.ts:121-156`; `src/app/api/quotes/line-items/route.ts:14`.
- Entry: B-18.
- Does: `grandTotal` = `quotes.total_cents / 100` (Number; 0 treated as absent), `subTotal` and `discount` likewise; when the total is absent → the sum of `amount` and `lump_sum` line totals if > 0, else null. Vendor, date, issuer and client are null; `refNumber` = `quote_number`.
- Rules: `total_cents` is "FINAL incl-GST, incl-discount, GST-after-discount", while line totals are before GST and before the quote discount — the headline and the missing-scope money use different bases (B-37). Only `is_omission` and `amount_marker` are honoured: `is_optional` lines, every `package_tier`'s lines, line discounts, tax and waste fields all count as plain scope. A quote whose `total_cents` is genuinely 0 falls back to the line sum.
- Data: `quotes.total_cents, subtotal_cents, discount_cents, quote_number`.
- States: —
- Words: —
- Reachable: yes.

### B-21 · Labels for the two sides
- Where: `CREATE:552-555, 596-622`; `L/own-quote-from-lead.ts:151-156`.
- Entry: B-02.
- Does: own label = the studio's name (`studios.name`), else the body's `ownLabel`, else *"Our quote"*; competitor label = the parsed `vendor` (the letterhead), else the body's `compLabel`, else *"Competitor quote"*.
- Rules: the loader's own `label` (quote label → number → *"Our quote"*) is returned and never used. The competitor label is whatever the parser put in `vendor` — a misread (the client's name, a supplier) becomes "the competitor" in every fact (B-39…B-45) and in the fixture's WhatsApp lines (B-51).
- Data: `inputs.quotes[].label`.
- States: studio-name lookup failure → falls back silently.
- Words: *"Our quote"*, *"Competitor quote"*.
- Reachable: yes.

---

## Currency

### B-22 · Currency sniffing and refusal
- Where: `CREATE:252-269, 446-467, 624-636`.
- Entry: B-02 (uploaded sides only), B-03.
- Does: haystack = vendor + issuedBy + description + file name + the first 8 line descriptions; hints tried in order — SGD (`\bS\$`, `\bSGD\b`, "Singapore Dollar(s)"), MYR (`\bRM\b`, `\bMYR\b`, "Ringgit"), AED (`\bAED\b`, "Dirham"), INR (`\bINR\b`, `\bRs\.?`, "Rupee(s)"); the first hit wins; any detected code other than the studio currency refuses the run.
- Rules: amounts are never inspected (the parser returns bare numbers); units, totals and later lines are outside the haystack. `\bRM\b` is case-sensitive while `\bRs\.?` is not (any word starting "rs" reads as rupees). A MYR studio's quote whose header shows "S$" is refused even when "RM" also appears. No hint for EGP although Egypt is a region. The own quote loaded from the lead is never checked. Every quote is stamped with the studio currency — there is no conversion.
- Data: `inputs.quotes[].currencyCode`, `quote_xrays.currency_code`.
- States: 400 `currency_mismatch` with `detected`.
- Words: B-08, B-09.
- Reachable: yes.

---

## Categories

### B-23 · The canonical category table
- Where: `L/canonical-categories.ts:1-35`.
- Entry: B-24.
- Does: 16 canonical tokens, 68 aliases: **hacking** (hacking, protection, demolition, demo) · **masonry** (masonry, brickwork, wet works, wet area, waterproofing, screed) · **plumbing** (plumbing, sanitary, pipe, water point, drain) · **electrical** (electrical, wiring, power point, `db ` with a trailing space, dboard) · **carpentry** (carpentry, cabinet, wardrobe, joinery, shelving) · **painting** (painting, paint, emulsion) · **flooring** (flooring, floor works, tiling, vinyl, parquet, marble, homogeneous) · **ceiling** (ceiling, false ceiling, cove) · **glasswork** (glass, mirror, shower screen) · **metalwork** (metal, stainless, aluminium, aluminum) · **appliances** (appliance, hob, hood, oven, fridge) · **lighting** (light, lamp, fixture) · **curtains** (curtain, blind, drapery) · **airconditioning** (aircon, hvac, air-con, air conditioning) · **preliminaries** (preliminary, preliminaries, authority, submission, approval) · **misc** (other, miscellaneous, general).
- Rules: Singapore trade vocabulary only — no rooms, doors/windows, furniture, ACMV, plaster/partition or loose items.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-24 · How a section heading becomes a category
- Where: `L/canonical-categories.ts:37-50`.
- Entry: the matcher (B-27), benchmarks (B-57…B-62), flags, material facts, brand categories.
- Does: lowercase the section; the first alias (table order) found anywhere in it as a substring wins; else strip a leading "single letter + whitespace", turn non-alphanumerics into spaces, trim — that string is the category; empty or null → `misc`.
- Rules: substring and order effects — "Floor protection" → hacking; "Wall tiling" → flooring; "Cove lighting" → ceiling; a "Marble countertop" section → flooring; "Kitchen cabinets & appliances" → carpentry; "Lighting & electrical" → electrical. Unknown headings keep their own words, so a room-organised quote ("Kitchen", "Master Bedroom") never shares a category with a trade-organised one, and the category gate then blocks every deterministic and AI match between them (B-27, B-32). Fallback quirks: "1. KITCHEN" → `1  kitchen` (numbers not stripped, inner spaces not collapsed), "A. KITCHEN" → `a  kitchen`, "KITCHEN" → `kitchen` — three different categories.
- Data: `canonicalCategory` on every matrix row.
- States: —
- Words: —
- Reachable: yes.

### B-25 · Category display labels
- Where: `L/canonical-categories.ts:52-73`.
- Entry: prompts, fact text, flags, views.
- Does: known tokens → labels; unknown tokens → each word capitalised ("stargate works" → "Stargate Works").
- Rules: fact sentences lowercase these labels (B-44, B-45).
- Data: —
- States: —
- Words: *"Hacking & Protection"*, *"Masonry"*, *"Plumbing"*, *"Electrical"*, *"Carpentry"*, *"Painting"*, *"Flooring"*, *"Ceiling"*, *"Glasswork"*, *"Metalwork"*, *"Appliances"*, *"Lighting"*, *"Curtains & Blinds"*, *"Air Conditioning"*, *"Preliminaries"*, *"Other"*.
- Reachable: yes.

---

## Deterministic matching

### B-26 · Description normalising and token overlap
- Where: `QC:72-102`.
- Entry: B-27, B-59 (shared with the digitizer's quote-vs-PO compare).
- Does: `normaliseDescription` lowercases, turns non-alphanumerics into spaces, splits, sorts and re-joins the tokens ("Kitchen-demolition!" → "demolition kitchen"); `tokenOverlap(a, b)` = shared distinct tokens ÷ the smaller token set, 0…1.
- Rules: no stop words, no stemming, no synonyms, no number handling — "of", "and", "to", "supply", "install" count as evidence; "tile" ≠ "tiles"; the smaller-set denominator lets any short line match every longer line that contains its words.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-27 · The match matrix
- Where: `L/three-way-match.ts:1-26, 47-58, 73-185`.
- Entry: B-02, B-03.
- Does: each line gets its canonical category, normalised text, cents (`round(× 100)`), qty (default 1). Pass 1: every line of quote 0 opens its own row. Pass 2: each line of quotes 1…n, in document order, joins the first row of the same category not yet holding that quote whose normalised text is identical ("exact"); else the same-category row with the highest overlap against the row's label, if ≥ 0.6 ("tokens"; ties → the earliest row); else it opens a new row. Output: rows `{ canonicalDescription (the opening line's text), canonicalCategory, cells[] }` with one cell per quote, plus `totals`.
- Rules: greedy, first-come — an early line can take a row that a later line of the same quote fits better; a candidate is compared only with the row's label, never with the row's other members; one line per quote per row; price, unit and qty never influence matching; quote 0's wording labels every shared row.
- Data: `match_result.matrix`.
- States: no quotes → empty matrix.
- Words: —
- Reachable: yes.

### B-28 · Cells and totals
- Where: `L/three-way-match.ts:156-182`; `TYPES:4458-4485`.
- Entry: B-27.
- Does: a present cell carries `lineIdx`, `unitPriceCents`, `qty`, `totalCents`, `matchKind`; an absent one `{ quoteIdx, present: false }`. `totals[i].grandTotalCents = round(grandTotal × 100)`, null → 0.
- Rules: anchor cells and freshly opened rows are stamped `matchKind: "exact"` although nothing was matched. A quote with no readable grand total gets 0, not null — downstream it is a S$0 quote (B-37, B-103).
- Data: `match_result.totals`.
- States: —
- Words: —
- Reachable: yes.

### B-29 · Matching failure modes built into the rules
- Where: `L/three-way-match.ts`; `QC:76-102`; `L/canonical-categories.ts:41-50`.
- Entry: —
- Does: —
- Rules: false merges — "Hacking of wall tiles" vs "Hacking of floor tiles" scores 3/4 = 0.75 and joins; "13A power point" vs "15A power point" joins. False gaps — one quote's per-room repeated lines against the other's single consolidated line leave the extra rows "missing"; room vs trade headings never match (B-24); the same work filed under different trades (floor protection under Hacking vs Preliminaries) never matches. Every false gap flows straight into missing-scope money (B-36).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## The AI merge pass

### B-30 · When the AI merge pass runs
- Where: `L/ai-match.ts:1-30, 189-218, 247-276`; `CREATE:306-315, 659-662`.
- Entry: B-02 (live), B-03 (`!DRY_RUN && key`).
- Does: candidates = rows present in at least one but not every quote. Skipped when fewer than 2 orphan rows (present in exactly one quote), when there are more than 80 candidates, or when no category has ≥ 2 candidate rows drawn from ≥ 2 different quotes. Any failure returns the deterministic matrix.
- Rules: the 80-row cap switches the pass off completely for large or dissimilar quote pairs — silently, the deterministic matrix is used. `MIN_CONFIDENCE = 0.7`, `MIN_ORPHAN_ROWS = 2`, `MAX_CANDIDATE_ROWS = 80`.
- Data: —
- States: *"refine failed, using deterministic matrix"* (log only).
- Words: —
- Reachable: yes.

### B-31 · The merge prompt
- Where: `L/ai-match.ts:220-245, 260-267`.
- Entry: B-30.
- Does: `google/gemini-2.5-flash`, JSON mode, 4 096 tokens. Lists each usable category (display label) with its rows as `[r{index}] "{label}" — in quote(s) {i, j}`. Instructions: the rows "were NOT auto-matched by string similarity, but some describe the SAME physical scope item in different words" (example "Hack & dispose existing floor finishes" / "Removal of old tiling"); only group rows under the same category; never group rows already present in the same quote; *merge the same scope item even if the material, brand, grade or finish differs* ("kitchen cabinets in quartz" vs "kitchen carpentry in laminate", two tap brands — "the difference is analysed separately downstream"); keep genuinely different items apart (kitchen cabinets vs a TV feature wall); when unsure, do not merge; ignore price. Output `{ "merges": [ { "rowIds": ["r3","r9"], "confidence": 0.0-1.0 } ] }`, empty allowed.
- Rules: prices never reach the model; the "different spec" rule turns spec differences into head-to-head rows instead of gaps.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-32 · Applying the merges
- Where: `L/ai-match.ts:44-160`.
- Entry: B-30.
- Does: per proposed group — confidence must be a number ≥ 0.7; ids resolve to rows (unknown ids dropped), ≥ 2 distinct rows; all rows in one category; no two rows present in the same quote. Accepted groups are unioned (union-find); each cluster is emitted once, at its earliest row; that row is the primary (keeps its label and present cells); each absent cell adopts the first sibling's present cell for that quote, restamped `matchKind: "ai"` with `matchConfidence` = the lowest confidence among the merges that pulled that sibling in; the row keeps `aiMergedFrom` (its original rows) for un-merge.
- Rules: order preserved, totals untouched; the model can only merge — never split, re-price or invent. A non-numeric confidence ("0.9") drops the group.
- Data: `matchKind "ai"`, `matchConfidence`, `aiMergedFrom`.
- States: —
- Words: —
- Reachable: yes.

### B-33 · Chained merges can drop a line
- Where: `L/ai-match.ts:88-104, 117-146`.
- Entry: B-32.
- Does: —
- Rules: the same-quote conflict is checked per proposed group, never per resulting cluster. Two accepted groups that share a row (A+B, B+C) where A and C are both lines of quote 0 become one cluster; the primary keeps A's cell and C's line leaves the matrix (it survives only inside `aiMergedFrom`), so its money drops out of gaps, stats and observations. The chain test uses three different quotes and does not catch it.
- Data: —
- States: —
- Words: —
- Reachable: yes (depends on model output).

### B-34 · Un-merge
- Where: `L/ai-match.ts:162-187`; `src/app/api/quote-xrays/[id]/route.ts:147-184`; `Q:277-297`; `src/components/quote-xray/views/GapFinderView.tsx:28`.
- Entry: the legacy Gap Finder view's un-merge control (hand-off A).
- Does: `PATCH /api/quote-xrays/{id}` `{ action: "unmerge-row", rowIndex }` loads the stored matrix, replaces the row with its `aiMergedFrom` originals in place (stray provenance stripped) and saves `match_result`; a row without ≥ 2 originals or an out-of-range index is refused.
- Rules: the stored synthesis is never recomputed — legacy AI numbers keep describing the merged matrix while the deterministic panels (scope gaps, stats) move. On a verdict row (API only — the Verdict view has no control) the stored headline would disagree with the breakdown the page recomputes from the matrix (B-108).
- Data: `quote_xrays.match_result`.
- States: as Words.
- Words: *"Invalid rowIndex"*; *"Lookup failed"*; *"Not found"*; *"No match matrix to edit"*; *"That row is not an AI-merged match"*; *"Update failed"*.
- Reachable: legacy rows only.

---

## The real gap (the headline number)

### B-35 · Which competitor is defended against
- Where: `L/real-gap.ts:53-65`.
- Entry: B-36.
- Does: among the non-own quotes, the cheapest with a positive total; none positive → the first non-own quote; none at all → null.
- Rules: the Verdict always has exactly one competitor, so this only matters for three-quote legacy matrices (the Verdict view never shows those).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-36 · The real-gap arithmetic
- Where: `L/real-gap.ts:1-51, 67-142`.
- Entry: `buildVerdict` (B-52); the Verdict view's breakdown (B-108).
- Does: for rows present on exactly one side of own vs the chosen competitor — own-only → `missingScopeValueCents += own line total` (`missingFrom: "competitor"`); competitor-only → `ownMissingScopeValueCents += competitor line total` (`missingFrom: "own"`); a one-sided row whose present line has no total, or ≤ 0 → `unpricedMissingCount++` and no money. `rawGap = ownTotal − compTotal`; `realGap = rawGap − missingScope + ownMissingScope` (negative = ours is cheaper like-for-like); `missingItems` = every priced one-sided row, largest first.
- Rules: a row present on both sides counts as covered whatever its price type (a competitor "Inclusive" or FOC line covers the scope). Scope is valued at the side that has it — own lines at our prices. Worked example in the code and the tests: own 30 000 vs competitor 22 000, competitor lacks a 6 100 line → raw 8 000, real 1 900.
- Data: `RealGapResult { ownIdx, compIdx, ownTotalCents, competitorTotalCents, rawGapCents, missingScopeValueCents, ownMissingScopeValueCents, realGapCents, unpricedMissingCount, missingItems[] }`.
- States: returns null only when there is no second quote.
- Words: —
- Reachable: yes.

### B-37 · Where the real gap goes wrong
- Where: `L/real-gap.ts:80-82, 96-124`; `L/three-way-match.ts:179-182`; `L/verdict.ts:337-338`; `CREATE:686-691`.
- Entry: —
- Does: —
- Rules: (1) mixed bases — the headline totals are grand totals (ours GST-inclusive and after discount, B-20; theirs as parsed), the missing scope is summed from line totals (before GST and before the quote discount), and nothing normalises GST or discounts; (2) price type is never read — an own line marked inclusive/FOC that still stores a non-zero total counts as missing scope; (3) a quote with no grand total is S$0 (B-28): the verdict then calls the other side cheaper by its whole total or ours "already lower", and `computeRealGap` never returns null for two quotes, so the *"no readable totals"* 422 never fires; (4) lines the matcher failed to pair (B-29) become missing scope on both sides — they partly cancel inside the real gap but both show as money.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## The Verdict synthesis (points, one-liner, WhatsApp)

### B-38 · The candidate-fact pool
- Where: `L/verdict.ts:1-12, 41-55, 61-166`.
- Entry: `buildVerdict` (B-52).
- Does: code builds facts `{ type, detail (money pre-formatted), cents?, weightCents, speakable? }` from seven sources, each capped: missing scope ≤ 5 (B-39), market rate ≤ 3 (B-40), head-to-head where ours is cheaper ≤ 3 (B-41), competitor arithmetic ≤ 2 (B-42), material ≤ 2 (B-43), own-brand advantage ≤ 2 (B-44), competitor-brand difference ≤ 2 (B-45); all sorted by `weightCents` descending; the top 12 go to the model (`MAX_FACTS_FOR_PROMPT`).
- Rules: our own weaknesses (our arithmetic slips, scope we lack) are never facts — they appear only as the headline's honesty number. Weights are not comparable across types: market rate weighs a per-unit gap (B-40), material has a S$1 000 floor, brands are fixed amounts. Money in every fact = `formatCurrencyFromCents(|round(cents)|, countryCode)` → "S$ 6,100.00" (two decimals, sign dropped; a space follows multi-character symbols — "S$ ", "RM ", "AED " — but not "₹"; the helper's own doc comment still shows "S$1,500.00").
- Data: `VerdictCandidateFact` (not persisted; only chosen points keep their evidence).
- States: no facts → the prompt says to return no points (B-46).
- Words: B-39…B-45.
- Reachable: yes.

### B-39 · Fact: missing scope
- Where: `L/verdict.ts:81-89`.
- Entry: B-38.
- Does: the first 5 of `realGap.missingItems` where the competitor lacks the row (largest first); `cents` = `weightCents` = the value.
- Rules: the sentence names the competitor label (B-21); speaks as "our quote".
- Data: —
- States: —
- Words: *""{description}" ({Category}) is in our quote at {money} but does not appear in {competitor} — the client would likely pay for it later."*
- Reachable: yes.

### B-40 · Fact: below-market pricing
- Where: `L/verdict.ts:91-102`.
- Entry: B-38, when benchmarks exist.
- Does: the first 3 below-market flags (B-62, most suspicious first); `cents` = typical − their unit price (per unit); `weightCents` = that gap × 3 when strong, × 1 when mild.
- Rules: a per-unit gap (S$1.50/sqft = 150) competes with whole-line missing scope (S$6 100 = 610 000) — market-rate facts almost never reach the top 3 even when strong.
- Data: —
- States: —
- Words: *"{quote label}'s "{item}" ({category}) is priced {pct}% below the typical market rate — {their price}/{unit} vs typical {typical}/{unit}. Worth asking what is excluded at that price."*
- Reachable: yes.

### B-41 · Fact: head-to-head where ours is cheaper
- Where: `L/verdict.ts:104-114`.
- Entry: B-38.
- Does: `deriveMatchedItemDefense` (B-65) filtered to `cheaper`, the first 3 **in matrix order** (not the biggest savings); saving = `savingCents` ?? comp − own; `cents` = `weightCents` = saving.
- Rules: rows where ours is pricier ("premium") never become facts — the premium justification drafting exists only in the legacy flow (B-66; the code comment calls it "Phase 2 wiring").
- Data: —
- States: —
- Words: *"On the same item "{item}" ({category}) our quote is {saving} cheaper than {competitor} ({ours} vs {theirs})."*
- Reachable: yes.

### B-42 · Fact: competitor arithmetic slip
- Where: `L/verdict.ts:116-125`.
- Entry: B-38.
- Does: arithmetic flags (B-64) not on our quote, the first 2 (largest discrepancy first); `cents` = `weightCents` = |stated − computed|.
- Rules: a parser that computed or misread a total (B-12) turns into an accusation-shaped fact; the sentence is framed "worth clarifying".
- Data: —
- States: —
- Words: *"{quote label}'s "{item}" states {stated}, but {unit price} × {qty} is {computed} — a {discrepancy} discrepancy worth clarifying."*
- Reachable: yes.

### B-43 · Fact: material weakness
- Where: `L/verdict.ts:127-139`.
- Entry: B-38.
- Does: the first 2 material findings (B-68, biggest line first); `cents` = the line total when known; `weightCents = max(line total, 100 000)` so a cheap line still competes; `speakable` = the material's question (B-69…B-73).
- Rules: question-framed by design; `ownAlternative` sentence only when our quote names a better material in the same category.
- Data: —
- States: —
- Words: *"{quote label}'s "{item}" ({category}) specifies {material}. {weakness}"* + optional *" Your quote uses {alternative} for that category."*
- Reachable: yes.

### B-44 · Fact: own-brand advantage
- Where: `L/verdict.ts:141-151`.
- Entry: B-38.
- Does: the first 2 own-brand advantages (B-78, in NER order); fixed `weightCents = 60 000`; no `cents`.
- Rules: the category is lowercased into the sentence ("for the hacking & protection", "for the other").
- Data: —
- States: —
- Words: detail *"Your quote names the brand {brand} for "{item}" ({category}); the other quote does not say what brand would be used there."*; speakable *"Our quote states exactly what you get — {brand} for the {category, lowercase}. The other quote doesn't name a brand there, so it's worth asking what they would actually install."*
- Reachable: yes (live AI only — brands need the NER).

### B-45 · Fact: competitor-brand difference
- Where: `L/verdict.ts:153-163`.
- Entry: B-38.
- Does: the first 2 differing brands (B-77, NER order); fixed `weightCents = 25 000`; no `cents`.
- Rules: "your quote specifies a different make there" is asserted although the guardrail only proves our quote never names *this* brand — it may name no brand at all. Brand spellings are compared by case and spacing only, so "Häfele" in theirs vs "Hafele" in ours still fires (B-79).
- Data: —
- States: —
- Words: detail *"{quote label} names the brand {brand} for "{item}" ({category}); your quote specifies a different make there."*; speakable *"They've specified {brand} for the {category, lowercase} — worth asking what warranty it carries and whether it's the standard or OEM line."*
- Reachable: yes (live AI only).

### B-46 · The verdict prompt
- Where: `L/verdict.ts:35-39, 253-291, 345-353`.
- Entry: B-52 when live.
- Does: `google/gemini-2.5-flash`, JSON mode, 4 096 tokens. Role: *"You are a sales coach for a {region label} interior-design studio. A client is comparing the studio's quote against a competitor's. Your job: give the designer AT MOST 3 things to say, plus a short WhatsApp message for the client."* A *THE NUMBERS (already computed — repeat them exactly, never recompute)* block: our total; the competitor's total; the on-paper line (*"{competitor} is {x} cheaper"* / *"our quote is {x} cheaper"* / *"the two quotes are the same total"*); scope missing from the competitor "valued at our prices"; scope missing from OUR quote "(be honest about this if the client asks)"; the like-for-like gap with *"(effectively OURS is the cheaper quote like-for-like)"* or *"(we are {x} more, like-for-like)"*. Then *CANDIDATE FACTS (the ONLY facts you may use — cite by index)* as `[i] (type) detail`, or *"(none — rely on the numbers above only, and return an empty points array)"*. Rules: 0–3 points, fewer strong beat 3 weak, each MUST cite one `factIdx`, never invent a fact or number; each `sayThis` one speakable sentence, plain language, no jargon ("normalised delta", "scope coverage"); brand/material only as a QUESTION; confident, factual, never disparaging; confidence `high` for hard numbers (missing scope, arithmetic, head-to-head), `medium` for interpretation (market rate); `oneLiner` from the numbers only; `whatsappMessage` structured EXACTLY as opener → every chosen point numbered with its items and amounts → the like-for-like difference → an offer to go through both quotes; simple English for non-native readers; no links, placeholders or salutation; call it "the other quote" and never name the other studio in writing; JSON only. Schema `{ oneLiner, points: [{ sayThis, factIdx, confidence: "high"|"medium" }], whatsappMessage }`.
- Rules: an equal real gap (0) is described as "OURS is the cheaper quote". The competitor's name is in the prompt (numbers + facts); keeping it out of the message relies on the model.
- Data: —
- States: a failed call after retries throws → 502 (B-09).
- Words: —
- Reachable: yes.

### B-47 · Normalising the model's answer
- Where: `L/verdict.ts:207-251`.
- Entry: B-52 when live.
- Does: points in model order, stop at 3; drop a point with empty `sayThis`, a missing/invalid `factIdx` or a fact already cited; evidence is copied from the fact (`type`, `detail`, `cents`) — never from the model; confidence `medium` only when the model says exactly "medium", anything else → `high`; a single surviving `medium` point → no points at all ("confidence beats completeness"). `oneLiner` = the model's trimmed text, else the deterministic one (B-49). WhatsApp = the model's trimmed text, else the fixture's; lines containing `{share_link}` are removed (a leftover from the dropped portal link), falling back when nothing is left; capped at 1 200 characters by a hard cut.
- Rules: `"low"` or any unknown confidence becomes `high`.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-48 · What the normaliser does not check
- Where: `L/verdict.ts:230-250, 342-366`.
- Entry: —
- Does: —
- Rules: the one-liner's numbers are never compared with the headline. The WhatsApp draft is never checked against the points shown: when the model drops or invents points, or returns no message (the fallback is the fixture's message, built from the top 3 facts by weight, not from the model's points), the draft and the screen disagree. The "substance guard" rebuilds the draft from the shown points only when it contains no digit at all — the numbered "1." already satisfies it. The 1 200-character cut can end mid-sentence.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-49 · The deterministic one-liner
- Where: `L/verdict.ts:176-184`.
- Entry: the fixture (B-51) and the fallback (B-47).
- Does: three branches on the signs of the raw and real gaps.
- Rules: a raw gap of exactly 0 reads "already S$ 0.00 lower"; "and covers more" is asserted without checking scope; the third branch prints "S$ 0.00 of that is scope they left out" when nothing is missing, and when our quote also lacks scope its three numbers do not add up (real = raw − missing + our missing).
- Data: —
- States: —
- Words: raw ≤ 0: *"Our quote is already {raw} lower than {competitor} — and covers more."*; real ≤ 0: *"{competitor} looks {raw} cheaper, but once the missing scope is added back, ours is effectively the lower quote."*; else *"{competitor} is {raw} cheaper on paper, but {missing} of that is scope they left out — the real gap is {real}."*
- Reachable: yes.

### B-50 · The deterministic WhatsApp draft
- Where: `L/verdict.ts:186-205`.
- Entry: the fixture (B-51); the no-digit guard (B-48).
- Does: an opener, each point as `"{n}. {sayThis}"` (≤ 3), a gap line, a closer, joined by blank lines. Gap line: raw > 0 and missing > 0 → the like-for-like line; raw ≤ 0 → the "already lower" line; otherwise none.
- Rules: amounts drop their sign — when the real gap is negative (ours cheaper like-for-like) the line still reads "the real difference … is S$ X, not S$ Y" with no direction.
- Data: —
- States: —
- Words: *"I had a proper look at the other quote you received. A few things you should know before comparing on price:"*; *"{n}. {sayThis}"*; *"So like-for-like, the real difference between the two quotes is {real}, not {raw}."*; *"Our quote is already {raw} lower for the work covered."*; *"Happy to sit down and go through both quotes line by line whenever suits you."*
- Reachable: yes.

### B-51 · The verdict fixture (no key) and fallback source
- Where: `L/verdict.ts:293-315, 342`.
- Entry: B-52 (always built; used whole without a key, and as the fallback with one).
- Does: points = the top 3 facts; `sayThis` = `speakable` ?? `detail`; confidence `medium` for market-rate and brand facts, else `high`; a lone medium point is suppressed; one-liner B-49; WhatsApp B-50 from the surfaced points.
- Rules: missing-scope, market-rate, head-to-head and arithmetic facts have no `speakable`, so their `sayThis` is the fact text — which names the competitor ("does not appear in {competitor}") and puts that name into the numbered WhatsApp lines, against the rule "never name the other studio in writing".
- Data: —
- States: —
- Words: B-39…B-45 (as `sayThis`), B-49, B-50.
- Reachable: yes.

### B-52 · buildVerdict and the stored verdict
- Where: `L/verdict.ts:317-387`; `TYPES:4682-4742`.
- Entry: B-02.
- Does: `computeRealGap` (null → null); competitor label = the chosen quote's label trimmed, else *"the other quote"*; facts; fixture; live → model + normaliser + substance guard, else the fixture. Stores `{ kind: "verdict", headline: { ownTotalCents, competitorTotalCents, competitorLabel, rawGapCents, missingScopeValueCents, ownMissingScopeValueCents, realGapCents, unpricedMissingCount, oneLiner }, points[] (sayThis, evidence { type, detail, cents? }, confidence), whatsappMessage }`.
- Rules: not stored — the per-item missing lists (recomputed at render, B-108), the fact pool, the model's raw answer, the prompt or model version.
- Data: `quote_xrays.ai_synthesis`.
- States: model failure → throws (502).
- Words: *"the other quote"*.
- Reachable: yes.

### B-53 · Dead corners of the verdict types
- Where: `TYPES:4694-4715`; `L/verdict.ts:24-28`.
- Entry: —
- Does: —
- Rules: `VerdictEvidenceType` lists `unique-value` ("only the own quote covers it") but no fact is ever built with it. `LEGACY_SHARE_LINK_TOKEN` (`{share_link}`) only exists to be stripped — the public portal it belonged to was dropped in 2026-08.
- Data: —
- States: —
- Words: —
- Reachable: no (dead).

---

## Market benchmarks

### B-54 · The category bridge
- Where: `L/market-benchmarks.ts:1-52`.
- Entry: B-57, B-61.
- Does: canonical token → `platform_market_rates.category`: hacking → *Demolition*, masonry → *Masonry*, plumbing → *Plumbing*, electrical → *Electrical*, carpentry → *Carpentry*, painting → *Painting*, flooring → *Flooring*, ceiling → *Ceiling*, glasswork → *Glass & Doors*. A reverse map turns fetched rows back into tokens.
- Rules: metalwork, appliances, lighting, curtains, airconditioning, preliminaries, misc and every unknown (room) token have no benchmark — by design, "a fabricated benchmark on a client-facing page is worse than an honest 'no data'". Doors only benchmark when the section canonicalises to glasswork.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-55 · The benchmark values (seed)
- Where: `SEED:1-154`; `supabase/migrations/20260414000003_price_book_v2.sql:37-55`.
- Entry: B-57.
- Does: 111 seeded rows "from 2025 industry benchmarks", `year 2025`, `source` defaulted to `platform`: SG 32 (S$), MY 30 (RM), AE 24 (AED), IN 25 (₹); none for Egypt. Categories per country: SG and MY have all nine; AE and IN have no *Glass & Doors*. Units are imperial or per piece only: `sqft, ft, lot, pc, pt`. SG examples (min – max, typical): tile hacking 1.50–3.00/sqft (2.25); debris disposal 150–400/lot (275); partition wall 115 mm brick 70–110/sqft (90); waterproofing 12–25/sqft (18.50); shower mixer supply & install 300–600/lot (450); concealed cistern WC 800–1 800/lot (1 300); re-piping 100–180/pt (140); 13A power point 60–90/pc (75); DB rewiring 800–1 500/lot (1 150); kitchen cabinets top & bottom (laminate) 280–450/ft (365); built-in wardrobe 300–500/ft (400); quartz countertop 60–120/ft (90); homogeneous tiles 60×60 4–8/sqft (6); vinyl/SPC 3.50–6/sqft (4.75); emulsion paint 2 coats 0.70–1.20/sqft (0.95); tempered glass shower screen 400–900/lot (650); false ceiling plain gypsum 4–8/sqft (6).
- Rules: one row per `(country, category, item)`; `rate_typical` is nullable (B-57 takes the midpoint).
- Data: `platform_market_rates` (global, no `studio_id`; hand-off D).
- States: —
- Words: the seeded item names appear in flags as `matchedItem` (legacy views).
- Reachable: yes.

### B-56 · Crowd-sourced rates feeding the same table (touchpoint)
- Where: `src/app/api/cron/aggregate-rates/route.ts:1-130`; `supabase/migrations/20260416000003_crowd_rate_signals.sql`.
- Entry: a monthly cron (15th).
- Does: `crowd_rate_signals` from the last 90 days grouped by country + category + item; groups with ≥ 5 distinct studios upsert P10 → min, P50 → typical, P90 → max, `source "crowd"`, unit default `sqft`, `year` = now.
- Rules: crowd rows reach the X-Ray only when their category label is one of the nine bridged labels; they overwrite a seeded row with the same item name. Where signals come from is hand-off D.
- Data: `crowd_rate_signals` → `platform_market_rates`.
- States: —
- Words: —
- Reachable: yes (cron).

### B-57 · Fetching and rolling up benchmarks
- Where: `L/market-benchmarks.ts:96-186, 411-448`; `CREATE:322-336, 664-670`.
- Entry: B-02 (every run), B-03 (Sales Justifier / combined).
- Does: service-role read (the table is global) of `country_code = studio country` and `category in (bridged labels for the matrix's categories)`; each row → cents (NUMERIC strings coerced), rows missing min or max dropped, a null typical → the midpoint; per category: min of mins, **median** of typicals (even count → rounded mean of the two middle values), max of maxes, `sampleSize` = rows, `unit` = the most common unit (first seen wins ties), `unitsHeterogeneous` when > 1 unit, `source` = the most common source. Also a flat `items` list for per-item bands.
- Rules: never throws — any error → empty benchmarks and a log line; no year filter.
- Data: `MarketBenchmarks { byCategory, items }`.
- States: —
- Words: —
- Reachable: yes.

### B-58 · Unit normalising
- Where: `L/market-benchmarks.ts:306-320`.
- Entry: B-59, B-60, B-62.
- Does: lowercase, drop dots, collapse spaces, then map: sqft ← sqft, sq ft, sf, square feet, sq feet, psf; ft ← ft, feet, foot, rft, run ft, running ft, **lm, rm**, l ft, lft; pc ← pc, pcs, piece, pieces, no, nos, unit, units, ea, each, qty; lot ← lot, lots, ls, lumpsum, lump sum, sum; pt ← pt, point, points, pts; set ← set, sets; anything else passes through normalised; empty → null.
- Rules: "rm" and "lm" (running / linear **metre**) are mapped to feet — a per-metre price is compared with per-foot rates, off by ≈ 3.28×. Metric units (m, sqm, m2, sq m) pass through and never meet a benchmark (every seed row is imperial), so metric quotes get no market grounding at all.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-59 · The band for one line
- Where: `L/market-benchmarks.ts:233-298`.
- Entry: B-60, B-62.
- Does: benchmark items indexed by `category|unit`; for a line, the item with the highest token overlap (B-26) with the line's description; overlap ≥ 0.34 (`ITEM_MATCH_MIN`) → that item's band (`source "item"`, `matchedItem`, `matchScore`); else a blended category band for that unit (min of mins, median of typicals, max of maxes, `source "category"`); no items for that category + unit → null.
- Rules: with no stop words, generic words drive item binding — "Supply and install basin" shares {supply, install} with "Shower mixer (supply & install)" = 2/4 = 0.5 and binds to the shower mixer band. A per-lot line in a category without a close item gets the blend of unrelated per-lot items (Plumbing|lot in SG = shower mixer, water heater, concealed WC → typical 525).
- Data: `ResolvedBand`.
- States: —
- Words: —
- Reachable: yes.

### B-60 · Market positioning of our quote (legacy)
- Where: `L/market-benchmarks.ts:188-231, 300-409`; `CREATE:126-138`.
- Entry: the Sales Justifier synthesis (B-93).
- Does: our lines with a per-unit price > 0 and a known unit, only where a `category|unit` benchmark exists; per category the unit with most of our lines (first on ties); each line → its band (B-59); our median unit price vs the median of the bands' typicals: < 95 % → `below`, > 105 % → `above`, else `at` (`AT_TOLERANCE = 0.05`); market min / max = extremes of the bands; `bandSource` = `item` only when every line bound to an item; `sampleSize` = distinct matched items, else the bucket's item count; categories sorted alphabetically; `atOrBelowTypicalCount` = categories not `above`.
- Rules: the Verdict never computes positioning. Our quote is always index 0 — in a legacy run without an own quote it positions a competitor.
- Data: `SalesJustifierSynthesis.marketPositioning` (`TYPES:4591-4608`).
- States: no benchmarked categories → not attached.
- Words: —
- Reachable: API only (legacy).

### B-61 · The benchmark block in the legacy prompt
- Where: `L/synthesise-prompt.ts:165-186`.
- Entry: the Sales Justifier prompt (B-90).
- Does: one line per benchmarked category: `  {Label}: {min}–{max}/{unit} (typical {typ}/{unit}), n={rows}` in dollars with two decimals, plus *" (mixed units — treat as indicative)"* when units differ; under the heading *"MARKET BENCHMARKS (real cross-studio per-unit rates for this region, in this currency's dollars):"*.
- Rules: the block is the category-level blend, not per item, and the model is told to multiply "the benchmark's typical per-unit rate" by a line's quantity — meaningless for mixed-unit categories (SG Plumbing blends per-lot, per-piece and per-point items).
- Data: —
- States: —
- Words: —
- Reachable: API only (legacy).

---

## Deterministic flags

### B-62 · Below-market flags
- Where: `L/below-market-flags.ts:1-88`.
- Entry: B-40 (verdict, first 3); B-93 (legacy Sales Justifier, all).
- Does: for every competitor line (never quote 0) with a unit price > 0 and a known unit: band via B-59; `pctBelow = (typical − theirs) ÷ typical`; < 20 % → no flag (`MILD_BELOW = 0.2`); flag severity `strong` when ≥ 50 % below (`STRONG_BELOW = 0.5`) or below the band's minimum, else `mild`. Flag = `{ quoteLabel, item (description, else category label), category, unit, theirUnitPriceCents, marketMinCents, marketTypicalCents, pctBelow, severity, matchedItem?, bandSource }`; sorted by `pctBelow` descending.
- Rules: the 20 % threshold cites World Bank procurement practice in the header. Unit-gated (per-lot never judged against per-ft). Price type is not checked. Above-market competitor prices are never flagged.
- Data: `belowMarketFlags` (`TYPES:4557-4569`).
- States: —
- Words: B-40.
- Reachable: yes.

### B-63 · Below-market false positives
- Where: `L/below-market-flags.ts:55-68`; `L/market-benchmarks.ts:265-298, 308-320`.
- Entry: —
- Does: —
- Rules: generic-word item binding (B-59), per-lot blends of unrelated items (B-59) and the metre → foot mapping (B-58) all produce "priced X % below the typical market rate" claims about lines that were never comparable. A competitor's line-level discount or package price (priced lower on purpose) is also flagged. Nothing in the engine asks for more than one signal before flagging.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-64 · Arithmetic check
- Where: `L/arithmetic-check.ts:1-72`.
- Entry: B-42 (competitor only, first 2); B-93 (legacy, all quotes, `isOwnQuote` marked).
- Does: for `amount` lines with unit price and total present, qty > 0, unit price > 0 and total > 0: computed = `round(unitPrice × qty × 100)`; flag when |stated − computed| > max(100 cents, 1 % of stated). Flag = `{ quoteIdx, quoteLabel, isOwnQuote, item (description, else "Item {n}"), category, unitPriceCents, qty, statedTotalCents, computedTotalCents }`; sorted by the discrepancy, largest first.
- Rules: FOC, inclusive, lump-sum and KIV lines are skipped on purpose. Line discounts, waste factors or the parser's own arithmetic (B-12) show up as slips.
- Data: `arithmeticFlags` (`TYPES:4543-4553`).
- States: —
- Words: *"Item {n}"*; B-42.
- Reachable: yes.

### B-65 · Head-to-head on shared rows (matched-item defense)
- Where: `L/matched-item-defense.ts:1-89`.
- Entry: B-41 (cheaper only); B-93 (legacy, both stances).
- Does: rows where our cell is present with a total; the cheapest present competitor with a total; skip when |ours − theirs| ÷ max(theirs, 1) < 2 % (`PARITY_TOLERANCE = 0.02`); stance `cheaper` (ours lower, `savingCents = theirs − ours`) or `premium`; carries the category label, the competitor's label and both original line descriptions (resolved by `lineIdx`, else the row label).
- Rules: returned in matrix order. Totals are compared, not unit prices — a quantity difference reads as a price difference.
- Data: `MatchedItemDefenseDraft`.
- States: —
- Words: —
- Reachable: yes.

### B-66 · Premium justifications (legacy)
- Where: `L/matched-item-defense.ts:91-141`; `CREATE:105-115, 141-154`.
- Entry: the Sales Justifier when live and a premium row exists.
- Does: `google/gemini-2.5-flash`, JSON mode, 2 048 tokens. Items `[i] item="…" ours: "…" theirs: "…"`. Prompt: *"You are a sales coach for an interior-design studio. For each item below, the studio's quote costs MORE than the competitor's for the same scope. Explain — in one short client-facing sentence — WHY the studio's version is worth more, citing the concrete difference visible in the two descriptions (e.g. a better material, thicker/branded component, added finish, longer scope)."* Rules: base it only on a real visible difference, else null; state our value positively, never disparage; one sentence, no price figures. Output `{ "justifications": [ { "index", "reason" | null } ] }`.
- Rules: the result map is keyed by the row label, so two premium rows with the same label share one reason. Failure or no key → no justifications (the price comparison stands alone).
- Data: `matchedItemDefense[].justification`.
- States: —
- Words: the model's sentences.
- Reachable: API only (legacy).

### B-67 · Scope gaps (legacy views and the PDF)
- Where: `L/scope-gaps.ts:1-97`.
- Entry: legacy `ScopeGapPanel` / `GapFinderView` (hand-off A); B-104.
- Does: per row, from quote 0's side: present in our quote and every competitor → shared; absent from ours but in ≥ 1 competitor → **exposure** (value = the cheapest competitor total; `inQuotes` labels); in ours and no competitor → **unique value** (our total); ours + some but not all competitors → neither (a partial overlap). Counts AI-matched rows (any present `ai` cell). Both lists sorted by value, largest first.
- Rules: not used by the Verdict (B-100 lists how its definitions differ).
- Data: `ScopeGaps { exposure, uniqueValue, aiMatchedRowCount, sharedRowCount }`.
- States: —
- Words: —
- Reachable: legacy rows only.

---

## Material facts

### B-68 · The material-fact engine
- Where: `L/material-facts.ts:1-48, 216-327`.
- Entry: B-43.
- Does: for every competitor line (text = section + description) and each of 16 definitions: its alias regex must match; its `require` regex (when set) must match; its context must match — **wet-area** = `kitchen|bathroom|toilet|\bwc\b|vanity|basin|sink|shower|wet\s*area|laundry|yard|balcony|bomb\s*shelter`, **heat-area** = `kitchen|counter\s*top|countertop|worktop|work\s*top|table\s*top|hob|stove|island`, **any**; and the glass-house rule — the alias found anywhere in our quote's text → skip. A finding = `{ materialKey, material, quoteLabel, item, category, canonicalCategory, lineTotalCents, weakness, question, ownAlternative? }`; `ownAlternative` = the first "better alternative" term found in one of our lines of the same canonical category. One finding per material (the competitor line with the largest total wins); sorted by line total, largest first.
- Rules: "NO AI, NO reviews, NO brand claims"; every surfaced line is a question. Ordered "roughly by how often these appear in SG/MY quotes".
- Data: `MaterialFactFinding`.
- States: no own quote → none.
- Words: B-69…B-73.
- Reachable: yes.

### B-69 · Materials: carpentry boards
- Where: `L/material-facts.ts:52-87`.
- Entry: B-68.
- Does: **MDF** (`\bmdf\b`, "medium density fib…"; wet-area; better: plywood, marine plywood); **particleboard / chipboard** (any; better: plywood, marine plywood, mdf); **hollow-core** (any; better: solid core, solid timber); **wood veneer** (`veneer(ed)`; wet-area; no alternative).
- Rules: MDF's wet-area gate includes "kitchen", so every kitchen MDF line fires.
- Data: —
- States: —
- Words: MDF — *"MDF swells and loses structural strength with prolonged moisture exposure — a known failure mode for carcasses near sinks and wet areas."* / *"Is the cabinet carcass MDF or plywood? MDF swells with prolonged moisture, which matters near the sink."*; particleboard — *"Particleboard sags under sustained load and disintegrates when wet — the lowest-durability carcass material in common use."* / *"Is the carcass particleboard? It sags under load over time and doesn't survive water exposure."*; hollow-core — *"Hollow-core construction dents easily and provides poor sound insulation compared to solid-core."* / *"Are the doors hollow-core or solid-core? Hollow-core dents easily and lets much more sound through."*; veneer — *"Veneer surfaces water-mark and lift at the edges with repeated moisture contact, and can't be sanded back like solid wood."* / *"How is the veneer sealed around water points? Veneer edges lift with repeated moisture contact."*
- Reachable: yes.

### B-70 · Materials: worktops and surfaces
- Where: `L/material-facts.ts:89-128`.
- Entry: B-68.
- Does: **laminate** worktop (`laminate(d)`, `hpl`, formica; requires a top/worktop word; heat-area; better: quartz, sintered stone, kompacplus, solid surface, granite); **solid surface** (solid surface, corian; requires a top word; heat-area; better: quartz, sintered stone, kompacplus); **natural marble** (requires a top word or "kitchen"; heat-area; better: quartz, sintered stone); **granite** (requires a top word; any; no alternative).
- Rules: `\btop\b` alone satisfies the worktop requirement and "kitchen" satisfies the heat context, so a cabinet line such as "Kitchen top & bottom cabinets (laminate finish)" — a laminate cabinet *finish* — fires the laminate *worktop* question; the test only covers "Wardrobe in laminate finish" (no "top", no kitchen).
- Data: —
- States: —
- Words: laminate — *"Laminate worktops scorch under hot pans and swell at the seams when water gets in — the usual first thing to age in a budget kitchen."* / *"Is the worktop laminate? It marks under hot pans and the seams swell if water gets in — ask how the joints are sealed."*; solid surface — *"Solid surface scratches and heat-marks more readily than quartz or sintered stone (though it is repairable by polishing)."* / *"Solid surface tops mark under hot cookware — ask whether the price includes re-polishing, or compare against a quartz spec."*; marble — *"Natural marble is porous — it stains and etches on contact with acids (lemon, wine, sauces) and needs regular re-sealing in a kitchen."* / *"Marble in a kitchen etches with anything acidic and needs re-sealing — ask what the maintenance plan and sealing schedule is."*; granite — *"Granite is porous enough to need periodic re-sealing; unsealed granite stains around cooking zones."* / *"Does the granite price include sealing, and how often will it need re-sealing?"*
- Reachable: yes.

### B-71 · Materials: flooring
- Where: `L/material-facts.ts:130-150`.
- Entry: B-68.
- Does: **laminate flooring** (`laminate(d)`; requires floor/flooring; wet-area; better: vinyl, spc, tiles, homogeneous tiles); **engineered wood** (engineered wood/timber, parquet; requires floor/flooring; wet-area; better: vinyl, spc, tiles).
- Rules: the laminate-flooring and laminate-worktop definitions share one alias, so either is suppressed when our quote says "laminate" anywhere (B-75).
- Data: —
- States: —
- Words: laminate flooring — *"Laminate flooring swells irreversibly when water gets into the joints — unsuitable for kitchens, bathrooms and entryways that see water."* / *"Is that laminate flooring rated for wet areas? Standard laminate swells permanently if water gets into the joints."*; engineered wood — *"Engineered wood and parquet cup and warp with humidity swings and standing water, and refinishing options are limited by the thin wear layer."* / *"How will the engineered wood handle humidity near wet areas — and how many times can its wear layer be sanded back?"*
- Reachable: yes.

### B-72 · Materials: metals and fittings
- Where: `L/material-facts.ts:152-181`.
- Entry: B-68.
- Does: **mild steel** (mild steel, `m.s.` + frame/grille/gate/railing; wet-area; better: stainless steel, aluminium); **chrome-plated plastic** (chrome-plated ABS/plastic, `\babs\b`; requires tap/mixer/shower/faucet/basin/accessor…; any; better: brass, stainless steel); **acrylic** sanitary ware (requires basin/tub/bathtub/sink/tray; any; better: ceramic, enamelled steel).
- Rules: —
- Data: —
- States: —
- Words: mild steel — *"Mild steel rusts once the powder coat is scratched — in wet areas it needs re-coating within a few years."* / *"Is the metalwork mild steel or stainless? Mild steel rusts at any coating scratch in a wet area."*; chrome-plated plastic — *"Chrome-plated plastic fittings peel and crack within a few years of daily hot-water use — solid brass or stainless bodies last decades."* / *"Are the taps and mixers solid brass/stainless, or chrome-plated plastic? The plating on plastic bodies peels within a few years."*; acrylic — *"Acrylic basins and trays scratch and dull with abrasive cleaning; ceramic and enamelled steel keep their finish far longer."* / *"Is the basin acrylic or ceramic? Acrylic scratches with normal cleaning and dulls over time."*
- Reachable: yes.

### B-73 · Materials: paint, glass and panels
- Where: `L/material-facts.ts:183-214`.
- Entry: B-68.
- Does: **standard emulsion paint** (emulsion, standard paint; requires bathroom/toilet/kitchen/wet; wet-area; better: anti-mould, anti mould); **non-tempered glass** (float glass, non-tempered, annealed glass; any; better: tempered glass); **PVC foam board** (any; better: plywood, marine plywood).
- Rules: —
- Data: —
- States: —
- Words: emulsion — *"Standard emulsion in wet rooms grows mould at the ceiling line within a year or two — wet areas need anti-mould/kitchen-and-bathroom grade paint."* / *"Is the bathroom paint anti-mould grade, or standard emulsion? Standard emulsion moulds at the ceiling line in wet rooms."*; glass — *"Non-tempered glass breaks into dangerous shards — shower screens, table tops and full-height panels should always be tempered."* / *"Is the glass tempered? Non-tempered glass breaks into shards, which matters for showers and full-height panels."*; PVC foam — *"PVC foam board dents under impact and bows across longer spans — fine for backing, weak as a primary carcass or shelf material."* / *"Are the shelves and carcass PVC foam board? It bows across longer spans and dents easily."*
- Reachable: yes.

### B-74 · Known materials and the catalog-gap signal
- Where: `L/material-facts.ts:222-236`; `CREATE:652-657, 721-736`.
- Entry: verdict telemetry (B-102).
- Does: `isKnownMaterial(term)`: empty → known; known when any definition's alias matches the term, or any better-alternative contains the term or is contained in it; the verdict logs up to 10 NER materials (B-76) that are not known as `unknown_materials`.
- Rules: the containment test is loose — "glass", "steel", "timber", "ply" all count as known through "tempered glass", "stainless steel", "solid timber", "plywood". Telemetry only; never shown.
- Data: telemetry props.
- States: —
- Words: —
- Reachable: yes (live AI).

### B-75 · Material-fact edge cases
- Where: `L/material-facts.ts:216-220, 275-285, 297-321`.
- Entry: —
- Does: —
- Rules: the glass-house scan uses aliases only, over the whole of our quote — our laminate cabinet finish suppresses the competitor's laminate worktop and laminate flooring facts; our living-room emulsion suppresses their bathroom emulsion fact. A line naming two materials ("MDF doors on plywood carcass") fires the weaker one. Marble's `require` includes "kitchen", so kitchen marble *flooring* gets the worktop etching question. `ownAlternative` needs the exact same canonical category (room-organised quotes never find one). One finding per material across all competitors.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Brands

### B-76 · Brand and material extraction (NER)
- Where: `L/brand-comparison.ts:131-216`; `CREATE:116-119, 652-657`.
- Entry: every live verdict (`extractQuoteBrandsAndMaterials`); the legacy Sales Justifier (`extractQuoteBrands`).
- Does: `google/gemini-2.5-flash`, JSON mode, 2 048 tokens. Sends every line of every quote as `QUOTE {i} (label "{label}"):` + `  [{lineIndex}] {description}`. Prompt: *"You extract brand / manufacturer / supplier / product-line names that are written in these interior-design quote line items. Be thorough — if a proper-noun brand name appears anywhere in a line, extract it. You ALSO list the distinct generic MATERIAL terms that appear (for catalog coverage analysis)."* Rules: brands such as Hansgrohe, Blum, Samsung, Nippon Paint, Lamitak, Grohe, Bosch, Häfele go in `mentions`; generic materials or item types (laminate, quartz, plywood, vinyl, solid surface, tempered glass, OEM) are not brands; list each material once, lowercase, in `materials`; never invent; use the bracketed quote and line indices; one worked example (Hansgrohe basin mixer, Blum hinges → `laminate`). Validation: mentions need integer `quoteIdx`, integer `lineIndex`, string `brand`; materials = strings, trimmed, lowercased, de-duplicated, ≤ 20.
- Rules: the brand is never checked against the cited line's text, and the indices are not bounds-checked here — a hallucinated brand or a wrong line index flows into facts (B-44, B-45); "Do NOT invent" is only an instruction. Input size is unbounded. Failure or no key → empty.
- Data: `BrandMention { quoteIdx, lineIndex, brand }`.
- States: —
- Words: —
- Reachable: yes (live AI).

### B-77 · Differing brands (theirs, not ours)
- Where: `L/brand-comparison.ts:1-87`.
- Entry: B-02, B-93.
- Does: our brands = mentions on quote 0 normalised by `normBrand` (trim, lowercase, collapse spaces); a competitor mention is kept only when its normalised brand is not one of ours ("THE GUARDRAIL"), de-duplicated per (quote, brand), and only when its line resolves to a non-empty description. Output `{ ownBrands (display names), differingBrands: [{ quoteLabel, item, brand (as written), category }] }`.
- Rules: framed as the "SAFE variant" — no reviews and no claims about a brand, only neutral questions (legal disparagement and review-API ToS risk named in the header).
- Data: `BrandComparison`; legacy `brandComparison` (`TYPES:4535-4538`).
- States: —
- Words: B-45.
- Reachable: yes (live AI).

### B-78 · Own-brand advantages (ours, not theirs)
- Where: `L/brand-comparison.ts:89-129`.
- Entry: B-02.
- Does: brands named on quote 0 that no competitor mention names (same `normBrand`), de-duplicated per brand to our first line naming it, only when that line has a description; `{ brand, item, category }`.
- Rules: the mirror of B-77's guardrail — a brand in any competitor quote is never claimed as ours alone.
- Data: `OwnBrandAdvantage`.
- States: —
- Words: B-44.
- Reachable: yes (live AI).

### B-79 · Two brand normalisers that disagree
- Where: `L/brand-comparison.ts:35-37`; `L/brand-normalize.ts:23-33`; `L/brand-dossier-service.ts:71-74, 100-103`.
- Entry: —
- Does: —
- Rules: the guardrails (B-77, B-78) compare by case and spacing only, so "Häfele" vs "Hafele", "Blum" vs "Blum GmbH" or "Hansgrohe (Germany)" count as different makers — the same brand can become both a "they've specified" question and a "we name it" selling point in one verdict. The dossier cache folds diacritics, suffixes and parentheses (B-80), so the ammo builder later merges what the facts kept apart.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-80 · Brand cache keys
- Where: `L/brand-normalize.ts:1-53`; `src/app/api/admin/brand-dossiers/route.ts:4-6, 45-80`.
- Entry: B-81, B-85.
- Does: `canonicaliseBrand`: Unicode NFD and combining marks removed (Häfele → hafele), lowercase, parenthesised text removed, legal suffixes removed (`pte ltd`, `sdn bhd`, `ltd`, `llc`, `llp`, `inc`, `corp`, `co`, `gmbh`, `limited`, `company`), other non-alphanumerics → spaces, trimmed and collapsed; empty = no substance. `displayNameFromCanonical` capitalises each word. `brandMatchesDossier` = exact key or stored alias ("no fuzzy matching (fuzzy = wrong brand = poison)").
- Rules: `brandMatchesDossier` has no production caller, and no code ever writes `brand_dossiers.aliases` (the admin route only toggles status), so the alias lookup in B-81 always misses.
- Data: `brand_dossiers.brand_canonical`, `aliases`.
- States: —
- Words: —
- Reachable: keys yes; alias matching no (dead).

### B-81 · Brand-ammo enrichment after the response
- Where: `L/brand-dossier-service.ts:1-27, 144-191, 228-294`; `CREATE:738-749`.
- Entry: `after()` on a live verdict run with ≥ 1 differing brand or own-brand advantage.
- Does: kill switch (B-86) → distinct canonical keys across the competitor brands first, then ours (first display name + category as the scan hint) → fetch dossiers by exact key, then one alias query per miss (B-80) → classify each (B-82) → a miss gets a `pending` row (upsert, ignore duplicates) and joins the inline scan list while it has fewer than 3 (`MAX_INLINE_SCANS`) → scans run in parallel (B-83) → `buildAmmoFromDossiers` (B-85) → `quote_xrays.brand_ammo` written through the scoped client. Never throws.
- Rules: competitor brands take the inline scan slots first. Brands beyond the third miss stay `pending` for the hourly cron (hand-off C) and never reach this run (B-86). Stale dossiers attach as they are.
- Data: `brand_dossiers` (platform-level, service role), `quote_xrays.brand_ammo`.
- States: every failure → less or no ammo, logged.
- Words: —
- Reachable: yes (live AI, kill switch on).

### B-82 · Dossier freshness
- Where: `L/brand-dossier-service.ts:25, 29-42`.
- Entry: B-81; the cron (hand-off C).
- Does: no row → `miss`; `disabled` → `disabled`; `pending` or never scanned → `miss`; last scan ≤ 90 days ago (`DOSSIER_FRESH_TTL_DAYS`) → `fresh`; older → `stale`.
- Rules: `stale` is attached as is ("stale-while-revalidate") — the refresh is the cron's (≤ 5 stalest per hour; ≤ 10 pending per hour).
- Data: `brand_dossiers.status, last_scanned_at`.
- States: —
- Words: —
- Reachable: yes.

### B-83 · Scanning a brand on the web
- Where: `L/brand-scan.ts:1-43, 145-242`.
- Entry: B-81 (inline), the cron (`scanAndStoreDossier`, `L/brand-dossier-service.ts:193-226`).
- Does: `google/gemini-2.5-flash:online` (OpenRouter's web-search plugin; "Exa-backed … ~1¢/scan", chosen by a 2026-08-14 spike), 1 600 tokens, no JSON mode, 45 s abort, no retry. Prompt: *"Search the web for real user experiences with the brand "{name}" ({category hint}) as used in Singapore/Malaysia home renovation. Prefer forums and review communities (RenoTalk, HardwareZone, Reddit, Lowyat) and independent review sites over marketing pages."* + a JSON shape `{ claims: [{ claim, sentiment positive|negative|mixed, severity mild|notable, sourceUrls[], quotedEvidence }] }` + rules: only what the sources say, never invent a claim or URL; a negative or mixed claim needs ≥ 2 different websites; `notable` = recurring functional failures (breakage, peeling, rust, warranty disputes), `mild` = annoyances (noise, price, availability); marketing pages and the brand's own site do not count; nothing → `{ "claims": [] }`. Admissible URLs = the response's annotations (`url_citation.url` or `url`); the claims JSON is cut from the first `{` to the last `}`. Stored: `status` `ready` (≥ 1 finding) or `empty`, `findings`, `scan_count + 1`, `last_scanned_at` — skipped if an admin disabled the dossier meanwhile.
- Rules: the market is hard-coded to Singapore/Malaysia whatever the studio's region. Any failure → `empty` (a negative cache for 90 days).
- Data: `DbBrandDossierFinding { claim, sentiment, severity, sources[{ url, domain }], quotedEvidence, retrievedAt }`.
- States: —
- Words: —
- Reachable: yes (live AI).

### B-84 · Cite-or-drop validation of brand claims
- Where: `L/brand-scan.ts:25-29, 45-143`.
- Entry: B-83.
- Does: at most 6 findings; claim trimmed and cut at 400 characters, empty → dropped; sentiment coerced (unknown → `mixed`, "held to the stricter bar"); severity `notable` else `mild`; sources = only cited URLs present in the annotations (normalised: lowercase host, no hash, no trailing slash, query kept), one per domain (`www.` stripped); negative/mixed need ≥ 2 distinct domains, positive ≥ 1; evidence cut at 300 characters.
- Rules: subdomains count as different domains (`forums.hardwarezone.com.sg` vs `hardwarezone.com.sg`), so one site can pass the two-domain bar; the claim text itself is never compared with the sources.
- Data: as B-83.
- States: —
- Words: —
- Reachable: yes.

### B-85 · Building the ammo
- Where: `L/brand-dossier-service.ts:44-119`.
- Entry: B-81.
- Does: competitor side — per differing brand (canonical, de-duplicated): no dossier, `disabled` or `pending` → skipped; `empty`, or no negative/mixed finding → listed in `cleanBrands` ("quiet reassurance"); else one finding per negative/mixed claim with a suggested question; findings sorted `notable` first. Own side — per own-brand advantage: skipped if `disabled`; the first positive finding (if any) becomes its `claim` + `sources`, otherwise `claim: null`. Returns null when nothing is left. `{ scannedAt, cleanBrands, findings, ownAdvantages }`.
- Rules: praise for a rival's brand is dropped (2026-08-14 field feedback). A negative dossier on one of *our* brands is silently ignored — the ID is never warned. ID-only: never rendered on client surfaces or fed to the WhatsApp draft (`TYPES:4744-4782`).
- Data: `VerdictBrandAmmo`.
- States: —
- Words: *"Users on {domain} and {domain} say: {claim} You can ask the other studio how they handle this with {brand}."*
- Reachable: yes.

### B-86 · Kill switch and the ammo's lifetime
- Where: `L/brand-dossier-service.ts:123-142, 281-290`; `scripts/migrations/278_brand_dossiers.sql:13-14, 50`; `src/app/api/quote-xrays/records/route.ts:55`; `src/app/api/quote-xrays/share/[token]/route.ts:37-38`.
- Entry: B-81; the cron.
- Does: `platform_config.quote_xray_brand_ammo_enabled` — read error → off (fails closed), row missing → on, `true` / `"true"` → on.
- Rules: checked only when writing — ammo already on a row keeps rendering after the switch is turned off (the migration promises "hide all ammo instantly"; the read routes never check it) and after an admin disables a dossier. Ammo is a one-time snapshot per run: brands queued beyond the inline scans, cron refreshes and later scans never reach existing runs. The public share route strips `brandAmmo` (hand-off C).
- Data: `platform_config`, `quote_xrays.brand_ammo`.
- States: —
- Words: —
- Reachable: yes.

---

## The legacy objective synthesis

### B-87 · The objective call
- Where: `L/synthesise-prompt.ts:1-17, 213-237`.
- Entry: `buildObjectiveSynthesis` (B-03, B-04) when live.
- Does: one call per objective: `google/gemini-2.5-flash`, JSON mode, 8 192 tokens; a wrong `kind` is overwritten with the requested objective; missing fields are backfilled (B-95).
- Rules: throws after retries → the single-objective run returns 502; a combined run drops that objective.
- Data: `QuoteXraySynthesis`.
- States: B-08.
- Words: —
- Reachable: API only.

### B-88 · Shared rules and the context the model sees
- Where: `L/synthesise-prompt.ts:19-25, 188-211`.
- Entry: B-89…B-92.
- Does: common rules: *"Never invent line items or prices. Only reference items present in the inputs."*, *"All monetary values you emit must be integers in CENTS (multiply dollar amounts by 100)."*, *"All quotes are in the same currency (verified upstream — do not warn about currency)."*, *"Return ONLY valid JSON conforming to the schema below. No markdown fences, no commentary."* Context: `Currency: {code}`; `Quotes:` lines `[i] role=… label="…" grandTotal=… items=n`; `Match matrix rows:` lines `[Category] "label" :: q0=$1234 q1=missing`; `Totals (cents):`.
- Rules: row prices carry a hard-coded "$" and are rounded to whole units; Gap Finder and Sales Justifier say "Singapore" whatever the studio's region; the model does every sum it returns (risk impacts, hero totals, deltas, percentiles) — the opposite of the Verdict's "AI never does arithmetic" (B-46). Individual unit prices, quantities and units are not in the context.
- Data: —
- States: —
- Words: —
- Reachable: API only.

### B-89 · Gap Finder
- Where: `L/synthesise-prompt.ts:36-61`; `TYPES:4489-4505`.
- Entry: B-87.
- Does: *"You are a Singapore interior-design quote analyst. The user uploaded their own quote plus competitor quote(s). Identify where their quote is exposed: missing scope, mispricing, ambiguous lines."* Schema: `risk { missingScopeCount, missingScopeImpactCents, overPricedCount, overPricedImpactCents, underPricedCount, underPricedImpactCents }`, `coverage [{ category, cells [{ quoteIdx, state present|missing|partial }] }]`, `brief` (exactly 3 actionable bullets), `notes [{ canonicalDescription, note }]`.
- Rules: the risk counts and money are the model's; the deterministic scope-gap panel (B-67) shows code numbers next to them and can disagree.
- Data: `GapFinderSynthesis`.
- States: —
- Words: model output.
- Reachable: API only.

### B-90 · Sales Justifier
- Where: `L/synthesise-prompt.ts:63-100`; `TYPES:4507-4531`; `src/components/quote-xray/shared/ValueStack.tsx:37-45`.
- Entry: B-87.
- Does: *"You are a sales coach for a Singapore interior-design studio. Build a client-facing comparison that makes the studio's own quote (quoteIdx 0) look like the better choice — but only state value claims that can be cited to a SPECIFIC line in the OWN quote."* Extra rules: `citedLineDescription` must be the exact text of an own line, else omit the row; confident, premium, never disparaging; `retailEquivalentCents` only when the line's category has a benchmark (B-61): the typical per-unit rate × the line's quantity, else null — "NEVER invent a retail figure". Schema: `hero { ownTotalCents, cheapestCompTotalCents, extraScopeValueCents, headline }`, `valueStack [{ icon shield|sparkles|clock|leaf|wrench|award, title, description, citedLineDescription, retailEquivalentCents }]`, `applesToApples { rawDeltaCents, normalisedDeltaCents, explanation }`, `competitorRisks [{ competitorLabel, risk, affectedLine }]`.
- Rules: nothing checks `citedLineDescription` against our lines (the view prints it as *"From your quote: "…""*); the model never sees quantities, so "× the line's quantity" cannot be done faithfully.
- Data: `SalesJustifierSynthesis`.
- States: —
- Words: model output.
- Reachable: API only.

### B-91 · Market Intel
- Where: `L/synthesise-prompt.ts:102-131`; `TYPES:4611-4637`.
- Entry: B-87.
- Does: *"You are an interior-design market analyst. The user uploaded competitor quotes only (no own quote). Produce an anonymised view of where the market is pricing each category."* Extra rule: never include studio or client names, only `quoteIdx`. Schema: `heatmap [{ category, values [{ quoteIdx, rank low|median|high }] }]`, `percentiles [{ category, p25Cents, p50Cents, p75Cents, benchmarkMinCents|null, benchmarkMaxCents|null }]`, `anomalies [{ canonicalDescription, quoteIdx, unitPriceCents, medianCents, multiple }]`, `scopePatterns [{ canonicalDescription, presentInPercent 0-100, classification table-stakes|common|differentiator }]`.
- Rules: benchmark min/max are asked for but no benchmark block is sent (only the Sales Justifier gets one) — invented or null; "percentiles" of 2–3 quotes; the role says "(no own quote)" even in a combined run where quote 0 is ours; anomalies need unit prices the context does not carry.
- Data: `MarketIntelSynthesis`.
- States: —
- Words: model output.
- Reachable: API only.

### B-92 · Package Ladder
- Where: `L/synthesise-prompt.ts:133-161`; `TYPES:4639-4663`.
- Entry: B-87.
- Does: *"You are an interior-design pricing strategist. The user uploaded multiple versions of their own quote (e.g. Essential/Premium/Luxury). Help them decide which tier to push and how to talk about each one."* Extra rules: tiers ascending by total; exactly 3 talking points per tier; cost / margin null when not derivable, never invented. Schema: `tiers [{ quoteIdx, label, totalCents, costCents, marginCents, marginPercent, sellWhen, talkingPoints[3] }]`, `deltas [{ fromQuoteIdx, toQuoteIdx, clientDeltaCents, costDeltaCents, marginDeltaCents, notableChanges[] }]`, `recommendation { pushQuoteIdx, reason }`.
- Rules: parsed quotes never carry cost, so margins are always null unless invented.
- Data: `PackageLadderSynthesis`.
- States: —
- Words: model output.
- Reachable: API only.

### B-93 · Sales Justifier's deterministic attachments
- Where: `CREATE:96-160`.
- Entry: `buildObjectiveSynthesis("sales-justifier")`.
- Does: in parallel with the base call: premium justifications (B-66) and brand NER (B-76). Then attaches, each only when non-empty: `marketPositioning` (B-60, our lines as per-unit cents) and `belowMarketFlags` (B-62, all) when benchmarks exist; `arithmeticFlags` (B-64, every quote, `isOwnQuote` marked); `matchedItemDefense` (B-65, cheaper rows with `savingCents`, premium rows with the justification or null); `brandComparison` (B-77) when a brand differs.
- Rules: these numbers are code-computed and sit beside the model's hero numbers, which can disagree.
- Data: optional blocks on `SalesJustifierSynthesis` (`TYPES:4532-4608`).
- States: —
- Words: —
- Reachable: API only.

### B-94 · Anonymising Market Intel
- Where: `L/synthesise-prompt.ts:239-294`.
- Entry: `buildObjectiveSynthesis("market-intel")`.
- Does: needles = every quote's vendor, client name and issuer — the full lowercased string plus its tokens of ≥ 4 letters not in a stop list (`pte ltd inc co corp llc llp limited the and of for to by at in on`); longest first; multi-word needles replaced as substrings, single words on word boundaries, case-insensitive, by *"[redacted]"*; runs of redactions collapsed. Applied to `anomalies[].canonicalDescription` and `scopePatterns[].canonicalDescription` only.
- Rules: heatmap and percentile category labels are not scrubbed; a common word in a vendor's name ("home", "design", "build", "works") is redacted out of every description. Market observations (B-101) are never anonymised.
- Data: —
- States: —
- Words: *"[redacted]"*.
- Reachable: API only.

### B-95 · Backfilling a synthesis
- Where: `L/normalise-synthesis.ts:1-73`; `PAGE:373-376`.
- Entry: after the model (B-87) and at render for legacy rows (page, combined view, public page — hand-off A / C).
- Does: per kind, missing arrays → `[]`, missing numbers → 0, missing strings → `""`, `recommendation.pushQuoteIdx` → 0; unknown kinds (combined, verdict) pass through untouched; null or no `kind` → null.
- Rules: backfilled zeros render as real zeros ("0 missing lines").
- Data: —
- States: —
- Words: —
- Reachable: legacy rows only.

### B-96 · Fixture: Gap Finder
- Where: `L/dryrun-fixtures.ts:27-96`.
- Entry: B-06 (no key).
- Does: missing = rows our quote lacks, impact = the **largest** competitor total on the row; per shared competitor cell: ours > theirs × 1.1 → over-priced (impact ours − theirs), ours × 1.1 < theirs → under-priced; coverage per canonical token per quote: every row present → `present`, none → `missing`, else `partial`; notes for the first 5 rows.
- Rules: the coverage `category` is the raw token ("hacking"), not the display label the model returns.
- Data: —
- States: —
- Words: *"Add {n} missing line{s} — competitors include scope you don't."* / *"Scope coverage looks complete vs. competitors."*; *"You're priced higher on {n} line{s} — prepare justification before the next call."* / *"No lines are conspicuously over-priced."*; *"Walk the client through the apples-to-apples view rather than the headline total."*; *"(DRY_RUN) Add real AI commentary here."*
- Reachable: no-key environments (API only).

### B-97 · Fixture: Sales Justifier
- Where: `L/dryrun-fixtures.ts:98-147, 249-251`.
- Entry: B-06.
- Does: our total; cheapest competitor total (0 without one); extra scope = our rows missing from **at least one** competitor; value stack = the first 4 such rows (icon `shield`); raw delta = ours − cheapest, normalised = raw − extra; competitor risks for the first 2 competitors.
- Rules: money formatted `$` + en-SG, no decimals, whatever the currency.
- Data: —
- States: —
- Words: *"You include {$x} more in scope than the cheapest competitor."* / *"Your quote is comparable in scope — focus the conversation on execution and warranty."*; *"Included in your quote, missing from competitor."*; *"After equalising scope, the true delta narrows because competitor quotes exclude items your quote covers."*; *"(DRY_RUN) Replace with AI-flagged exclusion or ambiguity."*; *"TBD"*.
- Reachable: no-key environments (API only).

### B-98 · Fixture: Market Intel
- Where: `L/dryrun-fixtures.ts:149-192`.
- Entry: B-06.
- Does: heatmap by summed category totals per quote — lowest → `low`, highest → `high`, else `median` (ties resolve to low first); percentiles for the first 5 categories fixed at p25 100 000, p50 250 000, p75 500 000 cents; no anomalies; scope patterns for the first 8 rows: present share of quotes, 100 % → `table-stakes`, ≥ 66 % → `common`, else `differentiator`.
- Rules: the fixed percentiles are fabricated numbers saved as a real row.
- Data: —
- States: —
- Words: —
- Reachable: no-key environments (API only).

### B-99 · Fixture: Package Ladder
- Where: `L/dryrun-fixtures.ts:194-232`.
- Entry: B-06.
- Does: tiers = quotes by total ascending (cost/margin null); deltas between neighbours; recommendation = the middle tier (index ⌊n/2⌋).
- Rules: —
- Data: —
- States: —
- Words: *"(DRY_RUN) Pitch this tier when client signals price sensitivity."*; *"Highlight what's included vs. the tier below."*; *"Anchor to long-term value over short-term cost."*; *"Use the warranty difference as a closer."*; *"(DRY_RUN) Replace with actual line-level diffs."*; *"(DRY_RUN) Middle tier typically has the highest acceptance × margin."*
- Reachable: no-key environments (API only).

### B-100 · Four definitions of "missing" and three of "shared"
- Where: `L/real-gap.ts:89-125`; `L/scope-gaps.ts:54-90`; `L/dryrun-fixtures.ts:38-43, 104-115`; `L/xray-stats.ts:52-59`.
- Entry: —
- Does: —
- Rules: missing / extra scope — Verdict: rows the **chosen** competitor lacks, at our line totals; scope gaps: exposure valued at the **cheapest** competitor, unique value = rows **no** competitor has; Gap Finder fixture: impact at the **largest** competitor total; Sales Justifier fixture: our rows missing from **at least one** competitor; legacy model: its own numbers. Shared — stats: present in ≥ 2 quotes; scope gaps: ours + **every** competitor; real gap: present on both of the two sides compared. Numbers for "the same thing" therefore differ between panels and between the headline and the breakdown.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Side effects of a run

### B-101 · Market observations (the "flywheel")
- Where: `CREATE:423-427, 495-532, 718-719`; `src/app/api/quote-xrays/[id]/route.ts:212-215`.
- Entry: every verdict run; legacy Market Intel and combined runs.
- Does: one row per **present** cell of every matrix row: `{ country_code, currency_code, canonical_category (token), canonical_item (the row's label), unit: null, unit_price_cents, qty, line_total_cents, source_xray_id }`, inserted with the service role; failures only logged.
- Rules: our own quote's lines are written too — the studio's pricing leaves the tenant into a cross-studio table; the text is raw line wording (brands, addresses or client names inside descriptions are not stripped) although the code calls it "anonymised"; `unit` is always null, so observations cannot be compared per unit; nothing in the code reads the table; deleting an X-Ray leaves its observations (no foreign key).
- Data: `market_quote_observations` (hand-off D).
- States: —
- Words: —
- Reachable: yes (write-only).

### B-102 · Telemetry
- Where: `CREATE:721-736`; `src/lib/usage/funnels.ts:57-63`.
- Entry: a saved verdict run.
- Does: fire-and-forget `track("feature_succeeded", …, "quote_xray")` with `flow "verdict"`, `lead_linked`, `own_from_lead`, `points_count`, `material_points`, `comp_brand_mentions`, `comp_named_any_brand`, `differing_brands`, `unknown_materials` (≤ 10, B-74). The usage funnel "Quote X-Ray" counts *Opened* → *Parsed successfully*.
- Rules: failures, fixtures and legacy runs send nothing from the engine.
- Data: usage events (hand-off C/D).
- States: —
- Words: *"Quote X-Ray"*, *"Opened"*, *"Parsed successfully"* (usage dashboard).
- Reachable: yes.

---

## Read-side derivations (pure, computed when a row is shown)

### B-103 · At-a-glance stats
- Where: `L/xray-stats.ts:1-74`.
- Entry: `XrayStatsBar` on legacy rows (hand-off A); B-104.
- Does: per quote `{ label, role, itemCount (parsed lines), totalCents }` — the matrix total, else the parsed grand total; `itemsCompared` = matrix rows; `sharedCount` = rows present in ≥ 2 quotes; `uniqueCount` = rows in exactly 1; `priceSpreadCents` = max − min of the known totals (null under 2).
- Rules: a matrix exists for every stored row, so a quote without a grand total reads S$0 (B-28) and inflates the spread.
- Data: —
- States: —
- Words: —
- Reachable: legacy rows only.

### B-104 · The printable report model
- Where: `L/build-xray-report.ts:1-216`.
- Entry: B-105.
- Does: title *"Quote X-Ray"*, subtitle `{objective label} · {date} · {currency}`; sections: *Quotes* (per quote `{label} · Your quote|Competitor` → `{total} · {n} item(s)`), *At a glance*; Gap Finder → the two scope-gap lists (B-67), the brief, *Pricing risk*; Sales Justifier → *Headline*, *Market positioning*, *Head-to-head*, *Prices worth questioning*, *Brand & supplier differences*; Market Intel → *Scope patterns*, *Price anomalies*; Package Ladder → *Tiers*, *Recommendation*.
- Rules: money goes through `formatCurrencyFromCents(cents, xray.currencyCode)`, but that helper takes a **country** code — "MYR", "AED", "INR" fall back to Singapore and print "S$" (SGD works by accident of the fallback). A combined row (`kind: "combined"`) matches no branch, so its PDF holds only *Quotes* and *At a glance*. The date prints in the browser locale.
- Data: `XrayReport { title, subtitle, sections[] }`.
- States: —
- Words: *"Quotes"*, *"Your quote"*, *"Competitor"*, *"{n} item"* / *"{n} items"*, *"—"*, *"At a glance"*, *"Line items compared"*, *"Shared (in ≥2 quotes)"*, *"Unique to one quote"*, *"Total price spread"*, *"Gaps — only in the other quote ({n})"*, *"Only in your quote ({n})"*, *"What to do before your next call"*, *"Pricing risk"*, *"Missing scope"*, *"Over-priced lines"*, *"Under-priced lines"*, *"{n} · {money} impact"*, *"Headline"*, *"Your total"*, *"Cheapest competitor"*, *"Extra scope value"*, *"Market positioning — {a}/{b} at or below typical"*, *"you {x}/{unit} · typical {y}/{unit}"*, *"{category} ({position})"*, *"Head-to-head (items in both quotes)"*, *"{item} ({stance})"*, *"you {x} · {competitor} {y}"*, *"Prices worth questioning"*, *"{item} — {label} {x}/{unit} vs market {y}/{unit} ({pct}% below)"*, *"Brand & supplier differences"*, *"{label} specifies {brand} for {item}"*, *"Scope patterns"*, *"{classification} · {pct}% of quotes"*, *"Price anomalies"*, *"{item} — {x} vs median {y} ({m}×)"*, *"Tiers"*, *"Sell when: {text}"*, *"Recommendation"*, *"Push: {label}"*, *"Recommended tier"*; objective labels *"Gap Finder"*, *"Sales Justifier"*, *"Market Intel"*, *"Package Ladder"*, *"Verdict"*.
- Reachable: legacy rows only.

### B-105 · PDF download (touchpoint)
- Where: `L/download-xray-pdf.ts:1-97`; `PAGE:136-167`.
- Entry: *Download PDF* in the page header (hand-off A).
- Does: jsPDF A4 render of B-104 (layout not inventoried), saved as `quote-xray-{objective}-{YYYY-MM-DD}.pdf`.
- Rules: offered only for non-verdict rows — a verdict has no download.
- Data: —
- States: —
- Words: file name.
- Reachable: legacy rows only.

### B-106 · Comparison numbers for combined runs
- Where: `L/combined-number.ts:1-12`; `PAGE:340`.
- Entry: the combined result header (hand-off A).
- Does: 1-based position among the studio's combined rows by creation time (oldest = 1); null for any other row.
- Rules: deleting an older combined row renumbers the later ones.
- Data: —
- States: —
- Words: *"Comparison {n}"* (page).
- Reachable: legacy rows only.

### B-107 · Grouping by category
- Where: `L/group-by-category.ts:1-27`.
- Entry: legacy panels (scope gaps, flags, brands, head-to-head — hand-off A).
- Does: groups items under their category in first-appearance order (callers pre-sort by value); blank → *"Other"*.
- Rules: —
- Data: —
- States: —
- Words: *"Other"*.
- Reachable: legacy rows only.

### B-108 · The Verdict view recomputes the breakdown (touchpoint)
- Where: `src/components/quote-xray/VerdictView.tsx:32-49, 88-97`.
- Entry: a verdict row on screen (hand-off A).
- Does: calls `computeRealGap(xray.matchResult)` to rebuild the per-item "their gaps / our gaps" lists (not persisted), next to the stored headline.
- Rules: they agree only while the stored matrix is unchanged (B-34). The view also passes the currency code to the country-code formatter (the same fallback as B-104).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-109 · Benchmark count for the methodology note (touchpoint)
- Where: `src/components/quote-xray/shared/MethodologyPanel.tsx:20-59`.
- Entry: legacy Sales Justifier view and its public page (hand-off A / C).
- Does: `countReferencedBenchmarkItems` = distinct matched benchmark items across market positioning and below-market flags (category fallbacks ignored) → "N aggregated market benchmark rate(s)".
- Rules: the panel says *"Line items are matched by unit; items worded differently but covering the same work are treated as the same, and anything without a confident match is labelled as an estimate."* — the matcher uses category and words, never units (B-27), and nothing labels an estimate.
- Data: —
- States: —
- Words: panel copy is hand-off A.
- Reachable: legacy rows only.

### B-110 · Which rows can be shared
- Where: `L/shareability.ts:1-22`.
- Entry: the share-link mint and resolve routes (hand-off C).
- Does: shareable = `objective = sales-justifier`, or a combined row whose results contain a Sales Justifier slice.
- Rules: verdict rows are never shareable — "the rebuilt flow's client artifact is an editable WhatsApp message, not a portal page (product decision 2026-08)".
- Data: —
- States: —
- Words: —
- Reachable: legacy rows only.

### B-111 · Outcome values
- Where: `L/outcomes.ts:1-25`; `src/app/api/quote-xrays/[id]/route.ts:123-145`; `Q:299-301`.
- Entry: `PATCH { action: "set-outcome" }` (API only).
- Does: allowlist `pending · won · lost_price · lost_silence · lost_other`; `outcome_at` = now, or null for `pending`; `outcome_note` = the string sent, else null.
- Rules: no client calls it since the verdict rebuild ("Outcome capture was removed … no win/loss tracking UI exists anymore"); the labels and the selectable list have no production caller. Nothing in the engine reads outcomes (no learning loop).
- Data: `quote_xrays.outcome, outcome_note, outcome_at` (hand-off D).
- States: *"Invalid outcome"*.
- Words: *"Not recorded"*, *"Won"*, *"Lost — price"*, *"Lost — no response"*, *"Lost — other"* (unused).
- Reachable: API only.

---

## Models, costs and limits

### B-112 · Every model call the engine makes
- Where: `PF:13-16`; `L/ai-match.ts:25, 260-267`; `L/brand-comparison.ts:18, 190-197`; `L/verdict.ts:35, 346-353`; `L/synthesise-prompt.ts:17, 222-229`; `L/matched-item-defense.ts:14, 122-129`; `L/brand-scan.ts:25-29, 200-213`.
- Entry: —
- Does: all through OpenRouter with `OPENROUTER_API_KEY`, one user message, no system prompt, no temperature. Parse — `google/gemini-2.5-flash`, 32 768 → 65 536 tokens on truncation, JSON, 120 s abort, 2 attempts, one per file. AI match — same model, 4 096, JSON, no timeout, 2 attempts, 0–1 per run. Brand + material NER — same model, 2 048, JSON, 2 attempts, 1 per live verdict / legacy Sales Justifier. Verdict phrasing — same model, 4 096, JSON, 2 attempts, 1 per live verdict. Legacy objective — same model, 8 192, JSON, 2 attempts, 1 per objective (4 in a combined run). Premium justifications — same model, 2 048, JSON, 2 attempts, legacy only. Brand scan — `google/gemini-2.5-flash:online`, 1 600, no JSON mode, 45 s, no retry, ≤ 3 per run after the response + the cron.
- Rules: a live verdict run = 3–5 calls (1–2 parses, NER, 0–1 match, verdict) + up to 3 scans. The only cost figure in code is the scan's "~1¢"; no usage or cost is recorded anywhere. No prompt versioning.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-113 · What the engine never does
- Where: the modules above.
- Entry: —
- Does: —
- Rules: no GST/tax normalisation between the two quotes; no discount allocation (quote-level discounts stay in the grand total only); no unit conversion (metric ↔ imperial) and no per-unit vs lump-sum reconciliation; no currency conversion; no check that a quote's lines add up to its grand total; no brand de-duplication beyond case (B-79); no own-quote status gate; no manual line correction or re-matching besides un-merge; no re-run or refresh of a stored X-Ray; the prompts and raw model answers are not stored.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Tests (what they pin)

### B-114 · Categories, matching and the legacy fixtures
- Where: `src/__tests__/quote-xray.test.ts` (14 cases).
- Entry: —
- Does: canonicalising ("A HACKING & PROTECTION WORKS", "Hacking Works", "DEMOLITION" → hacking; "G FLOORING WORKS", "Tiling", "Vinyl flooring" → flooring; "Z STARGATE WORKS" → `stargate works`; null / "" → misc) and labels; the matrix — identical lines share rows and totals in cents, a competitor missing a line leaves an absent cell, "Hacking of existing floor tiles" vs "Hack existing tiles to floor" joins as `tokens`, no cross-category match, a three-way case with two rows; the Gap Finder fixture's 3 bullets and missing count; the Package Ladder fixture's ascending tiers; the anonymiser redacts "Home Create" and leaves other kinds alone.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### B-115 · AI merge, un-merge and scope gaps
- Where: `src/__tests__/quote-xray-ai-match.test.ts` (11); `quote-xray-scope-gaps.test.ts` (7).
- Entry: —
- Does: `applyMergeGroups` — merges two orphans and tags the adopted cell `ai`, keeps the primary label; refuses below 0.7, across categories and for same-quote rows; ignores unknown ids and single-id groups; collapses a three-quote chain; preserves order; empty list → unchanged. `splitMergedRow` — lossless restore, ref-equal no-ops. Scope gaps — exposure / unique / shared, cheapest competitor across three, partial overlap is no gap, AI-matched count, a merge removes two false gaps; `matchConfidence` stamped and the lowest kept on a chain.
- Rules: the chained same-quote conflict (B-33) is not tested; `refineMatchWithAI`'s gating and prompt are not tested.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-116 · Real gap and verdict
- Where: `src/__tests__/quote-xray-real-gap.test.ts` (9); `quote-xray-verdict.test.ts` (14).
- Entry: —
- Does: real gap — the 30 000 / 22 000 / 6 100 → 1 900 example, the honesty adjustment, a negative gap, unpriced counting, shared / absent rows ignored, the cheapest competitor, the zero-total fallback, null on one quote, an explicit competitor index. Verdict — missing-scope and arithmetic facts with no own slips and weight order; a material fact naming our alternative; glass-house suppression; own-brand advantages; brand facts ranked below money; a head-to-head fact worth 200 000; the normaliser (invalid / duplicate / empty dropped, cap 3, lone medium, `{share_link}` stripping, fallbacks, null answer); the fixture path's headline numbers, numbered points inside the WhatsApp, digits present; null on one quote; lone medium in the fixture.
- Rules: the live path (prompt, substance guard, fallback mixing — B-48) is not tested.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-117 · The verdict route and lead quotes
- Where: `src/__tests__/quote-xray-verdict-route.test.ts` (13).
- Entry: —
- Does: create — 401, `MISSING_COMP_FILE`, `NO_OWN_SOURCE`, `NO_LEAD_QUOTE`; the lead-first path (loader called once, scoped client, studio / lead / `objective "verdict"` stamped, observations inserted, the competitor label = the parsed letterhead "Comp Studio", headline 3 000 000 / 2 200 000 / 610 000 / 190 000, no `{share_link}`); the two-upload path never calls the loader. Lead quotes — 401, 400, BIGINT strings coerced, empty list. Attach-lead — 400, attach after an in-tenant check, detach with null. All run without a key (fixture path).
- Rules: the loader itself (B-18…B-20), the currency check, the legacy / combined create and `appendMarketObservations`' row shape are not tested.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-118 · Flags, benchmarks and head-to-head
- Where: `src/__tests__/quote-xray-arithmetic-check.test.ts` (6), `quote-xray-below-market-flags.test.ts` (8), `quote-xray-matched-item-defense.test.ts` (6), `quote-xray-market-benchmarks.test.ts` (16), `quote-xray-methodology.test.ts` (3).
- Entry: —
- Does: arithmetic — flags a slip, allows rounding slack, marks our quote, skips non-amount and null / non-positive lines, sorts by discrepancy. Below-market — strong and mild, within range, never our quote, like-for-like units, no benchmark, no price, sort across competitors. Head-to-head — cheaper with saving, premium with both descriptions, 2 % parity, shared rows only, cheapest of three, fallback label. Benchmarks — every bridged token exists in the seed's labels, no bridge for metalwork / lighting / curtains / aircon / preliminaries / misc, roll-up envelope, NUMERIC strings, midpoint, heterogeneous units, unmapped rows, rows without bounds; units ("running ft" → ft, "Sq Ft" → sqft, "nos", "No." → pc, "Lump Sum" → lot); positioning — item bands over the blend, `below`, category fallback, unit gating, skipped categories, labels. Methodology counter — 0, distinct items, category fallbacks ignored.
- Rules: the metre → foot mapping (B-58) and generic-word item binding (B-59) are not covered.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-119 · Materials, brands and dossiers
- Where: `src/__tests__/quote-xray-material-facts.test.ts` (6), `quote-xray-brand-comparison.test.ts` (6), `quote-xray-brand-normalize.test.ts` (6), `quote-xray-brand-scan.test.ts` (10), `quote-xray-brand-dossier.test.ts` (8), `quote-xray-brand-enrichment.test.ts` (5).
- Entry: —
- Does: materials — MDF in a kitchen with our plywood named, glass-house, wet-area gating, "laminate" only on worktop / floor lines (tested with "Wardrobe in laminate finish"), per-material de-duplication, value order. Brands — a differing brand flagged, the guardrail (also case-insensitive), de-duplication, unresolved lines skipped, empty. Cache keys — diacritics, suffixes, parentheses, punctuation, empty, display names, exact / alias matching. Scan — two-domain negatives kept, minted URLs rejected, one-domain negatives dropped, positives on one source, unknown sentiment as mixed, caps; JSON and URL helpers; known vs unknown materials. Dossiers — the five classes, ammo findings with questions, clean brands, disabled / pending skipped, rival praise filtered, own advantages with praise or without a dossier, canonical lookups. Enrichment — miss → pending + inline scan + scoped write; fresh → no scan; kill switch off; disabled; no brands → no DB access.
- Rules: `scanBrand`'s network call and `extractQuoteBrandsAndMaterials` are not tested; the subdomain loophole (B-84) is not covered.
- Data: —
- States: —
- Words: —
- Reachable: —

### B-120 · Legacy shape, outcomes, grouping and the scoped API
- Where: `src/__tests__/quote-xray-normalise-synthesis.test.ts` (5), `quote-xray-outcomes.test.ts` (2), `quote-xray-group-by-category.test.ts` (3), `quote-xrays-scoped-api.test.ts` (13).
- Entry: —
- Does: backfills for all four kinds, real data preserved, null for garbage; the outcome allowlist and labels; grouping order and "Other"; the scoped records / PATCH / share routes — 401s, studio scoping, 404 when RLS hides a row, `studio_id` never overwritten, invalid status 400, share minted for a Sales Justifier row and refused for another objective (route details hand-off C).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### B-121 · Not tested, and the tuning harness
- Where: `scripts/xray-tune.ts:1-118`.
- Entry: —
- Does: 171 test cases across 21 files cover the pure modules. Untested: the parse helper (prompt, text/vision switch, errors), currency detection, `refineMatchWithAI`, `buildVerdictPrompt` and the live verdict path, `synthesiseWithGemini` and the legacy prompts, `draftPremiumJustifications`, `loadOwnQuoteFromLead` (mocked in the route test), `appendMarketObservations`, `computeXrayStats`, `buildXrayReport`, the legacy / combined create. `scripts/xray-tune.ts` is a "throwaway tuning harness": the legacy pipeline with live calls on a made-up own-vs-competitor pair (Our Studio vs Budget Reno) and hand-written SG-like benchmarks, printed for eyeballing (not run for this audit).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: manual only.

---

## Uncertain / not verified

- Whether a digitized line marked inclusive/FOC through `amount_marker` keeps a non-zero `total` in `quote_line_items` (it would then count as missing scope, B-37 (2)). The column comment says the marker "excludes from totals"; the stored value was not checked.
- Whether parsed competitor grand totals usually include GST — it depends on the document and the model; the engine never asks (B-12, B-37).
- Whether Gemini's JSON mode ever returns numbers as strings in practice (B-14's null / 0 path is real in code, frequency unknown).
- The scan's cost ("~1¢") and "Exa-backed" come from code comments; the OpenRouter annotation shape (`url_citation.url` vs `url`) was not checked against the provider.
- Whether production `platform_market_rates` holds `crowd` rows (needs ≥ 5 studios per item, B-56) and where `crowd_rate_signals` are written (hand-off D).
- Whether `after()` enrichment always completes within the platform budget (three parallel scans ≤ 45 s each were not timed).
- Whether real quotes mix `package_tier` lines or optional lines into one digitized quote often enough to distort the own side (B-20).
- Whether studios categorise digitized lines by room (B-19, B-24) — code allows it; data not checked.
- How often the AI merge pass is skipped by the 80-candidate cap on real quote pairs (B-30).
- The 1.0 docs beyond `docs/prd/12-quote-xray.md` and `docs/rules/tools.md` were not read (hand-off C); no spec for the Verdict rebuild was found under `docs/`.
- `scripts/xray-tune.ts` and the tests were read, not run.
