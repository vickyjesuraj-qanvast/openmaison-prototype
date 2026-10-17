# Building the pending 1.0 modules — the rules every step follows (2026-10-11)

The owner (Vicky, the product designer) read the report of every 1.0 module 2.0 still lacks
(https://claude.ai/artifact/7n3K1CGpos9YKSZJuPycwy — 41 cards; sources in `design-source/context/parity/29-pending-modules-2026-10-11/`:
`surveys/*.json` hold each card's readers' findings, `compile.py` how cards were merged) and said: **"build all of them but one after the other.
So start from the order once finished pickup other. I want you to absolutely build as per 2.0 from 1.0 without losing anything. Make sure
everything is built in a right way."** One step at a time; you build ONE step (your prompt names it and its section in `steps.md`).

## Read first
1. Your step in `design-source/context/parity/30-pending-modules-build-2026-10-11/steps.md`, then its card(s) in the report data
   (`design-source/context/parity/29-pending-modules-2026-10-11/surveys/*.json` — find the keys `steps.md` names; `pending` is the work, its lines
   say who decided each hold and whether to keep or revisit). Open 1.0's code for every item (`/Users/vicky/Documents/GitHub/qanvast-id-tool`,
   the card's `v1_code`): build the job 1.0 did, in 2.0's shape — never 1.0's screens.
2. `CLAUDE.md` (How we work · Stack & conventions · the Map — find every place you will touch), `AGENTS.md`'s house-piece rules,
   `DESIGN-PRINCIPLES.md`, `design-source/context/page-checklist.md`, and the REG rows named in comments near what you change
   (`design-source/REGISTER.md`). The record of the last build is `design-source/context/parity/28-projects-finance-parity-map-2026-10-10/`
   (`build/brief.md` — its "How to add a missing thing" rules apply here word for word).

## How to add a missing thing (her ask: the right way — best UX, least cognitive load, intuitive)
1. **One home, where people already look.** Join an existing surface (a row, a panel, a ⋮, the list that holds its kind, a Settings card) before
   adding a page; a new page only when the module is a page in its own right (the Dashboard, Meetings, the Marketplace). Doors elsewhere open it
   with `?from=`, never a copy. Check `lib/company/sections.ts` and the rail before adding a rail item.
2. **Shown only when it applies.** **One filled button per row** = the next step. Red only for "late, and ours to fix".
3. **Defaults need no set-up**: the demo works as it is; a studio that never opens the new setting loses nothing.
4. **House pieces and house words only** (`components/om/*`, the listing's table model, `CostPanel`, the lead's components given a prop, the ghost
   kit — every loader and reveal draws the page as it now looks, REG-708). ≤767: menus / popovers / panels / form modals are bottom sheets. Every
   remove answers with one sentence + Undo; a refusal answers `{ error: <rule> }` and says why in the row; an optimistic write puts the value back
   when refused; a dialog closes only once its save lands; WhatsApp opens on the press; long strings travel inside one object argument; `data-kb`
   on what a key presses (REG-711…717); tokens only (`npm run design:lint` must hold — never raise its baseline).
5. **AI and real services stay honest.** Nothing calls a model or a real provider. Where 1.0 used a model, answer from the records by rule
   (as Maison AI's Ask box does, `lib/maison-ai/`), priced through AI credits if 1.0 charged; where a real service is needed (sign-in, SMS, email,
   storage, payments, Xero, an image model) build the screen and the record on an honest stand-in and say so in the outcome — never a fake success.
6. **Decisions.** Where a card asks the owner something, take the recommendation written on the card (or the obvious, smallest, most 2.0-like
   answer) and record it in your register rows as "as recommended — her 'build all of them' 2026-10-11". Her standing holds are lifted for the
   cards she now asked to build (the Dashboard, Meetings, regions…), each in its own step.

## Rules for the step
- You are the only builder running. You MAY run `npx next build`, `next start` on **port 3160 only** (kill it by port when done:
  `lsof -ti tcp:3160 -sTCP:LISTEN | xargs kill`), and your probe against a **scratch copy** of the demo DB:
  `cp /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/pbuild/base.db <scratchpad>/step.db`,
  then `npm run db:migrate` and `npm run db:repair` on it (`DATABASE_URL=file:<that path>` on the SAME command line), then
  `DATABASE_URL=file:<that path> npx next start -p 3160`. **Never write `local.db`; never touch ports 3000 / 3001.**
- Schema: additive migrations only (`npm run db:generate -- --name <step>`; add new tables to `BASELINE_TABLES` in `lib/db/baseline.ts` AND
  `TABLES` in `scripts/snapshot-baseline.ts`). Demo data: an idempotent block in `scripts/repair-demo-data.ts` (the next free R number, with its
  checks in the closing list) — every visible state backed by its records (REG-343).
