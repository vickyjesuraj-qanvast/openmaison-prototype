# Lane A — Activity by date, with a type icon on every row — the outcome (2026-10-24)

His message (2026-10-24, from feedback across the Activity tabs, with a shot of a lead's Activity at the desk): **"group the activities by date
and add type icons for the ones we have (Tasks · Files · Notes · Stage) to represent what type of activity it is."** The two pieces REG-245
took out of the mock (REG-190: the day groups under a rule with a centred date chip, a glyph per row) come back **on REG-245's timeline** — the
rail, the sentence as the link, the chips, the search all stay. Built in the lane's worktree on the WIP base `d2d3566a` (main's uncommitted state
with C1 landed), verified on production builds on :3213 over scratch copies of `rwd-calls/base.db`; nothing committed by the lane. Staged register
rows: `reg-a.md` (REG-A.1 … A.7). Probe: `design-source/verify/responsive-all/verify-rwd-a.cjs` (+ `rwd-a-pure.mts`), registered as `rwd-a` in
`design-source/verify/regression/probes.cjs`. Banked shots: `design-source/verify/responsive-all/rwd-a/`.

## 1. What was built, where

| piece | built where | what a person sees now |
| --- | --- | --- |
| **The house timeline** (new) | `components/om/timeline.tsx` + `timeline.module.css` — `Timeline` (one `ol`), `TimelineItem` (the day's marker on the first line of its day · the glyph on the rail · the time · the sentence), `TimelineDay`, `TimelineGlyph` | One piece for every dated feed on a rail; the two hand-rolled timelines (the lead's, the quote's) now draw it. |
| **The day** | `components/leads/activity/activity-days.ts` — `dayLabel` = Today · Yesterday · the house long date (`displayDateLong`, "Fri, 2 Oct ’26", its year always); `feedDays(…, { fold })` — the one grouping, the desk calls it with `fold: false` | At a desk: the mock's marker (931:47993) on the rail — the 1px rule, now **starting at the rail's own line** (├), the date centred on it in a white chip, 12 secondary; 48 tall, 34 of air to the glyphs above and below. On ≤1024 L4's day header reads the same words ("Sat, 3 Oct ’26", was "Sat 3 Oct"). |
| **The time** | the house cell (`timeline.module.css` `.time`, 72 wide) | Each row says "4:42 PM" — the date is the day's. The 200 column ("Tue, 1 Sep ’26 · 2:16 PM") is gone, so the sentence starts 128 nearer the rail (it sat at 348 at 1440, now 220). |
| **The type glyph** | `lib/leads/activity-glyph.ts` (pure: `KIND_GLYPH` · `activityGlyph`) · the house `TimelineGlyph` | In the dot's place on the rail: the icon 16 in a 24 circle, secondary ink on the soft ground (the bell's event glyph), centred on the rail and on the time's line. **Tasks `task_alt`** (the rail's Tasks, the dock, the Task quick link, the bell's task_assigned) · **Files `folder`** (a folder card, the portal's Files tab, the feed's folder lines) · **Notes `sticky_note_2`** (the Note quick link, the Notes & Logs tab's Notes chip) — **a contact log keeps `call_log`** (REG-278) · **Stage `swap_horiz`** (every stage line already, the bell's stage_changed). Every other line wears the icon its event already carried (63 names, all inside the subset — `rwd-a-pure` reads them). |
| **A lead's / a project's Activity** (one component) | `components/leads/activity/lead-activity.tsx` · `lead-activity.module.css` (the desk's old rail / dot / when / body rules retired; the link, the pick's card kept) | **Desk (≥1025):** the timeline by day, every row kept (no folding at a desk). **≤1024:** L4's day cards — runs, Show older, 44 rows — each row (and each run, and a run's opened lines) led by the same glyph; a tablet glyph · time · sentence on one line; **a phone the time over the sentence**, beside the glyph (REG-A.6). The chips, the search, the No-results card, twins under All, the pick's card under its line: unchanged. A project's Activity is the same component (Files & notes › Activity). |
| **The quote's trail** | `components/quotes/editor/activity/activity-section.tsx` + `.module.css` · `lib/quotes/activity.ts` (`QuoteEvent.icon`, `QUOTE_GLYPH`) · `quote-editor.tsx` / `components/quotes/screen/quote-screen.tsx` (pass the server's `now`) | The same kind of dated feed (derived, newest first, on a rail), so it reads the same way — the editor's Activity section and the Quote screen's Activity fold: by day, the time only, a glyph by what each line is (REG-A.4). The mock's 11px dots — the newest primary — and the 200 date column go. |
| **The Overview's RECENT ACTIVITY card** | `components/leads/detail/activity-card.tsx` + `.module.css` (`ActivityItem.icon`, a glyph-led row; a row with no glyph draws as before) · `lib/leads/detail.ts` (each line's glyph, the feed's own for that line) | Each row led by its glyph (Moved to … / Put on hold / Marked as lost / the project → `swap_horiz`, Lead created → `person`, Quote created → `docs`, Lead returned → `undo`), held inside the mock's 36 row; no day grouping on a four-row card. |
| **The ghosts** | `components/leads/detail/tab-ghosts.tsx` (`ActivityTabGhost` — a lead's and, through `tabGhost`, a project's) · `components/shell/detail-skeleton.tsx` (`RecentActivityGhost`, exported) | The loader and the reveal draw the days and the glyphs: the desk's markers with a chip bone and a glyph bone on the rail, the cards' glyph bones, the Overview card's glyph bones. |

