# Lane W2 — Leads and the day's work: the audit (2026-10-23 → 24)

**Scope** (brief §4, W2): the listing (table · kanban · cards), imports, the lead's page and every tab (Overview · Tasks · Quotes · Contracts ·
Files + the viewer · Notes & Logs · Meetings · Questionnaire · Activity), the lead form, the Move stage window and its sheets, the log sheet,
On Hold / Lost, Return Lead, `/tasks`, `/tickets`, `/chat`, the Dashboard, Meeting Copilot (`/meetings`, a meeting's page, the client's
`/meeting/<token>`), Qanvast Ops (`/qanvast-ops/*`, a Hangout's page) and the public Hangout page (`/hangout/<token>` + a booking).
`/tickets` and `/chat` are this lane's routes but their bodies are `components/projects/{tickets,messages}` (W3's). `components/hangouts/**`
names no lane; it serves only this lane's routes, so W2 took it.

**How it was looked at** — on a production build of the WIP base (a scratch copy of the demo), port 3202:
1. The sweep (`rwd-all/sweep.cjs`, lane copy `W2/sweep-w2.cjs`) on 33 lane routes × 320 · 390 · 768 · 1024 (touch) · **844×390 (a phone held
   sideways, touch — added)** · 1280 (mouse): sideways · offscreen · covered · targets · a phone's input under 16 (sideways too) · clipped.
2. **Every opener pressed** (`W2/open-all.cjs`): each ⋮, New ▾, Add ▾, scope pill, stage pill, Filters, Column settings, Assign, row menu,
   sort and fold on every lane page at all six sizes — the layer it opens measured (off-screen · taller than the screen without its own scroll
   · controls cut · covered · targets · inputs under 16 · the dock over its foot) and shot (≈ 400 states).
3. **The moments walked** (`W2/flows.cjs`) at the six sizes: the Move stage window (Contacted → Met, Met → Quote Sent), the stage menu, On
   Hold, Lost, the log sheet, the composer, the lead form's errors, Edit details, Import, Review imported leads, the task panel (lead tab and
   `/tasks`), the viewer's Information and Comments, Return Lead, the quick add, Plan / Write up a meeting, New ticket, Qanvast Ops' Add Lead,
   a conversation.
