# Quotes on the move — K4's outcome (2026-10-22)

**Package:** K4 — the lists (Tools › Quotes, the lead's Quotes tab), Create Quote (+ the picker's ≤767 list row), the client's confirmation page
and the view-only link (+ the dead link's notice), the quick-links strip's 768-portrait rule, the table core's per-table tablet default set.
**Built:** P-06 · P-10 · P-11 · P-12 and the fixes A-04 · A-09 · A-12 · A-13 · A-21 · A-23, every absorbed finding, Q-04 as picked (the status
changes only on the quote). Nothing committed. Lane: port 3174, `…/scratchpad/rq-build/K4/lane.db`; shots `…/scratchpad/rq-build/K4/shots/`
(`look/`, `probe/`, `desk-before/`, `desk-after/`, `desk-final/`).

## 1 · The ledger

| id | state | where |
| --- | --- | --- |
| **P-06** the list card | built | `components/leads/quotes/quotes-table.tsx` + `.module.css` (the ≤767 block), `quote-card-words.ts` (pure: the chip, the since, Remind's rule), `use-long-press.ts`. Line 1 the client's name (16 bold, the press that opens) · the amount (20 tabular, right, clear of the ⋮); line 2 number · title (14); line 3 a read-only chip (lock while private, "Expired {date}" in yellow) · the since (14) · the chevron. A hold selects (no checkbox); the bulk bar comes up. The ⋮: Open · Copy link · Remind · Preview · Change status › · Archive · Delete. |
| **P-10** Create Quote on a phone | built | `components/quotes/create-quote-modal.tsx` + `.module.css`: mode `who` ("Who is this quote for?" — recent first, then by name, a search), then four 56px rows (the default template with "Starts with …" and Change · Blank quote · Upload a quote → the file chooser · Draft with Maison AI); the gallery behind Change; a lead's tab skips the first step. The workspace passes `recent` (leads with the newest quote activity). |
| **P-11** tablet lists | built | `components/om/table-columns.ts` (`tabletHidden`, `tabletDefaultColumns`, `useTableColumns(…, phone, tablet)` with the key `om.columns.<table>.tablet`), `quotes-table.tsx` (`TABLET_TRACKS`, the frozen ⋮ head cell, `ACTIONS_TRAIL.kebab`, `data-at-end`), `.module.css` (the `(hover: none) and (min-width: 768px) and (max-width: 1024px)` block), both hosts. The quick-links strip hides on the lead's Quotes tab at 768–1024 portrait (`quick-links.module.css`). |
| **P-12** the client's page | built | `components/quotes/confirm/confirm-page.tsx` (the total card, the phone extras, the sticky bar, the Confirm sheet), `quote-stage.tsx` (the phone model, the viewer, `readingLineCount`), `paper-viewer.tsx` + `.module.css`, `client-layout.ts` (`CLIENT_PHONE_MODEL`, `useClientPhoneModel`, `waNumber`), `confirm-page.module.css`, `confirm-skeleton.tsx`; `components/quotes/view/quote-view-page.tsx` on the same shell. |
| A-01 the second line clips | built (P-06) | the client leads; number · title ellipsises as one line |
| A-02 View + ⋮ screens away | built (P-11) | the ⋮ frozen at the right; View dropped; Open leads the menu |
| A-03 the amount off-screen | built (P-11) | the tablet set + tighter tracks: Title · Client · Status · Total on a 768 frame's first screen (the probe measures it) |
| A-04 the chip reads "⌛ 3" | built | `quotes-toolbar.tsx`: the words at every width; compact only when the row measures the title's words + the chips + the tools don't fit; Create Quote folds into its + on a touch tablet so they do |
| A-05 only the 14px title opens | built (P-06) | the whole card presses (controls excepted); the ⋮'s first row is Open |
| A-06 the FAB covers the amount | built (P-06) | the amount on the first line (the probe checks no amount under the FAB) |
| A-07 no date on the card | built (P-06) | the since: opened · sent/not opened · expires in n days / today · valid until · due (red when late) · edited · confirmed · signed |
| A-08 the biggest control changes the status | built (P-06, Q-04) | a read-only chip; Change status › in the ⋮ opens the same status menu as a sheet |
| A-09 the typed search pushes the ⋮ off | built | `quotes-toolbar.module.css`: the cluster takes the row, the box gives way, the chips step aside while the search has the row |
| A-10 a silent refusal studio-wide | built (P-10) | the phone's first step is the lead; on a desk / tablet a refused press scrolls the Client field into view |
| A-11 four unreadable thumbnails | built (P-10) | rows, no thumbnails; the picker keeps them behind Change |
| A-12 the picker's list row | built | `template-picker.module.css` ≤767: a grid — thumb · name (one line) · Default tag · the meta under, ellipsised |
| A-13 1024 landscape tiles 3 + 1 | built | `create-quote-modal.module.css`: four across at 220 under 1,100 (768–1100), the well keeps its shape |
| A-14 Confirm before the quote, never after | built (P-12) | the total card leads, the bar is sticky at every scroll |
| A-15 a tablet gets the A4 at 10px | built (P-12) | the phone model = ≤767 or ≤1024 portrait: the cards; 1024 landscape keeps the paper beside the card |
| A-16 36px buttons, 14px name | built (P-12) | the bar's buttons are DS `size="lg"` (48); the card's buttons 48 and its inputs at 16 up to 1024 |
| A-17 the A4 inline at 4px | built (P-12, Q-06) | the viewer: fitted to the width, the browser's pinch, the pages one under the other, Download in the head |
| A-18 35% chrome before one card | built (P-11) | the strip hides on the Quotes tab at 768–1024 portrait; the table measured 644 wide there |
| A-20 selection offers only Delete | built (P-06) | no checkbox; a hold selects, the bulk bar as before |
| A-21 Filters is the two-pane modal in a sheet | built | `quotes-filters-modal.tsx` + `.module.css`: one scrolling sheet — Sort by · Dates · Status · Due · Valid until on the house Chips, live |
| A-22 24px drag handles on touch | kept as is (P-11) | the tablet default makes the drawer rare; the phone card decides for itself (the audit's own call) |
| A-23 a dead link with no way to ask | built | `link-notice.tsx` + `notice-message.tsx` + `link-gone.tsx`: "Message {studio}" where a phone is on record, WhatsApp on the press with the link's address in the draft; the quote links pass the phone |
| Q-04 the status from the list on a phone | as picked | only on the quote (the chip is read-only; Change status › in the ⋮ is the same menu, one tap further) |

Not done: nothing in K4's row. A-19 is lane A's note on its own captures (viewport-only shots here).

## 2 · Decisions taken (as recommended; the ones to show him)

- **The ⋮ stays on the phone card** (top right, a bare glyph), the chevron at the end of the chip line, the amount on the first line beside the
  ⋮ — the mock's `lrow` drew no ⋮; the brief's ⋮ list needs one. The since words are the card's own (invented copy, listed in reg-K4.1).
- **Remind** from the card = a WhatsApp nudge with the confirmation link, drafted on the press (REG-534's rule), only while the client holds the
  quote unanswered; the loaders carry the lead's phone and the studio's name for it. No record is written (a nudge is the designer's own message).
- **Create Quote folds into its + on a touch tablet** (768–1024 touch) so the to-do chips keep their words (A-04 · P-11): the one row at 768 could
  not hold "All Quotes", "Waiting on client · 3" and the labelled button. A deliberate change of 768–1024's toolbar; the desk is untouched.
- **The tablet tracks** are fixed widths (Title from 180): a grid wider than its frame has no free space, so a `max-content` Status track stayed
  at its floor and its words ran under the Total (seen in the first tablet shots, fixed, asserted by the probe).
- **The phone card's amount keeps 40 clear at the right** — past the ⋮ in the corner and past the Maison AI button's disc, for whichever card's
  first line meets the button's band as the list scrolls (A-06; the probe tries two scroll positions and measures the figures themselves).
- **At 320 the client page's bar stacks its two buttons** (the primary on top, full width) — side by side they ran 53px past the screen (s02's and
  s44q's 320 lines caught it); the page's floor is REG-306's 320.
- **The client's phone model** is `(max-width: 767px), (max-width: 1024px) and (orientation: portrait)` — a tablet held upright reads as a phone
  held wide (A-15); landscape keeps the paper beside the card, with 48 buttons and 16 inputs (A-16).
- **The view-only link** takes the same shell: the total card (number · version · title · amount · lines · valid until · last changed), the
  cards, a bar with Download (outlined) and Message {designer} (filled — the one thing a look offers).
- **"As printed" is a viewer**, not a toggle: the house head (← · As printed · n pages · Download), the pages fitted to the width, the browser's
  own pinch (the page allows it), Esc / ← back to the cards. Download a copy on a phone opens the viewer and prints its document.
- The Confirm sheet carries the card's own words, the name and the fine print — no new copy; a VO's Decline the changes rides in it too.
- The dead link's "Message {studio}" shows at every width (the fix is marked "all"): the one deliberate 1440 change (the notice page).

## 3 · Shared pieces changed (outside K4's own files, all additive)

- `components/om/table-columns.ts` — `TableColumnDef.tabletHidden`, `tabletDefaultColumns`, `useTableColumns(table, defs, phone, tablet)`: a
  fourth argument (default false) and a per-breakpoint key `om.columns.<table>.tablet`. Every other table is unchanged (it never passes `tablet`).
- `lib/leads/quotes.ts` — `LeadQuotesData.leadPhone` · `studioName`; `lib/quotes/list.ts` — `StudioQuoteRow.leadPhone`, `StudioQuotesData.studioName`.
  Data only, for the card's Remind.
- `components/contracts/sign/link-notice.tsx` (an optional `contact`), `link-gone.tsx` (an optional `phone`), new `notice-message.tsx`,
  `signing-page.module.css` (`.noticeAction` + its 48 on touch). The contracts' notices pass nothing and read as before.
- `components/leads/detail/tab-ghosts.tsx` — the Quotes tab ghost's phone card is 104 tall (was 126), the new card's measure.
- `components/leads/detail/quick-links.module.css` — one rule: `[data-tab='quotes'] + .aside { display: none }` at 768–1024 portrait.
- `components/templates/template-picker.module.css` — the ≤767 list-row grid (A-12) only.
- (K2's note at landing) the `button::after { inset … }` touch overrides are deleted from five of K4's stylesheets — `quotes-table.module.css`
  (the row kebab), `quotes-toolbar.module.css`, `quotes-empty.module.css`, `quotes-filters-modal.module.css`, `create-quote-modal.module.css`
  (the tile kebab): the house IconButton's own centred 44 box carries the target (the probe lands each toolbar glyph and the row's ⋮ at its own
  centre with `elementFromPoint`). K2's `icon-button-overlay` baseline is the orchestrator's to lower; `design-lint.baseline.json` untouched here.
- Probes updated for deliberate changes (each line commented `(quotes on the move, a deliberate change of this rule)`):
  `verify-pm2-s02.cjs` (the viewer; 768 portrait = the phone model, 1024 landscape = the print), `ux-build …/P4/verify-p4.cjs` (Q6: the viewer,
  the bar's Ask), `projects/verify-pj-gap-d.cjs` (390: the declined VO's bar line with the reason).

## 4 · For other packages

- **K1** (the Quote screen): the card's press opens `/quotes/<id>?from=…` — K1's screen lands there at ≤1024; nothing else assumed. The Remind
  draft the card sends is `remindMessage` in `components/leads/quotes/quote-card-words.ts` — K1's Sent-to-Client primary can reuse it so the two
  nudges read the same.
- **K3** (Preview): the client's "As printed" viewer is `components/quotes/confirm/paper-viewer.tsx` (the house head, fit to width, the browser's
  pinch) — K3 may reuse or mirror it for `?paper=1`; it has no page dots or swipe (the pages stack).
- **K5**: nothing needed from K4. The confirmation page's sheet is the house `Dialog size="form"` (a bottom sheet ≤767) — K5's B-16 foot rule
  will reach it.

## 5 · What to check in the browser

Members: Dane (Owner) · Hui Min (Admin) · Germaine (Designer). Widths: 390 · 768 (touch, portrait) · 1024 (touch, landscape) · 1440.
1. `/quotes` at 390: the cards (name · amount · number · title · chip · since · chevron); press a card → the quote; hold a card → the bulk bar;
   the ⋮ → Open · Copy link · Remind (Serena's) · Preview · Change status › · Archive · Delete; Filters → one sheet of chips; type in the search.
2. `/leads/<serena>/quotes` at 390: the title leads; at 768 portrait: no quick-links strip, Title · Status · Total · Due, the ⋮ frozen; the
   Overview still shows the strip.
3. `/quotes` at 768 and 1024 touch: Title · Client · Status · Total · Due, the ⋮ frozen right, the title opens, Open first in the menu, the to-do
   chip's words, Create Quote as +; Column settings adds Creator (remembered for the tablet only).
4. Create Quote at 390 from `/quotes`: Who is this quote for? → a lead → the four rows → Change → the picker (list view: name over meta) → Back;
   Upload a quote → the file sheet; Blank quote → the quote. From a lead's tab: the rows at once. At 1024 landscape: four tiles on one row.
5. `/confirm/<token>` (Serena's, OM-10007) at 390 and 768 portrait: the total card → the cards → the bar; scroll to the end, the bar stays; View
   as printed → the viewer (pinch on a device); Confirm quote → the sheet; Ask for a change → the dialog. At 1024 landscape: the card above the
   paper, Confirm 48 tall. At 1440: as before.
6. `/quote/none` at 390: "Message Demo Studio Pte Ltd". A view-only link (`/quote/<token>` after Share a view-only link): the total card, the
   cards, Download · Message {designer}.
7. Germaine: the card's Delete reads disabled with its reason for a quote she did not create; Remind and the rest work.

## 6 · The probes

- `design-source/verify/responsive-quotes/verify-rq-k4.cjs` (+ `rq-k4-pure.mts`, 25 rules inside its first line): **143 passed, 0 failed** against the lane's production build
  (`BASE=http://localhost:3174`, `lane.db`); every new press tapped, every box measured, the page error log empty, the DB put back.
- Existing probes touched and run against the lane: `pending-modules/verify-pm2-s02.cjs` **107 / 107** (its 320 line found the bar's two buttons
  running 63px past a 320 screen on the first run → the bar stacks them under 360 now; its `/f` checks need `AUTH_SECRET` in the lane's
  `.env.local`, added for the run) · `ux-build-2026-09-30/P4/verify-p4.cjs` **56 / 56** · `pending-modules/verify-pm2-s44q.cjs` **52 / 52**
  (the same 320 line, green on the re-run) · `projects/verify-pj-gap-d.cjs` **65 / 65** · `pending-modules/verify-pm2-s46a.cjs` **116 / 118** —
  its two failures are plg's signed-out ad links landing on the trial tools (`/site/try/quote-x-ray`, `/site/try/upload-a-quote` answer 200 only
  with `TRIAL_TOOLS_ENABLED`, which the regression harness's `run-env.sh` passes and this lane did not); nothing of K4's.
- Checks: `npx tsc --noEmit -p .` clean · `npx eslint app components lib` clean of errors · `npm run design:lint` "nothing new breaks a house rule"
  (the viewer's bar is the house `SurfaceHead`) · the production build green.

## 7 · The 1440 comparison

`…/scratchpad/rq-build/K4/shots-1440.cjs before|after|final` + `compare-1440.cjs`: twelve pages at 1440×1024 with a mouse — Tools › Quotes, Create
Quote (the rail · the picker · its list view), Filters, Column settings, the row ⋮, the lead's Quotes tab, the lead's Overview, the confirmation
page, the view-only notice, Create Quote on Upload. **Byte-identical: 11 of 12.** The one difference: `11-view-notice` — 34,455 px inside the notice
card's bottom band (y 301–369): the dead link's new "Message Demo Studio Pte Ltd" button (A-23, a fix marked "all" widths; the deliberate change).
Taken with no probe running, on the lane database put back to `base.db` first: P4's run leaves the blank quote its Q12 makes (OM-10010, Arjun
Mehta) and a bell row behind, which had put an extra card on every list page of an earlier comparison. (P4 also rewrites its banked shots under
`design-source/verify/ux-build-2026-09-30/P4/` when it runs — restored with `git checkout`, nothing of K4's there.)

## 8 · Principles check (DESIGN-PRINCIPLES.md)

1. The mock wins, exceptions written down — the drawn screen 1 (the card) built as drawn; every invented word listed in reg-k4.md.
2. One system, no one-offs — the card's chip is the house `MetaChip`, the sheets the house `PortalMenu` / `Dialog` / `Chips`, the viewer's bar the
   house `SurfaceHead`, every value a token (design lint green).
3. Plain words — "Who is this quote for?", "sent 16 Sep · not opened", "Message Demo Studio Pte Ltd"; the ⋮'s Delete says its rule in the row.
4. Nothing is lost — Archive and Delete keep their Undo; a hold's selection clears with ✕; the desk's every action is one tap further on the phone.
5. Say why — a quote nobody may delete reads disabled with the rule; "No phone number on this lead — add one to send a reminder".
6. Back returns where you came from — the card opens with `?from=`; the viewer's ← and the Create sheet's Back return in place.
7. Every screen is whole — the ghosts redrawn for the card and the client's phone model; tooltips on every icon-only control.
8. Every width is designed — 390 · 768 portrait · 1024 landscape · 1440 each measured; no sideways scroll at 320 / 390 / 768 / 1024; 44 / 48 targets.
9. Tables follow the leads listing — the tablet set through the shared column model, the ⋮ frozen as the listing freezes its block, selection kept.
10. Motion with purpose — the sheets and dialogs on the house variants; no new timings.
11. Honest data — the since words, the lines count and the valid-until come from the records; the demo's phone is the lead's.
12. Reach for everyone — the card's name is a real button, the chevron decorative, the viewer a dialog with focus and Esc.
