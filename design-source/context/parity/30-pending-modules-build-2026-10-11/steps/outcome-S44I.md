# S44I · the Items table — outcome (2026-10-15)

Her ask (2026-10-15): "go through the sheet for the UAT comments from row number 246 and below to identify and fix all the UAT comments based on
our 2.0 experience without any overlaps nor any issues without losing what we have already built", the team's sections prototype, and "If you
have any questions please go ahead based on your recommendations." Package S44I = the prototype's delta B1…B12
(`design-source/context/quote-editor/04-sections-prototype-2026-10-15.md`) with its calls C1–C5, area I of the triage
(`design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md` §3, §8, §12 items 3 · 5 · 6 · 14), call C2's editor side,
the hand-offs from S44Q / S44T, and S43D's NB-05 · NB-06 · NB-07. Every call taken **as recommended — her ask 2026-10-15**. Built in lane E
(port 3185). Register rows: `steps/reg-S44I.md` (REG-S44I.1…27). **No migration, no repair** (S44T's 0111 columns carry everything; R174…R179
unused).

## Ledger — the prototype's delta (B1…B12)

| Item | Status | Where |
|---|---|---|
| B1 server groundwork | **Built** | `app/quotes/items-actions.ts` — `ItemsPlace` (before / after / first / last in a section) on `createQuoteItems`, `unit` on a new line, `addQuoteItem` · `addQuoteItems` answering refusals, "New sub-section", `groupQuoteItems` (refusal + anchor fixes), `moveQuoteItems` (one write, status / trade follow); pure `groupLevel` · `moveTargets` · `carried` in `lib/quotes/math.ts`. REG-S44I.1 |
| B2 Collapse / Expand all | **Built** | Toolbar (`data-testid="toolbar-fold"`), the folded kebab, the head glyph; one snapshot, one ⌘Z; buckets read by the same rule. REG-S44I.2 |
| B3 a section's foot | **Built** | `SectionFoot` in `items-table.tsx`; ⋮ › Add Item › Add sub-section; the phone's "Add to {section}" sheet (`item-cards.tsx` `SectionAdd`). REG-S44I.3 |
| B4 drag | **Built** | `row-drag.ts` (30 / 40 / 30 zones, `into`, `end`, carried rows, `fits()`), `commitDragMany`; the C1 parts rule. REG-S44I.4 |
| B5 Add Item › | **Built** | `table-menus.tsx` RowMenu (Above · Below / At the top of the section · Several… with the house `CountStepper` · Add sub-section · From Price book… · Paste lines…); `components/om/count-stepper.tsx`. REG-S44I.5 |
| B6 Price book place | **Built** | `price-book-dialog.tsx` `place` · `placeText`; `addFromBook(…, place)`. REG-S44I.6 |
| B7 Paste lines | **Built** | `paste-items-dialog.tsx` (typed box, `PlaceFoot`, place chips), `lib/quotes/clipboard.ts` `stripListMark`. REG-S44I.7 |
| B8 bulk bar | **Built** | Group into section / sub-section, Move to section ›, Out of the section, Highlight › (`items-section.tsx`). REG-S44I.8 |
| B9 Move to section names the parent | **Built** | "Cabinetry · in Kitchen". REG-S44I.9 |
| B10 Enter adds another | **Built** | `chainId` + `onChainKey`; the hint `<Keys>` line. REG-S44I.10 |
| B11 branches | **Built** | `Guides` in `item-row.tsx`, `.gPass / .gBranch / .gStem`; children's tint and 4px bar gone. REG-S44I.11 |
| B12 kept | **Kept** (C2 · C3 · C5) | REG-S44I.12 |

## Ledger — every row of area I (and the rows the prototype carries)

