# Lane W4 — the outcome (Company · Settings · Finance · Reports · the template editors · the AI credits dialogs)

The audit: `audit-w4.md` (30 findings). The staged rows: `reg-w4.md` (REG-W4.1…15). The probe: `design-source/verify/responsive-all/verify-rwd-w4.cjs`
(registered in the harness as `rwd-w4`); its shots and the two hand-offs' injected shots are banked in
`design-source/verify/responsive-all/rwd-w4/`. Every fix lives in a ≤767 / ≤1024 media query or REG-307's touch list
(`(max-width: 767px), (hover: none) and (max-width: 1199px)` / `(hover: none)`), except W4-24's placement, which only moves a popover that would
have run off the window. Nothing new is said anywhere (no invented copy).

## Ledger
| id | built where | kept / not done, and why |
| --- | --- | --- |
| W4-01 | `app/settings/settings.module.css` (`.settingHeadRow > button[data-size]` ≤767) | built |
| W4-02 | `app/settings/document-numbers.module.css` (≤767 two across) | built |
| W4-03 | `components/company/questionnaire-view.module.css` | built |
| W4-04 | `components/company/portal/portal-setup.module.css` (`.row[data-stack]` ≤767) — the page's ghost wears the same classes | built |
| W4-05 | `components/company/templates/editors/library-editor.module.css` (`.milestones` ≤1024) | built |
| W4-06 | `components/company/help-link.tsx` (`standalone`) · `help-link.module.css` (`.alone`) · `components/finance/finance-frame.tsx` | built |
| W4-07 | `app/settings/settings.module.css` (`.tradeName` touch: 44 tall, at least 44 wide — Trades, Units, Expense categories; Lead sources' and reasons' names already carry the house `button[class*='chip']` overlay) and `.trades` touch row-gap 12, so two lines' 44 boxes meet, never overlap | built |
| W4-08 | `library-editor.module.css` (`.handle` touch; the definition list composes it) | built |
| W4-09…13 | `portal-setup.module.css` `.clientName` · `lead-stages-card.module.css` `.countLink` · `plan.module.css` `.link` · `quote-templates-gallery.module.css` `.usedLink` · `meetings-report.module.css` `.leadLink` | built; *Used by* reaches ~31 inside its foot's clip (the full 44 needs that line's clip lifted — for Vicky) |
| W4-14 | `components/templates/editor/editor-topbar.module.css` (`.name` · `.zoomLabel` touch) | built |
| W4-15 | — | **W3's file** — see For other lanes (verified by injection) |
| W4-16 | — | **W1's file** (`app/globals.css`) — see For other lanes |
| W4-17 | — | **W1's file** (`components/om/definition-list.module.css`) |
| W4-18 | — | **W3's file** (`components/projects/money/money.module.css`) |
| W4-19 · 20 · 21 · 26 · 27 · 28 | — | **W1's** house pieces / shell |
| W4-22 | `components/company/templates/schedules/schedules.module.css` | built |
| W4-23 | `app/settings/notifications-settings.tsx` · `client-messages-settings.tsx` (the house `FootStart`; `.footSpacer` removed from `settings.module.css`) — 1440 foot pixel-identical to the old DOM (both dialogs) | built |
| W4-24 | `components/company/templates/editors/task-template-editor.tsx` (`assignPlace`, `tagsPlace` counts a finger's 44 rows) | built; W2 hand-off for the card's height |
| W4-25 | `components/finance/finance.module.css` (`.poLine` ≤1024: the words their own line) | built |
| W4-29 | — | **W5's file** (`components/contracts/editor/contract-editor.module.css`) |
| W4-30 | `components/company/templates/templates-table.module.css` (touch: `.name` min-width 44, `.usedLink` padding) | built |

## ▲ Decisions for Vicky
- **W4-01** the Change button's words wrap on a phone (two lines inside one outline) rather than shortening its label — no new words.
- **W4-02** Document numbers on a phone: Prefix · Next number, then Digits · The year — the desk keeps one line per document.
- **W4-04** the Getting it live rows' buttons go under the words on a phone (the address and its sentence read whole).
- **W4-12** *Used by n quotes* on a touch card stops at ~31 tall: the full 44 would cover the card's name line or need the foot line's ellipsis
  lifted. Your call whether the foot line should give it the room.
- **W4-07** on a touch screen the token lines (trades, units, sources, reasons, categories) stand 12 apart instead of 8, so the grown
  boxes of two rows never overlap — the tokens themselves keep their drawn 32.
- **W4-25** the PO dialog's line on a tablet: "What it is" takes its own line, the Trade leads Qty · Unit · Price under it.
- **The task template editor's pickers (W4-24)** now also stay inside a desk window when the step sits low on the page (before, the
  member card ran past the bottom at any width); nothing moves in the usual place.

