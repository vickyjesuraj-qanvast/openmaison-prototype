# Leads on the move — the responsive audit and its proposal (2026-10-23)

**His ask:** the Contracts page's Q-08 ("the next module") answered *Leads*, as recommended, on 2026-10-22 23:12 with the rest of his picks;
"commit and continue" on 2026-10-23 after the Contracts build. The module is audited the way Quotes and Contracts were
(`../quotes-on-the-move-2026-10-22/`, `../contracts-on-the-move-2026-10-22/`). Nothing of this is built until he marks the page.

His words set the benchmark: "Honestly the lead listing is too good but anything with the too heavy data is not pure responsive." The weight
of this audit is the lead's page, the moments that move it (the Move stage window), the tabs, the forms and the imports.

## 1. The audit (read-only)
- A production build of main at `a6caecb1` (Quotes and Contracts on the move committed) on a scratch copy of the demo database, captured at
  **390×844**, **768×1024** and **1024×768** with touch emulation: 77 shared shots (`audit/capture-leads.cjs`) and three lanes — **A** the
  listing and the ways a lead arrives · **B** the lead's page and the moments that move it · **C** the lead's tabs. Their brief:
  `audit/audit-brief.md`; their reports: `audit/A-the-listing-and-arrivals.md` (30) · `audit/B-the-lead-page-and-its-moments.md` (26) ·
  `audit/C-the-lead-tabs.md` (27).
- **83 findings** (2 blockers · 41 major · 40 minor) across nine surfaces and **13 proposals** (P-01…P-13) drawn as screens
  (`audit/drawn-screens.html`), with 8 questions, on the review page **https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh** (its data `review-page-data.json`, his picks in its db
  `picks`). 72 findings are resolved by a proposal; 11 are stand-alone fixes.
- **The answer in one line:** the listing stays (his benchmark) and its card gains the last contact and the next follow-up; a lead on a phone
  opens as a person and a position (stage and days, Call · WhatsApp, one Next line, Due now, a row per tab, a sticky Log ▾ + the next move); a
  call is logged in three taps; the Move stage window is one step per screen; a new lead is a name and a mobile.
- **The two blockers were plain bugs and are fixed tonight** (no pick needed): **REG-2655** — an unowned lead's "Move to Contacted" opened
  the Contacted step and lost the typed log on Save (B-01); every forward move now asks the owner rule first. **REG-2656** — Auto Fill and
  Attach opened under the Notes contact log's phone sheet (C-01). Probe `design-source/verify/responsive-leads/verify-rl-fixes.cjs` 22/0.

## 2. His picks
Read 2026-10-23 after his "continue the leads" (saved as `picks-2026-10-23.json`): **Build on all 13 proposals and all 11 stand-alone
fixes; every question as recommended** — Q-01 a portrait tablet = the phone model · Q-02 the screenshot optional · Q-03 a photo is the
signed copy · Q-04 drop the strip · Q-05 the stage pill · Q-06 the prompt after a call · Q-07 move · Q-08 Projects next.

## 3. The build
**BUILT 2026-10-23 (REG-2657…2733), uncommitted** — L1 REG-2657…2670 · L2 REG-2671…2686 · L3 REG-2687…2712 · L4 REG-2713…2730 · the landing's
fixes REG-2731…2733 (`reg-map.json` maps each staged id). The decisions to show him are the ▲ lines in each `outcome-l*.md` § 2.
The contract: `brief.md` (ownership table, waves, ports, staged rows `REG-Ln.m` numbered from REG-2657, probes
`design-source/verify/responsive-leads/verify-rl-<l>.cjs`). Four worktree packages on Opus, from main at `f85e0e94`:
**wave 1** — L1 the Lead screen + tabs as screens + 1024 two panes (port 3191) · L3 the listing and arrivals (3193) · L4 the tabs' bodies
(3194); **wave 2** — L2 the moments: the log sheet, the Move stage window one step per screen, Won / On Hold / Lost sheets, wired into L1's
Log ▾ and prompt and the Notes tab (3192). Scripts in the session scratchpad `rl-build/` (`setup-lane.sh` · `land.sh` · `number-rows.py`).

