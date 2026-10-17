# S04 · Quotes leftovers — outcome (2026-10-11)

Card: `held:quotes` (Quotes and the quote editor) + the steps' notes after S01, S02 and S03. 1.0 read: `src/components/leads/quote-chat-panel.tsx`
(Draft with AI, the drafter's chat), `src/lib/quote-agent/{tools,executors,fallback,system-prompt}.ts` (the tools — `set_global_margin`,
`summarize_quote` — and the always-returns-a-quote fallback: up to 3 price-book items per category, else 27 baseline lines at S$0, "never hand
back a guessed number"), `src/app/api/quotes/insights/route.ts` (underquote · upsell · missing · client_mismatch · margin_warning "<10%"),
`src/components/leads/quote-digitizer-dialog.tsx` (the upload's `.pdf,.png,.jpg,.jpeg,.csv,.xlsx`), `src/lib/access-control.ts` (quotes:
approve = owner only), the credit schedule (no charge for the drafter or the insights; Digitize quote 5).
Register rows: `steps/reg-S04.md` (REG-S04.1…13). Probe: `design-source/verify/pending-modules/verify-pm2-s04.cjs` (**82 / 82**); shots banked in
`design-source/verify/pending-modules/pm2-s04/` (9).

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| (S02 · S03's note) `/confirm` and `/sign/<token>/quote` send each line's full record to the client | **Fixed** — one projection for every client page that shows a quote (`clientQuoteOf` · `clientSafe`): the print's fields only; hidden lines keep no words; other entities' bank details blanked; an unsent draft's confirmation link carries none of its content. Proven in the probe by reading each page's HTML for a known cost, mark-up, vendor, link, rebate and id | `lib/quotes/client-quote.ts` (new), `lib/quotes/view-link-queries.ts`, `app/confirm/[token]/page.tsx`, `app/sign/[id]/quote/page.tsx`, `components/quotes/confirm/confirm-page.tsx`, `components/contracts/sign/sign-quote-view.tsx`, `lib/templates/queries.ts` (`QuotePreviewData.quote.confirmToken`, studio side only) |
| The client's link with a token, a 7-day expiry and an SMS code | **Token built** — `/confirm/<token>` (`quotes.confirm_token`); older quotes keep their id as their token (R106); every place that hands the link out carries it; the page acts through it. **Expiry kept** as recommended — the quote's Valid until is its window, marked and never blocked (REG-625); S03's window is the contract's. **SMS code: stand-in, kept** (the developers', Q-33) | `lib/quotes/confirm.ts` (`confirmPath(token)` · `confirmKeyOf` · `isConfirmKey`), `lib/quotes/client-quote.ts` (`quoteByConfirmKey`), `app/confirm/[token]/*` (route renamed from `[quoteId]`), `app/quotes/actions.ts` (`confirmQuoteOnline` · `askQuoteChange` take the token), `app/quotes/decline-actions.ts`, `app/leads/quotes-actions.ts` (`createQuote` · `duplicateQuote`), `lib/projects/draft-variation.ts`, `components/quotes/send/use-quote-send.tsx`, `components/quotes/editor/quote-editor.tsx`, `components/quotes/preview/quote-preview.tsx`, `lib/portal/{needs,home,notifications}.ts`, `lib/link-cards/queries.ts`, `app/projects/money-actions.ts` |
| 'Viewed' on the quote link | **Built** — the page's first ask from a browser stamps first · last · count (never a chat fetch, never "Not ready yet"); the lists' "Viewed {date}", the editor's "opened …", both Activity feeds | `app/quotes/seen-actions.ts` (new, `stampQuoteSeen`), `components/quotes/confirm/confirm-page.tsx`, `components/quotes/view/quote-view-page.tsx`, `lib/leads/quote-filters.ts` (`viewedSince`), `components/leads/quotes/quotes-table.tsx` (+ css), `components/quotes/editor/quote-bars.tsx` (`SentBanner opened`), `lib/leads/activity.ts`, `lib/quotes/activity.ts` |
| (S01 · S03's note) a sent quote's snapshot at send | **Built** — the preparer the paper prints is kept when the quote first goes to its client; Revise / Undo let go; a Prepared by change re-keeps; Drafts read live; the view-only link shows the quote as it stands | `lib/quotes/prepared.ts` (new, pure), `lib/quotes/prepared-server.ts` (new, `syncPreparedSnapshot`), `lib/templates/data.ts` (`docDataFromRecords`), called from `app/quotes/actions.ts` (send for confirmation · confirm online · Revise · its Undo · mark Undo · Prepared by), `app/leads/quotes-actions.ts` (`setQuoteStatus`), `app/leads/actions.ts` (the Quote Sent step), `lib/quotes/sign.ts`, `app/projects/money-actions.ts`; kept out of `lib/leads/quotes.ts` · `lib/quotes/list.ts` |
| Draft with Maison AI (a brief becomes a quote) | **Built, rule-built** (the card's question: a first cut now) — My Sections, My Items by trade, 1.0's baseline at S$0 to price; nothing metered; the brief kept; Activity | `lib/quotes/draft.ts` (new, pure: `readBrief` · `draftPlan`), `app/quotes/draft-actions.ts` (new: `draftQuote` · `createQuoteFromDraft`), `components/quotes/create-quote-modal.tsx`, `components/leads/quotes/lead-quotes.tsx`, `components/quotes/list/quotes-workspace.tsx` |
| Upload a quote reads spreadsheets; its chip says PDF · XLS · JPG on a 5-credit press | **Words fixed** — "XLSX · CSV · 5 AI credits"; the document reader stays the developers' (only the demo's three reference quotes read as PDFs) | `components/quotes/create-quote-modal.tsx` |
| AI help in the editor (insights, margin warnings, set a global margin) | **Built by rule** — below cost · under 10 % · no price yet, each row to its line; one markup through Set a value. **Not built**: under-market / upsell (need market data or a model), wrong-client (impossible in 2.0) | `lib/quotes/hints.ts` (new), `components/quotes/editor/use-quote-maison.tsx` (new), `components/quotes/editor/quote-editor.tsx`, `components/quotes/editor/items/items-section.tsx` (`command`, opening folded sections), `components/quotes/editor/items/set-value-dialog.tsx` (`initialField`) |
| Starter Quote (quote rules by project type) | **Kept** (her call, templates Q-07) — My Sections with property-type tags cover it, and Draft with Maison AI reads them by the lead's property type | — |
| Prices that include GST | **Kept** (her hold — "ask the studios first") | — |
| A stored PDF with its render hash; quote emails really sent | **Stand-ins, kept** — the developers' (Preview prints; the link travels on WhatsApp) | — |
| Sort the Items table by a column head | **Kept** (her call, REG-483) | — |
| SKU and Add New Column; eight column switches refused | **Removed** — Column settings lists only what the table draws; no Add New Column | `components/quotes/editor/items/column-settings-drawer.tsx` |
| Items › row thumbnail › Upload Logo; the Create strip's Brand Catalog; a photo upload stamps a canned thumbnail | **Removed · removed · fixed** — Upload Logo and Brand Catalog dropped (1.0 had neither); Upload Image keeps the picked picture (the lead's Files, its bytes) | `components/quotes/editor/items/{table-menus,item-row,items-section}.tsx`, `components/quotes/editor/create-strip.tsx`, `components/quotes/editor/editor-skeleton.tsx` (three bones) |
| Quote Files › Download of a non-image | **Built** — any kind, the Files tab's way | `components/quotes/editor/files/files-section.tsx` |
| Sort on the Quotes table heads | **Built** — eight heads, A→Z · Z→A · off, one sort with Filters' (S03's model); Client joins Title and Creator as a name | `lib/leads/quote-filters.ts` (`sortQuotesByHead` · `nextQuoteHeadSort` · `headOrderWords`), `components/leads/quotes/{quotes-table,lead-quotes,quotes-filters-modal}.tsx` (+ css), `components/quotes/list/quotes-workspace.tsx` |
| Round-2 testers' asks | **Kept** (the design lead's Later list) | — |
| A line's status (Pending · Approved · Declined) — decide or drop | **Dropped** — no screen, no writer, 1.0 had none; the client's per-line answer is the optional pick; R106 turns the demo's Declined line into an optional work the client said no to | `app/quotes/items-actions.ts` (`cleanPatch` takes no status), `components/quotes/editor/items/item-cards.tsx`, `scripts/repair-demo-data.ts` (R23's statement + check, R106) |
| Accounting approves quotes (REG-1660) — needs her answer | **Decided: no** — 1.0 let only the owner approve a quote; 2.0 keeps Owners, Admins and the backup approver. Flagged for her below | — |
| Word labels on the Items toolbar (D5), muted section prompts (D7) | **Kept** (her "not now") | — |
| Quote lines from a meeting brief | **Kept** — comes with Meetings (S23, REG-552) | — |
| (found) Duplicate failed on a quote with a view-only link; it carried the signed total, the change ask and the decline | **Fixed** | `app/leads/quotes-actions.ts` (`duplicateQuote`) |
| (found) the repair's quote sums ignored optional and word lines and named discounts | **Fixed** (no demo amount moved) | `scripts/repair-demo-data.ts` (R23) |

