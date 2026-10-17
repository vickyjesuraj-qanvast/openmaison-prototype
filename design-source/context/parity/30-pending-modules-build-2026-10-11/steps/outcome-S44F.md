# S44F · the quote follow-ups from 1.0's newer branches — outcome (2026-10-15, lane B)

Her ask (2026-10-15): "fix all the pending things apart from Still parked … If you have any questions please go ahead based on your
recommendations" — asleep, my recommendation on every call. Package S44F = rows **NB-01…NB-04** of `s42/sweep-newer-branches-2026-10-15.md` §5,
built in the order the brief gave (NB-03 → NB-04 → NB-01 → NB-02 (a) (b) (c)) on top of S44Q's client projection and allowlist and S44T's print.
Built in **lane B** (`scratchpad/lanes/B`, port 3170). Register rows: `steps/reg-S44F.md` (REG-S44F.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s44f.cjs` (101 checks). Shots: `design-source/verify/pending-modules/pm2-s44f/`.
Every call **as recommended — her ask 2026-10-15**; none reverses an earlier decision (REG-595's "Since the last version" stays the default and
prints exactly as before). **No migration. No repair** (R148…R159 unused) — every new state is computed from records that already exist
(`quote_versions` snapshots, `quotes.confirmed_via` · `confirmed_marked_by`, which a variation order already wrote).

## Ledger — every row this package owns

| Row | Status | Where / how |
| --- | --- | --- |
| **NB-03** a client's browser receives every line's price under *one amount per section* / *the total only* and on no-price lines (privacy) | **Fixed** | `lib/quotes/client-quote.ts` `clientSafe(doc, view, design)`: a line keeps its (folded) price only when `pricedLineIds` says the print shows it — *A price on every line* and the line printed, not hidden-without-a-price, not a word (FOC · Inclusive …), not folded into a section printed as one line, not declined; else 0. The page's totals, section sums and folded sums travel worked out (`DocData.sums = { totals, print }` — totals with cost and margin zeroed); `docTotals` reads them, the shared `sections()` reads `print`. A revision's old figures (`was`, `history.first`) are zeroed where the price doesn't print; a hidden line's old words don't travel. `withoutContent` drops the sums with the content on a not-ready link (confirm page, view-only link). The section logic moved, unchanged, from `components/templates/render/slices.tsx` to the pure `lib/templates/item-sections.ts` (`sections`, `printSums`, `pricedLineIds`, `showsRemoved`) — a server module can't call a 'use client' file's function, and one function keeps the server's sums on the very sections the page draws. Covered: `/confirm/<token>`, `/quote/<token>`, `/sign/<token>/quote` (→ the portal's quote, which opens it), the bundle walk (carries no quote line — checked on the wire). Proved on the payload (HTML + RSC data) at all three amounts; the page prints exactly the Preview's totals and sums. REG-S44F.1 |
| NB-03's consequence — page totals | **Decided + built** | A page's total prints only with *A price on every line* (`tables[tid].pageTotals`, the Totals block's `pages` line). REG-S44F.2 |
| **NB-04** a hand-confirmed regular quote records `confirmed_via = 'marked'` + who; Undo puts both back; "Marked by {name}" where Confirmed shows | **Fixed** | `app/leads/quotes-actions.ts` `setQuoteStatus` (the mark that sets `confirmed_at` stamps `marked` + the member); `app/quotes/actions.ts` — `StatusUndo.confirmedVia · confirmedMarkedBy`, `undoQuoteStatus` restores them; `confirmQuoteOnline` stamps `link` (no member); `reviseQuote` clears them with the confirmation, `undoReviseQuote` (a variation order's) restores them from the kept snapshot. Shown: the editor's banner (`quote-bars.tsx` `SentBanner markedBy`, the editor's record follows a mark and its Undo optimistically), the quote's own trail (`lib/quotes/activity.ts`), the lead's Activity (`lib/leads/activity.ts`). REG-S44F.3 |
| **NB-01** revision marks back to version 1, a colour per version, a key; Changes › Since the last version · Every version | **Built** | `lib/quotes/diff.ts` `diffChain(snapshots, current)` (pure: per line `addedIn` · `changedIn[]` · `removedIn` · `first`; a line changed back as it came in has no change; a declined line removed later is no removal), `versionInk` (kit accent → red → grey, cycling); `lib/templates/client-view.ts` `ClientView.changesSince: 'last' \| 'all'` (default `last`, kept with the quote's own choices); `lib/templates/queries.ts` `fetchQuotePreview` puts every earlier removal back in its place (`withRemoved` per removal version, this version's first — exactly as before) and the history on every line; `components/templates/render/slices.tsx` draws *Every version* (tags "New in v2" · "Changed in v3" · "Removed in v3" in the version's colour, a changed line strikes what it was when it came in, the key "Changes by version ■ Version 2 ■ Version 3"); `showsRemoved` keeps *Since the last version* to this version's removals; Preview's panel: the *Changes* select under *Show changes* (past version 2, while on), the switch reads "from version 1" and counts every version's marks (`QuotePreviewData.chain`). REG-S44F.4 |
| **NB-02 (a)** the payment schedule's changes on a revision's print | **Built** | `diffPayments` / `paymentChain` (`lib/quotes/diff.ts`; matched by id, else place); `fetchQuotePreview` marks `DocPayment.change · was · history` and puts removed milestones back; `paymentsNode` (list · cards · table) strikes the old share / amount / words before the new, marks New, strikes a removed one (no number, out of the Total line); `readingSchedule` and `readiness` read the schedule without struck milestones. REG-S44F.5 |
| **NB-02 (b)** a change summary in words under each kept version, with Copy, and in the revised quote's WhatsApp draft | **Built** | `changeSummary` · `summaryText` · `versionState` · `snapshotState` · `paymentsForDiff` (`lib/quotes/diff.ts`, pure; the studio's words, or the client's: no hidden line — a line hidden since reads "Removed" — no line money unless the view prints line prices, the schedule only while it prints). `components/quotes/editor/version-history.tsx`: under every version past the first, a full-width block — count · total before → after · lines untouched, *What changed* (the list), *Copy*, *Compare*; the current version reads the editor's live lines, schedule and pricing (`quote-editor.tsx` keeps `livePricing`). WhatsApp: `confirmMessage({ changes })` (`lib/quotes/confirm.ts`) from the editor (`sendChanges`) and Preview (`QuotePreviewData.summary`), limited to six lines + "and n more changes". REG-S44F.6 · .7 |
| **NB-02 (c)** *Compare with…* any kept version (`?version=n&against=m`) | **Built** (after (b)) | `fetchQuotePreview(quoteId, version, against)` — the version shown against an earlier kept one, one baseline, lines and schedule, counts + the versions it can be compared with (`QuotePreviewData.compare`); the Preview route reads `?against=`; `quote-preview.tsx`: read-only (no What your client sees, no Send; a kept version keeps *Current version*), the marks always on (the quote's own view untouched), the comparison bar with *Compare with* and *Stop comparing*; entered from Version History's *Compare* (the version against the one before it). REG-S44F.8 |
| found on the way — two removed neighbours printed out of order | **Fixed** | `withRemoved` places a removed line halfway to its section's next row (was +0.5, which could land on the next line's own position). REG-S44F.9 |

**Sheet rows:** none owned by this package.

## Calls taken as recommended (her ask 2026-10-15)
- **NB-03 — what "the view never prints" means:** a line's price travels only when that line's price prints (the rule in `pricedLineIds`); column switches are not part of it (with *A price on every line* the unit price follows from the total ÷ quantity anyway). The confirmation's own optional-works pick list keeps each offered work's price with GST (REG-626 — a client can't pick a work without its price): it is the page's separate disclosure, not the print's.
- **NB-03 — page totals** print only with a price on every line (REG-S44F.2) — the alternative (sending per-page sums) can't work: the page breaks are the browser's.
- **NB-01 — colours:** the brand kit's own (accent, red, grey in turn), never a fixed palette outside the kit; each mark names its version, so a colour reused from version 5 on still reads. The choice sits only where it applies (a third version exists, changes shown).
- **NB-01 — a changed line on *Every version*** strikes what it was when it came in and wears the version of its last change; a line added later and changed again wears both marks.
- **NB-02 (a)** milestones match by id, else by place (a split re-applied gives new ids); only the words, the share and a fixed fee count as a change — an amount that moved because the total moved is not.
- **NB-02 (b)** the current version's block shows the total and the untouched lines only — its count is REG-595's line above it (no second count). The client's message caps at six changes.
- **NB-02 (c)** compares only with an *earlier* version (the marks read forwards); the comparison is a studio page — it never saves the client view and offers no Send.
- **NB-04** a variation order keeps its own Money words ("marked by the studio"); its banner now says "Marked approved by {name}" only when its status menu marked it (the same stamp). The client's pages keep "confirmed" (the client did confirm, by phone).

## Kept (with the reason)
- *Since the last version* prints byte-for-byte as REG-595 drew it (the probe asserts no version mark or key there); the one change under it is REG-S44F.9's order fix.
- The phone's reading cards show no revision marks (as before) — the A4 ("View as printed") does.
- The confirmation link's optional pick list still lists each offered work with its price (REG-626), whatever the amounts setting.

## Shared pieces changed (the other lanes should know)
- **New:** `lib/templates/item-sections.ts` — `sections()` and its types **moved here from `components/templates/render/slices.tsx`** (unchanged but for two optional trailing arguments: `sums`, `version`). **Anyone editing the print's section logic edits it here.**
- `lib/templates/data.ts` — `DocItem.history`, `DocPayment.change · was · history`, `DocData.sums`; `docTotals` returns `d.sums.totals` when present.
- `lib/templates/client-view.ts` — `ClientView.changesSince` (+ `fits`).
- `lib/quotes/diff.ts` — `diffChain`, `versionInk`, `diffPayments`, `paymentChain`, `paymentsForDiff`, `versionState`, `snapshotState`, `changeSummary`, `summaryText`; `withRemoved`'s placement.
- `lib/quotes/client-quote.ts` — `clientSafe(doc, view, design)` (the design is now required), `withoutContent`; `clientQuoteOf` and `lib/quotes/view-link-queries.ts` use one design object for the sums and the page.
- `lib/templates/queries.ts` — `fetchQuotePreview(quoteId, version?, against?)`, `QuotePreviewData.chain · compare · summary`.
- `lib/templates/readiness.ts` — reads lines and milestones without the struck ones.
- `components/templates/render/slices.tsx` (+ `document.module.css`: `.versionKey` · `.versionKeyItem` · `.versionSwatch` · `.newMark[data-version-mark]` · `.payRemoved`) — `paymentsNode(b, ctx, view)`.
- `components/quotes/preview/quote-preview.tsx` (+ module css `.compareRow` · `.compareWith`), `components/quotes/editor/version-history.tsx` (+ css), `quote-editor.tsx`, `quote-bars.tsx`, `components/quotes/send/use-quote-send.tsx` (`changes`), `lib/quotes/confirm.ts` (`confirmMessage changes`), `app/(editor)/quotes/[quoteId]/preview/page.tsx`, `app/confirm/[token]/page.tsx`, `app/quotes/actions.ts`, `app/leads/quotes-actions.ts`, `lib/quotes/activity.ts`, `lib/leads/activity.ts`. No `components/om/*`, shell or `globals.css` change.
- **Not touched:** `lib/quotes/math.ts` (C3 / S44O's GST rounding) — every total is read through `quoteTotals` / `docTotals`, so C3 flows into the client's sums and the summaries' totals as it lands.

## For other packages
- **S44O (C3, GST rounding):** `clientSafe` works the client's totals out with `docTotals` → `quoteTotals` on the server, so your rounding reaches every client page with no further change. The probe's `recalc` (the stored amount after a line written by SQL) replicates today's per-line GST; if C3 changes the sum by a cent the probe still passes (no exact totals asserted in words).
- **S44O (VO billing) / anyone in `app/quotes/actions.ts`:** `undoReviseQuote` now restores `confirmedVia` · `confirmedMarkedBy` from the kept snapshot; `reviseQuote` clears them.
- **S44I / S44T / anyone editing the print:** `sections()` lives in `lib/templates/item-sections.ts` now; a new per-line money figure on `DocItem` must be zeroed in `clientSafe` unless `pricedLineIds` has the line.
- **Orchestrator:** no migration, no repair. `design-lint` holds the baseline (nothing raised). CLAUDE.md's Map, quote rows: `lib/templates/item-sections.ts` (the print's sections, shared with the client projection), `DocData.sums` (a client page's totals), `diffChain` / `changeSummary` (revision marks and words), `?against=` (Compare).

## What to check in the browser (Dane · Owner; 1440 and 390)
1. OM-10007 › Preview › What your client sees › Amounts *The total only* → open `/confirm/f529ab6d-5c59-4cb9-abf3-4e79385d20fb` in a private window: the same total as Preview; view source — every `costMinor` is 0.
2. OM-10007 › status ▾ › Confirmed › Mark Confirmed: the banner "Marked confirmed by Dane just now — version 1…"; Undo; the quote's Activity section and the lead's Activity say who marked it.
3. Revise OM-10007 twice with an edit in each (a line removed, one added, a share changed) → Preview › What your client sees › Changes › *Every version*: the version-2 removal struck in the accent, version 3's in red, "New in v2", the key under the table; the schedule's struck shares.
4. ⋮ › Version History: under version 2 "n changes from version 1 · total …", *What changed*, *Copy*, *Compare* → the comparison bar, *Compare with › Version 1*, *Stop comparing*. Send ▾ › Send for confirmation: the message lists what changed.

## Probes run (lane B, :3170, production build, each on a fresh copy of `pbuild/base.db` migrated + repaired)
- `design-source/verify/pending-modules/verify-pm2-s44f.cjs` — **101 / 101** (1440 · 390 / 320 / 768 touch; page errors none; the leads' stages and stage logs as found; OM-10007 back at version 1). Shots: `design-source/verify/pending-modules/pm2-s44f/`.
- Regression (`design-source/verify/regression/run.cjs`, `RUN_DIR` + :3170, base = the migrated + repaired copy): qe-r1 **34** · qe-r2 **33** ·
  qe-r3 **21** · qe-r4 **14** · qe-r5 **21** · ct-r1 **36** · ct-r2 **24** · ct-r3 **28** · ct-r4 **29** · ux-p4 **56** · ux-p5 **58** ·
  tpl-parity **20** · sw-r1 **34** · sw-r2 **27** — all green, 0 fail. No existing probe needed a change.
- Pending-module probes (a lane copy of `pbuild/run-env.sh`, :3170, each on a fresh copy), on the final build: pm2-s44f **101 / 101** ·
  pm2-s44t **69 / 69** · pm2-s02 **106 / 106** · pm2-s44q **52 / 52** · pm2-s04 **82 / 82**; pm2-s03 **79 / 79** on the build before. Their
  servers' logs carry no error. (An earlier run of pm2-s44t found my bug — a snapshot kept before a column existed (no `discounts_json`) broke the
  change summary on Preview: `versionState` now reads a missing column as its default, never as a change; fixed and re-run green.)
- The regression ran on the build before two last small fixes (one design object for a client page's sums and page — a quote without a template
  drew a fresh fallback design each call; the old-snapshot read above); every probe that reads those paths re-ran green on the final build.
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors · `npm run design:lint` "nothing new breaks a house rule" (baseline untouched) · `next build` under the lock: exit 0.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for these; every visible change is a REG-S44F row with its invented words flagged; NB-03 changes nothing a client sees (asserted against Preview).
2. **One system, no one-offs** — the print's own `sections()` serves the server and the page (moved, not copied); the house `Drawer`, `Button`, `TextField` select, `Tooltip`, snackbar and `copyText`; marks reuse `.newMark` / `.was`; colours are the brand kit's.
3. **Plain words** — "New in v2", "Removed in v3", "quantity 48 → 50 ft run", "rate S$250.00 → S$260.00", "Marked confirmed by Dane", "Version 3 compared with version 2", "Stop comparing".
4. **Nothing is lost** — a mark's Undo puts the how and the who back; Revise's Undo (a VO's) restores them; every earlier removal stays on the record on *Every version*; nothing is deleted by this package.
5. **Say why** — the comparison bar says the marks are "here only" and what the client sees; the Changes helper says what *Every version* does; the banner names who marked a confirmation.
6. **Back returns where you came from** — Compare carries `?from=` (the editor), *Stop comparing* and *Current version* return to the Preview with it; the editor's Back unchanged.
7. **Every screen is whole** — no new page; Preview's ghost and reveal unchanged (the comparison bar sits where the kept bar sits); page error log empty in the probe.
8. **Every width is designed** — the comparison bar's select drops under its words at 390; Version History's summary takes the row's full width (the drawer's 400 px and the phone sheet); no sideways scroll at 390 / 320 / 768 touch (probed).
9. **Tables follow the leads listing** — no listing table added; the printed tables are documents.
10. **Motion with purpose** — none added.
11. **Honest data** — every mark is computed from the kept snapshots; no demo state seeded; the client's totals are the server's own, never cost or margin.
12. **Reach for everyone** — *What changed* carries `aria-expanded`; the change list is a labelled list; the marks are words, not colour alone; the select and buttons are the house's labelled controls.
