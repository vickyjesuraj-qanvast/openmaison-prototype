# S41b-4 · The Free plan's upgrade nudges — outcome (2026-10-14, lane A)

Found by the S41b data sweep (`s41b/sweep-data.md` § M-02, the `nudges/evaluate` · `nudges/claim` row and the `nudge_state` row): 1.0's PLG
line offers a Free studio an upgrade or a top-up at most once at a safe moment, from 17 triggers; 2.0 had the walls (S19's plan locks, the
out-of-credits sheet) but nothing offered an upgrade before a wall was hit. 1.0 read in full on `origin/deployment/plg` (64791f1, 9 Oct):
`docs/rules/upgrade-nudges.md`, `docs/superpowers/specs/2026-09-25-plg-upgrade-triggers-design.md` (§1–§6, D3–D20), the plan
`docs/superpowers/plans/2026-09-28-plg-upgrade-triggers.md` (its decisions D1–D20), `src/lib/nudges/{catalogue,decide,facts,eligibility,state,
service,copy,price,days,activity,safe-moment,modal-lane,block-trigger,client}.ts`, `src/hooks/use-nudge-engine.ts`, `src/components/nudges/
{nudge-dialog,nudge-provider}.tsx`, `src/context/nudge-context.tsx`, `src/app/api/nudges/{evaluate,claim}/route.ts`, migration 432
(`nudge_state`), and the Free-plan branches of `src/components/credits/credit-blocked-dialog.tsx`.

