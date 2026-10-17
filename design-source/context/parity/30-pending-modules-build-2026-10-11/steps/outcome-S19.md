# S19 · AI credits and plans — outcome (2026-10-12, lane A)

Card: `held:ai-credits` (recommendation "needs her mocks / decision"; questions "Enforce the plan locks, or soften the comparison table?" ·
"Auto top-up: build or hold?" · "Does Accounting take a seat?" · "Should a VO digitize cost 5 credits like Upload a quote?"), every line taken
as the card and the credits audit recommended (her "build all of them" 2026-10-11; "go ahead and build it perfectly"). Carried notes taken:
**S08b** (charges ride with the demo day but renders kept their own day — decided and fixed, REG-S19.17), **S09** (seats are said, never
refused — kept; no lock was added on members), **S10** (chat is not metered — unchanged), **S11 / S12** (Upload my existing quote and reading
by rule charge nothing; Create Quote › Upload a quote charges 5 — unchanged; the two other quote reads now charge the same 5, REG-S19.15).
The demo credits month riding the demo day (S08b) was not redone.

1.0 read (branch `deployment/plg`, 2026-10-09): `docs/rules/plan-gating.md` + `docs/superpowers/specs/2026-09-27-plg-plan-gating-design.md`,
`src/lib/plan/features.ts` · `gated-routes.ts`, the Pro badge and locked panels, `sendWhatsAppNotification`'s gate; `src/lib/billing/topup.ts`
+ `src/components/credits/topup-amount-picker.tsx` + migration 428 `checkout_topup_credits_requested`; `src/app/api/billing/seats/route.ts` +
`src/components/billing/seat-dialog.tsx` · `seat-select.tsx` + `src/lib/billing/seats.ts` · `seat-pricing.ts` + migrations 415 · 451 and the
2026-10-01 seat-enforcement spec; `src/lib/credits/*` (schedule, issuance, usage). Register rows: `steps/reg-S19.md` (REG-S19.1…19). Probe:
`design-source/verify/pending-modules/verify-pm2-s19.cjs` (**116 / 116**, twice back to back on one server — a full `.dump` before and after the second run is identical; the server log clean); shots in `design-source/verify/pending-modules/pm2-s19/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Dodo checkout, the webhook grant, refresh and lapse jobs, Manage billing, tax invoices — stand-ins · as recommended (her 'go ahead and build it perfectly') · developers' lane" | **stand-in** (kept the developers') — the demo checkout still stands in for Dodo; every new purchase this step adds (an amount on the grid, an auto top-up, added seats) goes through the same checkout record and invoice rows, so a real provider replaces one place; every dialog says the prototype charges no card (the checkout's "no card is taken", the seats' and auto top-up's "no card is charged") | `app/credits/actions.ts` (`startTopUp` · `completeCheckout` · `changeSeats`), `lib/credits/ledger.ts` (`addTopUp` · `autoTopUp` · `setSeats` · the renewal in `ensurePeriod`) |
| "Plan feature locks — held as recommended (Q-40) · revisit: the in-app Plans table says Free lacks X-Ray, the template editor, approvals and 'Custom stage definitions' (2.0 has none), yet nothing locks; lock or soften it before demoing Free" | **built** — locked, as 1.0 does since 2026-09-28: the seven Pro features refused by the server on Free, a Pro tag on every opener, the lock card on a press, the lock in place of the pages that are the feature, approvals forced off when read, WhatsApp written never sent; nothing deleted, fail open, `PLAN_GATING_DISABLED=1`; the Plans table's rows now come from the plans' flags and say "Lead stage rules" (2.0's) and "My Sections (packages)" | REG-S19.1…11; `lib/credits/{features,plan-gate}.ts`, `components/credits/{pro-tag,plan-lock-dialog,pro-locked-ghost}.tsx`, `lib/credits/pricing-data.ts` |
| "Auto top-up with a monthly ceiling — held by the build although her mark said build (Q-36) · tell her" | **built** (her mark) — the Owner's switch on Plan & billing, three choices (the line, the amount, at most n a month), one top-up per crossing through the demo checkout record (`kind = 'auto_topup'`) with its invoice and a receipt in the bell, never twice, the ceiling said once a month; "no card is charged" said in the dialog. 1.0 has no auto top-up (it is 2.0's, from the audit's Q-36) — **told her here** | REG-S19.13; `lib/credits/auto-topup.ts`, `lib/credits/ledger.ts` `autoTopUp`, `app/credits/actions.ts` `setAutoTopUp`, `components/company/plan/{billing-view,auto-topup-dialog}.tsx` |
| "Seats checked against members; Accounting takes no seat (REG-1669) — held · a pricing call flagged for her" | **kept** (her hold; S09: seats are said, never refused; Accounting takes none) — and what the hold doesn't cover is **built**: 1.0's seat change (Change seats on Plan & billing and Members: more now, billed for the days left; fewer from the billing date, Undo) | REG-S19.14; `components/credits/seats-dialog.tsx`, `lib/credits/plans.ts` `proratedByDays`, `subscriptions.scheduled_seats` |
| "Digitizing a contractor's quote into a variation order is free while Upload a quote costs 5 (REG-1200) — package call · revisit: one price table" | **built** — one price: every quote read is 5 AI credits (`quote_digitize`), said before the press, keyed by the work, given back when the file can't be read: Create Quote › Upload a quote (as it was), a contractor's quote into a variation order, an uploaded quote into a schedule. Reading by rule stays free (S11 / S12), X-Ray stays free (1.0 never charged it) | REG-S19.15; `components/projects/money/vo-upload-dialog.tsx`, `components/projects/schedule/source-picker.tsx`, `app/projects/money-actions.ts`, `lib/projects/draft-variation.ts` |
| "Packs of 2,000 / 5,000, a '+200 this month' raise, a blocked render that runs itself, rollover, Draft quality, a manager seeing team usage, PayNow at checkout — held as recommended (keep 1.0) · keep" | **kept** (keep 1.0) — with one consequence: 1.0 itself moved from packs to **any amount from 100 to 5,000 in fifties at S$2 per 100** (2026-09-28), so keeping 1.0 **built that picker** (REG-S19.12); the other six stay as 1.0 has them (no raise, no auto-run, no rollover of the month, no Draft quality, the pool for Owners and Admins only, card only) | `components/credits/credit-dialogs.tsx` `TopUpDialog`, `components/credits/count-stepper.tsx`, `lib/credits/plans.ts` (`TOPUP_*` · `topupPrice` · `isTopupAmount` · `topupFor`), `billing_checkout_sessions.credits_requested` |
| "Maison AI on the Plan & AI credits pages — Coming soon · revisit: the answers are in the ledger" | **built in S10** (Maison AI's ask box answers from the ledger) — nothing new here | S10's outcome |
| "GST line at checkout — built; finance must confirm the words before go-live" | **kept** — built (REG-701's `gstLine`, on every new purchase too); the words still wait on finance | `lib/credits/chrome.ts` |
| "Since 2026-10-10 every Reset to base rolls the demo's credits month (two 'credits renewed' rows, empty 'this month') — her call: shift the period with the demo day, or accept" | **built in S08b** (the period shifts with the demo day) — not redone; S08b's leftover (renders kept their own day while their charges moved) **fixed here**: the paid work rides with its charges, R118 | REG-S19.17; `lib/credits/demo-month.ts`, `scripts/repair-demo-data.ts` R118, `lib/db/baseline.ts` |
| "Co-Pilot metering — waits for Meetings (REG-552)" | **kept** for S23 (lane B's Meetings): the price row `copilot_block` (25 a 10-minute block) is in the schedule; `chargeAI` takes any action key, so S23 charges `copilot_block` with a `meeting:<id>` ref — Usage's activity label needs a `meeting` branch in `refTargets` then | `lib/credits/schedule.ts`, `components/credits/credits-client.ts` `chargeAI`, `lib/credits/queries.ts` `refTargets` |

**Carried notes:** S08b's — **fixed** (REG-S19.17: a charge and its work are one moment; the smallest honest answer — the work moves with its
charges, the ledger is never rewritten); S09's — **kept** (no seat lock; the lock card names the plan's seats only in its price line); S10's —
**kept** (Messages are not metered); S11 / S12's — **kept** and extended to the two other quote reads.

**Found on the way, fixed:** a sheet that is only its header was read as one line called "Item" — and charged (REG-S19.16); Quote X-Ray's
intro ghost was 40px short of its card, so every block under it rose at the hand-off, and its setup ghost didn't stack full width at ≤1024
(REG-S19.11); the locked pages' loaders streamed the unlocked ghost on a cold load (the layouts now seed the plan's locks, REG-S19.11); Plan & billing's ghost drew its Billing details box 40px short on a phone (its facts weren't the page's `dt` / `dd`, REG-S19.11).

### Found in 1.0, not on a card
- **Flat issuance (1.0's R1, 2026-09-25): extra seats buy access, not AI credits** — 1.0's month is the plan's allowance, however many seats;
  2.0's is allowance × seats (credits integration A-01, Plans and the seat dialog say so). A pricing call — **flagged for Vicky, not built**.
- **Seat enforcement (1.0, 2026-10-01): adding a member past the seats is refused, with Add a seat** — 2.0 says the seats and never refuses
  (her hold, S09). Change seats is built; the refusal is not — **flagged** with the card's seat line.
- **Yearly plans grant twelve months at once in 1.0** — 2.0 issues monthly on every cycle (credits Q-43, decided). Kept 2.0's.
- **1.0's Free runs in 30-day cycles from sign-up** — 2.0's Free renews on the plan's period like Pro. Kept; noted for the developers' port.
- **1.0's seat picker is a select** (`seat-select.tsx`) — 2.0 uses the house stepper (Plans' own), never a long select.
- **`quote_xray` is priced 10 in 1.0's schedule but no route charges it** — X-Ray stays free in 2.0; **for S21** (the X-Ray card) to settle.
- **Approvals are opt-in on PLG** (1.0's six rules default off, so an upgrading studio keeps them off until the Owner turns them on) — 2.0's
  defaults are unchanged; Pro gives back exactly what the studio stored (1.0's read-time rule). Noted.
- **Pending approvals stay decidable on Free** (1.0's rule) — kept: only turning a rule on is refused; an approval already waiting can be
  answered.
- **The render drift repair** (1.0's re-render credit) — absorbed into the Visualizer's own 2.0 flow; **for S20**.
- **Billing alerts to the platform's Slack** — platform admin (excluded).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Lock, don't soften** (Q-40 revisited): 1.0 locks the seven features, the Plans table promised it, and a demo of Free should show it. The
  table now reads its rows from the same flags, so it can never promise a lock the app doesn't keep.
- **The lock explains itself, in place**: openers stay visible with the Pro tag (1.0's R32); a press opens one card that says what the feature
  does, that nothing is lost, and the one way on (See plans for the Owner, an ask for anyone else — 2.0's real ask, where 1.0 only said
  "Contact your account owner"); a page that is the feature shows the lock where its content was, with what is kept.
- **Approvals: off when read, never written** (1.0's rule) — the settings read off with the Pro tag (1.0 locks them the same way); a setter
  writes over the stored rules, never the forced ones, so Pro gives back exactly what the studio set; an approval already waiting can still be
  answered.
- **WhatsApp on Free: written, never sent** — a row in Sent messages with its reason (1.0 records a failed, never-retried row); a member's
  invitation still goes (it is how a seat gets used, and it isn't a notification).
- **Auto top-up: built**, Owner-only, off by default, at most n top-ups a month (the ceiling said as money), one top-up per crossing, the
  ceiling told once a month; a charge that would be refused tries the top-up first. Honest: no card is charged; each top-up is a checkout
  record with its invoice and receipt.
- **The top-up is 1.0's amount picker** (keep 1.0): 100–5,000 in fifties at S$2 per 100, starting on 1,000 (S$20, the old pack).
- **Seats: change, don't refuse** — her hold on the check stands; 1.0's change is built: more today, billed for the whole days left (the
  dialog and the invoice use one function); fewer from the billing date, nothing refunded, Undo.
- **One price for a quote read: 5** — the card's number, everywhere a quote file is read for the studio; refunded when unreadable.
- **The paid work rides with its charges** (S08b's note) — the smallest honest answer: move the work, never rewrite the ledger.

## What to check in the browser (production build; View as switches roles and the plan; 1440 and 390 touch)
- **Dane (Owner), Pro (the base)** — Company › Plan & AI credits › Plan & billing: "7 of 7 seats in use — …"; **Change seats** → More → "Today
  S$… for the n days left of this period …"; the press reads "Pay S$… and add a seat"; → "1 seat added — 8 seats on Pro — Studio"; Change
  seats → Fewer → "Change to 7 seats from {the billing date}" → "From {date} the studio has 7 seats" · Undo → "The studio keeps its 8 seats".
  **Auto top-up** → switch → the dialog's sentence "When AI credits fall under 500, add 1,000 (S$20) · at most once a month" → Turn on.
  **Buy AI credits** (the top-ups card) → 2,000 → the stepper to 2,050 → "S$41.00" → Complete demo payment → "2,050 AI credits added"; the
  bell's receipt; Usage › Activity's top-up row.
- **Dane, View as › Studio plan › Almost out** — with auto top-up on, a project's Money › New ▾ › Upload a contractor's quote → "XLSX · CSV
  · 5 AI credits" → pick a CSV → the balance is 1,010 (15 − 5 + 1,000); the bell: "Auto top-up · S$20.00"; Plan & billing: "This month: 1
  top-up · 1,000 AI credits · S$20". A schedule's *Use an uploaded quote* says its 5 too; a header-only CSV → "That file has no lines we could
  read — your 5 AI credits are back".
- **Dane, View as › Studio plan › Free** — Tools: Quote X-Ray wears Pro and opens the lock in place of its setup (Recent comparisons kept);
  a comparison opens to its frame and the lock; a lead's Quote X-Ray quick link and the quote editor's Compare open the lock card; the
  quote's Template card wears Pro (Change → the lock card); Company › Templates › Quotes is the lock; Price book › My Sections is the lock;
  Company › Finance › Money out › Expenses is the lock (New ▾ › Expense wears Pro); Reports › Finance › Expenses is the lock, Profit and loss
  still counts them; Settings › Quotes & pricing: Quote approval reads Not required with Pro, Required → the lock card; Settings ›
  Notifications: WhatsApp reads off with its line; Sent messages: "Not sent — WhatsApp notifications come with Pro"; Plans › Compare
  everything: Lead stage rules · My Sections (packages). Back to **Pro — Studio**: everything returns as stored.
- **Hui Min (Admin), on Free** — the lock card reads "Only Dane changes the plan." with **Ask Dane to upgrade** → "Asked Dane — it’s in their
  bell"; Dane's bell has the ask. Plan & billing: Auto top-up and Change seats read-only ("Only Dane turns auto top-up on or off.").
- **Sarah (Designer), on Free** — the Pro tags and the lock cards as Hui Min's (an ask).
- **Priya (Accounting), on Free** — Money out › Expenses is the lock with an ask; the books' reports still count expenses.
- **390 / 320** — X-Ray's lock, Plan & billing and Money out › Expenses have no sideways scroll; Change seats, Buy AI credits, Auto top-up and
  the lock card rise as bottom sheets; the lock's loader lands where the lock does.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0098 + repair R118) with `next start -p 3160` (lane A); :3160
stopped after. `npx tsc --noEmit -p .` clean · `npx eslint` 0 errors on every changed file · `npm run design:lint` nothing new · `npx next
build` green under the build lock (its one warning, "Dynamic filesystem access" on `restoreBaseline`, predates S08b).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s19.cjs`** (this step, 7 sections) | **116 / 116** — the last two runs back to back on one server, `.dump` identical; page error log empty |
| `pending-modules/verify-pm2-s08b.cjs` (the credits month) — **updated**: "the renders keep their own day" and "nothing else in the database moved" become "the AI work rides with its charges" (its aged copy ages the work with its charges; every other row still must not move), *a deliberate change of this rule* | 62 / 62 (before the update: 59 / 62 — exactly those three) |
| `pending-modules/verify-pm2-s09.cjs` (seats said, never refused) — **updated**: the Owner's *See plans* on the seat lines is *Change seats* on Pro — Studio, *a deliberate change of this rule* | 79 / 79 |
| `pending-modules/verify-pm2-s10 · s11 · s12 · s16 · s18` (Maison AI · reading by rule · Upload a quote · the shell · notifications) | 107 / 107 · 62 / 62 · 72 / 72 · 56 / 56 · 63 / 63 |
| `projects/verify-pj-gap-b.cjs` (a contractor's quote into a VO — now 5 AI credits) · `verify-pj-gap-c.cjs` (an uploaded quote into a schedule — now 5) | 72 / 72 · 105 / 105 |
| Regression lane (`regression/run.cjs` 3160): `cr-r1 · cr-r3 · cr-r4 · cr-r5 · fixes720` (AI credits) | 59 / 59 · 40 / 40 · 41 / 41 · 16 / 16 · 38 / 38 |
| … `viz-studio` · `view-as` · `xr-r1 … r4` (X-Ray on Pro) | 37 / 37 · 23 / 23 · 27 / 27 · 31 / 31 · 28 / 28 · 16 / 16 |
| … `dane-p6` · `ux-p6` (Buy 1,000 AI credits · S$20, setup) | 41 / 41 · 57 / 57 |
| … `ghosts-same` (1440) · `ghosts-same-390` (touch) · `ghosts-strips` · `ghosts-measure` | 51 / 51 · 51 / 51 · every route captured · members rows Δ 0 |
| … `pb-r2 · pb-r3 · pb-modal` (My Sections on Pro) · `tpl-parity` · `qe-r2` (approvals) · `qe-r5` | 41 / 41 · 30 / 30 · 18 / 18 · 20 / 20 · 33 / 33 · 21 / 21 |
| … `st-r1 · st-r2` (Settings) · `sw-r3` · `search` · `kb-r1` | 57 / 57 · 30 / 30 · 13 / 13 · 27 / 27 · 35 / 35 |
| `ghosts/verify-ghosts-same.cjs` on the last build, the touched routes (X-Ray, its record, Plan & AI credits, Plan & billing, Price book, My Sections, Templates › Quotes, the quote editor, Preview) at 1440 and 390 touch | every loader is its reveal (0.00%) |
| The loader against the page (the probe's §1 and §7: Plan & billing's four boxes at 1440 · 768 · 390, auto top-up off and on; the lock's box on six locked pages at 1440 and 390) | every box to the pixel |
| `npm run design:anatomy` on :3160 | all 1578 measures hold (73 pages, 245 table heads, 24 dialogs, 40 page menus) |
| The repair: twice on the base (a full dump identical but the run-relative `quote_templates.last_used_at`); twice on an aged copy (the story and its work 15 days back) | all checks pass · R111 "moved 15 days … · nothing to move" on the second run, dump identical |

The regression lane ran through `design-source/verify/regression/run.cjs` with `RUN_DIR` holding the repaired base as `base.db` (never
`prepare.cjs`, which copies local.db).

## Migration and repair
- **Migration 0098 `credits_s19`** (additive, schema-only, generated in the lane): `ALTER TABLE billing_checkout_sessions ADD credits_requested
  integer` (1.0's migration 428's column), `ALTER TABLE subscriptions ADD scheduled_seats integer`. No new table. **The main tree already has
  `0098_meetings_s23` (lane B)** — regenerate this one as 0099 at merge (the two statements above, nothing else).
- **R111 changed** (S08b's): its move is capped by the paid work's newest stamp too (`paidWorkLatest` — never past now, as restore's
  `snapshotMonth`), and after it moves it writes the outbox's newest twelve again (R82 · 8 is now the function `outboxNewest`, unchanged in
  what it writes): a bell that moved with its work can become one of the newest twelve, and one run now leaves what a second would (found
  by S08b's probe on an aged copy: the second run added nine outbox rows).
- **Repair R118** "a render and its charge are one moment": moves each charged render of a design (created / completed) by the whole days its
  charges sit from it, with the pins made before the version's new day, never past now; idempotent ("nothing to move" on the second run, a
  full dump identical). On the base: Kevin Ng's design (b46000d1) 5 renders + 1 pin +14 days; the showroom concept (f62bd5fa) 1 render +14
  days. **R111** (S08b's shift) now moves the paid work with the charges too. Four checks join the closing list: a render charged on another
  day than it ran, an unreadable `auto_topup` setting, a top-up off 1.0's grid, an invalid `scheduled_seats`. Last R used: **R118** (lane A's
  range R118…R139).
- `lib/db/baseline.ts`: the live-link expiry rule leaves the links the shift moved alone (`paidWorkIds`).

## Files
- **New:** `lib/credits/{auto-topup,features,plan-gate}.ts`; `components/credits/{count-stepper,seats-dialog,plan-lock-dialog,pro-tag,pro-locked-ghost}.tsx`
  + `count-stepper.module.css` · `pro-tag.module.css`; `components/company/plan/auto-topup-dialog.tsx`; `components/xray/{xray-locked-record,intro-copy}.ts(x)`;
  `components/company/templates/{quote-templates-locked,templates-loading}.tsx`; `components/company/price-book/sections-locked.tsx`;
  `components/templates/editor/template-locked.tsx`; `drizzle/0098_credits_s19.sql` + `meta/0098_snapshot.json` (+ the journal's entry);
  the probe + `pm2-s19/*.png`; `steps/reg-S19.md` · `steps/outcome-S19.md`.
- **Changed (credits):** `lib/credits/{plans,ledger,model,queries,pricing-data,demo-month}.ts`, `app/credits/actions.ts`,
  `components/credits/{credits-client.ts,credits-host,credit-dialogs,credits-card,plans-dialog}.tsx` (+ css), `components/company/plan/{billing-view,usage-view}.tsx`
  + `plan.module.css`, `app/company/plan/billing/page.tsx`, `components/company/members-view.tsx`, `lib/settings/permissions.ts`,
  `lib/db/{schema,baseline}.ts`, `scripts/repair-demo-data.ts`.
- **Changed (locks):** X-Ray — `app/quote-x-ray/{actions.ts,[id]/page.tsx,[id]/loading.tsx}`, `components/xray/{xray-workspace,xray-result,xray-skeletons,xray-setup-ghost}.tsx`
  (+ css); templates — `app/company/templates-actions.ts`, `app/leads/quotes-actions.ts`, `app/company/templates/(libraries)/{quotes/page,loading}.tsx`,
  `app/(editor)/templates/[templateId]/{page,loading}.tsx`, `components/quotes/{create-quote-modal,editor/template-bar,editor/editor-header,editor/quote-editor,preview/quote-preview}.tsx`;
  My Sections — `app/quotes/{items,draft}-actions.ts`, `app/company/price-book-actions.ts`, `app/company/price-book/sections/{page,loading}.tsx`,
  `components/quotes/editor/items/{items-section,items-table,price-book-dialog,table-menus}.tsx`; stages — `app/settings/lead-stages-card.tsx`;
  approvals — `lib/settings/queries.ts`, `lib/projects/{updates,money-queries,schedule,handover}.ts`, `lib/finance/queries.ts`,
  `app/settings/{actions,settings-view,owner-approvals,document-numbers-actions}.ts(x)`, `app/projects/{updates,money,schedule,ending}-actions.ts`,
  `components/projects/{updates/update-review-setting,schedule/schedule-settings,ending/handover-setting}.tsx`, `components/finance/cost-settings.tsx`;
  WhatsApp — `lib/notifications/{delivery,outbox}.ts`, `app/notifications/{actions,client-messages-actions}.ts`,
  `app/settings/{notifications-settings,client-messages-settings}.tsx`; expenses — `app/finance/cost-actions.ts`,
  `components/finance/{use-costs,finance-workspace,finance-ghost,expense-categories-settings,todo/todo-workspace,books/reports-view}.tsx`,
  `components/projects/money/project-money.tsx`; openers — `components/shell/tools-popover.tsx` (+ css), `components/leads/detail/quick-links.tsx`
  (+ css), `components/leads/quotes/{lead-quotes,quotes-table}.tsx`, `components/quotes/list/quotes-workspace.tsx`.
- **Changed (quote reads):** `components/projects/money/vo-upload-dialog.tsx`, `components/projects/schedule/source-picker.tsx`,
  `app/projects/money-actions.ts`, `lib/projects/draft-variation.ts`, `lib/quotes/upload.ts`.
- **Changed (ghosts):** `components/shell/app-shell.tsx`, `app/(editor)/layout.tsx` (the seed, `creditsSeed` in `lib/credits/model.ts`); `components/company/company-ghosts.tsx` (Plan & billing).
- **Changed (probes):** `pending-modules/verify-pm2-s08b.cjs` · `verify-pm2-s09.cjs` (deliberate changes, marked in place).

## Shared pieces changed
- `components/om/empty-state.tsx`: `kb?: boolean` (default true — no change for every existing caller): a lock's *See plans* is not the
  page's C.
- `components/shell/app-shell.tsx` and `app/(editor)/layout.tsx`: the ghost seed carries the plan's locks and auto top-up's state (`creditsSeed`); the editors' layout
  now wraps its children in `GhostSeed` (it seeds only the lock keys — the first-run shapes stay the shell's). No visible change on Pro.
- `components/shell/tools-popover.tsx` (+ css): the X-Ray tile's Pro tag and aria words, only on Free.
- `components/leads/detail/quick-links.tsx` (+ css): a link's Pro tag (`.tile { position: relative }`), only on Free.
- `lib/notifications/delivery.ts` · `outbox.ts`: the `not_in_plan` status (a WhatsApp copy on Free; S34's real providers must honour it —
  `sendRow` never sends one).
- `lib/quotes/upload.ts` `readRows`: a header-only sheet is empty (every reader of a sheet).
- No `app/globals.css` change; no house stylesheet copied (the Pro tag composes the Company panel's tag; the stepper moved out of Plans into
  `count-stepper.tsx`, which Plans now uses).

## For the next steps
- **S20 (AI Visualizer):** the render drift repair is yours; `shiftCreditSnapshot` now moves the Visualizer rows a charge paid for
  (`PAID_WORK_TIMES` in `lib/credits/demo-month.ts`) — a new Visualizer table with times the story shows needs its line there.
- **S21 (Quote X-Ray):** X-Ray is Pro on Free (every action refuses with the lock rule, the record sends nothing); 1.0's `quote_xray` price (10)
  is unused — your call; the intro's words live in `components/xray/intro-copy.ts` (the page and its ghost).
- **S23 (Meetings, lane B):** Co-Pilot metering — `chargeAI({ action: 'copilot_block', ref: 'meeting:<id>' … })`; add the `meeting:` ref to
  `app/credits/actions.ts`'s REF pattern and a `refTargets` branch.
- **S34 (Real services):** a real payment provider replaces `completeCheckout` for every kind (`topup` · `plan` · `auto_topup` · seats'
  invoice); auto top-up then charges the card on file; WhatsApp's `not_in_plan` rows must never be sent.
- **Any new Pro surface:** add it to `PRO_FEATURES`' readers — `requirePlan(f)` on the server, `usePlanLock(f)` + `ProTag` on the opener,
  `ProLocked` in place, `ProLockedGhost` in its loader (the seed is already there).
- **The UAT** (orchestrator): the top-up dialog's words changed (an amount picker); Members' seat line offers Change seats to the Owner; the
  VO and schedule uploads say their 5 AI credits.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for plan locks, seats or auto top-up; built from 1.0's behaviour on the house pieces
   (the Dialog, the empty state, the tag, the stepper, the chips, the select fields, the switch), every new word listed as invented copy in
   `reg-S19.md`.
2. **One system, no one-offs** — one list of Pro features read by the server, the openers, the lock card, the locked pages, the ghosts and
   the Plans table; one price function for the stepper and the invoice; one proration for the dialog and the server; the stepper moved out of
   Plans so both use it; `design:lint` holds.
3. **Plain words** — "Quote X-Ray comes with Pro", "What the studio made with it is kept and comes back with Pro.", "Pay S$12.83 and add a
   seat", "When AI credits fall under 500, add 1,000 (S$20) · at most once a month".
4. **Nothing is lost** — nothing a lock covers is deleted or rewritten; approvals are off when read and come back as stored; every seat and
   auto top-up change has Undo; a refused quote read gives its credits back.
5. **Say why** — every refusal names the feature and the way on; an Admin's lock says only Dane changes the plan; Fewer seats says why it
   stops ("one for each member who uses the AI tools"); a WhatsApp row says why it wasn't sent.
6. **Back returns where you came from** — a lock card opens where you are and closes back to it; a locked record keeps its own Back and
   crumbs; See plans opens Plans over the page.
7. **Every screen is whole** — each locked page has its loader and reveal drawing the lock where it lands (probed at 1440 and 390); the page
   error log is empty.
8. **Every width is designed** — 390 and 320: no sideways scroll on the locked pages and Plan & billing; every new dialog is a bottom sheet;
   the lock's button takes the phone's width.
9. **Tables follow the leads listing** — no new table.
10. **Motion with purpose** — no new motion (the house Dialog and sheet).
11. **Honest data** — "no card is charged" said wherever money would move; every auto top-up and seat change is a checkout / invoice record
    whose sum is the ledger's; the demo's renders and their charges now say the same day.
12. **Reach for everyone** — the Pro tag carries "Pro feature" in the opener's name; the stepper's buttons are labelled ("50 more AI credits",
    "Fewer seats"); the chips are a radio group; dialogs trap and return focus.
- **How to add a missing thing** — one home for the plan's rules (Plan & billing), doors elsewhere (Members' Change seats, the lock card's See
  plans, the credits card's line); the lock shown only while it applies; no filled button added to a row; defaults need no set-up (auto
  top-up off, seats as they are).
