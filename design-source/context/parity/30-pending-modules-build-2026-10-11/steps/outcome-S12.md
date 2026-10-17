# S12 · Price book leftovers — outcome (2026-10-12)

Card: `held:price-book` (Company › Price book; recommendation *build*, effort S — "Matching and waste are plain rules that save real typing;
neither needs a model"). 1.0 read: `src/lib/price-book-matcher.ts` (`matchItemsToPriceBook` — tokenize, renovation synonyms, Jaccard, 70 · 15 · 15,
tiers 0.75 / 0.50, the 15 % discrepancy), `src/lib/price-book-suggester.ts` + `src/app/api/price-book/suggestions/{scan,bulk}` (high/suggested
auto-linked, the rest offered to add), `src/app/api/quotes/auto-match/route.ts` + `src/app/api/quotes/line-items/route.ts` (cost auto-match on
save, high tier only, lines with no cost) + `src/components/leads/quote-digitizer-dialog.tsx` (background auto-match after a parse) +
`auto-match-review-panel.tsx` (the review), `src/components/accounts/price-book-item-editor.tsx` (Waste Factor %, 0–50) + `src/lib/quote-calc.ts`
(`effectiveQty = qty × (1 + waste/100)`, applied to the client's amount too) + `price-book-csv-dialog.tsx` (the CSV's "Waste %"),
`src/components/price-book/drift-tab.tsx` (kept). Register rows: `steps/reg-S12.md` (REG-S12.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s12.cjs` (**72 / 72**, twice back to back on one server; a full `.dump` before and after each run is identical); shots banked in `design-source/verify/pending-modules/pm2-s12/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| Matching quote lines to the book (cost filled after an upload, new-item suggestions) — "filed as model work · revisit: 1.0's matcher is plain code (synonyms + overlap)" | **Built by rule (no model, no credits)** — 1.0's matcher in 2.0's words (the X-Ray's word reading + 1.0's synonyms; item name read too; another unit never matches; taking out never matches putting in; book indexed once per array and each line's best item remembered, so a cell edit reads nothing again). **Upload a quote**: the lines whose whole price sits in their cost take their *sure* match at once (1.0's high tier after a parse) — the item's cost, the price kept — and the snackbar says how many. **The Items table's *Match N lines*** (beside *Price book*, only while a line matches) opens the review: matches with the item, its cost, the margin left, close ones far off in price unticked and saying how far, one that would sell below cost never ticked for the member (nor filled by an upload); lines not in My Items offered to add (a Designer's proposed, one bell row). One step for ⌘Z; Undo puts the lines back and takes new entries out again. **Maison AI** opens it ("n lines match items in My Items — take their cost") | `lib/company/price-book-match.ts` (`matchLines` · `bookFill` · `startsTicked` · `marginAfter` · `costUnknown`) · `lib/quotes/line-words.ts` (moved from `lib/xray/compare.ts`, unchanged) · `lib/quotes/book-fill.ts` (`writeBookMatches` · `fillUploadFromBook`) · `app/quotes/items-actions.ts` (`matchQuoteLinesToBook` · `undoBookAdds`; `addLineToBook` · `proposeNotice` shared with Save to My Items) · `app/leads/quotes-actions.ts` (`createQuoteFromUpload` → `{ id, matched }`) · `lib/quotes/upload.ts` (`uploadedLine`) · `components/quotes/editor/items/match-book-dialog.tsx` (+ css; `planBookMatches`) · `items-section.tsx` · `items-table.tsx` (`AddItemRow` link) · `use-quote-maison.tsx` · `quote-editor.tsx` · `components/quotes/create-quote-modal.tsx` (the reading's sentence) |
| Waste factor % per item — "dropped, handed to Finance and never picked up · revisit: Order from the quote sends quoted quantities to vendors" | **Built — set on the item, applied on the order** (the card's question, as recommended). *Waste (%)* on a Purchase item (or any item carrying one), 0–50, History, a Waste column in Column settings, Export *Waste %* and the import reading it back. **Order from the quote** and a PO's **Add from the quote** order the quoted quantity plus the waste, rounded up, and say so ("1,037 sqft · 987 on the quote +5% waste"); the client's share in "The client pays …" stays on the quoted quantity. The quote never changes | `price_book_items.waste_pct` (0096) · `lib/company/price-book-waste.ts` (`cleanWaste` · `orderedQty` · `wasteLine`) · `app/company/price-book-actions.ts` · `lib/company/price-book-changes.ts` · `lib/quotes/clipboard.ts` (`waste` field, book only) · `components/company/price-book/item-dialog.tsx` · `price-book-items.tsx` · `app/finance/order-from-quote-actions.ts` · `components/projects/money/order-from-quote-dialog.tsx` · `lib/finance/queries.ts` (`QuotePick.wastePct`, `wasteOf`) · `lib/finance/costs.ts` (`againstQuote` on the quoted qty) · `components/finance/po-dialog.tsx` |
| Market rates, drift tab, crowd price signals; model-read vendor PDFs — "platform / stand-ins · as recommended (Q-16) · keep" | **Kept** (the platform's; 1.0's benchmark reads have failed since 2026-07-22) | — |
| Bulk Set vendor and the import's vendor are free text, not Finance › Vendors — "revisit (one vendor list, N-16)" | **Built** — both pick from Company › Finance › Vendors (the house `VendorNameField`, with a new resting state for "Clear the vendor instead"); the server spells a bulk vendor as the directory does | `components/company/price-book/bulk-edit-dialog.tsx` · `import-items-dialog.tsx` · `components/finance/vendor-name-field.tsx` (`autoFocus` · `disabled`) · `bulkUpdatePriceBookItems` |
| Old binary .xls refused — "package call · keep" | **Kept** (refused with the way out, "Save the sheet as XLSX or CSV first") | — |
| Volume tiers — "declined as recommended (Q-06) · keep" | **Kept** (a quantity break is priced on the line or as its own item) | — |

**Found and fixed on the way (bugs):** (1) Upload a quote's "Quote created with N lines …" and Draft with Maison AI's "Quote drafted by Maison
AI" were said in the shell's snackbar host just as the shell unmounted for the editor — nobody ever saw them; both ride to the editor's host now
(`carrySnackbar`). (2) On a phone, the house list (Price book modal, Omit from the contract, Add from the quote, Order from the quote) squeezed a
name beside its chip ("On PO-2026-008") into an 80px column and cut the grey line with "…" — the chip wraps under the name, the grey line shows
whole. (3) A PO line ordering more than the quote counted the extra as the client's in "The client pays …" and the costs' *against the quote* —
both read the quoted quantity now. (4) 1.0's matcher would have filled a Lot line with a cost a square foot (a 44,900 % "gap" on the demo's
Dyel quote) — another unit never matches in 2.0.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Waste % on the item, or on the order?** On the item (where a studio knows each tile's wastage once), **applied on the order** — the PO from
  the quote orders it; the quote, its quantities and its total never change (1.0's multiplied client amount printed a quantity × rate that didn't
  add up). Open for Vicky if she wants the quote's estimated cost (margin) to carry the waste too.
- **Matching runs by rule, never a model**; an upload fills only *sure* matches by itself (1.0's high tier); everything else waits for the
  member's tick in one review. A close match far off in price starts unticked (1.0 ticked every match it found).
- **New-item suggestions** live in the same review (1.0's separate modal after a parse), unticked by default, one per name and vendor; a
  Designer's are proposals (REG-652); the bell hears once per batch.
- **Where it lives:** beside *Price book* under the Items table (where the book is already reached), and Maison AI — no new page, no toolbar
  button.

## What to check in the browser (Dane · Owner unless said)
- A lead's Quotes › Create Quote › Upload a quote → a CSV with `Item,Category,Qty,Unit,Rate` and a line named like a My Items entry ("Vinyl
  flooring, supply and install, Flooring, 500, sqft, 7.00") → the reading's sentence → Create the quote → the editor's snackbar says "… 1 took
  its cost from My Items"; the vinyl line's Cost reads S$5.50, its price still S$7.00.
- Same quote, Items → *Match N lines* beside Price book → the review (Close match chips, "priced 18% below it" unticked, the margin, Not in My
  Items yet) → tick one of each → Match 1 · add 1 → the snackbar's Undo. ⌘Z after an Apply.
- **Germaine (View as)**: the same quote → Maison AI → "… match items in My Items — take their cost" → Propose 1 for My Items → Dane's bell.
- Company › Price book → Vinyl flooring → Waste (%) 5 → 8 → Save → History "Waste 5% → 8%"; Painting (Labour) has none; 60 → "Up to 50%".
  Column settings › Waste. ⋮ › Export My Items… → the *Waste %* column. New ▾ › Import from a spreadsheet… → Vendor "haf" → Hafary.
- Select an item → Set vendor → "floor x" → Floor Xpert Pte Ltd.
- Benjamin Han's project › Money › New ▾ › Order from the quote → Floor Xpert's vinyl "1,037 sqft · 987 on the quote +5% waste"; New ▾ ›
  Purchase order › Add from the quote → the vinyl at 1,037; "The client pays S$6,909.00" (987 × S$7.00).
- 390 / 320: the review as a bottom sheet, the item dialog's Waste, the Order from the quote list (the chip under the name, the grey line whole).

## Probes run (production build, :3160, scratch copies of the repaired base)
- `verify-pm2-s12.cjs` **72 / 72** (twice; DB dump identical). The review also checked at 1024 and 768 (mouse and touch): inside the screen,
  no sideways scroll, no page errors.
- Regression harness (`design-source/verify/regression/run.cjs`, :3160, each on a fresh copy of the repaired base): `pb-r1` 18/18 · `pb-r2` 41/41 ·
  `pb-r3` 30/30 · `pb-r4` 32/32 (twice — before and after the vendor field's change) · `pb-modal` 18/18 · `folders-galleries` 44/44 ·
  `folders-pickers` 15/15 · `qe-r1` 34/34 · `qe-r5` 21/21 · `search` 27/27 · `sw-r5` 33/33 · `dane-p2a` 54/54 · `xr-r1…r4` 27 · 31 · 28 · 16 (the X-Ray's
  words moved) · `cr-r3` 40/40 (Upload a quote's credits) · `ux-p6` 57/57 · `ghosts-same` 51/51 · `ghosts-same-390` 51/51.
- Directly (:3160, fresh copies): `verify-pm2-s04` 82/82 · `s06` 83/83 · `s10` 107/107 · `projects/verify-pj-gap-f1` 85/85 (it leaves five
  delivery-outbox rows of its own notifications, as before — none of this step's).
- `npm run design:anatomy` — 73 pages, 245 table heads, 24 dialogs, 40 page menus: all 1578 measures hold. `tsc` clean, `eslint app components lib`
  0 errors (the 16 warnings are older files'), `design:lint` nothing new.
- **Deliberate changes to older probes** (commented "(pending modules S12, a deliberate change of this rule)"): `quote-editor-parity/verify-qe-r5.cjs`
  (the export's head gains *Waste %*), `uat-dane-2026-10-01/P2a/verify-p2a.cjs` (the export's column count, 11 → 12 and 12 → 13).
- **Caught by the probes and fixed in this step:** the S10 probe — my first cut put the book's suggestion in place of the editor's "Check the
  margins" fallback (it now sits beside the hints); the sw-r5 probe — Set vendor's list opened on the dialog's own caret and covered "Clear the
  vendor instead" (it opens on typing or a press); the 768 shot — a sure match that would sell below cost started ticked, and an upload would
  have filled it (never now).

## Migration, repair
- Migration **0096** `price_book_s12` (additive: `price_book_items.waste_pct real not null default 0`); no new table.
- Repair **R114** (the tiles 10 %, the vinyl 5 %, only while nobody changed an item's waste by hand; two checks). **R115 is the next free.**

## For the next steps
- **S20 / S29 / S34:** the matcher is `lib/company/price-book-match.ts` — pure, rule-based, the seam for a model's reading later (`matchLines`
  takes any lines; `bookFill` is the one write rule). **S21 (X-Ray):** its words now live in `lib/quotes/line-words.ts` (unchanged), shared with
  the matcher — change them there for both. **S14 (Settings / Company):** nothing new in Settings. **S22 (Dashboard):** "lines not from My Items" is
  a fact a card could read (`planBookMatches`). Any flow that navigates from the shell into an editor and wants a snackbar must use
  `carrySnackbar(path, message)` — the shell's host unmounts.

## Principles check (DESIGN-1. **The mock wins, every exception written down** — no mock for any of it; each joins a surface she approved (the Add Item row's links beside
   *Price book*, the item dialog, the house list dialog the Order from the quote already uses, the Maison AI sheet, the Upload a quote reading);
   every new word is flagged invented copy in `reg-S12.md`; the phone list's wrap is logged as a bug fix (it changes the Price book modal and the
   three other lists on a phone).
2. **One system, no one-offs** — the house `Dialog` (a sheet on a phone) on the Order from the quote / Omit list's stylesheet (composed), the DS
   `Checkbox`, `MetaChip`, `TextField numeric="decimal"`, the house `VendorNameField` (two props added, not copied), `carrySnackbar`, the snackbar's
   `key` + Undo, Column settings through the listing model (a `hidden` column); one matcher shared by the server and the browser, and one word
   reading shared with the X-Ray (moved, not copied); one add-to-book path for Save to My Items and the review.
3. **Plain words for studio people** — "Match 2 lines", "Close match", "priced 18% below it", "21.1% margin", "1 line took its cost from My Items",
   "Not in My Items yet", "1,037 sqft · 987 on the quote +5% waste", "A PO from the quote orders 105 sqft for every 100 quoted".
4. **Nothing is lost** — Apply is one step: ⌘Z and the snackbar's Undo put the lines back, the Undo takes the new entries out again (one another
   line took stays, and is said); the waste is in History (Bring back works on it), in the export and back through the import; the quote's
   quantities and price never move; every 1.0 job on the card is mapped above (the kept three by her own calls).
5. **Say why** — a close match far off in price says how far and waits unticked; below cost reads red; "Up to 50%" under the field; "Those lines
   have changed since — open Match lines again"; the upload's reading says what a match will do before the press; a Designer's review says hers
   are proposed; a line already on a PO reads as it was quoted.
6. **Back returns where you came from** — nothing new navigates; the review closes back onto the editor; *Manage Price book* keeps its `?from=`.
7. **Every screen is whole** — the review's empty state ("Every priced line is from My Items"), its busy word ("Matching…"), its refusals in the
   snackbar; no new page, so no new ghost — `ghosts-same` (1440 and 390) 51/51 each.
8. **Every width is designed** — 1440 · 390 · 320 checked by the probe (sideways scroll 0 against `screen.width`); the review is a bottom sheet
   with the margin under the words; the phone list's chip and grey line wrap instead of squeezing.
9. **Tables follow the leads listing** — the Waste column is the listing model's own (Column settings, off by default); no table added.
10. **Motion with purpose** — none added (the house dialog's and snackbar's own).
11. **Honest data** — R114 backs the waste the demo shows (tiles 10 %, vinyl 5 %, with its checks); an upload fills only sure matches, the rest wait
   for a tick; nothing claims a model or charges credits; the client's share counts the quoted quantity.
12. **Reach for everyone** — the link has its full name ("Match 2 lines to the Price book"), every tick its label ("Match {line} to {item}"), the
   group heads tick every row; the house dialog's Escape, focus trap and ⌘↵; the field keeps the caret on opening without throwing its list over
   the dialog.
- **How to add a missing thing** — one home each (matching beside the Price book where the editor already reaches the book, with Maison AI as a
  door; waste on the item, applied where orders are made; the vendor fields on the one directory); shown only when it applies (the link only while
  a line matches, Waste only on a Purchase item or one carrying it, the waste words only on a line that has it); one filled button per dialog
  (Match …); defaults that need no set-up (a book without waste orders as before; a quote that never opens the review is untouched; an upload
  fills only what is sure)..md)
1. **The mock wins, every exception written down** — no mock for any of it; each joins a surface she approved (the Add Item row's links beside
   *Price book*, the item dialog, the house list dialog the Order from the quote already uses, the Maison AI sheet, the Upload a quote reading);
   every new word is flagged invented copy in `reg-S12.md`; the phone list's wrap is logged as a bug fix (it changes the Price book modal and the
   three other lists on a phone).
2. **One system, no one-offs** — the house `Dialog` (a sheet on a phone) on the Order from the quote / Omit list's stylesheet (composed), the DS
   `Checkbox`, `MetaChip`, `TextField numeric="decimal"`, the house `VendorNameField` (two props added, not copied), `carrySnackbar`, the snackbar's
   `key` + Undo, Column settings through the listing model (a `hidden` column); one matcher shared by the server and the browser, and one word
   reading shared with the X-Ray (moved, not copied); one add-to-book path for Save to My Items and the review.
3. **Plain words for studio people** — "Match 2 lines", "Close match", "priced 18% below it", "21.1% margin", "1 line took its cost from My Items",
   "Not in My Items yet", "1,037 sqft · 987 on the quote +5% waste", "A PO from the quote orders 105 sqft for every 100 quoted".
4. **Nothing is lost** — Apply is one step: ⌘Z and the snackbar's Undo put the lines back, the Undo takes the new entries out again (one another
   line took stays, and is said); the waste is in History (Bring back works on it), in the export and back through the import; the quote's
   quantities and price never move; every 1.0 job on the card is mapped above (the kept three by her own calls).
5. **Say why** — a close match far off in price says how far and waits unticked; below cost reads red; "Up to 50%" under the field; "Those lines
   have changed since — open Match lines again"; the upload's reading says what a match will do before the press; a Designer's review says hers
   are proposed; a line already on a PO reads as it was quoted.
6. **Back returns where you came from** — nothing new navigates; the review closes back onto the editor; *Manage Price book* keeps its `?from=`.
7. **Every screen is whole** — the review's empty state ("Every priced line is from My Items"), its busy word ("Matching…"), its refusals in the
   snackbar; no new page, so no new ghost — `ghosts-same` (1440 and 390) 51/51 each.
8. **Every width is designed** — 1440 · 390 · 320 checked by the probe (sideways scroll 0 against `screen.width`); the review is a bottom sheet
   with the margin under the words; the phone list's chip and grey line wrap instead of squeezing.
9. **Tables follow the leads listing** — the Waste column is the listing model's own (Column settings, off by default); no table added.
10. **Motion with purpose** — none added (the house dialog's and snackbar's own).
11. **Honest data** — R114 backs the waste the demo shows (tiles 10 %, vinyl 5 %, with its checks); an upload fills only sure matches, the rest wait
   for a tick; nothing claims a model or charges credits; the client's share counts the quoted quantity.
12. **Reach for everyone** — the link has its full name ("Match 2 lines to the Price book"), every tick its label ("Match {line} to {item}"), the
   group heads tick every row; the house dialog's Escape, focus trap and ⌘↵; the field keeps the caret on opening without throwing its list over
   the dialog.
- **How to add a missing thing** — one home each (matching beside the Price book where the editor already reaches the book, with Maison AI as a
  door; waste on the item, applied where orders are made; the vendor fields on the one directory); shown only when it applies (the link only while
  a line matches, Waste only on a Purchase item or one carrying it, the waste words only on a line that has it); one filled button per dialog
  (Match …); defaults that need no set-up (a book without waste orders as before; a quote that never opens the review is untouched; an upload
  fills only what is sure).
