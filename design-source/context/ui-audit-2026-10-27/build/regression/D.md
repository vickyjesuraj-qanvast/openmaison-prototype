# Triage D — B4's area (quotes, contracts, templates, Price book, sign, confirm) — closing regression, 2026-10-28

Port 3488, run dir `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-D`
(its `summary.txt` and `lanes/<id>/probe.log`). Every run was on the current build (01:28) through `heavy.sh probes`, each probe on its own
copy of the fresh base. Every restated probe line carries `(the calm UI build 2026-10-27, a deliberate change)`. One source fix, in my files, for a defect E found
(R2, the Price book ghost at 390, below) — it needs the rebuild.

## Result

| Probe | Regression (01:28 build) | Now, same build |
|---|---|---|
| pb-r1 | 1 fail | **18 / 0** |
| pb-r2 | 1 fail | **41 / 0** |
| pb-r3 | 1 fail | **30 / 0** |
| tpl-parity | 4 fail | **20 / 0** |
| folder-crumbs | crashed | **8 / 0** |
| thumbs-rest | 1 fail | **17 / 0** |
| dane-p2a | 1 fail | **54 / 0** |
| dane-p3 | 2 fail | **70 / 0** |
| dane-p4 | 4 fail | **40 / 0** |
| sw-r5 | 1 fail | **33 / 0** |
| rq-k1 | 1 fail | **116 / 0** |
| pm2-s05 | crashed | **114 / 0** |
| pm2-s41b1 | stopped | **111 / 0** |
| pm2-s42b | stopped | **65 / 1** — the one left is B-20, a Defect waiting on F's source fix (below) |

## Every failing check