## 4. Log
- 2026-10-23 03:40 — committed the Quotes + Contracts builds (`a6caecb1`, on main, not pushed); the audit server on :3014; 77 shots.
- 03:50 — lanes A · B · C launched on Opus (the build agents' earlier model is out of usage credits).
- 05:20 — the three lanes back (A 30 · B 26 · C 27); B-01 and C-01 fixed as REG-2655 · REG-2656 with a pure test and a probe (22/0 at 390 and 1440); the review page built from the three tables.
- 05:35 — the review page published, private to him: https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh (13 proposals · 11 stand-alone fixes · 8 questions).
- 2026-10-23 — Dane's Items-sections round merged first (f85e0e94, pushed on his word); then his "continue the leads": picks read (all Build,
  every question as recommended), `brief.md` written, wave 1 (L1 · L3 · L4) launched on Opus in worktrees.
- 13:15 — **L3 landed** on main (3-way clean, 27 new files; main type-checks): the phone card's Last · Next lines + WhatsApp + "to call
  today", the stage sheet's next move first and Assign-then-move, the tablet table's five columns + frozen Edit · ⋮, the kanban's touch pill +
  Move to, a new lead as name + mobile + paste a WhatsApp message (`lib/leads/message-fill.ts`), ✕ asks, Edit details as a short list ≤1024,
  imports that name what's skipped, Deleted as cards, A-21 · A-27 · A-29. Probe `verify-rl-l3.cjs` 131/0; 20 regression probes green (ux-p3's
  one /tasks ghost miss fails the same on the untouched build). 1440: 12 of 15 desk states byte-identical; the three others are A-16's grouped
  phone numbers on the kanban card and in Review (REG-456), which widen each kanban column ~4px — for him. Not done: Undo on Approve All Clean
  (A-25 — it would mean hard-deleting the leads just made). Handed to L1: the Maison AI button over a touch tablet's frozen ⋮.
- 13:30 — **L4 landed** on main over L3 (3-way clean, 13 new files; main type-checks; eslint = the three known quote-editor errors only):
  Tasks as cards with a 44 ring + whole names + due chips, hold to select, a bulk bar of three, a docked quick add with due presets, the panel
  on the task (lead tab · /tasks · a project's Tasks); tablet column sets for Tasks · Meetings · Files; Files camera-first in one toolbar row and
  a viewer that pinches and swipes; Meetings · Questionnaire · Activity read first (day groups, runs folded); Notes upright on a portrait
  tablet; C-02 · C-08 · C-10. Probe `verify-rl-l4.cjs` 126/0; 31 of 32 neighbouring probes green (ux-p3's /tasks ghost again). 1440:
  pixel-identical bar C-10 (an attachment tile shows the day only, so it no longer runs under its ⋮). The lint rule `icon-button-overlay` now
  also reads classes handed to an IconButton; the one file it newly found (`templates/editor/structure-pane.module.css`, the eye) was FIXED at
  landing (its overlay duplicated the house box) instead of baselined — the rule's count is 2. L4's hand-offs to L1 sent (the Maison AI frame
  rule for tab screens + tablet tables, the quick-links strip at 768 upright, the meeting card's 12px Edit link).
- 14:10 — **L1 landed** on main over L3 · L4 (3-way; one conflict in `regression/probes.cjs`, both packages' ids kept, `ke` once; main
  type-checks, design-lint clean): the Lead screen ≤1024 portrait (bar · hero with Call · WhatsApp · members · Next from pure
  `lib/leads/next-step.ts` · the brief as one line · Due now · a row per tab · sticky Log ▾ + the next move, Assign on an unowned lead), tabs as
  screens (`TabScreen`), 1024 landscape two panes with Create in ⋮, the Q-06 prompt, the L2 seam `components/leads/screen/lead-log.tsx`; the
  hand-offs done in one rule: on a touch tablet and on a lead's screens ≤1024 the Maison AI button shows only at the page's end (▲ for him —
  covers the tablet ⋮ and C-08), the quick-links strip gone at 768 upright, a card head's link 14 on touch (▲ reaches Projects · Dashboard ·
  Hangouts · Company). Probe `verify-rl-l1.cjs` 162/0; 1440 byte-identical on 18 lead pages + projects + the Dashboard (and at 1025).
- 14:15 — main built once on a scratch DB (`scratchpad/rl-wave1/`), the combined wave-1 regression started in two lanes (3195 · 3196, 35
  probes). Main's wave-1 state snapshotted as the WIP base (`rl-build/wip.patch` + `wip-untracked.tgz`, `setup-lane-w2.sh`,
  `land-w2.sh` = diff from that commit) and **L2 launched** (wave 2, port 3192) with wave 1's seams.
- 15:05 — **the combined wave-1 regression: 35 probes, 33 clean** (rl-l1 · rl-l3 · rl-l4 · rl-fixes · pm2-s05 · ux-p1/p2 · dane P1/P2a/P2b/P5a/P5b ·
  ke · view-as · kb-r1/r2 · search · overlays · ghosts-same 1440 + 390 · folders-files · rq-k1…k5 · rc-c1…c4 · pj-r1 · pj-gap-f2 · first-run-full).
  dane-p3's one miss (Find's Jump to "in view") was flaky — 70/0 on a re-run of the same build and on the base. ux-p3's one miss (the /tasks
  to-do chips' ghost widths) is the base copy's age, not code: `rl-build/base.db` has 17 overdue tasks against 9 on a fresh restore — the
  closing regression runs on a fresh `restore-baseline` over a scratch copy.