**What it is in 2.0:** calm by design — an offer is **one quiet row in the Owner's bell**, written only at a safe moment, with its one way on
(See plans, or Buy AI credits) and Not now; never 1.0's modal, never on a client page, never over a dialog, never mid-edit. The moments 2.0
already answers (the lock card, the out-of-credits sheet) stay the answer — never two prompts for one moment. **The demo studio is on Pro, so
nothing shows in the demo until View as › Studio plan · Free** (S19's demo switch); then, ten quiet seconds on any studio page, Dane's bell gets
"You're a pro at this" (the demo's 70 AI credits since August), and the rest follow the rules below.

Register rows: `steps/reg-S41b4.md` (REG-S41b4.1…8). Probe: `design-source/verify/pending-modules/verify-pm2-s41b4.cjs` (**82 / 82** on the last build; every table put back as found);
shots in `design-source/verify/pending-modules/pm2-s41b4/` (5: the bell's offer at 1440, See plans over the page, the welcome sheet, the bell's
sheet at 390 and 320 touch).

## 1.0's 17 triggers — each one's status

| # | 1.0 (fires when · kind) | Status in 2.0 | Where |
| --- | --- | --- | --- |
| T1 | 5 active minutes, cumulative · proactive, once | **kept** — counting a member's active minutes is the telemetry her Q-16 declined (S39: "nothing in 2.0 records what a member opens"); T12 (a third day of work, read from records) and T11 carry the same pitch. `nudge_state.active_seconds` is ported (1.0's column) and stays 0 — one counter to add if she ever wants it | `lib/credits/nudge-model.ts` (out of `PROACTIVE`) |
| T2 | the studio's net AI-credit spend passes 50 · proactive, once | **built** — "You’re a pro at this" — "The studio has used {n} AI credits. Pro gives 1,500 AI credits a seat every month." (net = spends less refunds since the studio's start; a drift repair counts, 1.0's D17) | `lib/credits/nudges.ts` `loadFacts`, the bell |
| T3 | the second successful render · proactive, once | **built** — "Enjoying the AI Visualizer?" — "… about 150 renders each." (a render given back never counts; a drift repair is never a render) | same |
| T4 | the first quote read with at least one line · proactive, once | **built** — "One quote read. More to come?" — "… enough to read about 300 quotes." In 2.0 a read with no line is given back (S19), so an unrefunded `quote_digitize` IS a read with lines (1.0 needed `usage_events`, D5) | same |
| T5 | the first Quote X-Ray · proactive, once | **dropped by 1.0 itself** (X-Ray became Pro; an X-Ray press fires T6 / T17) — **answered** by S19's X-Ray lock (the lock in place, the lock card on its openers) | S19 |
| T6 | the Owner presses a Pro feature · blocking, every time | **answered** — S19's lock card (See plans; the trial named while it can be taken); **new:** it restarts the 10-minute gap, so no offer follows a lock (1.0's D4) | `components/credits/plan-lock-dialog.tsx` → `noteUpgradeMoment('T6')` |
| T7 | the balance falls from ≥ 20 to < 20 after a spend · lifecycle, repeats (re-arms back at 20) | **built** — "Only {n} AI credits left" — "Top up to keep going — 1,000 AI credits are S$20 and never expire." · **Buy AI credits** (the top-up on 1,000, 1.0's D11). Waits only for the gap, not the day's cap; leaves the bell when a top-up answers it | `lib/credits/nudges.ts`, `withdrawStaleOffers` (from `addTopUp`) |
| T8 | the welcome credits are gone · lifecycle, once | **built** — two homes, ONE moment: when they run out on a press, the out-of-credits sheet says it ("Welcome AI credits used up" + "Free gives the studio 30 AI credits a month. Pro gives 1,500 a seat.") and T8 is spent there (1.0's R8: T8 in place of T13, once); between presses, the bell row. 2.0 keeps welcome credits in the top-ups' bucket and they never expire (B-08): only spending them ends them (1.0's "reset at the first refresh" can't happen); never to a studio that bought a top-up (1.0's rule) | `app/credits/actions.ts` `spendAI` (`welcome`), `components/credits/credit-dialogs.tsx`, the bell |
| T9 | the studio gains its second active member · proactive, once | **built** — "Pro — Studio is made for teams" — "1,500 AI credits a seat every month — 3 seats from S$100 a month." (an invitation accepted by someone who uses the AI tools — S09's record; a re-activated member doesn't count, 1.0's D7) | same |
| T10 | a success in one tool on 2 different days · proactive, once | **built** — "Making the most of {the AI Visualizer · reading quotes · the Meeting Co-Pilot}?" | same |
| T11 | successes in 2 different tools · proactive, once | **built** — "Get more with Pro" — "1,500 AI credits a seat every month, with Quote X-Ray, your own quote templates and approvals." | same |
| T12 | active on a 3rd distinct day · proactive, once | **built from records** — the first look of a new day after two earlier days with the member's own acts (Studio health's `ACT_SOURCES`, S39 — 2.0 keeps no page views, her Q-16) — "Enjoying OpenMaison?" | same |
| T13 | the Owner tries AI work with 0 credits · blocking | **answered** — the out-of-credits sheet (Buy {n} and carry on · See plans); **new:** it restarts the gap | `credit-dialogs.tsx` → `noteUpgradeMoment('T13')` |
| T14 | the Owner tries AI work with too few · blocking | **answered** — the same sheet; restarts the gap | → `noteUpgradeMoment('T14')` |
| T15 | a member tries AI work with 0 · blocking | **answered** — the sheet's *Ask {Owner}* (2.0's real ask, in the Owner's bell — 1.0 only said "Contact your account owner") | S19 / REG-702 |
| T16 | a member tries AI work with too few · blocking | **answered** — the same | same |
| T17 | a member presses a Pro feature · blocking | **answered** — S19's lock card's *Ask {Owner} to upgrade* | S19 |

1.0's rules, each kept: R1 only on Free (a paid plan or a trial: none, and every live offer leaves the bell at once) · R2 the Owner only (1.0's
purchaser = S19's `mayChangePlan`; an Admin, a Designer, a Manager, Accounting are never looked at) · R3 spent when shown · R4 one proactive
offer a rolling 24 hours · R5 a safe moment · R6 one at a time (a new offer takes the older unanswered one's place) · R7 ten minutes between any
two, blocking moments restart it · R8 lifecycle before proactive, 1.0's priority T9 › T2 › T10 › T11 › T12 › T4 › T3, the others discarded ·
R9 events after the studio's start · R10 every show and answer on the record (`spent`, `answers_json` — no analytics layer, Q-16) · D13 the kill
switch `UPGRADE_NUDGES_DISABLED=1`.

## Pending lines ledger (the sweep's M-02 and its two rows)

| Line (word for word) | Status | Where |
| --- | --- | --- |
| "1.0's PLG upgrade triggers … on Free, `POST /api/nudges/evaluate` (a heartbeat with the member's active seconds) picks **at most one** offer from 17 triggers — e.g. a first render kept, a first quote read with lines, welcome credits ending, a teammate joined, the balance crossing a threshold, a second visit to a locked page" | **built** — one look = evaluate (the facts from 2.0's records, the decision, the watermark); every trigger's status in the table above; the heartbeat's active seconds **kept** (T1, Q-16). ("A second visit to a locked page" is not a 1.0 trigger — the sweep's paraphrase of T6; a locked page is S19's lock in place, its press T6) | `lib/credits/nudges.ts` `offerNow`, `lib/credits/nudge-model.ts` `decideNudge` |
| "`POST /api/nudges/claim` grants it atomically just before a dialog opens at a **safe moment** (no typing, nothing in flight, no other modal, never on the purchase pages, never over a held pointer)" | **built** — the claim is inside the same compare-and-set write as the look (the browser asks only at a safe moment, so there is nothing to hold); the safe moment is 1.0's list exactly (+ a live meeting, 1.0's `useBusyWhile`), and in 2.0 "opens" means a bell row, not a dialog | `components/credits/upgrade-offers.tsx` |
| "Once ever per trigger, one modal lane, a kill switch (`UPGRADE_NUDGES_DISABLED`)" | **built** — `ONCE_EVER`; one offer at a time; the kill switch | same |
| "Table `nudge_state` per member (`spent` triggers, `last_modal_at`, `last_proactive_at`, `active_seconds`, a compare-and-set `version`)" | **built** — 1.0's table under its own name, all its columns (+ `t7_last_shown_at`, `last_evaluated_at` from migration 432; + 2.0's `offer_id` · `offer_json` · `answers_json`), migration 0110 | `lib/db/schema.ts` `nudgeState` |
| "In 2.0 today … Nothing offers an upgrade before a wall is hit." · "Its 2.0 home. The credits store and host …, triggers read from records 2.0 already keeps (`credit_ledger`, `members`, the plan); per-member state as a table" | **built** as the sweep placed it — the engine beside the credits host in the shell, reading the credits store; facts from `credit_ledger`, `studio_credit_balances`, `studio_invitations`, `members`, `subscriptions` and the acts list | — |
| "Would a studio lose anything? No data; it is OpenMaison's conversion work. Her call whether 2.0 should nudge at all." | **built, calm, and flagged for her** — the orchestrator's brief asked for it in 2.0's shape; the studio can switch the notice off for everyone (Settings › Notifications › In app) and the Owner for themselves (Your notifications) | below, *Flags for Vicky* |
| `nudges/evaluate` POST (plg) · `nudges/claim` POST (plg) — **MISSING** (M-02) | **built** — `offerUpgradeNow` · `answerUpgradeOffer` · `undoPutAway` · `noteUpgradeMoment` (server actions; the member is always the signed-in one) | `app/credits/nudge-actions.ts` |
| `nudge_state` — **MISSING** with the feature (M-02) | **built** — migration 0110, baseline table, repair R124 | — |

## Found in 1.0, not on a card
- **1.0's analytics events** (`paywall_shown` · `paywall_dismissed` · `upgrade_clicked`, R10, `analytics-upgrade-funnel.test`) — 2.0 has no
  analytics layer (her Q-16); the record keeps each offer's show and answer (`spent`, `answers_json`) — the numbers a funnel would read. Kept.
- **The Free-plan block copy for T13 / T14** ("Top up to keep going, or upgrade to Pro for 1,500 AI credits per user monthly", Buy credits ·
  Upgrade to Pro) — 2.0's sheet already offers both ways (Buy {n} and carry on · See plans); unchanged.
- **Plan pre-selection** (Pro — Studio for T9 and teams, else Freelance) — 2.0's Plans already picks by team size (`suggestedPlan`); unchanged.
- **The trial label** ("Start 14-day free trial" while it can be taken) — 2.0 says "Pro starts with 14 days free." at the end of the offer
  while the studio can take its trial; the one press is See plans (Plans carries the trial).
- **`/upgrade`** — S41b-2 already redirects it to Plan & billing. Nothing for S41b.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **The bell, not a dialog** (the prompt's three pieces weighed per trigger): every offer is a bell row — the bell already carries the credits'
  other notices (running low, out, renewed, receipts, asks), never covers the page, isn't on a client page, and has the member's own mute.
  *The Dashboard's Needs you* — not used: it holds places that wait on you (S22's rule); an offer is not one, and a row there beside a bell row
  would be two prompts. *The credits card* — not used: on Free the rail's slot is Upgrade → Plans (REG-701), so the card is only the
  Visualizer chip's; it already sells top-ups to whoever opens it.
- **The safe moment is 1.0's, word for word** (tab in front and focused · nothing open · not typing · no press held · nothing in flight · ten
  quiet seconds after · not on the purchase pages), plus 2.0's menus and pickers (`role="menu"` · `"listbox"`) and a live meeting; one look
  a minute after that while the page stays quiet. Only in the shell — an editor's work (the Visualizer's renders) is offered on when the Owner
  is back on a studio page.
- **One look = evaluate + claim** in one compare-and-set write (the browser holds nothing, so 1.0's 10-minute offer TTL, D14, has no place).
- **The floor is the studio's start** (its first plan) — 1.0's R9 — so a studio that moves to Free (the demo's switch) is offered from its whole
  story: the demo's first offer is T2 (70 AI credits since August).
- **T8 lives where it happens** — on a press, the sheet (once); between presses, the bell.
- **Answered = gone**: See plans, Buy AI credits or Not now take the row out of the bell; Not now has Undo; a withdrawn offer (off Free, a
  top-up, a newer offer) leaves with no word.
- **In the app only**: the studio's table can't send it by email or WhatsApp, and the daily summary leaves it out (1.0 never sent one).
- **A trial ending: no offer** — 1.0 never nudged a trialing studio (R1: a trial keeps today's behaviour); 2.0's credits card already says "Pro
  trial · ends {date}. It carries on as Pro unless you cancel." Nothing added.
- **A live meeting holds the offers off** (1.0's `useBusyWhile(!sessionEnded)` on its Copilot): the meeting room calls `useBusyWhile(live)`.

## Found on the way, fixed
- **Your profile's ghost dropped every card under the signature by 5px** (the S18 probe's last ghost check, 62 / 63 on this lane before the
  fix — older than this step): S14 had made the face's bone a block, but the kit's `.bone { display: inline-block }` can load after
  `your-profile.module.css` in a production bundle and win at one class; doubled the class (`.faceBone.faceBone`, the house idiom) — the loader
  now draws the four cards where the page does (S18 probe 63 / 63).

## What to check in the browser (production build; 1440 and 390 touch)
- **Dane (Owner), Pro (the base):** nothing changes. Settings › Notifications lists "An offer to move to Pro" (The Owner; In app on; Email and
  WhatsApp off with "Offers stay in the app — never sent by email or WhatsApp"); Your profile › Your notifications lists it under AI credits and
  the plan.
- **View as › Studio plan › Free**, then any studio page, hands off for ~10 s: the bell's badge goes up by one; the bell's Notices: "You’re a pro
  at this" — "The studio has used 70 AI credits. Pro gives 1,500 AI credits a seat every month. Pro starts with 14 days free." · **See plans** ·
  **Not now**. Not now → "Put away — Plans are always one press away in Upgrade" · Undo brings it back. Ten minutes on nothing more; a day on,
  the next moment that happens (a render, a quote read, a teammate's first visit …).
- **Free, low:** render until the studio falls under 20 → "Only {n} AI credits left" · **Buy AI credits** opens the top-up on 1,000.
- **Free, nothing left and never bought a top-up** (a new studio from Sign up): a quote read → the sheet says "Welcome AI credits used up".
- **Never:** with a dialog, a menu or Plan & AI credits open, while typing, in a live meeting, on a client page, for Hui Min (Admin), Sarah or
  Germaine (Designers), Priya (Accounting), on Pro or a trial.
- **390 / 320 touch:** the phone bar's bell → the sheet; the offer row with its two answers; no sideways scroll.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0110 + repair R124) with `next start -p 3160` (lane A); :3160
stopped after; the build lock taken and released for each of the five builds. `npx tsc --noEmit -p .` clean · `npx eslint app components lib`
0 errors (16 warnings, none in a touched file) · `npm run design:lint` nothing new · `npx next build` green (its one warning, "Dynamic filesystem
access" on `restoreBaseline`, predates this step).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s41b4.cjs`** (this step, 15 sections) | **82 / 82** on the last build (78 / 78 and 81 / 81 on the two before; 74 / 76 the first time: "Add Lead" is a menu, which the engine did not yet count as open — fixed, `role="menu"` · `"listbox"` now hold the offers off, and the probe checks a menu and a dialog apart); page error log empty; every table put back |
| `pending-modules/verify-pm2-s19` (AI credits and plan locks — Free and Pro both) · `s16` (the shell) · `s22` (the Dashboard) | 116 / 116 · 56 / 56 · 116 / 116 |
| `pending-modules/verify-pm2-s18` (notifications, the mute, Your notifications' ghost) | **63 / 63** after the fix (62 / 63 before it: Your profile's ghost 5px off — older than this step, see *Found on the way, fixed*) |
| Regression lane (`regression/run.cjs` 3160, `RUN_DIR` holding the repaired base as `base.db`): `cr-r1 · cr-r3 · cr-r4 · cr-r5 · fixes720` (AI credits) | 59 / 59 · 40 / 40 · 41 / 41 · 16 / 16 · 38 / 38 |
| … `view-as` (the plan switch) · `overlays` (the house heads and feet) · `kb-r1` (+ its kb-r2) | 23 / 23 · 67 / 67 · 35 / 35 (29 / 29) |
| … `st-r1 · st-r2 · st-r3` (Settings, Notifications' table) · `sw-r4` (the bell, the sweep's S4) | 57 / 57 · 30 / 30 · 30 / 30 · 35 / 35 |
| … `ghosts-same` (1440) · `ghosts-same-390` (touch) — run twice, before and after the profile fix | 67 / 67 · 67 / 67 |
| `npm run design:anatomy` on :3160 | all 1749 measures hold (88 pages, 278 table heads, 25 dialogs, 41 page menus) |
| The repair: twice on the base (R124 "nothing to mend — the studio is on pro_studio, no offer"; the tables' counts unchanged); a stray offer row on Pro is taken out ("1 offer row(s) with nothing behind them") | all checks pass |

## Migration and repair
- **Migration 0110 `s41b4_nudges`** (additive, schema-only, generated in the lane): `CREATE TABLE nudge_state` (member_id PK → members, spent,
  last_modal_at, last_proactive_at, t7_last_shown_at, last_evaluated_at, active_seconds, version, offer_id, offer_json, answers_json,
  created_at, updated_at). Regenerate at merge if main's numbering moved.
- **Repair R124** (lane A's range; R125 next): an upgrade offer in the bell is its record's live offer — rows nothing stands behind, or any
  offer while the studio is not on Free, leave; a record pointing at a gone row lets it go. Idempotent; on the base: "nothing to mend — the studio
  is on pro_studio, no offer". Three closing checks. `nudge_state` added to `BASELINE_TABLES` (`lib/db/baseline.ts`) and `TABLES`
  (`scripts/snapshot-baseline.ts`) — the base has no row (the demo is on Pro); Reset to base clears every offer.

## Files
- **New:** `lib/credits/nudge-model.ts` (pure: the catalogue, `decideNudge`, `offerWords`), `lib/credits/nudges.ts` (server: audience, facts,
  `offerNow`, `answerOffer`, `restoreOffer`, `noteMoment`, `welcomeEndsNow`, `withdrawStaleOffers`, `liveOffer`), `app/credits/nudge-actions.ts`,
  `components/credits/upgrade-offers.tsx` (the safe-moment engine + `useBusyWhile`), `drizzle/0110_s41b4_nudges.sql` + `meta/0110_snapshot.json`
  (+ the journal's entry), the probe + `pm2-s41b4/*.png`, `steps/reg-S41b4.md`, `steps/outcome-S41b4.md`.
- **Changed:** `lib/db/schema.ts` (`nudgeState`), `lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R124 +
  checks); `lib/notifications/model.ts` (`upgrade_offer`, `IN_APP_ONLY`, `FeedRow.offer`), `lib/notifications/personal.ts` (its place),
  `lib/notifications/queries.ts` (`fetchFeed` attaches the live offer, drops any other), `lib/notifications/summary.ts` (in-app-only kinds out),
  `app/settings/notifications-settings.tsx` (the in-app-only switches, Message wording skips it); `components/shell/notifications-panel.tsx`
  (the offer's acts); `components/shell/app-shell.tsx` (mounts the engine); `lib/credits/model.ts` (`Refusal.welcome`), `app/credits/actions.ts`
  (`spendAI` flags T8), `lib/credits/ledger.ts` (`changePlan` · `addTopUp` withdraw), `components/credits/credit-dialogs.tsx` (T8's words, the
  gap), `components/credits/plan-lock-dialog.tsx` (the gap); `components/meetings/room/meeting-room.tsx` (`useBusyWhile(live)`);
  `components/profile/your-profile.module.css` (the ghost's face bone, found on the way).

## Shared pieces changed
- `components/shell/app-shell.tsx`: mounts `<UpgradeOffers />` (renders nothing; runs only for the Owner of a studio on Free).
- `components/shell/notifications-panel.tsx`: a row may carry `offer` acts (the approvals' `.acts` and text buttons — no new style).
- `lib/notifications/model.ts`: a new event key and `IN_APP_ONLY` (other lanes adding events: add theirs to `EVENTS`, `DEFAULT_RULES` and
  `EVENT_PLACE` as before — `IN_APP_ONLY` is opt-in).
- `components/credits/upgrade-offers.tsx` observes `window.fetch` (1.0's fetch probe): it counts server-action POSTs in flight and returns the
  original promise untouched.
- No `components/om/*` change, no `app/globals.css` change, no new CSS.

## Flags for Vicky
- **Whether 2.0 should nudge at all** (the sweep's question) — built calm: one bell row, Owner only, Free only, never over work; off for the
  studio in Settings › Notifications, off for the Owner on Your profile.
- **T1 not built** (five active minutes) — it needs counting active minutes, which your Q-16 declined.
- **The demo shows offers only on Free** (View as › Studio plan · Free); your own local.db is on Free (S19's note), so your :3000 will start
  offering once this lands — the first one is T2.
- **New words** (invented copy) — every offer's title and line, "Put away — Plans are always one press away in Upgrade", the event's label and
  help, the tooltip, the sheet's T8 title and line (all in `reg-S41b4.md`).

## For the next steps
- **S42:** a new long-running AI surface that isn't one request per result calls `useBusyWhile(true)` while it runs (as the meeting room does).
  A new purchase page joins `PURCHASE_PATHS` (`lib/credits/nudge-model.ts`).
- **S34 (real services):** offers stay in the app; a real analytics layer reads `nudge_state.spent` / `answers_json`.
- **The UAT** (orchestrator): a step under chapter 1 or the credits chapter — View as › Free, wait on a page, the bell's offer, Not now · Undo.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock; built from 1.0's rules on house pieces (the bell's row and acts, the snackbar's Undo,
   the existing sheet and lock card); every new word logged as invented copy in `reg-S41b4.md`.
2. **One system, no one-offs** — one catalogue and one decision (`nudge-model.ts`) read by the server, the probe and the words; the offer is a
   bell notice like every other (rules, mute, read state); its acts are the approvals' text buttons; no new style, `design:lint` holds.
3. **Plain words** — "Only 15 AI credits left", "Enjoying the AI Visualizer?", "Pro gives 1,500 AI credits a seat every month — about 150
   renders each.", "Put away — Plans are always one press away in Upgrade".
4. **Nothing is lost** — Not now has Undo (the same row back); nothing about the studio's work is touched; withdrawn offers keep their
   answer on the record.
5. **Say why** — each offer names the moment it comes from (the renders, the reads, the teammate, the balance); the in-app-only switches say
   why they can't be turned on; the sheet says why it shows the welcome line.
6. **Back returns where you came from** — nothing navigates: See plans and Buy AI credits open over the page, and close back to it.
7. **Every screen is whole** — no new page or loader; the bell's row loads with the bell; the page error log is empty (probe).
8. **Every width is designed** — the bell's sheet at 390 and 320 touch carries the row and both answers; no sideways scroll (probe).
9. **Tables follow the leads listing** — no table.
10. **Motion with purpose** — none added; nothing opens by itself (the badge is the only sign).
11. **Honest data** — every offer is backed by its record (`nudge_state.offer_id`, R124's checks) and by the facts that made it (the
    ledger's spends, the invitation, the acts); the demo starts with none and R124 keeps it so.
12. **Reach for everyone** — the offer's row and its two answers are buttons in the bell's tab order; the bell's names and the badge's count
    are unchanged; nothing depends on hover.
- **How to add a missing thing** — one home (the bell), shown only when it applies (Free, the Owner, the moment), no filled button added
  (text buttons in the row), defaults that need no set-up (on for Free studios, off by the studio's switch or the Owner's mute).
