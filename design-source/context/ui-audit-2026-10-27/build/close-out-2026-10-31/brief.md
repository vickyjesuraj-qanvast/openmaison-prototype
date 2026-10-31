# The close-out round, resumed (2026-10-31): the last open builds

Vicky (he/him) is the product designer and owns the repo. He asked on 2026-10-28: "fix all of this once for all … I don't want anything to
be pending." That round stopped at the week's usage limit, with nothing half-done in the tree. Main is now `fe9b2b05`, clean.

The open work is *Next build* in `design-source/context/ui-audit-2026-10-27/build/calls-for-vicky.md`: C-04, C-07, C-08, C-122, C-43, C-123
and dash-d1 (C-52 and C-88 are done). Add to it the bug "Found on the way" in `design-source/context/ui-audit-2026-10-27/build/removed-list.md`:
a signed quote can still change its template from the Preview. Read your calls' paragraphs in `calls-for-vicky.md`, then the rows they
cite in `changes-for-developers.md`; grep the IDs.

## Where you work

- You each have **your own git worktree**, on branch `close-2026-10-31/<P>` from `fe9b2b05`, with node_modules and `.env.local` already
  there: `/Users/vicky/Documents/GitHub/op-close-<P>`.
- Edit **only there**. Never edit `/Users/vicky/Documents/GitHub/openmaison-prototype`. Vicky's `next dev` on :3000 runs from that folder.
- **Leave your changes uncommitted.** The orchestrator lands each worktree's diff into main, builds once, runs the regression and commits.
- Your scratch DB is `/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/close/<P>/lane.db`. It is the curated base,
  migrated to 0115. Copy it before a run that writes.
- Your record folder is `/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/close/<P>/`.

## Rules (as the calm build's)

- Read `design-source/context/ui-audit-2026-10-27/build/brief.md` §1–§2, and `CLAUDE.md` › *How we work*. The build's words: sentence case,
  plain, "New {thing}", Members, Client.
- **Nothing a studio can do or see is lost.** Every route, slug, query key, `data-testid` / `data-kb`, server action call and shortcut is
  kept, unless the call itself is the change.
- Reuse `components/om/*`. Use `--om-*` tokens only. No hand-rolled dialogs, menus or table heads. Make an override order-proof with a
  doubled class `.x.x`, never `!important`.
- **Migrations:** additive only, generated with `npm run db:generate` in your worktree. Never run one against
  `/Users/vicky/Documents/GitHub/openmaison-prototype/local.db`. Migrate your lane DB with `DATABASE_URL=file:<lane.db> npm run db:migrate`.
  The orchestrator migrates `local.db` at landing, after a backup.
- **Seeing the screen.** You may run `next dev` in **your own worktree**:
  ```
  DATABASE_URL=file:<your lane.db copy> npx next dev -p <port>
  ```
  Put the DB on the same command. Ports: P1 3481 · P2 3482 · P3 3483 · P4 3484. Take screenshots with Playwright into your record
  folder's `shots/` (1440×1024, and 390×844 with `isMobile: true, hasTouch: true`). Stop the server **by its port only**:
  `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`. Never touch 3000 or 3001. Never run `next build`; the orchestrator builds once.
- Checks you may run:
  - pure scripts against a scratch DB;
  - `npx tsc --noEmit -p .`;
  - `npx eslint <files>`;
  - `npm run design:lint` (never edit its baseline);
  - the guard, from your worktree:
    ```
    node design-source/verify/ui-audit-build/guard.mjs snap . <record>/g.json && node design-source/verify/ui-audit-build/guard.mjs diff /Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/guard-before.json <record>/g.json
    ```
    It must say "none gone". The only exception is a handle your call renames on purpose; name it in your record.
- **Probes.**
  - When your change makes a probe stale, restate it to the same rule and mark the line `(the close-out round 2026-10-31, a deliberate
    change)`. Never weaken or delete a check.
  - A new feature gets its checks in the probe that already covers its area.
  - Run `node --check` on each probe you edit.
  - Find your area's probes with `grep -rl` under `design-source/verify/`. The regression's list is
    `design-source/verify/regression/probes.cjs`.
  - You may run one probe against your own `next dev` when it reads `BASE` / a port argument. Check `probes.cjs` for its arguments.
- Never commit. Never edit `CLAUDE.md`, `design-source/REGISTER.md` or `design-lint.baseline.json`.

