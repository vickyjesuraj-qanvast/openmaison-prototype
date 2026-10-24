# Lane W3 — Projects, the client portal and the client's money links: the audit (2026-10-24, overnight)

The brief: `brief.md` (his rule: a project's page stays one page with its tab strip at every width — kept; nothing here adds a screen, a level or a
flow). Read from the orchestrator's sweep (`out/sweep.json`, 21 of my routes) and **W3's own sweep of 55 routes** — the listing and Workload (both
views), the Compliance Navigator, the project's page and every tab and view on four projects (In progress · In progress with money due · Setting up
· Completed), the invoice / receipt / credit-note / PO / selection-receipt / floor-plan papers, a project file, the client's no-login links
(`/invoice` · `/receipt` · `/po` · `/space` · `/renders`; `/f/<token>` is a file route with no page — it sends the file or 307s to `/invoice` ·
`/receipt`), and the portal signed in as Benjamin Han (Home · Schedule · Updates · Money + invoice · receipt · credit · Files · Choices + receipt ·
Designs + 3D layout · Floor plan · Messages · Issues · About) — at **320 · 390 · 768 upright · 1024 sideways · 844 × 390** (touch) and **1280** (a
mouse), each page measured at its top and its end by the sweep's rules, with a shot of each. Then **what a person opens there**, by real taps
(`w3open.cjs` 32 steps · `w3portal.cjs` 15 steps × 6 widths: New project, Filters, Column settings, the scope pill, row ⋮, Stage ▾, the project ⋮
(the phone's Create group), View Client Info, the Hand over · Start · Mark done sheets, the milestone sheet, the row ⋮, What Benjamin sees, the
Contractors drawer, the composer, the post ⋮, the message + and ⋮, the conversation details, New ticket, the ticket panel, a choice, Add a choice,
Add a plan, the invoice panel, a cost record, a billing row ⋮; the portal's More sheet, bell, Something is not right, I have paid, PayNow's QR,
a choice, Report an issue, an issue, the composer, a photo, the floor plan's marks), and **the ghosts** held over their pages (`w3ghost.cjs`).
Scripts and shots: `scratchpad/rwd-all/W3/` (`work/`, `sweep0` before · `sweep1` after, `open0`/`open1`, `portal0`/`portal1`, `ghost1`, `shots/`).

**Findings: 20** (W3-01 … W3-20).

**Severity:** blocker = a person can't do the thing · major = it works but reads broken or hides what you are on · minor = a press under 44, a
cramped line.

| id | page · width | what a person sees | severity | the fix |
| --- | --- | --- | --- | --- |
| W3-01 | every grouped tab (Tasks · Client · Design · Files & notes) · 320 · 390 | The view switch ("Updates · Messages · Tickets …") scrolls in the toolbar's title place; on a phone it opened scrolled to its start, so **the view you are on was out of sight** — on Tickets at 320 the rail showed "Updates · 1"; Messages, Meetings, Floor plan and Designs the same (Meetings 26 % visible, Floor plan 0 %, Designs 0 %) | major | `project-views.tsx`: the open chip is centred in its rail on arrival and again when the row's width settles (a ResizeObserver; a rail with room never moves). 390: every view's own chip in view; 320: all but the two starved rails below (▲) |
| W3-02 | Overview · Needs you · 320 – 1439 | A row with buttons that only acts (Ryan's "Ryan says they paid for INV-2026-002" · Confirm · See the bank's confirmation) was held on one line by the Dashboard's rule for rows that only open (`.row[data-two]:not([data-split])`): at 320 its words got 0px — **one letter a line, 1,342px of empty card**, the amount drawn over Confirm and "See the bank's confirmation" run off the screen | blocker | `project-overview.module.css`: ≤1439 such a row (`:has(> .rowActions)`) wraps, so its buttons take their own line as every two-line row's do; the desk keeps its line |
| W3-03 | the paper pages' bar · 320 · 390 | "Receipt RCT-2026-005 · REVERSED" pushed the client's receipt link 4px sideways; the selection receipt's "KITCHEN COUNTERTOP · CALACATTA QUARTZ" 49px (2px at 390) — the bar's title row (the quote preview's) never wraps | major | `invoice-paper.module.css` `.headWrap` · `.chipFit` (≤767: the chips take the next line when they don't fit; a chip longer than the line ends in an ellipsis), on the four money papers and their ghosts and the selection receipt (`selection-receipt.module.css` composes it) |
| W3-04 | Schedule · 768 upright | The frozen name (360) and actions (140) leave the timeline **a 70px window** of an upright tablet's 570 frame — a week and a half | major | **▲ held for Vicky.** Tried a 240 / 280 / 300 name column: the timeline grows to 4 / 3 / 2.6 weeks but every milestone's name is cut ("Hack…", "Electr…") — the names and their date lines are what the list reads by. Recommendation: an upright tablet takes the phone's list (`schedule-phone.tsx`), as Contracts' Q-01 gave it the phone's model. Nothing changed |
| W3-05 | Schedule · 768 · 1024 (touch) | The row's drag grip is its 20 × 32 glyph box; a bar is 20 tall (a long press lifts it, a tap opens it); the who-sees line ("Benjamin still sees … 4 changes to share.") is 24 tall | minor | `schedule.module.css` under `(hover: none)`: the grip a 44 box (the glyph its size, the name 16 right), a bar's press 12 above and below its drawn 20 (`.bar::before`, the bar lets it out, its fill keeps the corners), the who-sees line 44 tall ≤1024 |
| W3-06 | Projects › Workload · 320 · 390 · 768 | Contractors: the caption's tools (Window ▾ · By contractor · By site · Vendors) ran 64px off a 320 screen and clipped the page; each contractor's name was squeezed to "Aq…" / "Bright …" by the one-line count beside it ("1 of 2 · Ryan's site runs late"); a project block is a 36 press on a touch tablet | major | `workload.module.css` ≤767: the caption's tools wrap; a card is a wrapping row — the name keeps 160 and its state (chip · count · Put on a site) stays beside it while both fit, else takes the next line at the card's end, the bar of slots last; `(hover: none)` ≤1024 slots and blocks 44 (the phone's). (A first try — the state capped at 136 — still left names at 56px; replaced) |
| W3-07 | the portal · 320 – 1024 (touch) | Text links a finger can't take: "Receipt" 43 × 15, "See invoice INV-2026-006" 20 tall, "Credit note CN-… (…)" 15, "All updates" / "Schedule" in card heads, "Open the original plan", the schedule's stage-payment lines 16; at 768 – 1024 the bar's sections 31 – 43 wide (Home 40) and Sign out 36 tall; a row's Open 36 wide | minor | `portal.module.css` `(hover: none)` ≤1024: an `a.link`'s press reaches 15 above and below its line and 2 either side (padding, given back as margin — no line moves), sections ≥ 44 wide, Sign out and the bar's text buttons 44 tall, Open 44 wide; `project.module.css` the stage-payment links the same |
| W3-08 | Floor plan · 390 · 768 (touch) | The zoom bar's "100%" (fit the plan) is 52 × 36 between its 44 − and + | minor | `plan-canvas.module.css` `(hover: none)` ≤1024: 44 tall |
| W3-09 | the milestone sheet · 320 (· 768 · 1024 touch) | The four statuses' labels **cut at both ends** — "ot starte", "n progress" — B-42's padding rule never applied (the DS item's `[data-size=md] ._item` is stronger), and they are 36 tall under a finger | major | `schedule.module.css`: the rule raised over the DS item (`.statusSeg.statusSeg [data-size] button`); ≤767 a word that doesn't fit takes a second line inside the item, 44 tall; a touch tablet 44 tall |
| W3-10 | a ticket's panel · a message's report · 320 – 1024 (touch) | A report's photo is a 36 press: the house thumb's own 36 wins the cascade over the 64 the ticket and thread sheets draw (the same order hazard as W3-20) | minor | `tickets.module.css` · `thread.module.css` `(hover: none)` ≤1024: the 64 drawn there. **▲** the desk still shows 36 (byte-identical rule) — keep or restore 64? |
| W3-11 | a Completed / Setting-up project's Overview · 320 · 390 | At the page's end Maison AI's button sits on the last card's ↗ (Recent activity): the lead's frame drops the FAB's band on an empty tab (`.centre:has([data-testid$='-empty'])`) and the Overview's "Nothing waits on you" is `needs-empty` | minor | `project-frame.module.css` ≤767: the Overview keeps the page's band (`--fab-clearance: inherit`) |
| W3-12 | the portal's bar · 768 · 1024 · 844 × 390 (touch) | The sections scroll in their own row (fix-F, F-02) but the one you are on was not brought into it — "Mess…" cut at the edge on Messages held sideways; About / Files out of sight upright | major | `portal-frame.tsx`: the current section is centred in the row on arrival and when the row settles (a row with room never moves) |
| W3-13 | Floor plan · 320 | The view switch has **44px** — the MAIN PLAN chip and three tools take the one-row toolbar (REG-353); Compliance 86px for its 95px chip | major | **▲ held for Vicky** — REG-353 keeps a phone's tab toolbar on one row. Recommendation: ≤374 the views take the toolbar's first line. Nothing changed |
| W3-14 | the portal's bar · 768 – 1024 | Four to six sections sit past the row's edge with no fade or pager to say the row scrolls (F-02) | minor | **▲ for Vicky** — the house ChipRail's fades would say it; not built (a new look on the client's page) |
| W3-15 | Project floor-plan papers · 320 – 767 | The A4-landscape papers scroll sideways at 1:1 inside their stage (sweep S1's rule) | — | kept (the rule); **▲** the quotes' paper viewer (fit to width, pinch, REG-2540…) could serve them on a phone |
| W3-16 | Projects listing · 320 · 844 × 390 | The five stat tiles stack one a row at 320 and fill the first screen held sideways before a project shows | minor | **For W1** (`StatTiles` is the house piece) / ▲ — a two-up grid at 320 |
| W3-17 | the portal Home's loader · 320 · 390 | Held over the page (REG-708's reveal), the ghost's Needs you rows drew the desk's 120px action button (the bone's own `display: block` beat the phone's `.needAction { display: none }`), so the ghost's cards ran **96px past a 390 phone** (454 wide in 358) where the page draws a chevron | major | `portal.module.css` ≤767: `.need > .needAction { display: none }` — the ghost's cards hold the screen |
| W3-18 | Money tab · Needs you · 768 (– 1439) | A banner row with three steps ("See the bank's confirmation · Not received · Confirm") kept them on its one line and squeezed its words to a 60px column — "Ryan says / they paid / for INV- / 2026- / 002" | major | `money.module.css` ≤1439: the row wraps, its words keep a 260 basis, the buttons take the next line at the row's end when they don't fit beside |
| W3-19 | the portal's Schedule · 320 | The stage to confirm: "Something is not right" ran past its half of the row (F-40 holds both answers on one line, which fits from 390) | minor | `project.module.css` ≤767: an answer that doesn't fit takes a second line inside its button, still ≥ 48 |
| W3-20 | Updates · the portal's bell · 1440 (a build artifact) | Two overrides of a composed class (`.band`'s 20px padding over the quote banner's 24 / 16; the bell badge's 6 / 6 over the rail badge's 2 / 2) held only by the order the build put the sheets in. A rebuild of this lane flipped them — the update's review band moved 4px at a desk; and before it, Choices and Files drew the rail's badge corner while Home and Money drew the bell's | major (for 1440 identity) | `updates.module.css` `.band.band` · `bell.module.css` `.badge.badge` — the intended values hold whatever the order. **For the orchestrator:** any lane's CSS edit can reorder the build's sheets; re-diff 1440 on the landed build (W5 saw the same: the listing's "/" key chip moves 1px run to run) |

## Kept — the sweep's other findings, read one by one

- **"covered"** inside a scrolling rail (the views, the floor plan's tools and filters, the portal's bar): a chip past the rail's edge is clipped by
  its own scroller, not covered (`elementFromPoint` lands on the next thing). Not a defect (W3-01 / W3-12 bring the one you are on into view).
- Rows "covered" at the page's end by the tab strip, the header or the crumbs: they scrolled under the sticky top — scrolling.
- The project Tasks table at 768 · 1024: rows under the sticky quick-add ("Add a task…") at rest, and **its ⋮ "covered" at 1024** — the ⋮ sits in
  the frozen actions column and the rows pass under the table's sticky foot and the tab strip as they scroll; at rest and at the end the ⋮ of a
  row in view takes its press (checked by tap). The table and its foot are the lead's (W2).
- 1280 (mouse): row ⋮ "covered" on the Projects listing and the Tasks table — parked actions shown on hover (REG-430).
- Schedule at 1024: rows under the house sideways bar (REG-570), which sticks to the frame's foot — the list scrolls past it.
- Dialogs at 844 × 390: a field under the foot — the body scrolls inside the house Dialog (head and foot pinned).
- The portal's inputs at 14px (login, Updates search, every portal dialog) and the studio's (New project, Add a choice, Post an update, the
  milestone name, the ticket reply): the house `TextField` / textarea — **For W1** (one rule in the house piece).
- Text under 12px: the dock's and the site bar's 10px labels, caption-xs chips — mocked sizes.

## For other lanes (the exact fix)

- **W1 · `components/om/text-field.module.css`** (and the house textarea): ≤767 the control's font 16px — iOS zooms on focus at 14 (every input the
  sweep lists in W3's pages: the portal's sign-in, Updates search and dialogs; New project; Add a choice; Post an update; the milestone sheet; the ticket reply).
- **W1 · the DS SegmentedButton** (`components/ds`): under `(hover: none)` ≤1024 an item is 36 tall — `[data-size=md] ._item { min-height: 44px }`
  in a touch query (the Schedule's Weeks · Months; W3-09 raises the milestone sheet's locally).
- **W1 · `components/om/crumbs`**: a crumb link is 15 tall under a finger on every paper page and the L2 header (156 hits): `(hover: none)` ≤1024 →
  the inline padding rule W3-07 uses (`padding-block: 15px; margin-block: -15px` on the link).
- **W1 · `components/om/folders/folder-card`**: on the Files tab at 320 · 390 a folder's select box is under its main button
  (`elementFromPoint` → `folderMain`) — raise the box above the main press (`z-index` on the box).
- **W1 · `components/om/chip-rail.tsx`**: the house rail never brings its selected chip into view and its 56px fades swamp a rail under ~120px;
  centring the `[aria-checked=true]` / `[aria-pressed=true]` chip there would let `ProjectViews`' own effect go.
- **W1 · `components/om/stat-tile`**: at 320 the tiles stack one a row (W3-16).
- **W1 · the L2 page header + the tab strip** at 844 × 390: 128 of the 390px stay pinned (header 80 + strip 48) — a phone held sideways reads the
  record through a 262px slot.
- **W2 · `components/leads/detail/info-column.module.css` `.assigneeName`**: at 768 and 1024 the Members value is 120 wide, so "Germaine" breaks
  inside the word ("Germain / e") beside the avatar and the kebab (`overflow-wrap: anywhere`) — keep a name whole: `overflow-wrap: break-word`
  plus `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` ≤1024 (the full name is in the row's menu).
- **W2 · `components/leads/detail/card.module.css` `.headText`**: 1025 – 1439 the head's right meta runs under the ↗ when the card is narrow (the
  project Overview's Money card at 1280: "From the signed quote · 19 li↗es") — `@media (max-width: 1439px) { .headText { flex-wrap: wrap; } }`
  (the ≤1024 rule's, extended; it wraps only when the two don't fit).
- **W2 · the lead's pieces a project reuses** (targets under 44 under a finger): `tasks-table.milestoneBtn` 141 × 20, `task-card.name` 252 × 24
  (390), `lead-notes` composer tools 24 × 44 (320), `meetings-table.title` 96 × 24, `file-viewer.stripItem` 36 × 36, the info column's
  contact row (`contactText` 69 × 20, copy / WhatsApp 16 × 16 — REG-365's decision, listed for completeness) and `headLink` 69 × 17.
- **W2 · the toolbars a project's views sit in**: `tasks-toolbar` · `meetings-toolbar` · `files-toolbar` at 320 give the view switch 92 / 140 / 148px
  (W3-13's ▲ applies to them as well).
- **W4 · `components/finance/cost-tables.tsx`**: the Costs table's WHAT cell — its sub link ("Bill AF-7781 · S$1,400.00 · with its file") is cut at
  the cell's edge with no ellipsis at 768 (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on the sub line, as the name above it).
- **W5 · `components/planner/viewer/*`** (`/space/<token>`, the portal's 3D layout): the Top · 3D · Walk buttons are 36 tall under a finger;
  **`components/visualizer/share/render-share-page`** (`/renders/<token>`): a pin is 26 × 26; **`components/visualizer/editor/stage.module.css`
  `.zoomLabel`** 52 × 36 (the floor plan composes it — W3-08 overrides its own copy).
