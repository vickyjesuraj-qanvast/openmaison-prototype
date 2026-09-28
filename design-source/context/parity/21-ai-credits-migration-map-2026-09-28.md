# AI credits & plans — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-28 at the end of the AI credits build (REG-699…705). For every piece of 1.0's credits and billing, it says where the same thing
lives in 2.0 and what the prototype stands in for, so porting and wiring start from one place. The reasoning and the 47 calls are in the
audit (`19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`, answers in §10); what stays exactly as 1.0 and what differs is the integration list
(`20-ai-credits-integration-differences-2026-09-28.md`: A-01…A-19 kept, B-01…B-38 differences, C-01…C-21 1.0 faults, D-01…D-18 2.0 places to
protect). Where this page and the audit disagree, this page follows the build.

Conventions: Drizzle over libSQL (`lib/db/schema.ts`); money is SGD integer cents; credits are integers; times are unix seconds; people are
`members.id`; the studio is one row (`studio_credit_balances.id = 'studio'` — 2.0's prototype has one studio). Refusals are `{ error: <the rule> }`
(the house shape); 1.0's 402 / 403 family keeps its codes (`insufficient_credits` · `member_cap_reached` · `forbidden`).

## 1. Where each 1.0 surface lives

| 1.0 | 2.0 | REG |
|---|---|---|
| The rail's credits pill + hover popover (`components/credits/*` on the ported rail) | **The rail's Upgrade slot**: Upgrade on Free (the count quiet at its end), the credits row on a paid plan (`components/shell/rail-credits.tsx`); a press opens **the credits card** (`components/credits/credits-card.tsx`); More's first row on a phone; the Visualizer's balance chip (`components/credits/credits-chip.tsx`) | 701 |
| `/upgrade` → the marketing site | **Plans**, the xxl modal over the page (`components/credits/plans-dialog.tsx`), opened by `openPlans()` from anywhere | 702 |
| `use-checkout.ts` (Dodo overlay, status phases, polling) | the Pay step's `CheckoutPanel` + `PayLine` (`components/credits/credit-dialogs.tsx`) — **a labelled stand-in**; wire Dodo's overlay into the same place | 702 |
| The blocked dialog fed by `meteredFetch` | `CreditBlockDialog` (out · a member's amount · the cheaper way · buy-and-carry-on), opened by `chargeAI()` on a refusal | 703 |
| [Request more] (did nothing) | *Ask Dane* → `askForCredits` → `credit_requests` + the Owner's bell | 703 |
| Settings › Usage & credits | **Company › Plan & AI credits › Usage** (`app/company/plan/`, `components/company/plan/usage-view.tsx`) | 704 |
| — (only in screenshots) | **Company › Plan & AI credits › Plan & billing** (`app/company/plan/billing/`, `billing-view.tsx`): the plan, top-ups, the card, billing details, invoices | 704 |
| Manage billing (Dodo customer portal) | *Manage billing* (`ManageBillingDialog`) — **a stand-in**; the live app opens Dodo's portal in a new tab | 702 |
| The Visualizer's desktop cost line | Generate's cost chip, the options line ("… · 20 AI credits · 11,590 left after"), Quality's per-version prices, the warning before the press (`components/visualizer/editor/rail.tsx` `FootPrice`) | 704 |
| `/api/quotes/parse` (Digitize quote, 5) | Create Quote › *Upload a quote* (`components/quotes/create-quote-modal.tsx`): 5 at the read, refunded when the file can't be read | 704 |

## 2. Stores

| 1.0 | 2.0 | Notes |
|---|---|---|
| `plans` (317 · 326) | `plans` — the four rows, written by repair R63 from `lib/credits/plans.ts` `PLAN_ROWS` | 1.0's columns and values (A-01). The app reads `PLAN_ROWS`; the table is the record 1.0's reference API serves. |
| `subscriptions` (009 · 321) | `subscriptions` | `plan_id` · `billing_cycle` · `status` (active · trialing · past_due · cancelled) · `seats` · `current_period_start/end` · `trial_ends_at` · `cancel_at_period_end` · `cancelled_at` · `grace_until` · `created_by`. The live plan is the newest row with `cancelled_at` null. |
| `studio_credit_balances` (318) | `studio_credit_balances` | `plan_credits` · `topup_credits` · `period_start/end` · `enforcement_enabled` · `enforcement_starts_at`. **One period date drives both refresh and billing** (B-09). |
| `credit_ledger` (318 · 319) | `credit_ledger` | `member_id` · `action_key` · `credits` (signed) · `balance_after` · `reason` (spend · refund · topup · refresh · grant · adjust · shadow_spend) · `ref_id`. No `actual_cost_usd` in the prototype (Q-26: never shown). **The balance always equals the ledger's sum** — repair R63 checks it. |
| `studio_member_credit_caps` (318) | `studio_member_credit_caps` | `monthly_cap` null = no limit; the screen word is *monthly amount* (A-08). |
| `billing_checkout_sessions` (321 · 328) | `billing_checkout_sessions` | `kind` (plan · topup) · `plan_id` · `seats` · `period` · `status` (pending → completed) · `credits_granted`. The demo completes a session the way the webhook would. |
| `invoices` (009) | `invoices` | `invoice_number` INV-YYYYMM-NNNN · `plan_name` · `amount` · `billing_period_start/end` · `status` · `issued_at` · `paid_at`. The PDF in 2.0 is a demo print; in the live app it is Dodo's. |
| `billing_webhook_events` | — | the platform's; the prototype has no webhook. |
| — | **`credit_requests`** (new, B-19) | `member_id` · `kind` (pool · monthly) · `needed` · `status` (open · granted) · `answered_by` · `answered_at`. Additive: 1.0's code never reads it. |
| `free_copilot_blocks_remaining` | — | Co-Pilot waits (Q-45). |

Migration **0057_ai_credits.sql** creates them (additive). The baseline lists them (`lib/db/baseline.ts` · `scripts/snapshot-baseline.ts`).

## 3. Rules and where they live

| Rule | 2.0 | 1.0 |
|---|---|---|
| The price list, one table for every number on screen | `lib/credits/schedule.ts` `CREDIT_SCHEDULE` · `renderAction(kind, quality)` · `costOf(action, count)` | `src/lib/credits/schedule.ts` |
| Charge before the work; variants × price in one charge; idempotent on (action, ref) | `spendCredits` (`lib/credits/ledger.ts`) through `spendAI` (`app/credits/actions.ts`) through `chargeAI` (the client) | `guardCredits` · `spend_credits` |
| Check order: role → plan → member cap → credits | `spendCredits` (the cap before the pool) | `guardCredits` |
| Plan credits first; refunds into top-ups | `spendCredits` · `refundCredits` (`<ref>:refund`) | `spend_credits` · `grant_credits('refund')` |
| A charge is keyed by the work: `render:<render_jobs.id>` · `quote:<quotes.id>` (B-12) | the Visualizer picks the job id before the work (`saveRender(..., { jobId })`); Create Quote picks the quote id before the read (`createQuoteFromUpload(..., quoteId)` → `createQuote(..., { id })`) | 1.0 keys on a request id |
| Refund on every failure, and on Cancel before the work is kept | `refundAIWork` in the Visualizer (`giveBack`, `cancelRun`) and Create Quote (unreadable file) | `gate.refund()` |
| Shadow mode (a studio not counted yet): metered, never blocked, 0 charged | `spendCredits` writes `shadow_spend` when `enforcement_enabled` is off; `chargeAI` answers 0 | `enforcement_enabled` |
| The month rolls lazily: unused plan credits end (`plan_expired`), the allowance arrives (`plan_allowance` / `plan_change`), a renewal invoice for a monthly plan; compare-and-set on the period's end so two readers can't roll twice | `ensurePeriod` · `refreshTo` | the Dodo webhook + `/api/cron/credit-refresh` |
| Monthly credits are plan credits and never roll over; annual gets its credits every month; Free's welcome 150 lasts until used (a top-up-like grant) | `refreshTo` · `changePlan` · repair R63 | **Fixes 1.0** — B-06 · B-07 · B-08 (C-02 · C-03 · C-04) |
| Changing plan re-anchors the period on the day it happens; top-ups stay | `changePlan` | the webhook's `plan_changed` |
| Lapse: 14 days' grace, then Free; top-ups kept; no new month's credits while past due | `ensurePeriod` (`grace_until`, `grant: status !== 'past_due'`) | `src/lib/billing/lapse.ts` (C-05: 1.0 leaves the subscription past due) |
| Only the Owner buys, sets monthly amounts and changes the plan; the Owner and Admins see the studio's pool; everyone else sees their own | `lib/credits/policy.ts` (`trustedRole` · `ownerRole` · `mayBuyCredits` · `maySetAmounts` · `mayChangePlan` · `usageReach`); `ownerOnly()` in `app/credits/actions.ts`; *Who may do what* reads the same functions | `settings.editStudio` · `resolveTrustedActor` (A-18) |
| An ask is answered by a raise past what was used, or by credits added | `setMonthlyAmount` (grants open monthly asks) · `addTopUp` (`answerPoolAsks`) | — (new, B-19) |
| Alerts at 75% and 90% of the month and at 0, once per period | `raiseAlerts` (`settings.credit_alerts`) | — (new, B-18) |
| A new member starts with the studio's default monthly amount | `addMember` (`settings.credit_defaults`) | — (new, B-16) |

## 4. What the prototype stands in for

| Stand-in | The live app |
|---|---|
| `startPlanCheckout` / `startTopUp` write a pending `billing_checkout_sessions` row | 1.0's `POST /api/billing/checkout` (same body) opens Dodo's overlay |
| `completeCheckout(sessionId, { trial })` grants, issues the invoice and notifies | **only the Dodo webhook grants** (A-13); the overlay's success polls the session as 1.0 does |
| `cancelAtPeriodEnd` · `keepPlan` · `updateCard` | Dodo's customer portal |
| `talkToUs` | where Max's leads go is open (A §6) |
| `setDemoPlan` (View as › Studio plan) | nothing — the prototype's demo states only |
| The invoice PDF from `buildTable` | Dodo's invoice |

## 5. Where 2.0 calls it (for the port)

| Call site | Action | Ref |
|---|---|---|
| `components/visualizer/editor/visualizer-editor.tsx` `generate()` | `renderAction(kind, quality)` × versions | `render:<jobId>` |
| `components/quotes/create-quote-modal.tsx` `pickFile()` | `quote_digitize` | `quote:<quoteId>` |
| Free (Q-30 · A-17): room reading, lighting preview, Auto Fill, Fill from a document, PDF import, Quote X-Ray, Write with AI, Upload my existing quote, Maison AI chat | — | — |

## 6. Not built

Plan feature locks (Q-40, R6) · auto top-up (Q-36, B-29) · packs of 2 000 / 5 000 (Q-21) · the raise that ends with the month and the held render (Q-25 · Q-34) · Meeting Co-Pilot metering (Q-45) · rollover and a Draft quality (Q-47) · seat checks against members (Q-13) · the rollout notice as a flow (Q-46; the demo state exists).
