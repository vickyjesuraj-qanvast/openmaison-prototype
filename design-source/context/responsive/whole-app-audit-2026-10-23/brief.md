# The whole-app responsiveness audit and its fixes — the contract for every lane (2026-10-23, overnight)

**His ask (2026-10-23, 23:20):** "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your
recommendations. I am going to sleep now." — every call is the orchestrator's recommendation; nothing is committed (he commits).

**His rule from the same evening, which every lane keeps:** "I want the leads details page to be like earlier … now it has a lot of back and
forth levels to move around. It was fine for quotes but not for leads and projects." → **a record with tabs (a lead, a project) stays one page
with its tab strip at every width — never a summary screen, never a screen per tab, never a new level.** The Quote screen and the Contract
screen (≤1024) stand as he approved them (REG-2540…2654). This round **fixes defects inside the layouts that exist**; it does not redesign.

## 1 · What is a defect here (fix it)
At **320 · 390 (touch) · 768 upright (touch) · 1024 sideways (touch) · 844×390 (a phone held sideways, touch) · 1280×800 (a mouse)**:
- the page scrolls sideways; a control, a value or a card runs off the screen or under the edge;
- text cut without an ellipsis, a word broken inside itself, two things drawn on top of each other, a label wrapping into a control;
- a control covered — at rest or at the page's end — by a pinned bar, the dock, the Maison AI button, a sticky head, a snackbar, a sheet's foot;
- a touch target under 44 on a side under a finger (REG-273 · REG-312) — grow the house way: the house IconButton's centred box, a DS Button's
  `min-height`, padding on a row; **never** `button::after { inset … }` (lint `icon-button-overlay`);
- a phone's text input under 16px (iOS zooms the page on focus) — the house `TextField` / `SearchBar` first;
- a menu, popover, picker, dialog, sheet or drawer that opens off-screen, taller than the screen without its own scroll, under another layer,
  or whose foot sits under the dock / the home indicator; a nested dialog under its sheet;
- a table that squeezes its columns instead of scrolling sideways in its own frame (the listing's model, REG-430);
- a chart, image, canvas or iframe that overflows its card; a sticky element that hides what it should sit above;
- a loader ghost that does not draw the page's shape at that width (REG-708);
- 1280: anything the desk's mock assumed 1440 for that overflows or overlaps at 1280.

## 2 · Not a defect (leave it, or list it for him)
- Sizes, words and layouts from a mock or the owner's Claude Design mobile canvas (e.g. the phone dock's 10px labels, a 12px eyebrow);
  every decision in `design-source/REGISTER.md` (search the REG named in the nearby comment before you change anything).
