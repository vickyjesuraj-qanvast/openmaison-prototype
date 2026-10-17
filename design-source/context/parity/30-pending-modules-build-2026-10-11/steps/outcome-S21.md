# S21 · Quote X-Ray — outcome (2026-10-13, lane A)

Card: `held:quote-x-ray` (recommendation "developers' lane" — "The screen is complete; only the reader needs a real model"; no questions).
Every pending line taken as the card recommended, and where 1.0 did the job by rule — or a model did a job a rule can do — built by rule
(brief: "where 1.0 used a model, answer from the records by rule"); nothing calls a model, the engine stays rule-based (`lib/xray/compare.ts`,
engine 2, pure). Carried notes taken: **S19** (X-Ray is Pro on Free; 1.0's `quote_xray` price of 10 — settled from 1.0's code: never
charged, X-Ray stays unmetered; the intro's words unchanged in `components/xray/intro-copy.ts`), **S12** (the word rules in
`lib/quotes/line-words.ts` unchanged — the S12 probe re-run anyway), **S04** (the WhatsApp draft is words only, no line record reaches a
client page; nothing new sends a quote line anywhere), **S10** (Maison AI's sheet on the X-Ray pages: X-Ray registers no page suggestions;
its file answer's X-Ray row fixed — REG-S21.8), **S23** (lane B's *Their quote* finished with S19's Pro rule — REG-S21.7).

1.0 read: branch `origin/deployment/plg` (2026-10-09, the newest X-Ray code — the audit read `67f42e469`; since then 1.0 moved the
currency sniff to `parsed-doc.ts`, added the plan gate on every route, reskinned the screens, and added then removed an anonymous run):
`src/lib/quote-parse/parse-file.ts`, `src/lib/quote-xray/*` (all 27), `src/lib/queries/quote-xrays.ts`, `src/app/api/quote-xrays/*` (8 routes), `src/app/(main)/tools/quote-xray`,
`src/app/sign/quote-xray/[token]`, `src/components/quote-xray/**`, `src/app/(marketing)/pricing/pricing-data.ts`, `src/lib/credits/schedule.ts`,
`docs/demo/quote-xray-samples/*`, migrations 217 · 272 · 277. Register rows: `steps/reg-S21.md` (REG-S21.1…10). Probe:
`design-source/verify/pending-modules/verify-pm2-s21.cjs` (**40 / 40**, twice back to back on one server); shots in `design-source/verify/pending-modules/pm2-s21/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "A model reading any PDF or photo of the other quote — stand-in (three curated quotes; spreadsheets are real) · her call (REG-529 'a curated engine, not a model') · developers' lane" | **built by rule for every PDF with words · stand-in for photos and scans** — any PDF that is not one of the three reference quotes is read from its own words in the browser (bands, areas, numbered and wrapped lines, quantity · unit · rate · amount, FOC / Inclusive / By client / KIV, lump sums, totals and payment rows left out, the studio from the letterhead or the signatures); the reading says whether its lines come to the total the file states. 1.0's own demo competitor quote reads whole (23 lines, S$40,210.00 = its subtotal). A photo or a scanned PDF has no words: said at once ("… is a photo or a scan — it has no words to read here …"); OCR and a model are the developers' (`readQuoteText` is the seam). Her REG-529 call stands: no model. | REG-S21.1 · .2 · .9; `lib/quotes/pdf-quote.ts`, `lib/xray/reading.ts`, `components/xray/xray-workspace.tsx` |
| "Brand reading with web dossiers, market-rate bands, their arithmetic slip — stand-ins · as recommended (Q-06 · Q-23) · keep" | **their arithmetic slip: built** (1.0's fact 4 was code, not a model — it needed stated rates, which the PDF and sheet readings now carry: a point "Their numbers don’t add up" and "S$X at their rate" on the row). **Web brand dossiers and market-rate bands: kept** as recommended (Q-23: the platform's — a web scan and 1.0's 111 crowd/seeded rate bands; 2.0 keeps the nine curated brand notes and "Priced well below ours", Q-06). Writing new claims about real brands without a source would be invented reviews, so no notes were added. | REG-S21.3; `lib/xray/compare.ts` (`slipsOf`, the fact, `XrayRow.slip`), `components/xray/xray-table.tsx` |
| "Other currencies — held (DEF-30)" | **parked by her** (S33 "Countries beyond Singapore" on hold, her words 2026-10-12). What the hold doesn't cover is built: 1.0's hard stop — a quote in RM / MYR / US$ / AED / INR is refused at once ("This quote is in RM — Quote X-Ray compares quotes in S$."), so a ringgit quote is never compared as dollars. | REG-S21.4; `currencyOf` in `lib/quotes/pdf-quote.ts`, `lib/xray/reading.ts` |
| "Competitor-quote analyser in the Meeting Copilot — held (REG-552)" | **built** — the hold was lifted in S23, which built *Their quote* (X-Ray on the meeting's lead) and lists the meeting's readings on its brief; finished here: it and the "another studio" tip's *Read their quote* are Pro openers (tag on Free, the lock card in the meeting, never a new tab onto a lock). | REG-S21.7; `components/meetings/room/meeting-room.tsx`, `room-parts.tsx` (`TipsCard lockedActions`) |
| "Win / loss, X-Ray settings, a PDF or public link — declined as recommended (Q-22 · Q-24 · Q-25) · keep" | **kept** — Q-22 (the lead's Won / Lost carries the outcome; Q-18 ties Lost to the comparison), Q-24 (1.0 retired both for this flow; the client gets the message), Q-25 (nothing in 1.0 to carry). | — |

## Found in 1.0, not on a card
- **`docs/demo/quote-xray-samples/urban-nest-competitor-quote.pdf`** (+ `.html`) — 1.0's demo competitor quote. **Built**: shipped as
  `public/uat-files/urban-nest-competitor-quote.pdf` for testers; it reads whole by rule (REG-S21.9). **For the orchestrator:** a UAT step
  in chapter 7 beside `rival-quote-urban-nest.xlsx` ("Drop uat-files/urban-nest-competitor-quote.pdf on The other studio’s quote — 23 lines
  read from Urban Nest Design & Renovation’s quote · S$40,210.00 — the same as its own total"); `gen_files.py` doesn't make it (copied as is).
- **The currency sniff** (`parsed-doc.ts` `detectCurrencyFromDoc` + `CurrencyMismatchError`) — not on the card (the audit filed it under
  Q-23's "other currencies"); **built** as the refusal (REG-S21.4).
- **`quote_xray: 10 credits`** in 1.0's `CREDIT_SCHEDULE` — no route spends it; its pricing page leaves it out "rather than invented"
  (X-Ray is a plan feature). **Decided**: X-Ray stays unmetered in 2.0 (REG-S21.6). 2.0's schedule has no X-Ray row — nothing to remove.
- **The anonymous X-Ray run** (`POST /api/anon/quote-xray`, 2026-09-21, "one free analysis, kept at sign-up") — **dead in 1.0**: removed by
  1.0 itself on 2026-09-23 (`13f5fbe62`, "drops the quote-xray free-run path"). Nothing to build; S31 (a new studio joins) has no anonymous
  X-Ray to carry.
- **The 2026-10-01 reskin** of the upload, result, history and dialogs onto 1.0's om design system — screens only; 2.0's are its own.
- **Already mapped, nothing left:** `records` routes and `lib/queries/quote-xrays.ts` (Recent, Q-13), `lead-quotes` (the setup's picks, Q-11), `[id]` GET / DELETE (the
  record, Q-17 · Q-20), the plan gate on every route (S19), `matched-item-defense` · `real-gap` · `material-facts` · `own-quote-from-lead` ·
  `verdict` (engine 2), `canonical-categories` (2.0's trade words), `FixInDigitizerLink` (Open the quote, Q-17). **Platform or dead, as the
  audit filed them:** `ai-match` · `synthesise-prompt` · `normalise-synthesis` (the model), `brand-scan` · `brand-dossier-service` ·
  `brand-normalize` · `market-benchmarks` · `below-market-flags` (Q-23), `xray-stats` (the platform's admin funnel — excluded),
  `share*` · `shareability` · `download-xray-pdf` · `build-xray-report` · `/sign/quote-xray/[token]` · `ShareLinkDialog` (Q-24), `outcomes` + migration 272
  (Q-22), `three-way-match` · `combined-number` · `scope-gaps` · `group-by-category` · `views/*` · `CoverageMatrix` · `TierLadderCard` ·
  `MarketPositioningCard` · `ValueStack` · `MethodologyPanel` · `XrayStatsBar` · `ScopeGapPanel` · `CategoryHeatmap` (the four retired
  objectives, Q-01), `dryrun-fixtures` · `scripts/ai-cost/quote-xray.ts` · `scripts/xray-tune.ts` (developers' tools). Nothing for S41b.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
1. **Read PDFs by rule, not a model** — the brief's "answer by rule where 1.0 used a model"; the three reference quotes still read by their
   names first, so every demo and UAT reading the owner set up reads as before. Photos and scans: the developers'.
2. **X-Ray only** for the PDF reader: Create Quote › Upload a quote, the VO upload and the schedule's uploaded quote keep their honest
   "XLSX · CSV" words (S04's call on a 5-credit press). **Flag for Vicky:** the same reader is one line away for them, but each would then
   take 5 AI credits for a read made by rule — her call whether a rule read should cost what a model read costs.
3. **The arithmetic check as 1.0's** (tolerance S$1 or 1 %, at most two, own slips never a point) **plus one guard** (most lines disagreeing
   is the quote's way of pricing — GST or a discount in every line — not a slip). ENGINE stays 2.
4. **No meter on X-Ray** (1.0's code). **No new brand notes** (no source to cite).
5. **The shared sheet reader's two bugs fixed for everyone** (an Amount column read as S$0; a Total row read as a line) — a reading fix, not a
   new promise; sheets with a rate read exactly as before.

## What to check in the browser (1440 and 390)
- **Dane (Owner), Pro** — Tools › Quote X-Ray (or Vivien Lee › Quote X-Ray): drop `uat-files/urban-nest-competitor-quote.pdf` on *The other
  studio's quote* → "23 lines read from Urban Nest Design & Renovation’s quote · S$40,210.00 — the same as its own total"; their name filled,
  editable; Compare → the record. Drop a PDF whose lines don't reach its total → the yellow note under the file. Drop a photo → "is a photo
  or a scan …". A quote in RM → "This quote is in RM …".
- **A slip**: a BOQ sheet or PDF with Rate and Amount where one line's amount isn't rate × qty → *Say this* gains "Their numbers don’t add up";
  the row shows "S$X at their rate"; *Say it as a question* → *Send to client* — the draft never names the other studio.
- **Free** (View as › Studio plan › Free): a live meeting (Meeting Copilot) — *Their quote* wears Pro, its press opens "Quote X-Ray comes with
  Pro" in the meeting; type "another studio" in the notes → the tip's *Read their quote* wears Pro too. Back on Pro → it opens X-Ray in a new
  tab for the meeting's lead.
- **Hui Min (Admin), Germaine / Michelle (Designers)** — the same reading; Who sees leads and the delete rule unchanged. **Priya (Accounting)**
  — no X-Ray (unchanged).
- **390 / 320 / 768 touch** — the file's check note and the record's slip line fit; no sideways scroll.
- **The setup's ghost** — reload Tools › Quote X-Ray and a lead's Quote X-Ray: the ghost's card is the page's card (no jump at the hand-off).

## Probes run (lane A, port 3160, scratch copies of `pbuild/base.db` migrated + repaired)
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s21.cjs` (this step) | **40 / 40**, twice back to back on one server — a full `.dump` before and after both runs identical; the server log clean |
| `x-ray-parity/verify-xr-r1…r4.cjs` (via `regression/run.cjs`, the final build) | 27 / 27 · 31 / 31 · 28 / 28 · 16 / 16 (no assertion changed) |
| `quote-editor-parity/verify-qe-r5.cjs` · `ai-credits/verify-cr-r3.cjs` (Upload a quote reads through `readRows`) | 21 / 21 · 40 / 40 |
| `ghosts/verify-ghosts-same.cjs` (1440 · 390 touch, X-Ray and its record among the routes) · `verify-ghosts-strips.cjs` (pictures: X-Ray unscoped, scoped to a lead and the record at 1440 and 390 touch — every bone on its word after REG-S21.10) · `verify-ghosts-film.cjs` (needs keys; none touch X-Ray) | 57 / 57 · 57 / 57 · drawn and looked at · n/a |
| `pending-modules/verify-pm2-s12.cjs` · `-s10.cjs` · `-s19.cjs` · `-s23.cjs` | 72 / 72 · 107 / 107 · 116 / 116 · 147 / 147 |
| `tsc --noEmit` · `eslint app components lib` · `design:lint` · `next build` | clean · 0 errors (16 warnings, all in files this step didn't touch) · nothing new · ok |

## Migration and repair
None. No schema change (a read line's stated rate rides in `quote_comparisons.inputs_json`); no demo data needed — a slip or a total
check shows only when a file has one (shown only when it applies). **R120 is still free** in lane A.

## Shared pieces changed
- `lib/quotes/upload.ts` — `readSheet` behind `readRows` (an Amount column prices a sheet with no rate; figures rows are never lines). Used
  by X-Ray, Create Quote › Upload a quote, the VO upload and the schedule's uploaded quote.
- `lib/quotes/pdf-quote.ts` — new, pure (the PDF reader by rule; `currencyOf`).
- `components/meetings/room/room-parts.tsx` — `TipsCard` takes `lockedActions` (lane B's file; one optional prop).
- `components/xray/xray-skeletons.tsx` composes `components/om/choice-card.module.css` and `components/leads/move-stage/fields.module.css`
  (the page's own choice card and dropzone, so the ghost draws them as the page does) — read, not changed.
- `lib/maison-ai/answers/work.ts` — one row's words (lane B may touch Maison AI too — merge by hand if both changed it).
- No `components/om/*`, shell or `app/globals.css` change.

## For the next steps
- **S29 (AI writing help on quote text):** nothing here; the reader's seam for a model is `readQuoteText` if a model ever reads quotes.
- **S34 (real services):** OCR / a document model plugs in at `readQuoteText` (photos and scans), and `lib/xray/reading.ts` `readSide` is
  where its result becomes the X-Ray's lines; keep the reference-by-name first while the demo needs it.
- **S41b:** nothing from X-Ray (every 1.0 file mapped above).
- **S42:** whether Upload a quote / VO / schedule uploads should take PDFs by rule (decision 2 — Vicky's call on the credits).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for any of it; built on X-Ray's own pieces (the file tile and its notes, the point
   card, the table's second line under a figure, the house Pro tag and lock card); every new word listed as invented copy in `reg-S21.md`.
2. **One system, no one-offs** — one sheet reader for every upload (fixed once), one PDF reader (pure, shared), one Pro rule for every opener
   (S19's `usePlanLock` + `ProTag`), the slip line reuses the table's secondary line, the check note the tile's note with a tone.
3. **Plain words** — "is a photo or a scan — it has no words to read here", "the same as its own total", "a line may not have been read",
   "Their numbers don’t add up", "S$1,800.00 at their rate", "This quote is in RM".
4. **Nothing is lost** — the reference quotes read as before; readings made before read the same (engine 2); a sheet with a rate reads as
   before; nothing deleted; the probe puts every table back.
5. **Say why** — every refused file says why at once and what reads best; the total check says what doesn't add up and what to do; the lock
   card says why X-Ray is closed on Free.
6. **Back returns where you came from** — unchanged: the meeting's X-Ray tab carries `?from=/meetings/<id>`; the lock card opens where you are.
7. **Every screen is whole** — no new page; the setup's ghost was 90px taller than the page before a lead was picked (two quote-card bones the
   page doesn't draw, a 148px dropzone against the page's 124) — rebuilt on the page's own classes and words (REG-S21.10), every bone on its
   word at 1440 and 390 touch, scoped and not; loader and reveal the same (ghost probes 57 / 57 twice); the page error log empty.
8. **Every width is designed** — 1440, 768 touch, 390, 320: the check note and the slip line wrap in place; no sideways scroll.
9. **Tables follow the leads listing** — the item table unchanged but for a wrapped line under their figure (the phone card shows it too).
10. **Motion with purpose** — no new motion.
11. **Honest data** — a reading by rule checks itself against the file's own total; nothing reads a photo it can't; another currency is
    refused, not converted; a slip is said only when the file states a rate and a quantity, never when every line differs; "no AI credits"
    because none move.
12. **Reach for everyone** — the Pro opener names itself ("Their quote, a Pro feature"); notes are `role="status"`; the slip is words, not
    colour alone; keyboard paths unchanged.
- **How to add a missing thing** — one home (X-Ray's own setup and record; the meeting's existing button), shown only when it applies (the
  check note, the slip, the arithmetic point), no new filled button, no set-up (it works on the demo as it is).
