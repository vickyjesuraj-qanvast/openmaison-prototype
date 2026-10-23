# Quotes on the move — K3's outcome (P-05 · Q-06; C-16 C-17 C-18 C-20 C-21 B-08 absorbed; C-19 fixed), 2026-10-22

Package K3 of the build his "I have marked it please go ahead" started (the review page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w;
the brief `…/scratchpad/rq-build/brief.md`). Owned: the Preview route and components, its ghost, the editor's client-view pane. Worktree of main,
port 3173, lane DB `…/rq-build/K3/lane.db`. Nothing committed. Staged register rows: `reg-k3.md` beside this file.

## 1 · Ledger

| Id | Status | Where / why |
| --- | --- | --- |
| **P-05** As printed is a viewer, not the main screen | **Built** | ≤767 the Preview reads the quote as the confirmation page's `ReadingCards` under one 56px bar (back · "Preview" + number · status · ⋮) with the cards' head "n lines · As printed" and Send ▾ as the foot's one 48 button; **As printed opens the house paper viewer** (`components/quotes/confirm/paper-viewer.tsx`, K4's — reused, not a second one) over the cards: ← · As printed · "OM-10001 · 3 pages" · Download, the A4 fit to the width, one page per swipe, dots, pinch / double-tap, Fit to width; `?paper=1` rides the address. 768–1024: the same one-line bar with Download and Send ▾ in it, the A4 at 1:1 centred, the margins scrolling. Copy link ("for the team") · Share PDF · Internal copy · What your client sees · Change template under ⋮. The editor's Client view button at ≤1024 is K1's; the pane's own answer at ≤1024 is the door to Preview (below). |
| **Q-06** fit to width, pinch to zoom | **Built as picked** | the viewer opens at fit (page = screen − 32); pinch up to 4×, double-tap 2.5×, never below fit. |
| C-16 the 4.4px paper at 390 | Absorbed → built | no paper on the phone's page; the viewer's page is fit to the width and zooms inside its own body — the head never scales (asserted). |
| C-17 the 234px bar | Absorbed → built | one 56px bar; the four buttons and the switch are ⋮ rows (54 tall each). |
| C-18 8.5–10px at 768 | Absorbed → built | zoom 1 at ≤1024, the stage opens centred (37 of 74 scrolled at 768), body text 10.7–12px — the print's own size. |
| C-19 What your client sees: 40px rows, Amounts below the fold | **Fixed** | rows 48 (touch), words 16, help 14; Columns as one line of chips (`Chips multiple`) in the Drawer; the desk's panel keeps its switches. One panel body now (`client-view-panel.tsx`) — the aside and the Drawer were two copies. |
| C-20 Copy link reads as the client's link; Download is `window.print()` | Absorbed → built | "Copy preview link · For the team — it opens with a sign-in, never for the client"; "Share PDF · Through WhatsApp, mail or AirDrop" (the system share sheet with the PDF file once a renderer is plugged in — `lib/services/pdf.ts`, `PDF_DOWNLOADS`; the print sheet until then — the developers' item). |
| C-21 the editor's Client view pane at every touch width | Absorbed → built | `client-view-pane.tsx` at ≤1024 draws the door: the mark, "Preview as client", one line naming the client and the template, one filled *Open Preview* (48). K1 has since dropped the editor's Drawer at ≤1024 (per the coordinator) — the door stays as the pane's own answer wherever it is mounted. |
| B-08 the Client view drawer's 5–6px type | Absorbed → built | as C-21: no paper in the pane at ≤1024. |

## 2 · Decisions taken (as recommended; the reversals for him flagged)

