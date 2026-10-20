# S43D · F2 — ghosts, house notes and the 1.0 checks nobody ran — outcome (2026-10-15)

His ask (2026-10-15): "fix all the pending things apart from Still parked (dark mode, languages, themes and guided tours, countries beyond
Singapore)" — asleep, my recommendation on every question. Package S43D = the six items **F2-01…F2-06** of `s42/pending-ledger.md`. Built in
**lane B** (`scratchpad/lanes/B`, port 3170). Register rows: `steps/reg-S43D.md` (REG-S43D.1…5). The sweep: `s42/sweep-newer-branches-2026-10-15.md`.
Every call **as recommended — his ask 2026-10-15**; none reverses an earlier decision (the two money / GST fixes bring code in line with REG-593 and
REG-555; the UHD hold is a new call that is his).

## Ledger — every item this package owns

| Item | Status | Where / how |
|---|---|---|
| **F2-01** Commission's ghost has no *Asks for another rate* band | **Fixed** | `lib/ghost-shapes.server.ts` seeds `finance.commissions.asks` (whoever sees the books: every open ask) or `finance.commissions.my-asks` (a member: their own) — key from `commissionAsksShape` in `lib/finance/sections.ts`; `components/finance/books/books-ghost.tsx` draws the asks table's bones (the page's six columns, a phone card at the page's height) between the tiles and By member / Your projects; the page's reveal is told (`BooksWorkspace` → `FinanceFrame asks` → `FinanceGhost` → `BooksGhost`); the page remembers it per browser (`useRememberShape` in `commissions-view.tsx`). Measured: By member at 460 in the ghost and the page at 1440 (was ~260 vs 460); at 390 within 16 px (the tiles' own pre-existing offset). REG-S43D.1 |
| **F2-02** Chips read '' as no pick, undocumented | **Fixed** (comment) | `components/om/chips.tsx` `Single.value`: "`null` and `''` both read as no pick — so give an *All* chip a real value (e.g. `'all'`), never `''`". The rule itself unchanged (every group reads it). |
| **F2-03** Stale "scripted" comments on Fill from a document | **Fixed** (comments) | `components/leads/lead-form.tsx` — both now say it reads the picked file by rule (`lib/leads/document-fill.ts`). |
| **F2-04** Six newer 1.0 branches never swept | **Swept** + **2 built** + **8 rows routed** + **3 held for him** | `s42/sweep-newer-branches-2026-10-15.md`. Built here: *Apply defaults* keeps GST off under an unregistered entity (REG-S43D.3, `app/leads/quotes-actions.ts`); each bill splits out its own quote's GST (REG-S43D.4, `lib/projects/money.ts` `billGstRate`, `money-queries.ts` `ownGstRate`, `invoices.ts`, `app/projects/money-actions.ts`, `lib/finance/books.ts`, three money components). Rows NB-01…NB-08 → "For other packages". Held: UHD's Sales reports, Contractors, projects list (their exclusivity ask — HIS ACTION). Excluded: crm-client-link-sarthak, billing-app (Platform admin), white-label. fpto3d: specs only. |
| **F2-05** 1.0's quote document editor's other parts never compared | **Compared** — no build; one gap → **row NB-08** | Table below. S44T finished during this package; its files land after this lane's sync, and the one gap's editor (the house rich editor) is in S44I's hands for C2 — so the gap is a precise row, not a build on older copies. REG-S43D.5 |
| **F2-06** 1.0's quote-canvas overridability never checked | **Compared** — no lock to build | Table below: 1.0's 🔒 gated per-quote overrides nothing a studio could press ever wrote (dead in 1.0); 2.0's rule (REG-616 Q-02) stands. REG-S43D.5 |

**Sheet rows:** none owned by this package.

## F2-05 · 1.0's quote document editor (`src/components/leads/quote-document-editor.tsx` on `port/spaces-studio-2026-10-12`, 8,263 lines) → 2.0's template editor