## Packages: edit only your own files

- **P1 · data and the signed quote**
  - **C-04:** a restore moves the date inside the demo's signed contracts (`lib/db/demo-day.ts` `EMBEDDED`, `lib/db/time-columns.ts`,
    `scripts/restore-baseline.ts`).
  - **C-07:** a repair brings the demo's Default Quote design to the Letter style's words: "Quotation", no "Fax:", no
    "Gst {gst_rate}:". Use `scripts/repair-demo-data.ts` with a new rule after the last one, and `lib/templates/presets.ts` only if needed.
    The repair must be idempotent and end with its verification query.
  - **The signed quote's template:**
    - `setQuoteTemplate` in `app/company/templates-actions.ts` refuses a signed quote with `{ error: <the rule> }`. Use the same signed
      test the Template card uses.
    - The quote Preview no longer offers the picker on a signed quote, the same way the editor's Template card stopped offering Change.
    - Files: `components/quotes/preview/*` and the action.
  - Your landing note says whether `npm run db:baseline` must be re-run (C-04 / C-07 change seeded data).
- **P2 · C-08 X-Ray's soft delete**
  - `quote_comparisons.deleted_at` (`lib/db/schema.ts`, that one column, plus its generated migration).
  - Delete with Undo, and a **Deleted comparisons** sheet built like the house Deleted sheets (Deleted Quotes / Contracts: selection, bulk
    bar, restore, delete forever, retry). Use `LibraryDeletedSheet` or the Deleted Quotes sheet's pattern; don't hand-roll.
  - Every read skips deleted rows.
  - The Activity branch in `lib/leads/activity.ts` (only the comparison branch).
  - Who may delete stays `lib/xray/policy.ts`. A lead's Delete forever still takes its readings.
  - Files: `lib/xray/**`, `components/xray/**`, `app/quote-x-ray/**`, and the X-Ray probes (`verify-xr-r*`, the X-Ray rows of others).
- **P3 · C-122 "My Items" / "My Sections" → "Items" / "Sections"**
  - Change every screen sentence that names the library: Price book, the quote editor's snackbars and menus, the Add Item list, empty
    states, export words, and ⌘K's labels.
  - ⌘K **keeps the old words as search words** (`lib/global-search/model.ts`), so typing "my items" still finds it.
  - Code names, routes, slugs, testids and stored values stay. Where "Items" alone would be unclear in a sentence, say "the Price book's
    items".
  - Restate the probes that read the old words (~114 lines).
  - Files: wherever the words live, except P1's, P2's and P4's.
- **P4 · Activity, C-123, the Dashboard ghost**
  - **C-43:** a lead's and a project's Activity — the type chips become one "Show: All ▾" scope pill (the house `ScopePill`,
    `components/om/scope-pill.tsx`, as Files / the galleries use it). Same filter, same counts in its menu, same query key if there is one.
    Restate `ux-p3` and the Activity probes. Files: `components/leads/activity/**`, the project Activity body, `lib/leads/activity-glyph*`.
  - **C-123:** for each of the three, look at the screen first (run your dev server), then build or close it with the reason:
    - the contract header's editable title;
    - the four library editors' meta row;
    - a `TextField hideLabel` mode for table cells.

    Files: whatever each needs, except P1's / P3's. If a string there says "My Items", leave it to P3.
  - **dash-d1:** the Dashboard's Your day ghost after a meeting's time (the 390 ghost is 24px taller than the page). Read
    `design-source/verify/dashboard-2026-10-26/verify-dash-d1.cjs`. Decide whether the ghost reads the seed, i.e. whether a meeting still
    has its Directions line. Files: `components/dashboard/cards/*` (Your day and its ghost), `lib/dashboard/*`, `lib/ghost-shapes.server.ts`.

## Record

- `close/<P>/<P>.md`:
  - what you built;
  - each call's outcome (built / closed, and why);
  - files changed;
  - probes touched;
  - check results (tsc, eslint, design:lint, the guard);
  - shots.
- `close/<P>/<P>-reg.md`: register rows staged as `| REG-<P>.n | area | **what** — why (C-nn) | user-directed / bug fix |`.

## Final reply, short

- per call: built / closed (why);
- files;
- probes;
- checks;
- anything the orchestrator must do at landing (migrate `local.db`, `db:baseline`, etc.).
