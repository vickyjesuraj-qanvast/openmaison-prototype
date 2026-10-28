# The calm UI build — closing regression triage (2026-10-28)

The calm UI build (a visual / words / UX pass over the whole app; Vicky's rule: **no feature or functionality lost — only visual and UX**)
is landed in main, uncommitted. The closing regression ran on one production build of main (built 01:28) against a fresh base:
60 of 156 probes are red, 141 failed checks. Most are probes still pressing or reading the old words / places; some may be real defects
the build introduced. Your job is to settle every failing check in the probes you are given, one by one.

## Read first

- `design-source/context/ui-audit-2026-10-27/build/brief.md`: §1, the nothing-lost rules, and §2, the decided vocabulary.
- The lanes' records in `design-source/context/ui-audit-2026-10-27/build/outcome-{b1…b6,x,y}.md`. Each one's §2 is the ledger of what
  moved where, §3 is its words and §8 is its calls. To find which lane changed a thing, grep these and run `git diff HEAD -- <file>`.
- Each failing check's line: `.claude/calm-build/reg/run/failures.txt`. The full probe log is `.claude/calm-build/reg/run/lanes/<id>/probe.log`,
  shots are in `…/lanes/<id>/shots/`, and the probe ids map to files in `design-source/verify/regression/probes.cjs`.

## Classify every failing check: exactly one of these

1. **Stale: the build moved or renamed something on purpose.** Restate the check in the probe file so that it asserts the **same rule**
   on the new words or path. Mark the line with `(the calm UI build 2026-10-27, a deliberate change)`. Never delete a check, weaken
   what it proves, or widen a regex until it can't fail. If a control moved into a menu, open the menu and press the row. If the
   handle still exists, prefer it over words.
2. **Cascade: an earlier step failed and the rest followed.** Fix the first, then judge the rest on the re-run.
3. **Defect: the build broke or lost something** (a feature gone, a style lost, a ghost drifted from its page, a count that no longer
   matches). Fix the **source**, minimally and by the brief's rules, in files your area owns (below). If the fix belongs in another
   area's files, don't edit them: write the exact change in your record as a request. A lost feature is the worst outcome: bring it back.
4. **Pre-existing or clock: not this build's.** It fails the same way without the build's changes. Show it, e.g. `git diff HEAD` on the
   code involved is empty, or the date logic depends on the hour. Leave it, and say why.

When in doubt between Stale and Defect, ask: **can a studio still do and see everything it could before?** If yes, it is stale.

## Ownership: you may edit only these

- **Probe files:** only the probes on your list. A helper shared with another probe can be edited only if no other agent's probe uses it;
  otherwise write a local copy in your probe.
- **Source:** only your area's prefixes. Ownership is first-match by prefix, as in `.claude/calm-build/ownership.json`:
  - **A**: `components/dashboard/` `lib/dashboard/` `app/dashboard/` `components/maison-ai/` `lib/maison-ai/` `components/shell/notifications*`
    `lib/notifications/` `components/tasks/` `app/tasks/` `components/om/timeline*` `lib/leads/activity-glyph*`
  - **F**: every other path B1 owns (the shell, the rail, ⌘K `lib/global-search/`, `components/om/*` except the timeline, profile,
    sign-in, view-as, `lib/studio-health`, `lib/credits` UI that isn't B5's), and B6's prefixes (site, tools)
  - **B**: B2's prefixes (leads, meetings, qanvast, hangouts)
  - **C**: B3's (projects, portal, tickets, chat, invoice, receipt)
  - **D**: B4's (quotes, contracts, templates, price book, sign, confirm)
  - **E**: B5's (company, settings, finance, reports, credits, po)

## Verify on the current build, never a new one

**Never run `next build` or `next dev`.** Main's `.next` is shared by every agent, and Vicky's own `next dev` runs from this folder.
Never touch ports 3000 or 3001. The current build is from 01:28, so it holds every source change made before then. Your source fixes
are not in it; mark those checks "needs rebuild", and the orchestrator rebuilds once after all agents report.

- Make your own run dir once: `mkdir -p <RUN> && cp .claude/calm-build/reg/run/{base,empty,noleads}.db <RUN>/`, with
  `<RUN>=/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-<letter>`.
  Outside the repo, so probes that climb `../../..` find the repo.
- Run a probe:
  ```
  cd /Users/vicky/Documents/GitHub/openmaison-prototype && env RUN_DIR=<RUN> CRON_SECRET=probe-cron CRON=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa bash .claude/calm-build/heavy.sh probes node design-source/verify/regression/run.cjs <your port> <id>
  ```
  Then read `<RUN>/summary.txt` and `<RUN>/lanes/<id>/probe.log`. pm2-s41 / s44o also need `OPENMAISON_DEV_PREVIEWS=1 BENCH=on`.
- `heavy.sh` queues runs machine-wide (4 at a time), so a wait is normal. Kill a server only by its port:
  `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`.
- The base was restored at 01:24. A "today" moment that has passed since then is a clock failure, not a defect; say so.

## Checks before you hand back

- `npx tsc --noEmit -p .` is clean. Errors in files you didn't touch may be another agent mid-edit; re-run once.
- `npx eslint <files you touched>` adds no errors.
- `npm run design:lint` reports nothing new. Never edit `design-lint.baseline.json`.
- `node --check` passes on every probe you edited.
- The guard:
  ```
  node design-source/verify/ui-audit-build/guard.mjs snap . <RUN>/guard.json && node design-source/verify/ui-audit-build/guard.mjs diff .claude/calm-build/guard-before.json <RUN>/guard.json
  ```
  All four lines must say "none gone".

**Never:** write `local.db`, commit, edit `CLAUDE.md`, `design-source/REGISTER.md` or `design-lint.baseline.json`.

## Record

`/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/fix/<letter>.md`:

- one row per failing check: probe · check · class (Stale / Cascade / Defect / Pre-existing) · what you did · result
  (green on the current build / needs rebuild / left, with why);
- requests for other areas, with exact changes;
- every Defect, plainly, since these go to Vicky;
- staged register rows for any visible fix, as `REG-<letter>.n | what | why | bug fix`.

Final reply, short:
- counts per class;
- probes now green;
- checks needing a rebuild;
- defects found;
- requests for other areas;
- check results.