- 15:20 — **two ghost misses fixed at landing** (found by the parallel Floorplan session's pm2-s17 run, which the harness did not list — added to
  `probes.cjs` now): 390 · the five library galleries' cards 12px low under their folders — L4's folder-card touch type (16/24 · 14/20) had
  no ghost twin; the gallery ghost's folder bars take those line boxes on touch (`library-gallery.skeleton.tsx` `.gFolderName` ·
  `.gFolderCount`). 1440 · the Contracts templates gallery's ghost 5px low (fails on `f85e0e94` too — Contracts C4's rows mode): the View
  slot's inline wrapper drew a 41 bar; `.gViewSlot { display: inline-flex }`.
- 15:40 — the Floorplan session (REG-2800…2804) appended its register rows, Map bullet, `fp3d` probe and the UAT rebuild (ch24 · 524 steps);
  the numbering script (`rl-build/number-rows.py --start 2657`) now inserts our rows above any higher block and replaces whole staged ids
  only. `settings-parity/verify-st-r1.cjs` was stale since Dane's merge (`class*="plus"` → `edgeAdd`) — it finds "Add item below" by name now
  (a deliberate-change comment); it joins the closing regression.
- 16:25 — **L2 landed** on main (from its WIP base; the 3-way refused on wave 1's still-untracked files, so a plain apply of all but
  `probes.cjs`, its `rl-l2` line added by hand): the log sheet (`components/leads/log/*` — a call in three taps; Save on a New lead logs and
  moves to Contacted, ▲ an unowned one asks "Who owns {first}?" first; a Visit on Contacted is "Save & move to Met"; Log ▾, the prompt and a
  phone's Notes › New › Contact Log), the Move stage window one step per screen ≤1024 upright, Won as a checklist, On Hold / Lost one sheet
  with Undo, ▲ the window never closes on a refused move at every width, Q-02 (the screenshot optional at every width — the desk's one
  change), Q-03, ▲ B-12 the usual split on the move only (the desk keeps REG-149's 0% for an upload until he decides), B-14 · B-15 in the
  house snackbar and sheet. Probe `verify-rl-l2.cjs` 108/0; 1440 identical on 17 states bar Q-02's "(optional)". Main type-checks, lints (the
  three known), design-lint clean. Closing build of main's tree on a fresh `restore-baseline` (`scratchpad/rl-close/`, 9 overdue tasks as the
  baseline means); the closing regression started: 52 probes in two lanes, incl. the four pending-module probes L2 found failing on the WIP
  base (`pm2-s23` · `s42e` · `s42g` · `s43b`, now in `probes.cjs`), `pm2-s43e`, `pm2-s17`, `st-r1` and the Floorplan session's `fp3d`.
