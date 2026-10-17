# S42 · Fix packages — the brief every fixer follows (2026-10-14)

Her words (2026-10-12): "it will be good to build rest of the things like, bug fixes, intuitiveness, world-class ux" · "i don't want anything
to be missed and absolutely bug free build and remember our core design principles and super good world-class user experience". The read-only
audit (`s42/audit-brief.md`) walked everything the programme built, in five areas; each area's findings are in `s42/audit-<area>.md`. You
fix ONE area's findings (your prompt names it: package **S42<area>**) in ONE lane.

## Read first
1. `s42/audit-<area>.md` — every finding, its evidence, its recommended fix; its *Carried notes* and *Calls for Vicky*.
2. `s42/calls-for-vicky.md` — the calls in your area are **fixed as recommended** (the programme's rule: take the recommendation, record it
   "as recommended — her 'build all of them' 2026-10-11; listed in s42/calls-for-vicky.md for her review"). She may overturn them later.
3. `brief.md` in this folder (every rule, incl. "How to add a missing thing" and the Lanes section), `DESIGN-PRINCIPLES.md`, `AGENTS.md`'s
   house-piece rules, `design-source/context/page-checklist.md`, CLAUDE.md's Map, and each step's `steps/outcome-SNN.md` for what you touch.

## What to do
- **Every finding in your file gets an answer**: fixed (the smallest change in 2.0's shape, on the house pieces), or not fixed with the reason
  (e.g. it is another area's — name the area; it needs her taste beyond the recommendation; it is wrong on a closer look — show why). A Blocker or
  Major is never left without a fix unless it is wrong. Read the code before trusting a finding's `file:line`; fix the cause, not the symptom,
  and look for the same fault in its siblings (the same rule in another page / action / role) — fix those too and say so.
- **A finding that crosses areas** (another area's files): fix only your side; name the other side in the outcome under "For other packages".
- **Visible changes** (anything a user sees or reads) get a register row in `steps/reg-S42<area>.md` as `| REG-S42<area>.1 | … |` — unnumbered,
  the same columns as the REGISTER (`| ID | Area | Decision | Source |`), source `bug fix` or `as recommended — S42 audit <ID>`; flag
  *(invented copy: "…")* for every new sentence.
- **Data:** never touch `/Users/vicky/Documents/GitHub/openmaison-prototype/local.db`. A data fix = a repair rule (your lane's numbers) that is
  idempotent and ends with a check; migrations additive only (rarely needed for fixes — say why if you add one).

## Verify (in your lane)
tsc · eslint (0 errors) · `npm run design:lint` (never raise its baseline) · a production build under the lock · your probe
`design-source/verify/pending-modules/verify-pm2-s42<area lower-case>.cjs` on your lane's port against a scratch copy of
`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/pbuild/base.db`
migrated + repaired with `DATABASE_URL=file:<that copy>` on the same command — one or more checks per fixed finding, asserting the rule (not a
count another step can change), at 1440 and 390 touch where the finding was about a width; then **every existing probe of the steps you
touched** (`design-source/verify/pending-modules/verify-pm2-sNN.cjs`, and the regression ids via `design-source/verify/regression/run.cjs` with
`RUN_DIR` and your port — `probes.cjs` lists their inputs). pm2-s41b3 and pm2-s34 need the server started with `CRON_SECRET=probe-cron
WHATSAPP_WEBHOOK_SECRET=probe-wa` and the probe given `CRON=probe-cron S34_CRON=probe-cron S34_WA=probe-wa`. A probe that breaks because your
fix changed a rule on purpose: update its assertion, with a comment naming the S42 finding. Shots of each visible fix at 1440 (and 390) into
`design-source/verify/pending-modules/pm2-s42<area lower-case>/`.

## Write
- `steps/outcome-S42<area>.md`: opens with a ledger — **every finding ID → fixed (file, one line how) / not fixed (why)**; then the calls fixed as
  recommended; "For other packages"; "Shared pieces changed" (house pieces, the shell, globals — the other lane must know); and a
  **Principles check** section (the twelve principles, one line each, against what you changed).
- `steps/reg-S42<area>.md` (rows as above) and the probe.
Don't commit. Final message: 10 lines — counts fixed / not fixed by severity, anything left and why, shared pieces changed, the outcome path.
