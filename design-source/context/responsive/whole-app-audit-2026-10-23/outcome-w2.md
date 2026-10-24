# Lane W2 — Leads and the day's work: the outcome (2026-10-23 → 24, overnight)

His ask: "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your recommendations" — every call
here is the recommendation; nothing committed. His rule kept: **the lead's page stays one page with its tab strip at every width** (REG-2734) —
no summary screen, no tab as a screen, no new level; this round fixes defects inside the layouts that exist. Built in the lane's worktree from
its WIP base (`dd4ad5ac`), verified on production builds on :3202 over scratch copies of the demo (`rwd-all/W2/lane.db`, the harness's copies
of `rwd-all/base.db`). The audit: `audit-w2.md`. The staged register rows: `reg-w2.md` (REG-W2.1 … W2.8). The probe:
`design-source/verify/responsive-all/verify-rwd-w2.cjs` (registered as `rwd-w2` in `design-source/verify/regression/probes.cjs`).

## 1. Ledger — every id in `audit-w2.md`

| id | sev. | built where · kept why · not done why |
| --- | --- | --- |
| **W2-01** a meeting's phone foot | major | **Built** — `components/meetings/room/meeting-room.tsx` (`phoneFoot`: `useMaisonAi(ask, phoneFoot)` raises the shell's button; `--bottom-dock` = the foot's measured height + 6 through a ResizeObserver, put back on leaving — the review banner's and the Quote screen's offset, REG-302 / P-01) · `room.module.css` (≤767: the corner reservation gone, `flex-wrap: wrap`, the moves `flex: 1 1 0; min-width: max-content` — halves where both fit, a row each where not; the tablet keeps its corner, C-08). 320: both moves full width, the button above the foot; 390: halves (173 each), the button 32 above. |
| **W2-02** MY TASKS cut at 1280 | minor | **Built** — `components/leads/detail/my-work-card.module.css`: the ≤1024 wrap rule now `@media (max-width: 1439px)`. 1440 untouched (measured one line, byte-identical). |
| **W2-03** the tablet Members cell | minor | **Built** — `components/leads/table.tsx` `TABLET_WIDTHS.assignees` 144. **Paired change for W1**: the tablet ghost's Members column in `components/shell/skeleton.tsx` (§4). |
| **W2-04** /tasks' to-do chips on a phone | major | **Built** — `components/leads/tasks/tasks-toolbar.module.css` (≤767: `.scopeWrap:has(> .todos) { display: contents }`, the tools `margin-left: auto`, `.todos { order: 3; flex: 1 0 100%; flex-wrap: wrap }`, hidden while the search has the row) · `tasks-toolbar.tsx` (`compact || sheet` — the phone's chips keep their glyph + count and their tooltip). The ghost (`components/leads/detail/tab-ghosts.tsx`, same classes) follows — probed (the held reveal, ±4). ▲ |
| **W2-05** the imports' search | minor | **Built** — `app/leads/imports/imports.module.css` (`.search input { font: body-l }` on a phone and a touch tablet). |
| **W2-06** a task card's lead | minor | **Not done — For Vicky.** L4 drew it 24; the card's lines stand 4 apart, so a 44 target grows each card by 20 or reaches over the name and the due line (built, then taken out: it took their taps). |
| **W2-07** Meetings' lead · a tablet row's name | minor | **Built** — `components/meetings/meetings-table.module.css` (`a.leadLink` on touch, `button.title` on a touch tablet: `padding-block: 12px; margin-block: -12px` — the link ellipsises, so an overlay can't reach past its box; the card's 8 gap leaves a 4px overlap). |
| **W2-08** /tasks' For column | minor | **Built** — `components/leads/tasks/tasks-table.module.css` (`a.leadLink` on a touch ≤1024: REG-344's overlay, 12 above and below inside its 64 cell). |
| **W2-09** Qanvast Ops' copy glyph | minor | **Built** — `components/qanvast/qanvast-leads.module.css` (44 box, `margin: -15px`). |
| **W2-10** the 20-tall links | minor | **Built** — REG-344's invisible overlay (`position: relative` + `::after { inset: -12px 0 }`, on the `a` only, so a ghost's bar in the same class keeps its line): `components/hangouts/hangouts.module.css` (`a.nameLink` — a Hangout's name and a chat's lead —, `a.factLink`), `components/meetings/client/meeting-link-page.module.css` (`a.placeLink`; the public Hangout page composes it), `components/qanvast/account/account.module.css` (`a.leadLink`, `a.link`; `.sideLinks` 24 apart on touch so the two presses' targets meet). The first cut (padding + margin) grew the Chats cards by 24 where the name stands alone and moved two ghosts — `pm2-s27` caught it; replaced. |
| **W2-11** the viewer's strip | minor | **Built** — `components/leads/files/file-viewer.module.css` (`.stripList .stripItem` 48 on touch; the desk keeps the 36 it draws). |
| **W2-12** a phone held sideways | **blocker** | **Built** — `components/leads/assign-popover.module.css` (`max-height: min(440px, calc(100dvh - 32px))` — 440 wherever the screen is 472+ tall); `components/leads/tasks/lead-tasks.tsx` `anchorRect` and `components/leads/detail/task-panel-host.tsx` `assignPos` floored at 16 (REG-269's clamp — their top had gone to −70); the four Filters stylesheets (`components/leads/filters-modal.module.css`, `tasks/tasks-filters-modal.module.css` — also the Files tab's —, `quotes/quotes-filters-modal.module.css`, `contracts/contracts-filters-modal.module.css`) let the rail scroll up to 1024; `components/leads/menus.module.css` caps an anchored menu from its own top on a sideways phone (`PHONE_SIDEWAYS`, `--menu-top`), and `stage-dropdown.tsx` passes its placed top. ▲ (one design call below) |
| **W2-13** the Notes composer at 320 | minor | **Not done — For Vicky** (§2): three 44 tools, Save and the Maison AI corner don't fit a 288 row; the tools squeeze to 24 wide at 320 only. |
| **W2-17** the Deleted sheets on a sideways phone | minor | **Built** — `components/leads/deleted-sheet.module.css` (Deleted Leads) and `components/leads/files/deleted-files-sheet.module.css` (Deleted Files): `min-height: min(480px, calc(100dvh - 96px))` — REG-513's floor kept wherever the screen is 576+ tall (1440: 480, measured). |
| **W2-14** the info column's links | minor | **Built** — `components/leads/detail/info-column.module.css` (the overlay −14). |
| **W2-15** the task panel's lead | minor | **Built** — `components/leads/tasks/task-panel.module.css` (`a.leadLink`: REG-344's overlay, 14 above and below). |
| **W2-16** a Hangout's By designer table | major | **Built** — `components/hangouts/hangouts.module.css` (≤767: `.byTable { overflow-x: auto }`, the desk's tracks, `min-width: max-content`). The ghost (`hangout-ghost.tsx`, same classes) follows. |
| **B-06** | — | **Held for him** (brief §2) — untouched. |
| K-1 … K-14 | — | Kept, each with its reason (`audit-w2.md` › Found, and not fixed here): REG-365 / REG-379's info-column glyphs, hover-only parked actions, the house pill's overlay, REG-306, the mock's kanban rail, scrolled rows, the imports heads, the house FAB tuck, the desk dialogs on a sideways phone, his tab-strip rule, the Reviews header at 320, the 1024 table claim, the tag picker, the house key chip. |