- **Send ▾ in the foot on a phone, in the bar on a tablet.** The brief's P-05 line reads "(← · Preview · Send ▾)"; the mock's screen 10 and the Quote screen (K1) put the primary in a 48 foot. On a phone the foot is the thumb's reach and the module's one pattern; on a tablet the bar has the room and the brief's words hold. *His call if he wants it in the bar on a phone too.*
- **The house viewer, shared with the client's page** (the coordinator, mid-package): my own viewer was removed; K4's `paper-viewer.tsx` was copied in unchanged and then extended in my copy — see §4. "As a list · As printed" as a segmented switch (my first cut) gave way to the confirmation page's own row ("n lines · As printed") since the viewer is a layer over the cards, not a second state of the page.
- **Closing a viewer the person arrived on returns to the quote**, not to a Preview page they never saw (the Quote screen's "As printed" → the viewer → ← → the quote); a viewer opened from the cards closes back to them. The viewer's arrow already says "Back to the quote".
- **Download lives where the paper is**: the viewer's bar on a phone, the page's bar on a tablet; never duplicated under ⋮ (Share PDF is the ⋮'s way to a file).
- **Dots up to six pages**, "n / N" beyond (six 44px targets fit a 320 screen).
- **Hidden items · Amounts** still sit below the fold of a 390 sheet after C-19's fix (rows 48 add what the chips save); the sheet scrolls, as every house sheet does. Left as is.
- A template with no Items block to read (no `readingSections`) draws its paper in the phone's column at fit, as before, and shows no As printed.

## 3 · Shared pieces changed

- `components/quotes/confirm/paper-viewer.tsx` · `paper-viewer.module.css` — **copied from main (K4's) and extended** (details in §4). Not in my worktree before; the orchestrator merges my copy over K4's.
- Nothing else outside my files. `components/om/*`, `components/templates/render/*`, `lib/*`: untouched.

## 4 · For other packages / the orchestrator

**K4 (the house paper viewer) — what my copy changes, all additive to its API:**
1. `subtitle?: ReactNode` — one line under the title (the Preview passes "OM-10001 · 3 pages"; the confirm page may move its page count there).
2. The pages lie **side by side**, one per swipe: the body snaps page by page (`scroll-snap-type: x mandatory`, each `[data-page]` `scroll-snap-align: center`; the gap between pages = the two 16 gutters met, set in the document's own px as `--gap-z` from the zoom the host drew at; the box's edge gutters `--edge` grow with the zoom). K4's body stacked them vertically.
3. **Page dots** (≤6 pages; "n / N" beyond) under the body, each a 44 target that jumps to its page; the hint reads "Swipe for the next page · pinch to zoom" (one page: "Pinch or double-tap to zoom"); *Fit to width* replaces the hint while zoomed. K4's `<p class="hint">Pinch to zoom</p>` became this foot (`.foot` · `.dots` · `.dot` · `.count` · `.hint`).
4. **The viewer's own pinch and double-tap** (native, non-passive touch listeners on the body; the live gesture is a compositor `transform` on the box, the real zoom lands on lift) in place of the browser's: `touch-action: pan-x pan-y` (was `… pinch-zoom`), so the head never scales with a pinch (C-16). The zoom reaches the host through the existing `onFit(width)`: it now reports the body's inner width (less the gutters) **times the zoom** (1 → 4). K4's host (`quote-stage.tsx`) clamps `viewerZoom` at 1 — on the client's page a pinch therefore stops at 1:1 (794px, about 2.2× fit on a 390 phone), which is fine; lifting the clamp to `fitW / pageW` gives it the full 4×. `onFit` is called from an effect on `[open, w, scale]` instead of inside the ResizeObserver.
5. The page count is read from the DOM (`[data-page]` under the box, a ResizeObserver on the box), so no host change is needed for the dots.
6. `data-scale` · `data-page-at` on the dialog, `data-testid="page-dots" · "fit-width" · "page-count"` for the probes; `@media print` lays the pages back in a column.
The confirm page's own probe (K4's) should still pass: the head, `paper-viewer-back` / `paper-viewer-download`, the fitted width and `onFit` are as K4 left them. I could not run it here (K4's files other than the viewer are not in my worktree).

**K1:** the Quote screen's "As printed" → `/quotes/<id>/preview?paper=1` lands on the viewer and its arrow returns to the quote (`router.push(back)` with `?from=` kept). The Preview's "Open" on a readiness issue still sends `?section=<key>` to the editor — fine per the coordinator (the editor rewrites it to `?edit=<key>` on touch widths). The Preview's Back is `withFrom('/quotes/<id>', from)`.

**K5 (send/*):** `SendButton` is used as is in the foot (`.foot button { min-height: 48px; width: 100% }` on my side) and in the tablet bar (a 44 overlay round the 36 button in my stylesheet) — no change asked of it.

**The developers:** Share PDF's real file is the S34 registry's PDF renderer (`lib/services/pdf.ts`, `NEXT_PUBLIC_PDF_DOWNLOADS=1`); until then the row opens the print sheet (Share on iOS, Save as PDF on Android), the same stand-in as Download.

## 5 · What to check in the browser

Dane (Owner) · Hui Min (Admin) · Germaine (Designer) — the same pages; Priya (Accounting) for the read-only Preview (a signed quote from a project's Money).
- **390 touch** `/quotes/<OM-10001>/preview`: the bar (back · Preview · OM-10001 · Draft · ⋮), "16 lines · As printed", the cards, the foot's Send ▾ (48). As printed → the viewer: the head "As printed / OM-10001 · 3 pages" with Download, the page fit to the width, swipe → page 2 and the dot follows, double-tap → 2.5× and *Fit to width*, pinch; ← closes back to the cards. Reload with `?paper=1` → the viewer; ← → the quote. ⋮ → the five rows; Copy preview link → the snackbar; Internal copy → the cost card (and the watermark on the paper); What your client sees → the sheet with the Columns chips and 48 rows; Change template → the picker. 320: nothing scrolls sideways.
- **768 touch** (portrait): the same bar with Download and Send ▾; the A4 at 1:1, centred; the margins scroll with a finger; ⋮ → What your client sees opens the Drawer. The editor's Client view (wherever K1 leaves it): the door, Open Preview.
- **1024 touch** (landscape): the A4 fits (992 ≥ 794), the bar on one line.
- **1440**: as before — the 76 bar, the four buttons, the Internal copy switch, Send ▾, the 360 panel with switches.

## 6 · Probes and tallies (all on the final build, port 3173, lane DB; every DB change put back)

- `design-source/verify/responsive-quotes/verify-rq-k3.cjs` — **91 passed, 0 failed**; shots in `…/rq-build/K3/shots/` (01-list-390 · 02-paper-390 · 03-paper-page2-390 · 04-paper-zoomed-390 · 05-menu-390 · 06-wycs-390 · 07-send-390 · 08-paper-320 · 09-paper-768 · 09-paper-1024 · 10-wycs-768 · 11-client-view-door-768 · 12-desk-1440 · 13-priya-390; tablet shots viewport-only).
- Existing probes my change could touch, against the lane: `verify-pm2-s44i.cjs` **110/0** (row 352's `?panel=client` link opens the panel) · `verify-pm2-s44f.cjs` **101/0** (the comparison and kept-version cards, the client pages' prices) · `verify-p4.cjs` **56/56** (Preview's Send ▾, the Preview ghost's last button) · `verify-sw-r1.cjs` **34/34** ("390: Preview never scrolls sideways") · `verify-ghosts-same.cjs ed-quote-preview` at 390 touch, 768 touch, 1440: **0.00% apart** each. No assertion changed in any of them. (P4 rewrote its banked shots as it ran — restored with git.)
- The ghost beside the page (`…/K3/measure-ghost.cjs`): 768 the ghost's sheet at (−13, 80, 794×1123) = the page's; 390 `?paper=1` the viewer's sheet at (16, 173, 358×506), head 84, foot 76 = the page's.
- Page error log: empty on every run.

## 7 · The 1440 comparison

K1's `compare-1440.cjs` against the HEAD build (K1's `before/` checkout on port 3183, its own DB copy) vs the lane (3173), PNG bytes at 1440×1024 (and 1025): **7 identical, 0 differ** — `/quotes/<OM-10001>/preview`, the same with `?panel=client` (the panel open), `/quotes/<OM-10004 Signed>/preview`, `/quotes/<VO-1 Aisha>/preview`, the Draft's preview at 1025, the Draft's preview scrolled 900, and the editor `/quotes/<OM-10001>`. Run before and after the house-viewer rework and again on the final build.

## 8 · Checks

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 18 warnings are the pre-existing ones, none in K3's files) · `npm run design:lint` "nothing new breaks a house rule" (no baseline change) · production build green four times.

## 9 · Principles check (`DESIGN-PRINCIPLES.md`)

| Principle | Met how |
| --- | --- |
| The mock wins | the drawn screen 10 (viewer: fit, pinch, dots, swipe, Download in the bar) built as drawn; the one-line bar and the ⋮ as the brief's contract; nothing invented beyond the words logged as invented copy. |
| Nothing visible changes without him | every change ≤1024, under his "please go ahead"; 1440 byte-identical (§7). |
| One house piece, no copies | the house viewer (K4's) reused and extended, my own removed; `ClientViewPanel` replaces two drifting copies; the cards' head is the confirmation page's row; the ⋮ is `Dropdown` (a sheet on a phone); the chips are `Chips`; the foot's rule is the house foot's. |
| Plain words | "As printed", "Copy preview link — for the team…", "Share PDF", "Fit to width", "Swipe for the next page · pinch to zoom". |
| One filled button per screen | the phone: Send ▾ in the foot; the viewer: none (the arrow and Download are bare); the tablet: Send ▾ in the bar. |
| Touch: every target 44, foot buttons 48, 16 gutters | measured: Back 44, ⋮ 44, Download 44, the dots 44, the menu rows 54, the panel rows 48, Send 48 (foot) / a 44 box (bar), the page 16 in from each edge. |
| Read first, edit second | the Preview reads (cards) and acts (Send); nothing on it edits. |
| Undo on every remove; a refusal says why | n/a — nothing is removed here; a refused action keeps its own snackbar. |
| The ghost is the page | loader = reveal (0.00%), the sheet to the pixel at 768 and at 390 `?paper=1`. |
| Back returns where you came from | `?from=` kept on Back; `?paper=1` without a round trip; the viewer's arrow returns to the quote when arrived on. |
| Nothing a desktop can do is lost | Internal copy, What your client sees, Change template, Copy link, Download, Send, a kept version, a comparison — all one tap further on a phone; the desk unchanged. |
| Keys | `data-kb="back"` on the bar's Back; no key hints drawn on touch (the house menu's rule). |
