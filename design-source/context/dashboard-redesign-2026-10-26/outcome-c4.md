# Lane C4 — Maison AI's pill: the outcome (the Dashboard's calm pass, 2026-10-26)

His words: *"Data looks fine in the dashboard but visually it looks too busy what can we do to simplify layout further?"*, the Claude Design option
(`calm-mock-claude-design.png` — the pill at its foot is this lane's) and his "yes" to adopting its layout with six corrections (`brief-calm.md`
§ 2.1 the send neutral until typed · § 2.4 the suggestions on focus · § 2.6 the house's measures). Staged rows: `reg-c4.md` (REG-C4.1…8). Probe:
`design-source/verify/dashboard-2026-10-26/verify-dash-d4.cjs` (`dash-d4`, restated — every changed check commented *(the calm pass 2026-10-26, a
deliberate change)*). Files: `components/maison-ai/dock/{maison-dock.tsx, dock-composer.tsx, maison-dock.module.css}` only — nothing outside the
lane's folder.

## 1 · What was asked, built where

| Item (brief-calm § 1 · § 2 · § 3 C4) | Built where | Notes |
|---|---|---|
| **At rest, ONE white pill** (~640 at a desk, centred on the content column, a soft shadow, the spark, the placeholder, ⌘J / Ctrl J, the send) — nothing else | `dock-composer.tsx` (place `dock` draws the pill: one row, `.pill`), `maison-dock.module.css` (`.pill` · `.pillEnd` · the band) | 640 × 52 at every desk width (1440 · 1280 · 1024 held sideways), centred on the content (measured within 2 px), round ends (`--om-radius-full`), white, a hairline (`--om-color-surface-variant` as a 1 px ring) under the house `--om-elevation-level-2`, 20 in to the spark, the send a 36 circle 8 from the end. The band behind it is the page's own grey (`--om-color-surface-bg`), with a 24 fade of the same grey above it — the cards scroll under it, the pill floats on the page as drawn. A press anywhere on the pill (the spark, its padding) puts the caret in the words. |
| **§ 2.1 the send neutral until there is text** | `.pillEnd .send` | The neutral circle, disabled, while the field is empty; the primary only once there is text (typed words that stay after a blur keep it ready — that is text to send). The quiet check (no filled primary at rest) still holds over the whole page. |
| **§ 2.4 the three suggestions and a card's chip on focus** (or a card's Ask putting its context in), folding away on blur with nothing asked | `maison-dock.tsx` (`engaged` = the field's focus · the +'s menu open · the answers out; `focused` from the band's focusin / focusout; `pressing` so a press still landing on a chip or the + never folds the row from under the pointer — Safari focuses no pressed button) | In use: the three (or the card's questions, or the questions that hold your typed words) rise above the pill (150 ms, `--motion-toggle`; none under reduced motion), the card's chip sits in the pill, the **+** takes ⌘J's place beside the send. Lets go — a press elsewhere, **Esc**, Tab out — with nothing asked: all of it folds, and a card's context that asked nothing goes too (one that asked stays with its answers, out of sight, and returns with them on focus). The +'s menu keeps the field in use while open (its focus is in the menu's portal). |
| **The +** (the tools that read a file; the prototype's reset) | `maison-dock.tsx` `PlusMenu` (`onOpenChange`) | Out of sight at rest — "nothing else at rest" — and beside the send while the field is in use (a click or Tab reaches it). See ▲2: on the Dashboard the reset is one step deeper. |
| **The thread above the field, the pane, the sheet, Stop / Retry, Esc, ⌘J, the answer cards, the phone's accessory — as built** | unchanged logic; `.threadWrap` · `.threadInner` restyled | The thread's wash is now the page's grey (was white) so the answers sit on the page as its cards do, at the pill's 640 (was 760). Esc folds the answers first, then lets go of the field (Esc, Esc walks back to rest). The pane re-centres the pill on what it leaves, as built. The phone's accessory and its ✦, the sheet, the keyboard lift: untouched. |
| **A tablet held upright** | `.doorField` composes `.pill` | The door to the sheet is the same pill (52, round ends, the neutral 36 send), alone at rest — the suggestion row that sat above it is gone; its sheet holds them, as built. |
| **A long question** | `dock-composer.tsx` (`data-lines` set from the field's own height), `.pill[data-lines]` | Past one line the pill's ends straighten to the first pass's composer corner (`--om-radius-4`) — the spark and the chip on the first line, the + and the send at the foot — so the words never run into a round end; up to the first pass's 120 cap, then it scrolls. |
| **The ghost** | `MaisonDockGhost` | Now the pill at rest (the spark's place, a line, the send's circle — no suggestion bars), on the dock's own classes. C1 places it (see § 4). |
| **The cards' foot clears the pill at every width** | asserted in the probe | At 1440 · 1280 · 1024 touch · 768 touch, scrolled to the page's end, the last card ends above the band (and so above the pill) — with C1's padding as it stands *and* with the 24 asked below. |

## 2 · The busy measure (the dock's region, brief-calm's script scoped to the band; a glyph's ligature is not counted as words)

Measured at 1440 × 1024 and 1280 × 800 on production builds: **before** = the WIP base (a copy of this tree with the first pass's three dock files,
built once, :3255), **after** = this lane (:3254), same DB.

| The dock at rest | words | boxes | controls | type sizes | inks | tints | uppercase | band height |
|---|---|---|---|---|---|---|---|---|
| before (first pass) | 22 | 4 | 6 | 3 | 2 | 2 | 0 | 154 |
| **after (the pill)** | **8** | **3** | **2** | **2** | **2** | **2** | **0** | **76** |

The 8 words are the placeholder and ⌘J's two keys; the 3 boxes are ⌘J's two key chips and the send's circle (the pill itself draws with a shadow
ring, which the measure does not count as a box — it is the one visible shape); the 2 controls are the field and the send. Page-wide at 1440
(the first screen): words 485 → 471, controls 78 → 74 — the rest of the page is the other lanes'. The probe asserts the region's targets: no
suggestion / + / chip at rest, ≤ 2 controls, ≤ 8 words, ≤ 3 boxes, ≤ 2 sizes, ≤ 2 tints, no uppercase.

## 3 · ▲ For him

1. **⌘J's look.** The option draws plain words "Ctrl J"; the pill keeps the house key chips (`Keys`, REG-711: one look for every key hint), which
   are two of the dock's three boxes. Plain words would be one box fewer — say if the dock (only) should read "⌘ J" as words.
2. **Reset prototype to base on the Dashboard** now sits one step deeper: the + is out of sight at rest, so it is *click the field → + → Reset
   prototype to base* (the floating button's sheet keeps it on every other page). D4 ▲1–2 (the reset in the +, the + itself) stay open; a row in
   the page's ⋮ (lane C1's menu) would put it one press away again.
3. **The focus ring.** While the field is in use the pill's hairline turns the primary (the house focus seasoning, the first pass's composer did
   the same); the option draws no ring. The caret and the rising suggestions also say where you are — the ring could go if it reads loud.
4. **Esc lets go of the field** when nothing is out (new — the first pass's Esc did nothing then). It is how the suggestions fold from the
   keyboard; with the answers out, Esc still folds them first.

## 4 · For other lanes

- **C1 — the content's padding.** The band is in flow (sticky, the body's last child) and reserves its own **76** at rest at a desk and on a
  tablet (8 + the pill's 52 + 16; it grows by the suggestions' 40 only while the field is in use, upward over the cards). `.content`'s
  `padding-bottom: var(--dash-dock-clearance, 184px)` (168 sideways, 160 upright) therefore doubles the room — 184 + 76 of grey under the last
  card at the page's end. **Needed: the page's own 24 (`--dash-gap`) at ≥768**; nobody sets `--dash-dock-clearance`, so drop it or set it to 24.
  On a phone keep `--fab-clearance` (the accessory floats; it is not in flow). The probe's "cards' foot clears the pill" holds either way (checked
  at 184 and with 24 injected).