## 2. ▲ Decisions to show him

- **W2-06 · W2-13 — two small presses left as drawn**: the task card's lead link (24) and the Notes composer's tools at 320 (24 wide) —
  each needs a layout call (a taller card, or a raised Maison AI button / a folded tool).
- **W2-04 — /tasks on a phone: the to-do chips now stand on a line of their own** under "All Tasks ▾" and the tools (they scrolled in a
  14–82px gap beside the pill). It is the Quotes tab's and the listing's phone pattern; the toolbar's own row stays one row (REG-354).
- **W2-01 — a meeting's phone foot**: the Maison AI button now rests above the foot (as on the Quote screen) instead of in its right corner;
  at 320 the two moves stack. The tablet keeps the corner.
- **W2-12 — a phone held sideways keeps the desk's anchored cards, capped to the screen** (the Assign card scrolls its members; a menu that
  opens low scrolls inside). The alternative — the phone's bottom sheets there, as PortalMenu already does (audit 2026-09-26, phone-12) — is
  a bigger change across the app's shared Dropdown; recommended for a later house round, not built.
- For his call (`audit-w2.md` K-9 · K-10 · K-11 · K-12 · W2-13): the desk's dialogs at 294 tall on a sideways phone; the lead's sticky head
  and tabs taking ~130 of 390 there; the Reviews title wrapping at 320; the tablet table's "all five on 1024" (40 short before, 56 after
  W2-03); the Notes composer's tools at 320.

