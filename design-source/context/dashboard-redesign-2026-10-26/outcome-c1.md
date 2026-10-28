# Lane C1 — the page, the greeting, Pulse · outcome (the calm pass, 2026-10-26)

brief-calm.md § 3 C1, built on the lane's WIP base (`34ae89da`, the redesign as landed) in its own worktree, to the Claude Design option
(`calm-mock-claude-design.png`) and his six corrections. Verified by real presses on a production build (:3251, the lane DB = the shared calm
base) at 1440 · 1280 · 1024 sideways (touch) · 768 upright (touch) · 390 (touch) · 320 · 844 × 390, as Dane (Owner), Hui Min (Admin), James
(Manager), Germaine (Designer), Priya Tan (Accounting) and Nurul Huda (Marketing). Staged register rows: `reg-c1.md` (REG-C1.1…C1.17). Probe:
`design-source/verify/dashboard-2026-10-26/verify-dash-d1.cjs` restated (every changed assertion commented "(the calm pass 2026-10-26, a
deliberate change)") + its new § 7b, the calm measure for this lane's regions. No migration, no repair rule. Nothing committed.

**The lane's tree holds every lane now.** On the coordinator's word, lanes C2's, C3's and C4's finished patches (`…/calm-build/C2|C3|C4/lane.patch`,
applied three-way; the one conflict — `verify-pm2-s22.cjs` — merged by keeping both sides) were applied in this worktree, unchanged, so the
ghost is fitted to the real cards and every probe runs on the whole page. **This lane's own changes, against main as it stands (C2 · C3 · C4
landed):** `…/calm-build/C1/c1-on-main.patch` (24 files, made by `…/calm-build/C1/make-patch.sh` — `diff -u` of each of this lane's files
against main's), plus the banked shots in `design-source/verify/dashboard-2026-10-26/c1/`. The final checks ran on a fresh demo base
(`…/calm-build/C1/fresh.db`: the shared base restored to today by `scripts/restore-baseline.ts` and repaired, on its own copy — the shared one
was made on 26 Oct, and past midnight S43B's "today's Hangout" had moved to yesterday).

## Each item

| Item | Built where | Kept / why · not done / why |
|---|---|---|
| **The grey page, white borderless cards** (§ 1 The page, § 2.6) | `components/dashboard/dashboard.module.css` (`.page.page` — order-proof over the shared body's white) | The content on `--om-color-surface-bg` (the shell's own canvas, so the white rail stands on it as drawn). The measures every card reads are set once on the page: `--dash-card-pad` 24 · 20 (tablet, either way up, and a phone held sideways) · 16 (phone); `--dash-gap` 24 · 16 · 16; `--dash-band` 32 · 24 · 16 (between the greeting, Pulse and the columns — the option's 32); `--dash-surface` (for the dock's fade); `--stat-tile-pad` = the card pad (Pulse's cards). Content 64 from the rail and the screen's edge at 1440 (the option's 136 − 72: the shell's 8 and the box's 56), 32 in at 1025–1279. Radius 8 (the house's), no border, no shadow. Lane C3's frame already reads `--dash-card-pad` (seen in its worktree). |
| **The page's foot** (lane C4's note 1) | `dashboard.module.css` `.content` | The docked Maison AI is the body's last child, in the page's flow, with its own band: the content's foot is the page's own 24 at every width from 768 (no `--dash-dock-clearance` any more — nothing set it, and its 184 / 168 / 160 fallbacks doubled the space under the last card); a phone keeps the house `--fab-clearance` (the accessory is fixed above the dock). Measured at 1440: the last card ends 24 above the dock's band. |
| **The grid at every width** | `dashboard.module.css` `.grid` · `.act` · `.glance`; `dashboard-view.tsx` | Desk: 2 : 1 (the option's 810 : 406 → 819 : 409 at 1440; 712 : 356 at 1280), the glance never under 320. **On site moved to the left stack** (Needs you · Your day · On site | Pipeline · Projects · Team load), as drawn. A tablet held sideways keeps the first pass's 1.5 : 1 (530 : 354); upright, a phone held sideways and a phone keep the one column in the first pass's reading order (a phone reads Needs you before Pulse). |
| **The greeting** (§ 1, § 2.4) | `components/dashboard/frame/greeting.tsx`, `needWords` · `greetingLine` in `lib/dashboard/frame.ts` | Title 28 bold at a desk (24 on a tablet, 20 on a phone — the house has no 28 semibold; the option's weight reads as this one), ONE line: the day (secondary), "51 things need you" (ink, medium — `greeting-needs`), and the news as its one link. The day, the count and the link are each kept whole and each dot clings to the words before it (a no-break space), so a narrow line breaks after a dot — at 320: "Tuesday 27 October · 51 things need you ·" / "5 new since Friday". The line composes in the browser so an opened piece of news leaves it at once; `greetingLine` keeps the plain sentence for anything that reads the page's words. |
| ***Since you were last here* as the line's link** (§ 2.4) | `components/dashboard/frame/since-chips.tsx` (`SinceLink`), `sinceLinkOf` · `chipCount` · `SinceChip.count` in `lib/dashboard/since.ts`, the counts in `since-queries.ts` | No row of chips (the `since` slot is gone). Nothing new — no link. One piece — its sentence (the design system's `Link`, in the line's type), opening exactly that: its record, or its Needs you row (scrolled to and pulsed) when it waits on the page, or — a piece that stands for several, "3 new leads · all from Hangout" — its list. Several pieces — "**5 new since Friday**" (n = the records they stand for, each once: 1 + 3 + 1 on the demo), opening ONE list (the house menu; the house sheet on a phone): single pieces as rows with their glyph, a piece of several as a group (its sentence the group's title, each record a row, its door "Open the 3 in Leads"); the list's title "New since Friday". An opened piece leaves the link for this browser (the first pass's per-browser store, unchanged). The link stays whole on its line (an inline block); on touch its press reaches 44 above and below its words. |
| **Studio / Mine as a grey track** (§ 1, § 2.1) | `greeting.tsx` (the DS SegmentedButton with `track` / `trackItem` classes), `dashboard.module.css` | The track is the surface's variant grey, the chosen item a white face inside a 4 ring of the track's grey — no primary tint, no outline (correction 1). 40 tall at a desk, 44 on touch (`--dash-track-h`, which the ghost's box reads too). Remembered on the record and in the address, as built. |
| **The page's ⋮** (*Cards on your page*) | `greeting.tsx` | Kept beside the track, unchanged in behaviour; the Team card is named "**Team load**" there and in its Hide snackbar (`CARD_LABEL.team`, the option's head — lane C3's frame reads the same label for its ⋮). |
| **Pulse — four white cards** (§ 1 Pulse) | `pulseKeysFor` · `PULSE_SHAPE` · `profitLabel` · `RESPONSE_TARGET_MS` · `PulsePart` in `lib/dashboard/pulse.ts`; captions in `pulse-queries.ts`; `components/dashboard/frame/pulse-strip.tsx` | An Owner's and an Admin's four: **Won · 90 days · Owed to you · Profit · \<month\> · First response** (three without Profit where costs and margins aren't theirs). *Leads this week* and *Coming in* left their strip (▲ 1). Other roles keep their first-pass figures (Manager 3 · Designer 3 · Accounting 4 · Marketing 2), as the same cards. One row at a desk, a tablet held sideways and a phone held sideways (nothing a swipe away any more — the pagers went), two across upright and on a phone (an odd last one takes the row). Each figure's press, hover / long-press / ↓ breakdown and its doors are the first pass's. |
| **One caption, one quiet visual** (§ 1 Pulse) | `StatTile look="card"` + `spark` (`components/om/stat-tile.*`, additive), `pulse-strip.tsx` | A small capitals label (the only capitals on the page), the value at 28, ONE caption line, at most ONE visual: a thin line of the weeks — Won, First response (a dashed mark at the report's 8-hour Fast band), Leads this week, Coming in (its weeks ahead) — or Owed to you's / You owe's age bar, thin and wordless (the caption says the age). Off the face: the comparison (▲ 1 …) — now the breakdown's title and the figure's accessible name; First response's grade chip — its caption's colour says Slow; Profit's *Early* chip — its caption ends "costs not in yet on 2 projects"; the 8 weekly bars. A week with nothing to measure is passed over by the line, not drawn as a nought. |
| **Owed to you amber, ours red** (§ 2.2) | `bands(…, 'theirs' \| 'late')` + the captions' `tone` in `pulse-queries.ts`; `.theirs` · `.late` in `dashboard.module.css`; `.agingBand[data-tone]` in `stat-tile.module.css` | Owed to you's over-60 band and its words ("S$ 22.1K over 60 days") amber (`--om-color-tertiary-yellow-default` for the band, `--om-color-on-tertiary-yellow-variant` for the words — lane C3's amber ink); never red. You owe's overdue words and its oldest band red (ours and late). First response's caption red only when the report grades the median Slow (past a day). The probe asserts red in Pulse only on those two. On the demo nothing is over 60 days (Owed shows "S$ 34.2K past due · 2 invoices", no amber) — the amber path is asserted as a rule. |
| **The ghost, loader = reveal, per role and width** | `components/dashboard/dashboard-ghost.tsx`; lane C3's `cards/card-ghosts.tsx` wired in (two fits made there, below); lane C4's `MaisonDockGhost` (the pill, the body's last child as the page's dock is — C4's note 3); the Dashboard's part of `lib/ghost-shapes.server.ts` (a comment: the `dashboard.since` seed now says whether the line carries the link) | The grey page; the greeting's title, its line (its parts kept whole, as the page's) and the track's own box; Pulse's cards on the house tile's own classes — label, value and caption as the page's words of the demo's lengths, Profit's month by the studio's clock (`useSyncExternalStore`); **Needs you drawn on lane C2's own classes** (C3's frame and head, the uninset body, the house Row's classes and C2's: the glyph's square, a title and a caption line in the demo's own words, the amount where a row has one — leading the caption on a narrow card —, the outlined verb at each row's width on the move, the ⋮'s room, "Show all n"; the tabs in the head, on a phone the body's first line); **the five cards on C3's own ghosts**; the pill. **Every region stands where the page's does and is as tall — 0 px — for Dane at 1440 · 1280 · 1024 sideways · 768 upright · 390 (40 of 40)**, and for Hui Min at every desk width; for the other roles the remaining gaps are a line of words their own data writes differently (their Needs you rows, a project line, Hui Min's shorter news link on a tablet — 16–64 px), which a ghost can't know ahead. **In C3's file, three fits** (the coordinator asked that the ghost land 0 px): a site visit's row carries Directions too (`DAY_ACT`), a phone's own "Show n more" sits in the kit's phone-only box (the link's own display on touch had shown it on a tablet, +52 px), and a quiet week's "Add a task" verb is drawn (−16 / −24 px). |
| **One clock** (the coordinator's note 3) | `lib/dashboard/context.ts` (`today: studioDay(now)`) | The page's today is the studio's day (Asia/Singapore — `studioDay`, the same calendar-day scale as `dayOf`), as the greeting and the dock's "today" already read it: after midnight here (IST) the greeting said Tuesday while Your day said Monday. Day numbers of stored dates (a task's due day, a milestone's end) are calendar days and compare as before. Left on the server's clock, on purpose: Pulse's *Leads this week* (the Leads listing's own "Last 7 days" — one number with the listing) and Team load's contractors line (Workload's own board, `dayOf(now)` in lane C3's `cards-queries.ts`). |
| **The page's speed** (P-14, kept) | — | First byte 56 ms (median of five warm loads), the whole page ~0.37 s — unchanged by this lane. |

## ▲ Decisions for him

1. **An Owner's Pulse drops *Leads this week* and *Coming in · 30 days*** (the option shows four). The new leads are the greeting's news and the
   Pipeline card's New; the money due is Reports › Finance › Cash flow (and Accounting's Pulse keeps Coming in). The roles whose page is the
   leads (Manager, Marketing, Designer) keep *Leads this week* / *My leads*.
2. **The comparison left the card's face** (the option's cards carry none): "▲ 1 vs the 90 days before" is now the breakdown's title and the
   figure's accessible name. Say if one figure should keep it on its face.
3. **First response's target is the report's own Fast band, 8 hours** — the option's "Target 4h" names a number the studio never set. The
   caption is red only past a day (the report's Slow); between 8 hours and a day it stays secondary, as the report calls it OK.
4. **You owe's overdue is red** — by the same rule that makes Owed to you amber (a supplier waiting on the studio is ours and late).
5. **Pulse is two across on an upright tablet** (the first pass drew three across for six figures; four read 2 + 2, the house tile row's own rule).
6. **The title is 28 bold**, not semibold (the house has no 28 semibold token).
7. **The news list's title is "New since Friday"** (was "Since you were last here — since Friday": the "since" twice).
8. **Reset prototype to base stays in Maison AI** (lane C4's ▲: on the Dashboard it is now one step deeper — the field, +, Reset). Not added to
   the page's ⋮: that menu is *Cards on your page*, one subject; the reset is Maison AI's everywhere else in the app. Say if the demo wants it
   one press away on the Dashboard — a row at the foot of that ⋮ ("Reset prototype to base", the sheet's own words) is the smallest place.
9. **One clock, with two exceptions** (the coordinator's note 3, done): the page's today is now the studio's day; *Leads this week* stays the
   Leads listing's own window and the contractors' line Workload's own day (both the server's clock — one number with their homes). On a
   server in Singapore all are one; elsewhere they differ only in the hours between the two midnights. The lasting fix is a studio time zone
   every "today" in the app reads — the developers' deployment decides.

## Shared pieces changed

- `components/om/stat-tile.tsx` · `.module.css` — **additive**: `look="card"` (white card, `--stat-tile-pad`, value 28 / 24 / 20, caption +
  line on one row, a wordless thin age bar), `spark` (`StatTileSpark`: values · label · ahead · target), an age band's `tone` (`StatTileAging`).
  Without them a tile's DOM is unchanged (the non-card branch renders the same elements and attributes; `data-tone` / `data-look` are absent) and
  the new rules are scoped to `[data-look='card']`, `[data-tone]` and new classes. **Checked against a build of the WIP base** (the base's
  source checked out, built and served on a copy of the same DB, then this lane's patch put back byte for byte): the 16 tile pages (Reports ›
  Leads · Sales · Finance AR · Health · Projects, Projects, a project's Money and Overview, an X-Ray record, Qanvast Ops › Studios, Company ›
  Plan, Finance › To do, Leads, Tasks, Settings, Tools › Quotes) at 1440 and at 390 touch, top and scrolled: **62 of 64 identical**, the two
  others 6 and 16 pixels in the search box's "/" keycap (Tasks, Tools › Quotes — the same keycap the first pass found differing between two
  loads of the base itself). **The CSS load-order scan** (`responsive-all/css-order-scan.cjs`, 107 routes at 1440, base vs this build) found
  ONE real flip this lane's added CSS caused by re-splitting the chunks: Finance › To do's *Recently* amount (`money.num` vs
  `todo.recentAmount`, font-variant-numeric) — fixed order-proof in `components/finance/todo/todo.module.css` (`.recentAmount.recentAmount`,
  the rule that always won keeps winning); after it: 0 flips, 8 pairs held by stronger rules, 0 new pairs. The merged landing build re-splits
  again — run the scan there too.
- `components/finance/todo/todo.module.css` — the one order-proof doubling above (no visible change: it keeps the base's winner).
- `lib/dashboard/frame.ts` `CARD_LABEL.team` = "Team load" (read by lane C3's card frame for its ⋮'s name) — the coordinator's note 2, done.
- `lib/dashboard/context.ts` — the page's today by the studio's clock (above).
- `components/dashboard/cards/card-ghosts.tsx` (lane C3's) — the three ghost fits above, each commented "(the calm pass — lane C1 …)".
- `lib/dashboard/since.ts` `SinceChip.count` (optional) and `sinceLinkOf` · `chipCount`; `since-queries.ts` sets the counts.
- Probes, each change commented "(the calm pass 2026-10-26, a deliberate change)": `verify-pm2-s22.cjs` (§ 2 the day line read with any space
  before its dot; § 6 and § 7 an Owner's and an Admin's four; Leads this week off an Owner's page), `verify-pm2-s45a.cjs` (§ 5 the Owner's /
  Admin's labels), `verify-pm2-s43b.cjs` (Profit names its month), `verify-pm2-s41b1.cjs` (no Profit figure for Accounting, by its new name).
  Pulse's grid keeps its class name `pulseTiles` (s46b counts the ghost's figures by it).

## For other lanes and the landing

- **C3 (the cards)** — `card-ghosts.tsx` is wired (C3's handoff patch was written against the first pass's ghost, so its effect was made by
  hand: the five cards import from `./cards/card-ghosts`, `PipelineGhost quietDoor={runs}`), with the three fits above. Left for C3 / the
  landing: `ProjectsGhost` draws "Show n more" for a desk only — a phone with five projects shows it and the ghost doesn't (the demo has four).
- **C2 (Needs you)** — the greeting's "51 things need you" is `data.needs.rows.length` (as before); a Since piece that waits in Needs you finds its
  row by `[data-inbox-row]` with the record's id inside the key (unchanged) and pulses it. Needs you's ghost lives in `dashboard-ghost.tsx`
  (`NeedsGhost`) on your classes and the house Row's, reading `INBOX_SHOWN` / `INBOX_SHOWN_PHONE` — rename a class there and the ghost follows
  (its words are the demo's own: `NEEDS_TITLES` · `NEEDS_CAPTIONS` · `NEEDS_AMOUNTS` · `NEEDS_VERB_W`).
- **C4 (Maison AI's pill)** — your three notes are done: the foot is the page's own 24 from 768 (`--fab-clearance` on a phone; no
  `--dash-dock-clearance`), the dashboard body is `--om-color-surface-bg` (`--dash-surface` carries it if your band wants the variable), and the
  ghost places your `MaisonDockGhost` as the body's last child (it replaces this lane's own pill bone). Reset prototype to base: ▲ 8.
- **The landing** — apply `c1-on-main.patch` on main (it holds only this lane's changes); `dash-d1` § 8 now asserts every region within 6 px
  for Dane at 1440 and 390. Run the CSS order scan on the merged build (before = the WIP base) — this lane's scan was of its own build.

## Tallies

On the final production build of the whole page (this lane + C2 · C3 · C4, :3251), each probe on its own fresh copy of the fresh demo base,
through `design-source/verify/regression/run.cjs` (`RUN_DIR=…/calm-build/C1/reg`):

| Probe | Result | Note |
|---|---|---|
| `dash-d1` (this lane, restated) | **182 / 182** | every role, every width, the calm measure, § 8 every region within 6 px for Dane (all 0 px at 1440 and 390), first byte 78 ms |
| `dash-d2` · `dash-d3` · `dash-d4` | **149 / 149** · **186 / 186** · **109 / 109** | the other lanes' own, on the merged page — dash-d2's head count read restated (below) |
| `pm2-s22` · `pm2-s45a` · `pm2-s45b` | **110 / 110** · **158 / 158** · **72 / 72** | s22 and s45a restated by this lane (and s22 by C2 · C3) |
| `pm2-s46b` · `pm2-s46c` | **80 / 80** · **96 / 96** | |
| `pm2-s41b1` · `pm2-s43a` · `pm2-s43b` | **110 / 110** · **43 / 43** · **70 / 70** | s41b1 and s43b restated (an Admin's three figures without costs; Profit names its month) |
| `ghosts-same` · `ghosts-same-390` | **76 / 76** · **76 / 76** | the loader and the reveal one ghost, every route |

**One probe line of another lane's, restated here because the merge broke it:** `verify-dash-d2.cjs` read Needs you's count from the first
`__meta` in the card — with C3's frame that is a row's amount ("Show all 5530"); it now reads the frame's `needs-count` (commented "(the calm
pass 2026-10-26, a deliberate change — at the landing with lane C3's frame)"; in `c1-on-main.patch`).

**The calm measure** (`busy.cjs`, the first screen at 1440, the whole page as it stands with every lane): **337 words · 34 boxed · 64 controls · 13
sizes · 6 text colours · 11 tints · 4 capitals · 6 regions** (the first pass: 506 · 43 · 77 · 13 · 8 · 14 · 13 · 8). This lane's regions, measured
by `dash-d1` § 7b: the greeting 19 words · 2 boxes · 4 controls · 5 sizes · 3 inks · no capitals; Pulse 52 words · 6 boxes (four cards, Owed's
bar) · 4 controls · 3 sizes · 3 inks · capitals only on its four labels; no border or shadow on either.

`npx tsc --noEmit` clean · `npx eslint` clean on every file of this lane · `npm run design:lint` "nothing new breaks a house rule" (no
baseline raised) · `design:anatomy` on the merged build "all 1971 measures hold" (90 pages). StatTile pages 62 / 64 identical to the base
(the two: the "/" keycap), the CSS order scan 0 flips after the one fix. Shots banked in `design-source/verify/dashboard-2026-10-26/c1/`.

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — the Claude Design option is the desk's spec; the six corrections over it; every invented word a row in `reg-c1.md`.
2. **One system** — the DS SegmentedButton and Link, the house StatTile (additive), PortalMenu + DropdownItem (the sheet on a phone), the ghost kit; `--om-*` tokens only (`design:lint` clean).
3. **Plain words** — "51 things need you", "5 new since Friday", "2 of 30 leads · 7% win rate", "S$ 22.1K over 60 days", "costs not in yet on 2 projects".
4. **Nothing is lost** — the comparison, the grade and Early moved into the breakdown and the names; the Since chips into one link and one list; Hide and Show all cards kept.
5. **Say why** — Profit says why it is early in its words; First response's red says Slow; the target is the report's own.
6. **Back returns** — every door keeps `?from=/dashboard`.
7. **Every screen is whole** — the ghost on the grey page, loader = reveal, the greeting and Pulse to the pixel.
8. **Every width** — one row / two across by width, no sideways scroll at 320 or 844 × 390, 14 captions and 44 targets on touch.
9. **Tables follow the listing** — no table in this lane's regions.
10. **Motion with purpose** — the house menu and sheet; the row pulse is the house fresh pulse; nothing new moves.
11. **Honest data** — every figure its report's own (the doors assert it); the line passes over a week with nothing to measure instead of drawing a nought.
12. **Reach for everyone** — ↓ on a focused figure, the track's radio keys, the link's name says where it goes, 44 on touch.
