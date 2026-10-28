# Lane C2 — Needs you, the calm pass · outcome (2026-10-26)

**Lane:** C2 of the Dashboard's calm pass (`brief-calm.md` § 3) — his *"Data looks fine in the dashboard but visually it looks too busy what
can we do to simplify layout further?"*, the Claude Design option (`calm-mock-claude-design.png`, its Needs you card) and his "yes" to the
six corrections. Worktree `agent-aa1eecf7f01ec7dae` on its WIP base (`42844959`); nothing committed. Port 3252, lane DB
`…/scratchpad/calm-build/C2/lane.db`, shots `…/scratchpad/calm-build/C2/shots/` (banked: `design-source/verify/dashboard-2026-10-26/c2/`).

## What was built, item by item (brief-calm § 3, C2)

| Item | Built where | Notes |
|---|---|---|
| **Text tabs at the head's right** — All · Approve n · Clients n · Late n, the selected one a tinted pill | `needs-inbox.tsx` (the house `Chips` in the house `ChipRail`, passed as `CardFrame`'s `legend`), `inbox.module.css` `.tabs.tabs` (order-proof), `lib/dashboard/inbox.ts` `CHIP_LABEL` · `CHIP_ORDER` · `InboxChip` | Only tabs with rows (All always); an emptied tab lets go (render-phase adjust, as before). The selected tab: primary-variant fill, primary words; the others secondary words, no stroke, a 4% wash on hover. A phone puts the tabs on the body's first line (`.tabsLine`) — four never fit the 326 px head. |
| **Five rows of one title + one caption + amount + ONE outlined verb** | `inbox-row.tsx` on the house `Row` (`two`, `glyph`, `meta`, `actions`, `after` — no new prop needed), `inbox.module.css` | `INBOX_SHOWN` 6 → 5 (phone 4). 60 tall at a desk, the 32 glyph centred on the two lines, no hairline between rows. The glyph wears the option's one tint (primary-variant); late and ours wears the red variant (S-05). Title 14/500, caption 12/400 secondary, amount 14/400 tabular; ≤1024 16 / 14. The verb is the DS `secondary` `outlined` button, min 96 wide at a desk so the short verbs read as a column; a channel's glyph only on a channel's verb (Call · Remind on WhatsApp). |
| **Truncation with the full words in the tooltip** (correction 3) | `inbox-row.tsx` `Clip` | One line each, "…" when the row is narrow; the house tooltip bubble (`showTooltipFor`) shows the full words **only** when the line is cut. On touch the title and caption wrap instead (no tooltip under a finger). |
| **The row's ⋮** — Not today, Ask about this, the second verb — on row hover / focus at a desk, always on touch | `inbox-row.tsx` `RowMore`, `.more` in `inbox.module.css` | Order: the second verb (Review shows its key **R**, `DropdownItem shortcut="list.review"`), the record's own steps (Send back · Decline · Record a payment · Open the quote …), Open, Not today (or its refusal line), Ask about this. Opacity 0 at rest under `(hover: hover)`; shown on the row's `:hover`, `:focus-within`, while open, and while its pane is open; touch always. The ⋮'s room is held (the verbs never jump). |
| **"Show all n" as a text link** | `needs-inbox.tsx` `.foot` · `.link` (composes the house `text-link`) | n = what the open tab holds; "Show less" folds it. `data-testid="needs-more"` kept. "n set aside for today · Show" sits at the foot's right as one press (`needs-set-toggle`); the set-aside rows keep the verbs' column (`.endSpace`). |
| **No cleared ring** | `needs-inbox.tsx`; `ringOf` / `ringWords` removed from `lib/dashboard/inbox.ts` | The head's count says what waits (correction 4). `data.cleared` (the records' own count, `clearedToday`) rides on the card as `data-cleared` — the probe still proves it moves with a real approval and back with its Undo. |
| **"You're all caught up" kept** | `needs-inbox.tsx` `.caught` | Calm: a tick in the row's glyph, the words, "Next: …" from `next` (was the full ring). |
| **The short caption per kind** (captions only) | `lib/dashboard/inbox-queries.ts` (`needCaption`, `fromWho`, `plainWhen`, `quoted`, every producer's `caption`), `lib/dashboard/inbox.ts` (`fitCaption`, `factsOf`, `clientOfProject`, `CAPTION_MAX`) | where · who · when, ≤ 60 characters by rule (the demo's longest, a new lead's: 60). A project row names its client ("Benjamin Han · from Germaine · yesterday"), approvals say from whom and when, more time "Michelle asks for 1 week more", money "Benjamin Han · 12 days overdue · due Wed 14 Oct", quotes "Vivien Lee · sent 55 days ago · not opened yet". Titles, verbs, ranks, keys, Not today's keys untouched. The long sentences stay in the Review pane's byline / facts (r.meta is still the pane's byline) or on the record. |
| **The Review pane, the keys, every behaviour unchanged** | `review-pane.tsx`, `use-inbox-actions.ts`, `inbox-back.tsx` untouched | J / K / ↵ / R as before: ↵ presses the row's one verb (`data-kb-open`); R presses `data-kb="list.review"` — on the verb when Review is the row's own, else on a key-only control in the row (`.keyOnly`: out of the tab order, `aria-hidden`, the ⋮'s Review the one in reach). The ? panel still lists R. Every action, its sentence, its Undo, the optimistic return on a refusal, Not today, Bring back, the Since chip's reveal: as built. |
| **The card head from C3's `card-frame.tsx`, as is** | `CardFrame card="needs" title="Needs you" meta={count} legend={tabs}` | `meta` is now the bare count ("51" — the option's "Needs you 51"); was "· 51". |
| **`row.tsx` additive props** | — | Not needed: the calm row is the first pass's props (`glyph` · `after` · `attrs` · `className`), and `after` may be a fragment. `components/projects/overview/row.tsx` is **untouched** — the project Overview is byte-identical by construction. |