**The contract's activity (looked at, left):** a contract has no Activity feed at the desk; the Contract screen (≤1024) has an *Activity* fold of
three to six moments, each with its own date and time (`lib/contracts/next-step.ts` `contractTimeline`) — a short list inside a fold, the
Overview card's kind rather than a feed, so it keeps its rows. Not grouped, no glyphs (▲ 6).

## 2. ▲ For him to look at

1. **The day marker's chip is centred, as the mock drew it** — on a 1,244-wide feed the date sits over the sentences' middle, far from the times
   it heads. The rule now starts at the rail (├) so the day reads as a station on the line. The other reading of "adapted to the rail" — the date
   at the rail's side, left, over the times, the rule running right from it — scans faster; one line in `timeline.module.css` (`.markRule`'s
   `justify-content`) if he prefers it.
2. **A contact log keeps `call_log` under Notes** (REG-278: "one entity, one mark everywhere, or the chip would filter by a symbol the rows it
   selects do not carry" — the Notes & Logs tab draws a log with it). So the Notes chip shows two icons. One icon for the kind would be `sticky_note_2`
   on the logs too (one line in `activity-glyph.ts`) — and would reverse REG-278 in the feed.
3. **The quote's trail lost the mock's primary dot on its newest line** (1254:3755) — one look with the lead's timeline, where the glyph says
   what a line is and a coloured one would read as a kind of its own. The glyph per quote line (REG-A.4) is invented: the bell's icons for the
   same moments where it has them.
4. **A phone's day-card row is now glyph · time over the sentence** (REG-A.6) — L4 had the time beside the sentence; with the glyph beside a
   time column the sentence would be ~120 wide at 320. The rows grow a little (Olivia's feed at 390: 2,783 → 3,071 tall).
5. **No folding at the desk** (his brief left it to me): a desk has the room, and a name ("Floor plan — Waterway Sunrise.jpg") is what a reader
   scans the desk's feed for; L4's runs stay where the screen is small.
6. **The contract's Activity fold** (Contract screen ≤1024) keeps its dated rows — a fold of a few moments, not a feed.
7. **A one-event day costs a marker** — a feed of one line a day (Olivia's X-Ray comparisons, Benjamin's project over 55 days) is taller than
   the continuous timeline was (Olivia's at 1440: 2,696 → 3,128; Ryan's project: 6,096 → 8,476). The day markers are 48; 40 would take 8 a day.

## 3. For C2 / landing

- **The project's Overview › Recent activity** (`components/projects/project-overview.tsx`, line 170 at `06b9485f`) — pass each line's glyph and
  the card draws it like the lead's:
  ```tsx
  import { activityGlyph } from '@/lib/leads/activity-glyph'
  …
  <ActivityCard items={d.activity.slice(0, 3).map((e) => ({ at: e.at, text: e.text, icon: activityGlyph(e) }))} now={now} onOpenTab={() => onOpenTab('activity')} headExtra={activityToggle} />
  ```
  and its ghost (`components/projects/overview/overview-ghost.tsx`, `<CardGhost title="Recent activity" rows={3} />`) can draw the glyphs with
  `import { RecentActivityGhost } from '@/components/shell/detail-skeleton'` → `<RecentActivityGhost rows={3} />` inside the same
  `data-card="recent-activity"` span. Until then the project's card draws as before (no glyph is passed) — the lane changed nothing there.
- **A load-order flip outside the Activity surfaces** (seen on the 1440 diff, §5): the project Schedule's ask band and nudge
  (`components/projects/schedule/schedule.module.css` `.askBand` · `.nudge`, each `composes: banner` from `template-bar.module.css` then sets
  `padding` · `box-shadow` at the same weight) drew the banner's padding 8 / 24 with its bottom rule on the base build and their own 12 / 16 with
  no shadow on this lane's build — the new stylesheet re-split the chunks. Order-proof it in the file that owns the override (C2's lane):
  `.askBand.askBand, .nudge.nudge { padding: var(--om-spacing-3) var(--om-spacing-4); box-shadow: none; }` (the banner sets no corner, so
  `border-radius` holds either way). What the doubled rule keeps is what the stylesheet says it wants (12 / 16, no rule, the card's corner).
  The runtime css-order scan didn't catch it: its project route (Benjamin's) has no ask open, so the band never renders there; the static
  `fragile-composes.cjs` lists both pairs among its 112.
- **`design-lint.baseline.json`** — one line lower (the quote trail's `border-radius: 50%` is gone with its dot): `raw-radius` 41 → 40.

## 4. Verification

- `npx tsc --noEmit` clean · `npx eslint app components lib`: the three known quote-editor errors (`quote-editor.tsx` 290 · 325 · 437), nothing
  new · `npm run design:lint`: nothing rises (raw-radius one lower, baseline updated) · `npx next build` green.
- **The lane's probe** `verify-rwd-a.cjs` (+ `rwd-a-pure.mts`): **121 / 121** — the pure rules 15 (the four kinds, a contact log's mark, every
  other line its own; the 63 icon names the lead feed can draw and the quote trail's 13, all inside the subset; the day's words; the desk's
  unfolded days), then on the build: A 1440 Olivia's feed (the days in the house words, newest first, each once; the time only, newest first in a
  day; one glyph a row, drawn 16 at 16, the 24 circle on the rail's line and on the time's line, the bell's tones; the rail unbroken from the
  first rule to the last glyph; each rule from the rail's line, its chip centred, 12 secondary on white; the four chips' icons read on Olivia's
  and Kevin's feeds; the sentence the link, underlined on hover; search narrows by day; No-results) · B the Overview card (Farah, Kevin: every
  row's glyph = the feed's for that line, 36 rows) · C Benjamin's project (55 days; the pick's card under its line) · D the signed quote's trail
  (one "Quote activity" list, signed `draw` · approved `verified` · created `docs` · items `list_alt`; one `when` and one `text` in the first
  line) · E 390 (the cards, the house days, a glyph on every row and run and a run's lines, 44 rows, the time over the sentence, Show older) ·
  F 768 · 1024 · 844×390 (glyph · time · sentence on one line, no sideways scroll) · G 320 (no sideways scroll; the Quote screen's trail 16 over
  14, the day 14) · H 1280 (the desk's timeline) · no page errors · stages and stage logs as found.
- **The regression** (`design-source/verify/regression/run.cjs` on :3213, a RUN_DIR whose `base.db` is a copy of `rwd-calls/base.db`) — all exit 0,
  no failure: rwd-a 106 (+ the pure 15) · rl-l4 97 · rq-k5 79 · rq-k1 116 · ke 31 · ux-p3 91 · ghosts-same 76 · ghosts-same-390 76 · rwd-w6 68 ·
  rwd-w3 57 · rwd-w2 78 · pm2-s23 148 · overlays 67 · kb-r1 35 · search 27 · pj-r1 98 · pj-r6 82 · rq-k3 90 · ghosts-strips (pictures: the
  Activity ghost's bones over the page line up — time at 92, sentence at 154) · ghosts-film (no keys, nothing to film). Re-run on the final build
  (after the ghost cells, `RecentActivityGhost` and the quote's hook classes): rwd-a 106 (+15) · ghosts-same 76 · ghosts-same-390 76 · rq-k5 79 · rq-k1 116 · rl-l4 97 · ux-p3 91 — all exit 0, no failure.
  One assertion brought to the rule, commented "(activity by date 2026-10-24, a deliberate change of this rule)": `rl-l4-pure.mts` — the day reads
  "Tue, 20 Oct ’26" / "Mon, 20 Oct ’25" (was "Tue 20 Oct" / "Mon 20 Oct ’25"), and one new check (`fold: false`). `verify-rl-l4.cjs`'s 1440 check
  ("the one continuous timeline": no `activity-days`, rows present) holds as written — the desk's container is `activity-timeline`, the rail
  still one line.
- **css-order-scan** (`design-source/verify/responsive-all/css-order-scan.cjs`, base build vs this build, 1440, 107 routes · 156 order-only
  pairs): winners moved 8, **value moved 0** (all 8 held by a stronger rule — the rail's badges, X-Ray's banner), **new pairs 0**. The static
  `fragile-composes.cjs`: 112, as before (none added). The one real flip this lane's build caused is on a route the scan doesn't visit (Ryan's
  Schedule — §3, §5).

## 5. The 1440 diff (base build vs this build, the same fresh copy of base.db, full pages)

23 pages, full length, each on its own fresh copy of `base.db` visited in the same order (`cap1440.cjs` · `diff.cjs` in the lane's scratch):

| | pages | result |
| --- | --- | --- |
| **identical** (16) | /leads · /leads?view=kanban · /tasks · /dashboard · /projects · /company/templates · /settings · Kevin's Tasks · Quotes · Files · Notes · Questionnaire · Ryan's project **Overview** (no glyph passed yet — §3) · Ryan's Money · the quote editor at rest (its Activity folded) · a contract | 0 px |
| **the Activity surfaces, on purpose** (6) | Olivia's · Farah's · Kevin's Overview | 4,887 · 5,274 · 7,410 px, **all inside the Recent activity card's box** (0 outside) |
| | Kevin's · Olivia's Activity, Ryan's project Activity | the feed (taller: 1,860 → 2,388 · 2,696 → 3,128 · 6,096 → 8,476); outside the feed's column only the page frame's foot, moved down by the taller page (994 · 994 px in its last 16 rows), and on the 8,476-tall project page 6 px of the frame's anti-aliased top corners |
| **not this lane's rule — a load-order flip** (1) | Ryan's **Schedule** | 117,594 px in [92,278 – 1335,928]: the ask band ("Michelle asks for more time …", `schedule.module.css` `.nudge` composing `template-bar.module.css` `.banner`) drew the banner's 8 / 24 with its bottom rule on the base build and its own 12 / 16, no rule, on this build (computed on both); everything under it moved 8 down. The stylesheet's own rule is what this build shows; it holds only by order — the fix is C2's file (§3). |

## 6. Shots (banked under `design-source/verify/responsive-all/rwd-a/`)

Before | after, each from a fresh copy of `base.db` (the before from the WIP base's build, the after from this lane's):

- `a-1440-lead-activity-before-after.png` — Farah's Activity at 1440: two days, a glyph on every row, the time only.
- `a-1440-olivia-activity-before-after.png` — Olivia's (many events, many days): the markers on the rail, the times, the glyphs.
- `c-1440-project-activity-before-after.png` — Ryan's project Activity (Files & notes › Activity).
- `d-1440-quote-activity-before-after.png` — the signed quote's Activity section: the mock's dots → the days and the glyphs.
- `b-1440-overview-card-before-after.png` · `b-768-overview-card-before-after.png` — Kevin's Recent activity card.
- `e-390-lead-activity-before-after.png` — Olivia's at 390: L4's day cards, the house days, the glyph, the time over the sentence.
- `f-768-lead-activity-before-after.png` — Olivia's at 768 (touch): glyph · time · sentence on one line.
- `g-390-quote-screen-activity-before-after.png` — the Quote screen's Activity fold at 390.
- The probe's own shots (`verify-rwd-a.cjs`, the final build): `a-1440-olivia`, `b-1440-overview-card`, `c-1440-project`, `d-1440-quote`,
  `e-390-olivia`, `f-768-olivia`, `g-390-quote-screen`.
- The loader's ghost as streamed (a browser without scripts keeps the fallback): `h-1440-activity-ghost.png` (the days' chips, the glyph bones
  on the rail, the times, the sentences), `h-390-activity-ghost.png` (the day cards, the glyph beside the time over the sentence).

## 7. Principles check (DESIGN-1. **The mock wins, every exception written down** — REG-190's two pieces come back as the mock measured them (`lead-activity/01-feed.txt`:
   the 1px rule in the surface-variant grey, the white chip with 24 either side, 12 Regular secondary; a glyph per row) and REG-245's
   timeline stays; what the mocks don't draw is logged as such (REG-A.1 … A.7: the rule from the rail, the quote's glyphs, the phone's stack).
2. **One system, no one-offs** — one house timeline in `components/om/` for every railed feed (the two hand-rolled ones retired); tokens only
   (`--om-*`, the radius-full circle, the type tokens); every icon inside the subset (checked by name and by its drawn width); overrides
   order-proof (`.runList .dayGlyph` at two classes; the quote's hook classes set nothing the house cell sets); `design:lint` one lower.
3. **Plain words** — no new words: Today · Yesterday · the house long date; the sentences are the feed's.
4. **Nothing is lost** — nothing removed: the chips, the search, the links, the pick's card, twins, L4's runs and Show older, the No-results
   card all stay; no data written.
5. **Say why** — no new refusal or wait.
6. **Back returns** — every link and its `?from=` untouched (the project's feed keeps its way back).
7. **Every screen is whole** — the ghosts draw the days and the glyphs (the tab's, a project's through `tabGhost`, the lead Overview's card);
   ghosts-same 1440 · 390 hold (loader = reveal).
8. **Every width is designed** — 320 · 390 · 768 · 1024 (touch) · 844×390 · 1280 · 1440 read on the build; the phone's row re-stacked for the
   glyph's room (REG-A.6); 44 rows, no sideways scroll.
9. **Tables** — none touched.
10. **Motion** — none added.
11. **Honest data** — every day and glyph is the record's: the derived feed's own dates and events; the Overview card's glyph is the feed's for
    the same line; the quote's glyph is the line's own kind.
12. **Reach for everyone** — one ordered list a feed ("Activity", "Quote activity"); each day an `h3` inside it (a screen reader jumps by day);
    the glyph is `aria-hidden` (the sentence names the thing); touch targets as they were (44); the touch scale (16 sentences, 14 values) kept..md)

1. **The mock wins, every exception written down** — REG-190's two pieces come back as the mock measured them (`lead-activity/01-feed.txt`:
   the 1px rule in the surface-variant grey, the white chip with 24 either side, 12 Regular secondary; a glyph per row) and REG-245's
   timeline stays; what the mocks don't draw is logged as such (REG-A.1 … A.7: the rule from the rail, the quote's glyphs, the phone's stack).
2. **One system, no one-offs** — one house timeline in `components/om/` for every railed feed (the two hand-rolled ones retired); tokens only
   (`--om-*`, the radius-full circle, the type tokens); every icon inside the subset (checked by name and by its drawn width); overrides
   order-proof (`.runList .dayGlyph` at two classes; the quote's hook classes set nothing the house cell sets); `design:lint` one lower.
3. **Plain words** — no new words: Today · Yesterday · the house long date; the sentences are the feed's.
4. **Nothing is lost** — nothing removed: the chips, the search, the links, the pick's card, twins, L4's runs and Show older, the No-results
   card all stay; no data written.
5. **Say why** — no new refusal or wait.
6. **Back returns** — every link and its `?from=` untouched (the project's feed keeps its way back).
7. **Every screen is whole** — the ghosts draw the days and the glyphs (the tab's, a project's through `tabGhost`, the lead Overview's card);
   ghosts-same 1440 · 390 hold (loader = reveal).
8. **Every width is designed** — 320 · 390 · 768 · 1024 (touch) · 844×390 · 1280 · 1440 read on the build; the phone's row re-stacked for the
   glyph's room (REG-A.6); 44 rows, no sideways scroll.
9. **Tables** — none touched.
10. **Motion** — none added.
11. **Honest data** — every day and glyph is the record's: the derived feed's own dates and events; the Overview card's glyph is the feed's for
    the same line; the quote's glyph is the line's own kind.
12. **Reach for everyone** — one ordered list a feed ("Activity", "Quote activity"); each day an `h3` inside it (a screen reader jumps by day);
    the glyph is `aria-hidden` (the sentence names the thing); touch targets as they were (44); the touch scale (16 sentences, 14 values) kept.