## Files
New: `lib/quotes/{client-quote,prepared,prepared-server,draft,hints}.ts`, `app/quotes/{seen-actions,draft-actions}.ts`,
`components/quotes/editor/use-quote-maison.tsx`, `drizzle/0088_quotes_s04.sql` (+ meta), the probe and `pm2-s04/` (shots). Moved (staged with `git mv`, nothing committed):
`app/confirm/[quoteId]/*` → `app/confirm/[token]/*`. Changed: `lib/db/schema.ts`, `lib/quotes/{confirm,view-link-queries,sign}.ts`,
`lib/templates/{data,queries}.ts`, `lib/leads/{quote-filters,activity,quotes}.ts`, `lib/quotes/{activity,list}.ts`, `lib/link-cards/queries.ts`,
`lib/portal/{needs,home,notifications}.ts`, `lib/projects/draft-variation.ts`, `app/quotes/{actions,decline-actions,items-actions}.ts`,
`app/leads/{quotes-actions,actions}.ts`, `app/projects/money-actions.ts`, `app/confirm/layout.tsx`, `app/sign/[id]/quote/page.tsx`,
`components/quotes/{create-quote-modal,confirm/confirm-page,view/quote-view-page,preview/quote-preview,send/use-quote-send,list/quotes-workspace}.tsx`,
`components/quotes/editor/{quote-editor,quote-bars,create-strip,editor-skeleton}.tsx`, `components/quotes/editor/items/{items-section,item-row,item-cards,table-menus,column-settings-drawer,set-value-dialog}.tsx`,
`components/quotes/editor/files/files-section.tsx`, `components/contracts/sign/sign-quote-view.tsx`,
`components/leads/quotes/{quotes-table,lead-quotes,quotes-filters-modal}.tsx` (+ the two css), `scripts/repair-demo-data.ts` (R23, R106).
For CLAUDE.md's Map (the orchestrator's): the confirmation link is `/confirm/<token>` (`quotes.confirm_token`, `app/confirm/[token]`,
`quoteByConfirmKey`); every client quote page reads `clientQuoteOf` (`lib/quotes/client-quote.ts`); Viewed = `stampQuoteSeen` +
`client_viewed_at · client_last_viewed_at · client_view_count`; the kept preparer = `quotes.prepared_json` (`syncPreparedSnapshot`); Draft with
Maison AI = `lib/quotes/draft.ts` + `app/quotes/draft-actions.ts`; the editor's Maison AI = `lib/quotes/hints.ts` + `use-quote-maison.tsx`; the
Quotes heads = `sortQuotesByHead`; a quote line's `status` is retired (always Pending).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Draft with Maison AI is a rule-built first cut now** (the card's first question), never a guessed price, never metered (1.0 charged nothing).
- **The confirmation link gets a token; its window is the quote's Valid until** — the link stays open while the quote does (REG-625: an expired
  quote is marked, never blocked); the SMS code stays the developers'.
