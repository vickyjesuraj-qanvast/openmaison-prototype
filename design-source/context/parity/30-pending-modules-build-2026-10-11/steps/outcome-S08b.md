# S08b · The demo's credits month rides the demo day, and no write collision leaves the server holding the lock — outcome (2026-10-11)

Inserted by the orchestrator: S19's pending line of `held:ai-credits` ("the demo credits month riding the demo day on restore") moved forward,
plus the server-side lock leak S08's builder found. Both destabilised every probe. Register rows: `steps/reg-S08b.md` (REG-S08b.1…3). Probe:
`design-source/verify/pending-modules/verify-pm2-s08b.cjs` (**62 / 62**, twice back to back on one server); shots banked in
`design-source/verify/pending-modules/pm2-s08b/`. **No visible change**: no screen, word or motion changed.

## Per pending line

| Line | Result | Where |
| --- | --- | --- |
| The demo credits month rides the demo day **on restore** | **Built.** `restoreBaseline` moves the whole AI credits story by the **same whole days as open tasks** (REG-341). If the snapshot's own month had already ended by its demo day, it moves on to where R63 made it. A restore 40 days later reads the same: this month holds the showroom's Pro render · High, last month Kevin Ng's Fast renders, and the invoices carry their new months (INV-202610-0001 · INV-202611-0002) | `lib/credits/demo-month.ts` (pure: `DEMO_CREDIT_TIMES` · `reanchorDays` · `shiftCreditSnapshot` · `snapshotMonth` · `invoiceNumberAt` · `shiftAlertsValue` · `shiftPeriodRef`) · `lib/db/baseline.ts` (`creditShiftDays`; the result gains `creditDays`) |
| …**in the demo data**, so `pbuild/base.db` and the next baseline carry a month that holds their demo day | **Built.** Repair **R111** runs once the demo's month has ended. On today's base it moves the story 13 days: the month is now 23 Sep → 23 Oct, today is 18 days in, and INV-202608-0001 → INV-202609-0001. Guarded and idempotent (below) | `scripts/repair-demo-data.ts` R111 + 2 checks |
| The first page of any probe no longer rolls the month | **Built.** With the month holding today, Leads, Plan & AI credits and Plan & billing write nothing to the credits story and raise no "credits are in" bell row (probe §2). Across all 17 probe runs below, no database rolled its month | — |
| A write collision leaves `next start` holding the SQLite lock | **Fixed at the root.** Reproduced, then proved with the same harness: before the fix 6 of 12 checks failed, after it 12 of 12 pass (kept as the probe's §7) | `lib/db/local-file.ts` (new) · `lib/db/index.ts` · busy wait in `scripts/migrate.ts` · `repair-demo-data.ts` · `snapshot-baseline.ts` |

### The lock leak: what it was
Reproduced in three steps: the raw client, libsql-js on its own, then the server on :3160 with a `sqlite3` process holding the file.
1. libsql opens every local connection with **no busy timeout**. A statement that meets another process's lock fails at once with SQLITE_BUSY.
2. @libsql/client runs each statement through `prepare().run()`. libsql-js **never resets a statement that failed**, so the half-run statement
   stays active until the garbage collector finalizes it. SQLite then does one of two things:
   - It **stops auto-committing later writes on that connection**, because another writer is still in progress. This hits the client's main
     connection after a failed autocommit write or a failed `BEGIN IMMEDIATE`. The next "successful" writes keep the RESERVED lock and stay
     invisible to every other process. This is exactly the S08 case: a page's stamp collided with the probe's sqlite3, then sqlite3 got
     "database is locked" after 30 s.
   - After a COMMIT that failed on a reader and the ROLLBACK that follows, it only **downgrades to a read transaction**, so the
     transaction's own connection keeps a SHARED lock. The client never touches that connection again.
   On an idle server no GC runs, so the lock stays until the server restarts.

### The cure
- **Every connection waits up to 5 s for a lock** (`BUSY_WAIT_MS`, the client's `timeout`). A short write or read by another process is
  simply waited for (≈1.2 s against the harness's 1.5 s holds), so statements stop failing in the first place.
- **A transaction ends through exec** (`EndsCleanly`: COMMIT / ROLLBACK via `executeMultiple`). Exec finalizes its statement even when it
  fails, so a COMMIT that still meets a lock is truly rolled back. A rollback after SQLite already ended the transaction is a no-op, so the
  first error is the one reported (the client's own `rollback()` used to throw TRANSACTION_CLOSED over it).
- **A statement on the main connection that still fails on a lock replaces that connection** (`reconnect`) before the error goes on, so it
  can't poison the writes that follow.
- **`batch` runs on its own write transaction**, ended the same way. The client's own batch committed through `prepare().run()`, and its
  deferred mode would have to take the write lock half-way through, where SQLite refuses to wait.
- A remote libSQL database (Turso) gets its client back untouched.

Before / after on the harness:
- **Before:** the save was refused in 56 ms, the next write never landed (state_rev 0 → 0), sqlite3 was locked out, the month roll failed,
  and a COMMIT against a reader left the file locked.
- **After:** each waits and lands. A lock held for 7 s fails that one write after 5.4 s, and the next write lands. sqlite3 gets the file
  within 3 s after every case.

## Decisions taken (as recommended — the card; his "build all of them" 2026-10-11)
- **Whole days, not whole months, on restore.** It is the same shift as open tasks, and it keeps the story's shape exactly relative to today.
  A whole-month shift would put this month's charges after today on any restore before the month's anchor day. For example, on 11 Oct
  shifting R63's story one month puts the Pro render on 14 Oct.
- **Where the demo sits: 18 days into its month.** That is R63's own day (28 Sep inside 10 Sep → 10 Oct). The move is capped so nothing in
  the story lands after now (`reanchorDays`).
- **What moves.** Every stamp of the credits story moves: the plan's months, the ledger and its `period:` refs, the invoices, the checkouts,
  the asks, the monthly amounts, the alerts' month, and the credits bell and outbox rows. **Invoice numbers follow their month**: each keeps
  its running number, renamed through a placeholder and only when the new numbers stay unique.
- **The renders keep their own day; only their charges ride.** This is REG-341's rule (only open tasks ride, every other stamp stays). One
  consequence for Vicky to know: Usage › Activity can show a charge (e.g. "Pro render · High — Kitchen sketch — 27 Sep") later than that
  version's own day in the Visualizer (14 Sep). Moving the renders too would cascade into the Visualizer's versions, files, bell rows and
  client links. If he'd rather the charge and its render always share a day, that is a call for S19 / S20.
- **R111's guard: only R63's own shape ever moves, never a studio's real history.**
  - The current plan must be the one R63 wrote, recognised by its deterministic id `sid('credits','sub-pro')`. A studio's own plan, the
    app's plan change and View as › Studio plan · demo only all get random ids.
  - The balance's month must be that plan's period.
  - The month must have ended without the app rolling it. Any read rolls it, so an ended month means nobody has read it since.
  Otherwise R111 logs "the month ended on a plan that is not the demo’s — the app rolls it on its next read". Probe §5 checks this.
  **local.db** is on View as's Free plan (its own id, month 9 Oct → 9 Nov, current), so the orchestrator's after-step repair leaves his
  credits as they are.
- **The busy wait is 5 s** (better-sqlite3's default). libsql waits synchronously, so a server stalls only while another process holds the
  lock. Before this fix, the same moment was an instant failure that poisoned the connection.

## What to check in the browser (production build; no visible change)
- **Dane (Owner), 1440:** Company › Plan & AI credits reads "Period: This month · 23 Sep – 23 Oct". It shows 11,610 left (refreshes 23 Oct,
  in 12 days), "Used · this month 20 · 1 render · about S$0.40 at the top-up price · 60% vs the month before". By tool lists Pro render ·
  High; Activity shows the charge on 27 Sep and the new plan's credits on 23 Sep. **Last month** lists Render · Fast and By lead Kevin Ng.
  **Plan & billing** lists INV-202609-0001 (the top-up, 2 Sep) and INV-202609-0002 (Pro — Studio · 7 seats, 23 Sep). Shots:
  `pm2-s08b/01…03`.
- **390 / 320:** the same page, no sideways scroll (`04-plan-usage-390.png`).
- **Sarah (Designer):** her own usage, as before (cr-r4).
- **Reset prototype** (Maison AI) after the orchestrator re-takes the baseline: the credits month holds the day of the reset.

## Probes run
Each ran on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair with R111) with `next start -p 3160`; :3160 was
stopped after. Static checks:
- `npx tsc --noEmit -p .`: clean.
- `npx eslint app components lib`: 0 errors. The 17 warnings are older files'; this step's files lint clean.
- `npm run design:lint`: nothing new.
- `npx next build`: green. Its one warning, "Dynamic filesystem access" on `restoreBaseline`'s `readFile`, predates this step.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s08b.cjs`** (this step, 7 sections) | **62 / 62**, twice back to back on one server. The server's DB was as found, there were no page errors, and the only server-log errors are the deliberate 7 s hold's refused write |
| the lock harness before the fix (the 19:01 build, same scenarios) | 6 / 12 (the six failures above) |
| `ai-credits/verify-cr-r1 · r3 · r4 · r5.cjs` | 59 / 59 · 40 / 40 · **41 / 41** (its 4 month-dependent checks failed before) · 16 / 16 |
| `ai-credits/owner-fixes-2026-09-28/verify-fixes-720.cjs` | 38 / 38 |
| `ai-visualizer/verify-viz-studio.cjs` (Generate charges credits) | 37 / 37 |
| `view-as/verify-view-as.cjs` (Studio plan · demo only) | 23 / 23 |
| `projects/verify-pj-gap-f2.cjs` (excludes credit% bell rows) | 84 / 84 |
| `pending-modules/verify-pm2-s01…s08.cjs` | 79 / 79 · 105 / 105 · 79 / 79 · 82 / 82 · 113 / 113 · 83 / 83 · 89 / 89 · 70 / 70 |
| `npm run design:anatomy` (on the scratch `next start`, :3160) | all 1578 measures hold (73 pages, 24 dialogs) |

Across all 17 runs: no "database is locked" in any server log, and no month roll (`credits_renewed` = 0 on every database). The month end
was 23 Oct everywhere except cr-r1 and cr-r5, whose own Plans checkout changes the plan.

No existing assertion needed changing.

## Migration and repair
- **No migration.** No schema change and no new table, so the baseline lists are unchanged.
- **Repair R111** (above) and **two checks**:
  - the demo's month has ended, so the first page would roll it;
  - a credits ledger row is dated after now.
  Full repair: all checks pass. Run twice, the database is unchanged, except for one pre-existing, deliberate re-stamp: the three seeded quote
  templates' `last_used_at` moves relative to the run on every repair, so "used n days ago" keeps reading the same. The probe compares
  without that column.
- **For the orchestrator:** after this step, `after-step.sh` repairs `pbuild/base.db` (R111 moves it 13 days) and re-takes
  `fixtures/baseline.json` from it. Until then the current fixture is stale (its month ended 10 Oct), but `restoreBaseline` re-anchors a
  stale fixture itself (probe §6).

## For the next steps
- **Probes:** the first page no longer writes the credits roll. A page's own write now waits for a probe's sqlite3 and lands, and the
  server never keeps the file. The "open one page and wait" habit is harmless but no longer needed for these two reasons.
- **Server actions:** the API is unchanged. `db.transaction` and `client.batch` keep their signatures. A statement may wait up to 5 s on
  another process's lock, and a lock held longer fails that one statement cleanly. A transaction's connection is still closed only by GC
  (@libsql/client's own design), but it now holds no lock after it ends.
- **Residual, rare:** a statement inside a write transaction that meets a reader holding the file for more than 5 s mid-transaction (only on
  a page-cache spill) could still leave a SHARED lock until GC.
- **S19 (AI credits):** the "demo credits month riding the demo day" line is done. Plan locks, auto top-up and one price for digitizing
  remain. The charge vs render day question above is S19 / S20's to raise with Vicky if he wants it.
- **CLAUDE.md's Map (the orchestrator's):**
  - the AI credits entry gains `lib/credits/demo-month.ts`, R111 and `restoreBaseline`'s `creditShiftDays`;
  - `lib/db/local-file.ts` (`guardLocalFile` · `BUSY_WAIT_MS`) is the local-file rule;
  - the steps notes' "being fixed in S08b" becomes "fixed in S08b".

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down.** Not applicable: no visible change. The data and DB decisions are in REG-S08b.1…3.
2. **One system, no one-offs.**
   - Restore and repair share one definition of the credits story (`DEMO_CREDIT_TIMES`, `reanchorDays`).
   - One client rule covers every server-side connection to a local file (`guardLocalFile`), and the scripts share its `BUSY_WAIT_MS`.
3. **Plain words.** Not applicable on screen. The repair's log lines say what moved ("moved 13 days: the month is now 23 Sep → 23 Oct").
4. **Nothing is lost.**
   - Before this fix, a write after a collision could silently never commit. Now every write either lands or fails with its error.
   - The credits story keeps its shape: the buckets, the balance equal to its ledger, every row moved by the same days.
5. **Say why.** A refused write returns its error to the existing house handling (`Couldn’t …`). The repair says why it moved nothing ("the
   month ended on a plan that is not the demo’s").
6. **Back returns where you came from.** Not applicable.
7. **Every screen is whole.**
   - No screen changed.
   - Plan & AI credits now shows its curated state (this month and last month both carry AI work) instead of an empty rolled month.
8. **Every width is designed.** Not applicable (no layout change). Plan & AI credits was re-checked at 1440, 390 and 320: no sideways scroll
   against `screen.width`.
9. **Tables follow the leads listing.** Not applicable.
10. **Motion with purpose.** Not applicable.
11. **Honest data.**
    - Every state the credits pages show is backed by records that agree: the period, the ledger sum, invoice numbers matching their months,
      refresh refs naming their boundary, nothing dated after now (probe §1, §4, §6).
    - The one stated trade-off: charges ride the demo day while renders keep theirs (REG-341's rule), written down for Vicky.
12. **Reach for everyone.** Not applicable (no UI).

**How to add a missing thing:** one home (the credits story's rule lives in one pure module, used by restore and repair) · shown only when it
applies (R111 acts only when the demo's month has ended, on R63's own shape) · one filled button (not applicable) · defaults that need no
set-up (no setting; a fresh clone, a reset and a repaired base all read mid-month by themselves).
