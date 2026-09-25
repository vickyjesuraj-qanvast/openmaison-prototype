# Quote editor — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the quote editor parity rounds (REG-621…628). For every 1.0 table, column and rule the quote editor
touches it says where the same thing lives in 2.0 and which round put it there, so a migration script and the code after it have one place
to look. The audit (`05-quote-editor-1.0-to-2.0-audit-2026-09-24.md`) holds the reasoning and the 33 calls (§6, §9); inventory D
(`quote-editor-1.0-inventory/D-data-model.md`) holds the column-level diff (§4) and the full port plan (§5, D-180…D-255). The quote
templates' own map is `04-quote-templates-migration-map-2026-09-24.md`.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), rules live in `lib/`, every write is a server action with
`revalidatePath`. Money is in minor units (1.0 mixed dollars and cents). A quote holds its own settings (1.0 kept them on the lead — Q-01,
D-101). Ids keep 1.0's UUID strings; `*_by` becomes a `members.id`.
Rounds: **R1** lines and money (REG-623) · **R2** approval and the banner (REG-624) · **R3** versions and the lists (REG-625) · **R4** the
client's side (REG-626) · **R5** comments and getting lines in (REG-627) · **R6** this map (REG-628).

## 1. Tables and columns

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `quotes` (+ `leads.quote_metadata` per lead) | `quotes` | the lead's discount, GST switch, entity, validity, IC, customer id, section order and notes are copied onto **each** of its quotes (D-101, D-244); the number verbatim (the `QT-` series continues through `settings.quote_numbering`, D-110) | — |
| `quote_line_items` | `quote_items` | sections become group rows (D-104); dollars → cents; selling price → cost + markup (D-71); `price_book_item_id` kept | — |
| `quote_line_items.vendor_id` → `vendors.name` | `quote_items.vendor` (text ≤ 80) | the vendor's **name** (2.0 has no vendors table; the same word as `price_book_items.vendor`, D-195); backs the Vendor/Sub column | R1 |
| `quote_line_items.spec_url` | `quote_items.link` | http / https only (`cleanLink`); anything else is dropped and logged; backs the Website Link column (D-196) | R1 |
| `quote_line_items.price_type` `by_client` | `quote_items.print_as = 'client'` | prints "By client", counts nothing, bears no cost; `kiv` → `kiv`; `foc` / `inclusive` → the same words; `lump_sum` → a priced line (Q-15) | R1 |
| `quote_line_items.notes` (internal) · `comments` (`LineComment[]`, D-194) | `quote_item_comments` rows | one row per 1.0 comment (author, body, time); a line's internal note becomes one comment by the line's creator — 2.0 keeps no notes column (Q-30) | R5 |
| `quote_line_items.waste_percent` · `tax_rate` · `tax_inclusive` · `discount_label` · flat `discount_amount` | — | folded by the port: waste into the quantity (Q-10), per-line tax dropped (Q-12), inclusive prices converted (templates Q-13), a flat discount turned into its percent (Q-11); each change logged per quote (D-242) | — |
| `quote_status_history` (D-180) | the approval record on `quotes`: `submitted_by · submitted_at · approved_by · review_note · reviewed_by · reviewed_at · client_sent_at` | 2.0 keeps the **last** send, approval and request for changes, not a log; the port writes each from the latest history row of its action (`submit`, `approve`, `reject` → the note, the first move to `sent_for_signature`) | R2 |
| `quotes.rejection_comment` (D-189) | `quotes.review_note` (+ `reviewed_by` · `reviewed_at`) | a *rejected* quote lands as Draft with the note (Q-02) | R2 |
| `quotes.signed_at` (D-188) | `quotes.signed_at` | stamped once; 2.0 had read a Signed quote's date from `updated_at` | R4 |
| `quote_signature_requests.client_selections` | `quote_items.client_choice` (`want` · `skip`) | 1.0 never stored the picks (D-04) — nothing to port; 2.0 records them from the confirmation link (Q-32) | R4 |
| `quote_versions` (per lead) | `quote_versions` (per quote) | each 1.0 version is attributed to the lead's primary quote (D-106); `restore_quote_version` could not complete — 2.0's Bring back restores lines, schedule, pricing, texts and title into a Draft (Q-25) | R3 |
| hard delete | `quotes.deleted_at` + Deleted Quotes | 1.0 rows are gone; nothing to port. 2.0 deletes softly (Restore · Delete forever) and only the creator, an Owner or an Admin deletes (Q-27, Q-28) | R3 |
| `quotes.is_primary`, `leads.quote_status`, the `trg_sync_*` triggers | — | superseded: 2.0 derives a lead's quote state (Q-03, D-215) | — |
| `quote_signature_requests` | `contracts` (+ `from_quote_id`) | the Contracts audit carries the requests; a signed request's quote lands Signed with its `signed_at`, and a signed contract raised from a quote signs it from now on (Q-31) | R4 |
| `quotes.visibility` / the portal share | `quotes.visibility` Private · Shared | Shared once the client has the quote (a send, a confirmation, a signature); Revise puts Private back | R3 |
| `studio_price_book` | `price_book_items` | one row per vendor (D-108); tiers, history, SKU, approval held for the price book audit (Q-19…Q-21) | — |
| `parsed_doc_metadata` (the digitised source) | — | not ported; 2.0's Upload a quote reads a file into lines and keeps no header (D-200) | R5 |