## Shared pieces changed
- `components/company/help-link.tsx` gains `standalone` (only *Reports ›* in Finance's head passes it; every in-sentence help link is
  unchanged). No house piece in `components/om/**` or `components/shell/**` was touched.

## For other lanes (each verified where it could be, by injecting the rule into the running page)
- **W3** — `components/projects/project-overview.module.css`: add `.row[data-two][data-wrap] .two { flex: 1 1 160px; }` (W4-15). Only Reports ›
  Meetings passes `two wrap`; at 320 the coaching row's words stood one letter a line (16px), at 390 four words a line (86px). With the rule:
  the words take the row and the evidence wraps under them; ≥768 nothing wraps (byte-identical).
- **W3** — `components/projects/money/money.module.css`: `@media (max-width: 767px), (hover: none) and (max-width: 1199px) { .nameLink {
  padding-block: 12px; margin-block: -12px; } }` (W4-18) — every Finance list's name (To do · Money in · Money out · Vendors) and the
  project Money tab's; the link is blockified in its flex stack so the padding counts; rows keep their height.
- **W1** — `app/globals.css` REG-306: `textarea` / `select` weigh 0,0,1 and lose to every class rule, so on an iPhone they type at 14 and zoom
  (W4-16; inputs are fine at 0,2,1): `textarea:not([data-zoom-a]):not([data-zoom-b]), select:not([data-zoom-a]):not([data-zoom-b]) { font-size: 16px; }`
  inside the same `@supports` / ≤767 block — device-verify.
- **W1** — `components/om/definition-list.module.css` ≤767 (W4-17), in place of `.head, .row { grid-template-columns: minmax(0, 1fr) 56px 56px; }`:
  `.head, .row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .head > :first-child, .row > .lead { grid-column: 1 / -1; }
  .col { justify-content: flex-start; }` — the name takes its own line and Required · Active sit under it, beneath their two labels (injected at
  320: "QUESTIONREQUIRED" parts, a question reads on one line at 124 instead of 52 a word a line). Company › Questionnaire and Settings ›
  Custom fields both.
