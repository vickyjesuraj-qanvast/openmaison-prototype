# S44P · The Price book and Trades — outcome (2026-10-15, lane A)

Vicky's ask (2026-10-15): "go through the sheet for the UAT comments from row number 246 and below to identify and fix all the UAT comments
based on our 2.0 experience without any overlaps nor any issues without losing what we have already built … If you have any questions please go
ahead based on your recommendations." Source: the triage `design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md` (§5 area P,
§7 M8 · M14, §9, §12 item 12). Every call taken **as recommended — his ask 2026-10-15**. Register rows: `steps/reg-S44P.md` (REG-S44P.1…7).
Probe: `design-source/verify/pending-modules/verify-pm2-s44p.cjs`. Shots: `design-source/verify/pending-modules/pm2-s44p/`.
**No migration. No repair** (R127…R139 left unused — nothing in the demo needed a record: its trades are unset, with no case variants or
near-duplicates; the probe makes its own and puts them back).

## Ledger — every row of area P, and the findings this package owns

| Row / item | What | Status |
| --- | --- | --- |
| **346 · 347** (M8) | Can't sell at S$0 / a cost on S$0-selling items | **Fixed** — `components/company/price-book/item-dialog.tsx`: Cost · Markup · Unit price, the grid's three in its order and its rules (unit price moves the markup, S$0 allowed; markup signed, settles at −cost on leaving the box; a cost keeps the markup), "Below cost by S$…" / "…% of the cost"; `price-book.module.css` `.trio`. The server already took a markup down to −cost (`row()`), unchanged. When the item changes under the open dialog (History › Bring back, Dane UAT 3.10) the unit price follows the cost and markup that followed (`follow`). REG-S44P.1 |
| **319** | Create a new category in the item drawer | **Fixed** — "New category…" at the foot of the Category list (`TextField` `action`, REG-S44P.3) → `new-category-dialog.tsx` → `addTrade` (`app/settings/trades-actions.ts`); a Designer sees the row with the rule under it. Sibling: bulk **Set category** (`bulk-edit-dialog.tsx`). REG-S44P.2 |
| **264** (M14) | "It says it exists — where?" | **Fixed** — `lib/settings/trades.ts` `listedAs` / `listedMatch`; Settings › Trades' Add a trade names the match ("Already in the list as “Carpentry Works”") and the entry lights up (`.trade[data-match]`, `settings.module.css`). Siblings on the same helper: Lead sources, Lost / On Hold reasons, the list-entry dialog (`app/settings/list-entry-dialog.tsx`). REG-S44P.4 |
| **340** (M14) | Electrical and Electrical Works | **Fixed** — rename onto a listed trade asks "Merge Electrical into Electrical Works?" with what moves (`tradeUsage`), Merge moves items · quote lines · My Sections' lines and the note (`mergeTrade`), Undo puts every record, the place and both notes back (`undoMergeTrade`); `settings-view.tsx` (the trade dialog's Save, `ConfirmDialog nested`). REG-S44P.5 |
| **341** (M14, §12.12) | The Category filter misses / doubles categories | **Fixed** — `price-book-items.tsx` builds the filter's list with `oneSpelling` (the trades' spelling first; a case variant once; the test was already case-blind). A trade no item carries stays out of the filter (§9's 339 answer). REG-S44P.6 |
| 255 | A price-book item's sub-category comes into the quote | **Already** (triage) — no change. |
| 279 | Shannon's items not in the price book (question) | **N/A** — answer below. |
| 316 | Empty sub-sections from a saved section | **Not mine** — S44I's (`app/quotes/items-actions.ts`), as the brief says. |
| 338 | Vendor tabs don't scroll in Browse price book | **N/A** (triage) — 2.0's Price book dialog has no vendor tabs. |
| 339 | "Hacking & Demolition Works" shows 0 items | **N/A** — answer below. |
| 342 | Bulk-move items to another category | **Already** (REG-655) — and Set category now ends on "New category…" too. |
| 345 | Sample packages | **N/A** — answer below. |
| S44Q's note to S44P | "`cleanHtml` there still drops HTML that has no list or mark" | **Fixed** — `app/company/price-book-actions.ts` `cleanHtml` is now `cleanRichHtml` (the one allowlist, capped before it is read, null when blank) without the marks-only filter: what the editor sends (its own `keptText`, S44I's M3) is kept with its shape. Items and saved sections' notes. |
| Found: a full trades list | A 61st trade was dropped without a word while the snackbar said "added" (`parseTrades` keeps 60) | **Fixed** — `TRADES_MAX` / `TRADES_FULL`: Add a trade, Enter and New category say so and wait; the server refuses the same. REG-S44P.7 |

