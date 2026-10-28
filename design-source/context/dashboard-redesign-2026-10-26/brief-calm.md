# The Dashboard, calmer — the second pass's contract (2026-10-26)

**His word (2026-10-26), after the redesign landed:** *"Data looks fine in the dashboard but visually it looks too busy what can we do to
simplify layout further?"* — then a Claude Design option, `calm-mock-claude-design.png` in this folder (1440 × 1717), *"this was one of the
option from Claude design. What's your take?"* — and on my take (adopt its layout, with six corrections) *"yes"*.

**The measure of busy (the built page's first screen at 1440):** 506 words · 43 boxed or tinted boxes · 77 controls · 13 type sizes/weights · 8
text colours · 14 background tints · 13 uppercase labels · 8 regions. **The target:** ~200–250 words · ~12 boxes · ~25–35 controls · 5 sizes · 3
text colours · ≤ 4 tints · uppercase only on Pulse's four labels (as drawn) · 5 regions above the fold. Write this measure into your probe for
your region (the script: `…/scratchpad/dash-close/busy.cjs` measures the page; adapt it per region).

**Read first:** this brief, then **open the mock** (`calm-mock-claude-design.png`) — it is the spec for the desk (≥1025) unless a correction
below says otherwise; then `brief.md` (the first pass's contract — its § 4 files and § 6 rules still hold) and your lane's first-pass
outcome (`outcome-d1…d4.md`). **The data layer is not this pass's** (`lib/dashboard/*-queries.ts` stay as they are) except where a lane's
item below names it. Phones and tablets keep the layouts the first pass built (the one column, the phone's accessory, the sheets) — they take
the same calmer cards, tabs and rows.

## 1 · What the mock does (take it)

- **The page:** the content on the grey page surface (`--om-color-surface-bg`), each region a white card (`--om-color-surface-default`) with **no
  border and no shadow**; 24 inside each card; 24 between cards; the content 64 in from the rail at 1440 (the mock's 136 − 72), right 64.
- **The greeting:** the title (~28, semibold) and one line in the secondary ink — "Tuesday 27 October · **51 things need you** · <a link>"
  — and Studio / Mine as a grey track with a white selected segment at the right. No chips row: *Since you were last here* is the line's
  link (see § 2).
- **Pulse:** four white cards in a row (Owner / Admin: Won · 90 days · Owed to you · Profit · <month> · First response) — label small
  uppercase letter-spaced secondary (the only uppercase on the page), the value ~28 bold, one caption line, and at most ONE quiet visual per
  figure: a thin line sparkline (Won, First response), Owed's aging bar, nothing on Profit. Other roles: their four (or fewer) from the
  first pass's rule, same card.
- **Two columns** below (left ≈ 810, right ≈ 406 at 1440, 24 apart). Left: Needs you, Your day, On site. Right: Pipeline, Projects, Team load.
- **A card's head:** the title in sentence case (~18 semibold) with its count in the secondary ink right after it ("Needs you 51", "Your day
  5"), and at its right one quiet fact or control (Pipeline "22 open", Projects "4 running · 2 late", Team "projects / capacity", Needs you's
  tabs, Your day's week strip, On site's "All photos" link). Nothing else in the head at rest.
- **Needs you:** text tabs at the head's right (All · Approve n · Clients n · Late n — the selected one a tinted pill, the others plain), five
  rows, each: a small glyph, the title (one line, ~15 medium), ONE caption line (where · who · when, ≤ ~60 characters — the long sentences
  go to the Review pane), the amount right-aligned, one verb; "Show all 51" as a text link.
- **Your day:** the week strip in the head (day name small over the date; dots for what a day holds), a time column at the left of each row
  ("10:00", "by 16:30", "5 days late" in red), a tick circle for a task, a dot for a meeting, the title + one caption, one action at most
  (Directions as a text link, Call outlined with its glyph).
- **On site:** the week's photos large (~246 × 184), a caption under each, "All photos" in the head.
- **Pipeline:** label · bar · count rows, the bars in the primary's tones darkening toward Won, a foot line "14 stuck over 14 days ·
  12 going quiet" (the first a link).
- **Projects:** each project two lines — the name (bold) with its state word at the right (Late in red · Starts 4 Nov · On hold in
  secondary), a full-width thin progress bar, then "62% · AquaFlow bill 14 days overdue".
- **Team load:** each member name + "2 leads" under it, a segmented capacity bar (one segment per project they can carry, filled for each
  they carry), "Full" / "2/3" at the right; the contractors' line as the card's foot with "View".
- **Maison AI:** one white pill (~640) at the foot, shadow, the spark, the placeholder, "⌘ J" / "Ctrl J", the send circle — nothing else at rest.

## 2 · The six corrections (his yes was on these)

1. **No filled button on the page** (his note of 2026-10-26, unchanged): the mock's Publish / Approve / Approve are filled — make every row
   verb the DS `secondary` `outlined` button; **the current day in the week strip is a tint, not a solid block**; the dock's send is neutral
   until there is text. Data marks are not buttons: bars, progress and capacity segments may take the primary's tones (the mock's).
2. **Red is ours and late only** (S-05): Owed to you's over-60 part and its words are **amber**, not red (a client's lateness is theirs);
   Projects' "Late", Your day's "5 days late" and a missed First-response target stay red.
3. **The house words:** the stages' own names ("Quote sent", not "Quoted"), the tab "Clients" (it holds reminders too, not only replies),
   no abbreviations ("HDB 5-Room", not "HDB 5-Rm"; "Executive Condo") — a long name truncates with its full words in the tooltip.
4. **What he marked Build stays, out of sight until wanted:** each card's ✦ Ask and Hide this card appear on **hover / focus** in the head
   (on touch: in the card head's ⋮, one control); Maison AI's three suggestions appear **when the field takes focus** (and on a phone in the
   sheet, as built); Not today stays in a row's ⋮ (the ⋮ shows on row hover / focus at a desk, always on touch); *Since you were last here*
   is the greeting line's link — one thing: it opens that thing; more: "3 new since Friday" opens the list (the first pass's menu / sheet);
   the cleared ring goes (the head's count already says it); Studio / Mine stays.
5. **Pipeline's stuck rule** (D3 ▲3: 14 of 22 marked on the demo): stuck = longer in the stage than **twice the studio's own median time in
   that stage** (Reports › Leads' own legs, `lib/leads/tat.ts` — one rule with the report), never under 14 days; a stage with no history yet:
   30 days. The foot says "n stuck" only when n > 0; the amber mark only on stages holding a stuck lead.
6. **The house's measures stay:** radii 8 for cards (the mock's ~16 is not taken — CLAUDE.md › Radii), the DS button sizes, `--om-*` tokens,
   44 targets on touch, 16px inputs on a phone.

## 3 · Lanes (worktrees from main's uncommitted state; set-up `…/scratchpad/calm-build/setup-lane.sh <C>`)

| Lane | Port | Owns | Builds |
|---|---|---|---|
| **C1 — page, greeting, Pulse** | 3251 | `components/dashboard/dashboard-view.tsx` · `dashboard.module.css` · `dashboard-ghost.tsx` · `frame/*` · `lib/dashboard/{frame,since,pulse}.ts` + their queries only where the four figures / the line need it · `lib/ghost-shapes.server.ts` (the Dashboard's part) · `components/om/stat-tile.*` (additive) | the grey page + white cards' grid and gaps at every width; the greeting and its one link (Since, § 2.4); Studio / Mine as a track; Pulse's four cards; the page ⋮ (Cards on your page) kept beside Studio / Mine; the ghost redrawn to the new shapes (loader = reveal, per role and width) |
| **C2 — Needs you** | 3252 | `components/dashboard/inbox/*` · `lib/dashboard/inbox.ts` (presentation fields only) · `components/projects/overview/row.tsx` (additive, the Overview byte-identical) | text tabs (All · Approve · Clients · Late), five rows of one title + one caption + amount + one outlined verb, the ⋮ on hover at a desk, "Show all n", the Review pane unchanged in behaviour, no ring; the short caption per kind written in the reader (`inbox-queries.ts` may change captions only) |
| **C3 — the cards** | 3253 | `components/dashboard/cards/*` (incl. `card-frame.tsx` — the shared head: title + count + one right slot; ✦ Ask / Hide on hover-focus, ⋮ on touch) · `lib/dashboard/{cards,cards-queries,health}.ts` (Pipeline's stuck rule, § 2.5) · `components/dashboard/after-call.tsx` | Your day (week strip in the head, time column, rows), On site (large photos), Pipeline (tones, the new stuck rule), Projects (two-line rows, progress bar, state word), Team load (segmented capacity, the contractors' foot); `card-frame.tsx` serves Needs you too — keep its props, C2 uses it as is |
| **C4 — Maison AI's pill** | 3254 | `components/maison-ai/dock/*` | the dock at rest = one pill (~640 at a desk, centred on the content), the suggestions and the context chip on focus, the send neutral until typed; the thread / pane / sheet as built; the phone's accessory unchanged |

**Shared:** the card surface — white, no border, radius 8, 24 inside, the head's type — is drawn by `card-frame.tsx` (C3) for every card and
by `frame/pulse-strip.tsx` (C1) for Pulse's four; both read the same CSS custom properties C1 sets on the page (`--dash-card-pad`,
`--dash-gap`) — C1 sets them in `dashboard.module.css`, C3 and C1 read them. No lane edits another's files.

## 4 · How a lane works (the first pass's § 7, unchanged), and deliver

Set up, build to the mock + § 2, look at 1440 · 1280 · 1024 sideways (touch) · 768 upright (touch) · 390 (touch) · 320 · 844×390 as each role
your region reads differently; real presses on a production build (the DB on the command, `next start` on your port, stop by port); never
`local.db`, :3000 / :3001, `db:baseline`; commit nothing. Deliver `outcome-c<n>.md` (each item: built where · kept why · ▲ for him), staged
rows `reg-c<n>.md` (`| REG-C<n>.m | Area | **What** — why (his "too busy … simplify" and the Claude Design option, 2026-10-26) | user-directed |`),
your first-pass probe (`verify-dash-d1…d4.cjs`) restated for the new presentation (each changed assertion commented `(the calm pass
2026-10-26, a deliberate change)`) plus the busy measure for your region, and the probes your files reach through the harness green. Final
message: 10 lines + the outcome path + the files you changed or added.