- **"At send"** for the preparer (the smallest, 2.0-like answer: signed contracts keep theirs at signing). "Send" = the quote first with its
  client — sent, confirmed or signed by any path.
- **Viewed counts both client links** (the confirmation link and the view-only one) on one record; the cue sits on the record and the lists —
  no bell row (it would ring for every refresh of the page).
- **A line's status is dropped**; **Accounting does not approve quotes** (1.0: owner only).
- **The column switches the table can't draw are hidden, Upload Logo and Brand Catalog removed** (the card's "revisit" lines).

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Serena Koh › Quotes › OM-10007 › ⋮ › Copy confirmation link → `/confirm/f529ab6d-…` (an older quote keeps its id as its
  token). Open it in a private window, then back in the editor: the banner reads "Sent to the client on 14 Aug ’26, opened just now — …"; Tools ›
  Quotes: "Viewed 11 Oct ’26" under the Sent to client day; Serena's Activity: "Serena Koh opened the quote OM-10007." View the page source of the
  confirmation link — no `costMinor` apart, no vendor, no `picker`.
- **Create Quote › Draft with Maison AI** on Serena Koh: type "Hack and re-tile both bathrooms, new kitchen cabinets, paint the whole flat" — the
  lines appear (Bathrooms — full works from My Sections, Painting and Carpentry from My Items, Preliminaries To price) → Create the quote → the
  editor with those sections; Activity: "You drafted the quote … with Maison AI, from the brief “…”". Try "Please give me a good deal" — it says to
  name the rooms or the works. The Upload row's chip: XLSX · CSV · 5 AI credits.