## Sheet answers (for my rows)
- **264** — Fixed in 2.0: Settings › Quotes & pricing › Trades says which entry a name matches — "Already in the list as “Carpentry Works”" — and lights that trade up in the list.
- **279** — The price book holds only what was imported or saved. Save a quote's lines with *Save to My Items*, or use *Match N lines* to compare a quote's lines with the book. (§9)
- **319** — Built: the item dialog's Category list ends on "New category…". An Owner or an Admin names it there; it joins the studio's trades and lands on the item. Anyone else sees why they can't.
- **339** — In 2.0 an item counts under its own Category; re-check after the import. A trade with no items doesn't appear in the filter. (§9)
- **340** — Built: rename Electrical to Electrical Works in Settings › Trades and 2.0 asks to merge them — its price book items and quote lines move to Electrical Works, with Undo.
- **341** — Fixed: the Category filter lists each category once, whatever case it was typed in, and finds every spelling.
- **345** — 2.0 has no Packages and seeds nothing into a studio's book; 1.0's ops can delete them. (§9)
- **346 · 347** — Built: the item dialog takes a Unit price beside Cost and Markup — S$0 is a price, and the markup goes below zero ("Below cost by S$…"), as the quote's Items table does.

## Calls taken as recommended (his ask 2026-10-15)
- **M8**: all three boxes, the grid's order and rules — the Markup stays typed-in (the grid keeps it editable) and takes a minus; a cost keeps the markup (the grid's rule, not "keep the price"); the floor is −cost, applied when the box is left (the grid's commit), silently as the grid does. A price with no cost is a markup (the grid's), unlike the import's price-only convention (a lone price is the cost, 1.0's 1c9323f6b — already 2.0's, untouched).
- **319**: the trade is added when its dialog's Add is pressed (Settings' own Add does the same; the snackbar says so), not deferred to the item's Save — so it is offered at once and the item dialog keeps no hidden studio change. Offered in bulk Set category too (the sibling picker). The row is a house-piece prop (`TextField` `action`), not a hand-rolled menu.
- **264**: two wordings on one helper — typed exactly as listed keeps the house words; another case names the entry. Lit up with the menus' selected fill. The same helper on Lead sources and reasons (siblings).
- **340**: merge, not refuse — **this REVERSES sweep S4 #23's "a taken trade name is said on the field" for trades only** (sources and reasons still refuse). It gathers every spelling of the old trade (rename's rule, REG-647 / REG-651), moves lines on every quote as rename does (sent and signed ones too — a trade is a label), writes no price book History rows (rename writes none), and settles the notes: a note typed in the dialog goes to the merged trade, an emptied one brings nothing across, else the merged trade keeps its own or takes the old one's. The confirm is primary (it can be undone), not red.
- **341**: the trades' spelling wins; trades with no items are still not offered (the §9 answer).

## Kept (with the reason)
- The item dialog's **unit picker** is untouched — S44I wires the studio's Units (M9) into it.
- A phone's number pad has no minus key (the grid's Markup cell is the same): on a phone a markup below zero comes from the **Unit price** box — typing S$0 there is the job rows 346 · 347 asked for.
- A **member who doesn't see costs** keeps the one Unit price box (S41b-1); a price under the kept cost already worked there (the server keeps the cost, the markup takes the difference) — unchanged.
- **Expense categories** (Settings › Finance) and **ticket categories** (Settings › Projects) keep "{name} is already in the list" for a case variant — other packages' cards (below).