- 17:55 — **the closing regression (52 probes, fresh restore, main built 17:08): 41 clean, 11 with misses — triaged one by one.** Probes that
  read the aged copy's days or the baseline's folds (rl-l1 · dane-p5a Farah's late follow-up, now staged from the records and put back;
  rq-k5 the quote's Terms folded in the baseline — opened first; rl-l3 a card below the fold — scrolled into view before the hit test;
  pm2-s43e a repo path from `__dirname` in the lane copy — from `process.cwd()`); probes behind a deliberate change, each commented (pm2-s42g
  REG-2655's owner rule; pm2-s43b L2's refusal in the window's foot; pm2-s23 a page's ghost holds one shape per width — only drawn pieces
  count; st-r1 a line's own edge + since Dane's round); one real miss of ours — the gallery ghost fix of 15:20 overshot (8px the other way):
  measured, the phone's folder card is a 128 column, so the ghost's bars take 40 on a phone only (REG-L9.1). fp3d's one miss (844×390, the
  plan's height) sent to the Floorplan session with the log. Main rebuilt; the 13 touched probes re-running.
- 18:40 — **the closing regression green**: after the triage the 13 touched probes re-ran on a rebuild — all clean (rl-l1 118 · rl-l3 102 ·
  dane-p5a 59 · pm2-s17 130 · pm2-s42g 40 · rq-k5 79 · pm2-s43b 70 · pm2-s23 148 · st-r1 58 · pm2-s43e 46 — its strip check now asks that a
  lead's tab screen and its ghost both draw no strip, Q-04 · ghosts-same 76 · ghosts-same-390 76 · folders-galleries 44); the other 38 were
  clean in the first pass; fp3d fixed by the Floorplan session on its side. `npm run design:anatomy` 90 pages · 1971 measures hold;
  design-lint clean (icon-button-overlay 2); tsc clean; eslint the three known. Rows numbered REG-2657…2733 above the Floorplan session's
  REG-2800 block; CLAUDE.md (the header line + the Map entry), `responsive.md` § Leads on the move, UAT chapter 28 (16 steps, workbook 540).
  Nothing committed. Next module (his Q-08): Projects.
- 19:10 — **his call after seeing it: the lead's page back as it was** — "I want the leads details page to be like earlier … now it has a lot
  of back and forth levels to move around. It was fine for quotes but not for leads and projects." **L1's Lead screen reverted (REG-2734):**
  L1's own hunks taken back out file by file (`git apply -R` of each file's piece of `rl-build/L1/tracked.patch`, which kept L2's window
  changes in `overview.tsx` intact) — `app/leads/[id]/*`, `components/leads/detail/*`, `detail-skeleton` · `detail-tab-skeleton` = `f85e0e94`;
  `components/leads/screen/*`, `lib/leads/next-step.ts` (its `dayWhen` moved to `components/leads/log/log-plan.ts`) and `screen-facts.ts`
  deleted; `maison-fab` keeps only the touch-tablet rule; a card head's link at 14 on touch kept (REG-2670). Probes: `rl-l1` retired; L1's
  hunks reversed in ux-p1 · rq-k4 · dane P5a · P5b, rl-fixes back to its base; `rl-l2` now reaches the log sheet through Notes › New › Contact
  Log and the moves through the header's button, the LEAD STAGES card and `?move=`; pm2-s43e's strip check of the lead's Meetings tab back.
  Pixel check against `f85e0e94` on the same data: the Overview and Quotes at 390 and every page at 1440 identical; at 768 · 1024 only the
  Maison AI button (the tablet rule) and REG-2670's head link differ (Questionnaire differs by L4's own change). UAT ch28 rewritten (15
  steps, workbook 539). B-06 (the QUOTES card's step labels breaking inside words on a tablet) returns with the earlier page — a fix on the
  page itself is his call. Memory: `record-pages-keep-their-tabs` — Projects on the move keeps its page and tab strip.
