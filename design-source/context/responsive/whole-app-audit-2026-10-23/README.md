# The whole-app responsiveness audit and its fixes (2026-10-23 → 24, overnight)

**His ask (23:20):** "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your recommendations.
I am going to sleep now." Every call here is the orchestrator's recommendation; nothing is committed.

**The scope his same-evening call sets:** the lead's page was put back to one page with its tab strip (REG-2734 — "not for leads and
projects"), so this round fixes **defects inside the layouts that exist** at every width — overflow, clipping, covers, small targets, iOS
zoom, layers, off-screen menus, squeezed tables, ghosts — and builds no new screen or level. The contract: `brief.md`.

## How it runs
1. **The sweep** (`scratchpad/rwd-all/sweep.cjs`): 109 routes × 320 · 390 · 768 upright · 1024 sideways (touch) · 1280 (a mouse), measured
   by rule (sideways · offscreen · covered at rest and at the page's end · target < 44 · text < 12 · a phone's input < 16 · clipped) with a
   viewport shot at the top and the end of each page — `sweep.json` + shots in the scratchpad's `rwd-all/out/`.
2. **Five lanes** in worktrees from a WIP base of main's uncommitted state, each owning its files (`brief.md` §4): W1 the house pieces, the
   shell and the public / account pages · W2 leads and the day's work · W3 projects and the client portal · W4 Company, Settings, Finance,
   Reports and the template editors · W5 the tools. Each reads the sweep for its routes, looks at every page it owns at every width, opens what
   a person opens there, writes `audit-<w>.md`, fixes, verifies, and delivers `outcome-<w>.md` + `reg-<w>.md` + a probe.