- **C1 — the page's grey.** The band and its fade are `--om-color-surface-bg`: paint the same grey on the body (`[data-testid="dashboard"]`, to its
  foot — the band is its last child) so the band IS the page. Until then the band shows as a grey strip on the white panel.
- **C1 — the ghost** (loader = reveal): today `.ghostDock` / `.ghostField` draw a 760 × 84, 12-corner box fixed to the foot. The dock at rest is
  now 640 × 52, round ends, white, 16 above the panel's foot, no suggestion bars. Either place `MaisonDockGhost` (exported from
  `maison-dock.tsx`, on the dock's own classes) as the body's last child, or redraw `.ghostField` to that shape.
- **C3 — the card heads' Ask** (`askAbout('<card>')`) and **C2 — Needs you's ⋮ › Ask about this** (`askAbout('needs', question)`) are unchanged:
  at a desk the field takes the caret and shows the card's chip and questions; a person who moves away without asking leaves no context behind.
  The Ask that reveals on hover / focus (§ 2.4) is C3's; the dock does not depend on it being visible at rest.

## 5 · Tallies

- `dash-d4` (restated): **107 / 107** through the harness (fresh copy of the calm base DB, its own `next start`).
- Through the harness, the probes the dock reaches: `pm2-s10` 107 / 107 · `kb-r1` 35 / 35 · `kb-r2` 29 / 29 · `pm2-s22` 110 / 110 · `dash-d3` 79 / 79
  (+ 39 pure) · `dash-d1` 141 / 141. `pm2-s42a` (the phone's accessory; run directly, its REPO resolves outside the harness copy): 88 / 88.
- `npx tsc --noEmit` clean · `npx eslint components/maison-ai/dock` clean · `npm run design:lint` ✓ nothing new · `npm run design:anatomy` ✓ all
  1971 measures hold (90 pages, 27 dialogs).
- Other pages, lane vs the WIP base copy: 0 px differ on /tasks · /leads · /quotes · /projects · /settings · /company/members at 1440 and at 390
  touch — the dock's files are imported by the Dashboard alone.
- The cards' foot with C1's asked 24 injected, scrolled to the page's end: the last card ends 24 above the band and 32 above the pill at 1440 ·
  1280 · 1100 · 1024 touch · 768 touch (with today's 184: 192 / 176 / 168 above the pill).

## 7 · Shots

Banked in `design-source/verify/dashboard-2026-10-26/c4/` (01–07 with the page's grey injected for the eye — lane C1 paints it — so the band reads
as the page): `00-before-rest-1440` (the first pass) · `01-rest-pill-1440` · `02-in-use-1440` · `03-typed-1440` · `04-card-ask-1440` ·
`05-long-question-1440` · `06-door-768-touch` · `07-rest-1024-touch` · `08-answer-on-grey-1440` (no injection: the grey wash on today's white
page). The probe's own shots: `…/scratchpad/calm-build/C4/reg/lanes/dash-d4/shots/`.

## 6 · Principles check

1. **The mock wins** — the drawn option's pill at its measures (640 × 52, round, white, soft shadow, spark · words · ⌘J · send) with his
   corrections § 2.1 and § 2.4 on top; what it doesn't draw (focus, a long question, the tablet's door, the ghost) follows the pill and is a REG-C4 row.
2. **One system** — the same `DockComposer`, the house `IconButton` / `Keys` / `Tooltip` / DS `Chip`, `--om-*` tokens only (radius full / 4, level-2
   elevation, the motion token); the tablet's door composes the pill; no copied stylesheet.
3. **Plain words** — no new words; the placeholder and the suggestions are the first pass's.
4. **Nothing is lost** — every first-pass control is still one focus away (the three, the card's questions, the +, the reset); typed words stay
   on a blur; a card's context that asked something stays for its answers.
5. **Say why** — unchanged (the refusals and the Stopped / Couldn't lines are the first pass's).
6. **Back returns** — unchanged (every door from the dock opens with `?from=/dashboard`, re-asserted).
7. **Every screen is whole** — the ghost piece is the pill at rest; tooltips unchanged.
8. **Every width is designed** — 1440 · 1280 · 1024 sideways (touch) · 768 upright (touch) · 390 · 320 · 844 × 390 looked at and asserted; the
   tablet's door is the pill; 44 targets on touch (the house IconButton's overlay on the send and the +); inputs 16.
9. **Tables** — none here.
10. **Motion with purpose** — the suggestions rise in 150 ms when the field is taken, nothing moves at rest; reduced motion respected.
11. **Honest data** — no data changed; the suggestions are the first pass's rules.
12. **Reach for everyone** — ⌘J, Tab reaches the + (and Shift+Tab the suggestions above), Esc walks back to rest, the pill's every press puts the
    caret in the words, focus never lost when a chip or the + is pressed.
