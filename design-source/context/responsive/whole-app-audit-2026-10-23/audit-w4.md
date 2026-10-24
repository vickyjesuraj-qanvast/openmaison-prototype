# Lane W4 — the audit (Company · Settings · Finance · Reports · the template editors · the AI credits dialogs)

**His ask (2026-10-23):** "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your
recommendations." The contract: `brief.md` (fix defects inside the layouts that exist; no new screen or level; ≥1440 byte-identical).

## How it was looked at
- **The sweep's rows for the lane** (`out/sweep.json`, 39 routes × 5 widths) read first, then **my own whole-page pass** over 46 routes (every
  Company page, the six Templates libraries + Brand kit, Price book × 2, Plan × 2, Finance's six tabs, Reports' six, Settings' eight modules,
  the quote template editor × 2 and the five library editors) at **320 · 390 · 768 · 1024 sideways · 844 × 390 (touch) · 1280 (a mouse)** —
  the sweep's rules but measured over the whole page, not its first screen (`scratchpad/rwd-all/W4/audit.cjs`), full-page shots at every width
  sliced into contact sheets and looked at.
- **What a person opens**: every ⋮, New ▾, scope pill, filter, Column settings, row menu, select, picker and form on those routes, opened by a
  real tap and measured as a layer (off-screen · taller than the screen without its own scroll · under the dock · covered · targets · clipped ·
  a textarea's type), shot — 155 layers at 390, 188 at 844 × 390, 188 at 768, 187 at 1024, and at 320 (`openers.cjs`); then the deeper flows a
  person walks — the PO / bill / expense / vendor / payout / commission dialogs and panels, Plans, the trade / unit / field / question / member
  forms, the Price book's item, import and section dialogs, the ready-made designs, Deleted sheets, Add work, Export, the template editor's
  drawers, inspector, history, review — at 390 and 768 (`flows.cjs`).
- **The ghosts** held (the reveal's first paint faked away, as `verify-pm2-s17.cjs` does) at 768 and compared with their pages; 390 and 1440
  are the S17 probe's own checks (run through the harness).
- **iOS zoom**: Chromium never matches REG-306's `@supports (-webkit-touch-callout: none)` rule, so every input reads 14 in a sweep. The rule
  was injected unguarded, in the cascade's first place as globals.css sits, and each field read again — inputs type at 16 on iOS (no zoom);
  **textareas and selects do not** (W4-16).

## Findings
| id | page · width | what a person sees | severity | the fix |
| --- | --- | --- | --- | --- |
| W4-01 | Settings › Quotes & pricing · 320 (≤ 360) | "Change in Default Quote PDF › New quotes" runs 59px off the screen; the page body is cut at its right | blocker | ≤767 the head's button wraps its words inside its own outline (`settings.module.css`) |
| W4-02 | Settings › Finance › Document numbers · 320 · 390 | three fields across: the labels read "Pre…" · "Nex…", "The year" breaks onto two lines | major | ≤767 two across in typing order — Prefix · Next number, Digits · The year, then the example (`document-numbers.module.css`) |
| W4-03 | Company › Questionnaire · ≤767 | the card keeps the desk's 24 padding (every other Company card is 16 on a phone) — 16px less for the questions | minor | the Company cards' phone padding (`questionnaire-view.module.css`) |
| W4-04 | Company › Client portal › Getting it live · 320 · 390 | a row's Copy · Open · Change beside its words leave the sentence ~90px: the address breaks every few letters, "keeps / working / after a / change" | major | ≤767 the buttons take a line under the words (`portal-setup.module.css`) |
| W4-05 | Templates › Payment schedules editor · 768 (≤ ~800) | each milestone's delete stands 16px out past the card (two 160 floors asked 710 of 670) | major | ≤1024 the name and description columns share what is left (`library-editor.module.css`) |
| W4-06 | Finance (every tab) · touch | the head's *Reports ›* is 61 × 20 under a finger | minor | `HelpLink standalone` → a 44 box, paid back (`help-link.*`, `finance-frame.tsx`) |
| W4-07 | Settings › Trades · Units · Expense categories · touch | the word that opens a token's dialog is 20 tall inside its 32 token (150 targets on the sweep) | major | the name takes the token's left padding and stands 44, paid back (`settings.module.css`) |
| W4-08 | The question bank · Custom fields · a task template's steps · touch | the drag handle is 24 × 36 | minor | a 44 box into the row's gap, paid back (`library-editor.module.css` — the definition list composes it) |
| W4-09 | Client portal › Clients · touch | a client's name (it opens their access) is 20 tall | minor | REG-273's link padding, paid back (`portal-setup.module.css`) |
| W4-10 | Settings › Lead management › Lead stages · touch | "7 leads" links are 48 × 20 | minor | the same (`lead-stages-card.module.css`) |
| W4-11 | Plan & AI credits · touch | an activity's lead / sketch, Billing details' *Edit in Profile* are 20 tall | minor | the same (`plan.module.css`) |
| W4-12 | Templates › Quotes · touch | "Used by n quotes" is 101 × 15 | minor | the same, inside the foot line's own clip (it ellipsizes): ~32 tall, never over the card's name; the card opens the template — the full 44 would need the foot line's clip lifted (listed for Vicky) |
| W4-13 | Reports › Meetings · touch | a row's lead is 20 tall | minor | the same (`meetings-report.module.css`) |
| W4-14 | Quote template editor · touch tablet | the template's name (an input) 32 tall, the zoom figure 36 | minor | 44 boxes, paid back (`editor-topbar.module.css`) |
| W4-15 | Reports › Meetings › Coaching · 320 · 390 | the coaching row's words stand one letter a line at 320 (16px wide), four words a line at 390 — the evidence (meta, nowrap) takes the row | blocker | **W3** — `components/projects/project-overview.module.css`: `.row[data-two][data-wrap] .two { flex: 1 1 160px; }` (the stage row's `data-wrap` rule, given to the two-line row; only this report uses `two wrap`; at ≥768 nothing wraps, so the desk is unchanged) |
| W4-16 | Materials' note · the Qanvast listing · Settings › Finance terms · the message dialogs · Add work · Import's paste box · Approve the ask · the PO note … · iOS ≤767 | every textarea and select types at 14 on an iPhone and zooms the page on focus: REG-306's rule weighs `textarea` / `select` at 0,0,1, so any class rule (the house field's, the DS TextArea's) beats it; inputs carry 0,2,1 and do type at 16 | major | **W1** — `app/globals.css` REG-306: give the two the input's weight, `textarea:not([data-zoom-a]):not([data-zoom-b]), select:not([data-zoom-a]):not([data-zoom-b]) { font-size: 16px; }` (or `:is(input…, textarea, select):not(#\#)`) — device-verify |
| W4-17 | Company › Questionnaire · Settings › Custom fields · 320 | the head's "QUESTION" and "REQUIRED" run into each other ("QUESTIONREQUIRED"); a question breaks one word a line (52px) beside two 56 switch columns | major | **W1** — `components/om/definition-list.module.css` ≤767, in place of its `minmax(0, 1fr) 56px 56px`: `.head, .row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .head > :first-child, .row > .lead { grid-column: 1 / -1; } .col { justify-content: flex-start; }` — the name its own line, Required · Active under it beneath their two labels (verified by injection at 320: the question 124 wide on one line) |
| W4-18 | Finance › To do · Money in · Money out · Vendors · touch | a row's name link (`money.nameLink`) is 20 tall — names, invoices, POs, vendors | major | **W3** — `components/projects/money/money.module.css`: `@media (max-width: 767px), (hover: none) and (max-width: 1199px) { .nameLink { padding-block: 12px; margin-block: -12px; } }` (blockified in its flex stack; reaches the project Money tab too) |
| W4-19 | the library editors' heads · touch tablet | the crumbs (Company / Templates / …) are 15 tall | minor | **W1** — `components/om/crumbs.module.css` touch: `.link { padding-block: 12px; margin-block: -12px; }` (the title row under it is later in the DOM and keeps its own taps) |
| W4-20 | every scope pill · touch | the pill's overlay measures 42, not 44 | minor | **W1** — `scope-pill.module.css`: the overlay as the house centred box `width/height: max(100%, 44px)` |
| W4-21 | Plans (Monthly · Annual, Freelance · Studio) · the template inspector (One · Two columns) · touch | the DS SegmentedButton's items stand 36 — the REG-273 overlay list names `[class*='segmented'] button`, which the DS item (`_item_` in `_group_`) never matches | major | **W1** — `app/globals.css` touch overlay lists: add `[class*='_group_'][data-size='md'] > [class*='_item_']` |
| W4-22 | Templates › Schedules editor · ≤767 | the first milestone's name lands in the 24px number column (a 34px sliver of a field), its number in the head's empty cell | blocker | each row's first cell starts its own line (`schedules.module.css`) |
| W4-23 | Settings › Notifications · client messages · the message dialogs · 320 · 390 | *Reset to the house draft* runs 71px off the foot's left at 320 (−1 at 390): a hand-rolled spacer kept the house foot from wrapping | blocker | the house `FootStart` (`notifications-settings.tsx`, `client-messages-settings.tsx`; the dead `.footSpacer` removed). **W1** note: below 360 E-11's wrap leaves Cancel and Save on two lines — give `.foot > .footStart` `flex-basis: 100%` when it wraps |
| W4-24 | Templates › Tasks editor · 768 · 1024 · 844 × 390 | Team members opens Assign Member 92px past the right edge (768, 1024, 844 × 390) and, 440 tall, its Assign below a 390-tall screen; Tags runs 13px past the bottom (844 × 390) | major | the two placements kept inside the window, a finger's 44 rows counted (`task-template-editor.tsx`). **W2** — `components/leads/assign-popover.module.css` `.card { max-height: min(440px, calc(100dvh - 16px)); }`, so a 390-tall window keeps the card's foot (its list already scrolls) |
| W4-25 | the PO dialog (Finance › New ▾ › Purchase order, To do's *Change it*) · 768 – 911 | the line's "What it is" gets 0 – 56px and the Trade field draws over it — the line's own words cannot be read or typed | blocker | 768 – 911 the words take their own line, the trade leads the figures under them (`finance.module.css`) |
| W4-26 | Export (Money in, Reports) · touch | the DS Radio rows are 24 tall | minor | **W1** — the DS Radio / Checkbox labels have no touch rule in `app/globals.css`: `[class*='_radio_'], [class*='_checkbox_'] { min-block-size: 44px; margin-block: -10px; }` under `(hover: none)` (measure the DS's own class first) |
| W4-27 | a dialog with a foot · 768 – 1024 | an Undo snackbar covers the dialog's Cancel (seen on Edit PO after an approval) | minor | **W1** — the house Dialog lifts the snackbar above its foot at ≤1024 as a sheet does (`useSheetFootLift`, `--sheet-foot`) |
| W4-28 | Templates' galleries · a phone | "Next time, press C for New" toasts on a touch phone | minor | **W1** — the shortcut tips only where a key can be pressed (`(hover: hover) and (pointer: fine)`) |
| W4-29 | Tasks · T&Cs · Payments · Schedules editors · touch | the name field under the header is 36 tall | minor | **W5** — `components/contracts/editor/contract-editor.module.css` touch: `.titleInput { height: 44px; margin-block: -4px; }` |
| W4-30 | every library's list view (Templates › Quotes · T&Cs, Materials, Price book) · touch tablet | a short name ("HDB", "Floors") is a 30-wide target; *Used by n quotes* 59 × 20 | minor | touch: `.name { min-width: 44px }`, the link REG-273's padding (`templates-table.module.css`) |

## Looked at and not a defect
- **The template editor's page "clipped" (794 < 1011)** at every width — the rotated SAMPLE watermark the paper clips by design; no content
  passes the page's edge (measured).
- **The contract templates' thumbs "clipped" (198 < 600)** — a 1/3 scaled paper, identical at 1440.
- **Finance's searches, the editors' name fields typing 14** — inputs: on iOS REG-306 types them at 16 (verified with the rule injected).
- **"Select HDB" covered by the folder card** — a tap on the checkbox selects it (the hit is its own mark).
- **The CompanyShell's head and tabs over rows at the page's end** — a sticky head; the rows scroll under it.
- **Price book at 1280: row ⋮ "covered"** — the hover-revealed float at opacity 0.
- **The structure pane's foot over rows (1280)** — the list scrolls; at its end the last row clears the foot.
- **The library editors' head chips cut at ≤1024** — the designed scroller with its fade (sweep S1 T-02).
- **42-tall field controls** — the house dense field's box is 44 under a finger; its input inside the 1px borders.
- **In-sentence help links (Settings / Company help lines) and *Settings › Finance* in Commission's help** — REG-273's inline exemption.
- **The members' and settings' selects' long lists "covered"** — options scrolled inside the listbox.
- **Dialogs at 844 × 390** — head and foot stay, the body scrolls (Update your listing, Lead preferences, Edit details, New material, Plans,
  Buy AI credits, Edit PO, the messages).
- **The phone avatar (36) and the rail's studio block (36 × 64)** — W1's shell.
