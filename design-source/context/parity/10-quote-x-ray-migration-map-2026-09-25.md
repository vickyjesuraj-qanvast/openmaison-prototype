# Quote X-Ray — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the Quote X-Ray parity rounds (REG-636…642). For every 1.0 table, column, JSON shape and rule a comparison
touches it says where the same thing lives in 2.0 and which round put it there, so a migration script and the code after it have one place
to look. The audit (`09-quote-x-ray-1.0-to-2.0-audit-2026-09-25.md`) holds the reasoning and the 25 calls (§6, §9); inventory D
(`quote-x-ray-1.0-inventory/D-data-model.md`) holds the column-level diff (§4) and the full port plan (§5, D-170…D-236). The contracts' map
is `08-contracts-migration-map-2026-09-25.md`.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), the engine is pure (`lib/xray/`), every write is a server action with
`revalidatePath` (`app/quote-x-ray/actions.ts`). Money is in minor units (1.0's parsed documents are in dollars, its matrix and verdict in
cents); times are unix seconds. Ids keep 1.0's UUID strings; `*_by` becomes a `members.id`. **Only 1.0's verdict rows port** (DEF-01): the
four retired objectives and the combined run are logged per lead, never landed (Q-01, D-190). **Nothing is re-run**: a 1.0 reading lands as
the studio saw it — 2.0's engine reads the reference quotes and spreadsheets only, and 1.0 kept no file (D-09).
Rounds: **R1** the reading tells the truth (REG-638) · **R2** reading the files, finding the way (REG-639) · **R3** the record as a working
copy (REG-640) · **R4** who may and what is kept (REG-641) · **R5** this map (REG-642).

