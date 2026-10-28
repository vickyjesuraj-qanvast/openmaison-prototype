# Triage A — Dashboard, Maison AI, the bell, Tasks, the house timeline (2026-10-28)

Run dir `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-A`, port 3480, on the 01:28
build. **Pre-existing** is judged against the WIP base `17135077` (the calm build's starting point), not HEAD. The Dashboard redesign is
uncommitted in HEAD but committed in the WIP base, so files untracked in main are compared with `git show 17135077:<path> | diff - <path>`.

## Counts — the 34 failing checks on my list

| class | n |
|---|---|
| Stale (restated, same rule on the new words or place) | 21 |
| Cascade | 4 |
| Defect | 5 (4 fixed in A's source, needs rebuild · 1 requested from B) |
| Pre-existing | 4 (dane-p5b b-time, from data) |

Once dash-d5 stopped throwing, it ran six checks that had never been reached. All six were stale words, and all six are now restated and green.

## Every check

| probe | check | class | what I did | result |
|---|---|---|---|---|
| overlays | Delete Task confirm (`[data-kb="delete"]` not found) | **Defect** | Kevin Ng has one task, so ticking it selects all, and the bulk bar offers "Delete all". B2 changed the label from "Delete All" to "Delete all", but `detail-bulk-bar.tsx` still gives `data-kb="delete"` only to `/^Delete( All)?$/`. The ⌫ key handle on "Delete all" is lost, on the lead's Tasks and on /tasks. It's B's file, so I'm requesting the fix (below). | needs B's fix + rebuild |
| dane-p5b | b-time set a follow-up (`When*`) | **Pre-existing** | Repair R179 (Dane's day, the Dashboard redesign, 2026-10-26) seeds "Call Cheryl back about her budget", due today 16:30, on Cheryl Lim. So LEAD STAGES' Next follow-up row opens that task instead of the Set a follow-up dialog. The row's `onClick`, the `nextFollowUp` rule and the data are all unchanged since the WIP base (`git diff 17135077 -- fixtures/ scripts/repair-demo-data.ts` is empty). Left as it is. Suggested probe fix for Vicky: close R179's call first, or use a lead with no dated open task. | left (not this build's) |
| dane-p5b | b-time · g-weekday the Tasks tab shows the day and the time | Pre-existing (cascade) | follows the check above | left |
| dane-p5b | b-time panel keeps the time | Pre-existing (cascade) | follows the check above | left |
| dane-p5b | b-time table keeps the time | Pre-existing (cascade) | follows the check above | left |
| dane-p5b | b-newtask lead tab ("Add Task" under the table) | Stale | The desk's "+ Add Task" bar went (B2 1-11 · 2-13 · 2-19). Now: New task ▾ (`data-kb="create"`) › Blank task, which opens the same add row. | green |
| dane-p5b | g-tasktitle a cut title says itself in full on hover | Cascade | — | green |
| dane-p5b | g-tasktitle a title that fits shows no tooltip | Cascade | — | green |
| dane-p5b | b-newtask /tasks | Stale | the same New task ▾ › Blank task | green |
| dane-p5b | g-bell with a late Due row, Due comes first | Stale | B1's 1-20 (ledger: "The bell's Due rows — a group of their own (it led when anything was late) → one fold at the end … its late count on that line"). Restated on the new place: the notices lead, Due is last, and the fold's "· n late" equals the late rows once it is opened. | green (late 7 = 7) |
| dane-p5b | g-weekday the bell's late rows wear their day | Stale | Opens the fold first and reads the rows' own `[data-late]` (the fold line carries one too). | green |
| dane-p5b | phone 390 the bell's sheet opens with Due first while late | Stale | The same rule on the sheet: notices first, and the Due line says "· n late". (The "nothing late" check also opens the fold now, so it reads the rows too.) | green |
| dash-d3 | …the listing says the same number (-2 = 3) | Stale | The pill reads "Met · 3" (T-07, W-479; was "Met (3)"). Regex restated. The numbers agree. | green (3 = 3) |
| pm2-s22 | "Overdue follow-ups" lands on the listing's scope with the same number | Stale | "Label · n" pill, as above | green (2 = 2) |
| pm2-s22 | "Unassigned" … same number | Stale | as above | green (1 = 1) |
| dash-d5 | the probe threw — `Mark Confirmed` | Stale | B4's T-01 confirm reads `Mark “Confirmed”`. Restated. I also made the probe safer: one put-back covers 4a and 4b, so a throw in 4a still restores the quote, the seeded task and the items. | green |
| dash-d5 | put back as found (`tasks`) | Cascade | The throw skipped 4b's `finally`. The put-back above fixes it. | green |
| dash-d5 | *(revealed)* "n assigned, no outreach logged yet" | Stale | The Reports chip reads "4 not contacted yet" (B5; the same `awaitingOutreach` figure). | green (4 = 4) |
| dash-d5 | *(revealed)* Michelle's Needs you lists T-2026-002 "waiting on you" | Stale | B3's 3-37 · W-427 says "Your turn" | green |
| dash-d5 | *(revealed)* Reports › Health "Issues raised" | Stale | Since B5's 5-22 there are four tiles, with the rest under "Show all figures" (`health-all`). The fold is opened first. | green |
| dash-d5 | *(revealed)* the tasks card's head "1 task overdue" | Stale | The card is now "Open tasks" (B2 2-28, was MY TASKS). The probe reads it by `[data-card="my-work"]`. | green |
| dash-d5 | *(revealed)* its row "1 day overdue" | Stale | as above | green |
| dash-d5 | *(revealed)* Needs you's money row "due Fri 16 Oct" | Stale | The project's Needs your attention shows three rows, then "Show n more" (B3 3-07). It's opened first. | green |
| dash-d1 | 390t: every region stands where the page's does (needs +0/+20 and the rest shifted 20) | **Defect** | The ghost didn't drift; the page lost words. B4 spelled out `lib/templates/ago.ts` ("1d ago" → "1 day ago"). The Dashboard reads the bill's "recorded by Priya Tan 1d ago" with `/(\d+ min\|\d+h\|\d+d) ago/`, so the supplier bill row's caption lost "from Priya · 1 day ago" and the row got one line shorter than its ghost (150 → 130). I fixed the parser in `lib/dashboard/inbox-queries.ts` to read both forms. In the same file I fixed two more readings broken by B3's words: the More-time pane's "Asks to end" fact (`/end it (.+?),/` against the new meta "To end it Tue 3 Nov"), and the PO / invoice pane's byline ("· margin left on this work: 23.8%" left the year and colon in the byline). B1's old +24 on "day" is no longer there. | needs rebuild |
| pm2-s45a | an Owner's figures: Won · Owed to you · Profit · First response | Stale | B1 1-17 · §2: "Won in the last 90 days · To collect · Profit in October · First reply to new leads" | green |
| pm2-s45a | huimin | Stale | the same four | green |
| pm2-s45a | nurul | Stale | "Leads this week · First reply to new leads". The "no money" check is restated to the new Won label, so it still bites. | green |
| pm2-s45a | germaine | Stale | "Your commission to be paid" | green |
| pm2-s45a | james | Stale | as above | green |
| pm2-s45a | P-2026-004 Signed on … none "--" | Stale | B3 (T-08 · 5-48) uses the one empty mark "—". It's deliberate, not a defect, so no request to C. Source / Signed on / Value before GST are restated together. | green |
| pj-r6 | the bell "Overdue: INV-2026-006 · S$20,784.94" | Stale | The Due fold is opened first (1-20). The row's words are unchanged. | green |
| pj-r2 | the bell "Overdue: Electrical & plumbing" | Stale | The Due fold is opened first | green |
| pj-r2 | threw: `locator.innerText` timeout | Cascade | the late row was hidden under the fold | green |
| pj-gap-b | the team's bell carries "Commencement invoice is ready to send" | Stale | The Due fold is opened first | green |
| rwd-a | 320: the line 16 over its time 14 … | **Defect** | B1's 3-06 container rule (`@container om-timeline (max-width: 360px)` → time `caption-s` 12) was meant for a narrow card at a desk. It also reaches every phone feed, which is under 360 wide, so the time dropped from 14 to 12 against the ≤1024 scale (P-13: a value is never under 14 on a phone or a tablet). Fixed in `components/om/timeline.module.css`: the stacking stays at every width, and the 12 caption applies only at ≥1025. | needs rebuild |
| rwd-a | 390: the same | Defect | same fix | needs rebuild |
| rq-k5 | Activity reads 16 over 14 (16 · 12) | Defect | same fix (the Quote screen's trail uses the house timeline) | needs rebuild |
| pm2-s10 | Serena's brief has "Attach a client review" | Stale | B2 2-01: the lead's Overview keeps one brief card with one action, and every other brief action is a suggestion in the Maison AI sheet. The probe presses it in the card if it's there, else in the sheet, and reads the answer where it was pressed. | green |
| pm2-s10 | the Lost brief: "Remind me in a year" | Stale | as above. "Add to newsletter list" is still absent everywhere, and "…a task a year from now" passes on the sheet's proposal. | green |
| pm2-s10 | Accounting gets the books' own answer | Stale | Reports › Finance's tile reads "To collect" (§2; was Owed to you) | green |

**Green on the current build:** pj-r2 87/0 · pj-r6 82/0 · pj-gap-b 72/0 · pm2-s45a 158/0 · dash-d3 127/0 · pm2-s22 110/0 · pm2-s10 107/0 ·
dash-d5 53/0. dane-p5b is 41/4, and the 4 are the pre-existing b-time chain.
**Needs rebuild:** dash-d1 (390t), rwd-a (×2), rq-k5 (×1) for A's fixes, and overlays for B's fix.

## Requests for other areas

- **B** — `components/leads/tasks/detail-bulk-bar.tsx:58`:
  `data-kb={a.tone === 'danger' && /^Delete( All)?$/.test(a.label) ? 'delete' : undefined}` →
  `data-kb={a.tone === 'danger' && /^Delete( all)?$/i.test(a.label) ? 'delete' : undefined}`.
  B2's sentence case made "Delete All" read "Delete all", so the bulk bar's ⌫ handle (REG-713) is gone whenever every task is selected. overlays'
  "Delete Task confirm" fails on it. Optionally update the comments at lines 12 / CSS 28 ("Delete / Delete all").

## Defects (for Vicky)

1. **⌫ no longer presses "Delete all" in the tasks bulk bar** (lead's Tasks, /tasks). A word change dropped the key handle. Requested from B.
2. **The Dashboard lost words that other lanes' changes broke** (fixed in `lib/dashboard/inbox-queries.ts`):
   - a supplier bill waiting for approval lost "from Priya · 1 day ago" from its row;
   - the More-time Review pane lost its "Asks to end" fact;
   - the PO / invoice pane's byline showed the year and a stray colon.
   In each case the Dashboard reads another module's sentence, and B4 (`ago()`) and B3 (needs words) reworded those sentences. The lost caption is also what made dash-d1's 390 ghost check fail.
3. **The house timeline's time read 12 on phones** (the Quote screen's trail, any feed under 360 wide), where the scale says 14. B1's narrow-card rule reached phones. Fixed in `components/om/timeline.module.css`; at a desk it is unchanged.

Not a defect, noted: the Dashboard's More-time row now falls back to B3's own title ("Michelle asks for 1 week more on …", where B1's parser
wrote "1 more week"). Its caption now also carries B3's new meta, "Ryan D'Souza · To end it Tue 3 Nov". Nothing is lost, but the capital "To" sits mid-caption. That's for Vicky if he
minds.

## Staged register rows (visible fixes)

- REG-A.1 | The house timeline's small time caption (12) is a desk's alone; on a phone or a tablet a narrow feed's time stays 14 | the calm build's narrow-card rule (3-06) also reached every phone feed, under the P-13 scale's 14 | bug fix
- REG-A.2 | The Dashboard's Needs your attention: a supplier bill waiting for approval says who recorded it and when again ("from Priya · 1 day ago"); the More time pane says "Asks to end" again; a PO / invoice pane's byline reads "margin left on this work 23.8%" without the year | the build's new words in `ago()` (B4) and the projects' needs (B3) broke the Dashboard's readings of them | bug fix

## Files

- Source (A): `lib/dashboard/inbox-queries.ts`, `components/om/timeline.module.css`.
- Probes: `uat-dane-2026-10-01/P5b/verify-p5b.cjs`, `projects/verify-pj-r6.cjs`, `projects/verify-pj-r2.cjs`, `projects/verify-pj-gap-b.cjs`,
  `dashboard-2026-10-26/verify-dash-d3.cjs`, `dashboard-2026-10-26/verify-dash-d5.cjs`, `pending-modules/verify-pm2-s22.cjs`,
  `pending-modules/verify-pm2-s45a.cjs`, `pending-modules/verify-pm2-s10.cjs`. Each restatement is marked `(the calm UI build 2026-10-27, a deliberate change)`.

## Checks

- `npx tsc --noEmit -p .` clean.
- `npx eslint lib/dashboard/inbox-queries.ts` clean (the probes are eslint-ignored).
- `npm run design:lint`: nothing new.
- `node --check`: all nine probes pass.
- The guard: all four "none gone".