## 3. Shared pieces changed

- `components/leads/menus.module.css` (the leads `Dropdown`'s and the stage menu's stylesheet — the app's shared Dropdown): one rule, only
  under `PHONE_SIDEWAYS` (`(max-width: 1024px) and (orientation: landscape) and (max-height: 500px)`); no other width reads it.
- `components/leads/assign-popover.module.css` (the Assign card, also used by a project's Tasks through `lead-tasks.tsx`): its cap is a
  no-op at 472+ tall.
- `components/leads/tasks/*` (the lead's Tasks, `/tasks` and a project's Tasks): the floor, the chips' line, the For link.
- `components/hangouts/**` names no lane in the brief; it serves only W2's routes (Qanvast Ops › Hangouts, the public Hangout page), so W2 took
  it (W2-10, W2-16).
- `design-source/verify/regression/probes.cjs`: `rwd-w2` added at the end, and `pm2-s27` (Hangouts + the public profiles — it reaches W2's
  `components/hangouts` and was not listed).

## 4. For other lanes (the exact fixes are in `audit-w2.md` › For other lanes)

- **W1** · `components/shell/skeleton.tsx` — the tablet listing ghost's Members column `128` → `144` (head and rows), **paired with W2-03**.
- **W1** · `components/shell/shortcuts/shortcuts-layer.tsx` — keyboard tips appear on touch (tip only under `(hover: hover)` or
  `html[data-hw-keyboard]`); `dom.ts` `wordsOf` reads an icon's ligature into the tip ("for Stage: Metkeyboard_arrow_down.").
- **W1** · `app/globals.css` REG-306 — add the sideways phone to the 16px typing rule (iOS zooms at 844×390).
- **W1** · `components/om/scope-pill.module.css` — the touch overlay is 42 (inset −4 on the padding box): −5.
- **W1** · `components/om/filters-modal.module.css` — one house line for the rail's scroll ≤1024 (Projects' Filters, W3, has the same dead
  end on a sideways phone; W2's four lines then go).
- **W1** · `components/om/crumbs.module.css` — the L2 crumbs are 15 tall under a finger (tablet, sideways phone).
- **W1** · the standalone `a` text links (REG-344 lifts `button` links only) — a house option would retire W2's per-module lines.
- **W3** · `/chat` and `/tickets` are W2's routes on W3's components (`components/projects/{messages,tickets}`): no defect found there beyond
  the house ones (the composer types at 14 — REG-306 on iOS ≤767; the sideways phone with W1's fix).

## 5. The 1440 comparison

The base build (the WIP base) and the final build, back to back, each on its own fresh copy of the same scratch DB, at 1440×1024 with a mouse
(`rwd-all/W2/cmp.sh`, `diff.cjs` — every RGB byte): **63 of 63 identical** — 31 lane pages full-length (the listing, kanban, imports, Kevin
Ng's Overview + every tab + the viewer, a New lead, `/tasks`, `/tickets`, `/chat`, the Dashboard, `/meetings`, a planned and a held meeting,
the client's meeting link, every Qanvast Ops page, a Hangout, the public Hangout page and a booking) and 32 opened states (the listing's Assign,
Filters + its Date pane, scope and stage menus, a hovered row, Deleted Leads; Deleted Files; the lead's stage menu; the Tasks tab's Assign and
Filters; `/tasks`' Filters, scope, Assign and task panel; the meeting pages; the viewer; the Qanvast pages; Notes; the Dashboard). The final
pass showed two differences that are capture noise, not the change: a task panel whose list had scrolled one row on opening (base run only)
and one colour step in 34 pixels of the house rail's Maison AI tile; both re-captured on both builds — identical (the same state captured twice
on one build is identical too). Every rule W2 added after the first full pass is inside a touch, ≤1024 or sideways-phone query.

## 6. Verification and tallies

- **Defects:** 17 found in the lane (1 blocker · 3 major · 13 minor) — **15 built**, 2 for him (W2-06, W2-13); B-06 held; 14 sweep / opener
  reports kept with their reasons; 7 hand-offs to W1, 1 note to W3.
- **The probe** `verify-rwd-w2.cjs` (A–J, real taps; the presses' targets hit-tested, never a measured pseudo box): **76 / 76** on the final
  build (lane DB and the harness on a fresh restore); **30 / 76 on the base build** — it fails on every fix (each check names what it measured).
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three known quote-editor errors (0 new) · `npm run design:lint`
  holds (every count at its baseline, icon-button-overlay 2) · `npm run design:anatomy` on the final build: 90 pages, **1971 measures hold** ·
  the production build green.
- 320 and 844×390: no lane page scrolls sideways (27 routes, probed).
- Shots: `design-source/verify/responsive-all/rwd-w2/` (after, and `before-*` from the base build) — the sideways Assign card, Filters and
  stage menu, the meeting foot at 390 and 320, `/tasks`' chips at 320, a Hangout's By designer table at 390.

## 7. The regression run

The harness (`design-source/verify/regression/run.cjs` on :3202, each probe on its own copy of the run's `base.db`):

- **Run 1** (RUN_DIR `rwd-all/W2/reg`, `base.db` = the lane's restore of 2026-10-23 23:42; 29 probes): **27 clean** — rwd-w2 · rl-fixes 22 ·
  rl-l3 102 · rl-l4 97 · rl-l2 84 · pm2-s05 114 · ux-p1 81 · ux-p2 73 · ux-p3 91 · dane-p1 47 · p2a 54 · p2b 56 · p3 70 · p4 37 · p5a 59 ·
  p5b 56 · ke 31 · kb-r1 35 · kb-r2 29 · search 27 · overlays 67 · ghosts-same 76 · ghosts-same-390 76 · pm2-s23 148 · pm2-s43e 46 ·
  pm2-s42g 40 · pm2-s17 130. **pm2-s42e and pm2-s43b stopped** on the Marina Bay Hangout's Start: the copy's demo day was the 23rd and the
  clock had passed midnight, so the Hangout had ended (the restore's `starts_on` read the 23rd; a fresh restore moves it to the 24th).
- **Run 2** (RUN_DIR `reg2`, `base.db` = a fresh `restore-baseline` into a scratch copy — today's demo day): **pm2-s42e 65 / 0 · pm2-s43b
  70 / 0** (the date, confirmed), rl-l3 102 / 0 and rl-l4 97 / 0 after W2-17, rwd-w2 clean — and **pm2-s27 148 / 7**: W2's first cut of
  W2-10 (padding on a Hangout chat's lead link) grew the Chats cards by 24 and moved two ghosts. The same probe on the base build: 155 / 0.
  Replaced by REG-344's invisible overlay on the `a` (the boxes unchanged).
- **Run 3** (the final build, a fresh restore, RUN_DIR `reg5`): **rwd-w2 76 / 76 · pm2-s27 155 / 155 · pm2-s23 148 / 148.**
- `pm2-s27` (Hangouts + public profiles) was not in `probes.cjs`; W2 reaches it, so it is registered now.

## 8. Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — no mocked size, word or layout changed; every fix is a box, a scroll or a placement; the two visible phone changes
   (W2-04, W2-01) are flagged ▲ and follow patterns already in the app.
2. **One system** — house pieces only: the house offset (`--bottom-dock`, `useMaisonAi` raised), the house clamp (REG-269), the listing's
   copy-glyph rule, the Quotes tab's to-do line; no copied stylesheet, no hand-rolled head / foot / menu.
3. **Plain words** — no word changed.
4. **Nothing is lost** — every control the defects hid (Assign, the Filters' groups, the to-do chips, a move in the foot) is back on screen.
5. **Say why** — no refusal changed.
6. **Back returns where you came from** — untouched (the probe's link taps keep `?from=`).
7. **Every screen is whole** — the ghosts follow the changed toolbars (same classes); W1 holds the tablet listing ghost's column (paired).
8. **Every width is designed** — 320 · 390 · 768 · 1024 · 844×390 · 1280 looked at and fixed inside the two queries + the touch query; the
   1280 fix scoped below 1440; the sideways phone through the house's `PHONE_SIDEWAYS`; 1440 byte-identical.
9. **Tables follow the leads listing** — the Hangout's By designer table now scrolls in its own frame; the tablet Members column holds its
   content.
10. **Motion with purpose** — no motion changed.
11. **Honest data** — no data written; the probe puts back the two meeting links it sets.
12. **Reach for everyone** — 44 targets under a finger for every small press found; keyboard paths untouched.