## 1. Tables and columns

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `quote_xrays` with `ai_synthesis.kind = 'verdict'` | `quote_comparisons` ×1 | classify by `ai_synthesis.kind`, never by `objective` (a combined run stores its primary objective there, D-02 note 2); skip rows whose competitor is the no-key sample ("Home Create Pte Ltd", 27,000, D-192) and non-SGD rows (D-193) | — |
| legacy and combined rows | — | not ported; counted per lead in the port log (D-190) | — |
| `lead_id` | `lead_id` | only when that lead landed (the Leads port); a lead the port archived lands soft-deleted, and its comparisons leave Recent until it is restored | R4 |
| `inputs.quotes[0].sourceFileName = 'digitized:{uuid}'` | `quote_id` | parse the uuid (the only trace of which quote was defended, D-213); only when that quote landed, else NULL + log; it must be the lead's (`quote comparison whose quote is on another lead`) | R4 |
| `inputs.quotes[1].sourceFileName` | `other_file` | the competitor file's name | — |
| `inputs.quotes[*].parsed.lineItems` | `inputs_json` = `{ yours: YourLine[], theirs: RefLine[] }` | dollars → minor units; `priceType` `foc` · `inclusive` → `word` on your side and 0 on theirs; `section` → `trade`; the competitor's homeowner name and signatory are not carried (D-175) | R1 |
| `ai_synthesis.headline.*` | `result_json` figures | from the headline, never recomputed: `ownTotalCents` → `yoursMinor`, `competitorTotalCents` → `theirsMinor`, `−rawGapCents` → `onPaperMinor`, `missingScopeValueCents` → `yoursOnlyMinor`, `ownMissingScopeValueCents` → `theirsOnlyMinor`, `realGapCents` → `realDiffMinor` (same sign, D-214) | — |
| `headline.oneLiner` · `points[]` · `whatsappMessage` | `result_json.headline` · `points[]` · `message` | `evidence.type` → `kind` (`missing-scope` → `missing` · `matched-item` → `cheaper` · `market-rate` → `below` · `material` · `brand` · `arithmetic` kept as its word) with `medium` from `confidence`; `asQuestion` NULL; 1.0's words kept as they are | R1 |
| `match_result.rows[]` | `result_json.rows[]` | one per matrix row: status from its cells (`matched` · `yours-only` · `theirs-only` · `unpriced` when the one side's line prints no price), `yourIds` · `theirIdx` from the cells' `lineIdx`, the AI-merged rows kept as one row (their provenance is not shown) | R1 |
| `brand_ammo.findings` · `ownAdvantages` · `cleanBrands` | `result_json.brands[]` tone `risk` · `advantage` · `checked` | sources keep their domains (the URLs are not shown, D-181) | R1 |
| — | `engine` | `2` for 2.0's own readings; a ported reading lands `1` with its lines and figures as 1.0 had them — the demo repair re-reads only readings whose quote and file 2.0 can read (R54) | R1 |
| `created_by` (a `profiles.id`) | `created_by` (a `members.id`) | the Leads port's member map; an unknown profile → the studio's Owner + log | — |
| `created_at` | `created_at` | | — |
| `share_token` · `share_expires_at` · `status` · `outcome*` · `updated_at` | — | not ported (Q-22, Q-24; D-194, D-195) | — |
| 1.0 kept no correction, no send | `overrides_json` · `corrected_by` · `corrected_at` · `sent_at` · `sent_by` · `sent_text` · `sent_via` · `your_file` | 2.0 only | R2 · R3 |
| `brand_dossiers` · `market_quote_observations` · `platform_market_rates` · the kill switch · `usage_events` | — | the platform's (Q-23; D-196…D-201) | — |

## 2. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| Your side is what the quote counts: items in the quote's order; optional, declined and a declined section's lines out; a line printing a word stays as covered, unpriced | `yourLinesFrom` (`lib/xray/lines.ts`) | R1 |
| The real difference = (yours − yours-only) − (theirs − theirs-only), both sides on line totals before discounts and GST | `compareQuotes` (`lib/xray/compare.ts`) | R1 |
| Matching: stems and trade words (`SAME`), the trade and room set how many shared words a pair needs, "taking out is not putting in", one shared item noun in the same trade and room, one line against several, a trade lump sum against the other side's lone lines of its trade | `pairLines` | R1 |
| Rates, not lump sums, on a one-to-one pair with quantities in one unit (metres stay metres) | `rates` · `normUnit` | R1 |
| The points: 1.0's fact pool and weights, the three heaviest, one per row, a lone question-only point dropped | `compareQuotes` (facts) · `materialFindings` (`lib/xray/materials.ts`, 1.0's sixteen with two fixes) | R1 |
| The client never reads the other studio's name; the draft is what the screen shows | `say` · `draftMessage` | R1 |
| A file is read on pick: a sheet for real, a PDF or a photo by whole-word name; ≤ 10 MB; the server checks a sheet's lines again | `readSide` · `cleanLines` (`lib/xray/reading.ts`); `readOtherQuote` (`lib/xray/reference.ts`) | R2 |
| A correction re-reads the same lines; Run again reads the quote as it is now, carrying corrections whose lines still exist | `correctComparison` · `rerunComparison` | R3 |
| Stale = the quote's counted lines differ from the lines the reading kept | `linesFingerprint` in `fetchComparison` | R3 |
| Who sees leads reaches every read and the run; a record of a lead you can't open, or of a deleted lead, is not found | `fetchXrayData` · `fetchComparison` · `openComparison` | R4 |
| Delete: its maker, an Owner or an Admin; permanent; logged on the lead (`comparison_deleted`) | `canDeleteComparison` (`lib/xray/policy.ts`) · `deleteComparison` | R4 |
| A lead's Delete forever takes its comparisons; a quote's deletion leaves them, saying so | `deleteForever` (`app/leads/actions.ts`); the record's quote line | R4 |

## 3. What changes in the data on the way

- A ported reading keeps 1.0's figures on **document totals** (GST in) beside 2.0's line totals before GST: don't expect Σ rows = `yoursMinor`
  on a ported row (D-222); with `quote_id` set, log the difference against the landed quote and its cause.
- 1.0's AI-merged rows port as ordinary pairs; its un-merge history is not kept. A studio corrects a ported reading only once it has its
  lines (`inputs_json`), which the port writes from `inputs`.
- The demo data: R33 reads the two seeded readings through `yourLinesFrom` with engine 2, and R54 re-read every engine-1 reading and removed
  the one that compared a file with itself — the base state holds three readings (`fixtures/baseline.json` rebuilt after rounds 1 and 3).

## 4. Still the platform's

A model reading any PDF or photo, web brand research and its cache, market rate tables and the observations feed, other currencies, AI
cost per studio and limits — 2.0's stand-ins are named in the audit (XR-01, XK-02, XF-01…XF-05).