## For other packages
- **S44I (Items / Units):** the Units card "on Trades' pattern" can take the same three for free — `taken` in `settings-view.tsx` now returns `listedAs(...)` (names the match), the token's `data-match` + `.trade[data-match]` lights it, `TRADES_MAX`'s guard is the model for a capped list. If the unit picker wants "New unit…", `TextField` now takes `action` (REG-S44P.3). M3's storage half: the Price book's server no longer drops paragraph / alignment HTML (above) — once `keptText` keeps them, the item and section dialogs keep them end to end. M14's quote-label rule is yours; the trades' helpers are pure in `lib/settings/trades.ts` (`sameName`, `listedMatch`) if the quote's Add Category wants the same words. Optional, a design call: the quote grid's *Add Category* could join the studio's trades for an Owner or an Admin through `addTrade` (`app/settings/trades-actions.ts`), as the Price book's New category now does.
- **Finance (expense categories, `lib/finance/expense-categories.ts`) · Projects (ticket categories, `components/projects/tickets/ticket-categories-setting.tsx`, `app/projects/tickets-actions.ts`):** their "{name} is already in the list" could name the matched entry with `listedAs` — one wording across Settings.
- **Orchestrator:** no migration, no repair. Two probes changed on purpose (below). At merge, `settings-view.tsx` holds S44I's Units card beside Trades: my hunks are the imports after `ModuleHead`, the `taken` helper, `saveEntry`'s match line, the sources' / reasons' `<li>`s, the Trades state (`merging` …) and handlers (`saveTrade` · `doMerge` · `undoMerge` · `tradeBlock` · `addTrade`), the Trades card's `<li>`, add field and Name helper, and the `ConfirmDialog` after the trade dialog.

