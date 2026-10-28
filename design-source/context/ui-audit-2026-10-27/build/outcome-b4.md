# Lane B4 — the calm UI build (2026-10-27): Quotes, Contracts, the client's pages, Company › Templates, the Price book

The lane ran in three parts, one worktree: **the quotes part** (Tools › Quotes, the lead's Quotes tab, Create quote, the quote editor end to
end, the Preview, the phone's Quote screen, `/confirm`, `/quote/<token>`) by the lane itself; **Contracts and the signing pages** by fork A;
**Company › Templates, the quote template editor and its renderer, the Price book** by fork B. Each fork's full report is appended (sections
A and B); this page holds the lane's totals and the quotes part. Two display maps carry §2's status sets: `lib/quotes/status-words.ts`
(`quoteStatusLabel`, `QUOTE_STATUS_LABEL`, `QUOTE_TODO_LABEL`) and `lib/contracts/status-words.ts` (`contractStatusLabel`) — the stored
values (`QUOTE_STATUSES` / `CONTRACT_STATUSES` in `lib/leads/*-filters.ts`, B2's), filters, URLs and actions are untouched. One shared
client-page piece: `components/quotes/confirm/private-link-badge.tsx` (`PrivateLinkBadge`).

## 1 · Built (the quotes part — fork A's and fork B's findings are in their sections)

**Lane total, the work list's 50 findings:** 42 built. 7 partly built: 4-02 (the phone's reading cards stay by the print), 4-09 (the view page's phone bar keeps "Download"), 4-17 · 4-33 · 4-35 · 4-37 (fork B), and 4-25 (the quote's Markup cell keeps its figure). 1 not done: 5-44, the units, which are stored values. 4-05 is not in the list; it is fork A's read, sent to B1 as a request. The parts' own lines follow, and the forks' are in sections A and B.

