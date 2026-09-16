# Design context — OpenMaison 2.0 prototype

The design counterpart of `/CLAUDE.md`. Everything here was read from the Figma file
`JCGkMBFLjeOyXYiEkOxFMO` (page **Leads - New**) or decided with the designer; decisions that
deviate from a mock are numbered in `REGISTER.md` (REG-nnn) — this file is the map, the register
is the audit trail. Screens proven in the build are banked as screenshots in `verify/`.

## 1 · Mock index (node ids — open as `?node-id=779-19690`)

| Surface | Node | Notes |
|---|---|---|
| Leads listing · table (expanded rail) | 779:19690 | default columns, pinned Lead Name, 64px rows |
| **Lead Details · Overview** | 858:24770 (155 New · 157 quick links expanded · 156 Lost + returned) · cards 858:24094 | specs dumped to `context/lead-overview/`; L2 header 858:24783, tabs 858:24784, info column 858:24787, brief 858:24867, quick links 858:25094 / 858:26317 |
| **Lead Details · Tasks** | 902:36216 (listing 902:26362 · add 902:26575 · menus 902:26783 · panel + tags 902:27260 · delete 902:27734 · attach 902:28019 · comments 902:28516 · filters 902:28959 · templates 902:29194 · export 902:29289 · other member 902:29303) | specs dumped to `context/lead-tasks/` |
| **Lead Details · Quotes** | 910:36240 (listing 910:36241 → empty 910:36242 · listing 910:36298 · filters 910:36338; contextual menus 910:36615 → 910:36616 · 910:36681) | specs dumped to `context/lead-quotes/` |
| **Lead Details · Contracts** | 931:38609 (empty 931:38610 · listing 931:38666 — no menus / filters / dialogs mocked; the Quotes tab's are reused) | spec dumped to `context/lead-contracts/` |
| **Quote editor** | 1271:40301 (page 1260:31139 · header 1261:35488 = Page Header / Quotes 1260:31143 + Page Tabs 1261:35438 · sections General 1271:39625 · Items 1271:39755 · Files 1238:32938 · Payment 1238:29290 · T&Cs 1238:33502 · Additional Notes 1238:33503 · Signature 1240:34176 · Activity 1254:3755; side strip 1271:40377 (collapsed 1260:31160); Items use cases 1271:40400 (add-item popover 1271:40932 · visibility menu 1271:40931 · active cells 1271:40867 · column settings 1271:41169); item image flow 1271:41010 (thumb menu 1271:41015 · icon picker 1271:41123 · Add Image modal 1271:41016); header kebab 1271:41512; Create Quote inspiration 1209:27023) | specs dumped to `context/quote-editor/` |
| **Lead Details · Files** | 931:39056 (empty 931:40314 · list 931:40141 · grid 931:39057 · menus 931:40007 · folder 931:39703 · select + bulk 931:39447 / 931:39576 · viewer 931:39831 · comments 931:39891 · info 931:39953 · viewer kebab 931:39860 · rename 931:39178 / 931:39434 · create folder 931:39191 · trash 931:39204 · move 931:39216 / 931:39282 / 931:39332 / 931:39384 · deleted 931:40208) | specs dumped to `context/lead-files/` |
| **Lead Details · Notes** | 931:44865 (empty / new note 931:44866 · menus 931:44936 · note editing 931:45013 · note view 931:45491 · contact log new 931:45124 · filled 931:45231 · view 931:45383 · Auto Fill 931:45344 · Add tasks 931:45360) | specs dumped to `context/lead-notes/` |
| **Lead Details · Questionnaire** | 931:46769 (empty 931:46770 · Ask the client 931:46853 · listing 931:46954 · Question Types 931:47053) | specs dumped to `context/lead-questionnaire/` |
| **Lead Details · Activity** | 931:47975 (one frame 931:47976 — feed of day groups) | spec dumped to `context/lead-activity/` |
| **Qanvast – Lead Return** | 931:48236 (menus 931:49039 / 931:49047 · wizard 931:48813 / 931:48882 / 931:48930 / 931:49009 · after 931:48553 · details 931:49048 / 931:49138 · Invite to Portal 931:48844 · Qanvast Ops › Leads 931:49232 / 931:49435 / 931:49680) | specs dumped to `context/lead-return/` |
| Row hover actions | 606:75167 | Edit (primary outlined) + kebab (primary outlined icon button), 12px apart, level-1 shadow |
| Leads listing · kanban | 779:19733 | viewport-bound board, column head level-1 |
| **Mobile · Lead Listing** | 1082:23305 (top bar 1082:23389 · header 1082:25131 · toolbar 1082:25269 · card 1082:25585 · dock 1082:24937 · FAB 1082:23383) | the first mobile mock — REG-298 / REG-299; 375 wide |
| **Mobile · More sheet** | 1082:24995 | the dock's More — REG-300 |
| Page header | 799:23251 | sticky, level-1 shadow, 24/16 |
| Review banner (docked) | 779:26186 · shadow 779:26211 · title 779:26227 | 50px, sticky bottom 16 |
| Review imported leads | 779:26221 · 779:26272 | now an **xxl modal** (REG-141) |
| Deleted Leads | 779:26316 | xl modal |
| Import history | 779:20147 | page |
| Import wizard (4 steps) | 779:20043 … | xl, fixed 928 tall |
| Lead routing dialog | 821:23969 · 821:24010 | s (400) standard dialog, ChoiceCards |
| Delete alert (compact dialog) | 779:24663 | s (400) |
| Export dialog (one-field s-modal) | 784:113420 | "Export Tasks" reference → Export Leads; Dialog `size="form"` |
| Tasks popover | 779:24722 | 400w, radius 4, level-3 |
| Assign member popover | 779:24696 | |
| Stage dropdown (cell) | 780:86452 · with journey meta 836:23422 | check on passed stages, "current" on the lead's stage |
| Stage filter pill dropdown | 780:93630 | live counts |
| No results (table) | 780:95559 | |
| Move stage window | 780:83579 (flow) · error state 780:91593 | l (800), rail 240 |
| Contacted panel · Auto Fill | 780:89150 (empty) · 781:58313 (filled) · icon 780:89214 | title row = Add Log; log card = Log n · Auto Fill · chevron; body = chips · Date & Time + Outcome · schedule block once an outcome is chosen · Remarks (optional) · rule · Attach row ("Attach", REG-324) |
| Met panel | 780:90234 (updated) | same log-list structure; body = Where + Date & Time · Remarks (optional) · rule · Attach meeting documents ("Attach", REG-325) |
| Quote Sent panel | 780:90472 (updated) | approved-quote tabs (From System / Upload) · rule · Attach meeting documents · rule · Attach render (optional) — links read "Attach" (REG-325); the From System empty state is not built |
| Attached-file tile | 781:58405 | 146w · 138×105 preview · filled pdf icon · name · delete — every attachment |
| Upload flow (Quote Sent) | empty 780:90940 · uploading 780:91263 · uploaded 780:91468 | dropzone stays above the uploaded file row; Quote amount (S$) only after an upload |
| Upload flow (Won) | 780:92744 | same states for signed quote + contract; uploaded signed quote → milestones 0% |
| Text Field states (error / active) | 836:23125 | DS Text Field / 48px |
| Text Field states (filled / disabled) | 836:23276 | |
| Modal header standard | 779:26016 | 64px, 20/24, title 20 bold, bare 24px close |
| Snackbar | 784:110041 · toast 780:82576 | 344×48, radius 4, Undo = text button #CCB2FF |
| Date picker | 789:84100 | Material desktop, 256×284; time row + Today are invented |
| Tooltip | 789:83369 | |
| Rail hover / expand tile | 795:22541 · full logo 780:75727 | |

DS library components (OpenMaison Components): Text Field set key `35b2a7b3a07d57667ff7b2cf058e210f52871462`
(Height 24/36/48/56 · State Empty/Filled/Active/Error/Disabled · Label · Helper Text · Trailing Icon).

## 2 · Tokens & scales

- Colour, type, spacing, radius and elevation come from `@openmaison/react` as `--om-*` variables (never literals — the two exceptions are logged: snackbar action `#CCB2FF`, merged-column tint fallback).
- Radii: **4** fields/buttons/menus · **8** cards/panels · **12** modals (REG-107). Elevation level-1 headers/column heads · level-3 menus/popovers · level-5 modals.
- Type roles used: heading-h3 (modal titles 20/24), h4 (panel titles), subheading-m/s (labels, buttons, links), body-m/s, caption-s (table headers, uppercase, 12/500).
- **Modal scale:** s 400 · m 600 · l 800 · xl 1200 (`--om-modal-*`); height to content, capped to the viewport; **xxl = fluid, 48px margin every side**. Fixed heights kept where the mock fixes them (Filters 600, Import wizard / Deleted 928). Footers: top rule always, the `--om-shadow-modal-footer` shadow only while the body scrolls (REG-322).
- **Motion** (`lib/motion.ts`, from the designer's Figma reactions): hover 50ms ease-out; toggles 150ms standard; menus 150/100; modals 200/140; sheets 280/180; springs `settle` (380/30) and `pop` — springs take **two** keyframes max. Ambient: the rail's Upgrade gem turns once every 8s (REG-164).

## 3 · Component specs (as built, mock-faithful)

- **Text field** (`om/text-field`): 48px, 1px `on-surface/border`, radius 4; label rests inside as body-m secondary when empty, floats to the border (12/16, 12px in) on focus/value; active = 2px primary (1px border + 1px inset); error = 1px red, red label, red 12/16 message 4px below; disabled = surface-variant border, on-surface/disabled text; helper text shares the message slot; placeholder only after the label floats. Modes: text · select (PortalMenu, keyboard-operable) · trigger (pickers). `numeric="digits" | "amount"` filters keystrokes and paste to digits (amount groups thousands) — every number field uses it (REG-150). Select chevron flips while open.
- **Date / date-time fields**: read-only triggers over the Material picker; value formats `d/m/yyyy` and `12/8/2026, 3:00 PM`. Picker: month header · Today icon · ‹ › · Mon-first grid · today ring · primary disc selected; with time: 296×340, hour · minute (00–59) · AM/PM · Done.
- **Chips** (choice): 32px, radius 4, subheading-s; selected = primary-variant fill + primary border. Disabled (read-only stage) = disabled colour.
- **Menus / dropdowns**: 200w, radius 4, level-3; group titles 10/500 uppercase with a dot; items 36px; disabled items `aria-disabled` + tooltip; close on any press outside the menu (trigger excepted); Esc consumed in the capture phase by the open menu.
- **Dialogs**: compact (delete alert, radius 12, level-5) and standard (56px head with divider). Confirm dialogs = Cancel + primary/danger action.
- **Snackbar**: 344×48, radius 4, inverse surface; action = DS text button 36px, #CCB2FF; 24px close; bottom-left above the review banner (`--bottom-dock`).
- **Tooltip**: singleton layer, 150ms delay, flips top/bottom, hides on pointerdown/scroll/Esc.
- **Ghost loader**: `GhostSheet` bones with one global sweep, ≥650ms, crossfade into the page (`PageReveal`).
- **Tables**: 56px head, 64px rows; fluid columns via `flex: W 0 Wpx`; Lead Name always pinned (max 3 pinned); **frozen columns show a 1px inner border at rest and a shadow only while scrolled** (REG-144); primary 4px band on a row = new lead nobody has opened yet; lead name heading/h5 (779:24446), phone as eight unbroken digits (REG-162); hover turns the name primary.
- **Kanban**: 320px columns, snap scrolling, card name → data 4px (408:54295), card hover turns the name primary (as a table row), task-less cards show "+ Add task", card kebab flips up near the column bottom, edge pagers, ghost-clone drag with auto-scroll; blocked columns dim to 45%; a drop on an earlier column springs back.
- **Popovers** anchored to cells follow the cell on scroll and close when it leaves the viewport; pressing the open popover's / menu's own trigger toggles it closed; outside presses are `pointerdown` (capture). On Hold leads show "· On hold till: {d Mon ’yy}" after the phone (table) / as the last meta item (kanban).

## 4 · Interaction rules (product)

- Stage movement policy (Linear / Flexible), no moving backwards, owner before leaving New, resume from On Hold/Lost with a confirm — see REG-111…132.
- Move stage window: log-list stages (Contacted, Met) with per-log read-only + Edit; Add Log opens only the new log; delete on extra logs; New editable only while the lead is still in New (REG-334); Won captures signed quote · signed contract · payment split (100%). Validation after first Save, inline, live-clearing (`lib/forms.ts` MSG).
- Review imported leads: source chips count what the duplicates toggle shows; queue duplicates show their twin row; merge table = single-line rows, frozen label + frozen merged result, equal data columns.
- From System lists (Quote Sent quote, Won signed quote + contract) open with the first system file selected.
- Upload flow (Quote Sent / Won): any picked or dropped file → "Uploading..." → the mock's file appears as a selected row under the dropzone; **Quote amount (S$)** is asked only in the upload flow (a system quote knows its amount) and is focused as soon as the file lands; in Won the payment split follows the signed quote's source — uploaded file → every milestone 0% (split unknown); system quote → the recorded 10/30/30/30 comes back (also on Reset to default / removing the upload).
- Return Lead only for Qanvast-sourced leads (own flow later) — in **every** lead menu: table row kebab and kanban card kebab alike. A rule on a lead applies wherever that lead has a menu.
- Reset prototype to base (Maison AI sheet) restores `fixtures/baseline.json`.
- **A narrowed view says so** (REG-295): a scope pill off its default ("All Leads" → a stage, "All Notes & Logs" → Notes / Contact Log) wears `AppliedDot` — DS Badge dot, primary, 8px + 2px surface ring at the pill's top-right corner, the Filters count badge's grammar (REG-69). The search box needs no mark; its text is the indicator.
- **Pill or Filters** (REG-297): one dominant single-choice dimension → scope pill (listing stage, Notes kind, Qanvast status); several dimensions or multi-select → Filters icon + modal with the count badge (Tasks, Quotes, Contracts). Never both for one dimension. A tab with no filter keeps its mocked static title (Questionnaire).

## 5 · Copy vocabulary (invented, awaiting designer sign-off)

Validation (`lib/forms.ts`): "This field is required" · "Choose a date and time" · "Enter a valid date (d/m/yyyy)" · "Enter a valid email address" · "Enter an 8-digit phone number" · "Enter an amount" · "Enter a number" · "Attach at least one file" · "Choose an option" · "Milestones must add up to 100%" · "Assign at least one member".
Stage flow: "Complete {Stage} first" · "Assign a member first" · "{Stage} is already completed — stages don't move back" · "Resume at {Stage}?" · "{Stage} details" · "Save changes" · "Other reason" · "Moved to {Stage}" + Undo.
Settings: page copy under Leads › Stage movement (`lib/settings/types.ts`). Reset: "Reset prototype to base" / "Reset the prototype?".

## 5b · Lead Details (phase 2)

- Frame: L2 header 72 (back · "Leads /" crumb · name 20/700 · 20px meta chips · Stage pill · Convert to Project · kebab) · tabs 44 (24 gap, 4px ink) · row: info column 360 — collapsible to a 72 glyph strip like the Create strip, REG-304 — (24 padding, sections with 1px rules, keys 120 / values fill, rows 36 apart) · centre fluid (24 padding, 24 gap) · Create quick links 72 ↔ 140.
- Cards ("Filter content"): stroke inside the box, r8, head 48 (12/600 caption title, meta, arrow_outward), body per card (see `context/lead-overview/04-*` and `05-*`); empty states 32 padding with the undraw illustrations under `public/figma-assets/empty-*.svg`.
- Maison AI brief: 884×176 gradient card + 24px Show more row (the mock's pager row replaced, REG-237); Show more stacks the stage's remaining brief cards below the first; briefs scripted per stage (REG-169).

- **Tasks tab**: table 56/48 with columns 56 · 582 · 160 · 137 · 118 · 191, unseen band + bold title on top, hover Edit + kebab; `Drawer` (components/om/drawer.tsx) for the Task / Comments panels (400w, 64 head, sticky footer); tags = DS Tag outlined default (uppercase via CSS); status OPEN blue / COMPLETED green; Attach files xl 1200×928 with the files library; Filters / templates / export / delete dialogs at 600 · 400.
- **Quotes tab**: table 56/64 with columns 40 · 319 · 128 · 120 · 120 · 120 · 120 · 120 · 157; two-line title cell (title 14/700 + "OM-10001 · Private" 12/400), inline status menu (five statuses), Due picker, hover View + kebab; empty state card 1244×784; Filters 600×600 (Sort · Date chips + custom range · Status · Due). No quote editor — "View" and the share / export items answer coming soon.
- **Quote editor** (1271:40301, REG-405…416): a full-page surface at `/quotes/[id]` with no rail; header 76 (crumb "Leads / {lead} / Quotes" · the QUOTE's title ▾ switches quotes · OM-number / VERSION / status chips · "Saved n mins ago" · status pill ▾ (REG-404 → REG-423) · Send · Preview · comment · kebab · ✕) + anchor tabs 48 + section cards 24 apart beside the 72/140 Create strip. General Info (three rows: Quote Title ‖ Client · Property Type; Project Ref # ‖ Site Address; Prepared by · Quote Valid Until ‖ NRIC · Customer ID — ref and validity are records, lib/quotes/refs.ts) autosaves; Items is a table scrolling inside its card with selection · # · ITEM frozen left and TOTAL frozen right (188: the mock's 140 plus room for the hover kebab beside the figure, REG-446), ITEM the fluid column that fills a wide card (REG-438), the hovered row's kebab on the listing's white pill (REG-439), every other column fitted to its content over every line, folded or not (REG-447) and every column resizable by its head's edge (REG-427; head 52 · rows 72 growing with the description's clamp — Double, two lines, is the default; the name is text in every state, only the description boxes when the row is active), groups summing their children (a group row is a tertiary-blue band across every cell with bold sums; children indented under the bar, REG-440), a group's "+" adds the line inside it as the first child (REG-441), an active row's 36px boxes bleed into the cell padding so no text moves (REG-442), the head checkbox goes mixed on a partial selection (REG-443, every selectable table), Expand on an active line opens the description in the S 400 modal (REG-444), a group's name carries the blue "Group" tag (REG-445), no Status column (out of the table and the catalogue, REG-426 / REG-435; a Declined line still leaves the totals), the Add Item row with the My Items popover, the totals card (Additional Discount % | S$, GST switch, Round Prices, owners-only margin); the quote's amount is always derived from its lines; a group's answer is its lines' (the chip sits on the group row, REG-417). ≤1024 the toolbar folds to the AI mark · Create · kebab and the selection · # · ITEM block freezes left; ≤767 every Items menu is a bottom sheet. Payment Schedule (REG-418 / REG-436): presets ▾ in the section-top (no AI button); rows handle · name · description · % · amount (= live total × share) · due (On Approval · ~ estimate · fixed), inline edit with ✕ / ✓, over-balance in red, Add a Payment; ≤767 the rows are cards. Files (REG-419 / REG-424): the section-top's Show in client view switch (20px, 1370:30162); tiles 169×183 of the lead's files the quote points at (Open · Rename · Download · Delete = unlink) + the 68px dropzone (browse → the Attach files modal in its quote chrome — tinted picks, no checkboxes, `chrome="quote"` — a drop uploads into the lead's files). Every editor switch is the DS 20px `size="sm"` (REG-423). Row density Single / Double / Triple = 1 / 2 / 3 description lines, rows 72 / 80 / at least 96 (Triple is a taller row on every line, REG-433); Expand lays the whole Items card over the editor as a full-page layer with Collapse in its toolbar (REG-434). Terms and Conditions / Additional Notes (REG-420): My Templates + Show in client view in the section-top; the in-house rich editor (B I U S · lists · align · link + Write with AI); templates modal (search · Create New · cards Add / kebab) and the New / Edit Template form (a fixed 663, the editor scrolling inside, REG-437) with Insert Token ▾. Signature (REG-421): Client Signature Required switch; the member's signature (Draw / Type → Signature Settings: name, Draw / Type radios, 752×140 preview with Clear) beside the client's dashed block (name + NRIC from General Info); Activity (REG-421): the quote's trail, newest first, primary dot on the newest. Tools (REG-422): the rail item opens a 318 tile grid (7 tools, Quotes first; a sheet on the phone); `/quotes` is the studio-wide list — the Quotes tab's table + a Client column, Create Quote with a Client field. Every new-quote path opens the Create Quote modal (XL, gallery-first, Blank Quote first).
- **Every table** (REG-427 / REG-430): the leads listing's model — columns never below the mock's width, the card scrolls sideways past that, the first block frozen, row actions parked at the visible right edge (24 in — the listing's 16 — on the row's centre line, at rest and while panning), a resize handle on every head (dragged widths held only while the table is on screen; double-click restores the mock's width). Build notes: the card's stroke is a real border on the scroll container (frozen cells paint over an inset one) and the fluid column's floor is the mock's px less that border's 2px, so the mock's card still fits without a scrolling; head labels are 12/Medium caps on every listing (the Files list included, 931:40167). Grid rows pin their single track to the row's height (`grid-auto-rows: 100%`, cells `min-height: 0`) and a resting card redraws its stroke over the children with a ring so the frozen cells never cover a corner or the bottom line (REG-431).
- **Contracts tab**: table 48/68 with columns 557 · 128 · 120 · 142 · 140 · 157, one-line title 14/500, no selection column, no title rule; status Draft · Sent to Client · Signed; the Quotes tab's menus, hover actions, filters (Sort · Date · Status) and delete dialog with "contract" copy.
- **Files tab**: grid (299 folder cards / 299×262 tiles, day groups, group checkboxes, selected = primary-variant) or list (56/60 table, 7 columns); breadcrumb row inside a folder; Create/Rename dialogs 400×228, trash confirm 400×216, Move dialog 600×600 (browse + drill-in + inline New Folder), Deleted Files 1200×928 sheet; viewer page with contained image, zoom bar 130×50, 48px prev/next, 400px Comments / Information panels.
- **Notes tab**: a toolbar row first ("All Notes & Logs" title on the left, New ▾ then the search on the right — REG-293 / REG-318), then one card — list 400 (REG-281; the mock's 68px chip head All · Notes · Contact Log (931:44884, REG-318) over 100px items with the selected band) + pane (68px kind header "Note" / "Contact log" carrying the item's actions (REG-292), editor p24, 182px Attachments column); note editor Title 20/700 + body 16/400, autosaving (REG-263); contact log = the Move stage log fields incl. Remarks + a read-only view (REG-291); Auto Fill 600×348 → Add tasks 600×385. Focus follows intent: a row click / New ▾ opens the editor focused, a selection the search moved on its own does not (REG-294).
- **Questionnaire tab**: 740px question cards (head 52 + grey answer block p24) beside a 480×136 summary card; five answer inputs (text area, digits, yes/no select, multi-select checkbox menu, date picker); Ask the client dialog 400×302.
- **Activity tab**: derived feed — day groups (rule + centred date chip) of 54px rows with glyph, sentence, "See …" link, actor and time; no toolbar.
- **Lead return**: 800 wizard (form 468 + tips 260, attempts 86×48 buttons, terms step), 620 details modal (tags, appeal banner, reply + return cards), 400 Invite to Portal; Qanvast Ops › Leads page (table 240 · 132 · 138 · 158 · 115 · fluid with return tags; grouped status dropdown).

## 6 · Designed later (invented placeholders in the build)

Time picker row + Today · Settings page layout · Contacted "Other reason" field · log delete control · stage-move Undo snackbar · review-queue twin comparison · the "stamp card" stage flow (ideation only, not built — see the three claude.ai artifacts noted in `/CLAUDE.md`).

## 7 · Where things live

`REGISTER.md` decisions · `context/page-checklist.md` per-screen must-haves · `context/interaction-states.md` hover/active states from Figma · `context/m2`, `context/m4`, `lead-listing/` captured mock code/specs · `verify/` banked screenshots · `README.md` what the raw Figma captures contain (and don't).