## Shared pieces changed (the other lanes should know)
- **`components/om/text-field.tsx`** — new optional `action` prop (select mode): a rule + one `+` row at the list's foot (walked by the arrows, skipped by type-to-find, `disabled` + `help` say why). Additive; every select without it renders as before.
- **New:** `lib/settings/trades.ts` (pure: `TRADES_RULE` · `TRADES_MAX` · `TRADES_FULL` · `sameName` · `listedMatch` · `listedAs` · `oneSpelling` · `movedWords` · `mergeTitle` · `mergeMessage` · `mergedLine` · `TradeUsage` · `TradeMergeUndo`), `app/settings/trades-actions.ts` (`addTrade` · `tradeUsage` · `mergeTrade` · `undoMergeTrade`), `components/company/price-book/new-category-dialog.tsx`.
- `app/settings/settings.module.css` (`.trade[data-match]`), `components/company/price-book/price-book.module.css` (`.trio`), `app/settings/list-entry-dialog.tsx` (its `taken` is now the matched entry), `app/company/price-book-actions.ts` (`cleanHtml` → `cleanRichHtml`). No shell, no `globals.css`, no tokens.
- **Probes updated (a deliberate change of a rule, each commented "S44P"):** `price-book-parity/verify-pb-r1.cjs` (the unit price is its own box — read its value, not the markup's helper line) · `ui-sweep/verify-sw-r4.cjs` (a taken trade name asks to merge; Cancel keeps the dialog).

## Verification
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (17 warnings, none in this package's files) · `npm run design:lint`
  holds the baseline (nothing new; one other file already under it — not lowered here, it is not mine) · production build under the lock, twice
  (the second after the last change) · `npm run design:anatomy` on :3160 (88 pages, 26 dialogs) — **all 1756 measures hold**.
- Scratch DB: `pbuild/base.db` copied → migrated → repaired (all checks pass); every probe on its own copy, DATABASE_URL on the command.
- **`verify-pm2-s44p.cjs` 65 / 65** on :3160, three full runs green (puts back price_book_items · changes · sections, quote_items, settings,
  notifications and the signed-in member; checks it). 1440 + 390 / 768 touch + 320; no page errors.
- Regression (`regression/run.cjs`, :3160, base = the repaired copy): pb-r1 18 · pb-r2 41 · pb-r3 30 · pb-r4 32 · pb-modal 18 · st-r1 58 ·
  st-r2 30 · st-r3 30 · sw-r4 35 · sw-r5 33 · dane-p2a 54 · qe-r2 33 — **all green**. (pb-r4 once read 31 / 32 — its *Set category* check reads
  the database the moment a "1 item changed" snackbar shows, and Set vendor's own "1 item changed" was still up; the row was written, and two
  reruns were 32 / 32. The race is the probe's, from before this package.)
- Pending modules (`pbuild/run-env.sh` pointed at this lane, :3160, base = the repaired copy): pm2-s12 72 · pm2-s41b1 110 · pm2-s44q 52 ·
  pm2-s44p 65 — **all green**.
- Shots: `design-source/verify/pending-modules/pm2-s44p/` (the item at S$0, the New category row / dialog / a Designer's row / bulk, the lit
  trade, the merge question and its result, the one Tiling, 390 / 768 prices and New category, 390 / 768 trades).

## What to check in the browser
- **Dane (Owner), 1440:** `/company/price-book` → New ▾ › New item → Cost 50, Unit price 0 → Markup −50.00, "Below cost by S$50.00" → Add; reopen it. Category ▾ → "New category…" → type "carpentry" (it says "Already in the list as “Carpentry”") → a new name → Add. List view → tick an item → Set category ▾ ends on the same row. `/settings?section=quotes` → Trades → type "masonry" in Add a trade (Masonry lights up) → press Electrical → Name "Electrical Works" when that trade exists (add it first) → the merge question → Merge → Undo.
- **Germaine (Designer, View as):** New ▾ › Propose an item → Category ▾ → "New category…" reads disabled with "Only an Owner or an Admin changes the studio’s trades".
- **390 touch:** the item dialog's three prices stack; New category rises as a sheet over the item's sheet; the trades' match lights at 390.

## Principles check
1. **The mock wins, every exception written down** — no mock draws these; each visible change is a REG-S44P row with its invented copy flagged; the reversal of sweep S4 #23 (trades only) is marked.
2. **One system, no one-offs** — the grid's money model and words ("Below cost"), the house `TextField` (one new prop rather than a hand-rolled menu), `Dialog` / `ConfirmDialog nested`, the menus' selected fill for the lit token, Settings' own add words; one pure helper for every "already in the list" on the page.
3. **Plain words** — "New category…", "Already in the list as “…”", "Merge Electrical into Electrical Works?", what moves counted in the studio's nouns (price book items, quote lines, lines in My Sections); refusals in the rule's words.
4. **Nothing is lost** — the merge has Undo down to each record's own spelling, the old trade's place and both notes; Cancel changes nothing; a new category made by mistake is one ✕ away in Settings (with Undo); the price book keeps the editor's shape.
5. **Say why** — the disabled row says the rule in the row; the merge says what moves before it moves; a full list says it is full instead of dropping the name; refusals answer `{ error }` and are said on the field.
6. **Back returns where you came from** — no navigation added; the nested dialogs return focus to the field that opened them.
7. **Every screen is whole** — no new page; the dialogs are house dialogs (head, foot, sheet on a phone); the page error log is empty in the probe.
8. **Every width is designed** — three prices on one row at 768 and up, stacked on a phone; New category a sheet over the item's sheet; no sideways scroll at 390 / 768 touch / 320 (against `screen.width`).
9. **Tables follow the leads listing** — no table added; the Price book list's filter only lost its duplicates.
10. **Motion with purpose** — the lit token eases in on the house toggle time (`--motion-toggle`); no other motion.
11. **Honest data** — every count in the merge question is read from the records; the snackbar says what really moved; no demo record invented (no repair).
12. **Reach for everyone** — "New category…" is an option the arrows and End reach; a disabled one is `aria-disabled` with its reason as text; the merge question is a real dialog with its own title; the lit token is also said in words on the field.