| Row(s) | Studio | Status | Where / why |
|---|---|---|---|
| 249 · 264 | Dyel | **Built** (M14's quote half) | A label added in another case is the one already on the quote; menus list each name once. REG-S44I.15. (Settings › Trades' half is S44P's.) |
| 250 | Dyel | **Already** + **Built** (B2) | Every section folded one by one already; Collapse All / Expand All now folds every section. |
| 259 · 269 | Dyel | **N/A** | No colour modal, no Sections modal in 2.0 (the house menu closes on a press outside, Esc or scroll; dialog heads stay put). |
| 260 · 263 | Dyel | **Already** + **Built** (B4) | A sub-section drags within / between sections; now with the before / into / after zones and multi-line drag. |
| 261 | Dyel | **Built** (B3 · B5) | *Add sub-section* on a top section's ⋮ and its foot; a new section shows with its number and its foot. |
| 262 | Dyel | **Already** | Rename in place sticks; 2.0 has no Sections drawer (an empty section shows in the grid with "Nothing in {section} yet —"). |
| 268 · 275 | Dyel | **Built** (M3 storage half) | `keptText` keeps paragraphs, blank lines, breaks, alignment, kit colours, pictures. REG-S44I.13. (Print half S44T's.) |
| 277 · 278 · 280 · 281 · 317 · 318 | Dyel | **Built — grid side** (S44T's call C1) | The divider "Priced after the contract", new rows above it, drag keeps each part, phone cards carry it. REG-S44I.23 |
| 284 | Dyel | **S44T's** (the print sort) | — |
| 287 | Dyel | **Kept** (C2 (c)) | No per-line size. |
| 290 | General | **Built** | A new section's name box offers the studio's trades. REG-S44I.19 |
| 291 | General | **Already** + **Built** (B8) | The bulk bar now also groups, moves in / out and highlights. |
| 292 · 296 · 320 · 348 · 349 | IDL · Cite · Spaces | **Already** | As the triage reads (revision marks, Vendor/Sub, Cost · Markup · Unit price by rule, editable in the row). |
| 298 · 307 · 326 · 327 | IDL · Spaces | **Built — editor side** (C2) | *Words on this line*: name with bold · italic · underline · strike · breaks; kit colours in names, descriptions and notes; underline / strike take the colour; colour survives bold; through the allowlist. REG-S44I.22 (print S44T's). |
| 308 | IDL | **Built** | The grid numbers what the print numbers. REG-S44I.20 |
| 316 | — | **Built** | Empty sub-sections stay out of My Sections. REG-S44I.17 |
| 323 · 274 | Spaces | **Built** (M17, menu **and** print) | Print as on a section; the word in the band's amount place, sub-totals on or off. S44T didn't build the band, so it is built here (`lib/templates/item-sections.ts` + `slices.tsx`). REG-S44I.16 |
| 325 · 350 | Spaces | **Built** (M9) | Settings › Quotes & pricing › Units (on S44P's pieces: `listedAs`, the lit token, the 60 cap); the type-ahead Unit menu; every picker reads the studio's units; the Price book item dialog's *New unit…* (`new-unit-dialog.tsx`, `addUnit`). REG-S44I.14 |
| 328 | Spaces | **N/A** — ops after C2 (now built). |
| 335 | Spaces | **Built** | A refused add says why; the table reads itself again. REG-S44I.18 |
| 352 (third part) | — | **Built** | Column settings' note + Preview `?panel=client`. REG-S44I.24 |
| §12.1 (allowlist) | — | **Already** (S44Q) | Every name / description HTML goes through `cleanRichHtml` on save (kept; no second allowlist). |
| §12.3 · §12.5 | — | **Built** | = M3 · 308 above. |
| §12.6 | — | **Built** | Section note… / Words on this line… in ⋮. REG-S44I.21 |
| §12.14 | — | **Built** | Highlight in the bulk bar. REG-S44I.8 |
| NB-05 | — | **Built** | `ownUndo` — a snackbar's Undo takes back its own action only. REG-S44I.25 |
| NB-06 | — | **Built** | `lib/quotes/bills-project.ts`; `updateQuotePricing` refuses; the select says why. REG-S44I.26 |
| NB-07 (a) (b) | — | **Built** | Pictures in section notes; "Own rate". REG-S44I.27 |
| NB-07 (c) | — | **Not built — kept** | REG-477's fill copies one source cell; a series needs a second selected cell to read its step from — a new selection model, not "little cost". |

## The sheet's answers for these rows

- **249 / 264** — A Category, Room or Section label you type that matches one already on the quote in another case now becomes that one,
  and the menus list each name once.
- **250** — Every section and sub-section folds; *Collapse All* in the Items toolbar folds them all at once (and *Expand All* opens them).
- **259 · 269** — 2.0 has no colour window or Sections window; the Highlight menu closes on a press outside, Esc or scroll.
- **260 · 263** — Drag a sub-section by its handle within its section or into another; drop on a section's middle to put rows *into* it.
  Tick several lines and drag one to move them all.
- **261** — A section's ⋮ › Add Item › *Add sub-section*, or *+ Add sub-section* at the end of the section.
- **262** — Press a section's name to rename it; an empty section stays in the table and says "Nothing in … yet".
- **268 / 275** — Descriptions now keep their paragraphs, blank lines and alignment.
- **277 … 318 (Estimation Direct)** — A top section's ⋮ › *Price after the contract*; the table gathers those sections at its end under
  "Priced after the contract".
- **287** — No per-line size (Call C2): one Descriptions style keeps the print even.
- **290** — Name a new section: its box offers your trades (Settings › Trades); pick one and its lines file under that trade.
- **291** — Tick lines: the bar offers Copy, Set value, Group into section, Move to section, Out of the section, Highlight, Print as, Hide
  from client and Delete.
- **298 · 307 · 326 · 327** — ⋮ › *Words on this line…*: format the name (bold, italic, underline, line breaks) and colour words in the name
  or the description with your brand kit's colours (set Accent to your brand colour in Company › Templates › Brand). Underline takes the
  colour; colour survives bold.
- **308** — The table's numbers now skip what the print skips (hidden lines, empty sub-sections).
- **323** — A section's ⋮ › *Print as* › Complimentary (FOC), Inclusive, … or your own word: the word prints in the section's amount place,
  sub-totals on or off, and its lines print no amounts.
- **325 / 350** — Settings › Quotes & pricing › *Units*: add your own units (Spaces' ten); the Unit menu lists them all and narrows as you
  type.
- **335** — If an add is refused, the message now says why.

## Calls taken as recommended
- **C1 (prototype)** build the branches; **REVERSES REG-457 and REG-440's child half** (children's tint, the 4px bar).
- **C2 (prototype)** keep the edge + (REG-527). **C3** keep the one-press +; the menu rows go into ⋮ › Add Item › and the foot. **C4** Enter
  adds another only on a just-added line. **C5** keep 2.0 where the prototype differs.
- **Triage C2, editor side** — names take emphasis + breaks; kit colours only; **REVERSES REG-557's "no colour inside text"** (REG-556's
  kit-only rule kept); no per-line size.
- **M9** the studio's units as the Trades card's twin, seeded with the seven; **M17** Print as on a section (and its band print, unbuilt by
  S44T); **290** trades in the new section's name box; **NB-07 (c)** kept.
- **REG-653's surface** — the Add Item box's place line is gone; a row's pick lands where the row asked through REG-662's modal.
- **Buckets' fold rule unified** — the head glyph reads Collapse all while anything is open (it read Expand all once any bucket was folded).

## Hand-offs done
- **S44T** — C1's divider row and the grid's part rules; C2's editor side (writes `quote_items.name_html` through `cleanRichHtml` →
  `narrowNameHtml`, kit keys only; `name` keeps the plain words); M3's storage half. S44T's lines in `items-actions.ts` / `table-menus.tsx` /
  `item-row.tsx` / `items-section.tsx` kept.
- **S44Q** — row 352's third part (Column settings' note + `?panel=client`).
- **S43D** — NB-05 · NB-06 · NB-07 (a)(b); (c) kept, above.
- **S44P** (landed ~11:45, the coordinator's list `s42/s44p-into-E.txt`) — every file pulled into lane E: 11 changed with
  `git merge-file <lane> <E.base> <main>`, the four new ones copied (the outcome too). Three conflicts, resolved by keeping both sides:
  `settings-view.tsx` (imports), `item-dialog.tsx` (`units` beside `canAddTrade`; the studio's units inside S44P's new Cost · Markup · Unit
  price block), `price-book-items.tsx` (`units` beside `canAddTrade`). Built on its pieces as asked: the Units card speaks `listedAs`, lights
  the matching token (`data-match`, the lit-entry style), holds 60 and says so (`UNITS_MAX` · `UNITS_FULL` · `UNITS_RULE` in
  `lib/settings/units.ts`, after `lib/settings/trades.ts`); `renameUnit` refuses with `listedAs`; **New unit…** uses the select's new `action`
  row (`new-unit-dialog.tsx` after `new-category-dialog.tsx`; `addUnit` in `app/settings/actions.ts` after `addTrade`, answering `{ error }`).
  S44P's probe runs green on the lane (65/65).
- **S44F** (landed ~15:40) — its 24 code files pulled the same way (base = lane B's base, theirs = lane B = main for each): 17 copied, 6
  merged, 1 added; two conflicts resolved: `preview/page.tsx` (S44F's `against` beside S44I's `panel`) and `slices.tsx` (its `sections()` is S44F's
  `lib/templates/item-sections.ts` now — **M17's changes moved there**, nothing re-added in `slices.tsx`). `app/leads/quotes-actions.ts`
  (never an S44I file) is main's copy. M17's lines under a word reach a client page as `noPrice` lines, so `clientSafe` / `pricedLineIds`
  already send them no price and the section's sum comes from the server's `sums`. S44F's probe runs green on the lane (101/101).

## Shared pieces changed
- `components/om/count-stepper.tsx` (+ `.module.css`) — moved from `components/credits/` (that path re-exports it; its CSS deleted).
- `components/quotes/editor/text/rich-editor.tsx` — props `tools: 'all' | 'inline'`, `colors` (kit text colours), `pictures` (notes);
  **kept reusable for NB-08** (the template's Text block): pass `colors={kitTextColors(brand)}` and, for a block, `tools="all"`.
- `lib/templates/item-sections.ts` (S44F's `sections()`) — M17's section word (`Line.underWord` · `Area.word` · `Section.word`);
  `components/templates/render/slices.tsx` draws it (band, sub-section row, lines without amounts, phone cards); `document.module.css` `.rich img`.
- `lib/quotes/math.ts` — `withSectionWords` in `countedLines` · `groupTotals` · `quoteTotals` · `categoryShares`; `rowOrder` (top-level
  priced-after last) in `flattenItems` / `numberItems`; `whyNoNumber` skips hidden lines and empty sub-sections. Quotes without a section word
  or a priced-after mark total exactly as before.
- `lib/xray/lines.ts` reads lines through `withSectionWords`.
- `lib/quotes/items-model.ts` (`plainToHtml`, `keptText`, `narrowNameHtml`, `nameFromHtml`, `NAME_TEXT_COLORS`), `lib/quotes/clipboard.ts`.
- Units: `lib/settings/units.ts`, `fetchUnits` · `setUnits` · `renameUnit`, `app/settings/units-card.tsx`, `settings-view.tsx`, ⌘K's
  settings card; read by `lib/quotes/editor.ts`, `lib/company/price-book.ts` (+ item / section / import dialogs), `app/company/price-book-actions.ts`,
  Choices (`lib/projects/choices*.ts`, `save-option-dialog.tsx`, `choices-actions.ts`) and the Marketplace (`lib/marketplace/*`,
  `add-product-dialog.tsx`, `brand-page.tsx`, `app/marketplace/actions.ts`).
- `components/quotes/preview/quote-preview.tsx` `openPanel` + the page's `?panel=client`.
- Probes updated for deliberate changes (each commented): `verify-pm2-s29.cjs`, `verify-pm2-s44q.cjs` (the dialog's name), `ui-sweep/verify-sw-r5.cjs`,
  `price-book-parity/verify-pb-r3.cjs` (the modal takes the row's place).

## For other packages / the orchestrator
- **Landing:** lane E already carries S44T (merged ~10:40), S44P (~11:40, re-checked against `s44p-into-E.txt` after 14:50) and S44F (after
  15:40), each through `git merge-file`. `merge.py` with base = `E.base` (main at 10:08) will read the lines I extended on top of theirs as
  conflicts. Checked file by file against main as it is now (after S44F):
  - **42 files the lane changed equal main's** (S44T's, S44P's, S44F's — no S44I change): `merge.py` skips them.
  - **53 changed + 6 new + 1 deleted are S44I's** (the deleted one `components/credits/count-stepper.module.css`, moved to `components/om/`):
    for each, **lane E's copy is main's plus S44I** — every line main added since `E.base` is in the lane's copy except the ones S44I
    rewrote (checked line by line) — so take the lane's copy.
  - **`lib/templates/item-sections.ts`** (S44F's new file): `merge.py` will call it *BOTH ADDED, different (main kept)* — **take the lane's**:
    it is S44F's file plus M17's section word (`Line.underWord` · `Area.word` · `Section.word`), moved there from `slices.tsx` as you asked.
  - **`scripts/repair-demo-data.ts` — keep main's.** S44I adds no repair; the lane's copy differs only because it never received S43C /
    S43D's repairs (R162 …).
- No migration, no repair; `design-lint.baseline.json` untouched (one file now holds fewer than its baseline — may be lowered at landing).
- **NB-08**: reuse `RichEditor` (`colors`, `tools`, `pictures`) for the template's Text block; the stored mark is `<span data-kit="KEY">`.

## Checks
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (17 warnings, all existing `<img>` / hook-deps ones) ·
  `npm run design:lint` green (inline-style 41 / 42 — one file now under its baseline; `design-lint.baseline.json` left as it is).
- Production build under the lock (`DATABASE_URL` = a scratch copy): exit 0 — the last one after the S44F merge (tsc · eslint · design:lint
  re-run then too: same results).
- **My probe** `design-source/verify/pending-modules/verify-pm2-s44i.cjs` on :3185 against a migrated + repaired copy of `pbuild/base.db`:
  **110 / 110** — 1440, 390 touch, 768 touch; it puts every record back (a checksum of `quote_items`, `settings`, `price_book_sections`,
  `price_book_items` and `quotes` before = after; a unit renamed in Settings is put back in every quote and My Section). Logic probe
  `verify-pm2-s44i-logic.ts` (tsx): **33 / 33**. Both re-run on the post-S44F build: 110 / 110 and 33 / 33. Shots banked in `design-source/verify/pending-modules/pm2-s44i/` (12).
- Regression (`design-source/verify/regression/run.cjs`, RUN_DIR + :3185): qe-r1 34 · qe-r2 33 · qe-r3 21 · qe-r4 14 · qe-r5 21 · pb-r1 18 ·
  pb-r2 41 · pb-r3 30 · pb-r4 32 · tpl-parity 20 · sw-r5 33 · sw-r1 34 · dane-p3 71 · dane-p1 47 — all green. On the **final** build (after
  the S44P merge, New unit… and the foot's spoken names) again: qe-r1 34 · qe-r2 33 · qe-r3 21 · qe-r4 14 · qe-r5 21 · tpl-parity 20 ·
  sw-r5 33 · sw-r1 34 · dane-p3 71 · dane-p1 47 · pb-modal 18 · pb-r1 18 · pb-r2 41 · pb-r3 30 · pb-r4 32 · sw-r4 35 — all green (pb-modal
  had stopped on two buttons named "Price book" — the foot's now say whose end they add to). On the **post-S44F** build: qe-r1 34 ·
  qe-r2 33 · qe-r3 21 · qe-r4 14 · qe-r5 21 · tpl-parity 20 · dane-p1 47 · dane-p3 71 · sw-r5 33 · sw-r1 34 · pb-modal 18 · pb-r3 30 — all green.
- Pending-modules / parity probes on the lane (`run-env.sh`, :3185): pm2-s44p 65 · pm2-s44q 52 · pm2-s44t 69 · pm2-s12 72 · pm2-s04 82 ·
  pm2-s29 88 · pm2-s21 41 · pm2-s24 132 · pm-a 47 · pj-gap-d 65 — all green; on the post-S44F build pm2-s44f 101 · pm2-s44t 69 ·
  pm2-s44q 52 · pm2-s04 82 — all green.
- Page errors: none in any probe; no sideways scroll at 390 / 320.
- :3185 stopped; the build lock released; `local.db`, main and `E.base` untouched.

## What to check in the browser (Dane · Owner; Germaine · Designer)
1. OM-10001 › Items: Collapse All / Expand All; a section's foot (+ Add item · + Add sub-section · Price book · Paste lines); a line's ⋮ ›
   Add Item › Several… › 5 below; Enter on the new line adds another, Esc ends it.
2. Tick three lines → Move to section › a sub-section · Out of the section · Highlight; drag a ticked line onto a section's middle.
3. A section's ⋮ › Print as › Complimentary → Preview: the word in the band, no amounts on its lines; the total without them.
4. A line's ⋮ › Words on this line…: bold a word, break the name, colour a word Accent → the row and Preview.
5. Settings › Quotes & pricing › Units: add "sqft", rename it, remove with Undo; the Items Unit menu: type "sq".
6. A new section: type "Carp" in its name → Carpentry Works.
7. On a phone (390): "Add to {section}" after a section's last card; the divider for priced-after sections.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — the prototype and the triage stood in for mocks; every built difference has a row
   (REG-S44I.1…27) with its invented words flagged and its reversals named (REG-457, REG-440 child half, REG-557, REG-653's surface).
2. **One system, no one-offs** — the house `PortalMenu` + `DropdownItem`, `Chips` for places, `CountStepper` moved into `components/om`, the
   house `Dialog`, `RichEditor` extended rather than copied, one refusal path (`refuse` → `couldnt`), one set of totals (`math.ts`) for the
   grid, the print, the client pages and the X-Ray.
3. **Plain words** — "Add item", "Add sub-section", "Group into sub-section", "Out of the section", "Words on this line", "Units"; no codes.
4. **Nothing is lost** — every add, move, group, fold, Print as and highlight has ⌘Z and a snackbar Undo; removing a unit keeps it on its
   lines; a plain name keeps search / X-Ray / exports; a description's shape survives a save; an empty sub-section is never saved.
5. **Say why** — every refusal names its rule (two levels deep, priced after the contract, a project's issuing entity, a gone section);
   disabled rows say why in the row; Undo after a later edit says it can't.
6. **Back returns where you came from** — no new route; Column settings' Preview link keeps `?from=`.
7. **Every screen is whole** — no new page; Settings' Units card is part of the existing ghosted page.
8. **Every width is designed** — 1440, 768 touch and 390 touch checked: the foot is one line, the phone's sheet holds the four adds, no
   sideways overflow.
9. **Tables follow the leads listing** — the Items grid keeps its model; the foot and the divider are rows of it, skipped by the keyboard grid.
10. **Motion with purpose** — the lift and the drop ring only; new lines pulse once (`attention()`).
11. **Honest data** — nothing seeded; the probe puts every record back (checked by a checksum of `quote_items`, `settings`, `price_book_items`,
    `quotes`).
12. **Reach for everyone** — 36px targets on the foot's buttons, labelled menus and steppers, the type-ahead lists are listboxes with ↑ ↓
    Enter Esc, the chain hint is spoken as keys.