1.0's document editor is a quote's **own** layout (the digitizer's Layout tab: each lead's own section list for studios on the legacy editor, its own
copy of the Canva body — `leads.quote_metadata.canvaBlocks` — for the rest); 2.0 decided
against a per-quote design (REG-616 Q-02: the design is the template's, edited from the quote with its origin, REG-495). So each part is answered
for 2.0's template editor.

| 1.0 part (qde = `quote-document-editor.tsx`) | What it does | 2.0 | Status |
|---|---|---|---|
| Section types (qde:103-114) | Cover · Rich Text · Two Column · Callout · Divider · Pricing Table and Payment Terms (locked) · Image · Signature · Spacer / Page Break | Blocks: Cover canvas · Text · Line across · Items and Payment schedule (one each) · Picture · Signature · Blank space · New page; a callout is a Text block with a tinted or outlined box; two columns: Details' columns, and the narrower job S44T built (PayNow QR beside the schedule, C5) | **Built** (callout · two columns in another form — audit 03 TB-17 "not proposed") |
| Sections as blocks: add, drag, move, duplicate, delete (SectionBlock qde:4289, its kebab) | — | Structure pane (drag, eye), the inspector's Duplicate, Remove with Undo (REG-542), keys (REG-711) | **Built** |
| Page break before (the kebab's checkbox) | A section starts a page | *Start on a new page*, *Keep together with what follows*, the New page block, the Items table's sections on a new page | **Built** |
| *Show when* (`visibilityRule`, qde:4566-4680; `quote-pdf.tsx` `evaluateVisibility`) | Always · quote total > amount · has line items · needs a signature — the amount was never settable (always 0) | Blocks print from the quote's own records and client view: Payment schedule only with a schedule, Bank only with details, Terms / Notes / Signature by the client view (REG-490), Optional works only with optional lines, a canvas text with *Hide if empty*; the signature's sentence (*Sentence above the signatures*) rides with its block; an empty quote never goes out (readiness, REG-490) | **Built in another form** |
| Hidden (the page toolbar's eye; `hidden`) | Hides a section in editor and PDF | *Hide from the page* on every block | **Built** |
| Multi-select + bulk delete / duplicate (qde:6281-6400) | Shift-click a range; delete or duplicate the selection | One block at a time, each remove with Undo | **Not built** — as recommended: a template holds 8–15 blocks; the editor is kept to one selection for an aged owner (REG-542); the bulk tools served 1.0's per-quote copies (Q-02) |
| Page thumbnail rail (qde:651): move / hide / duplicate / delete / add a page, page titles | Pages as authored objects | Pages are computed from the flow (`document.tsx` paginates live) | **Decided** — REG-486: no authored Pages tab |
| Section comments with replies and resolve (`SectionComment`) | Review on the document | Line comments on the quote (REG-627); a template's review note and *Request changes* (REG-501) | **Built in another form** |
| Live presence (Liveblocks, qde:5535, `isCollabEnabled` — off unless a key is set) | Who else is editing | One editor at a time with autosave | **Not ported** — a real-time service (the developers', with the other seams in `services.md`) |
| Rich text (TipTap: bold · italic · lists · headings · link · colour · highlight · font · size · align; the slash menu) | A section's words formatted | Text block: plain paragraphs (`htmlToText` / `textToHtml` in the inspector); one text style per block (role · size · weight · colour · align) | **Gap → row NB-08** (b · i · u · bullets · numbers · link; kit colours as C2 allows; no per-run size — C2 (c)) |
| Per-section styling (background, padding, border, radius, text colour, font, background image + opacity) | — | Box none · tint · outline, space before / after, the block's text style; a background picture on the cover canvas | **Built in another form** (audit 03 TT-06 · TB-17) |
| Variables palette (client_name … pages) | Insert a field | *Insert a field* with "Prints as" (REG-569) | **Built** |
| AI actions on a section (qde:6306) | Improve / rewrite by a model | Writing help, by rule, as a proposal (REG-1965) | **Built in another form** |
| Cover editor + cover template gallery + auto-fill (qde:3795, `cover-editor/*`) | — | The cover canvas and 1.0's five cover looks (REG-1797) | **Built** |
| Inline inserts between pricing categories (qde:906, cross-context drag) | A block dropped between two sections of the table | Section notes under the bands | **Decided** — audit 03 Q-23 (REG-616) |
| Category bands sortable from the document (qde:954) | — | The quote's own section order in the Items table | **Built in another form** (the quote's side) |
| Page set-up: margins, page-wide header and footer | — | Page tab; header / footer canvases | **Built** |
| Undo / redo; keys ("/" opens the block library) | — | The editor's undo history (REG-542); `TEMPLATE_KEYS` (REG-711…717) | **Built** |
| Template gallery inside the editor (qde:5302) | Apply a document template | *Change template* (REG-494) | **Built** |
| Margin panel (qde:7936) | The quote's cost and margin | The quote editor's By category · Share · Margin (REG-623) | **Built** (the quote's side) |
| Free blocks / zone overlay (qde:7306) | Absolutely placed blocks on a page | Free elements on the header, footer and cover canvases; the body flows | **Built in another form** |

## F2-06 · 1.0's per-knob locks (`src/lib/quote-canva/resolve-props.ts`) → 2.0's template ↔ quote rules

**How 1.0 works.** A block's props = its schema's defaults ← the template's props ← the quote's overrides, and an override applies only where
`template.overridability[path] === true` (the 🔒 / 🔓 on each knob in the property panel, `PropertyPanel.tsx:619-630`). **But nothing a studio can
press writes the overrides**: the quote's `canvaOverrides` are read and saved back as they came (`quote-digitizer-dialog.tsx:5941-5960`), the
per-quote mode is passed only by the developers' sandbox (`/tools/quote-template-sandbox`), and the quote's Layout tab edits the quote's **own
copy** of the whole layout instead (`canvaBlocks`). The lock is dead in 1.0. **2.0's rule** (REG-485…493, REG-616 Q-02, REG-578…583): the design is
the template's at the version the quote is pinned to; a quote changes only its client view (REG-490), its own content (validity, GST, signature,
texts, payment split, starter sections — copied from New quotes, then the quote's), and what Settings locks (the payment schedule to Owners and
Admins, REG-589; the approvals, REG-501 · REG-624).

| 1.0 knob open to a quote by default (`overridableByDefault: true`) | 2.0's rule |
|---|---|
| Cover: kicker · title · subtitle · background image · footer caption | The cover canvas is the template's; its words carry fields — `{quote_title}`, `{client_name}`, `{site_address}` — so each quote prints its own |
| Document title · subject line · intro body | Title & intro block: the title is `{quote_title}` (the quote's own title); subject and intro are the template's words with fields; a quote's own words go in General Info › Remarks → `{remarks}` (S44T, REG-S44T.5) |
| Subtitle band text | A header text element (the template's) with fields |
| Image | The template's Picture block; a quote's own pictures are its files and its lines' photos (REG-419, the Photos column) |
| Details (meta key-value) rows | Labels are the template's; values are fields filled from the quote's records (General Info) |
| Payment schedule's notes under it | The template's *Footnote under the schedule* (REG-618 Q-16); the quote's milestones and their words are the quote's (REG-418, the payment lock REG-589) |
| Extension title · continue letters · extension totals | *Price after the contract* (S44T call C1, REG-S44T.17): the template names the part; the quote marks its sections |
| Repeat the header row on every page · numbering | The template's (Items block) — one look for every quote |
| Non-numeric cells (FOC / Inclusive) · zero-amount label | The quote's own, per line: *Print as* (REG-555); the template says how a zero prints (S44T REG-S44T.11) |
| GST label | The entity's registration and the studio's rate decide it (REG-593 · REG-645); the label is the template's Totals line |
| Discount row: on · label · percent | The quote's own: the additional discount and up to ten named discounts (REG-559) |
| Signature column headings | The template's Signature block; names and roles from fields (`{prepared_by}`, `{client_name}`) |
| Every other knob (`overridableByDefault: false`) | Locked to the template in 1.0 and in 2.0 alike |

**No lock built**, as recommended: nothing in 2.0 lets a quote change its design, so a per-knob lock would guard nothing; what a quote may change
is content the studio already keeps in step through Apply defaults (REG-579), the payment lock and the approvals. A studio that wants words fixed
on every quote types them into the template.

## Shared pieces changed
- `components/om/chips.tsx` — a comment on `Single.value` only.
- `lib/ghost-shapes.server.ts` — one more seed (`finance.commissions.asks` / `…my-asks`), read once per shell render (a count on `commission_requests`).
- `lib/finance/sections.ts` — `commissionAsksShape(runs)` (the ghosts' key).
- `components/finance/finance-frame.tsx` · `finance-ghost.tsx` — an optional `asks` prop down to `BooksGhost` (Commission's reveal only).
- `lib/projects/money.ts` — `MoneyInput.contractGstRate?` · `variationGstRates?`, `MoneySummary.contractGstRate` · `variationGstRates`, `billGstRate`;
  the stage view's GST uses the contract's own share. **Any new place that splits GST out of a bill must ask `billGstRate`** (one-offs keep their
  own lines). Everything reads as before while no quote mixes rates.
- `lib/finance/books.ts` — payments' and the contract's figures before GST follow each bill's share (`contractNetOf`).

## For other packages (the orchestrator routes; details in the sweep §5)
- **S44I (running):** NB-05 an Items action's Undo only for its own step; NB-06 a project's base quote keeps its issuing entity; NB-07 images in
  section notes · an "own rate" mark on a line · (low) series in drag-fill.
- **A quote / print follow-up on top of S44T + S44Q's landed work:** NB-01 revision marks back to version 1 with a colour per version and a key;
  NB-02 the schedule's changes on a revision, a change summary in words with Copy, compare any two versions; NB-03 a client's browser gets no
  per-line prices the client view doesn't print (privacy); NB-04 a hand-confirmed regular quote records who marked it.
- **A template-editor follow-up (after S44I settles the rich editor for C2):** NB-08 the Text block's formatting.
- **Developers (map 14):** 1.0's `price_book_vendor_prices` → each vendor's own Price book entry.
- **Vicky (HIS ACTION, new):** UHD's three dashboards (H-UHD-1 Sales reports · H-UHD-2 Contractors · H-UHD-3 their projects list) wait on
  whether UHD's exclusivity ask holds; each is a row ready to build (sweep §2.1).
- **Orchestrator:** no migration, no repair (R148…R159 unused). `design-lint` unchanged (inline-style 42 / 42 allowed — not raised). CLAUDE.md's
  Map: `lib/projects/money.ts` `billGstRate` is the one GST-of-a-bill rule.

## What to check in the browser
1. **Dane (Owner)**, Company › Finance › Commission, a hard reload: the ghost draws *Asks for another rate* (Michelle's ask) and By member lands
   where the page does. **Michelle (Designer)**: *Your asks* in the ghost and the page. **Alex / Germaine**: no band. Approve Michelle's ask as
   Dane, reload: no band. 390 touch: the ask's card in the ghost is as tall as the page's.
2. Add an entity that is not GST-registered (Company › Profile), pick it on OM-10001 (GST goes off, REG-593), then Change template → the same
   template → *Apply defaults*: GST stays off. Back to Demo Studio Pte Ltd, Apply defaults again: GST on.
3. On P-2026-001's signed quote OM-10004 make one line *Print as › On behalf*; on the project's Money tab send the next stage Draft (or change its
   amount): its GST is less than 9/109 of the amount — the contract's own share, as on the quote. Put the line back.

## Probes run (lane B, :3170, production build, each on a fresh copy of `pbuild/base.db` migrated + repaired)
- `design-source/verify/pending-modules/verify-pm2-s43d.cjs` — **35 / 35** (1440 · 390 / 320 / 768 touch; page errors none; the leads' stages and
  stage logs as found). Shots: `design-source/verify/pending-modules/pm2-s43d/` (the held ghost at 1440 / 390, the page, Apply defaults, Money).
- Existing probes touching what changed (a lane copy of `pbuild/run-env.sh`, each on a fresh copy): `verify-pm2-s17` (every ghost against its page)
  **130 / 130** · `verify-pm2-s42c` **79 / 79** · `verify-pm-c` (commission) **36 / 36** · `verify-pj-gap-f2` (the books) **84 / 84** ·
  `verify-pj-gap-b` (money in) **72 / 72** · `verify-pm2-s06` **83 / 83** · `verify-pm2-s07` **89 / 89** · `verify-pj-fix-D` **35 / 35** ·
  `verify-pj-gap-f1` **85 / 85** · `verify-pj-r5` **91 / 91** · `verify-pm-a` **47 / 47** · `verify-pj-gap-a` **68 / 72** — its four failures all
  expect Aisha Rahman's project on hold until 16 Nov; `pbuild/base.db` as copied today has P-2026-003 *in progress* (no `on_hold_*`) beside a
  3 Oct `project_put_on_hold` event and no resume — the base's data (F1's REG-343 domain), not this package (S43D touches no hold code or data).
- Regression runner (`RUN_DIR` + :3170, base = the migrated + repaired `pbuild/base.db`): `ghosts-same` **73 ok** · `ghosts-same-390` **73 ok** ·
  `tpl-parity` **20 / 20** · `qe-r1` **34 / 34** · `ux-p4` **56 / 56** — all green.
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (16 warnings, none in this package's files) · `npm run design:lint`
  "nothing new breaks a house rule" (baseline untouched) · `next build` under the lock, three times: exit 0. :3170 stopped.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for these; every change logged (REG-S43D.1…5), no new sentence anywhere (the ghost
   draws the page's own words; the GST fixes add none).
2. **One system, no one-offs** — the ghost kit's `GhostTable` and the books ghost's own `Table`; the seed is the shell's existing `GhostSeed`;
   `useFirstRunShape` / `useRememberShape` as C-18; money through the one `moneyOf` / `billGstRate`.
3. **Plain words** — nothing new to read.
4. **Nothing is lost** — no remove added; Apply defaults stays asked first ("Keep mine") and the money figures change only where they were wrong.
5. **Say why** — the Issuing Entity line already says "Not GST-registered — no GST on this quote"; the bill's GST is the one its paper shows.
6. **Back returns where you came from** — no navigation changed.
7. **Every screen is whole** — Commission's loader and reveal now draw the page as it lands (REG-708), for every role, at every width.
8. **Every width is designed** — the ghost's ask card measured at 390 against the page; no sideways scroll at 390 / 320 / 768 touch.
9. **Tables follow the leads listing** — the ghost draws the asks table on the listing's model (head 56, rows 64, the frozen first column).
10. **Motion with purpose** — none added; the reveal no longer jumps.
11. **Honest data** — no demo state seeded; every invoice's GST now matches the quote it bills; the demo's figures unchanged (no mixed rates).
12. **Reach for everyone** — nothing interactive added; the page's own controls are unchanged.