- Checks before you finish: `npx tsc --noEmit -p .`, `npx eslint app components lib`, `npm run design:lint`, a production build, YOUR probe green,
  and every existing probe your change could touch (grep `design-source/verify/**/*.cjs` for the strings, test ids, addresses and layouts you
  change; update an assertion only for a deliberate change, commented `(pending modules, a deliberate change of this rule)`; run the ones you
  touched). Shots at 1440 and 390 (`isMobile: true, hasTouch: true`; measure sideways overflow against `screen.width`, not `innerWidth`).
- Probe: `design-source/verify/pending-modules/verify-pm2-<step>.cjs` — the shape of `design-source/verify/parity-map-build/verify-pm-*.cjs`
  (args `<scratch.db> [shotDir] [base]`, env `BASE`, sqlite3 with `-cmd ".timeout 30000"`, refuses `local.db`, puts back what it changes,
  asserts rules not counts from another round, case-insensitive on uppercase captions, `textContent` for SVG text).
- Register: `design-source/context/parity/30-pending-modules-build-2026-10-11/steps/reg-<step>.md` as
  `| REG-<step>.1 | Area | **What** — why (her "build all of them" 2026-10-11; card key; decisions taken as recommended) … *(invented copy: …)* | user-directed |`.
  Don't edit `design-source/REGISTER.md` or `CLAUDE.md` (the orchestrator does).
- Outcome: `…/steps/outcome-<step>.md` — per pending line: built (files) · kept (why) · stand-in · not done (why); decisions taken; what to check
  in the browser (roles: Dane Owner, Hui Min Admin, Germaine / Michelle Designers, Priya Accounting — View as switches; 1440 / 390); probes run
  and their tallies; migration and repair numbers; anything the next steps should know. Final message: 10 lines + the outcome path.

## Her words for the overnight run (2026-10-11): "please make sure nothing is left buggy. Remember our core design principles and intuitive and best user experience definitions to be built by."
Before you write the outcome, review your step against **`DESIGN-PRINCIPLES.md`'s twelve principles** one by one — the mock wins and every
exception is written down · one system, no one-offs · plain words for studio people · nothing is lost · say why · Back returns where you came from
· every screen is whole (shell, ghost, empty state, error) · every width is designed (1440 · 1024 · 768 · 390 · 320) · tables follow the leads
listing · motion with purpose · honest data (every state backed by records) · reach for everyone (keyboard, focus, labels, contrast) — and the
"How to add a missing thing" rules above (one home, shown only when it applies, one filled button, defaults that need no set-up). Add a section
**"Principles check"** to your outcome with one line per principle: met (how) or not applicable. **Nothing buggy:** exercise every new press in
the browser on the production build (your probe does it), check the page error log is empty, check the ghost matches the page, check 390 and 320
for sideways overflow against `screen.width`, and fix what you find before you finish — don't hand back a known bug.

## Her words when the build went to two lanes (2026-10-12): "i don't want anything to be missed and absolutely bug free build and remember our core design principles and super good world-class user experience."
Two lanes changes the speed, never the bar. Before you hand back: every pending line on your card is built, kept with its reason, or a stand-in —
none silently dropped (list each in the outcome); every new press exercised on the production build; the page error log empty; ghosts match
their pages at 1440 and 390 touch; no sideways overflow at 390 / 320 against `screen.width`; every principle in DESIGN-PRINCIPLES.md answered in
the Principles check; and the experience is the simplest one that does the job — the fewest steps, plain words, one filled button, Undo, the
right default. If something is not world-class yet, fix it rather than note it.

## Lanes (from S18): you may be building in a lane copy of the repo, not the main tree
Your prompt names your **working directory** (a full copy of the repo) and your **port**. Work, build and probe ONLY there; never edit
`/Users/vicky/Documents/GitHub/openmaison-prototype` itself when your prompt gives you a lane. **Builds take the build lock**: run
`until mkdir /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/lanes/build.lock 2>/dev/null; do sleep 15; done; <your next build>; rmdir …/build.lock`
(always release it, also when the build fails — one build at a time saves the machine's memory). Generate your migration as usual inside your
lane (the orchestrator regenerates it in the main tree at merge — keep it additive and schema-only, or say in the outcome exactly what a
hand-written statement does). Use the repair numbers your prompt gives your lane. Another lane works in parallel on other modules: don't
restyle shared house pieces (`components/om/*`, the shell, `app/globals.css`) beyond what your card needs — if you must, say so in the outcome
under "Shared pieces changed".

## Her words 2026-10-12: "please make sure nothing left behind from 1.0 to 2.0"
Your outcome opens with a **Pending lines ledger**: every `pending` line of your card(s), word for word, each with one status — **built**
(where) · **kept** (the card's or her reason) · **stand-in** (what is honest about it) · **parked by her** — and no line without one. While you
read 1.0's code for your card, note anything in the same 1.0 folders that no card names (a page, an action, a column, a setting) under
**Found in 1.0, not on a card** — build it if it belongs to your module, else list it for S41b.
