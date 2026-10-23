# Contracts on the move — C3's outcome (P-05 · P-06 · A-24 · A-25 · C-26; absorbed A-16 … A-23 · A-26), 2026-10-22

Package C3 of the build his "I have marked everything in the doc please check and built accordingly" started (the review page
https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv; the lane A audit `audit/A-lists-and-the-clients-side.md`). Worktree
`agent-a87442e531f65863d`, WIP base `58e581c2`, lane port 3183, lane DB `rc-build/C3/lane.db`. The register rows are staged in `reg-c3.md`
(REG-C3.1 … C3.11). Built in one sitting; the first probe run (102 · 5) found two real things — the signed bar's icon ligature broken by a
rule on the button's spans, and a landing that left the Signed card's rows under the sticky bar — and three probe-side misreads; all fixed,
the second run 107 · 0, the third (with the 768 open-state shots added) in §6.

## 1 · Ledger

| Id | Status | Where / why |
| --- | --- | --- |
| **P-05** the client's signing page: paper first, one bar that walks to the signature | **Built** | ≤1024 (a tablet held upright included — Q-01): the 64 letterhead bar; a three-line hero (`sign-hero.tsx`: the agreement · "Signs quotation OM-10001 · S$49,838.07 → As cards" · "Hi Olivia, read it, then sign with a one-time code."); the paper first, reflowed at 16 as `ContractPaper` already did; the sticky bar (`sign-bar.tsx`, `data-surface-foot` so the snackbar clears it): "Read to the end to sign · 8 of 13 sections" from the paper's headings as they pass the upper 60% of the screen (`use-reading-progress.ts`), then **Accept and sign** (48, full width) once the end is reached — the read gate and the tick stay the rules they were (REG-633). The desk's card never mounts on the phone (`useMediaQuery(TABLET_DOWN)`), the CSS decides the first paint (`sign-phone.module.css`: the hero, the bar and the Signed card are `display: none` ≥1025, the desk's card hidden ≤1024). After Sign the page lands on the signature box with the Signed card resting above the bar (`landOnBox`). A bundle walks document by document under the same bar (`bundle-signing-page.tsx`: the hero lists the documents, "Document 1 of 2 · Read to the end" → Next document → Accept and sign on the last; the sheet once, at the end, with each document's tick named). |
| **P-06** the signing sheet: ticks, six code boxes with autofill, type or a fixed-ratio pad | **Built** | `sign-sheet.tsx` on the house `Dialog size="form"` (a bottom sheet ≤767, a centred 400 dialog on a tablet), three screens, one filled button each: (1) the words to tick at 16 as 44 rows + the CaseTrust box (its tick 44, its bullets 14) → Continue sends the code; with nothing to tick the sheet goes straight for the code; (2) the house `CodeBoxes` — `autocomplete="one-time-code"` and `inputmode="numeric"` were already there (nothing to add; said in §3), 56 boxes, the sixth digit verifies, Verify for a keyboard, Send again only where a text really goes (S42 B-03 kept); (3) Type first (Q-02), the name prefilled, the serif preview, the consent sentence at 16 in the default ink, "Add NRIC / FIN (optional)" folded, Draw one tap away: `SignaturePad ratio={2} hideClear` + a 44 Clear under it. Sign closes the sheet. |
| **A-24** "Download a copy" prints — nothing in WhatsApp's browser | **Fixed (Q-06 "page")** | `save-copy.ts`: Save a copy (the Signed card's row and the bar's button) opens the device's share sheet with this page's address where `navigator.share` exists; without it the link is copied and the snackbar says "Link copied — this signed page stays at it, with the signing record and fingerprint 8bc3fcf0…"; `window.print()` is never called on the phone model. The desk keeps Download a copy (the print; the PDF when the S34 renderer lands — `lib/paper-print.ts` is untouched and still the seam). |
| **A-25** the dead-link notice has no way to ask | **Fixed** | `LinkGone` gets `phone={brand.details.phone}` from the three route pages; `SigningPage` / `BundleSigningPage` pass `studio.phone` to `LinkNotice`; `SignQuoteView` takes a `phone` prop. Every "ask the studio" notice on a contract link (never made, archived or deleted, expired, the bundle's, the quote page's) carries K4's **Message {studio}** — 48 tall ≤1024 (the shell's existing rule), on the desk too (A-25 said *all*; the three notice pages are the one deliberate 1440 difference, §7). |
| **C-26** the chat card's eyebrow 5px in a WhatsApp preview | **Fixed** | `lib/link-cards/card-image.tsx`: the eyebrow 24 → **40** (letter-spacing 1, clipped at 32), the "For {client}" line 30 → **44** (clipped at 40); the title and the layout unchanged, the vertical budget checked (≤ 535 of 630 with a two-line title). Module-wide by design — every kind's card gains it (the quote's, an invoice's, a PO's …); the words stay each kind's. The before / after PNGs: `rc-build/C3/shots/{before,after}-1440/card-sign-sent.png`. |
| A-16 the quote the client signs is an A4 at 4px (Blocker) | **Fixed** | `quote-layer.tsx` (in place) and `sign-quote-view.tsx` (the page) both read as K4's `QuoteStage`: the confirmation page's total card (`quote-total-card.tsx` on `confirm-page.module.css`'s own classes) and `ReadingCards`; "View as printed" → the house `PaperViewer` (fit to width, pinch); a tablet held sideways shows the paper at 1:1 (asserted: 794 wide at 1024×768). |
| A-17 the quote link opens a new tab, Back lands on a second agreement page | **Fixed** | "As cards" opens the layer over the agreement — never a new tab; one history entry while open, so the phone's Back (and ←) closes it with no reload and the agreement where the client was (asserted with a `window` marker). The page's own bar reads "← Agreement" ≤767 (the long words hidden) and links to the agreement. The desk's "view the quote" link keeps its new tab (REG-633 Q-20, byte-identical). |
| A-18 the form above the paper, the ticks 3,400px from the reading's end | **Fixed** | the paper first; the ticks in the sheet the bar opens at the end — see P-05. |
| A-19 the drawn signature warped by the pad's width | **Fixed** | `components/om/signature-pad.tsx`: the pad maps its box into the 752×140 frame **uniformly** and shows exactly that region (`xMidYMid meet`), so a 100×100 square is stored and printed square on every width (asserted at 390: bbox ratio 1.00, it was 1.97; and on the desk's 312×120 pad). Shared with Signature Settings — §3. |
| A-20 the one-time code is a plain text field, no autofill | **Fixed** | the house `CodeBoxes` in the sheet (see P-06); the desk's card keeps its field (unchanged by the brief). |
| A-21 the consent sentence and the CaseTrust bullets at 12 | **Fixed** | the sheet: the consent 16 in the default ink, the tick rows 16, the CaseTrust disclosure 16 and its bullets 14, the hero's lines 16, the bar's lead 16/600 and hint 14 — on the type tokens (`body-l` · `body-m` · `subheading-l`; `design:lint` green). |
| A-22 the client's buttons 36 drawn | **Fixed** | 48 drawn for every client press ≤1024: the bar's button(s), the sheet's foot buttons (`size="lg"`), the notice's Message (the shell's rule), the Signed card's rows 56. |
| A-23 Clear a 36×20 corner button; NRIC between the pad and Sign | **Fixed** | Clear a DS text button under the pad (its 44 box asserted 18px below its centre); NRIC behind "Add NRIC / FIN (optional)"; the Type / Draw chips 14 at 44 tall (`.how button`). |
| A-26 the record under the whole paper; the Signed card does not point to it | **Fixed** | the Signed card's **Signing record** row opens the record in a sheet (`SigningRecord bare`); the page lands on the card; the bar's "Signed by Olivia · 22 Oct ’26" is a press that lands there again. The record's words are untouched (the brief: the record stays as it is). |
| P-13 the scale on these screens | **Built** | as A-21 · A-22; 16 gutters ≤767, 12–16 inside the cards; inputs at 16 (`.sheetBody input`). |

## 2 · Decisions taken (as recommended; the ones he should see first flagged ▲)

1. ▲ **The pad's fix is uniform mapping, not a letterboxed frame** (REG-C3.3). The brief's literal reading — `preserveAspectRatio="xMidYMid meet"` on the 752×140 viewBox inside a 2:1 pad — would leave a 5.37:1 band to draw in and dead space above and below it. Instead the pad maps its own box into the frame uniformly and shows exactly that region: the whole pad is drawable, the ink lands under the finger, and the stored path keeps its shape on every width (the desk's 312×120 pad warped drawings too — 2.4× across, 1.17× down; it no longer does). A path stored by another pad that reaches outside the region shows whole. The paper, the kept copy and the record read the frame as before; the empty pad draws the same pixels at rest.
2. ▲ **The phone model is ≤1024 in full** (Q-01): a tablet held sideways at 1024 has no room for the desk's 1,176px (paper 816 + 24 + card 360) and showed the card above the paper already; it now gets the phone model, with the quote layer showing the paper at 1:1 there (the audit's "768–1024: the paper at zoom 1"). The sheet is a centred 400 dialog from 768 (the house Dialog's own rule).
3. ▲ **The dead-link notices gain Message {studio} on the desk as well** — A-25 said *all* widths and K4's quote links already carry it there; the three notice pages are therefore the only deliberate 1440 difference (§7). The signing page itself is byte-identical.
4. **The bar's reading state has no button** — a disabled "Accept and sign" would be a target that refuses; the words say what comes first and the progress says how far they are. The gate is a rule (REG-633), not a wait.
5. **The bundle's ticks come once, at the end** (REG-C3.10), each named by its document, so the walk is read → read → sign, never read → scroll up → tick → scroll down. The server's rule is unchanged (`acceptedAt` per document; a missing tick is refused).
6. **With nothing to tick the sheet skips its first screen** and asks for the code straight away (an uploaded PDF with no accept gate) — one tap fewer.
7. **Save a copy's fallback is a snackbar, not a dialog** — one line that says where the copy lives and its fingerprint's first eight characters; the full record is one tap away in the Signing record sheet.
8. **The in-place quote is read lazily** (`fetchSignQuoteDoc`, by the token) so the agreement's first load carries no quote data; the layer keeps what it read for the next open.
9. **The desk's card and DOM are untouched** — every desk probe that reads `Send code`, `One-time code`, `Verify`, `Sign agreement`, `gate-accept`, `deposit-pay`, `signing-record` passes unchanged; the phone's pieces carry new test ids and the pieces with shared ids (DepositPay, SigningRecord, CaseTrustBox) mount only where the model says.
10. **The quote page keeps a plain link back** ("← Agreement" ≤767): on a phone the signing page opens the quote in place, so this page is reached by a direct link or from the desk; a history-back there could leave the site.

## 3 · Shared pieces changed (and why each is safe elsewhere)

- `components/om/signature-pad.tsx` — the uniform mapping (A-19), `ratio` and `hideClear` (both optional, off by default). **Signature Settings** (the quote editor's Signature section) uses the same pad: the empty pad renders the same pixels; a drawn stroke now stores true instead of stretched to the pad's width; a member's existing drawn signature (none in the demo — Dane's is typed) shows whole. The DRAWN_PATH rule, the paper's 200×40 box and the record are unchanged.
- `components/contracts/sign/signing-page.module.css` (the shell the confirmation, view-only quote, meeting, hangout and join pages import) — only additive: `.depositBare`; the dead `.nextBar` / `.nextText` rules removed (the old phone bar is gone; nothing else used them). No rule those pages use was touched.
- `components/contracts/sign/deposit-pay.tsx` `bare` · `signing-record.tsx` `bare` — optional props for the phone's sheets; the desk renders as before.
- `lib/link-cards/card-image.tsx` — the eyebrow and line sizes for every kind (C-26, said in §1).
- `app/sign/quote-actions.ts` — new, a server action with one string argument (the token); it answers only the client view and only while the link opens or is signed.
- Nothing in `components/om/code-boxes.tsx`: `autocomplete="one-time-code"` and `inputmode="numeric"` were already there (the brief's "if missing — say so").
- Read, not changed: `components/om/sheet.tsx` (`useSheetFootLift` — the bar marks itself `data-surface-foot` and the pages call the hook so the snackbar clears the bar; if C1 reshapes the hook for B-21 the call sites are the two signing pages).

## 4 · For other packages / the orchestrator

- **C1 (the Contract screen):** `lib/contracts/next-step.ts`'s Signed line can point at the client's signed page; nothing of C3 is needed there. The Preview's "As printed" and K3's `PaperViewer` are reused as they are.
- **C4 (the lists, the Won step):** the signed copy a client makes on a phone is this page at its link (REG-C3.6); the Won step's photo (Q-04) is C4's and independent.
- **The orchestrator:** `ui-sweep/verify-sw-r2.cjs` and `ux-build-2026-09-30/P5/verify-p5.cjs` carry deliberate changes (REG-C3.11); the regression's `prepare.cjs` was not run — the runs below used a copy of this lane's clean DB as `base.db`. The old `/sign/<token>/quote` desk render went through `QuoteStage` (K4's), which costs 3 pixels of one underline's anti-aliasing in the quote's footer at 1440 (§7) — the confirmation page and the signed quote now draw through one path; if byte-identity there matters more than the single path, the old direct `TemplateDocument` branch is a six-line revert in `sign-quote-view.tsx`.
- **A question that is the house head's, as K5 raised:** the sheet's titles are the house 20/700; its one-line subtitle would be 12 — the sheet has none, so nothing to decide here.

## 5 · What to check in the browser

**As a client (Demo Studio › any member; open a sent link in a phone-sized window or a real phone):** send the Draft agreement for Olivia Martinez (Tools › Contracts › the Draft › Send) and open the link at **390**: the hero, the paper first, the bar "Read to the end to sign · 1 of 13 sections" counting as you scroll; tap "As cards" → the quote as cards, View as printed → the viewer, the phone's Back closes the layer; read to the end → Accept and sign → tick the words and the CaseTrust box → Continue → the six boxes (the SMS autofill offers on a real phone; any six digits in the demo) → Type with the name, or Draw a square and see it print square → Sign agreement → the page lands on the signature box with the Signed card: Save a copy (the share sheet on a phone; a snackbar on a desktop browser), Signing record (a sheet). Reopen the link: the signed state lands the same way. **768 upright:** the same, the sheet a 400 dialog. **1024 sideways:** the same model; As cards shows the paper at 1:1. **1440:** nothing changed — the card beside the paper, Send code, the One-time code field, Draw, the record under the paper, Download a copy; the dead-link notice now carries Message {studio}.
**Dane · Owner · Hui Min · Admin · Germaine · Designer:** the studio side is untouched; each sends and reminds as before. A bundle (Send together, two documents): at 390 the hero lists them, Next document walks, Accept and sign on the last, the sheet names each document's tick, "Sign 2 documents".

## 6 · Probes and tallies (the final build, port 3183 / the runner's 3193, the lane DB; every change put back)

- `design-source/verify/responsive-contracts/verify-rc-c3.cjs` — **110 passed · 0 failed** (sections 1–6: 390 · 768 upright · 1024 sideways · 1440 · 320; every new press a real tap; the share sheet stubbed and removed in turn; the contracts, the set and the quote's state put back by the tables' hashes); shots `rc-build/C3/shots/01…20`; page errors 0.
- The existing probes my change could touch, each on a fresh copy of the lane's clean DB (the regression runner on :3193, its `base.db` = this lane's DB, never the owner's `local.db`) or by hand against :3183:

| Probe | Tally | What it covers of C3's |
| --- | --- | --- |
| `contracts-parity/verify-ct-r1.cjs` | 36/36 | the desk's signing flow (Send code · the code field · Sign agreement), the bundle's desk walk, the signed phone shot, the 320 notice |
| `contracts-parity/verify-ct-r2.cjs` | 24/24 | the contract picker, the desk's send |
| `contracts-parity/verify-ct-r3.cjs` | 28/28 | the gates and the pad on the desk, the quote link, "on a phone the gates and the pad fit" (no sideways scroll) |
| `contracts-parity/verify-ct-r4.cjs` | 29/29 | delete rules, Who sees leads on the contract pages |
| `pending-modules/verify-pm2-s03.cjs` (by hand) | 79/79 | the signing links' tokens, expiry, the kept PDF through the link, the set's link |
| `pending-modules/verify-pm2-s02.cjs` | 107/107 | the chat card on `/sign/<id>` and `/sign/<id>/quote`, the closed card, the stopped link's notice |
| `pending-modules/verify-pm2-s04.cjs` | 82/82 | the client quote pages, the view-only link |
| `pending-modules/verify-pm2-s44q.cjs` | 52/52 | Send via WhatsApp, the signing page's words |
| `pending-modules/verify-pm2-s44r.cjs` (by hand) | 82/82 | the deposit asked for on Send and paid on the signed page — its 390 step changed deliberately (REG-C3.11: the Signed card's "Pay the deposit" row opens the pay box as a sheet); first run 80 · 1 on the old assertion |
| `pending-modules/verify-pm2-s42b.cjs` (by hand) | 66/66 | a signing link waiting while the quote is revised, the code step's demo line, `quote-updating` on the quote page |
| `pending-modules/verify-pm2-s46d.cjs` (by hand) | 72/72 | 1.0's `/sign/document/<token>` landing on the signing page, the dead-link notice's words |
| `parity-map-build/verify-pm-f.cjs` (by hand) | 60/60 | `client_signed` through the desk's signing flow |
| `projects/verify-pj-gap-d.cjs` | 65/65 | the CaseTrust disclosure on the desk's signing page and in its record |
| `ux-build-2026-09-30/P5/verify-p5.cjs` | 59/59 | the bundle's walk at 390 — changed deliberately (REG-C3.11); the first run 54/58 was my own edit's fault (the sheet locator passed to its `caseTrust` helper), fixed and re-run |
| `uat-dane-2026-10-01/P5a/verify-p5a.cjs` | 59/59 | the contract editor's send and signing steps |
| `uat-dane-2026-10-01/P5b/verify-p5b.cjs` | 54/56 | its signing steps pass; the two FAILs are g-weekday — My tasks' upcoming line and the tasks popover's due reading "Thu, 22 Oct ’26 · 10:00 AM" on the demo day — the same two K5 reported, no C3 file near them |
| `uat-dane-2026-10-01/P6/verify-p6.cjs` | 41/41 | the quote link on the desk's signing card (`view-quote`) |
| `ui-sweep/verify-sw-r2.cjs` | 27/27 | the 390 signing bar — changed deliberately (REG-C3.11); the signature caption's wrap on the signed page |
| `responsive-quotes/verify-rq-k4.cjs` | 143/143 | the confirmation and view-only client pages (the shell stylesheet, `QuoteStage`, `ReadingCards`, the paper viewer — reused, not changed) |
| `responsive-quotes/verify-rq-k5.cjs` | 79/79 | the editor's Signature section (the shared pad) and the send dialogs |
| `consistency/verify-overlays.cjs` | 67/67 | every dialog's head and foot — the signing sheet, the deposit and record sheets are the house `Dialog` |

## 7 · The 1440 comparison

`rc-build/C3/shots-1440.cjs` took nine pages at 1440×1024 (reduced motion, animations off) on the WIP base (the worktree detached at `58e581c2`, its own build) and on this build, with the same staged rows; `compare.cjs` decoded each pair in Chromium and counted the pixels that differ:

| Page | Result |
| --- | --- |
| `/sign/<sent>` the open signing page, full page and the first screen | **byte-identical** |
| `/sign/<sent>` the desk's code step (Send code → the One-time code field → Verify → Draw) | **byte-identical** |
| `/sign/<signed>` Aisha's signed page with its record | **byte-identical** |
| `/sign/bundle/<id>` the set's page | **byte-identical** |
| `/sign/<sent>/quote` the quote the agreement signs | 3 pixels differ at y 1141, x 558–573 of 1440×3528 — the anti-aliasing of one underline in the quote's footer, now drawn through `QuoteStage` (crops `shots/crops/quote-{before,after}-x4.png`, indistinguishable) |
| `/sign/<expired>` · `/sign/never-made` · `/sign/<expired>/quote` the notices | differ in one 560×68 box — the **Message Demo Studio Pte Ltd** button A-25 adds (`shots/crops/none-after.png`); nothing else |
| `/card/sign/<sent>` the chat card | differs by design (C-26): the eyebrow and the line larger |

## 8 · Checks

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` — 0 errors beyond the three pre-existing in `components/quotes/editor/quote-editor.tsx` (two warnings on the desk card's `window.location.assign`, pre-existing lines) · `npm run design:lint` green (the first draft's raw sizes rewritten on the type tokens; the baseline untouched) · the production build (under the shared lock, three times: the base for the before shots, then this work twice) · the probe green on the final build (§6) · the related probes (§6) · the 1440 comparison (§7) · no sideways scroll at 320 · 390 · 768 · 1024 (asserted) · `local.db` never touched (`DATABASE_URL=file:<lane.db>` on every command; the lane put back after every run) · the 3183 and 3193 servers stopped, no build lock left. The lane's "C3 wip" commit is undone with `git reset --soft 58e581c2` at the end so the diff for landing is the working tree over the WIP base.

## 9 · Principles check (`DESIGN-PRINCIPLES.md`)

| Principle | Met how |
| --- | --- |
| 1 · The mock wins, every exception written down | the mock is silent on the client's page ≤1024; the shape follows the brief's contract (P-05 · P-06) and his answers (Q-01 · Q-02 · Q-05 · Q-06); every invented word is in `reg-c3.md`; a comment beside each change names its finding. |
| 2 · One system, no one-offs | the sheet is the house `Dialog`; the code is `CodeBoxes`; the pad is the one shared pad; the chips `Chips`; the fields `TextField`; the layer wears `SurfaceHead` with the house surface hooks (the paper viewer's pattern); the cards are the confirmation page's own classes; tokens only (`design:lint` green). |
| 3 · Plain words for studio people — and their clients | "Read to the end to sign", "3 of 13 sections", "Accept and sign", "Tick to confirm, then continue", "Add NRIC / FIN (optional)", "Save a copy — This signed page, with its signing record", "Signing record — Who signed, how, and the text's fingerprint". |
| 4 · Nothing is lost | Clear empties the pad only on a press; closing the sheet keeps the ticks, the code and the name; the record, the copy and the hash stay at the link; the desk keeps every control it had. |
| 5 · Say why | the stand-in's code step says no text goes; an expired link says so and how to ask; Continue and Sign stay off until what they need is given; a refused code says "That code isn't right". |
| 6 · Back returns where you came from | the quote layer's ← and the phone's Back close it onto the agreement where the client was; the quote page's "← Agreement". |
| 7 · Every screen is whole | the three sign routes' ghosts draw the phone's shape (REG-708); the layer streams its own ghost; the sheets carry the house head and foot. |
| 8 · Every width is designed | 390 · 768 upright · 1024 sideways · 320 each asserted (the hero, the bar, the sheet, the layer, the landing); 1440 byte-identical on the signing page (§7). |
| 9 · Tables follow the leads listing | n/a — no table here. |
| 10 · Motion with purpose | the sheet rises on `bottomSheet`, the layer and the viewer open as the house surfaces do; the landing scrolls smoothly to the box and the card. |
| 11 · Honest data | every value is the record's (the quote's total from the contract's Smart Text values, the signature kept as drawn, the record's own rows); the probe signs for real and puts it back. |
| 12 · Reach for everyone | the sheet traps focus and closes on Esc; the ticks are labelled checkboxes; the code boxes are "Digit n"; the rows are buttons with visible focus; the layer is a labelled dialog; the hero's document rows name "read" and "open". |
