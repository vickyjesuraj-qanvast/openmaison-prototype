# The close-out round, resumed (2026-10-31): the landing

Vicky's ask on 2026-10-28: "fix all of this once for all … I don't want anything to be pending." It resumed on 2026-10-31 while Yash
read the Wave 0 message. Its scope was the calm build's *Next build* list in `../calls-for-vicky.md` (C-04 · C-07 · C-08 · C-122 · C-43 ·
C-123 · dash-d1), plus the bug "Found on the way" in `../removed-list.md`: a signed quote could still change its template from the Preview.

Four worktree packages built it from `fe9b2b05` (the contract is `brief.md`). Each package's own record is `P1.md` … `P4.md`; its staged
rows are `P1-reg.md` … `P4-reg.md`; the numbers they took are in `reg-map.txt` (REG-3422…3441). REG-3442 is the orchestrator's: the ⌘K
row for Deleted comparisons. Shots are in `design-source/verify/ui-audit-build/shots/close-out-2026-10-31/P1…P4/`.

## What landed

| Package | Calls | Rows |
|---|---|---|
| P1 · data and the signed quote | C-04 a restore moves the days a signed copy prints and makes its fingerprint again (`lib/db/demo-fingerprints.ts`, R180) · C-07 the demo's Default Quote reads as the Letter style (R181) · a signed quote keeps its template (`keepsItsTemplate`; the action refuses, the Preview offers no picker) | REG-3422…3427 |
| P2 · X-Ray's soft delete | C-08 `quote_comparisons.deleted_at` (migration **0116**), Delete with Undo, the Deleted comparisons sheet, every read skips deleted rows, Activity's branch | REG-3428…3432 |
| P3 · the Price book's words | C-122 "My Items" / "My Sections" → Items / Sections inside the Price book, "the Price book" elsewhere; ⌘K keeps the old words | REG-3433…3435 |
| P4 · Activity, C-123, the Dashboard ghost | C-43 Activity's chips → one "Show: All ▾" pill · C-123 the contract header's title, the library editors' meta row, `TextField hideLabel` · dash-d1 the Your day ghost carries the row actions the page drew | REG-3436…3441 |
| Orchestrator | ⌘K row "Deleted comparisons" (`/quote-x-ray?deleted=1`), hidden for Marketing and Accounting as the other Deleted rows are | REG-3442 |

`fixtures/baseline.json` was taken again from a scratch DB (migrate → restore → repair → snapshot; never local.db): the copies R180 mends
and the design R181 brings are part of the base.

## Checks on the combined tree

- `npx tsc --noEmit -p .`: clean.
- eslint: only the three `react-hooks/purity` errors `quote-editor.tsx` already had at `fe9b2b05`.
- `npm run design:lint`: nothing above the baseline.
- The guard (`design-source/verify/ui-audit-build/guard.mjs`, against the calm build's before-snapshot): none gone except
  `testid:library-meta`, which REG-3438 removes on purpose with the editors' second meta row.
- The repair on a fresh restore: every check passes, R180's and R181's included.

## The regression (156 probes, a fresh scratch base, one production build)

First run: 150 green, 6 red. None of the six came from this round's code. The probes were restated to the same rule, each line marked
`(the close-out round 2026-10-31…)`, and run again:

| Probe | What failed | Why | Restated |
|---|---|---|---|
| pm2-s02 | a Draft contract's card | the card says "still preparing this contract" since C-52 (REG-3411); the line kept "agreement" | to "contract" |
| rc-c3 | Accept and sign opens the sheet | the sheet's head is "Accept the contract" since C-52; two locators kept "agreement" | to "contract" |
| rwd-w5 | (crash) the client's small links | the quote view's back link reads "← Contract" since C-52; the locator looked for "Agreement" | read by its handle `sign-quote-back` |
| pm2-s44r | the completion letter's last defects day | on the 31st, 18 months on is 30 April (the letter is right); the probe's `setMonth` rolled into May | the month's last day held |
| rwd-w2 | the client's meeting link: the place is 44 tall | the probe took the earliest planned meeting (10 AM), which reads as held in the afternoon, with no place | the first planned meeting with a place still an hour ahead |
| dash-d4 | "Prepare me for …" leads the three | the dock offers a meeting for half an hour after it starts; the probe's "next" began at now | the dock's window |

The three C-52 lines were stale at `fe9b2b05` already. C-52's commit (`86a97c7c`) restated their messages but not their locators.

**One real defect, fixed (REG-3443).** dash-d4's third red check ("the meeting row's ⋮ holds Prepare me for this meeting") failed at
every hour. Replayed by hand, after a Maison AI answer was folded with Esc, the field kept the focus. The next press anywhere let go of
the field, the band came to rest and the suggestions left. The page's end lost their 40 px, and scrolled to its end, the page moved 30 px
under the pointer, so the click landed on the row and not its ⋮. The dock now comes to rest, and folds its answers, only once the press
has landed (`afterPress` and the pressing guard on every press, in `components/maison-ai/dock/maison-dock.tsx`). It was probably there
since the calm pass: the check only runs before 9:30 PM, so a late regression skipped it.

Rerun, on a build with the fix (2026-10-31, 3–5 PM): the six restated probes green (pm2-s02 107 · rc-c3 110 · rwd-w5 74 · pm2-s44r 82 ·
rwd-w2 83 · dash-d4 106), and the dock's other probes green on the fix (dash-d1 172 · dash-d2 150 · dash-d3 127 · dash-d5 53 · pm2-s10 107 ·
kb-r1 36 · kb-r2 29 · overlays 67). **156 / 156.**

## At landing

- `local.db` backed up, then migrated to 0116 and repaired at once (Vicky's `next dev` on :3000 reads it).
- Not `db:baseline`: the fixture was taken in the landing tree from a scratch DB.