- **2-23** (quotes part) — done: "No quote yet" · "Make one from a template or upload your own." · From scratch · From a template. Contracts' part fork A; Files / Tasks / Questionnaire / Meetings are B2's files.
- **2-51** — done: Templates · n, Blank quote "Start with an empty list", "Spreadsheet or PDF · 5 credits" (sentence case, not a capital tag), "Describe the work; Maison AI drafts it from your Price book."
- **4-01** (quote part) — done: COLUMN_LABEL / ITEM_VIEW_LABEL "Trade", the cell "Add trade", the bucket "No trade", "By trade" under the table (no count, no explanation; the margin view keeps "· before the quote’s discounts"), the phone line sheet's "Trade", the name dialog "Add trade", tooltips "View by: Trade". Price book part fork B. The stored key stays `category`.
- **4-02** — done: a new quote's default columns are Qty · Unit · Cost · Markup · Unit price (Discount and GST (%) off — a quote with a stored column set keeps it; on a quote with none, a line with a discount or at its own GST rate brings that column back by itself, and Column settings reads it on, so nothing about a line rests out of sight — REG-B4.22); "Section label" reads **Print group** (W-356) and View by offers it only once a line carries one; the always-on note above the table moved into the Template card on the desk ("Prints by trade — your sections are for you.") and stays on the phone's / tablet's Items screen in the same words (the card isn't on that screen). **Not done:** "On the phone show the reading cards by the quote's sections" — the reading cards are the client's view (what prints); showing the studio's sections there would show a grouping the paper doesn't carry (▲).
- **4-03** — done: header = title · "OM-10001 · v1" grey subtitle · one contract link · Saved · status pill · Send ▾ · Preview · ⋮ · ✕ (Client view and Comments are the ⋮'s first rows); Items toolbar at rest = search · New section · Create ▾ · ⋮ (Undo · Redo · Column settings · Row density › · View by › · Expand / Collapse all · Full screen · Round prices…); Maison AI = the FAB (the Items toolbar's button and the Create strip's tile left; the touch tablet's row keeps its glyph); the Price book = Create ▾ › From Price book + each section's foot (the strip's tile and the link under the table left). The sections below Items were already folded by default (DEFAULT_SECTIONS) — their one-line summaries on the desk were not built (the phone's section list carries them).
- **4-07** — done: the line ⋮ is Duplicate · Move to section › · Mark as optional · Print as › · Comment · Price book › (Update the item from this line · Save as a new item / Save to My Items · Propose…) · More › · Remove; the section ⋮ is Duplicate · Move to section › · Print as › (+ Print as one line · Label the sub-total… · Remove the sub-total label · Price after the contract) · Save to Price book · Ungroup · More › · Remove. **More ›** holds Section note… / Words on this line… · Highlight › · No number · Add section / Add sub-section · Add item › · Move item / Move section › · Copy name · Show full content. Copy name and Show full content were MOVED, not dropped (W-157 asked to drop them; the brief's rule 1). The phone's five-row level is unchanged; its More… opens the new top level.
- **4-08** (quote part) — done: ← · {client} / {number} · "Preview" · ONE status chip (the label) · the template as quiet words that still open the picker · the page count as words · Internal copy · What your client sees (a text button) · Copy link · Download PDF · Send. Fork A the contract.
- **4-09** (quote part) — partly: `PrivateLinkBadge` on /confirm and /quote/<token> (was PRIVATE LINK / VIEW ONLY), "See it as printed". The view page's phone bar keeps "Download" — "Download a copy" there pushed Message {designer} 48px off a 390 screen (pm2-s02 caught it); the desk card already says "Download a copy". Fork A the signing pages.
- **4-10** — done: one line "Prints with Default Quote PDF (v1)" + Change; the shorthand line and "Starts with …" left the card; Edit template and Save as template are the header ⋮'s ("Save as template", named once); a signed quote's card has no actions; no card on a variation order (4-52).
- **4-11** (quote part) — done: the four capital tags became "OM-10001 · v1" (a VO: "Variation order · VO-1 · v1"), the contract a sentence-case link "Contract: Draft ›". Fork A / B the contract and library headers. MetaChip's own uppercase is B1's (request).
- **4-12** (quote part) — done: Tools › Quotes' follow-up cell empty until the row is hovered / focused (always under a finger), none on Confirmed / Signed; no Shared / Private word (a lock on a private quote); Discount and GST (%) off by default; a child line's eye only when the line isn't fully shown (or on hover / focus; always on touch); no SECTION tag. Price book and library cards: fork B.
- **4-13** — done: column / Filters tab "Follow up", "Set a follow-up date", the send dialog "Adds a follow-up task for you on that day". Payments keep "Due".
- **4-14** — done: "Valid until" on the quote and the VO, the banner "The price was valid until 24 Sep ’26. Change Valid until if it still stands.", the list's tooltip "Valid until 24 Sep ’26 has passed. Change Valid until if the price still stands." ("Expired 24 Sep ’26" stays). Template field / readiness: fork B.
- **4-15** — done: the Shared / Private word left the title cell; a private quote wears a lock with "Only your team can see this quote". (An Approved row with a sent date is the data's — the status set reads "With client" once a quote is sent.)
- **4-20** (quote part) — the view-only link's subtitle shortened ("Your client sees the quote on a link, up to date. Nothing to confirm or sign there."); the character count and link row are fork A's shared `MessageField` / `SendContractDialog`.
- **4-21** — done: Send ▾ = **Ask to confirm** ("Your client taps Confirm on a link. No signature yet.") · **Send to sign** ("Your client signs an agreement made from this quote.") · **Mark as sent** ("You sent it yourself; nothing goes out."); a variation order's first row "Ask to approve"; a Confirmed quote's one button "Send to sign". The dialogs they open keep their titles. The picker's words: fork A.
- **4-22** — done (the approved exception): Mark as sent opens a ConfirmDialog "Mark OM-10006 as sent?" · "Nothing goes to {client} — it records that they have the quote." · Mark as sent / Cancel; the snackbar always keeps Undo; "Move to Quote Sent" stays on the editor's sent banner (and the lead's own stage pill).
- **4-26** (quotes part) — done: "New quote"; the phone card "Signed · 15 Sep ’26" (the chip says Signed, the line the day). Contracts: fork A.
- **4-27** — done in the quote files: Rename quote · Duplicate and edit · Save as template · Version history · Copy link · Preview and share · Create contract from this quote · Manage templates · Quote settings · Archived quotes · Deleted quotes · Delete forever · Delete all forever · Blank quote · Add a payment · Expand all · Collapse all · Clear all · Mark as optional · Add sub-section · New item · Round prices… · Export… · Additional discount · Issued by · Title · Property type · Project ref · Site address · General info · Payment schedule · Terms and conditions · Additional notes · Signature settings · Rename file · Version history (drawer).
- **4-28** — done: "items" on the Quote screen ("16 items · valid until …"), its document head's second count left, the Items screen's bar "16 items · S$…", the Preview's phone head, the client's total cards ("19 items"), the sum row "Sum · 16 items" ("14 of 16 items priced" while some wait); counts "Items · 16" / "Files · 1" on the tabs and card heads (T-07's "Label · n" rather than the house to-do badge, which means "what waits on you").
- **4-29** — done: Subtotal · GST · Total (+ the owners' margin); the lines' Discount row only when one is set; Additional discount only while it holds a value; "+ Add a discount" the one way in; Round prices… in the Items ⋮ on the desk (the touch Adjust sheet keeps it — it has no ⋮).
- **4-30** — done: "{Olivia} signs here when they accept the quote online." · NRIC "Asked when you send".
- **4-31** — done: "Issued by" · "GST registered" · Remarks "Shows on the printed quote" (VO: "… variation order") · Project ref · Title · "Add a second client" as a text button under the Client field.
- **4-32** — done: "New quote" (button and title), tiles say what tells them apart ("6 sections · Default: 10/30/30/30"; the full section list in the tile's tooltip), Blank quote, the upload tag, the draft row's words (British, no "10-item").
- **4-34** — done: the view-only card "Hi Serena, here is your quote from Germaine. It stays up to date on this page." (sent / approved) or "… — Germaine is still working on it." (a draft); the client's total card hides "valid until" once passed and says "This price was valid until 24 Sep ’26 — ask Germaine if it still stands."
- **4-41** — done through 4-03 (the toolbar no longer outgrows a card narrowed by the Client view pane).
- **4-42** — done: Upload a quote (its choose and read steps) opens at the m width (600), height to content; the phone keeps its sheet.
- **4-44** — done: the sum row's Qty and Unit price are blank unless every counted line shares one unit.
- **4-46** — done: the hover View left the quotes rows (the title opens the quote; ⋮ › Open under a finger) and the actions' trail is the ⋮'s own (`ACTIONS_TRAIL.kebab`), so nothing parks over Created / Sent; the contracts rows the same (`contracts-table.tsx`).
- **4-49** — done: no "0 Comments"; "No comments yet — pick an item below." / "No comments yet — ask your team below."; "Write a comment"; Send; counts "1 comment · 1 item".
- **4-50** — done: reading-card section headings in sentence case on the Preview and the client pages (`.captionName.captionName`, order-proof).
- **4-52** — done: the VO bar is one line ("Changes {project}’s contract by −S$545.00 — S$62,157.25 once approved."; the contract-today figure and the minus-quantity rule behind an info tooltip); no Template card on a VO; the sent banner stays (it holds Revise and the opened count).
- **5-44** (my file `lib/quotes/items-model.ts:22`) — **not done**: `UNITS` are the studio's seeded units and every line's stored unit text; renaming them changes stored values (Settings › Units owns the list — B5's card). Its other words are B5's files (request).
- **Touches** — 1-11 / 1-30: Tools › Quotes' create in the page header ("New quote", its one filled button; the toolbar keeps it on a phone), no second "All Quotes" title there; the lead's tab keeps "All quotes" + "New quote". 2-25: the quotes table's Private / Shared (the lead's QUOTE card is B2's). 3-40: Deleted quotes words. 4-04: the status map, the to-do chips "n approvals" · "With client · n". 4-06: Add a payment · Manage payment schedules · heads Payment · When · Share · Amount · Due · the deposit "On signing" (W-579; the print's twin in `lib/templates/data.ts` too). 4-16: "Last changed 27 Aug ’26" past a week (the house near words within it). 4-39: the text templates modal ("… templates", New template outlined, "Templates" root and link). 1-29: `CONSENT_HELP` "Off: you sign printed quotes by hand."
- **4-25** (quote side) — Vendor (was Vendor/Sub), Unit price, Website link done. **Not done:** the quote's Markup cell as "S$60 (32%)" — it is an editable figure the line computes with; rounding it on the sheet would hide the cents (the Price book's list shows the short form — fork B).
- **4-05** — not a B4 display fix (request to B1, from fork A's read).

## 2 · The ledger — every moved action (the quotes part; fork A's and B's are in their sections)

| What | Was | Now |
|---|---|---|
| Client view (the live pane) | the header's eye button (desk) | the header ⋮'s first row "Client view" / "Hide client view" (≤1024 it already was) |
| Comments (every line's thread) | the header's comment icon (desk) | the header ⋮'s row "Comments" (≤1024 it already was) |
| Edit template | the Template card's text button | the header ⋮'s row "Edit template" (and the Quote screen's ⋮ on the move, as before) |
| Save as template | the Template card's "Save as new template" + the ⋮'s "Save as Template" | the header ⋮'s "Save as template" (one) |
| Undo / Redo | the Items toolbar's two icons | the Items ⋮'s first rows (⌘Z / ⇧⌘Z unchanged) |
| Column settings | the Items toolbar's tune icon | the Items ⋮'s row |
| Row density | the Items toolbar's icon + its menu | the Items ⋮'s "Row density: … ›" |
| View by | the Items toolbar's "View by: None ▾" | the Items ⋮'s "View by: … ›" (Print group listed once a line carries one) |
| Expand all / Collapse all | the Items toolbar's outlined button (`toolbar-fold`) | the Items ⋮'s row (`toolbar-fold` on its words) |
| Full screen (Expand / Collapse) | the Items toolbar's last icon | the Items ⋮'s "Full screen" (`items-full-screen`); while full screen, a Collapse icon stays in the row |
| Round prices | the link beside Total | the Items ⋮'s "Round prices…" (`items-round`) on the desk; the touch Adjust sheet keeps its link |
| Maison AI (Items) | the Items toolbar's "Maison AI" button + the Create strip's tile | the page's Maison AI button (FAB) — the same sheet; the touch tablet's Items row keeps its glyph |
| Price book (the modal) | the Create strip's tile + the link under the table | Create ▾ › From Price book, each section's foot "Price book", Add item › Add from Price book… |
| The print note ("prints lines by trade") | above the Items table, always | the Template card's line (desk); the Items screen on the move keeps it |
| Discount (the lines' total) | a row in the totals card, always | the same row, only when a line carries a discount |
| Additional discount | a row in the totals card, always | the same row while it holds a value; "+ Add a discount" (a named discount, % or S$) otherwise |
| Copy name · Show full content · Highlight › · No number (Skip the number) · Words on this line… · Section note… · Add section / sub-section · Add item › · Move item › | the row ⋮'s top level | the row ⋮ › More › |
| Print as one line · Label the sub-total… · Remove the sub-total label · Price after the contract (a section) | the section ⋮'s top level | the section ⋮ › Print as › |
| Save to My Items / Update the item / Save as a new item (a line) | the row ⋮'s top level | the row ⋮ › Price book › |
| Mark as sent ("Sent it another way") | one press, marks at once | the same row, then a confirm ("Mark OM-… as sent?") — the same action |
| "Move to Quote Sent" after Mark as sent | the snackbar's action (instead of Undo) | the editor's sent banner (and the lead's stage pill); the snackbar keeps Undo |
| The quotes row's View | a hover button | the title (and the ⋮'s "Open" under a finger) — Contracts the same |
| New quote (Tools › Quotes) | the toolbar's "Create Quote" | the page header's "New quote" (desk / tablet; the toolbar's glyph on a phone) |
| Shared / Private (a quote's visibility) | a word under every number | a lock with its tooltip on a private quote; nothing on a shared one |
| The follow-up add (an empty Due cell) | a purple calendar icon on every row | the same button on the row's hover / focus (always under a finger); none on Confirmed / Signed |
| The section's "SECTION" tag | a tag on every section row | its band, fold and item count say it |
| A child line's eye (fully shown) | at rest on every child line | on the row's hover / focus (always under a finger); a hidden / no-price line keeps it at rest |
| The template's defaults line ("By trade › room · 10/30/30/30 · Valid 30 days · GST · signs online", "Starts with …") | the Template card | the template's own Quote settings tab (Company › Templates); the applied values on the quote's own sections |
| "Templates" (Terms / Notes) | "My Templates" | "Templates" (same modal) |
| The contract-today figure and the omission rule (a VO) | the VO banner's text | the info tooltip at the bar's end (`variation-how`) |
| The upload tile's tag | "XLSX · CSV · PDF · 5 AI CREDITS" (MetaChip) | "Spreadsheet or PDF · 5 credits" (words) |
| Discount and GST (%) columns (a quote with no stored set) | on, every line "0%" / "9" | Column settings; each comes back by itself while a line uses it (a discount, its own GST rate — "Own rate" stays in view) |

## 3 · Words (lane total)
114 rows in the work list. **Applied: 110** — the quotes part 61 (W-005 · 006 · 009 · 011 · 016 · 019 · 055 · 060 · 082 · 102 · 104 · 107 · 116 · 129 · 131 · 135 · 140 · 161 · 167 · 169 · 173 · 175 · 185 · 196 · 200 · 209 · 219 · 222 · 227 · 249 · 250 · 270 · 307 · 319 · 321 · 332 · 339 · 344 · 352 · 356 · 358 · 360 · 362 · 365 · 368 · 376 · 382 · 399 · 416 · 419 · 420 · 422 · 423 · 428 · 458 · 494 · 523 · 545 · 555 · 577 · 579 · 608 · 614 · 562 (quote side)), fork A 25, fork B 24 (their sections). **Not applied / changed:** W-315 (units — stored values, see 5-44), W-157 (Copy name / Show full content moved under More ›, not removed — rule 1), W-608 partly (sections "Save to Price book", the line source "From the Price book · …"; a line's own save keeps "Save to My Items" — the Price book's tab names are B5's), W-016 written as proposed ("Spreadsheet or PDF · 5 credits", not 4-32's "Excel, CSV or PDF").

## 4 · The guard
`guard.mjs snap . $RL/B4/guard-after.json` then `diff guard-before.json guard-after.json`, on the lane's final tree (after the last fixes):

```
snapshot: 173 pages · 1064 server actions called · 3781 control handles · 120 keys
✓ pages: none gone
✓ server actions a screen calls: none gone
✓ control handles (data-testid · data-kb): none gone
✓ keyboard shortcuts: none gone
  new handles: 18
```

**Zero gone.** (One handle went missing mid-lane — `testid:editor-hint`, the template editor inspector's empty state; it was put back on
that state before the run above.) The 18 new handles: the quotes part's `items-more` · `items-full-screen` · `items-round` (the
moved Items rows), `quote-header-sub`, `quote-private`, `variation-how`, `private-link-badge`, `confirm-validity-passed`; fork A's
`contract-head-words` · `contract-for-quote` · `preview-back-desk` · `preview-words` · `preview-copy-link` · `preview-download-desk`
(the contract's Preview); fork B's `template-head-words` · `defaults-how` · `column-card-open` · `import-how`. (`toolbar-fold` and
`quote-contract-chip` kept their names on the moved row / the header's contract link.)

## 5 · Probes
**All 44 green — 2,811 checks, 0 failing, every exit 0.** Runner `design-source/verify/regression/run.cjs` on port 3441 through
`heavy.sh probes`, each probe on its own copy of the lane's base DB. The final tree's build (`B4/build-6`) ran run-4 (the 12 probes that
failed in run-3 or touch the last three fixes) and run-5 (rq-k4, rq-k5); the other 32 are run-3 on build-4, and the only changes since
are the Tools › Quotes toolbar's spacer, its chips' fit measure and the view page's phone-bar word (each re-proved by run-4's probes).

| Probe | Checks | Run | What I restated — every line marked `(the calm UI build 2026-10-27, a deliberate change)` |
|---|---|---|---|
| qe-r1 | 34 ✓ | 3 | the Vendor head (`/^Vendor/`), "before the quote’s discounts", Undo via the Items ⋮ (4-03), the Item details switch via the ⋮ |
| qe-r2 | 33 ✓ | 3 | the status button `/Waiting for approval/` (T-01) |
| qe-r3 | 21 ✓ | 3 | the private lock (4-15), sentence-case rows (W-222 · W-250) |
| qe-r4 | 14 ✓ | 3 | a contract out for signing `/Waiting for signature/` (T-01) |
| qe-r5 | 21 ✓ | 3 | Undo via the Items ⋮, "Write a comment" / Send `.last()`, "1 comment · 1 item" (4-49), the tabs' "Items · n" (4-28) |
| tpl-parity | 20 ✓ | 3 | — |
| ct-r1 … ct-r4 | 36 · 24 · 28 · 29 ✓ | 3 | fork A's words (4-18 · 4-19 · 4-51 · W-156 · W-363 · W-199); ct-r3 "Signatures" filtered to the drawer (`hasText: 'draw'`), New contract `/i` |
| rq-k1 | 116 ✓ | 3 | "16 items" (4-28), Ask to confirm (W-358), the ⋮ in sentence case |
| rq-k2 | 98 ✓ | 3 | the row ⋮'s More… now opens the full menu (More ›, Print as ›, Price book ›), "Collapse all" `/all$/i` |
| rq-k3 | 90 ✓ | 3 | Ask to confirm (W-358) |
| rq-k4 | 143 ✓ | 5 | New quote (W-011 · 1-11), the to-do chip "With client" (W-428), the total card "19 items" (4-28), no hover View (4-46), the pure probe's since words (W-376) |
| rq-k5 | 79 ✓ | 5 | the Send ▾ rows Ask to confirm / Send to sign (the dialogs keep their titles), the payment heads Share · Amount (4-06 — the three "no heads on a phone" checks kept on the new name, not left trivially true), "On signing" (W-579), Version history, the picker (W-136 · W-616) |
| rc-c1 … rc-c4 | 176 · 90 · 110 · 145 ✓ | 3 | fork A's (4-11 · 4-19 · 4-26 · W-115 · W-120 · W-197 · W-230 · W-331 · W-359 · W-363 · W-448); rc-c2 "Signatures" filtered to the drawer; rc-c4 the card ≤144 tall ("Waiting for signature · sent … · not opened" wraps), View count 0 (4-46), Preview and share `/i` |
| pb-r1 · pb-r2 · pb-r3 · pb-r4 · pb-modal | 18 · 41 · 30 · 32 · 18 ✓ | 3 · 3 · 4 · 3 · 3 | the line's saves under ⋮ › Price book › (`bookMenu`), "From the Price book · …", sections "Save to Price book" (W-608), Add item › under More ›, New quote; pb-r3 **the draft row no longer prints the live count** ("your 9-item price book" → "drafts it from your Price book", 2-51 · 4-32 — the count it proved is no longer on screen); pb-r4 "up to 500 rows" (W-470); fork B's Type / Trade words |
| pm2-s02 | 107 ✓ | 4 | the view card's words by state (4-34 · W-209: "It stays up to date on this page") |
| pm2-s03 | 79 ✓ | 3 | fork A's contract words, Contract settings |
| pm2-s04 | 82 ✓ | 4 | the status order in the words on screen (T-01), New quote, the upload tile (W-016) |
| pm2-s11 | 62 ✓ | 3 | the harness's REPO read from the runner's cwd (a crash, not a rule) |
| pm2-s29 | 73 ✓ | 3 | the "Terms and conditions" title (W-200), Ask to confirm (W-358) |
| pm2-s44f | 101 ✓ | 4 | the status button `/^With client/`, the dialog's `Mark “Confirmed”` (T-01) |
| pm2-s44g | 82 ✓ | 3 | W-116 |
| pm2-s44i | 110 ✓ | 3 | More › paths, Save to Price book, Print as › Price after, Add trade, New item, Column settings / Collapse all via the Items ⋮, Trade (4-01 · 4-03 · 4-07 · 4-12) |
| pm2-s44q | 52 ✓ | 4 | Client view `/^Client view/` in the ⋮, Templates, the textbox "Terms and conditions", the modal "Terms and conditions templates" `/i` (4-39 · W-270) |
| pm2-s44t | 69 ✓ | 4 | Print as › on a section (4-07); **"every printed column card has a Colour" now opens each card's chevron in turn** (fork B's 4-23 put a card's colour behind it) and still asks ≥3 |
| pm2-s46d | 73 ✓ | 3 | W-359 |
| dane-p1 · p2a · p2b | 47 · 54 · 56 ✓ | 3 | the Items inspector's column chevron (4-23), "Terms and conditions", T-01 · T-13 |
| dane-p3 | 70 ✓ | 4 | View by › Trade via the Items ⋮ — the helper now closes an open Find first and waits for the menu before pressing its row (it timed out twice under load after Jump to; I couldn't make the menu move in eight scroll positions, so it reads as the ⋮'s menu still rising, not a jitter); Add trade, "No trade" (W-416), New quote |
| folders-galleries · folders-pickers | 44 · 15 ✓ | 3 · 4 | the sections list's key, the Status pill regex, "From a template" (W-199), the picker's title (W-136) |
| ux-p4 | 56 ✓ | 4 | Mark as sent asks first (4-22), the Send ▾ rows, "With client" (W-428), **the Create strip keeps Templates; the Price book is Create ▾ › From Price book** (4-03, the next check proves that door) |
| ux-p5 | 59 ✓ | 3 | Send to sign (W-358), the picker (W-616) |
| rwd-w5 | 74 ✓ | 4 | — |

Also restated in this tree (outside the list, the same rule): sw-r1 (Mark as sent, the sum row), sw-r2 (the status rows), sw-r5 (Add item › under More ›), rq-k4-pure, and fork B's pm2-s44p · pm2-s43e · first-run · pj-gap-c · ux-p6 (its section). None weakened a functional check: every changed line asserts the same rule on the new words or the new path.

**Found by the probes and fixed in the source (not restated):**
- **The view page's phone bar.** "Download a copy" pushed Message {designer} 48px off a 390 screen (pm2-s02). The bar keeps "Download"; the desk card says "Download a copy".
- **Tools › Quotes' phone Filters.** With no title, folding the search slid Filters out from under the finger, so the sheet never opened (rq-k4). The title's slot stays as an empty spacer. A spacer is not counted by the chips' fit measure, so the to-do chips keep their words on a tablet (rq-k4).
- **NB-07 (b)'s "Own rate" stayed out of sight** with GST (%) off by default (pm2-s44i). Discount and GST (%) now come back on a quote with no stored set while a line uses them (REG-B4.22).

**Checks:** `tsc` is clean. `design:lint` reports nothing new. `eslint` on B4's folders shows 3 errors, all in `quote-editor.tsx` at :291 · :326 · :438 (impure call in render, modified value). The same three errors are at HEAD; none comes from this lane.

## 6 · Measures — before (the audit's lane-4 table) → after (`measure.cjs`, this build, lane.db)

| Screen | Words | Controls | Purple | Filled | Capitals | Fonts | Colours | Cut |
|---|---|---|---|---|---|---|---|---|
| /quotes 1440 | 254 → 237 | 50 → 43 | 17 → 9 | 0 → 1 (New quote, its one filled) | 11 → 11 (the column heads' house style) | 12 → 11 | 5 → 5 | 0 → 0 |
| /quotes 390 | 104 → 97 | 15 → 15 | 8 → 8 | 0 → 0 | 0 → 0 | 8 → 8 | 5 → 5 | 0 → 0 |
| /quotes/[id] Draft OM-10001 | 569 → 515 | 67 → 61 | 11 → 7 | 1 → 1 | 28 → 20 | 17 → 14 | 7 → 5 | 0 → 0 |
| /quotes/[id] Sent OM-10007 | 604 → 532 | 64 → 50 | 11 → 6 | 1 → 1 | 21 → 12 | 17 → 14 | 8 → 6 | 0 → 0 |
| /quotes/[id] Signed OM-10009 | 570 → 495 | 65 → 50 | 11 → 5 | 1 → 1 | 22 → 13 | 17 → 14 | 8 → 6 | 0 → 0 |
| /quotes/[id] 390 (Quote screen) | 97–107 → 97 | 11–13 → 13 | 2 → 2 | 1 → 1 | 0 → 0 | 8 → 8 | 5 → 5 | 0 → 0 |
| /quotes/[id]/preview | 210 → 209 | 9 → 9 | 0 → 0 | 1 → 1 | 5 → 3 | 10 → 11 | 3 → 3 | 0 → 0 |
| /contracts | 101 → 94 | 24 → 21 | 9 → 6 | 0 → 0 | 7 → 6 | 9 → 10 | 3 → 3 | 3 → 0 |
| /company/templates/quotes | 405 → 402 | 24 → 24 | 6 → 6 | 0 → 0 | 3 → 3 | 15 → 15 | 4 → 4 | 0 → 0 |

OM-10001 keeps its own stored column set (Type · Trade · Print group · Discount · GST (%) …), so its first screen still shows them — a new
quote opens on the shorter set. Most remaining capitals are the paper's own words (the seeded Default Quote PDF's "CONTRACT FOR …" heading —
a stored design, see fork B's 4-33) and the table heads' house caption style. Shots: `B4/shots/after-*.png` (1440 and 390) beside
`before-<finding>.jpg` (the audit's) and the measure's own `4-*.png` / `-full.png`.

## 7 · Requests (the quotes part; fork A's and B's in their sections)
- **B1 — `components/om/meta-chip.tsx`:** T-06 / 4-11 — the chip's `text-transform: uppercase` makes every non-status tag shout ("DEFAULT", "AT HANDOVER", "STUDIO DEFAULT"); a `case="sentence"` prop (or sentence case by default, the DS Tag's uppercase kept for statuses) lets the libraries' tags read in words.
- **B1 — `components/shell/list-ghosts.tsx` (`QuotesListGhost`):** Tools › Quotes' ghost: the L1 header now carries a "New quote" button (≈105 wide, right) and the toolbar has no "All quotes" title and no create button on the desk — draw the header's button slot and drop the toolbar's title and create slots there.
- **B2 — `components/leads/detail/tab-ghosts.tsx` (`QuotesTabGhost`):** the lead's tab toolbar reads "All quotes" + "New quote" (≈105 vs 113) — width only.
- **B2 — `components/leads/detail/quote-card.tsx`:** use `quoteStatusLabel` (`lib/quotes/status-words.ts`) for every quote status the Overview card prints (the six-step track and its chip), and the empty state's words "No quote yet" · "Make one from a template or upload your own." (W-161 names both files).
- **B2 — `lib/leads/quote-filters.ts`:** optionally move `QUOTE_STATUS_LABEL` / `QUOTE_TODO_LABEL` beside `QUOTE_STATUSES` / `QUOTE_TODOS` (the brief's "one map beside its enum") and re-export from `lib/quotes/status-words.ts`; nothing else reads the labels.
- **B3 — the project's Documents card, Money's VO rows and `lib/projects/money.ts` `variationLabel`:** a quote's status through `quoteStatusLabel` ("With client" for Sent to Client — a VO's own "With the client" can become "With client" to match §2).
- **B5 — `app/settings/settings-view.tsx` (5-44):** "What prints as “Prepared by” on every quote"; "Contracts · signing links" → "Signing links"; the units card shows the studio's stored units as they are (one case is a data call — see ▲).
- **B1 — `lib/global-search/model.ts`:** ⌘K keeps finding the old words — add "Create Quote", "Due", "Category", "Section label", "Vendor/Sub", "Sent to Client", "Sent for Approval", "Waiting on client", "Sent it another way", "Issuing Entity", "Round Prices", "My Templates" to the matching rows' search words where those rows exist.
- **Other lanes' probes asserting the quotes part's old words (not mine, not edited):** sw-r1:105 "Mark as sent" button count (still 0 — fine) · sw-r1:51 restated by me (the Sum row, a UI-sweep probe); pm2-s41b1:241 `button 'Export As'` → "Export…"; st-r3:100 `combobox 'Issuing Entity'` → "Issued by"; pj-r5:123 the VO bar's "S$69,283.13 today" (now in the tooltip) and :138/:139 Send ▾ rows `/Send for confirmation/` → "Ask to approve" on a VO; pm2-s44o:182 `/Send for confirmation/` → "Ask to confirm"; dane-p5b:287 `getByText('Send for confirmation', exact)` → "Ask to confirm"; cr-r3:138 the upload tile's "xlsx · csv · pdf · 5 ai credits" → "spreadsheet or pdf · 5 credits"; xr-r2:119/126 `menuitem 'Compare with another quote'` (unchanged — fine); rl-l4:163 `More…` includes 'Save as Template' (case-sensitive `includes` → "Save as template"); pm2-s19:293 `/Save as Template/` → /Save as template/i; dane-p6:129/173 "Copy confirmation link" (unchanged — fine); dane-p4:224 "Create contract from this quote" (unchanged). **The create button "Create Quote" → "New quote"** (Tools › Quotes: the page header's button on the desk; the lead's tab: the toolbar's): cr-r3:133 · 150, pm2-s17:165 · 167 (the dialog's 928 check presses it), pm2-s42b:311 · 322 · 334 · 339, pm2-s21:230 · 239, first-run:134 (`exact: true`); the modal's title "Start a quote" → "New quote": ux-p7:114 (`hasText: 'Start a quote'`). The to-do chip "Waiting on client" → "With client · n": dash-d5:336 · 340, pj-r5:149. folder-crumbs:28 "My Templates" → "Templates". (SQL reads of `'Sent to Client'` — pj-gap-d, pj-r5, pm2-s44r, pm2-s42b — read the stored value and stay right.)

## 8 · ▲ For Vicky (the quotes part; fork A's and B's in their sections)
1. **The quote's header ⋮ is 16 rows on the desk** (it was 13): Client view and Comments came in from the header (4-03), Edit template from the Template card (4-10). T-14 asks under ten; a "More ›" level would move rows a dozen probes across five lanes press (Version history, Copy confirmation link, Share a view-only link, Save as template …), so it stays flat, grouped by its dividers — your call whether to fold it.
2. **The Create strip keeps only Templates** — its Maison AI and Price book tiles left as the audit's "one door each" (4-03). The strip is the mock's (1260:31160); with one tile it might go altogether (the Template card's Change is the same door).
3. **A new quote's default columns** drop Discount and GST (%) (4-02 · 4-12) — `DEFAULT_COLUMNS` is what a quote without a stored set opens on, so it is the one "stored default" the lane moved; quotes with a stored set keep theirs, and on the others a line that uses Discount or its own GST rate brings that column back by itself (REG-B4.22).
4. **"Print group"** is the free label's new name (W-356; REG-574 named it "Section label").
5. **Mark as sent's snackbar** no longer offers "Move to Quote Sent" (Undo is always there now, 4-22); the move is the sent banner's button and the lead's stage pill — one more press than before.
6. **The quote's reading cards on the phone still follow the print**, not the quote's sections (4-02 asked for the sections); they are what the client reads.
7. **"Items · 16"** (T-07's form) on the tabs and card heads, not the house Tabs' count badge 4-28 named — the badge means "what waits on you".
8. **The deposit's due reads "On signing"** on the editor, the phone cards and the printed schedule (W-579) — a quote the client only confirms still prints "On signing".
9. **The upload tag says "5 credits"**, not "5 AI credits" (W-016) — "credits" alone sits next to Qanvast's Lead credits in the app's words.
10. **The to-do chip "1 approval"** (§2's Approvals) replaces "Waiting for my approval · 1"; fork B used the same on the template gallery.
11. **The view-only page's phone bar still says "Download"** (4-09 asked for one download word). "Download a copy" beside "Message Germaine" runs 48px past a 390 screen. The two ways out are a bar that wraps to two rows, or "Message" without the name. Both change the bar's design, so the bar is left as it was for now.
12. **A quote's status in a sentence wears quotes:** `Mark OM-10007 “Confirmed”?`, `Quote OM-10007 marked “With client”`. The labels can be two words ("With client", "Waiting for approval") and read badly bare inside a sentence. The contract editor's snackbar keeps "marked Signed" unquoted, because its words are one-word statuses.
13. **Discount and GST (%) bring themselves back** on a quote with no stored column set while a line uses them (REG-B4.22). This is the one rule this lane added rather than moved; without it a line at its own GST rate hid its "Own rate".

---

# Section A — fork A's report (Contracts and the client signing pages)

# Fork A — Contracts and the client signing pages (lane B4)

## 1 · Built
- **4-08 done.** The contract Preview's desk bar is the quote's one Preview bar: ← · crumb `{client} / {contract title}` · "Preview" · one status chip (`contractStatusLabel`) · "Copy link" and "Download PDF" as outlined buttons with words · then Send, or "Download signed copy" once signed. The ← keeps the name "Back to edit" (rc-c1:428 uses it as a handle). The signed day and "Uploaded PDF / Signed on paper" are secondary words, not chips. The touch bar's line uses the status label; the preview ghost follows the new bar.
- **4-09 done (signing side).** `PrivateLinkBadge` replaces "Secure signing" on `signing-page.tsx` and `bundle-signing-page.tsx`. W-331: the hero reads "Quote OM-…" (also the quote layer's title / aria-label, the desk "Quote {n}" link, "It signs quote {n} — view the quote", the deposit lines, `/sign/[id]/quote`'s page title). W-115 "As cards" → "See the quote". W-351 "Save a copy" → "Download a copy" in the sign bar and the Signed card (the share-sheet behaviour unchanged). Kept: the legal accept sentence "agree to … quotation OM-…" (the contract's defined term).
- **4-11 done.** The contract header has no tags ("From template" and the signed-day tag gone; an upload's kind and "Sent together" are secondary words); the phone hero drops "From template"; the contract template editor drops "Template" and "Used by n" (the gallery card carries usage); "Standard PDF" and "Sent at handover" are words. Ghosts updated.
- **4-17 (contract template part) done.** The template editor's second-row name is gone; ⋮ › Rename… opens the rename dialog at every width.
- **4-18 done.** The second-row title is gone; ⋮ › Rename… opens the new `rename-dialog.tsx` ("Contract title"), refused when signed. The bell is the ⋮ row "Reminders…" (the same switches). The link icon is the ⋮ row "Copy signing link" (help "Copying it sends the contract"); the Send dialog's foot keeps Copy link. On a signed contract the formatting bar shows only the Outline toggle (`DocToolbar locked`). "Automation" reads "Reminders" everywhere (dialog, popover, phone fold, section screen, phone ⋮).
- **4-19 done.** "eSignatures" → "Signatures" (toolbar, drawer, readiness messages, the template editor's Maison AI meta); "Fillable fields" → "Signature boxes" with "Put a box where each person signs."; W-452 in `lib/contracts/tokens.ts`; the missing-signature help "Set your signature up on Your profile first"; drawer section names bold sentence case.
- **4-20 done.** Title "Send for signature"; one head line `SIGN_SEND_LINE` ("Your client signs on their phone; a one-time code confirms it’s them."), the demo note and the link window under "How signing works" (a fold on touch, a house Tooltip on the desk); a host passing only `subtitle` (the quote's Send for confirmation) is unchanged; the link row only when the message doesn't already carry the link; the character count only past 900; the "Code +65" box folded into the phone field as TextField `leading`; Send together the same.
- **4-21 (picker part) done.** W-136 "Which agreement should they sign?"; W-616 one "Continue" at every width, "The studio agreement" a choice card / row (picked when no template is suggested — Q9's default → only → last-used order kept); `onStarter` / `onUse` as before.
- **4-26 (contracts part) done.** W-230 column "Client" (key stays `lead`); W-375 Signed copy off by default, still in Column settings, + row ⋮ "Signed copy"; W-612 "Search client, title, quote number…" (the search matches the quote number and the displayed status, through the `extra` hook in the components); W-562 / W-199 "New contract ▾" · "From a template" · "Import a file"; "for OM-…" beside the title on desk and tablet; the phone card "Signed · 15 Sep '26" (the word once); the toolbar ⋮ in sentence case (All contracts, Manage templates, Contract settings, Archived contracts, Deleted contracts).
- **W-363 done.** `contractStatusLabel` on the table button and its aria-label, the status menus, the Filters chips, the phone card, both previews, the editor pill and its siblings switch, the Deleted and Archived sheets, the bundle meta, the "Contract marked …" snackbars, the share snackbars ("…waiting for signature now") and the next-step fallback; the to-do chip "Waiting for signature · n"; a quote's status on contract pages through `quoteStatusLabel`. Stored values untouched. The tablet status track 168 → 196 so the longer word isn't cut.
- **4-38 done.** Picker cards draw the template's own page with the paper renderer, as the gallery; a standard PDF card shows its first page; meta in words (Default · Last used · Edited …). The picker's read action also returns `paper: { brand, studio }` from `fetchBrand()` (read-only).
- **4-43 done.** `savedLabel`, `awaitingLine` and `link.ts`'s `shortDate` use the house months ("Sep", never "Sept").
- **4-45 done, display only.** `tightenPunctuation()` in `lib/contracts/tokens.ts`, run inside `ContractPaper` and `ContractDocument`: no space before , . ; : ) ] after a resolved field (incl. a no-break space or one inside a closing `</strong>`). `resolveTokens` unchanged, so fingerprints and kept copies are unaffected.
- **4-48 done.** "How fields fill in" is a house Tooltip with the new words.
- **4-51 done.** The signed banner and `next-step.ts`: "Signed on 8 Aug '26 — this copy is locked. An Owner or Admin can undo the signing from the status menu."
- **2-23 (contracts part) done.** "No contract yet"; buttons "From the studio agreement", "From a template", "Import a file".
- **T-03 extra.** The banner's "Move to Won" and "Send again" are outlined — the header press is the screen's one filled button.
- **T-13 extra.** Duplicate and edit · Save as template · Preview and share · Copy link · Clear all · Delete forever · Delete all forever (was Empty Trash, with its confirm) · Delete contract(s) · Deleted contracts.
- **4-05 not done — not in a B4 file** (request to B1 below).
- (parent) **4-46 for Contracts too**: the row's hover View left as on Quotes (the title opens; the ⋮ alone, `ACTIONS_TRAIL.kebab`).

## 2 · Ledger (what · was · now)
- Rename contract title · meta-row inline title input · header ⋮ › Rename… (dialog "Contract title"; refused when signed)
- Rename contract template name · template editor meta-row input · ⋮ › Rename… (the existing dialog, now at every width)
- Reminders (automation switches) · header bell "Automation" · header ⋮ › Reminders… (same dialog); phone ⋮, fold and section renamed "Reminders"
- Copy signing link · header link icon ("Copy link — marks it Sent") · header ⋮ › Copy signing link (help "Copying it sends the contract"); the Send dialog's foot Copy link unchanged
- Copy link and Download PDF on the contract preview · icon-only buttons · labelled outlined buttons in the bar
- Back to edit on the contract preview · outlined "Back to edit" · the ← IconButton named "Back to edit"
- Start from the studio agreement · picker foot button (desk) and phone row · choice card / row "The studio agreement" + Continue (testid `contract-starter-row`)
- Use template · picker foot button · Continue (testid `contract-template-use` kept)
- Signed copy column · default column · off by default (Column settings) + row ⋮ › Signed copy (desk and phone)
- "From template", signed date, "Used by n", "Template" header tags · header chips · the signed date in the banner; From template in the Activity fold ("Created from a template"); usage on the gallery card
- Code +65 box · disabled select beside the phone field · "+65" prefix inside the phone field
- Send dialog link row · always · only when the message lacks the link (the foot's Copy link copies it)
- Send subtitle's demo note and link window · the dialog head · "How signing works" (Tooltip on desk, fold on touch)
- Signed formatting tools · greyed toolbar · hidden; the Outline toggle stays
- (parent) Contracts row View · hover button · the title (and the ⋮ › Open under a finger)

## 3 · Words
Applied (25): W-028 (signing pages), W-115, W-120, W-136, W-156, W-182, W-187, W-197, W-199, W-212, W-230, W-254, W-331, W-351, W-353, W-359, W-363, W-375, W-448, W-452, W-506, W-562, W-588, W-612, W-616 — plus sentence case in the contract files. None skipped.

## 4 · Probe edits (each restated line carries "(the calm UI build 2026-10-27, a deliberate change)")
ct-r1 (:24 pill regex · :37 :72 ⋮ › Rename… aria-disabled · :39 banner regex · :106 Deleted contracts · :118 ⋮ › Copy signing link · :127 snack) · ct-r3 (:38 :139 "Signatures" exact · :52 ⋮ › Copy signing link · :110 snack) · ct-r4 (:142 ⋮ › Reminders… · :148 · :152 · :167 · :168 · :125 :131 "Send for signature") · pm2-s03 (:120–122 · :148 · :181 · :192 · :224) · pm2-s44q :247 :251 · pm2-s46d :128–129 · rc-c1 (:122 · :141 · :160 · :275–278) · rc-c1-pure:34 · rc-c2 (:108 :330 :332 :333) · rc-c3 (:117 :142) · rc-c4 (:148 · :181 · :221 · :281 :557 · :322 :605 · :536 · :556) · rc-c4-pure:32 · rq-k5 (:231 :237 :240 :246 :249) · folders-pickers:83 · ux-p4:316 · ux-p5 (Copy signing link, Continue, From a template, Waiting for signature · 1, the status menu, the dialog, the snacks, the row help).
Other lanes' probes asserting these words (not edited): pm2-s44r (:182 pill regex, :220 dialog name, :243 "Deposit of quotation"), pm2-s42b (:173 dialog name, :174 the demo words now in the tooltip), sw-r2 (:52 menuitem /^Sent to Client/, :117 'Automation', :161 the Template name textbox), dane-p4 (eSignatures ×3, the title-field pencil on the contract and its template, "How fields fill in" expecting the snackbar), pm2-s17:171 and consistency/verify-overlays:69 ('Import from File'), pj-r5:255 (the invoice send's link row, now hidden when the message carries the link).

## 6 · ▲ (fork A)
- The picker's "Continue" still opens on the suggested template (default → only → last-used, the UX audit's Q9); the studio agreement is pre-picked only when nothing is suggested — W-616 asked for it pre-selected, which would reverse Q9.
- "Automation" is "Reminders" everywhere, not only at the old bell.
- "From template" lives only in the Activity fold ("Created from a template") and on the template's gallery card.
- The contracts search now really matches the quote number and the shown status (a small search change, made in the components, not `lib/leads`).
- The picker's read action returns the studio's brand, so cards draw real pages.
- A signed contract keeps a near-empty bar with only the Outline toggle, so a closed Outline can reopen.
- The contract header ⋮ is 10 rows, 11 while a link is out (Stop the signing link) — just over T-14's "under ten".

## 7 · Register rows (fork A)
| REG-B4.101 | Contracts | **One Preview bar for the contract** — ← · {client} / {title} · Preview · one status chip · Copy link · Download PDF · Send; the signed day and the upload's kind as words (4-08) | user-directed |
| REG-B4.102 | Contracts | **The contract header says each thing once** — no From template / Signed / Template / Used by tags; rename from ⋮; the meta row loses its second title (4-11 · 4-17 · 4-18) | user-directed |
| REG-B4.103 | Contracts | **Reminders… and Copy signing link in the header ⋮** — the bell and the link icon left; "Automation" is "Reminders" everywhere (4-18 · W-120 · W-156) | user-directed |
| REG-B4.104 | Contracts | **A signed contract shows no formatting tools** — only the Outline toggle (4-18) | user-directed |
| REG-B4.105 | Contracts | **Signatures, Signature boxes, one line** — and "Your signature — from Your profile" (4-19) | user-directed |
| REG-B4.106 | Contracts | **The Send dialog's head is one line** — the demo note and window under "How signing works"; title "Send for signature"; link row only when the message lacks it; count past 900; +65 as the phone's prefix (4-20) | user-directed |
| REG-B4.107 | Contracts | **"Which agreement should they sign?"** — one Continue, the studio agreement a choice, real page thumbnails, words not chips (4-21 · 4-38 · W-136 · W-616) | user-directed |
| REG-B4.108 | Contracts | **Contracts list as Quotes' sister** — Client column, Signed copy off by default (⋮ › Signed copy), "for OM-…", search by client · title · quote number, New contract ▾ · From a template · Import a file, the phone's Signed once, no hover View (4-26 · 4-46) | user-directed |
| REG-B4.109 | Contracts | **Contract states on screen: Draft · Waiting for signature · Signed** — one display map, `lib/contracts/status-words.ts`; stored values unchanged (W-363 · T-01) | user-directed |
| REG-B4.110 | Signing pages | **One client badge and "quote"** — Private link; Quote OM-…; See the quote; Download a copy (4-09) | user-directed |
| REG-B4.111 | Contracts | **Punctuation hugs a field on the paper** — display only, the fingerprint unchanged (4-45) | bug fix |
| REG-B4.112 | Contracts | **House months in Saved and link dates** — "Sep", never "Sept" (4-43) | bug fix |
| REG-B4.113 | Contracts | **Clearer signed banner** — "Signed on … — this copy is locked. An Owner or Admin can undo the signing from the status menu." (4-51) | user-directed |
| REG-B4.114 | Contract templates | **"How fields fill in" is a tooltip**, not a snackbar (4-48) | user-directed |
| REG-B4.115 | Contracts | **One filled button** — the banner's Move to Won and Send again are outlined (T-03); sentence case across the contracts menus (T-13); "No contract yet" (2-23) | user-directed |

---

# Section B — fork B's report (Company › Templates, the template editor and renderer, the Price book)

# B4 · Fork B — Company › Templates, the quote template editor and its renderer, Company › Price book (the calm UI build 2026-10-27)

Scope: `components/company/templates/**`, `components/company/price-book/**`, `components/templates/**`, `lib/templates/**`,
`lib/company/price-book-changes.ts`. eslint on these folders: 0 errors (10 warnings, all pre-existing `<img>` / one unused disable comment in
contract-templates-gallery.tsx). `npm run design:lint`: ✓ nothing new. No tsc, builds or probe runs (as asked). Nothing committed.
Incident: a perl edit with a `\x{2026}` escape re-encoded payment-templates-gallery.tsx as Latin-1 → UTF-8; restored with `git checkout` and
both edits redone with the Edit tool; every other touched file was checked for mojibake (none).

## 1 · Built (per finding id)

- **4-01 (Price book part) — built.** "Category" → **Trade** in the Price book: list column (`label: 'Trade'`, key `category` kept), the Filters
  facet (its "Any trade" comes from the label), the item dialog's select, the bulk action "Set category" → "Set trade" (dialog title and its
  select too), the select's action row "New category…" → "New trade…" (testid `new-category-row` kept), the New category dialog → "New trade"
  (title, helper "…every quote’s Trade list offers it too", failure "Couldn’t add the trade"), "No category" → "No trade" (item dialog + bulk
  dialog), History's field label (lib/company/price-book-changes.ts `BOOK_FIELDS`: category → "Trade"). The helpers "The studio’s units — Settings ›
  Quotes & pricing" / "The studio’s trades — Settings › Quotes & pricing" removed from the item dialog and the bulk dialog; the selects already end
  on an action row that MAKES one ("New unit…" / "New trade…"), so those were kept instead of a "Manage…" row (that would change what the press
  does); where the lists live is said in "How the Price book works". Stored field stays `category`; export header stays "Category".
- **4-06 (my part) — partly.** The schedule template editor's crumb reads "Project schedules"; the payment schedule editor's rows are payments
  (see 4-17). The Templates tab label itself is in lib/company/sections.ts (B5) → request.
- **4-11 — built** for my editors: payment schedule editor header tags (split chip, "Default on n quote templates") dropped, "Studio default"
  kept as its one standing mark; schedule editor's "n milestones" and "n schedules started from it" dropped; task editor's step count and usage
  chips dropped (`chips={null}`); text editor's usage chip dropped (kind chip kept); the quote template editor's top bar keeps the status pill only
  ("Default" and "Edited since vN" dropped — unpublished edits are said by the "Publish changes" button). Ghosts in step (library-editor-ghost
  chips, schedule-template-ghost chips, editor-skeleton one chip).
- **4-12 — built.** Price book list: the Status column declared `hidden: true` (off by default, still in Column settings; a member's stored
  column prefs still win); a waiting item shows a yellow MetaChip in its name cell (`listChips`) and on its card (`chips`) — reading **"Waiting for
  approval"** (§2 T-01 wins over the finding's "Proposed", see ▲); empty Vendor / Trade / Waste cells render nothing (was "--"); template cards'
  usage line only once used (W-049) via each gallery's `foot` (`' '` keeps the card height when unused).
- **4-17 — partly.** Payment schedule editor: tags and the meta row's duplicate note ("4 milestones · 10/30/30/30") dropped; card title
  "Milestones" → "Payments", head and field "Milestone" → "Payment", "Add a milestone" → "Add a payment", first row due "On approval" → "On signing"
  (help line "…The first is due on signing…", matching W-579); Maison AI's words say payment; W-509: the seeded default shows as "10/30/30/30"
  (gallery and editor) through `lib/templates/payment-name.ts` `paymentScheduleName` — the editor writes the stored name back unchanged until
  someone types a new name (`named` ref); W-178 schedule help "Gap = days between one milestone and the next. Use a minus number to overlap."
  **Left:** "name once in the header, rename there" — ContractHeader (fork A's) has no editable title, so the TitleInput stays on the meta row
  (request); "inputs in a table carry no floating label" — TextField cannot hide its label (B1's; also pm2-s10 reads `getByLabel('Share (%)')`).
- **4-23 — built.** Items inspector: a column card at rest = its switch + its name (+ a quiet “Heading” when the printed heading differs); its
  heading, width, alignment, ← → place and colour behind its chevron IconButton "Change the {column} column" (`data-testid="column-card-open"`,
  `aria-expanded`; one card open at a time). The first-visit hint banner removed (the inspector's empty state says the same three steps; the
  `om.tpl.hint` pref is no longer read; the editor ghost no longer draws that row on the desk, `data-seen=""`). W-408: a deleted never-published
  draft reads "This draft is deleted." (a published one keeps its sentence). W-472: the Quote settings pane's intro is one line, the rest in "How
  this works". W-274: the left tab "New quotes" → **"Quote settings"** (ghost tab width 76 → 100) — ▲.
- **4-24 — built.** The gallery pill is named by what it filters: Status (quote templates), Kind (T&Cs & Notes, Payment schedules), Use (Tasks,
  Contracts), Type (Price book); LibraryGallery's default noun "Show" → "Status"; the phone's `short` label (which dropped the noun) removed, so a
  phone reads "Kind: All".
- **4-25 (Price book part) — built.** "Kind" → **Type**: list column, item dialog field, the pill, the import mapping's "Rows with no Type",
  History's label. Markup cell "S$1,200.00" → "S$60 (32%)" form (`markupWords`: ".00" dropped, % of cost rounded; amount alone when cost is 0).
  "Unit price" was already "Unit price".
- **4-33 — partly.** lib/templates/presets.ts (the Letter house style): heading "Sales Contract" → "Quotation"; sub-heading → "QUOTATION FOR
  RENOVATION AND CARPENTRY WORKS AT THE ABOVE PREMISES"; totals "Gst {gst_rate}:" → "GST {gst_rate}:" (W-205); footer drops "Fax:{studio_fax}".
  W-421 (lib/templates/fields.ts `variationHeading`): "Variation order VO-1 — to contract OM-10009" → "Variation order VO-1 to quotation OM-10009"
  (computed when drawn — the demo changes). **Not visible in the demo:** the demo's Default Quote PDF design is stored (`quote_templates.design_json`
  + its version rows: checked, it holds "Sales Contract", "Gst {gst_rate}", "Fax:") — a repair is needed (request).
- **4-35 — partly.** Brand kit: intro one line (W-184); "Logo and marks" helper → "PNG, JPG or SVG."; Colours helper removed; Fonts helper →
  "Sizes are in points, as on paper."; the preview and the large Preview draw the default template with its own brand overrides cleared
  (`kitDesign = { ...previewDesign, brand: {} }`) so they follow the kit; the note (testid `brand-kit-own-note`) → "When it prints, {name} keeps
  its own …."; W-488 `COLOR_LABEL.band` "Band" → "Table band" (lib/templates/model.ts). **Not done:** autosave — it would remove Discard and the
  leave guard (ux-p6 S2 tests them), more than "when it saves" → kept Discard · Save changes (▲). The ghost's words are B5's (request).
- **4-36 — built.** One meta line per card: payment schedules = the split, or "n payments" where the name already is the split (+ "adds up to
  n%" when off); contract templates = "n clauses" (raw first words gone; "No clauses yet" / "Empty page"); schedules = "9 milestones · 6 weeks ·
  ready-made" (ready-made moved last); T&Cs = "Terms and conditions" / "Additional notes" (+ " · empty") in place of the capitals tag and the raw
  text; tasks = "n steps · keeps members · descriptions · due dates" ("Due dates" chip folded in). Quote template card drops "· A4" (the list's
  Paper column keeps it); "rebuilt from your quote" kept. Usage lines only when used.
- **4-37 — partly.** Price book › My Sections now opens as the list like My Items (`defaultView="list"`) with its own list ghost
  (`PriceBookSectionsGhost` in price-book-ghost.tsx; used by price-book-sections.tsx and sections-locked.tsx `SectionsLoading`); My Items' ghost
  tracks lose the Status track. Folders already come first in both views. **Left:** the "☐ Folders" heading is `FolderGroup`'s (B1) — request.
- **4-40 — built.** Item dialog: W-241 subtitle "Quotes that already use this item keep their prices."; the markup % helper and the live waste
  line kept; Website link helper → "Never printed" (W-098); the unit price, vendor (W-439), unit/trade (W-405), static waste and photo helpers
  moved into "How the Price book works" (new `components/company/price-book/how-it-works.tsx`, a text-button disclosure with a list; styles
  `.how .howChev .howList` in price-book.module.css). Import dialog: subtitle → "Excel or CSV, up to {IMPORT_LIMIT} rows." (W-470); the dropzone's
  "The book’s own export reads back in — the sheet carries no photos" (W-623) and the vendor helper moved into the same fold (testid `import-how`).
- **4-47 — built.** components/templates/render/canvas.tsx `KvTable`: a row whose value is fields that all resolved empty (`isEmptyResolved`) is
  left off — the header's Details element and the Details block alike; a row of plain words still prints.
- **W-034 — built.** Quote templates: "Awaiting approval" → "Waiting for approval" (card status line, list Status word, ribbon, filter label,
  delete rule "Waiting for approval — approve or request changes first", the editor's disabled publish button, the locked note); the to-do chip →
  "n approval(s)" (§2: chips count Approvals).
- **W-055 — built** (lib/templates/readiness.ts): "General Info › Quote Valid Until is empty." → "General info › Valid until is empty."; also
  "General info › Prepared by is empty.", "The payments add up to n%.", "Terms and conditions are empty", "Additional notes are empty".
- **Also built:** the libraries' shared Deleted sheet (library-deleted-sheet.tsx): "Empty Trash" → "Delete all forever" (button, confirm title
  "Delete all forever?", confirm button), "Delete Forever" → "Delete forever" (row, bulk bar, confirm) — W-006 / W-169's words; the gallery's
  snackbar "Trash emptied" → "Deleted forever", failure "Couldn’t delete them all forever"; sentence case: "Deleted templates / items / sections"
  (kebab row, sheet title, every delete message), "New folder" (button, tooltip, New ▾ row on a phone, NameDialog title — was "Create Folder"),
  "Rename folder", "Move to folder" (row menu, bulk bar), "Clear all" (Filters dialog), "Manage templates" (the quote template picker), New ▾ /
  first-run "Terms and conditions" · "Additional notes" · "Write terms and conditions" · "Write additional notes"; W-637 (lib/templates/picker.ts)
  "Valid 30 days" → "Valid for 30 days".

## 2 · Ledger (every moved control: what · was · now)

- Column alignment button · always on the Items column card · inside the card's chevron (`column-card-open`)
- Column "Move left on the page" / "Move right on the page" · always on the card · inside the card's chevron
- Column "Heading on the page" field and "mm" width · always on the card · inside the card's chevron
- Column Colour picker · always on the card (when on) · inside the card's chevron (when on)
- Price book Status column (Approved / Waiting for approval + "by {proposer}") · a default list column · Column settings (off by default); the waiting state also as a chip in the name cell and on the card
- "edited {when} by {who}" on library cards · the card's foot line · the list view's Updated · Updated by columns
- Unused-usage words ("Not used yet", "Not a default anywhere", "No schedule started from it yet") · the card's foot · the list's Used by / Default on column and the Deleted sheet's usage column
- Item dialog helpers (unit price "What a quote line starts at", units/trades are Settings' lists, the vendor rule, the static waste line, the link's "A product or spec page — the line keeps it", the photo line) · under each field · "How the Price book works" fold in the dialog
- Item dialog subtitle "Lines already on a quote keep what they copied; new picks take these values." · dialog subtitle · first point of "How the Price book works" (subtitle now W-241's)
- Import dialog's long subtitle, the dropzone's export line, the vendor helper · on the dialog · "How the Price book works" fold in the dialog (`import-how`)
- Quote settings pane's clauses (once you publish · quotes keep their own · Apply defaults) · the intro sentence · "How this works" fold in the pane (`defaults-how`)
- Quote template editor first-visit banner ("Click any part of the page…") · under the top bar on early visits · the inspector's empty state (its three steps)
- Template editor top-bar chip "Default" · top bar · the gallery card's Default chip; the publish dialog's "It already is."
- Template editor top-bar chip "Edited since vN" · top bar · the gallery card's "Edited since vN" ribbon; the "Publish changes" button
- Payment schedule editor chips (split, "Default on n quote templates") · header · the name and the table; the gallery card's usage line; Maison AI "Where is it used?"
- Payment schedule editor note "n milestones · split" · the name row · removed as a repeat (the name and the table say it)
- Schedule editor chips ("n milestones", "n schedules started from it") · header · the name row's note (count + weeks); the gallery card's usage line
- Task editor chips (step count, "Not used yet / Added to n leads") · header · the Steps card below; the gallery card's usage line
- Text editor chip "Not a default yet / Default on n" · header · the gallery card's usage line and the list's Default on column
- T&Cs kind tag (TERMS / NOTES) · capitals chip beside the card name · the card's meta line in words; the list's Kind column as plain text
- Tasks "Due dates" tag · chip beside the name · the card's meta ("keeps … due dates") and the list's Keeps column
- Quote template card "· A4" · the card's foot · the list's Paper column
- Contract template card raw first words · the card's meta line · the page thumbnail on the card; the list's "Starts with" column
- "Ready-made" on schedule cards · the start of the meta line · the end of the meta line
- Brand kit card helpers (logo/marks sentence, colours sentence, "Four roles a template’s text takes.") · under each card head · removed as repeats of the intro ("PNG, JPG or SVG." and "Sizes are in points, as on paper." kept)
- Brand kit preview note · "…sets its own …, so changing those here doesn’t show on it…" · "When it prints, {name} keeps its own …" (same element, testid kept)
- Price book My Sections default view · grid · list (a member's own pick `om.price-book-sections.list` still wins)

## 3 · Words

Applied (24): W-034, W-049, W-055 (readiness part), W-098, W-178, W-184, W-205, W-241, W-262, W-274, W-348, W-383, W-405, W-408, W-421,
W-439, W-470, W-472, W-480, W-488, W-509, W-536, W-623, W-637.
Partly: W-484 — the T&Cs "TERMS / NOTES" tag became sentence-case meta words; "AT HANDOVER", "STUDIO DEFAULT", "DEFAULT" stay MetaChips, which the
house piece uppercases in CSS (components/om/meta-chip.module.css, B1's) → request.
Applied beyond my rows for consistency: W-006 · W-169 (the quote sheet's rows) on the libraries' shared Deleted sheet.
Not mine (other forks' files): W-509's "Default: 10/30/30/30" label in the quote editor's payment presets (lib/quotes/payments.ts `PRESET_SPLITS`,
the parent's) — untouched.

## 4 · Probe edits (file:line — old → new), each line marked `(the calm UI build 2026-10-27, a deliberate change)`

Ours:
- price-book-parity/verify-pb-r1.cjs:33 — `combobox { name: 'Category' }` → `'Trade'`
- price-book-parity/verify-pb-r1.cjs:35 — `cats.includes('No category')` → `'No trade'`
- price-book-parity/verify-pb-r2.cjs:37 — `/proposed/i` on the card → `/waiting for approval/i`
- price-book-parity/verify-pb-r2.cjs:38 — button `'1 proposed'` → `'1 approval'`
- price-book-parity/verify-pb-r2.cjs:100 — menuitem `/Deleted Sections/` → `/Deleted sections/i`
- price-book-parity/verify-pb-r2.cjs:102 — button `'Empty Trash'` → `'Delete all forever'`
- price-book-parity/verify-pb-r2.cjs:119 — `/proposed/i` on the card → `/waiting for approval/i`
- price-book-parity/verify-pb-r2.cjs:154 — button `'3 proposed'` → `'3 approvals'`
- price-book-parity/verify-pb-r3.cjs:153 — menuitem `/Deleted Items/` → `/Deleted items/i`
- price-book-parity/verify-pb-r3.cjs:159 — button `'Empty Trash'` → `'Delete all forever'`
- price-book-parity/verify-pb-r3.cjs:160 — dialog `'Empty trash?'` + button `'Empty Trash'` → `'Delete all forever?'` + `'Delete all forever'`
- price-book-parity/verify-pb-r4.cjs:72 — Filters combobox `'Category'` → `'Trade'`
- price-book-parity/verify-pb-r4.cjs:117 — `getByText('Set category', exact)` → `'Set trade'`
- price-book-parity/verify-pb-r4.cjs:129 — `getByText('Set category', exact).click()` → `'Set trade'`
- price-book-parity/verify-pb-r4.cjs:130 — dialog `'Set category'` → `'Set trade'`
- price-book-parity/verify-pb-r4.cjs:131 — combobox `'Category'` → `'Trade'`
- folders/verify-folders-galleries.cjs:31 — button `/1 awaiting approval/` → `/^1 approval$/`
- folders/verify-folders-galleries.cjs:35 — `n('Awaiting approval')` → `n('Waiting for approval')`
- folders/verify-folders-galleries.cjs:39 — button `'New Folder'` (exact) → `'New folder'`
- folders/verify-folders-galleries.cjs:40 — dialog `'Create Folder'` → `'New folder'`
- folders/verify-folders-galleries.cjs:57 — `'New Folder'` / `'Create Folder'` → `'New folder'` / `'New folder'`
- folders/verify-folders-galleries.cjs:84 — `/1 awaiting approval/` → `/^1 approval$/`
- folders/verify-folders-galleries.cjs:86 — `/1 awaiting approval/` → `/^1 approval$/`
- folders/verify-folders-galleries.cjs:89 — `/^(approval )?\d+ awaiting approval$/` → `/^(approval )?\d+ approvals?$/`
- folders/verify-folders-galleries.cjs:118 — dialog `'Rename Folder'` → `'Rename folder'`
- folders/verify-folders-galleries.cjs:129 — menuitem `/^Deleted Templates/` → `/^Deleted templates/i`
- folders/verify-folders-galleries.cjs:139 — button `'New Folder'` (exact) → `'New folder'`
- folders/verify-folders-galleries.cjs:157 — `'New Folder'` / `'Create Folder'` → `'New folder'` / `'New folder'`
- contracts-parity/verify-ct-r4.cjs:111 — menuitem `/Deleted Templates/` → `/Deleted templates/i`
- uat-dane-2026-10-01/P1/verify-p1.cjs:57 — `tab(page, 'New quotes')` → `tab(page, 'Quote settings')`
- uat-dane-2026-10-01/P1/verify-p1.cjs:184 — (new line) `await card.getByTestId('column-card-open').click()` before reading the ← → buttons
- uat-dane-2026-10-01/P1/verify-p1.cjs:228 — header button `'Awaiting approval'` → `'Waiting for approval'`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:44 — `includes('Include proposed items')` → `'Include items waiting for approval'`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:53 — `getByText('Include proposed items')` → `'Include items waiting for approval'`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:252 — `…restore it from Deleted Items\.` → `…Deleted items\.`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:254 — `…restore it from Deleted Items.` → `…Deleted items.`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:256 — `'You can restore it from Deleted Items.'` → `'…Deleted items.'`
- uat-dane-2026-10-01/P2a/verify-p2a.cjs:262 — `…restore them from Deleted Items.` → `…Deleted items.`
- uat-dane-2026-10-01/P2b/verify-p2b.cjs:215 — note `'Default Quote PDF sets its own Brand ink, Brand grey and Band colours, and its own fonts, so changing those here doesn’t show on it. Templates that use the brand kit follow it.'` → `'When it prints, Default Quote PDF keeps its own Brand ink, Brand grey and Table band colours, and its own fonts.'`

Not ours (restated only because my words broke them):
- ui-sweep/verify-sw-r5.cjs:48 — button `/^Kind: /` → `/^Type: /`
- ui-sweep/verify-sw-r5.cjs:70 — button `'1 proposed'` → `'1 approval'`
- ui-sweep/verify-sw-r5.cjs:110 — button `'Set category'` → `'Set trade'`
- ui-sweep/verify-sw-r5.cjs:111 — dialog `'Set category'` → `'Set trade'`
- ui-sweep/verify-sw-r5.cjs:125 — button `'Set category'` count → `'Set trade'`
- ui-sweep/verify-sw-r5.cjs:165 — menuitem `/Deleted Items/` → `/Deleted items/i`
- ui-sweep/verify-sw-r5.cjs:177 — menuitem `/Deleted Items/` → `/Deleted items/i`
- ui-sweep/verify-sw-r5.cjs:209 — aria-label test `/^Kind: /` → `/^Type: /`
- pending-modules/verify-pm2-s44p.cjs:120, 138, 148, 159, 255, 279, 280 — combobox `'Category'` → `'Trade'`
- pending-modules/verify-pm2-s44p.cjs:122, 125 — `/New category…/` → `/New trade…/`
- pending-modules/verify-pm2-s44p.cjs:128, 163, 282 — dialog `'New category'` → `'New trade'`
- pending-modules/verify-pm2-s44p.cjs:146 — `getByText('Set category', exact)` → `'Set trade'`
- pending-modules/verify-pm2-s44p.cjs:147 — dialog `'Set category'` → `'Set trade'`
- pending-modules/verify-pm2-s43e.cjs:286 — `getByLabel('Category')` → `getByLabel('Trade')`
- pending-modules/verify-pm2-s43e.cjs:294 — `/No category/` → `/No trade/`
- first-run-2026-09-30/verify-first-run.cjs:47 — `['Write Terms and Conditions', 'Write Additional Notes']` → `['Write terms and conditions', 'Write additional notes']`
- projects/verify-pj-gap-c.cjs:102 — `/Ready-made · /` → `/ready-made/i`
- ux-build-2026-09-30/P6/verify-p6.cjs:114, 115 — tab `'New quotes'` → `'Quote settings'`

(Marked lines in pb-r2:124 and pm2-s44p:206 / 211 / 222 / 225 are not mine — another lane's.)
Asserting my words but left alone: consistency/verify-overlays.cjs:95 (`'Move to Folder'`, non-exact, case-insensitive → passes);
the row/sheet `'Delete Forever'` string locators (case-insensitive substring → pass); pb-r2:41 / 75 (Company panel "1 proposed", B5's words);
pb-r2:124 (the quote's Add Item "· Proposed", the parent's); export-header checks (qe-r5:136, pb-r4:81 / 86, dane-p2a:60) — headers unchanged.
Watch: ghosts probes on /company/price-book/sections (new list ghost), /templates/[id] (hint row gone), /company/templates/brand (B5's ghost
words differ until B5 lands the request).

## 5 · Requests (exact)

- **Fork A** — components/contracts/editor/contract-header.tsx: add an editable title (e.g. `titleEdit?: InputHTMLAttributes<HTMLInputElement>`,
  rendered in place of the `<h1>` with the TitleInput's pencil). Then the payment / task / text / schedule template editors pass their TitleInput
  props to it and drop the `page.meta` row (4-17 · 4-18).
- **Fork A** — components/contracts/template-screen/template-words.ts `galleryFacts`: "{n} headings" → "{n} clauses" (the desk card now says
  clauses); rc-c4-pure.mts:45 and verify-rc-c4.cjs:441 assert "headings".
- **Parent (B4)** — the quote's Add Item list marks a proposed book item "· Proposed" → "· Waiting for approval" (§2); pb-r2:124 follows.
  If W-356 renames "Section label" ("Print group"), the template inspector's "Group the items by" option (components/templates/editor/inspector.tsx
  ItemsFields, `{ value: 'section', label: 'Section label' }`) and lib/templates/picker.ts / structure-pane.tsx "By section label" should follow.
- **B1** — components/om/folders/folder-card.tsx `FolderGroup`: a `head={false}` option that hides "☐ Folders" (4-37); select-all for folders
  stays in the list view's Select all.
- **B1** — components/om/meta-chip.module.css: sentence case (drop `text-transform: uppercase`) if B1 takes 4-11's call — W-484's "At handover ·
  Studio default · Default" then read in sentence case.
- **B1** — components/om/text-field.tsx: a `hideLabel` (aria-label only, no floating label) for table cells (4-17).
- **B5** — components/company/company-ghosts.tsx `BrandKitGhost`: lead → "Your logo, colours and fonts — every template uses them."; Logo and
  marks help → "PNG, JPG or SVG."; delete the Colours `cardHelp` Words; Fonts help → "Sizes are in points, as on paper."; previewNote →
  "When it prints, Default Quote PDF keeps its own Brand ink, Brand grey and Table band colours, and its own fonts."
- **B5** — lib/company/sections.ts:44: the Templates tab "Schedules" → "Project schedules".
- **B5** — Settings › Quotes & pricing (settings-view / the New quotes start with card): "Change in Default Quote PDF › New quotes" → "… › Quote
  settings" (W-274); rwd-w4's comments name it.
- **B5** — the Company panel's "n proposed" (railBadges `company:price-book`, company-popover) → "n approvals" (§2); pb-r2:41 follows.
- **B5** — 4-39: if Price book tabs become "Items · Sections", my files' "My Items" words follow: price-book-items.tsx (ariaLabel "My Items",
  empty title "Nothing in My Items yet" + help "Save to My Items", page menu "Export My Items…", ExportDialog title "Export My Items", snackbar
  "…it’s in My Items for the studio", send-back help "The item leaves My Items"), item-dialog.tsx (button "Add to My Items").
- **Landing** — a repair (or the baseline) to rewrite the stored Default Quote PDF's words: in `quote_templates.design_json` / `draft_json` and
  `quote_template_versions` for the default: "Sales Contract" → "Quotation", "CONTRACT FOR RENOVATION AND CARPENTRY WORKS AT THE ABOVE PREMISES" →
  "QUOTATION FOR …", "Gst {gst_rate}:" → "GST {gst_rate}:", drop " Fax:{studio_fax}" (4-33).

## 6 · ▲ calls

1. Price book proposals and submitted quote templates read **"Waiting for approval"** and their to-do chips **"n approvals"** — §2's
   vocabulary over 4-12's "Proposed chip"; the chip in a list's name cell is long.
2. **REG-569 reversed**: the template editor's "New quotes" tab is now "Quote settings" (W-274).
3. **REG-228's "--" retired in the Price book list**: empty Vendor / Trade / Waste cells are blank (4-12 · T-08).
4. **Brand kit keeps Discard · Save changes** — autosave would remove Discard and the leave guard (not only "when it saves").
5. The brand kit preview draws the default template **without its own brand overrides**, so it follows the kit but is not exactly how that
   template prints; the note says what it keeps on paper.
6. The template editor's top bar loses its **Default** and **Edited since** chips (status pill only).
7. Rows whose fields are empty also leave the **template editor's canvas** (e.g. a Ref row with no sample value); the inspector still lists them.
8. Library cards no longer show "edited … by …" — list view only.
9. The Letter house style is modelled on a real studio's "Sales Contract" (Dyel's); new templates from it now say Quotation.
10. Export file headers keep "Kind", "Category" and Status "Proposed / Approved" — the import reads them back by name.

## 7 · Register rows (staged)

| REG-B4.201 | Company › Templates | **The gallery pill is named by what it filters** — Status · Kind · Use · Type, never "Show"; a phone keeps the noun ("Kind: All") — (4-24 · W-383) | user-directed |
| REG-B4.202 | Company › Templates | **One fact per card, usage only once used** — the split or "n payments" · "n clauses" · "n milestones · n weeks · ready-made" · the kind in words · steps with what they keep; no "· A4", no raw first words, no capitals tags; "edited … by" left to the list's Updated · Updated by — (4-36 · W-049 · W-484) | user-directed |
| REG-B4.203 | Company › Templates | **The library editors' headers keep one standing mark** — the payment, schedule, task and text editors' split, count and usage tags dropped; "Studio default" and the text's kind stay — (4-11) | user-directed |
| REG-B4.204 | Company › Templates › Payment schedules | **A payment schedule's rows are payments** — "Payments", "Payment", "Add a payment", "n payments", the first due "On signing"; the seeded default reads "10/30/30/30" with its Studio default chip (display map `lib/templates/payment-name.ts`; the stored name is kept until someone renames it) — (4-17 · W-262 · W-509) | user-directed |
| REG-B4.205 | Company › Templates › Project schedules | **Plain gap help and the tab's own name** — "Gap = days between one milestone and the next. Use a minus number to overlap."; the editor's crumb "Project schedules" — (W-178 · 4-06) | user-directed |
| REG-B4.206 | Quote template editor | **Column cards fold** — a column at rest is its switch and its name; its heading, width, alignment, place and colour are one press in, under its chevron — (4-23) | user-directed |
| REG-B4.207 | Quote template editor | **No repeated help** — the first-visit banner dropped (the inspector's empty state says the same three steps); a deleted never-published draft reads "This draft is deleted."; the Quote settings intro is one line with "How this works" — (4-23 · W-408 · W-472) | user-directed |
| REG-B4.208 | Quote template editor | **"New quotes" tab → "Quote settings"** — it read like a list of quotes; reverses REG-569's name — (W-274) | user-directed |
| REG-B4.209 | Quote template editor | **The top bar keeps the status pill only** — "Default" and "Edited since vN" dropped (the gallery card and the "Publish changes" button say them) — (4-11) | user-directed |
| REG-B4.210 | Company › Templates › Quotes | **A submitted template reads "Waiting for approval"** — card, ribbon, list, filter, the editor's button and locked note; its to-do chip counts "n approvals" — (W-034 · T-01) | user-directed |
| REG-B4.211 | Company › Price book | **Trade, not Category; Type, not Kind** — list columns, the item field, the pill, Filters ("Any trade"), bulk "Set trade", "New trade…", "No trade", History; stored fields and export headers unchanged — (4-01 · 4-25 · W-480 · W-536) | user-directed |
| REG-B4.212 | Company › Price book | **Only the exception shows** — Status rests in Column settings and a waiting item wears a "Waiting for approval" chip in its name cell; the to-do chip counts "n approvals"; empty cells blank (REG-228's "--" retired here); markup "S$60 (32%)" — (4-12 · 4-25 · T-01) | user-directed |
| REG-B4.213 | Company › Price book | **The dialogs' helpers behind "How the Price book works"** — one-line subtitles ("Quotes that already use this item keep their prices.", "Excel or CSV, up to 500 rows."); the markup % and the live waste line stay; the link reads "Never printed" — (4-40 · W-098 · W-241 · W-405 · W-439 · W-470 · W-623) | user-directed |
| REG-B4.214 | Company › Price book › My Sections | **Opens as the list, like My Items** — one default view for the page's two tabs, with its own list ghost — (4-37) | user-directed |
| REG-B4.215 | Company › Templates › Brand kit | **One-line intro, helpers trimmed, a preview that follows the kit** — the default template drawn with its own brand settings cleared; the note says what it keeps when it prints; "Band" → "Table band"; Discard · Save changes kept — (4-35 · W-184 · W-488) | user-directed |
| REG-B4.216 | Company › Templates · Price book | **The Deleted sheets' words** — "Delete all forever", "Delete forever"; sentence case for "Deleted templates / items / sections", "New folder", "Rename folder", "Move to folder", "Clear all", "Manage templates" — (W-006 · W-169 · T-13) | user-directed |
| REG-B4.217 | Quote print | **The Letter house style says Quotation** — "Quotation" / "QUOTATION FOR RENOVATION AND CARPENTRY WORKS AT THE ABOVE PREMISES", "GST {gst_rate}:", no Fax; a variation order heads "Variation order VO-1 to quotation OM-…" (the preset is a seed — the demo's stored Default Quote PDF needs a repair) — (4-33 · W-205 · W-348 · W-421) | user-directed |
| REG-B4.218 | Quote print | **An empty details row leaves the paper** — a row whose fields all come out empty (an "IC" with no NRIC); the template keeps the row for the quote that has it — (4-47) | user-directed |
| REG-B4.219 | Quote readiness · template picker | **One name for each field** — "General info › Valid until is empty.", "Prepared by", "The payments add up to n%", "Terms and conditions / Additional notes are empty"; the template's validity "Valid for n days" — (W-055 · W-637) | user-directed |

## 8 · Every file touched

Source (edited): components/company/price-book/bulk-edit-dialog.tsx · import-items-dialog.tsx · item-dialog.tsx · new-category-dialog.tsx ·
price-book-ghost.tsx · price-book-items.tsx · price-book-sections.tsx · sections-locked.tsx · price-book.module.css;
components/company/templates/brand-kit-view.tsx · contract-templates-gallery.tsx · library-deleted-sheet.tsx · library-gallery.tsx ·
library-toolbar-actions.tsx · payment-templates-gallery.tsx · quote-templates-gallery.tsx · task-templates-gallery.tsx · text-templates-gallery.tsx;
components/company/templates/editors/library-editor-ghost.tsx · payment-template-editor.tsx · task-template-editor.tsx · text-template-editor.tsx;
components/company/templates/schedules/schedule-template-editor.tsx · schedule-template-ghost.tsx · schedule-templates-gallery.tsx;
components/templates/editor/defaults-pane.tsx · editor-skeleton.tsx · editor-topbar.tsx · inspector.tsx · inspector.module.css · template-editor.tsx;
components/templates/render/canvas.tsx; components/templates/template-picker.tsx;
lib/templates/fields.ts · model.ts · picker.ts · presets.ts · readiness.ts; lib/company/price-book-changes.ts.
Source (new): components/company/price-book/how-it-works.tsx · lib/templates/payment-name.ts.
Probes: design-source/verify/price-book-parity/verify-pb-r1.cjs · verify-pb-r2.cjs · verify-pb-r3.cjs · verify-pb-r4.cjs;
folders/verify-folders-galleries.cjs; contracts-parity/verify-ct-r4.cjs; uat-dane-2026-10-01/P1/verify-p1.cjs · P2a/verify-p2a.cjs ·
P2b/verify-p2b.cjs; ui-sweep/verify-sw-r5.cjs; pending-modules/verify-pm2-s44p.cjs · verify-pm2-s43e.cjs; first-run-2026-09-30/verify-first-run.cjs;
projects/verify-pj-gap-c.cjs; ux-build-2026-09-30/P6/verify-p6.cjs.
Scratch (not in the repo): …/scratchpad/b4/fork-b/grepv.cjs (a probe-string finder).

**Register:** Numbered REG-3201…3258 (see build/reg-map.json) — the quotes part 3201–3224 · fork A (Contracts, signing pages) 3225–3239 · fork B (Templates, Price book) 3240–3258.