- **W1** — `components/om/crumbs.module.css` touch: `.link { padding-block: 12px; margin-block: -12px; }` (W4-19, the editors' crumbs 15 tall).
- **W1** — `components/om/scope-pill.module.css`: the pill's overlay as the house centred `max(100%, 44px)` box — its `inset: -4px` makes 42 (W4-20).
- **W1** — `app/globals.css` touch overlay: add `[class*='_group_'][data-size='md'] > [class*='_item_']` to both lists (the DS SegmentedButton's
  items stand 36 — Plans' Monthly · Annual and Freelance · Studio, the template inspector's columns, the Tasks toolbar) (W4-21).
- **W1** — the DS Radio / Checkbox rows have no touch rule (Export's "All invoices" rows 24 tall) (W4-26).
- **W1** — a dialog with a foot at 768–1024 lets the Undo snackbar cover its Cancel (Edit PO after an approval) — lift the snackbar above a
  dialog's foot as `useSheetFootLift` does for a sheet (W4-27).
- **W1** — the "Next time, press C for New" tip shows on a touch phone (Templates' galleries) — keep the key tips to `(hover: hover)` (W4-28).
- **W1** — `components/om/dialog.module.css` below 360: when `.footStart` wraps, give it `flex-basis: 100%` so Cancel and Save stay one line
  (seen on the message dialogs at 320 after W4-23).
- **W2** — `components/leads/assign-popover.module.css` `.card { max-height: min(440px, calc(100dvh - 16px)); }` (and the Tag picker) so a
  390-tall window keeps the card's foot (W4-24's placement keeps it inside; the height cap keeps the Assign button on screen).
- **W5** — `components/contracts/editor/contract-editor.module.css` touch: `.titleInput { height: 44px; margin-block: -4px; }` — the library
  editors' name field (W4-29).
- **W1** (shell) — the phone bar's avatar 36 and the rail's studio block 36 × 64 (every page in the sweep).

## The 1440 comparison
46 routes (every page in the lane: Company · Templates · Price book · Plan · Finance · Reports · Settings × 8 · the editors), full-height shots
taken until two in a row match (`scratchpad/rwd-all/W4/base1440.cjs` · `diff1440.cjs`), the WIP base build against W4's build:
- **Builds 4 and 5 (every W4 fix but the last line, `.tradeName` min-width): 46 / 46 identical** once two spots that also differ between two
  shots of the *unchanged* base build are set aside — the toolbar's "/" key slot (x1249 y157, 7px) and a rail glyph (x16 y738, 4px); unmasked
  44 / 46.
- Some builds of **identical code** came out with ±1–2 levels of antialiasing on rounded corners or the brand kit's scaled sample paper (build
  3 vs 4: the schedules gallery's card checkbox, 2px; build 5 vs 8: the brand kit's sample text, 723px) — Turbopack's output varies run to
  run; no W4 rule can reach 1440: every CSS change sits in `(max-width: 767px)`, `(max-width: 1024px)` or a `(hover: none)` query, none of
  which a 1440 mouse window matches, and the TSX changes are pinned: the message dialogs' feet are pixel-identical to the old DOM (both),
  the task editor's pickers open where they did unless they would have run off the window, `HelpLink standalone` adds a class styled only
  under touch.
- The final build's set is in `scratchpad/rwd-all/W4/after*` with the diff logs; the orchestrator's landing sweep is the one that counts.

## Tallies
- **30 findings**: **19 built in W4's files** (W4-01…14, 22…25, 30), **11 handed to other lanes** with the exact fix (W1 × 8, W3 × 2, W5 × 1),
  plus three hand-off notes on built ids (W2: the Assign card's height; W1: the foot below 360; W1: the shell's avatar) — 0 left undone in
  W4's files.
- **The whole-page measure, before → after** (46 routes × 320 · 390 · 768 · 1024 · 844 × 390 · 1280, `scratchpad/rwd-all/W4/audit-*.json`):
  pages scrolling sideways 0 → 0 · controls off-screen 1 → 0 · targets under 44 under a finger 911 → 580 (what remains: in-sentence help links
  — REG-273's exemption — 189; other lanes' pieces: the rail / phone avatar 193, scope pills 55, money's names 50, crumbs 39, the dense field
  19, the library editors' name 5) · clipped 89 → 88 (the phone avatar's "D", the paper's SAMPLE watermark, scaled thumbs) · covered 70 → 70
  (all read and ruled out in the audit: sticky heads at a page's end, hover floats, the folder card's checkbox) · a phone input under 16
  48 → 48 (inputs type 16 on iOS by REG-306; the textareas are W4-16).
- **Layers opened by a tap / click**: 155 at 390, 188 at 844 × 390, 188 at 768, 187 at 1024, 154 at 320, + 36 deeper flows at 390 and 768.
- **Probes on the final build** (the harness, a fresh copy of the lane's base DB each): `rwd-w4` 38/38 · `st-r1` 58/58 · `st-r2` 30/30 ·
  `st-r3` 30/30 · `pm2-s17` 130/130 · `tpl-parity` 20/20 · `folders-galleries` 44/44 · `pb-r2` 41/41 · `pb-r4` 32/32 · `cr-r3` 40/40 ·
  `sw-r4` 35/35 · `ghosts-same-390` 76/76; and on the build before the last three lines (finance ≤1024, the token row-gap, the editor name's
  border): `pb-r1` 18 · `pb-r3` 30 · `pb-modal` 18 · `cr-r1` 59 · `cr-r4` 41 · `cr-r5` 16 · `first-run-ghosts` 15 · `first-run-empty` 89 ·
  `first-run-noleads` 5 · `first-run-full` 6 · `sw-r1` 35 · `sw-r2` 27 · `sw-r3` 13 · `sw-r5` 33 · `insights-head` 16 · `pm2-s23` 148 ·
  `pj-gap-f2` 84 · `overlays` 67 · `ghosts-same` 76 — every one green, exit 0.
- `npx tsc --noEmit -p .` clean · `npm run design:lint` "nothing new breaks a house rule" (icon-button-overlay stays 2 / 2) · eslint on the
  lane's folders: 0 errors (the known warnings).

## Principles check
1. The mock wins — no mocked size changed: every grown target keeps its drawn mark (padding paid back, the house overlay); no new words.
2. One system — the house `FootStart` replaced a hand-rolled spacer; links compose the house text link; the touch query is REG-307's list.
3. Plain words — no copy changed.
4. Nothing is lost — no flow changed; the pickers open where they can be used.
5. Say why — unchanged.
6. Back returns — unchanged (`HelpLink` keeps its `?from=`).
7. Every screen is whole — the portal checklist's ghost follows its row (same classes); S17's ghost checks run in the harness.
8. Every width is designed — 320 · 390 · 768 · 1024 · 844 × 390 · 1280 looked at and measured; no W4 page scrolls sideways at 320 or 844 × 390;
   1440 byte-identical on a stable build (see The 1440 comparison); the two house queries and REG-307's touch list only.
9. Tables follow the listing — untouched.
10. Motion — none added.
11. Honest data — the probe writes nothing; the lane DB was put back after every run.
12. Reach for everyone — every fix keeps the element's role and name; keyboard order unchanged.