## 2. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| A line selling under its cost is marked | `belowCost` in `lib/quotes/math.ts` (total after the line discount < Qty × Cost; never a word line, a zero total or a declined line); shown only while the Cost column is on | R1 |
| Margin per category | `categoryShares` (`costMinor`, `marginPct`; rebates and FOC / Inclusive / Packaged cost counted; before the quote's discounts) | R1 |
| An approver's own send approves | `sendQuote` · `sendQuoteForConfirmation` (`whoAmI().approver`) in `app/quotes/actions.ts` | R2 |
| Approve · Request changes | `approveQuote` · `requestQuoteChanges` (an approver, a quote at Sent for Approval; the note required) | R2 |
| The studio's settings are the Owners' and Admins' | `assertRunsStudio` on every Settings setter (`app/settings/actions.ts`) | R2 |
| Revise and Duplicate start clean | `reviseQuote` / `duplicateQuote` clear the confirmation, the approval record, the client's picks, the signing date (Duplicate also restarts at version 1) | R2 · R4 |
| Who deletes | `canDeleteQuote` (`lib/quotes/policy.ts`) in `deleteQuotes` · `restoreQuotes` · `deleteQuotesForever` | R3 |
| A quote a live contract reads is never deleted for good | `contractHolds` in `app/leads/quotes-actions.ts` | R3 |
| A passed Valid until is marked, never enforced | `validityPassed` (Sent to Client only) | R3 |
| Who sees leads reaches the quote pages | `fetchQuoteEditor` (null → not found), the studio's preview page, `fetchStudioQuotes`; the client's `/confirm` link is not gated | R3 |
| The link confirms only a sent quote | `confirmQuoteOnline` (Approved or Sent to Client), `isConfirmable` (`lib/quotes/confirm-data.ts`) | R4 |
| A signed contract signs its quote | `signQuoteThrough` (`lib/quotes/sign.ts`) from every signing path | R4 |
| The payment lock holds on the server | `assertMayEditPayments` in `app/quotes/payments-actions.ts` | R4 |
| The header's Send checks readiness | `readiness()` (`lib/templates/readiness.ts`) before any send; blocking = no priced line · no client name · a schedule not at 100 % | R4 |
| Upload a quote | `readRows` · `readDocument` (`lib/quotes/upload.ts`), `createQuoteFromUpload`; amounts come in as cost with no markup (the paste rule) | R5 |

## 3. Porting a 1.0 quote (the order, after the Leads and Templates ports)

Inventory D §5.D is the full sequence (D-230…D-244). What the rounds change in it:

1. **Status and stamps (D-236)** also write the approval record (R2): `submitted_by / at` from the last `submit`, `approved_by` from the
   last `approve`, `review_note / reviewed_by / at` from the last `reject` (the quote lands Draft), `client_sent_at` from the first move to
   `sent_for_signature`, `signed_at` from `client_signed` (R4), and `visibility = 'Shared'` once the client had it (R3).
2. **Lines (D-234)** carry `vendor` (the vendor's name) and `link` (a valid `spec_url`), `print_as = 'client'` for `by_client` (R1).
3. **Comments (new)**: every `LineComment` and every line's internal `notes` become `quote_item_comments` rows (R5), after the lines.
4. **The signature request (D-238)**: a signed request whose contract is ported gets `contracts.from_quote_id` so the two stay together (R4).
5. **Check each quote (D-242)** as before; the Activity feed reads the new stamps, so a ported quote's Activity shows who sent, who
   approved and when it went to the client.

## 4. Demo data

Repair rules written by the rounds: **R46** a line picked from My Items carries the item's vendor · **R47** the approval record of the demo
quotes that passed approval · **R48** a quote the client has reads Shared · **R49** each Won lead's signed contract names its signed quote
and dates it. Each has its checks in the repair's verification list. `fixtures/baseline.json` is rebuilt as the committed baseline plus the
repair rules (never a snapshot of a working `local.db`); `quote_item_comments` joined the baseline's table lists (`lib/db/baseline.ts`,
`scripts/snapshot-baseline.ts`).

## 5. Still the platform's

Reading any PDF or photo into lines (the prototype reads spreadsheets for real and the three reference quotes by name), a token, an expiry
and an OTP on the client's link (Q-33), stored PDFs, the chat drafter (Q-17), price tiers, history and approval (the price book audit).