- **The editor's Maison AI** (OM-10001, a Draft): set a line's Unit Price under its Cost and another a hair over → Maison AI: "1 line sells below
  cost", "1 line under a 10% margin", "Set a markup on the 2 lines under 10%" → a row takes the grid to the line (its section opens); the markup
  opens Set a value on Markup (%). Column settings: no SKU / MSRP / Color / Dimensions / Materials / Shipping / Taxable, no Add New Column. A
  line's picture menu: Upload Image · Use Icon. The Create strip: Maison AI · Price book · Templates. Upload Image a PNG → the line shows it (and
  it is in Olivia's Files). Files section: drop a PDF → ⋮ › Download.
- **Duplicate and Edit** a quote after making its view-only link (⋮ › Share a view-only link) — the copy opens.
- **Tools › Quotes heads:** Total, Status and the dates sort (arrow, aria-sort); Filters says "Sorted by the Total column…"; picking an order
  in Filters lets the head go. Title, Client, Creator have no sort.
- **A sent quote keeps its preparer:** rename Germaine in Company › Members (as Dane) → OM-10007's Preview and its confirmation link still say
  Germaine; OM-10001 (a Draft) follows a rename of Dane at once.
- **390:** OM-10008's cove lighting card reads "Optional · Client said no" (no Approved / Declined tags); Draft with Maison AI is a bottom sheet;
  Tools › Quotes cards show "· Viewed …" in the line under the title.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0088 + repair R106) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files') · `npm run design:lint` nothing new ·
`npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s04.cjs`** (this step) | **82 / 82** — the page error log empty; the scratch DB left as found (a full `.dump` before and after: no difference) |
| `pending-modules/verify-pm2-s02.cjs` · `verify-pm2-s03.cjs` (the client links, the view-only link, the signing page's quote) | 105 / 105 · 79 / 79 |
| `quote-editor-parity/verify-qe-r1…r5.cjs` | 34 / 34 · 33 / 33 (first 31 / 33 — the copy's link, a deliberate change below) · 21 / 21 · 14 / 14 · 21 / 21 |
| `contracts-parity/verify-ct-r1.cjs` · `verify-ct-r3.cjs` | 36 / 36 · 28 / 28 |
| `ux-build-2026-09-30/P4/verify-p4.cjs` (Valid until's sort, the confirmation page's cards, the Create strip, Send) | 56 / 56 |
| `ai-credits/verify-cr-r3.cjs` (the Upload chip's price) | 40 / 40 (after the deliberate change below) |
| `uat-dane-2026-10-01/P3` (Upload a quote, signatures) · `P6` (Copy confirmation link, the signing pages) | 71 / 71 · 41 / 41 |
| `ui-sweep/verify-sw-r1.cjs` · `x-ray-parity/verify-xr-r1.cjs` (the passed-on line out of the sums) | 34 / 34 · 27 / 27 |
| `price-book-modal/verify-pb-modal.cjs` · `folders/verify-folders-pickers.cjs` (the Create strip's Price book) | 18 / 18 · 15 / 15 |
| `projects/verify-pj-r5.cjs` (a variation order's approval link) · `verify-pj-gap-d.cjs` · `verify-pj-r4a.cjs` (the portal's links) | 91 / 91 (after the deliberate change below) · 65 / 65 · 73 / 73 |
| `consistency/verify-overlays.cjs` · `ghosts/verify-ghosts-same.cjs` · `keyboard/verify-kb-r1.cjs` | 67 / 67 · 51 / 51 · 35 / 35 |
| `npm run design:anatomy` (on a scratch `next start`) | all 1554 measures hold |

**Assertions changed as deliberate changes of their rule** (each commented `(pending modules S04, a deliberate change of this rule)`):
`ai-credits/verify-cr-r3.cjs` reads the honest chip ("xlsx · csv · 5 ai credits"); `quote-editor-parity/verify-qe-r2.cjs` opens the copy's
confirmation link by its token; `projects/verify-pj-r5.cjs` opens the new variation order's link by its token; the repair's own check for the
demo's Declined line now checks the optional work the client said no to.

## Migration and repair
- **Migration 0088 `quotes_s04`** (additive): `quotes.confirm_token` (unique index) · `client_viewed_at` · `client_last_viewed_at` ·
  `client_view_count` (default 0) · `prepared_json` · `draft_brief`. No new table — the baseline lists are unchanged.
- **Repair R106** — every quote a confirmation key (its id for one made before the step); a passed-on line becomes an optional work the client
  said no to and every line reads Pending; a quote with its client keeps its preparer as the records stand (one not with its client keeps none).
  Five checks in the closing list (the key; a line with a status; a kept preparer missing or early; opens without a first open or a count; a
  drafted variation order). R23's Declined statement and its check now speak S04's rule, and its sums add up as the app does. On the demo: "11
  confirmation keys · 1 passed-on line made optional · 132 line statuses back to Pending · 8 preparers kept"; again: "already in step"; full
  repair: all checks pass.

## For the next steps
- **S10 (mAIson):** the quote editor's sheet is filled (one of the "eight empty editor sheets") — its hints by rule (`useQuoteMaison`, the shell's
  `MaisonAnswerPanel`); its Ask box (the shell's) is S10's to add. Draft with Maison AI is the rule-built first cut; a model behind it is S10 /
  S29 / the developers' — `draftPlan` is the seam (same inputs, a plan out).
- **S11 (quote templates):** the Items block's working columns already list only what the table draws; the dropped catalogue keys stay in
  `COLUMN_KEYS` for stored settings.
- **S12 (price book):** Draft with Maison AI reads My Items by category = trade (`tradeOf` aliases in `lib/quotes/draft.ts`) and My Sections
  by property type / name / tags — richer tags make better drafts.
- **S29 (AI writing help):** nothing here writes text with a model.
- **Developers:** the token is the permission on `/confirm/<token>` (an SMS code before it is yours, Q-33); the port puts 1.0's quote-link token
  in `quotes.confirm_token` and 1.0's `preview_view_count` in `client_view_count`; a real document reader replaces `readDocument` behind
  Upload a quote; the kept preparer (`prepared_json`) may hold a signature picture (up to 1 MB) — the lists drop it, a real store may keep it by
  reference. **For Vicky:** Accounting approving quotes was answered "no" by 1.0's own rule (owner only) — say if Accounting should.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the new pieces; built on the screens that exist (Create Quote's own window and
   its upload preview's table, the Maison AI sheet and its answer panel, the list's Sent cell, the sent banner, Set a value); the mock's Upload
   Logo, Brand Catalog and catalogue switches are overridden and logged (REG-S04.8); every invented line is in REG-S04.1…13.
2. **One system, no one-offs** — house pieces only (the modal's SurfaceHead / SurfaceFoot, DS TextArea, MetaChip, the shell's
   `MaisonAnswerPanel`, AiSheet, SetValueDialog, the Files tab's upload and download, the Contracts heads' sort model and Filters line); one
   projection for every client quote page; tokens only — `design:lint` holds.
3. **Plain words** — "What’s the job?", "To price", "1 line sells below cost", "Set one markup on every line", "Viewed 11 Oct ’26", "opened 1
   hour ago (3 times)", "Client said no".
4. **Nothing is lost** — links already sent keep opening (old ids kept as tokens); a sent quote's preparer is kept; the passed-on line stays on
   the quote as an optional work with its "no"; hidden column settings keep their stored state; a refused upload says so and the modal keeps
   its Retry; the draft never overwrites a quote (it makes a new one).
5. **Say why** — a brief with no works says what to write; Create rests until lines are drafted; a quote file with no copy says only its name
   was kept; the sent banner says the client opened it; a dead link says it is no longer active.
6. **Back returns where you came from** — the draft opens the editor with `?from=` the list it came from, as Create Quote's other ways do; Maison
   AI's rows stay on the page.
7. **Every screen is whole** — no new page; the confirmation route kept its loader and its notice; the editor's ghost draws the three-tile strip;
   the draft has its reading line, its empty answer and its error line.
8. **Every width is designed** — 1440 · 390 · 320 checked by the probe (no sideways scroll against `screen.width`); Draft with Maison AI is the
   window's bottom sheet on a phone, its table folds to Item · Price; the phone cards carry "Viewed" in the title's line.
9. **Tables follow the leads listing** — the Quotes heads sort the Contracts / Projects way (`aria-sort`, arrow, one sort with Filters'); names
   stay unsorted (REG-468); the Viewed line sits in the Sent cell as Contracts' does.
10. **Motion with purpose** — none added; the house sheet, dialog and snackbar timings; the grid's own pulse on the line Maison AI points at.
11. **Honest data** — every state from its record (`confirm_token`, the three view columns, `prepared_json`, `draft_brief`, `client_choice`);
    R106 backfills and checks them; a chat's fetch never fakes a view; nothing drafted is priced by a guess; the document reader and the SMS
    code stay honest stand-ins; no AI credits charged where 1.0 charged none.
12. **Reach for everyone** — the sort heads say their order in their label and `aria-sort`; the draft's brief has its label, its lines are a
    table with column heads, the "To price" mark is words; Maison AI's rows are buttons in the sheet's own order.
- **How to add a missing thing** — one home (Create Quote's own "More ways to start", the editor's own Maison AI, the list's own Sent cell, the
  quote's own link); shown only when it applies (a hint only when a line needs it, the markup only over lines with a cost, "Viewed" only since
  the send, "opened" only while it is with the client); one filled button (Create the quote; the dialog's Apply); no set-up (old links keep
  opening, the drafter reads the book as it is, nothing to switch on).