## The busy measure (Needs you's card at rest, 1440, Dane)

| | words | boxes | controls | type sizes | text colours | tints | uppercase | height |
|---|---|---|---|---|---|---|---|---|
| First pass (C4's lane server, Needs you untouched) | 185 | 18 | 30 | 5 | 3 | 2 | 1 (the head) | 562 |
| **This lane** | **86** | **11** | **16** | 5 (4 in the rows) | 3 | **1** | 1 (the head — C3's) | **412** |

The probe (`verify-dash-d2.cjs` § 10) holds the rows + tabs to ≤ 90 words · ≤ 12 boxes · ≤ 16 controls · ≤ 4 sizes · ≤ 3 colours · one tint ·
no uppercase (measured: 82–84 · 11 · 15 · 4 · 3 · 1 · 0 — the words move with the demo day), writing the numbers to `busy-needs-1440.json` in its shot folder. The head's uppercase
and its two sizes are the old house head's until C3's frame lands.

## ▲ Decisions for him

1. **One glyph tint.** Every row's glyph wears the option's lavender (primary-variant) — the first pass's per-place tints (yellow for a client,
   green for money, blue for a lead) are gone; the red variant stays for late and ours. The Late tab is therefore a column of red glyphs.
2. **Four tabs, not six.** Money and New leads are no longer their own filter (the option draws four); their rows stay in All, in their place.
   "Your OK" is "Approve" (the option's word), "Clients" per correction 3.
3. **The caption names the client, not the project.** "Benjamin Han", not "HDB 5-Room — Benjamin Han" (the option's). The option's red
   "23.8% over quote" was not taken: the record says the PO *leaves 23.8% against the quote* (a margin, not a lateness of ours — correction 2);
   that sentence is the Review pane's byline.
4. **Titles are the modules' words, unchanged** (the brief: captions only) — so the site update's row reads its own heading in quotes
   ("“Feature wall panels have arrived”") where the option wrote "Site update: feature wall panels arrived", and a PO reads
   "PO-2026-008 to Stone & Tile Masonry Pte Ltd" where it wrote "PO-008 · Stone & Tile Masonry". Shorter titles would calm the card further;
   say so and the landing can take them per kind.
5. **On touch the words wrap** (title and caption) instead of ending in "…" — a finger never sees the tooltip; a phone's rows are taller for it.
6. **A narrow card puts the amount before the caption** (a container query under 600: a phone, a tablet held sideways), the first pass's
   phone rule made the card's; a desk and an upright tablet keep the option's amount column.
7. **The site update's photo thumbs left the row** — the Review pane shows the photos.
8. **Money keeps the house's card format** "S$ 5,530" (`moneyCard`), not the option's "S$5,530".
9. **R on a row whose Review sits in the ⋮** is pressed through a key-only control in the row (no one sees or tabs to it). The alternative —
   R opening the ⋮ — would be a second press.

## Shared pieces changed

None. `components/projects/overview/row.tsx`, `card-frame.tsx`, the house `Chips` / `ChipRail` / `Tooltip` / `DropdownItem` are used as they are.
`lib/dashboard/inbox.ts` lost `ringOf` / `ringWords` (only Needs you used them) and gained `fitCaption` · `factsOf` · `clientOfProject` ·
`CAPTION_MAX`; `InboxChip` is now `'all' | 'ok' | 'client' | 'late'`; `INBOX_SHOWN` 6 → 5.

## For other lanes

- **C3 (`card-frame.tsx`):** no new prop needed. Needs you passes `meta` = the bare count ("51") and `legend` = the tabs (a `ChipRail` holding
  the house `Chips`, ~300 px at a desk); keep the legend able to shrink (`min-width: 0`) and before the hover Ask / ⋮ so the tabs don't move
  when they appear (or hold their room). At ≤767 Needs you passes no legend (its tabs move to the body). The children get **no inset** from
  the frame — Needs you pads itself from `--dash-card-pad` (24 by default) minus the row's own 8 for its hover wash; if the frame starts
  padding its children, drop Needs you's `.body.body` inset at the landing.
- **C1 (ghost):** draw Needs you as it now is — the head (title · count · four tab words, the first a 32 pill), **five** rows (use
  `INBOX_SHOWN` / `INBOX_SHOWN_PHONE` from `lib/dashboard/inbox.ts`, not `NEEDS_SHOWN` from the projects) of 60: a 32 square, a title line and a
  caption line, an amount on about half the rows (desk), a 96×36 outlined button, an empty 36 slot; no chips row, no hairlines; the foot a
  "Show all n" text line (24 tall, 12 above). A phone: the tabs line first in the body, each row the words across then the verb line. Card
  height at 1440 for Dane: 412 (with the old head).
- **C4 (dock):** at 844×390 the shrunk ✦ accessory floats over the rows' ⋮ column as the page scrolls (seen; it was the same before) — worth a
  bottom clearance or a check that it never rests on a row's ⋮.
- **The landing:** `clearedToday` is still read by `fetchInbox` (the data layer is not this pass's) but nothing draws it — keep it for
  `data-cleared` or drop it; `InboxRow.thumbs` is still produced and no longer drawn. Probes restated for the new presentation, each change
  commented *(the calm pass 2026-10-26, a deliberate change)*: `verify-dash-d2.cjs`, `verify-pm2-s22.cjs` (the project row found by its key,
  its caption is the client's), `verify-pm2-s46b.cjs` ("Show all n"), `verify-pm2-s46c.cjs` (the "Approve n" tab).

## Tallies

- **`verify-dash-d2.cjs` restated — 149 / 149** through the regression harness (`run.cjs`, RUN_DIR with a `base.db` copied from this lane's
  clean DB; 179 s): the first pass's nine sections with each changed assertion commented *(the calm pass 2026-10-26, a deliberate change)*,
  plus **1b · the calm row** (five rows, "Show all n" a link with no box, no ring, one title + one caption line, no rule between rows, every
  caption ≤ 60, a project row's caption starts with its client, one glyph tint, the ⋮ at 0 at rest → 1 on hover and on focus, the ⋮ led by
  the second verb with its key) and **10 · the busy measure** (above; written to `busy-needs-1440.json`, banked in
  `design-source/verify/dashboard-2026-10-26/c2/`). Its line in `probes.cjs` (`dash-d2`) is unchanged.
- **The probes these files reach, through the harness, each on a fresh copy:** pm2-s22 **110/110** · pm2-s46b **80/80** · pm2-s46c **96/96** ·
  pm2-s37 **84/84** · kb-r1 **35/35** · kb-r2 **29/29** · dash-d1 **141/141** · dash-d4 **92/92** · dash-d5 **53/53** · pm2-s45b **72/72** — all exit 0.
- `tsc` · `eslint` (the lane's files) clean; `npm run design:lint` — nothing new (every count at its baseline); `design:anatomy` on this build
  — **all 1,964 measures hold** (90 pages, 315 heads, 26 dialogs, 41 menus).
- **The CSS load order** (`css-order-scan.cjs`, 107 routes at 1440): against C4's lane build (Needs you untouched there) **0 winners moved**;
  no order-only pair touches a Needs you class (the overrides are `.row.row` · `.tabs.tabs` · `.body.body`).
- **Every other page** — `components/projects/overview/row.tsx` and every shared piece untouched, so the project Overview and every Row user
  render as before by construction; `countApprovalsWaiting` counts the same Your OK rows (captions don't enter it).
- **Seen at every width** (banked, viewport shots on touch): 1440 rest · hover + ⋮ · the Late tab · 1280 · 1024 sideways touch · 768 upright
  touch · 390 · 320 · 844×390 · the ⋮ as a sheet on a phone; as Dane, Hui Min (Admin), James (Manager), Germaine (Designer), Priya
  (Accounting), Nurul (Marketing), Alex (caught up). No sideways scroll anywhere. A Playwright note for whoever reads the probe's shots:
  an *element* shot taller than the screen on a touch context re-lays the page out as a mouse (the ⋮ faded, the words cut) — the probe now
  takes viewport shots on touch.

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — the option's Needs you is the desk spec; every departure is a ▲ above (corrections 2, 3, 6 and the house's own measures).
2. **One system** — house Row, Chips, ChipRail, Tooltip (`showTooltipFor`), PortalMenu + DropdownItem (with its key), IconButton, the DS
   outlined Button, `text-link`; tokens only; overrides doubled (`.row.row`, `.tabs.tabs`); no copied stylesheet.
3. **Plain words** — one short caption per row by rule; "Approve", "Clients", "Show all n"; "2 days ago", never "2d ago"; invented copy listed (REG-C2.4 · 5).
4. **Nothing is lost** — every verb, step and refusal is in the row or its ⋮; the long sentence is in the pane or on the record; Not today, Bring back and every Undo as before.
5. **Say why** — Not today's refusal is its help line in the ⋮; a cut title or caption says its full words in the tooltip.
6. **Back returns** — every door keeps `?from=/dashboard` (asserted on every row).
7. **Every screen is whole** — the card inside the page's reveal; the ghost's new shape handed to C1.
8. **Every width** — 1440 · 1280 · 1024 sideways touch · 768 upright touch · 390 · 320 · 844×390: no sideways scroll, 44 targets on touch (verb, tabs, ⋮, links), 16 / 14 type ≤1024, words that wrap on touch, the amount by the card's width.
9. **Tables** — not a table; the row grammar is LEAD STAGES' (the house Row).
10. **Motion** — the rows' ease-out and the reveal's pulse as built; the ⋮'s fade is the house hover motion.
11. **Honest data** — every row the module's record; every caption from the record's own words; the cleared count from the records.
12. **Reach for everyone** — the ⋮ appears on keyboard focus, J / K / ↵ / R unchanged, the tabs a radio group with arrow keys, every icon-only control named.