| Probe | Check | Class | What I did | Result |
|---|---|---|---|---|
| pb-r1 | unset, the trades say they come from the quotes and My Items | Stale | W-574 removed the line "Not set yet — these are the trades your quotes and My Items already use" from Settings › Trades. The same rule is now checked on what the card lists. There is no `trades` row, and the names on the chips equal the union of the categories that `quote_items` (items) and the live `price_book_items` use. | green |
| pb-r2 | the Company panel says one is proposed | Stale | §2 Approvals: the panel's Price book badge reads "1 approval". The badge is still drawn (`company-popover.tsx` `approvals(proposed)`), so the signal is not lost. Restated to `/\b1 approval\b/`. The Designer's counter-check (line 76, "no queue to answer") now also refuses `n approvals`, so it is not trivially true. | green |
| pb-r3 | New section writes on Save … (snack "Probe section added to My Sections") | Stale | The snackbar names the library's top by its tab, "Sections" (`LIBRARY_ROOT`, 4-39). Restated to "Probe section added to Sections". | green |
| tpl-parity | profile: socials, SWIFT, a second entity with its letterhead | Stale | Company › Profile is four tabs now (5-36), with one "Save" in the header (5-18). The socials are filled and saved on Details. The bank, SWIFT, the second entity, its letterhead and its logo are filled and saved on `?tab=entities`. Then the same `brand` read. | green |
| tpl-parity | letterhead: the entity name, its address and its GST number | Cascade | (from the profile step) | green — the entity prints its name, address and GST number |
| tpl-parity | letterhead: the entity logo replaces the brand logo | Cascade | (from the profile step) | green — the entity's logo prints on the quote |
| tpl-parity | footer prints the handles with their marks | Cascade | (from the profile step) | green |
| folder-crumbs | crashed waiting for button "Price book" | Stale | 4-03: the link under the table is gone. The probe now opens the Price book through Create ▾ › From Price book, as pb-modal does. The next two openers would have failed the same way, so I restated them too: New task ▾ › "From a template" (was Use Template, W-021) and New contract ▾ › "From a template" (was From Template, W-199). | green 8/8 |
| thumbs-rest | Price book: Status column second, no chip in the name cell | Stale | 4-12 · REG-B4.212 (fork B, ▲1) reversed REG-820. Status now rests in Column settings, and the waiting item wears a "Waiting for approval" chip in its name cell. Restated to that rule. At rest, the list has no Status head and the drawer's "Show Status column" switch is off. With it on, Status is the second column and reads Approved / Waiting for approval. Every waiting row wears the chip and no approved row does. Then it is turned off again. | green |
| dane-p2a | 3.03 at the top, it lands at the top and says My Items | Stale | The snackbar says "added to Items" (`LIBRARY_ROOT`). Restated. | green |
| dane-p3 | g-categories (`viewBy(None)` after a Jump to pick timed out on the "View by:" row) | Stale | 4-03 moved View by into the Items ⋮ (⋮ → View by › → radio), a `PortalMenu`. That menu closes on any scroll more than 250 ms after it opens (REG-416). Jump to's smooth centring was still running, so the menu shut before its row was pressed. This is why B4's notes saw it time out "under load". The helper now waits for `#section-items` to stop moving before it opens the ⋮. No check is changed. | green (70/70) |
| dane-p3 | g-signature Members says "Signature: not set" while it isn't | Stale | 5-01 (B5): your row's second line is the way to add it, "Add your signature" (`member-signature`). The drawer says "Your signature isn’t set yet". Restated to `member-signature` holding "Add your signature". The later counter-check (line 324, "no longer says not set for you") looked for the old "Set it up", so it was trivially true. It now looks for "Add your signature". | green |
| dane-p4 | k-contracttime the tab keeps the date and says its time on hover | Stale | T-11 · 3-20: `displayDateTime` writes the house dot, "8 Sep ’26 · 11:30 AM" (was ", "). The time is still in the tooltip. Restated the regex to ` · h:mm AM`. | green |
| dane-p4 | k-contracttime Tools › Contracts too | Stale | (same) | green |
| dane-p4 | b-creating (menuitem "From Template") | Stale | W-199: "From a template", on the lead's tab and in Tools › Contracts. | green |
| dane-p4 | 12.10 link row | Cascade | The link row needed `FRESH`, the contract that b-creating makes. | green |
| sw-r5 | grid tick, import, section editor (`library-card` on Sections) | Stale | 4-37: My Sections opens as the list, like Items (the grid stays a member's pick). The first list row's Open opens the section editor. | green |
| rq-k1 | ⋮ is a sheet grouped Look · Change · Share · Export | Stale | T-06 · W-101 (`components/leads/menus.module.css` `.label`): a group's title is sentence case, no longer CSS capitals, so the old `innerText` "LOOK" was gone. The check now reads the four `[data-menu-label]` titles in order. "…every desk action is in it (nothing lost)" still passes: all 16 rows are there. | green |
| pm2-s05 | crashed waiting for "Blank Quote" | Stale | 2-51 · T-13: "Blank quote" (sentence case). The quote it makes still carries the second client. | green |
| pm2-s41b1 | stopped at "Column settings" (the button) | Stale | 4-03: Column settings is the Items ⋮'s row. | green |
| pm2-s41b1 | (behind it) stopped at button "Undo" | Stale | 4-03: Undo is the Items ⋮'s row (⌘Z unchanged), as qe-r1 presses it. | green (111/111) |
| pm2-s42b | stopped at "Bold" (B-19, the signed contract's bar) | Stale | 4-18 · REG-B4.104 (fork A): a signed contract's bar shows no formatting tools at all, only the Outline toggle. Before, the tools were greyed and did nothing. Restated: the locked bar (`data-locked`) is there, no Bold button, the Outline toggle inside it, and the banner says why ("this copy is locked" or "kept as it was"). | green |
| pm2-s42b | (behind it) stopped at "Additional Notes" | Stale | W-200 · T-13: the section is "Additional notes". | green |
| pm2-s42b | (behind it) B-20: the snackbar keeps the section's own title | **Defect** | See *Defects*. Restated to the same rule on the title's new words (`/Added to Additional notes/`). The screen says "Added to the additional notes". | **left — needs F's source fix, then a rebuild** |
| pm2-s42b | (behind it) a text PDF reads from its own words — 23 lines | Stale | §2 · 4-28: a quote's lines read as "items" (`upload-reading.tsx`, "23 items read from …"). | green — see pm2-s42b's last line |
| pm2-s42b | (behind it) the renamed Cove quote is still Cove's — 20 lines | Stale | (same, "20 items") | (same) |
| pm2-s42b | (behind it) the trial: a text PDF reads from its own words | Stale | (same — the trial shares `UploadReading`) | (same) |
| pm2-s42b | (behind it) the menu says what the dialog reads (D-08) | Stale | 3-26 · T-05 (B3): New ▾ on a project's Payments is five kinds with no helper lines. Variation order opens its ways in place, and "From a contractor’s quote" is one of them. The D-08 rule is kept: the way promises nothing the dialog doesn't read (no "photo"), and the dialog says "a spreadsheet of its lines (XLSX · CSV) or a PDF". | (same) |

pm2-s42b's last run on this build: 65 ok · 1 fail (B-20 alone).

### Raised by E (pm2-s17 is E's probe; the files are mine)

| Probe | Check | Class | What I did | Result |
|---|---|---|---|---|
| pm2-s17 | 390 co-pricebook: the ghost's blocks stand where the page's land (folder-card.group · cards Δy 48) | **Defect** (a ghost drifted from its page) | See *Defects* 2. | **needs rebuild** (and F's seed line for the loader's first visit) |

## Defects (for Vicky)

1. **The writing help's "Add what’s missing" snackbar no longer keeps a quote section's own title.**
   - **What changed:** S42 B-20 made it say "Added to Additional Notes". It now says "Added to the additional notes" (and "Added to the terms and conditions").
   - **Why:** `doneWords` in `lib/writing/propose.ts` decides a label is a title by a capital after a space (`/\s[A-Z]/`). This build made the section titles sentence case (`lib/quotes/text.ts` `TEXT_LABEL`, W-200), so the test no longer finds them.
   - **Size and owner:** words only; nothing is lost. The fix belongs to F (`lib/writing/` and `components/writing/` are B1's); the request is below.
   - **Proof:** `git diff HEAD -- lib/writing/propose.ts` is empty, and `lib/quotes/text.ts` changed `'Additional Notes'` → `'Additional notes'`.
   - pm2-s42b's B-20 check stays red until that lands and the app is rebuilt.

2. **The Price book › Items ghost no longer stands where its page lands on a phone** (E's R2; pm2-s17 at 390, Δy 48).
   - **Why:** 4-24 took the scope pill's short label away, so at ≤1024 the pill says "Type: All" (117 px), not "All" (72 px). With a waiting item's to-do chip in front of it ("1 approval", shown short as "1"), the bar's two groups no longer fit one line at 390. The tools wrap to a second row, 84 px tall. The ghost still drew one 72 px pill and no chip, on one row.
   - **Fix (my files):**
     - `library-gallery.skeleton.tsx`: a new `PillBone` draws a pill or to-do bone at the pill's own size. It holds the house pill's own box (`scope-pill.module.css`) with its words hidden, and the bone covers it. `LibraryGalleryGhost`'s `pill` now also takes the pill's words, and a new `todos` prop draws the to-do chips before it. With `pill={true}` (Templates, the Visualizer, the Planner) nothing changes.
     - `library-gallery.module.css`: `.gPillBox` and `.gPillBone`.
     - `price-book-ghost.tsx`: `pill="Type: All"`, plus the to-do chip while items wait. The count comes from `todo` (the page's reveal) or else the remembered count `om.shape.lib.price-book-items.todo`, whose fallback is the seed `lib.price-book-items.todo`.
     - `price-book-items.tsx`: the shell's skeleton is told `proposedCount`, and the page remembers it (`setCountPref`).
   - **Status:** needs rebuild. Until F adds the seed line (request below), a browser's *first* loader draws no chip, while the reveal already does.

**Neither defect loses a feature.** Nothing in these 14 probes showed a lost feature.
- The Company panel's Price book badge is still drawn ("1 approval").
- The Status column is still in Column settings.
- Every row of the quote's ⋮ is still there.
- An issuing entity's name, address, GST number and logo still print on its quotes.

## Requests for other areas

- **F — `lib/writing/propose.ts` + `components/writing/writing-help.tsx` (the B-20 defect):**
  - In `doneWords`, take a fourth argument `title = false` and use it in the `'expand'` case:
    `case 'expand': return title || /\s[A-Z]/.test(label) ? \`Added to ${label}\` : \`Added to the ${low}\``
  - In `writing-help.tsx:145`, pass it when the whole section is the target:
    `doneWords(p.action, part && part.key !== 'whole' ? capital(partWords(part)) : label, blank, !(part && part.key !== 'whole') && (kind === 'terms' || kind === 'notes'))`
  - Use the hook's `kind`. `WritingKind` already has `'terms' | 'notes'`.
  - The snackbar then reads "Added to Additional notes" / "Added to Terms and conditions" again, and pm2-s42b's B-20 check passes on rebuild.
- **F — `lib/ghost-shapes.server.ts` (the loader's half of defect 2):** add one seed flag, next to `'lib.price-book-items'`:
  ```ts
  'lib.price-book-items.todo': await db.select({ status: priceBookItems.status, createdBy: priceBookItems.createdBy }).from(priceBookItems)
    .where(and(eq(priceBookItems.status, 'proposed'), isNull(priceBookItems.deletedAt)))
    .then((rows) => rows.some((r) => itemVisible(viewer, r))).catch(() => false),
  ```
  - Import `itemVisible` from `@/lib/company/price-book-rules`; the file already imports `priceBookItems` and the drizzle helpers.
  - This is the page's own rule: its chip shows while an item it lists waits.
  - The loader (`loading.tsx`, server-rendered with no data) then draws the chip the reveal and the page draw. Without the flag, ghosts-same-390's co-pricebook may differ while a proposal waits: a browser's first loader has no chip, but the reveal has one.
- **None to E:** the Members signature line ("Add your signature") and Profile's tabs are as B5 designed them; the probes were restated. pb-r2 was already restated to "1 approval" (E's note agrees).

## "My Items" / "Items" (C-122, held — not renamed)

The rename stays held for Vicky. I restated each probe to the words on screen at that spot: "added to Items" and "added to Sections" on the Price book pages. "My Items" / "My Sections" stay in the quote editor's snackbars and the Price book modal.

Places where the two names meet:

- **Two pages give the same act different snackbars.**
  - Saving a section from a quote says "Section saved to My Sections", and inserting one says "Section added from My Sections" (`items-section.tsx`).
  - Making one on Company › Price book › Sections says "… added to Sections".
  - Likewise, on the quote's Match review: "n added to My Items". On the Price book page: "X added to Items".
- **One screen uses both names.** Price book › Items: the tab reads "Items", but its empty state reads "Nothing in My Items yet" and its page menu reads "Export My Items…" (`price-book-items.tsx:154 · :215`).
- **No single sentence mixes the two.** The empty state's "a quote’s Items table (⋯ › Save to My Items)" names the quote's section, not the library.

## Register rows (staged)

| REG-D.1 | Company › Price book | **The Items ghost draws the bar the page draws** — the scope pill at its own words ("Type: All", every width since 4-24) and the to-do chip while an item waits for approval ("1 approval", "1" ≤1024), so on a phone the tools wrap to a second line in the ghost as on the page (the closing regression; pm2-s17 at 390 was 48px off) | bug fix |

## Checks

- `npx tsc --noEmit -p .`: clean (exit 0), and again after the ghost fix.
- `npx eslint` on the 14 probes I edited: 0 errors. The config ignores these files.
- `npx eslint` on the three source files I touched: clean.
- `npm run design:lint`: "✓ nothing new breaks a house rule".
- `node --check`: passes on all 14 edited probes.
- The guard (`snap` then `diff` against `guard-before.json`), after the source fix: pages, server actions, handles and keys all say "none gone" (143 new handles).

Source files edited (mine):
- `components/company/templates/library-gallery.skeleton.tsx`
- `components/company/templates/library-gallery.module.css`
- `components/company/price-book/price-book-ghost.tsx`
- `components/company/price-book/price-book-items.tsx`

Probes edited:
- `price-book-parity/verify-pb-r1.cjs · verify-pb-r2.cjs · verify-pb-r3.cjs`
- `quote-templates-parity/verify-tpl-parity.cjs`
- `thumbs-2026-09-30/verify-folder-crumbs.cjs · verify-thumbs-rest.cjs`
- `uat-dane-2026-10-01/P2a/verify-p2a.cjs · P3/verify-p3.cjs · P4/verify-p4.cjs`
- `ui-sweep/verify-sw-r5.cjs`
- `responsive-quotes/verify-rq-k1.cjs`
- `pending-modules/verify-pm2-s05.cjs · verify-pm2-s42b.cjs · verify-pm2-s41b1.cjs`

These are all on my list; I edited no shared helper.
