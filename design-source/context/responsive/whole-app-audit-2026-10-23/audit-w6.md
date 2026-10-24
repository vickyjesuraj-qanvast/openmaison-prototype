# Lane W6 — the closing lane: the hand-off ledger (2026-10-24)

**Brief:** `brief.md` (his rule kept: a lead's and a project's page stay one page with their tab strip; this round fixes defects inside the
layouts that exist). W6 owns every file but the Floorplan session's. Its three jobs: (1) every item the five lanes wrote under *For other
lanes*, checked against the landed code and built where it remained; (2) a load order that cannot flip the desk; (3) the sweep before → after.
The outcome, the load-order work, the 1440 diff and the sweep: `outcome-w6.md`. Rows: `reg-w6.md`. Probe: `design-source/verify/responsive-all/verify-rwd-w6.cjs`.

**How each item was checked.** Read against the landed tree (the WIP base `dc8fe304` = main after W1…W5), then measured on a production build of
it (:3206, a fresh copy of the round's base DB) by real taps and hit tests at the widths the lane named — W6's scripts in
`scratchpad/rwd-all/W6/bin/` (`x1` blockers · `x2` targets and words · `x4`/`x5` searches, pickers, sheets · `x6` ghost beside page · `notch.cjs` a
notched phone held sideways, insets 47 · 0 · 47 · 21 forced through CDP). An item already fixed says by whom; an item a lane marked as his call is
listed, not built.

## 1 · The ledger — every hand-off

Status: **built (W6)** · **fixed by Wn** (landed in that lane, verified here) · **not a defect** (measured) · **his call** (the lane's ▲, left for
Vicky) · **not built** (a refactor with no defect left).

| # | from → to | item | status | where · how verified |
| --- | --- | --- | --- | --- |
| H-01 | W1 → orchestrator | CSS order between builds (W1-26): Money's Needs-you padding, Commissions' and Reports › Finance's digits | **built (W6)** | `components/projects/money/money.module.css` (`.banner.banner`, `.banner.banner:not([data-tone='changes'])`), `components/finance/books/books.module.css` (`.num.strong`) — and the runtime scan's flips, `outcome-w6.md` §2 |
| H-02 | W1 → W2 · W3 | quick links at 844 × 390: the Maison AI button on the strip's last glyph at the page's end | **built (W6)** | `components/leads/detail/quick-links.module.css` — touch ≤1024 the column ends `--fab-clearance` above the foot (its list scrolls above the button); W1's `max-height` part was not needed (the column fits; its list scrolls inside). Probe §1 |
| H-03 | W1 → W2 · W4 · W5 | the hand-rolled overlays' 48 above and below at 844 × 390 (Create New Lead showed two fields) | **built (W6)** | the house Dialog's sideways rule in the 12 named sheets: `components/leads/{lead-form, deleted-sheet, import-wizard, move-stage/wizard, return/return-lead-wizard, return/return-details-modal, files/deleted-files-sheet, tasks/attach-files-modal, tasks/template-dialogs, tasks/manage-tags-dialog}.module.css`, `components/company/templates/deleted-templates-sheet.module.css`, `components/quotes/create-quote-modal.module.css`. Probe §2 (8–382) |
| H-04 | W1 → W2 · W5 | contenteditable editors at 14 on an iPhone | **not a defect** | measured at 390: the rich editor's body, the Notes composer and the contract's document type at `body-l` 16; the template renderer's in-place text is the scaled paper (REG-542) |
| H-05 | W1 → W4 | `help-link` 44 · the library editor's handle | **fixed by W4** | W4-06 (`HelpLink standalone`), W4-08 |
| H-06 | W1 → W4 | `company-ghost-frame.tsx` | nothing needed | W1-16 |
| H-07 | W1 → W3 | the project's Client · Design views at 320 | **fixed by W3** (W3-01) · the own-line part **his call** (W3-13) | — |
| H-08 | W1 → W5 | the FAB at the Quotes / Contracts lists' end; the Visualizer's dots under the FAB at 320 | **fixed by W5** (W5-02 · W5-11) | 320: no marker under a button (the button steps aside on a short stage) |
| H-09 | W1 → W2 | the kanban's and the file viewer's `100dvh − 16` on a notched phone | **built (W6)** | `app/leads/leads.module.css`, `components/leads/files/file-viewer.module.css` (`− env(safe-area-inset-bottom)`, 0 elsewhere). Probe §5 (no page scroll) |
| H-10 | W1 → W2 · W3 · W5 | fixed / edge-anchored bars on a notched phone held sideways | **built (W6)** for every pinned control the notch sweep found in an unsafe band | the review banner + skirt, the quick add, the quote's section list + section screen, the contract's section screen / Document frame, the quote template editor's frame, the Visualizer's strip + its short-screen FAB (`outcome-w6.md` §1); the bulk bar, the portal's `/my`, `/sign`, `/confirm`, the website measured clear. Probe §5 |
| H-11 | W2 · W4-28 → W1 | keyboard tips after taps on a touch screen | **built (W6)** | `components/shell/shortcuts/shortcuts-layer.tsx` — a tip only under `(hover: hover)` or after a real keyboard. Probe §6 (none at 390, still one at 1440) |
| H-12 | W2 → W1 | the tips' / ? panel's words read an icon's ligature ("Stage: Metkeyboard_arrow_down") | **built (W6)** | `components/shell/shortcuts/dom.ts` `wordsOf` (icons are aria-hidden spans, dropped). Probe §6 |
| H-13 | W2 → W1 | REG-306's 16 on a phone held sideways | **built (W6)** | `app/globals.css` — the iOS block's media adds `PHONE_SIDEWAYS` (iOS only; Chromium never matches) |
| H-14 | W2 → W1 | the tablet listing ghost's Members 144 | **fixed at landing** | `components/shell/skeleton.tsx` |
| H-15 | W2 · W4-20 · W5-28 → W1 | the scope pill's overlay 42 | **built (W6)** | `components/om/scope-pill.module.css` (`inset: -5px`: it hangs off the padding box). Probe §3 |
| H-16 | W2 → W1 | the house Filters rail scrolls ≤1024 (Projects' had the dead end) | **built (W6)** | `components/om/filters-modal.module.css` (in the layer); W2's four copies removed (`components/leads/{filters-modal, tasks/tasks-filters-modal, quotes/quotes-filters-modal, contracts/contracts-filters-modal}.module.css`). Probe §2 |
| H-17 | W2 · W3 · W4-19 → W1 | crumbs 15 tall under a finger | **fixed by W1** (W1-04) | — |
| H-18 | W2 → W1 | a house option for standalone `a` links | **not built** | a refactor; every link W2 found carries its own 44 |
| H-19 | W2 → W3 | `/chat` · `/tickets` | nothing found | — |
| H-20 | W3 → W1 | the house TextField at 14 on a phone | **fixed** (REG-306 for inputs, W1-08 for textareas / selects) | — |
| H-21 | W3 · W5-27 → W1 | the DS SegmentedButton 36 | **fixed by W1** (W1-07) | the 3D viewer's Top · 3D · Walk measured: 21 above / below their own |
| H-22 | W3 → W1 | the folder card's select box | **fixed by W1** (W1-05 · W1-25) | — |
| H-23 | W3 → W1 | the house ChipRail centres its chosen chip | **not built** | no rail left that opens off its chip (W3-01 · W3-12 fixed the two; every other ChipRail opens on its first) |
| H-24 | W3 → W1 | StatTiles one a row at 320 (W3-16) | **his call** | a two-up grid is a layout change |
| H-25 | W3 → W1 | the L2 header + strip pinned at 844 × 390 | **his call** | W2 K-10 |
| H-26 | W3 → W2 | a member's name broken inside the word on a tablet ("Germain / e") | **built (W6)** | `components/leads/detail/info-column.module.css` (768–1024: one line, ellipsis). Probe §4 |
| H-27 | W3 → W2 | a card head's right meta under its ↗ at 1280 ("19 li↗es") | **built (W6)** | `components/leads/detail/card.module.css` (the ≤1024 wrap up to 1439). Probe §4 |
| H-28 | W3 → W2 | the lead pieces a project reuses: milestone button · task card name · Notes tools at 320 · meetings title · strip · contact row · head link | milestone **built (W6)** (`tasks-table.module.css`, 768–1024 touch overlay); task card name **his call** (W2-06); Notes tools **his call** (W2-13); a meeting's phone title **not a defect** (the card is one press, C-11); strip **fixed by W2** (W2-11); contact row **kept** (REG-365); head link **fixed by W2** (W2-14) | Probe §3 |
| H-29 | W3 → W2 | the toolbars that starve a project's view switch at 320 | **his call** | W3-13 ▲ |
| H-30 | W3 → W4 | the Costs table's bill link cut with no ellipsis at 768 | **built (W6)** | `components/projects/money/money.module.css` (`.sub .inlineLink` ≤1439: its own ellipsis). Probe §4 |
| H-31 | W3 → W5 | the render link's pin 26; the Visualizer's zoom figure 52 × 36 | **built (W6)** | `components/visualizer/share/render-share-page.module.css` (touch: 44), `components/visualizer/editor/stage.module.css` (touch ≤1024: 44). Probe §3 |
| H-32 | W4-15 → W3 | **blocker** — Reports › Meetings' coaching row one letter a line at 320 | **built (W6)** | `components/projects/project-overview.module.css` (`.row[data-two][data-wrap] .two { flex: 1 1 160px }`, ≤1439). Probe §1 (320: 220 wide) |
| H-33 | W4-16 → W1 | textareas / selects at 14 on iOS | **fixed by W1** (W1-08) | — |
| H-34 | W4-17 → W1 | **blocker** — the definition list's head "QUESTIONREQUIRED", a question one word a line | **built (W6)** | `components/om/definition-list.module.css` — W4's grid at **≤360** (320 and 360 break; from 375 the three tracks hold, so 390 keeps the drawn layout). Probe §1 |
| H-35 | W4-18 → W3 | Finance's and Money's row names 20 tall | **built (W6)** | `components/projects/money/money.module.css` (REG-307's touch list: 12 above and below, positioned over the sub line). Probe §3 |
| H-36 | W4-21 → W1 | the DS segmented 36 | **fixed by W1** (W1-07) | — |
| H-37 | W4-26 → W1 | a DS Radio row 24 | **built (W6)** | `app/globals.css` (touch: the radio's own label 44 tall, paid back). Probe §3 |
| H-38 | W4-27 → W1 | an Undo snackbar over a tall dialog's foot at 768–1024 | **built (W6)** | `components/om/sheet.tsx` (`useSheetFootLift` `{ query, lowOnly }`), `components/om/dialog.tsx`, `components/om/snackbar.module.css` — only when the foot reaches the bar's band; a short dialog and the desk unchanged |
| H-39 | W4 → W1 | a dialog foot's Cancel · Save parted below 360 | **built (W6)** | `components/om/dialog.module.css` (≤359 the start takes its own line). Probe §4 |
| H-40 | W4-24 → W2 | the Assign card's height on a 390-tall window; the Tag picker | card **fixed by W2** (W2-12); Tag picker **built (W6)** | `components/leads/tasks/tag-picker.module.css` (≤500 tall: the rows give way). Probe §2 |
| H-41 | W4-29 → W5 | the library editors' name field 36 | **built (W6)** | `components/contracts/editor/contract-editor.module.css` (touch: 44, paid back). Probe §3 |
| H-42 | W4 → W1 | the phone avatar and the rail's studio block | **fixed by W1** (W1-01 · W1-03) | — |
| H-43 | W5-29 → W1 | a DS search bar's target is its 36 shell | **built (W6)** | `app/globals.css` (touch: an md bar's input stands 44). Probe §3 |
| H-44 | W5-30 → W1 | a chip's trailing ⋮ | a note — no fix | — |
| H-45 | W5-31 → W1 / W2 | **blocker** — the house Dropdown off a sideways phone's bottom (the Visualizer's New ▾ wholly below the fold) | **built (W6)** | `components/leads/dropdown.tsx` — a bottom sheet under `PHONE_SIDEWAYS`, as PortalMenu (phone-12). Probe §1 |
| H-46 | W5-32 → W1 | the reveal's ghost layer scrolls, so a sticky foot never sticks | **built (W6)** | `components/shell/page-reveal.module.css` (`overflow: clip`). Probe §6 |
| H-47 | W5-33 → W1 | the Quotes list's ghost at 390: no to-do line, four-line cards | **built (W6)** | `components/leads/detail/tab-ghosts.tsx` (the to-do pills the list opened with, in the toolbar's own classes; three lines), remembered by `components/quotes/list/quotes-workspace.tsx` and `components/leads/quotes/lead-quotes.tsx`. Probe §6 (0px) |
| H-48 | W5-34 → W1 | a sheet's snackbar lift measured before the sheet rises | **built (W6)** | `components/om/sheet.tsx` (the foot followed every frame of the slide). Probe §6 |
| H-49 | W5-35 → W1 | the date picker: 320's 40 cells; the card's Today · ‹ › · Choose a year on a touch tablet | card **built (W6)** — and a misfire found: REG-347's 40 / 44 boxes reached over their neighbours' drawn edges (a tap on the right of "9" picked the 10th, on Today's right edge the month turned back); 320's cells **kept** (seven 44s need 308 of the sheet's 288 — the house gutters) | `components/om/date-picker.module.css`. Probe §3 |
| H-50 | W5-36 → W4 | **blocker** — the Company popover 728 tall on a 390 screen | **built (W6)** | `components/company/company-popover.module.css` (under 760 tall: capped, scrolls). Probe §1 · §8 |
| H-51 | W5-37 → W2 | the Quotes / Contracts tablet tables' title and links 20 tall | **built (W6)** | `components/leads/{quotes/quotes-table, contracts/contracts-table}.module.css`. Probe §3 |

## 2 · Found by W6

| id | page · width | what a person sees | severity | the fix |
| --- | --- | --- | --- | --- |
| W6-01 | the 3D Space Planner's editor · every width | The rail's three tabs drew in five slots on the pre-audit build and three even columns on the landed one — the order the build emits the Visualizer rail's `.tabs` and the planner's `.tabs3` decides; `next dev` draws three | major (load order) | `components/planner/editor/editor.module.css` `.tabs3.tabs3` · `.tabs4.tabs4` — ▲ |
| W6-02 | Activity (lead and project) · every width | A choice's picture in an activity card drew 36 (the house thumb) on the pre-audit build, 48 (its own) on the landed one; `next dev` draws 48 | minor (load order) | `components/leads/activity/lead-activity.module.css` `.cardThumb.cardThumb` — ▲ |
| W6-03 | the date picker card · 768 – 1024 touch | see H-49 — taps on a day's right edge or Today's right edge did the neighbour's job | major | H-49 |
| W6-04 | the whole app · 1440 | `next dev` (the owner's :3000) and the production builds disagree on ten pairs of same-weight rules (the about card's picture 120 × 90 vs 36, the Designs list's padding, a settings gate field's flex, the X-Ray banner's margins, the template structure pane's eye transition, Commissions' digits, the planner's tabs, the activity thumb, the phone badges, the site bar's item width) | ▲ for Vicky | listed in `outcome-w6.md` §2; the ones this round's build flipped are made order-proof |

| W6-05 | a project's Overview › Project info · 768 – 1024 touch (found by the closing sweep) | The Signed quote · Contract links are 17 lines under a finger | minor | `components/leads/detail/info-column.{tsx,module.css}` `.docLink` — the head link's 45 box |
| W6-06 | Qanvast Ops › Reviews · touch (closing sweep) | A review's *Read more* is a 20 line | minor | `components/qanvast/account/account.module.css` — REG-344's overlay |
| W6-07 | the AI Visualizer's editor · touch (closing sweep) | Compare 36 tall in a toolbar of 44s; the describe box's mic 36; the client's notes badge on a version tile 29 × 20 | minor | `components/visualizer/editor/{editor, describe-box, versions-strip}.module.css` — the house centred 44 |
| W6-08 | Company › Profile · `next dev` | The About card's pictures drew 36 (the house thumb) in `next dev`, 120 × 90 on the production builds | minor (load order) | `components/company/about-card.module.css` `.pic.pic` — production unchanged |
| W6-09 | the order-proofing the final build needed | the Choices band (24 a side), Settings › Finance's invoice-paper preview (24), a phone Money banner's buttons (end), the Quote screen's amounts (proportional digits on some pages), the structure pane's eye fade — flipped by W6's own build 2; W3-18's Money row words (86 wide at 768 — `rwd-w3` caught it) and W3-03's paper title row gap — this round's own overrides, lost on build 5 | major (desk · W3-18 a regression) | doubled classes in `components/projects/{choices/choices, money/invoice-paper-settings, money/money, money/invoice-paper}.module.css`, `components/quotes/confirm/reading-cards.module.css`, `components/templates/editor/structure-pane.module.css` — `outcome-w6.md` §2 |

The sweep's findings after the hand-offs: `outcome-w6.md` §4.
