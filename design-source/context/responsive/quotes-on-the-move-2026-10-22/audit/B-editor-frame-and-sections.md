# Lane B — the quote editor's frame and every section but Items, on a phone and a tablet (2026-10-22)

Read-only audit of `/quotes/39e4c832…` (Draft), `f529ab6d…` (Sent to Client), `1f598389…` (Signed), `a13747cb…` (Approved) on :3011 (the
scratch `audit.db`) at **390×844**, **768×1024** and **1024×768**, all with `isMobile: true, hasTouch: true`. Shots and numbers live in this
folder: `capture-b.cjs` → `<width>-NN-*.png` + `measure.json`; `probe-b.cjs` / `probe2-b.cjs` → `*-p1…p4-*.png` + `probe2.log` (real taps whose
pointer events were swallowed at the document's capture phase, so nothing changed on the server). Touch boxes were measured by walking
`elementFromPoint` outward from the drawn box ("effective box"), then confirmed with real taps where it mattered. Nothing in the repo was changed.

The approval bar (`ApprovalBar`, Sent for Approval) could not be opened live: no quote in the audit DB is in that state and View as would move the
shared session. It shares `.banner` in `template-bar.module.css` with the Sent banner, so B-10 applies to it by the stylesheet.

## 1. Findings

| id | surface | width | severity | what is wrong (what you saw) | evidence (shot file) | rule it breaks | fix inside today's pattern |
|---|---|---|---|---|---|---|---|
| B-01 | Payment Schedule rows | 390 | **Blocker** | Every tap on a payment row lands on the drag handle: taps at the centre of "10%", "S$4,983.81", "On Approval", "Upon signing" and the red Remove button all resolve to `button[aria-label="Drag to reorder Deposit"]`; a real tap on "10%" opens no inline editor (at 768 the same tap opens it). Cause: the touch rule `.handle::after { position: absolute; inset: -10px }` while `.handle` is never `position: relative`, and ≤767 `.cell.cSel { position: static }` releases the cell — the overlay spans the positioned row. The schedule cannot be edited and a payment cannot be removed on a phone. | `B/m390-p3-pay-tap.png`, `B/probe2.log` ("tap pct … → handle", "real tap on 10% opened an input: false") | REG-273 / REG-312 (the box grows round the mark, never over a neighbour); responsive.md › Touch ergonomics | `payments-section.module.css`: `.handle { position: relative }` (the fix REG-729 gave `.cancelBtn` / `.okBtn`); re-probe with a real tap. |
| B-02 | Send ▾ menu | 768 · 1024 | Major | The dropdown opens left-aligned under Send (x 557 at 768, 813 at 1024), 320 wide → 12 px past the viewport; the whole page gains a sideways scroll (`scrollWidth` 877 / 1133) and each row's help line is cut ("The client confirms the quote on a … signature yet"). Same on the Sent quote. | `shots/t768-07-send-menu.png`, `shots/t1024-07-send-menu.png`, `B/t768-12-send-menu.png`, `shots/log.json` (overflow: true) | responsive.md ground rule "the PAGE never scrolls horizontally"; REG-269 "menus … clamp bounds are the real viewport" (the in-flow `Dropdown` clamps only ≤767) | `send-button.tsx`: `align="right"` (as the ⋮ already is), or give `Dropdown` the ≤767 `max-width` clamp at ≤1024 too. |
| B-03 | Editor header (Send · status) | 390 | Major | The one primary action scrolls away. ≤767 the header leaves the sticky stack and only the 48 px tab row holds (measured: at scrollY 1400 the header's top is −1400, stuck total 48). The Draft is 6,832 px tall as loaded (8,646 with every section open), so from Signature or Activity, Send and the status pill are ~6,000 px up. | `B/m390-10-scrolled.png`; `measure.json › m390.stickyAtScroll`, `pageAfterAllOpen` | responsive.md › Page headers "the primary action keeps its place"; DESIGN-PRINCIPLES "designed, not squeezed". It is REG-269's ≤767 rule (comment in `editor-header.module.css`) — a decision, and it does not serve someone on site. | ≤767 a 56 px sticky bar above the tabs: status pill · Send (full width) · ⋮; the title, chips and Saved scroll away with the page. |
| B-04 | Editor header | 390 | Major | 184 px of header: title 24 + four chips wrapping to two lines (44) + Saved 20 + status/Send row 36 + gaps; with the tabs 232 px of chrome before the first card. On the Sent quote the banner adds 192 → **424 px (50 % of 844) before General Info**; Signed 344 px. | `B/m390-01-draft-head.png`, `B/m390-25-sent-head.png`, `B/m390-25-signed-head.png`; `measure.json › header.h` | responsive.md › Page headers (height auto, chips as one scroller); sweep S1 T-01/T-02 chose wrapping — a decision that costs half the screen | One meta line of 12 px text ("OM-10001 · Draft · v1"), the contract chip only when a contract exists, Saved folded into the status pill's row; the banner as B-10. |
| B-05 | Section tabs | 390 | Major | The tab strip is 876 px wide in 390: Files, Terms and Conditions, Additional Notes, Signature and Activity are off-screen with no pager, fade or mask — the cut "Files (" at the edge is the only cue; the strip re-centres only after a press. A new user does not know Signature and Activity exist. | `B/m390-01-draft-head.png` (tab row), `measure.json › tabs.sw 876 / cw 390, pagers 0` | responsive.md › Shell "Tabs row: horizontal scroller with the om scroll pagers at ≤1024" (not built for `EditorTabs`; `om/tabs.tsx` has none either); "Scrollable regions announce themselves" | ≤767 replace the strip with one "Jump to: General Info ▾" pill opening a sheet of the eight sections with their counts; ≤1024 add the house `ScrollPagers` + an end fade. |
| B-06 | Section tabs | 768 | Minor | Same strip (876 > 768): Signature and Activity are cut ("Signatu") with no pager. | `shots/t768-04-editor-draft-top.png` | as B-05 | as B-05 (pagers + fade at ≤1024). |
| B-07 | Editor header | 768 | Major | The title is cut to "Whole-home r…" (189 px, `max-width: 45%`) and the chip row shrinks to **83 px**: Version 1 and Draft hide behind the fade; on the Sent / Approved quotes the number, version and status chips are all hidden ("OM-100(") — the row keeps the crumb, "Saved 28 Sep ’26" and four buttons instead. The quote's status is readable only on the pill. | `shots/t768-09-editor-sent-top.png`, `B/t768-25-sent-head.png`, `shots/t768-10b-editor-approved-top.png`; `measure.json › t768.chips cw 83 / sw 355` | responsive.md › Page headers ("title truncates single-line; chips scroll") — followed, but a scroller 83 px wide is a cut word; sweep S1 T-02 (chips scroll with a fade) — a decision that fails at 768 | ≤1024: Saved → a check glyph with a tooltip/snackbar, the title takes the width, chips on a second line (header 76 → 96) or only number + status. |
| B-08 | Client view (⋮ › Client view) | 390 · 768 · 1024 | Major | The live client view opens in a Drawer (400 wide at tablet; a 743 px sheet at 390) with the A4 paper scaled to 328–334 px: three pages (1,308 px) scroll inside the drawer and the type renders at ~5–6 px on screen (8–13.3 px before the 0.41 zoom). Unreadable, and at 390 it covers the editor it mirrors. | `B/m390-21-client-view.png`, `B/t768-21-client-view.png`, `B/t1024-21-client-view.png`; `measure.json › 21-client-view` | REG-497 ("a drawer on a tablet") is a decision; the paper's on-screen size was never decided. DESIGN-PRINCIPLES | ≤1024 the row reads "Preview as client" and opens the Preview page (full width, pinch-zoom, Send on its bar); the drawer only ≥1025. |
| B-09 | ⋮ menu | 390 | Major | The sheet holds **16 rows** (743 px, 88dvh) and still scrolls: Version History and Delete are below the fold with no cue. Three jobs are mixed in one list (see as the client · change the record · get it out) and keyboard hints ("P") print on a touch sheet. | `shots/m390-08-more-menu.png`; `measure.json › m390.moreMenu rowsBelowFold, keyHints` | REG-353 honoured; REG-728's scale is desktop-first; the brief ("on the move, less cognitive load") | Group with `DropdownLabel` (Look · Change · Share · Export), hide `shortcut` under `(hover: none)`, move Preview / Client view / Comments to the sticky bar (B-03) so the sheet is ≤10 rows. |
| B-10 | Sent / Signed banner (and the approval bar by stylesheet) | 390 | Major | The Sent banner is **192 px**: six lines of 14 px (50 words) + "Revise — new version" on its own line; Signed 112 px. Under the 232 px header + tabs it pushes the first field to y 424. | `B/m390-25-sent-head.png`, `B/m390-25-signed-head.png`; `probe2.log › sent banner lines 6` | REG-624 (the banner's words) is a decision; its phone layout is not. responsive.md (content 24 → 16 only) | ≤767 one line that opens on tap: "Sent 19 Aug · v1 with the client · validity ended 16 Sep ▾", Revise as a text button inline; same for the approval bar. |
| B-11 | Payment Schedule table | 768 | Major | The six-track grid at 596 px cuts the Description cells mid-word ("Upon sigr", "Works co", "50% com" — 64 px) and the heads overlap: "PERCENTAGE (%AMOUNT (S$)". | `B/t768-03-payments.png` | REG-430 table model (no squeeze; a column never clips its words); responsive.md "the table keeps its columns and becomes a touch scroller" | ≤1024 use the ≤767 card rows already built (once B-01 is fixed) or a scroller with the name frozen; heads "%" and "Amount". |
| B-12 | Terms and Conditions · Additional Notes | 390 | Major | The whole T&C is an open 1,904 px contenteditable in the middle of the page (section 2,079 px; Notes open → page 8,646 px). The formatting toolbar's ten 24 px tools sit 8 px apart: effective touch boxes **34×41** — a real tap 2 px right of Bold's edge hits Italic. "Write with AI" takes a full-width second row. | `B/m390-05-terms.png`; `measure.json › m390.terms.tools`; `probe2.log › bold tap +14 → Italic` | REG-312 (44 boxes "never a neighbour's"); the brief (cognitive load) | ≤767 Terms and Notes rest collapsed as a two-line row ("12 clauses · from My Templates · shown to client ✓") that opens a full-screen sheet editor with tools at a 44 pitch (two rows). |
| B-13 | Terms toolbar | 768 · 1024 | Minor | The tools' 44 boxes are clipped by the `.tools` scroller (`overflow-x: auto`) to 35 px tall and 29–43 wide. | `measure.json › t768.terms.tools` | REG-307 / REG-312 | `.tools { overflow: visible }` at ≤1024 (it wraps ≤767 anyway) or inner padding. |
| B-14 | Create strip (right-hand rail) | 768 · 1024 | Major | The three glyphs (Maison AI · Price book · Templates) have **27 px-wide** touch boxes (Maison AI 27×35): `.glyphs { overflow-x: hidden; padding: 2px }` clips the `::after` overlay the stylesheet says is 44×44. The strip also takes 72 px of a 768 screen, leaving a 596 px column. | `measure.json › t768.header.strip.glyphs`; `shots/t768-04-editor-draft-top.png` | REG-307 (touch boxes on a touch tablet); the strip's own comment | `.glyphs { overflow: visible }` — or ≤1024 drop the strip: Maison AI and Price book already sit in the Items toolbar; Templates lives on the template card. |
| B-15 | Files tile | 390 · 768 | Minor | The tile's ⋮ has a **24×27** effective box — the caption span paints over its overlay (`elementFromPoint` 6 px either side returns `.caption`); "Show in client view" is 12 px on the phone. | `B/m390-04-files.png`; `measure.json › files.tiles.kebab`, `probe-b` output | REG-312 | `position: relative; z-index: 1` on the kebab's anchor; label 14 px. |
| B-16 | Dialog and sheet feet | all touch | Minor | Every DS Button in a dialog / sheet foot is **36 px tall with no 44 overlay**: Copy link 119×36, Send via WhatsApp 189×36, Rename 87×36, Not now 88×36, Use template 121×36, Version History's Close 70×36. Only the danger button (Delete 76×43) and the header's buttons got one. | `measure.json › confirmDialog.foot, 16-rename, 18-history`; `B/m390-13-confirm-dialog.png` | REG-312 "every control ≥44 … including the DS's own 36 px md controls" | one rule in `dialog.module.css`: `.foot button::after` overlay under the touch query (REG-725 made the foot the one place). |
| B-17 | Send for confirmation sheet | 390 | Minor | The 743 px sheet scrolls 98 px: the follow-up chip's help and the link row sit below the fold; the message box is 168 px for a 212 px message (`rows=2`, a scroll inside the scroll); "+65" takes a full row above a 166 px phone box. | `B/m390-13-confirm-dialog.png`; `measure.json › m390.confirmDialog` | REG-353 sheet; the pair rule (code + phone are one field) | auto-grow the textarea ≤767; code + phone on one line as at 768; drop the link row (Copy link is in the foot). |
| B-18 | Choose a contract template (Send ▾ › Send for signature) | 390 | Minor | The foot wraps to two rows ("Start from the studio agreement" 248 wide, then "Use template") = 96 px; two 171 px cards per row with 8 px preview type; "Manage Templates" wraps in the head. | `B/m390-14-contract-picker.png` | REG-371 / 372 honoured; a phone needs one primary | a list (name · Last used · edited) with a radio, "Use template" alone in the foot, "Start from the studio agreement" as the first list row. |
| B-19 | Version History sheet | 390 | Minor | After "Revise — start version 2" on a Draft the snackbar (344×48) lands over the sheet's foot and covers Close. | `B/m390-18-history.png` | the snackbar host vs a sheet with a pinned foot (REG-353 z 115) | a sheet with a foot lifts `--snackbar-bottom` by its foot, as the editor lifts it above the dock. |
| B-20 | Header chips and Saved | 390 | Minor | MetaChips type at **10 px/12 px** ("OM-10001", "VERSION 1", "CONTRACT · DRAFT"), Saved at 12 px; four chips wrap to two lines. | `B/m390-01-draft-head.png`; `measure.json › chips.font` | the DS MetaChip's own token; REG-344 (mobile is the mock at 14) — a decision; 10 px does not read in daylight | one 12 px text line "OM-10001 · Draft · v1"; a chip only for the contract link. |
| B-21 | Title switch (the ▾ beside the title) | all touch | Minor | The title button (the lead's other quotes) is 261×24 — a 24 px-tall target, the only one in the header without an overlay. | `measure.json › header.title.hit` | REG-312 | the status pill's `.anchor > button::after` rule on `.switch`. |
| B-22 | Payment Schedule card | 390 | Minor | The inner table is 332 px in a 322 px box (`data-overflow="true"`): the rows nudge 10 px sideways under a finger; the right padding reserved for the pinned Remove (56) leaves the amount column 82 px. | `measure.json › m390.payments.table` | ground rule (wide content scrolls inside its box — a 10 px scroll reads as jitter) | row padding-right 48 or the Remove at 32; verify `scrollWidth === clientWidth`. |
| B-23 | Maison AI (the FAB) | 390 | Minor | Opens as a 302 px floating card over the Items list (not a sheet), overlapping the content; six bordered suggestion buttons. | `B/m390-23-maison.png` | REG-353 (every anchored surface is a bottom sheet on a phone) | the house `Sheet` ≤767, as every other popover of the editor. |
| B-24 | Template card (General Info) | 390 | Minor | 364 px tall: the 72×100 thumb over five lines of 12 px meta and three text actions on two rows (Change · Edit template / Save as new template). | `B/m390-27-sent-template-card.png` | REG-496 card is desktop-shaped | ≤767 one row "Default Quote PDF · v1 · Default" + Change; Edit / Save as new template into the section ⋮. |
| B-25 | General Info | 390 | Minor | Eleven fields in one column (1,186 px) all open: Title · Client · Property · Ref · Address · Prepared by · Valid until · NRIC · Customer ID · a second client · Remarks + the template card. Inputs type at 14 px in Chromium (16 on iOS only, REG-306). | `B/m390-02-general.png`; `measure.json › general` | the brief (what matters on the move) | ≤767 a summary block (Client · Valid until · Prepared by · Address) with "Edit details" opening a sheet; the rest behind it. |
| B-26 | ⋮ menu | 1024 | Minor | The 240 px dropdown is capped at 548 px and scrolls (645 px of rows): Print, Version History and Delete need an inner scroll with no cue on a 768-tall landscape tablet. | `B/t1024-15-more-menu.png`; `measure.json › t1024.moreMenu.scroller` | REG-728 (menus open above when taller) partly — the `Dropdown` does not flip | as B-09 (fewer rows) or route through `PortalMenu`, which measures the room. |
| B-27 | Section heads | 390 | Minor | Each movable section keeps its drag handle (24, 43 box) beside the title toggle; reordering sections by drag is not a job on a phone and it costs 32 px per head; Files and Signature keep a 12 px switch label in the head. | `B/m390-03-payments.png`, `B/m390-07-signature.png`; `measure.json › sectionHeads` | the brief (less cognitive load) | hide `.handle` ≤767; the switch label at 14 or into the section ⋮ as Terms already does. |

What is fine and stays: the status, Send and ⋮ surfaces are bottom sheets at 390 with 44 px rows (REG-353); Payment rows at 390 are cards with a pinned
Remove (the right shape once B-01 is fixed); Rename, Revise, Delete and Comments open as sheets that fit; Signature stacks its two panes; Activity
rows stack time over text; the header's ⋮ and close carry 43 px boxes; the page never scrolls sideways except through B-02.

## 2. On the move

**The editor's frame (header · tabs · Send · ⋮).** Jobs on site: see which quote and what state it is in, send it (confirmation, signature, or "the client
has it"), jump to one section, get back to the lead. Today: 184–424 px of chrome before any content, Send disappears on the first scroll, five of eight
sections are off the tab strip, and the 16-row ⋮ sheet is the only way to Preview or Client view. **Phone:** a 56 px sticky bar — status pill ·
Send (full width) · ⋮ — over a page whose first block is the quote's own summary (title, "OM-10001 · Draft · v1", total, valid until, client); the
sections as a vertical list of collapsed rows with counts and one-line summaries (Items 16 · S$49,838 / Schedule 10/30/30/30 / Files 1 / Terms 12
clauses / Notes none / Signature: client signs online); a row opens full-screen with its own Done; Preview as client and Comments as the bar's two
icons. **Tablet portrait (768):** the same bar plus the crumb; the sections stay cards but the strip and the chips go; Preview is a full page.
**Landscape 1024:** two panes — the section list (left, 360) and the open section (right) — Send and status in the top bar; Preview on its own.

**General Info and the template card.** Jobs: check the client and the validity date, change Prepared by, see which template prints. Today: eleven
fields and a 364 px card. **Phone:** four lines (Client · Valid until · Prepared by · Site) and "Default Quote PDF · v1 · Change"; Edit details opens
a sheet with every field. **Tablet:** the two-column grid as now, the template card one row.

**Payment Schedule.** Jobs: read the split, change a share or a date, add a payment. Today at 390 nothing on a row can be tapped (B-01); at 768 the
descriptions are cut. **Phone:** cards (as built) — name · share · amount on one line, the due date and description under it, a tap opens a
sheet for that payment (share · amount · due · description · Remove); "10/30/30/30 ▾" preset and Add a Payment at the bottom. **Tablet:** the
cards too at 768; the table at 1024 with "%" and "Amount" heads.

**Files.** Jobs: see what is attached, attach a photo from the camera, decide whether the client sees it. Today it works; the ⋮ is a 24 px target
and the label 12 px. **Phone:** tiles two-up, "Add photo" as the one filled action, the switch under the tiles at 14 px. **Tablet:** as now.

**Terms and Conditions · Additional Notes.** Jobs: confirm the T&Cs are on, pick a template, rarely edit a clause. Today: a 2,000 px open editor and a
34 px-wide toolbar. **Phone:** a collapsed row ("12 clauses · Standard T&Cs · shown to client ✓") → a full-screen sheet with a two-row toolbar at a
44 pitch, Write with AI in its foot. **Tablet:** the card as now with the toolbar's boxes unclipped (B-13).

**Signature.** Jobs: check whose signature prints and that the client signs online. Today it is right-sized. Keep; the label at 14 px.

**Activity.** Jobs: "did they open it / when did it go out". Today fine; the newest line could also sit under the status pill ("Sent 19 Aug · opened 2×").

**The banners (sent · signed · approval).** Jobs: know what the client holds and whether the price still stands; revise. Today: six lines. **Phone:**
one line + chevron, Revise inline. **Tablet:** two lines max with the button at the end (the 768 banner is already 96 px).

**Send ▾ and its dialogs.** Jobs: send for confirmation with a follow-up date, send for signature, or mark it sent. Today the sheet is right; the
confirmation sheet scrolls and the contract picker's foot wraps. **Phone:** confirmation = name · phone (one line with +65) · a message that grows ·
"Follow up in 3 days ▾" · Send via WhatsApp alone in the foot (Copy link in the head's ⋮); the contract picker a radio list with one primary.
**Tablet:** the 600 modal as now; the Send ▾ menu right-aligned (B-02).

**The right-hand strip and the client view (tablet).** Jobs: see the quote as the client will, reach the Price book and Templates. Today: 27 px targets
and an unreadable 328 px paper in a drawer. **768:** no strip; "Preview as client" opens the Preview page; Price book and Templates are already in
the Items toolbar and the template card. **1024 landscape:** a real split is possible (editor 624 + client view 400) only if the paper zooms to
≥ 0.6 and scrolls page by page; otherwise Preview full-screen.

## 3. Measurements

Widths as captured; fonts as `size/line weight`; boxes `w×h`; "→" = drawn → effective touch box.

- **Header 390:** 390×184 (Draft, four chips) · 160 (Sent, three chips). Title 20/24 700, 261×24 button (→ 261×24). Chips 10/12 500: OM-10001 65 ·
  Version 1 67 · Draft 49 · Contract · Draft (wrap → 2 lines, 44 tall). Saved 12/16 400. Status pill 89×36 → 89×43; Send 257×36 → 257×43; ⋮ 36 →
  43×43; close 36 → 43×43. Crumb hidden. Tabs 390×48 sticky at top 0; strip `scrollWidth` 876; tabs 14/20 600: General Info 82 · Items (16) 66 ·
  Payment Schedule 126 · Files (1) 51 (cut) · Terms 148 · Notes 112 · Signature 65 · Activity 52 (all cut). Stuck chrome while scrolled: 48.
- **Header 768:** 768×76 sticky; title 189×24 truncated (max-width 45 %); chips box 83 wide (`scrollWidth` 355); Saved 124×20; pill 89×36; Send
  91×36; ⋮ 36 → 43; close 36 → 43. Tabs `scrollWidth` 876 / 768. Strip 72×900: Maison AI 24 → 27×35, Price book 24 → 27×43, Templates 24 → 27×43.
  Main column 696 (content 648 inside 24 padding; section cards 598). Stuck chrome 124.
- **Header 1024:** title 261 not truncated; chips 267 wide (`scrollWidth` 355, "CONTRA…" cut); tabs 1024 fit. Strip 72×644; main 952.
- **Page heights at 390 as loaded:** Draft 6,832 · Sent 6,326 · Signed 6,286 · Approved 6,134; Draft with every section open 8,646. Section tops at 390
  (loaded): General 248 · Items 342 (2,472 tall) · Payment 2,830 (600) · Files 3,446 (377) · Terms 3,839 (2,079) · Notes 5,934 · Signature 6,028 (560) ·
  Activity 6,604.
- **Banners:** Sent 390×192 (text 326×120, 6 lines of 14/20, 50 words; Revise 180×44 on its own line) · 768×96 (4 lines) · 1024×76 (3 lines). Signed
  390×112 · 768×60 · 1024×60.
- **Section heads:** 76 tall; title 16/24 700, toggle 44 tall; handle 24 → 43×43 (where present); section ⋮ 36 → 52×52; Files / Signature switch
  label 12/16 at 390, 14/20 at 768; switch 44×44; "My Templates" link 95×20 → 96×43 (768).
- **General Info 390:** section 1,186 tall; 8 inputs 290×46 (14/20 in Chromium; 16 on iOS), labels 12/16; template card 324×364, actions 69×44 ·
  123×44 · 163×44 (two rows); "Add a second client" 324×36 → 43. 768: section 876, fields 564 / 233 / 253 wide; card 598×166, actions one row.
- **Payment Schedule 390:** section 600; table 324×438 with `scrollWidth` 332 / `clientWidth` 322 (overflow true); row 322×92, padding-right 56;
  cells 148×44 (name, desc) · 82×44 (%, amount, due) — all 14/20; Remove 36×36 → 36×36 and **covered by the handle**; handle 24 → 40×56; Add a
  Payment 324×36 → 43. Real taps: pct / amount / due / desc / delete → handle. 768: table 596 fits; cells 116 · 64 · 64 · 96 · 88 wide; Remove 36 →
  52×52; preset "Default: 10/30/30/30 ▾" 198×36 → 43; its menu 240×319, rows 44. Real tap on 10% → input opens.
- **Files 390:** section 377; tile 154×183 (open target 146×175); ⋮ 24 → 24×27; dropzone 324×68 (14/20). 768: tile 169×183; ⋮ 24 → 24×27.
- **Terms 390:** section 2,079; toolbar 356×97 (two rows), tools 24×24 → 34×41 (Link 43×41), 8 apart; Write with AI 324×36 → 43; body 356×1,904,
  16/24, padding 16. 768: toolbar 646×69, tools → 29–43×35; body 646×1,320, 16/24, padding 24. 1024: body 902×1,200.
- **Signature 390:** section 560; panes 356×241 stacked; signature box 324×140; Edit 26×20 → 45×43; "Client signs online" 12/16. 768: panes
  323×249 side by side; box 275×140.
- **Activity 390:** rows 324×54, when 12/16 over text 14/20. 768: rows 44, when 14/20 in a 181 column.
- **Menus:** status (390 sheet 390×352, 6 rows ×44; 768 dropdown 240×226, rows 44). Send ▾ (390 sheet 275 tall, rows 54 · 54 · 70, help 12/16; 768
  dropdown 320×213 at x 557 → off-right 12, page `scrollWidth` 877; 1024 at x 813 → 1133). ⋮ (390 sheet 743 tall, 16 rows ×44 (one 54), scroller
  757 / 671 → Version History and Delete below the fold, 4 key hints; 768 dropdown 240×647, fits; 1024 240×548, scroller 645 / 546).
- **Dialogs 390 (sheets):** Send for confirmation 390×743, body 648 / 550 (scrolls), name 324×46, phone 166×46, textarea 358×168 (`rows` 2, content
  212), follow-up 358×60, link `code` 308×32 (12/16), foot Copy link 119×36 · Send via WhatsApp 189×36 (→ 36). Contract picker 390×743, body
  747 / 510, cards 171×270, foot two rows (248×36 then 121×36). Rename 390×237, input 324×46, buttons 79×36 · 87×36. Revise (Sent quote) 390×369,
  input 324×46, Not now 88×36 · Start version 2 131×36, helper 14. Version History 390×402, Revise 219×36, Close 70×36 (under the snackbar).
  Delete 342×241 centred, Delete 75×36 → 76×43. Comments 390×373, composer input 276×46, Submit 80×36. Client view sheet 390×743, paper 334×1,334,
  type 8–13.3 px at zoom ≈ 0.41.
- **Dialogs 768:** confirmation 600×699 centred, fits; contract picker 720×976 (body 1,004 / 819); Rename 400×229; Revise 400×361; Version History
  drawer 400×1,024; Client view drawer 400×1,024, paper 328×1,308; template picker 720×918. 1024: client view drawer 400×768, paper 328×1,308; ⋮
  dropdown 548 tall (scrolls).
- **Media:** `(hover: none)` true at 390 and 768 under emulation; `--om-type-body-m` is 14/20 at 390 (REG-314's 16 was reversed by REG-344).