- **B-06** (the lead Overview's QUOTES card step labels breaking inside words on a tablet) is held for him — a design call; list it, don't fix.
- Anything that needs a new screen, a new level, a new flow or new words beyond the minimum a fix needs — write it under "For Vicky" instead.

## 3 · Rules
- **≥1440 is byte-identical** on every page you touch (pixel-diff before/after on your lane; `sharp` is in the repo). A fix for 1280 must not
  change 1440 (scope it `@media (max-width: 1439px)` or make it a no-op where there is room). ≤1024 fixes live in ≤1024 media queries or touch
  queries (`(hover: none)`); REG-307's touch query list for targets.
- House pieces only (`components/om/*`, the DS through `@/components/ds`), `--om-*` tokens, no copied stylesheets, no hand-rolled heads, closes,
  feet, menus or table heads. `npm run design:lint` never rises; `npx tsc --noEmit -p .` clean; `npx eslint app components lib` = the three
  known quote-editor errors only; the production build green.
- **Ownership** (§4): change only your files. A defect in a house piece or another lane's file → "For other lanes" in your outcome, with the
  exact fix; the orchestrator lands it. **Never touch the Floorplan session's files**: `app/floorplan-3d/**`, `components/floorplan-3d/**`,
  `lib/floorplan-3d/**`, `public/floorplan-3d/**`, `scripts/floorplan-3d/**`, `scripts/planner/plan-paper.mts`, `scripts/planner/floor-plan-photo.mts`,
  `components/shell/tools-popover.*`, `components/planner/home/planner-home.tsx`, `lib/planner/copy.ts`, `lib/global-search/model.ts`,
  `lib/links/old-addresses.ts`, `lib/services/registry.ts` · `slots.ts`, `FROM-1.0-TO-2.0.md`, `design-source/verify/floorplan-3d/**`.
- Data: never write any `local.db`; your lane's DB is a scratch copy (`DATABASE_URL=file:<lane.db>` on the same command). No migrations.
- Desk behaviour, words and flows unchanged. A fix that changes what a person reads (a word) is invented copy — keep it to the minimum and name it.

## 4 · Lanes and ownership
| lane | port | owns |
| --- | --- | --- |
| **W1** house + shell + the public / account pages | 3201 | `components/om/**`, `components/shell/**` (but `tools-popover.*`), `components/ds/**`, `app/globals.css`, `app/layout.tsx`, `lib/breakpoint.ts`, `app/profile/**`, `app/sign-in/**`, `app/sign-up/**`, `app/join/**`, `app/site/**`, `components/site/**`, `app/not-found.tsx` |
| **W2** leads + the day's work | 3202 | `app/leads/**`, `components/leads/**`, `app/tasks/**`, `components/tasks/**`, `app/tickets/**`, `app/chat/**`, `components/chat/**`, `components/messages/**`, `app/dashboard/**`, `components/dashboard/**`, `app/meetings/**`, `components/meetings/**`, `app/meeting/**`, `app/qanvast-ops/**`, `components/qanvast/**`, `app/hangout/**` |
| **W3** projects + the client portal + the client's money links | 3203 | `app/projects/**`, `app/(editor)/projects/**`, `components/projects/**`, `app/my/**`, `components/portal/**`, `app/compliance/**`, `components/compliance/**`, `app/invoice/**`, `app/receipt/**`, `app/po/**`, `app/f/**`, `app/space/**`, `app/renders/**` |
| **W4** Company + Settings + Finance + Reports + the template editors | 3204 | `app/company/**`, `components/company/**`, `app/settings/**`, `components/finance/**`, `app/(editor)/templates/**`, `components/templates/**`, `components/credits/**` |
| **W5** the tools: quotes, contracts, X-Ray, Visualizer, Planner, Marketplace, Market Insights, the signing / confirm / view links | 3205 | `app/quotes/**`, `app/(editor)/quotes/**`, `components/quotes/**`, `app/contracts/**`, `app/(editor)/contracts/**`, `components/contracts/**`, `app/sign/**`, `app/confirm/**`, `app/quote/**`, `app/quote-x-ray/**`, `components/xray/**`, `app/visualizer/**`, `app/(editor)/visualizer/**`, `components/visualizer/**`, `app/planner/**`, `app/(editor)/planner/**`, `components/planner/**` (but `home/planner-home.tsx`), `app/marketplace/**`, `components/marketplace/**`, `app/market-insights/**`, `components/market-insights/**` |
A route nobody owns → W1. Lists that share a house table: the lane owns the page; the table core is W1's.

## 5 · How a lane works
1. **Set-up once** from your worktree: `bash /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rwd-all/setup-lane.sh <W>`
   (main's uncommitted state committed as your "WIP base", `node_modules`, `.env.local`, `…/rwd-all/<W>/lane.db` = a fresh restore of the demo).
   Builds take the lock: `until mkdir …/scratchpad/rwd-all/build.lock 2>/dev/null; do sleep 15; done; DATABASE_URL=file:<lane.db> npx next build; rmdir …/build.lock`
   (always release it; run builds in the background). Your port: W1 3201 … W5 3205; stop it by port only.
2. **Read the sweep** — `…/rwd-all/out/sweep.json` (every route × width: sideways · offscreen · covered · target · tiny · zoom · clipped) and
   its shots `…/rwd-all/out/shots/<width>-<route>.png` (+ `--end` at the page's end) — for your routes, then **look at every page you own at
   every width yourself**, and open what a person opens there: each ⋮, New ▾, filter, column settings, sort, row menu, dialog, sheet, drawer,
   picker, the tab strip, the bulk bar, a form's errors, the empty state, the ghost (`?__ghost` is not a thing — hold the reveal as
   `design-source/verify/pending-modules/verify-pm2-s17.cjs` does). The sweep is a start, not the list.
3. **Write the audit first** — `design-source/context/responsive/whole-app-audit-2026-10-23/audit-<w>.md`: a table `| id | page · width | what a
   person sees | severity (blocker · major · minor) | the fix |`, ids `<W>-nn`. Then fix every one you own; list the rest.
4. **Verify** each fix by a real tap (touch) / click (mouse) on the production build, shots in `…/rwd-all/<W>/shots/`; the 1440 pixel diff of
   every page you touched; 320 and 844×390 for no sideways scroll.
5. **Deliver** — `outcome-<w>.md` (ledger: each id built where · kept why · not done why; ▲ decisions for him; shared pieces changed; For other
   lanes; the 1440 comparison; tallies; a Principles check one line per principle of `DESIGN-PRINCIPLES.md`), staged register rows
   `reg-<w>.md` (`| REG-<W>.n | Area | **What** — why (his "overall responsiveness audit … based on your recommendations", 2026-10-23) | bug fix |`),
   and a probe `design-source/verify/responsive-all/verify-rwd-<w>.cjs` (args `<scratch.db> [shotDir] [base]`, env `BASE`, refuses `local.db`,
   puts back what it writes, REPO from `process.cwd()`, sqlite3 with `-cmd ".timeout 30000"`, asserts rules not counts, real taps). Run your
   probe and every existing probe your files reach through the harness (`design-source/verify/regression/run.cjs`, `probes.cjs`; RUN_DIR with a
   `base.db` copied from your lane's clean DB). Update an existing assertion only for a deliberate change, commented
   `(responsive audit 2026-10-23, a deliberate change of this rule)`.
6. **His bar:** nothing missed, nothing buggy, every pixel checked, the simplest fix that does the job. If it is not right yet, fix it.

Final message: 10 lines + the outcome path + the files you changed or added.
