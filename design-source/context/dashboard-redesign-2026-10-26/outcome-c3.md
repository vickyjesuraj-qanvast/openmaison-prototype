# The Dashboard, calmer — lane C3's outcome (2026-10-26)

**Lane:** C3 — the shared card head (`card-frame.tsx`) and the five cards as the Claude Design option draws them (Your day · On site · Pipeline ·
Projects · Team load), with his six corrections (`brief-calm.md` § 2) — and § 2.5's new stuck rule. **Built:** all of it. Nothing committed (the
WIP base is the lane's only commit). Lane: port 3253, `…/scratchpad/calm-build/C3/lane.db`; shots `…/calm-build/C3/shots/` (`v6-*` / `r-*` every
width and role, `ghost-1440.png` the held reveal, `d3/` the probe's).

## 1 · The ledger

| Brief item | State | Where · why |
| --- | --- | --- |
| **The card** — white, no border, no shadow, 8 round, 24 inside | built | `card-frame.tsx` draws its own `<section>` (the house Overview card's border, caption title and 48 head are gone); the page's padding `var(--dash-card-pad, 24px)` (C1's property, the desk's 24 until it lands) on the card's top and bottom, the head's sides and — `inset`, true by default — the body's sides; **Needs you's body takes none** (`inset` false for `card="needs"`: lane C2 pads its own, its rows keeping 8 for their wash), so C2's merged inbox needs no change; radius 8 (correction 6, not the option's 16) |
| **The head** — title (sentence case) + count + ONE right slot | built | `h2` 20 semibold, the count after it in the secondary ink at the same size (`meta` — a first-pass "· 51" reads "51"), the slot = `legend` (C2's tabs, the week, "19 open", "4 running · 2 late", "projects / capacity", "All 5 photos"). The head never wraps at a desk: **the slot shrinks** (`min-width: 0`; a fact ellipsises, C2's tabs scroll in their rail) and the title never gives way (the orchestrator's ask 1, C2's landing); a card too narrow for both (under 300 inside — and Your day's week under 520) puts the slot on the next line, under the title |
| **✦ Ask / Hide this card on hover · focus; one ⋮ on touch** | built | **at the head's end, after the slot** (the orchestrator's ask 2): at a desk the ✦ (the Maison AI mark as the house bare 24 icon button, its words — "Ask Maison AI about pipeline" — in the tooltip and its label) and the ⋮, **holding their room at rest** (opacity 0) so the slot never moves when they appear — on the card's hover, the keyboard's focus in its head, or the menu open; under a finger (`TOUCH_TABLET`, REG-307) one ⋮ in the same place holds **Ask Maison AI** (`askAbout(card)`) and **Hide this card**; Needs you's holds Ask only (it can't be hidden). Desk ⋮: Hide this card (help line kept). The room is the same in every head, so the facts line up down the right column and with Needs you's verbs |
| **Your day** — the week in the head, today TINTED | built | `your-day-card.tsx`: seven days from today in the head's slot (`wide`), the shown day on `--om-color-primary-variant` with its words in the primary (never a block), today's number in the primary, dots `--tone-2`; a narrow card (a phone, a tablet's act column) gives the week its own row, the days spread; seven 44 targets fit from 390 with the card's 24, the rail scrolls only where they can't (320) |
| …a time column, tick circles / dots, title + one caption | built | `.when` 88 wide: "10:00 AM" · "by 4:30 PM" · "5 days late" (red); `AgendaItem.when` (new) in `cards-queries.ts`; tick = the house bare IconButton (the Tasks tab's `setTasksDone` / Undo, unchanged); a dot `--tone-4` for a meeting or Hangout, grey for a milestone or money due; the caption = where · with whom · length ("SkyOasis @ Dawson · with Germaine · 45 min"), Hangouts "· until 7:00 PM"; a narrow card drops the column and leads the caption with the time |
| …one action at most | built | Call outlined with its glyph (a phone: its glyph button, 44) on a call; **Directions** as the house text link on a meeting or a Hangout with a place; WhatsApp and Prepare me in the row's ⋮ (hover / focus at a desk, always under a finger); the rows keep a column for the ⋮ when any has one, so Call and Directions line up — and line up with Needs you's verbs, which keep the same gutter in the option |
| …the count, not the ring | built | "Your day 3" = what is still ahead on the day shown (`leftOf`: not ticked, not held, not over); the tick lowers it, Undo restores it; the ring is gone (correction 4). `day-ring.tsx` stays for Needs you's *All caught up* |
| **On site** — large photos with captions, "All photos" | built | `on-site-card.tsx`: one row at rest — three across, 4 : 3, 8 round (two on a phone) —; an update's photos side by side under ONE caption ("Kitchen cabinets are in · Benjamin Han · 21 Oct": the update's title, the client, "today" · "yesterday" · its date — never a bare weekday, L3's rule) clamped to two lines; "All {n} photos" in the head shows the rest **in place** ("Show fewer" folds) — there is no studio-wide page of photos to open (§ 2 ▲10); `fetchSite` now returns up to `SITE_MAX` 24 with each photo's update, title, client and day |
| **Pipeline** — tones toward Won, the foot line | built | `pipeline-card.tsx`: label · 10px bar on the surface-bg track · count, bars `--tone-1…5` (lavender → the primary's deep hover ink at Won — the option's dark purple, deeper than a button's fill, so the page's "no filled primary" check still holds; a data mark, § 2.1); head "19 open" (New → Quote sent, the bars drawn); a 6px amber dot before the count only on a stage holding a stuck lead (tooltip: "6 stuck — over 14 days in Contacted"; the row's label says it too); foot "14 stuck · 12 going quiet" — "n stuck" only when n > 0, going quiet the house text link to Sales for an Owner / Admin, words for anyone else |
| **…the new stuck rule** (§ 2.5) + its pure check | built | pure `stageStays` · `stuckRuleOf` · `isStuck` · `stuckWords` in `lib/dashboard/cards.ts`; the reader `fetchStuckRule()` in `cards-queries.ts` (every live lead's stage logs, oldest first); a stay counted by Reports › Leads' own `countedMs`, its middle by `median` (lib/leads/tat.ts — one rule with the report); stuck = calendar days in stage (the listing's In stage) > max(14, ⌈2 × median⌉); fewer than five finished stays (Sales' `MIN_CLOSED`) = no pace yet, 30 days. Pure checks in `dash-d3-health-pure.mts` (stays, the floor, a slow stage, no pace, the boundary, each stage by its own pace, the words); the browser probe recomputes the rule from the records apart from the app's code |
| **Projects** — two lines + bar, state word, full names | built | `projects-card.tsx`: the project's own name (14 medium, ellipsis + the house `Tooltip whenCut` at a desk, two lines on a narrow card — no hover under a finger) · the state word at the right (**Late** red, *At risk* amber, *On track* · *Starts 4 Nov* · *Setting up* · *On hold* secondary) · a 4px full-width bar (`--tone-4`, grey on hold) · "43% · AquaFlow Plumbing Works's bill AF-7781 14 days overdue"; `HealthRead.fact` (new, `health.ts`) = the first reason in short words, capitalised; the full reasons in the tooltip and the row's label; head "4 running · 2 late" (`projectsHead`, a quiet door to the listing) |
| **Team load** — segmented capacity, "Full" / "2/3", the contractors' foot | built | `team-card.tsx` (title "Team load"): no avatars; name over "n open leads" (· closed to new leads); `loadOf` — one segment per project they can carry, filled for each (the darkest tone when full), past capacity amber (never red); "Full" · "2/3" · "1 over" (Workload's words); eight segments at most. Foot under a rule: "Contractors · 4 free this week · 1 over capacity" + **View** (the house text link → Workload › Contractors, or Finance › Vendors with none) |
| **No filled buttons; Call outlined** | built | the only verbs: Call (DS secondary outlined), the ✦ Ask (secondary text), text links; the probe: no control with a filled primary background, no `data-appearance="filled"` in the five cards |
| `components/dashboard/after-call.tsx` | kept | unchanged — Your day still remembers a Call / WhatsApp and offers *Log the call* on return (the WhatsApp now pressed from the row's ⋮) |
| the ghost (for C1) | built, not wired | `card-ghosts.tsx` — `CardGhost` · `DayGhost` · `PipelineGhost({ quietDoor })` · `ProjectsGhost` · `TeamGhost` · `SiteGhost` on the cards' own classes (a phone's two tiles, its time-led captions, its "Show n more", a finger's ⋮ and 44 links drawn as the page draws them); wired into the page's ghost in a scratch build only (C1's file, reverted): in the held reveal at 1440 every stage, project and member row lands **0 px** from the page's (`ghost.cjs`), and **`verify-dash-d1` goes 141 / 141** with it (its "each region as tall as the page's" at 1440 and 390 touch included — 138 / 141 without it). The wiring, lint-clean (it also drops the first pass's card-ghost helpers it no longer needs): `…/calm-build/C3/handoff-ghost.patch` |

## 2 · ▲ For Vicky

1. **The new stuck rule still marks 14 of the demo's 19 open leads** — not a loose rule but old records: the demo's open leads have sat 33–60 days
   while the studio's own pace is 1–4 days a stage (New 1.1 · Contacted 3 · Met 4), so the 14-day floor holds; Quote sent has three finished stays
   (under five) — no pace yet, 30 days, and its three have sat 55+. The marks sit on New · Contacted · Met · Quote sent because each holds one. Calmer
   on the demo needs fresher demo leads (a repair rule), not a looser rule — say if you want that.
2. **"No history yet" read as fewer than five finished stays** (Sales' own "fewer tell nothing", `MIN_CLOSED`), not zero — one 40-day stay would
   otherwise set an 80-day rule. Say if you want it literal.
3. **The pace is the studio's** (all its live leads), not each member's visible leads — a lead is stuck for everyone alike; what each member sees
   still decides what their card counts.
4. **"n stuck" is words, not a link** — the option draws it as one, but there is no list of stuck leads to open (the listing scopes one stage); the
   amber dots say where, each stage opens its listing.
5. **"19 open"** = New → Quote sent (the bars drawn). Sales' "open" also counts On Hold (21) — On Hold waits outside the bars, as it did.
6. **A project is its own name** ("HDB 5-Room — Benjamin Han", as its listing and page say it) — the option wrote "Benjamin Han · HDB 5-Rm". Say if
   you want the client first everywhere.
7. **Your day's week is seven days from today** (the first pass's), not the option's Mon–Sun with yesterday greyed — a Sunday morning would
   otherwise show one day ahead.
8. **The house clock** ("10:00 AM", "by 4:30 PM"), not the option's 24-hour "10:00", "by 16:30".
9. **One action on a row**: the site visit keeps **Directions** (the option drew none on it, Directions only on the Hangout); WhatsApp and Prepare me
   are one ⋮ away (hover / focus at a desk, always under a finger).
10. **On site's "All n photos" opens the rest in place** — there's no studio-wide photo page; it appears only when there are more than a row.
11. **The contractors' foot drops "1 starting with no contractor"** — that is Needs you's own `crew-gap` row (one place for each thing).
12. **"2 open leads", not the option's "2 leads"** — the figure is open leads; "2 leads" reads as every lead they ever had.
13. **Captions 12, rows 14, titles 20** at a desk (the tokens nearest the option's 13 · 15 · 18); five sizes and weights in the five cards
    (20/600 · 14/600 · 14/500 · 14/400 · 12/400).
14. **The ✦ and ⋮ hold their room at the head's end** (the landing's ask, so Needs you's tabs never move): every head's fact sits ~64 px in from
    the card's inner edge, in line down the right column and with Needs you's verbs, rather than flush right as the option draws it. The ✦ is
    the Maison AI mark alone (its words in the tooltip), not the first pass's "✦ Ask", to keep that room small.
15. **Won and a full load are the primary's deep hover ink**, not the button's primary — the option's dark purple, and the page's "no filled
    primary" stays true of every element.

## 3 · Shared pieces changed

- `lib/dashboard/health.ts` — `HealthRead.fact` (additive): each reason kept in full (`reasons`, `line` unchanged) and short.
- `lib/dashboard/cards.ts` — `AgendaItem.when` (new), `sub` · `lateWords` gone (their words are the time column and the caption now);
  `PipelineData.open` (new), `stuckDays` gone (each stage carries `rule`); `ProjectLine.state · caption · captionFull`, `ProjectsData.late`;
  `SitePhoto.update · title · where · when · photos`; `contractorsWords(k)` (one argument); new `leftOf` · `projectsHead` · `loadOf` · `siteGroups`
  · the stuck rule; `SITE_SHOWN` 6 → 3 (+ `SITE_SHOWN_PHONE` 2, `SITE_MAX` 24). `ringWords` · `loadScale` · `STUCK_DAYS` kept for their readers.
- `lib/dashboard/cards-queries.ts` — `fetchStuckRule()` (exported), the readers above. No migration, no repair rule, no new icon.
- `components/dashboard/cards/card-frame.tsx` — props kept (`card · title · meta · legend · testId`); new optional `wide` (the slot's own row on a
  narrow card) and `inset` (the body's side padding — false by default for `needs`). `card-ghosts.tsx` new.
- No house piece edited (`components/om/*`, the DS, ChipRail, Tooltip, PortalMenu, DropdownItem, IconButton are composed).
- Probes: `verify-dash-d3.cjs` restated + § 10; `dash-d3-health-pure.mts` extended (60); `verify-pm2-s45b.cjs`'s Dashboard check reads the new
  foot and `verify-pm2-s22.cjs` reads the frame's count and a task's caption (each marked "(the calm pass 2026-10-26, a deliberate change)").
  Shots banked: `design-source/verify/dashboard-2026-10-26/c3-shots/` (10).

## 4 · For other lanes

- **C1 (page, ghost):** the cards read `--dash-card-pad` (fallback 24) and draw their own white surface — no wrapper card needed. The page's
  ghost still draws the first pass's cards on classes that are gone (`ringLine` · `legend` · `legendTick` · `lead` · `time` · `timeSub` · `verbs` ·
  `healthDot` · `loadFill` · `loadMark` · `nobodyMark` · `crewIcon` · `crewChevron` · `moreBody` · `footLink`): swap in `card-ghosts.tsx` (the
  patch above does it — 0 px at 1440, `verify-dash-d1` 141 / 141 with it; pass `quietDoor={runs}` to the Pipeline's). Your `verify-dash-d1`
  § 2 "no filled primary" holds with the calm marks (the deepest tone is the primary's hover ink). The patch draws the five cards only — Needs
  you's ghost (`GhostCard` in your file) still draws the old head and a body inset. `CARD_LABEL.team` says "Team"; the card's title is now "Team
  load" (the option's) — the hide snackbar and Cards on your page would read better as "Team load". **`ctx.today` is the machine's day while the greeting is the studio's** (`STUDIO_TZ`): on a
  server outside Singapore, late in the evening, the greeting says Tuesday while Your day's today is Monday (seen on this machine, IST).
- **C2 (Needs you, merged):** checked against your merged files (copied into a scratch build of this lane, then put back): `CardFrame card="needs"
  meta={count} legend={tabs}` works as is — the frame gives Needs you's body **no inset** (`inset` defaults to false for `needs`), so your `.body.body`
  inset stands and your rows sit under the title (both at 24); the tabs shrink, the ✦ sits after them holding its room (they never move); under a
  finger the head's ⋮ holds *Ask Maison AI*; at ≤767 (your tabs in the body) the head is "Needs you 53 ⋮". Your day's row ⋮ is a 24 in a 28
  column, so its Call / Directions end where your verbs end at a desk (40 in from the card's inner edge).
- **C4 (Maison AI):** Prepare me is in Your day's row ⋮ now: `day-row-menu` → `day-prepare` (`menuitem`); `verify-dash-d4.cjs` looks for a bare
  `day-prepare` and falls into its "(no Prepare me here)" branch — restate it to open the ⋮ first. `askAbout` keys unchanged; the touch ⋮'s *Ask
  Maison AI* calls `askAbout(card)`.

## 5 · Verified

- **Probe `verify-dash-d3.cjs`: 186 / 186** on the final build at :3253, run directly on the lane DB at 00:45 (184 / 184 at 23:40 the evening
  before — a run late in the day puts the two meetings on tomorrow morning and presses them there; Directions opens the map, Prepare me reaches
  Maison AI by name). § 10: white · no border · no shadow · 8; titles 20 semibold in sentence case; the ✦ and ⋮ after the slot, at opacity 0 at
  rest, 1 on hover and on keyboard focus, the slot not moving by a pixel when they show; the desk ⋮ = Hide; ✦ → the dock's chip; under a finger no
  ✦, one ⋮ at the head's end holding Ask Maison AI · Hide this card, its Ask reaching the dock.
- **The busy measure, the five cards at rest at 1440** (Dane, whole cards — not only the first screen; icon glyphs aren't words): 193 words ·
  **1 box** (the day shown) · 34 controls · **5 type sizes / weights** (20/600 · 14/600 · 14/500 · 14/400 · 12/400) · **4 text colours** (the
  two inks, the primary for a door and today's date, red for ours and late) · **0 uppercase** · **1 tint**. (The first pass's five cards had a
  hairline box on every day, a caption-capitals title on every head, a ring, avatars, dots before every project, a load tick, two verbs a row.)
- **With lane C2's merged Needs you** (its five files copied into a scratch build of this lane, then put back): the head and the rows line up, the
  tabs hold still, no sideways scroll at 1440 · 1024 touch · 390 · 320 (`…/C3/shots/x-*`, banked as `c3-shots/calm-1440-with-needs-you.png`).
- Every width looked at by eye on a grey page (C1's surface simulated for the look): 1440 · 1280 · 1024 sideways (touch) · 768 upright (touch) ·
  390 · 320 · 844×390 — no sideways scroll at any; as Dane, Germaine (Designer), James (Manager), Priya Tan (Accounting), Nurul Huda (Marketing).
- `npx tsc --noEmit` clean · `npx eslint components/dashboard lib/dashboard` clean · `npm run design:lint` "nothing new breaks a house rule".

## 6 · Tallies

Through the harness (`design-source/verify/regression/run.cjs`, RUN_DIR `…/calm-build/C3/reg`, `base.db` = the clean calm-build base, port 3253,
the final build):

| probe | result | note |
| --- | --- | --- |
| `dash-d3` | **186 / 186** (run directly on the final probe; the harness run before the last probe edit: 184 / 185 — its "…at the head's end" measured the head's box, which now carries the card's side padding; restated to the content edge) | green |
| `pm2-s45b` | **72 / 72** | green — the contractors' foot (restated) |
| `pm2-s22` | **110 / 110** | green — the count read from the frame's `needs-count`, a task's caption is where (restated) |
| `pj-r1` | **98 / 98** | green — the project Overview untouched |
| `dash-d2` | **111 / 111** | green (the WIP base's Needs you; its "no filled primary" holds with the marks' deep tone) |
| `dash-d1` | **141 / 141 with the ghost patch** (build 7) · 138 / 141 without (build 5) | the three without: "each region as tall as the page's" at 1440 and 390 (C1's ghost draws the first pass's cards — the patch's job) and § 2's "no filled primary" (the Won bar and a full load were the button's primary then; the deep tone since) |
| `dash-d4` | 25 / 26 — stops at its "a figure asks its own question" | **not this lane's**: after midnight the *What are my tasks today?* figure answers long, so it opens the pane, not a thread entry, and the probe waits for a thread entry (reproduced: `…/C3/d4dbg.cjs`). The same probe at 23:30 on this lane passed that step; its § 2 checks (which the first-pass marks failed) pass |
| `pm2-s42a` | 86 / 88, run directly (its REPO resolves outside the harness copy) | the two reds are the demo-day restore's ("every planned moment keeps its whole 40 days and its hour", "R125 run again moves nothing") at 00:50 — no file of this lane's; the checks lane D3 moved (On site shows the week's update, Your day quiet, the ghost's quiet week) green |

Not run: the rest of the regression (no file of theirs is this lane's).

## 7 · Principles check

1. *The mock wins, exceptions written down* — the option is the desk's spec; every departure is a ▲ above and a REG-C3 row.
2. *One system* — DS Button, house IconButton, Tooltip (`whenCut`), PortalMenu + DropdownItem, ChipRail, the text link, the thumb; no copied stylesheet.
3. *Plain words* — "5 days late", "by 4:30 PM", "4 running · 2 late", "Full", "1 over", "14 stuck", never "(5d)" or "HDB 5-Rm".
4. *Nothing is lost* — every Build item stays (Ask, Hide, WhatsApp, Prepare me, the contractors' line), one hover or one ⋮ away; the tick has Undo.
5. *Say why* — the stuck dot's words name the stage's days and why; a project's state word leads, its reason under it, in full on hover.
6. *Back returns* — every door keeps `?from=/dashboard` (unchanged readers).
7. *Every screen is whole* — each card's empty words or no card (unchanged); a narrow head wraps its fact under its title, never off the card.
8. *Every width is designed* — the week's own row on a narrow card, the time in the caption, names in two lines where no hover can read them.
9. *Tables follow the listing* — no table here; the counts are the listings' own.
10. *Motion with purpose* — the tools' and a row ⋮'s fade (the hover's 50 ms), a photo's lift; reduced motion drops them.
11. *Honest data* — the stuck rule from the studio's own records, one rule with Reports › Leads; every figure its module's.
12. *Reach for everyone* — the tools are focusable and show on focus; under a finger every control is 44; colour never alone (the state word, the
    stuck words in the label).