4. Text cut without an ellipsis at every width (`W2/clip.cjs`, any child count — the sweep's ≤3-children rule missed the MY TASKS line), the
   1280 / 1366 / touch results diffed against 1440 so only what a width breaks is listed.
5. The 1280 "⋮ under a cell" reports re-checked by hovering every row (`W2/hover1280.cjs`) on the listing, `/tasks`, `/meetings`, a lead's
   Tasks and Qanvast Ops.
6. Every shot looked at by eye (montages in the scratchpad's `W2/mont/`).

## Defects (fixed in this lane)

| id | page · width | what a person sees | severity | the fix |
| --- | --- | --- | --- | --- |
| W2-01 | a meeting's page (`/meetings/<id>`, planned or held) · 320 · 390 touch | The sticky foot's two moves: at 320 **"Start the meeting" runs 15px off the screen** (the page is 335 wide, the label cut); at 390 the **Maison AI button sits on the primary's right end** (the foot kept the button's corner, leaving 298 for two moves that need 320). | major | On a phone the Maison AI button rides above the foot — the Quote screen's way (P-01, the house offset REG-302): `useMaisonAi(…, raised)` + `--bottom-dock` = the foot's measured height + 6 — and the foot gets its whole width back; the two moves share it in halves and, where both labels can't stand side by side (320), take a row each, the move under the thumb. A tablet keeps the corner (C-08). |
| W2-02 | lead Overview › MY TASKS · 1280 (mouse) | "Call · Thu, 22 Oct ’26 · 10:00 AM (2d overdu" — **cut mid-word with no ellipsis** (the card is 254 wide at 1280). The Dashboard's card is the same component and fits. | minor | The ≤1024 rule that lets the line wrap between its tokens now holds below 1440 (`my-work-card.module.css`); a line that fits draws as before, 1440 untouched. |
| W2-03 | the listing's table · 768 · 1024 · 844×390 (touch) | A lead with three members: "D [avatar] +1 ⊕" needs 120 inside a 104 cell — **the Assign glyph cut**. | minor | `TABLET_WIDTHS.assignees` 128 → 144 (`components/leads/table.tsx`). The tablet ghost's Members column needs the same 144 — W1's `components/shell/skeleton.tsx` (below). |
| W2-04 | `/tasks` · 320 · 390 | The to-do chips were squeezed beside the scope pill into a sideways scroller: **at 320 a 14px sliver, no chip visible**; at 390 one chip and a sliver. | major | ≤767 the chips take a line of their own under the pill and the tools — as the Quotes tab's to-do pills and the listing's "to call today" already do (`quotes-toolbar .todos`, `toolbar .todo`): the scope box steps aside (`display: contents`), the chips `order: 3; flex: 1 0 100%`, compact (glyph + count) as before, gone while the search has the row. The ghost (same classes) follows. ▲ visible on a phone. |
| W2-05 | `/leads/imports` · phone + touch tablet | The search types at 14 — the listing's types at 16 there ("every typed box does", P-13); 14 zooms an iPad's / a sideways phone's page on focus (REG-306 covers only ≤767 iOS). | minor | `.search input { font: body-l }` under `(max-width: 767px), (hover: none) and (max-width: 1024px)`. |
| W2-07 | `/meetings` and a lead's Meetings · 320 – 1024 touch | The lead link on a phone card / a tablet row is a 20 line; on a tablet row the meeting's name (the row's open, C-07) too. | minor | `padding-block: 12px; margin-block: -12px` on the link and the name's button (the link ellipsises, so no overlay can reach past its box) — 44 to the finger, the line kept; the card's 8 row gap leaves a 4px overlap only. |
| W2-08 | `/tasks` · 768 · 1024 touch | The For column's lead link — a 20 line (or the project's two). | minor | REG-344's invisible overlay, 12 above and below inside its 64 cell — the box (and any ghost bar) unchanged. |
| W2-09 | Qanvast Ops › Leads · 320 – 1024 touch | The copy-phone glyph is a 14×14 target. | minor | a 44 box paid back with margin, as the listing's copy glyph. |
| W2-10 | Qanvast Ops › Hangouts · a Hangout's Chats · Lead credits · Reviews, the public Hangout page, the client's `/meeting/<token>` · touch | 20-tall presses: a Hangout's name, a chat's lead, its venue, the client's place link, a month in Lead credits, "See every review on Qanvast" — the last one 8 above "Ask homeowners for a review", whose house 44 overlay reached over its foot. | minor | REG-344's invisible overlay on each link (12 above and below — the boxes, the lines and the ghosts' bars unchanged; padding first grew the Chats cards and moved the ghosts, caught by pm2-s27 and replaced); the reviews' two side presses stand 24 apart on touch so their targets meet. |
| W2-11 | the file viewer's strip · every touch width | The folder's files are **36×36** squares: the 48 `.stripItem` names lost to the house thumb's 36 (`thumb.module.css`, ordered after it in the bundle). | minor | 48 under a finger (`.stripList .stripItem`); the desk keeps its 36. |
| W2-12 | **a phone held sideways (844×390)** — the listing, `/tasks`, a lead's Tasks, the lead's header | The **Assign card is 440 tall: its Clear All · Assign run off the bottom** (the listing) — **and off the top on `/tasks` and a lead's Tasks** (their clamp had no floor: top −70). **The Filters dialogs' rail cannot scroll**: Source · Members · Date (and `/tasks`' Lead · Stage · Project) sit below the dialog with no way to them. `/tasks`' scope menu runs 4px off; the stage menus stop at 170 (the base cap `100dvh − 220`). | **blocker** | The Assign card is capped to the screen (`min(440px, 100dvh − 32px)` — 440 wherever the screen is 472+ tall); the tasks tab's and the task panel's placements floored at 16 (REG-269's clamp); the four Filters stylesheets' rail scrolls up to 1024; an anchored menu on a sideways phone is capped from its own top (`--menu-top`, the stage menu now passes its placed top). |
| W2-16 | a Hangout's page › How it went · 320 · 390 | The By designer table squeezed to 44px tracks: **its heads drawn over each other** (CONVERTED over FOLLOW-UP over DROPPED) and **the names cut to one letter** ("G…", "M…"); at 320 the table ran 7px past its card. | major | ≤767 it scrolls sideways in its own frame with the desk's tracks (the name from 120) — principle 9 / REG-430. |
| W2-17 | Deleted Leads · Deleted Files · a phone held sideways (844×390) | The sheets keep a 480 floor (REG-513) that beat their 294 cap: a 480-tall sheet in a 390 screen, its head scrolling away with the overlay. | minor | the floor gives way under 576 tall — `min-height: min(480px, calc(100dvh − 96px))`; the body scrolls inside; 480 wherever the screen is 576+ |
| W2-14 | the lead's info column — Team chat's *Messages*, Portal's *Client messages* · touch | The links' overlay made a 17 line 41 tall. | minor | inset −12 → −14 (45). |
| W2-15 | the task panel · touch | The lead's name (the panel's For line, its For row) is a 17 link. | minor | REG-344's overlay, 14 above and below (45). |

## Found, and not fixed here

| id | page · width | what a person sees | why it stays | where |
| --- | --- | --- | --- | --- |
| W2-06 | `/tasks` · 320 · 390 | A task card's lead ("Jonathan Teo") is a 24 link inside a card whose press opens the task. | L4 drew it 24 (`.forLink`); the card's lines stand 4 apart, so a 44 target either grows each card by 20 or reaches over the name above and the due line below (tried: it took taps from both) — a layout call | For Vicky |
| W2-13 | a lead's Notes › the docked composer · 320 | The three tools squeeze to 24 wide (Save and the Maison AI corner take the rest of a 288 row); at 390 they are their 44. | Holding 3 × 44 + Save + the corner at 320 needs a layout call (drop the corner for a raised button, or fold a tool) | For Vicky |
| B-06 | the lead Overview's QUOTES card · tablet | The step labels break inside words. | **Held for him** (brief §2). | For Vicky |
| K-1 | the lead's info column · touch | The copy / WhatsApp glyphs are 16 with ±4 targets; the contact rows 20. | **REG-365 / REG-379** — the owner's call ("a predictable target beats a nominal 44 that fires on the row above"). | kept |
| K-2 | 1280 (mouse) · the listing, `/tasks`, `/meetings`, a lead's Tasks, Qanvast Ops | The sweep's "⋮ under a cell". | Not a defect: the hover pair is `pointer-events: none` at rest; every hovered row's Edit · ⋮ was on top where drawn. | — |
| K-3 | the stage pill on the cards and the kanban, the to-do chips, Briefs to save · touch | The pill draws 36. | The house ScopePill's 44 overlay (REG-729) carries the target (it measures 42 — W1, below). | kept |
| K-4 | every phone input at 14 (house TextField, the task panel's textarea, the Dashboard's Ask box) | The sweep's "zoom". | REG-306: iOS types at 16 at ≤767 (Chromium can't see it). The sideways phone is not covered — W1, below. | kept |
| K-5 | the kanban's stage-group rail · touch | 28 wide (full height). | The mock's rail. | kept |
| K-6 | menus, the Assign card, Column settings, the Review sheet | The opener check's "covered" rows. | Rows scrolled inside their own list, under its foot — scrolling, not a cover. | — |
| K-14 | a phone's ⋮ sheet (the lead's More options) | A row's key chip ("Edit **E**"). | The house Keys hide on touch until a real keyboard is used (`html[data-hw-keyboard]`); the audit's own Escape presses set it. | — |
| K-7 | `/leads/imports` · 1280 | "TOTAL RO…", "ROWS IMPORT…" heads. | The same widths and ellipses at 1440 — not a width's defect. | — |
| K-8 | a meeting / a conversation / Notes at rest on a phone | The Maison AI button over content at rest. | The house tuck (wave E, E4): it slides away on scroll and returns at the page's end, where no control is under it (checked: the conversation's Send, the Notes composer's Save). | kept |
| K-9 | a phone held sideways · the Move stage window, the lead form, Edit Lead, Review imported leads, Return Lead | The desk's dialogs at 294 tall (a 64 head and a 72 foot leave ~150 for the body). | They scroll and every control is reachable — not a defect by the brief's rule; whether a sideways phone should get the phone's sheets / step screens is a design call. | For Vicky |
| K-10 | a lead's page · 844×390 | The sticky header + tab strip take ~130 of 390. | His rule: the lead's page keeps its tab strip at every width (REG-2734); a shorter sideways header is a design call. | For Vicky |
| K-11 | Qanvast Ops › Reviews · 320 | "Qanvast Ops" wraps to two lines beside the filled "Request reviews". | The house header's title rule, or an icon for the action — a design call. | For Vicky |
| K-12 | the listing's tablet table · 1024 | "All five on a 1024 one" (P-06): it was already 40px short (Members partly under the frozen Edit · ⋮); 56 after W2-03. | A column's floor or the frozen pair's width is his call. | For Vicky |
| K-13 | the task panel's tag picker · 844×390 | The picker's list opens under its field inside the panel and scrolls with the panel's body under the foot. | Reachable by scrolling the panel. | — |

## For other lanes (exact fixes)

- **W1 · `components/shell/shortcuts/shortcuts-layer.tsx`** — the keyboard tips ("Next time, press M for …") show on a **phone and a touch
  tablet** after a few taps (`onClick` reads `e.detail`; a tap has detail 1, and `tip()` asks nothing of the device). Tip only where a key
  can be pressed — the house Keys' own rule (`components/om/keys.module.css`: hidden under `(hover: none)` until `html[data-hw-keyboard]`):
  in `onClick`, return unless `matchMedia('(hover: hover)').matches || document.documentElement.hasAttribute('data-hw-keyboard')`.
- **W1 · `components/shell/shortcuts/dom.ts` `wordsOf`** — reads `textContent`, so an icon's ligature joins the words: "for Stage:
  Metkeyboard_arrow_down.", "for Wonkeyboard_arrow_down." (seen on the lead's stage pill and the listing's stage cells). Read the text
  without the Material Symbols spans (`[class*="msr"], [class*="mso"], .material-symbols-rounded`), e.g. clone, remove those, take the clone's
  `textContent`.
- **W1 · `app/globals.css` (REG-306)** — the iOS 16px typing rule is `@media (max-width: 767px)` only; a phone held sideways (844 wide) is
  over it, so iOS zooms there. Use `@media (max-width: 767px), (max-width: 1024px) and (orientation: landscape) and (max-height: 500px)`
  (lib/breakpoint.ts PHONE_SIDEWAYS).
- **W1 · `components/shell/skeleton.tsx`** (paired with W2-03) — the tablet listing ghost's Members column: the head's and the rows'
  `flex: '128 0 128px'` (the second 128 in the head, line ~171; the rows', line ~185) → `'144 0 144px'`, so the ghost keeps the page's column.
- **W1 · `components/om/scope-pill.module.css`** — the touch overlay `inset: -4px` sits on the padding box (the 1px border is outside it):
  the pill's target is 42, not 44. `inset: -5px`.
- **W1 · `components/om/filters-modal.module.css`** — the house rail does not scroll (`.rail` has no overflow); W2 made its four modules'
  rails scroll ≤1024, Projects' Filters (W3, `projects-filters-modal.module.css`) composes the same rail and has the same sideways dead end.
  One line in the house covers all: `@media (max-width: 1024px) { .rail { overflow-y: auto; overscroll-behavior: contain; } }` (the four
  W2 lines then go).
- **W1 · `components/om/crumbs.module.css`** — the L2 crumb links ("Leads", "Kevin Ng", "Qanvast Ops") are 15 tall under a finger on a touch
  tablet and a sideways phone.
- **W1 · `components/om/text-link.module.css` / `app/globals.css`** — REG-344's touch overlay reaches `button` text links but not `a`
  ones (deliberately, for links in prose). W2 grew its standalone `a` links per module (W2-06…10, 15); a house option for standalone links
  would retire those lines.