3. **Landing** lane by lane (`rwd-all/land.sh`), the cross-lane hand-offs, the sweep again on the landed build (before → after), rows numbered
   from REG-2810 (after the Floorplan session's REG-2800…2809 block — ~85 rows do not fit between REG-2734 and it), the closing regression on a fresh restore, the records.

## Log
- 2026-10-23 23:20 — his ask. The revert's regression (30 probes) green bar two probe misses of the revert's own (rl-l2's tablet-sideways log
  path, rl-fixes' log-sheet Attach) — both probes corrected.
- 23:40 — the sweep written and trial-run (Dashboard, 5 widths); refined (a cover by a pinned bar counts only at the page's end; a
  screen-reader-only label is not clipped); the full sweep started (545 page-widths, 3 workers, a fresh restore on :3197).
- 00:05 — the sweep tightened (a sticky head at the top is scrolling, not a cover — only a bar pinned to the bottom half counts at the
  page's end; a pseudo box of either side counts as a target; a 1px skip link is not a control) and run again: **545 page-widths —
  sideways 1 page (the client's /confirm at 390, 37px) · offscreen 2 · covered 359 · targets < 44 844 · a phone's input < 16px 23 ·
  clipped 140** (text < 12px 1,602, mostly mocked sizes such as the dock's labels — judged per page, not counted as defects). Saved as
  `out/sweep-before.json`. Main's uncommitted state snapshotted as the lanes' WIP base (160 tracked files, 115 untracked); the five lanes
  launched on Opus in worktrees (W1 3201 · W2 3202 · W3 3203 · W4 3204 · W5 3205).
- 02:20 — **W5 landed** (the tools; 3-way clean, main type-checks): 37 ids — 15 fixed (1 blocker · 9 major · 5 minor), 11 kept with a
  reason, 11 handed to other lanes. The blocker: the client's `/confirm/<token>` (a variation order) put "Approve the changes" 37px past a 390
  screen and the Approve sheet's foot below it — the bar's pair wraps, primary on top (W5-01). The phone Items screen's Maison AI button
  rests above the pinned foot (▲ W5-06), the foot unpins on a phone held sideways (▲ W5-03) and sits above the sideways bar; the lists end
  on the house clearance (the last card was 54px under the dock); X-Ray's tablet ⋮ a frozen trail cell, its phone cards' stray rule gone;
  the Visualizer's markers grow to 44 where neighbours leave room (a mouse keeps 32), the FAB steps aside on short phones (▲ W5-11); the
  Preview's Send ▾ menu ran 205px off a 1280 and a 1440 screen — it opens leftwards (W5-12, the one desk change, a bug); ghosts for the
  landscape split. Probe `verify-rwd-w5.cjs` 74/74; 30 harness probes 1,911 ✓ 0 ✗; 1440 46/50 identical (3 = the "/" badge's run-to-run
  16px, 1 = W5-12). Its hand-offs (W1: segmented 44, scope pills 36, SearchBar 36, PageReveal clipping sticky children, the sheet's snackbar
  lift, date-picker cells, the Dropdown off a sideways phone; W4: the Company popover at 844×390; W2: link targets in the Quotes/Contracts
  tablet tables) wait for the hand-offs wave after every lane lands.
- 02:55 → 09:45 — the machine slept (every lane's processes paused mid-run); work resumed on wake. W1–W4 have their outcomes written and are
  in their final probe runs.
- 10:15 — **W1 landed** (the house + shell + public pages; a plain apply minus `probes.cjs`, its lines added by hand — the 3-way refuses
  files whose working copy differs from main's index; main type-checks, design-lint clean): 27 ids, 20 fixed (REG-W1.1…20). Two blockers —
  a notched phone held sideways put the rail, the page's edges, the Maison AI button and the snackbar under the notch and on the home
  indicator (found by forcing the safe-area insets through CDP; the shell, rail, FAB, snackbar, Drawer, Sheet, the editors' surface and the
  website now pad by `env(safe-area-inset-*)`, 0 everywhere else), and the folder card's checkbox whose lower half opened the folder. The
  phone bar's avatar 44 (its `overflow: hidden` clipped the house box), the More sheet's counts on the sheet's corner (load order), 44 on
  the rail's studio block · crumbs · every DS SegmentedButton · the definition-list handle · the website's bar; iOS zoom on textareas and
  selects (the TextField's inputs were already 16 on iOS, REG-306); dialogs on a phone held sideways 8 above and below, not 48; the touch
  search foot and the ? panel show their keys; the 1280 "covered ⋮" was hover-only actions — not a bug. 38 probes 2,472 ✓; `pm2-s10`
  corrected (it tapped the FAB on a tablet where it waits for the page's end). **Its warning:** CSS added anywhere can re-split the build's
  CSS chunks and flip the load order of 121 overrides that only work when they load last (`design-source/verify/responsive-all/
  fragile-composes.cjs`) — three desk pages changed that way on W1's own build (Money's Needs-you rows, Commissions' totals, Reports ›
  Finance's "--"); the order-proof fixes are in `audit-w1.md` and land in the hand-offs wave, then a 1440 diff of the landed build.
- 10:25 — **W4 landed** (Company · Settings · Finance · Reports · the template editors; plain apply minus `probes.cjs`, its line by hand;
  main type-checks, design-lint clean): 46 routes × six widths, the whole page, ~870 layers opened by real taps, 36 deeper flows → 30
  findings, 19 fixed (REG-W4.1…15) — Settings › Quotes & pricing's button 59px off a 320 screen, Document numbers' labels cut ("Pre…"), the
  schedule editor's first milestone name a 34px sliver, the PO dialog's "What it is" 0–56px wide under the Trade field at 768, the message
  dialogs' Reset off the left edge at 320 (now the house `FootStart`), the task editor's Assign Member and Tags pickers off-screen, Payment
  schedules' deletes outside the card at 768, the portal checklist's address breaking every few letters; targets to 44 across W4's pages
  with the drawn marks unchanged (911 → 580 under 44 on its routes; the rest in-sentence help links and other lanes' pieces). 1440 46/46
  identical bar build noise. Hand-offs: W3 Reports › Meetings' coaching row one letter a line at 320 (blocker), W1 the Question bank head
  "QUESTIONREQUIRED" (blocker), W1 textareas / selects at 14 on iOS (already in W1's landing) + 8 more in `outcome-w4.md`.
- 10:40 — **W2 landed** (Leads and the day's work; plain apply minus `probes.cjs`, its lines by hand + `pm2-s27` registered; W2-03's paired
  ghost change made at landing — `components/shell/skeleton.tsx` the tablet listing ghost's Members column 128 → 144 like `TABLET_WIDTHS`):
  17 defects, 15 fixed (REG-W2.n) — the blocker: on a phone held sideways the Assign card's Clear All · Assign ran off the screen's bottom
  (and off its top on /tasks), the Filters dialogs could not reach Source · Members · Date (or Lead · Stage · Project), menus ran off (the
  card capped to the screen, the Filters list scrolls up to 1024, a sideways phone's menu capped from its own top; Deleted Leads / Files fit);
  the meeting page's "Start the meeting" 15px off a 320 screen and the FAB on it at 390 (it rides above the foot, as on the Quote screen);
  /tasks' to-do chips a 14px sliver at 320 (their own line, as the Quotes tab and the listing); a Hangout's By designer table drawn over
  itself at 320 / 390 (scrolls in its own frame); MY TASKS cut at 1280 (wraps ≤1439, 1440 untouched); the tablet Members cell clipping its
  Assign (128 → 144); 44 taps across Meetings · /tasks · Qanvast Ops · Hangouts · the meeting link · the task panel · the info column; the
  viewer's strip thumbnails 48 on touch. 1440: 63/63 identical. Probe `verify-rwd-w2.cjs` 76/76 (30/76 on the base — it catches every fix);
  29 regression probes green (pm2-s42e · s43b pass on a fresh restore — they read the demo Hangout's day). Held for him: the task card's
  lead link (24 tall — a 44 box stole taps from the name and due line), the Notes composer's tools at 320. `components/hangouts/**` had no
  owner — W2 took it.
- 11:20 — **W3 landed** (Projects · the client portal · the client's money links; 3-way clean, identical to the lane): 55 routes, 47 surfaces
  by real tap at each width, 275 ghosts held → 20 findings, 16 fixed (REG-W3.1…15). The blocker: at 320 Ryan's "says they paid" Needs-you
  row drew one letter a line, 1,342px tall (the Money tab the same at 768); the grouped tabs' view switch and the portal's section row now
  open with the current view in sight; the paper pages' sideways scroll at 320; Workload › Contractors' tools off a 320 screen; the milestone
  sheet's status labels cut; the portal Home's ghost 96px wider than a phone; 44 taps on the Schedule's grip · bars, the portal's links,
  the floor plan's 100%, ticket photos; the FAB off the last card at the page's end. 1440: 49/55 identical (3 relative times, 1 noise, 2 =
  the portal bell badge now where every other portal page has it). Two of its own load-order flips made order-proof (`.x.x`). Its sweep:
  sideways 3 → 0, offscreen 2 → 0, targets < 44 on its routes 711 → 400. **All five lanes landed.**
- 11:30 — main's state with the five lanes landed snapshotted (`rwd-all/wip2.*`, `setup-lane-w6.sh`); **W6 launched** (the closing lane,
  owning every file): (1) every lane's "For other lanes" item checked against the landed code and built where still open; (2) the load
  order made safe — W1's `fragile-composes.cjs` scan, the flipped overrides made order-proof, a 1440 pixel diff of the pre-audit tree
  (`f85e0e94` + `wip.patch`) against the final build over every swept route and open states; (3) the sweep before → after.
- 17:30 — **W6 landed** (the closing lane, a plain apply of 94 files over its WIP base): 51 hand-offs — 31 built, 11 already fixed by their
  lanes (re-measured), 1 not a defect, 2 house refactors left (no defect left), 3 his calls, 3 needed nothing; the five known blockers fixed
  (W4-17 the definition list stacks at ≤360 · W4-15 the coaching row at 320 · W5-31 the house Dropdown a bottom sheet on a sideways phone ·
  W5-36 the Company panel capped with its own scroll · the quick-links strip ends above the FAB). **The load order:** a runtime scan
  (`design-source/verify/responsive-all/css-order-scan.cjs`) of what a build actually flips — 13 pairs made order-proof with a doubled class
  (two of them this round's own, W3-18 · W3-03), 0 flips that move a value at seven sizes on the final build; the static count 121 → 112.
  **1440 against the pre-audit build:** 369 / 390 byte-identical; 4 deliberate and recorded (W5-12 the Preview's Send ▾, W6-01 · W6-02 the
  desk now draws what `next dev` always drew — the planner's three tabs, the activity picture at 48 — ▲ for him); 17 the clock, the run or
  the port (re-shot back to back: 23 / 26 identical, the other 3 the port's digit and a hero animation). **The sweep, before → after:**
  sideways 1 → 0 · offscreen 2 → 0 · covered 359 → 292 · targets < 44 844 → 129 · zoom 23 → 21 · clipped 140 → 10 (each remainder read:
  exemptions, his calls, scrolling); a notched phone held sideways: 9 pinned controls in the unsafe band → 0. Its regression 129 / 129
  (7,498 ✓); two stale probes (thumbs-rest · dane-p6, stale against K2 / L3's deliberate rules, failing the same on the pre-audit build)
  updated. Rows numbered **REG-2810…2898** after the Floorplan session's REG-2800…2809 block (W1 2810–2829 · W2 2830–2837 · W3 2838–2852 ·
  W4 2853–2867 · W5 2868–2882 · W6 2883–2898; `reg-map.json`); the sweep banked as `design-source/verify/responsive-all/sweep.cjs`.
- 18:10 — **the closing check on main's own build** (a fresh `restore-baseline`): rwd-w1…w6 · ghosts-same (1440 + 390) · overlays · rl-l2 ·
  rl-l3 · rl-l4 · rl-fixes · pm2-s17 · rq-k4 · rc-c4 — **16 / 16 green, 1,357 ✓ 0 ✗**; `design:anatomy` 90 pages · 1,971 measures hold;
  tsc clean; eslint the three known; design-lint clean. CLAUDE.md (the header line + the Map entry), `responsive.md` § *The whole-app audit*.
  Nothing committed. **Done.**
