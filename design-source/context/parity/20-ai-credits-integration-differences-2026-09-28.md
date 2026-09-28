# AI credits & plans — integration: what stays as 1.0, what differs, what could break (2026-09-28)

**Written for:** the owner, to confirm before anything is built. The UI of the audit (`19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`) is agreed; this file covers everything under it: data, rules, APIs, payments and flows. It is also the 1.0 developers' first map for porting their credits work into 2.0.

**The brief** (owner, 2026-09-28): "What all are the list of things that are different from the integration point of view? I don't want to break anything in 2.0, and nothing different from 1.0 — there is a lot of work they have made in 1.0 and it's defined in a certain way."

**Checked against 1.0 on `origin/feat/om-ui-port` @ `3174b912f`:**

| Area | Checked |
|---|---|
| Migrations | `009_billing` · `317` · `318` · `319` · `320` · `321` · `326` · `328` |
| Credits lib | `src/lib/credits/{guard,provision,trusted-actor,schedule}.ts` · `src/lib/access-control.ts` |
| Credits routes | `src/app/api/credits/{balance,caps,usage}/route.ts` · `src/app/api/render/route.ts` |
| Billing routes | `src/app/api/billing/checkout/route.ts` · `src/app/api/webhooks/dodo/route.ts` · `src/app/api/cron/credit-refresh/route.ts` |
| Earlier readers | `ai-credits-1.0-inventory/A…D` |

## How to read

Each row gives the ID, the topic, 1.0 today (the file or column that defines it), what the audit proposed, the integration impact, and the recommendation.

**Impact:**

| Impact | Meaning |
|---|---|
| **None** | Same as 1.0, or words and screens only. No 1.0 code moves. |
| **Additive** | A new table, column, endpoint, event or screen. 1.0's code keeps working untouched. |
| **Changes 1.0** | 1.0's code, or a decision the 1.0 team took on purpose, has to change. |
| **Fixes 1.0** | 1.0's code breaks its own promise (its copy, its pricing page, its spec). 2.0 follows the promise, so the fault needs fixing anyway. |

**Recommendation:**

| Recommendation | Meaning |
|---|---|
| **Keep 1.0** | Revised after this review: the audit's first proposal is withdrawn and 1.0's definition stands. |
| **Change** | Worth the change. |
| **Additive** | Build it; nothing of 1.0's moves. |
| **Your call** | Business or finance decides. |

**The short version:**
- **19 things stay exactly as 1.0 defines them** (§A).
- **9 proposals are withdrawn** in favour of 1.0's definition, because the gain was small and the cost fell on 1.0 (§B, "Keep 1.0").
- **5 proposals change 1.0 only where 1.0 breaks its own promise** (§B, "Fixes 1.0").
- **The rest are additive**: they only add, and 1.0's code runs as before.
- **1.0 has 21 faults** its team should fix regardless (§C).
- **2.0 has 18 places to protect** during the build (§D).

---

## A. Kept exactly as 1.0 defines it (no integration work)

| # | What | 1.0 source |
|---|---|---|
| A-01 | **The plans:** free · pro_freelance · pro_studio · max, with the prices (SGD cents), allowances, signup grant, minimum seats and extra-seat price. Annual = 11 × monthly, and Max is contact-sales. | `plans` (317, 326); live `/api/reference/plans` |
| A-02 | **The price list:** Parse email / screenshot, Segment, Detect 0 · Digitize quote 5 · Draft 5 · Defurnish 10 · Render 10 · Photorealistic 15 · Pro render 20 · Drift repair 2 · Co-Pilot 25 per 10 min. The one open number is Drift repair (B-10). | `src/lib/credits/schedule.ts` |
| A-03 | **Two buckets:** plan credits are spent first; top-ups never expire; nothing goes negative; there is no overdraft. | `studio_credit_balances` (318); `spend_credits` (319) |
| A-04 | **Variants × price in one charge.** | `spend_credits(p_credits)` |
| A-05 | **Charge before the work, refund on every failure.** The refund lands in the top-up bucket ("never worse off"). | `guardCredits` → `gate.refund()`; `grant_credits` reason `refund` (320) |
| A-06 | **The refusal family:** `402 insufficient_credits {needed}` · `402 member_cap_reached {needed, remaining}` · `403 plan_required {feature, requiredPlan}` · `403 forbidden`. One blocked dialog is fed by `meteredFetch`. | `src/lib/credits/guard.ts`, `metered-fetch.ts` |
| A-07 | **The check order:** role → plan → member cap → credits. | `guardCredits` |
| A-08 | **Member caps:** one `monthly_cap` per member (null = none), counted over the billing period, set by `PUT /api/credits/caps {memberId, monthlyCap}`. The screen word "monthly amount" is only a label (C-36). | `studio_member_credit_caps` (318) |
| A-09 | **The ledger:** `credit_ledger` (action_key · credits · balance_after · reason · ref_id · actual_cost_usd), append-only, with idempotency on (studio, action, ref). | 318 · 319 |
| A-10 | **The balance API**, used as it is: `memberUsed` · `memberCap` · `memberCapRemaining` · `enforcementEnabled` · `periodEnd`, and for trusted viewers only `balance` · `planCredits` · `topupCredits` · `planId`. | `api/credits/balance` |
| A-11 | **The usage API:** periods (current · previous · 3 months · 6 months), per member, the last 50 events, and per tool with refunds netted. | `api/credits/usage` |
| A-12 | **Dodo Payments** is the merchant of record. In-app purchases use the overlay (`DodoPayments.Initialize({displayType:'overlay'})`), with 1.0's status phases and polling. The checkout body is `{kind, planId, seats, period}` and is Owner-only on the server. | `use-checkout.ts` · `api/billing/checkout` |
| A-13 | **The webhook is the only thing that grants.** It handles `subscription.active / renewed / on_hold / cancelled / plan_changed`, `payment.succeeded` and `refund.succeeded`. | `api/webhooks/dodo` |
| A-14 | **Lapse:** a failed payment gives a 14-day grace, then the studio moves to Free; top-ups are untouched. | `src/lib/billing/lapse.ts`; `subscriptions.grace_until` (321) |
| A-15 | **The per-studio enforcement flag** (shadow mode). 2.0 reads it; see B-32. | `studio_credit_balances.enforcement_enabled` |
| A-16 | **Free:** 150 at signup and 30 a month. **Co-Pilot:** one free 30-minute meeting (3 blocks). The numbers are kept; the storage of the 150 is B-08. | `plans`; `free_copilot_blocks_remaining` |
| A-17 | **Free as in 1.0:** Quote X-Ray, mAIson chat, reading an email or a screenshot, and detecting surfaces. | route list (A §2.2) |
| A-18 | **Who may buy, set caps and change the plan: the Owner** (`settings.editStudio`; "admin — same access as owner except plan/billing"). **Who sees the studio's pool and S$ figures: Owner and Admin** (`resolveTrustedActor`). 2.0 keeps both; see B-01…B-03. | `access-control.ts:9, :129`; `trusted-actor.ts` |
| A-19 | **Table names** 2.0 uses: `plans` · `subscriptions` · `studio_credit_balances` · `credit_ledger` · `studio_member_credit_caps` · `billing_checkout_sessions` · `billing_webhook_events` · **`invoices`** (1.0's platform-billing invoices). The audit's `billing_invoices` is withdrawn (B-37). | 009 · 318 · 321 |

---

## B. Every point where the proposal differs from 1.0

### B.1 Rules and permissions

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-01 | **Who buys top-ups** | Owner only. Admin is excluded on purpose (`access-control.ts:9`), and the checkout route checks `settings.editStudio` | Owner and Admin (Q-23) | Changes 1.0 (access control, checkout route, the dialog's `canPurchase` test) | **Keep 1.0.** An Admin sees "Only Dane can buy AI credits" and **Ask Dane**. |
| B-02 | **Who sets monthly amounts** | Owner only (`PUT /api/credits/caps` via `settings.editStudio`) | Owner and Admin (Q-23) | Changes 1.0 | **Keep 1.0.** |
| B-03 | **What a Designer sees** | Their own figures: `memberUsed`, `memberCap`, `memberCapRemaining`, `periodEnd`. The studio's pool and split come back `null` (decision 2026-09-17; `balance/route.ts:88-91`) | "What you can use", including the studio's balance when they have no cap (Q-08). A Manager sees their team (Q-24) | Changes 1.0 (redaction; usage scoping) | **Keep 1.0.** A capped Designer sees "115 of your 600 left". An uncapped one sees "420 used this month". Optional, additive: a coarse `poolState` field (`ok · low · out`, no numbers) so Designers are warned before a refusal. The Manager's team view waits. |
| B-04 | **The provider-cost column** | Shown to Owner and Admin ("Cost $4.71", `actual_cost_usd`; decision 2026-09-21) | Not drawn. The owner sees the S$ value at the top-up price instead (Q-26) | None (the data stays; only the screen changes) | **Your call.** It reverses a 1.0 product decision; I'd still drop it, because it is OpenMaison's cost of goods. |

### B.2 Money and credits

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-05 | **Top-up amounts** | One product of 1,000 credits. The route forces quantity 1 (`checkout/route.ts:119, :243`), and the webhook grants `TOPUP_CREDITS = 1000` whatever was bought (`webhook:119, :439`) | Packs of 1 · 2 · 5 (Q-21); the owner's screenshot shows a slider in hundreds | Changes 1.0 (quantity in the route; 1,000 × quantity in the webhook) | **Keep 1.0 for now:** one button, "Buy 1,000 AI credits · S$20". Packs later, as a small change. |
| B-06 | **Where paid monthly credits go** | The webhook grants the allowance with reason `grant` into the **top-up** bucket (`webhook:671-678`). They never expire and pile up | Plan bucket, refreshed each period (Q-43) | Fixes 1.0: its own page says "Plan credits do not roll over" | **Change.** Renewal sets `plan_credits` to the allowance; it doesn't add to it. |
| B-07 | **Annual plans** | The allowance is granted once per yearly renewal, so a year gets one month of credits | Credits every month (Q-43) | Fixes 1.0 | **Change.** A monthly refresh for annual subscriptions; today the refresh job skips every live subscription. |
| B-08 | **Free's welcome 150** | Stored as plan credits (`provision.ts:54`), so the job on the 1st overwrites them with 30 | Lasts until used (Q-43) | Fixes 1.0: the page promises "150 tokens to start, then 30 a month" | **Change.** Put the 150 in `topup_credits`, which never expire. |
| B-09 | **One renewal date** | The period is anchored to sign-up (calendar fallback). The resolver ignores Dodo's anniversary, so the refresh and the bill can fall on different days (A §3.9) | One date: the subscription's (Q-43) | Fixes 1.0 | **Change.** |
| B-10 | **Drift repair price** | 2 credits | Free, or refunded when it fails (Q-28) | Changes 1.0 (one number in `schedule.ts`) | **Your call** (business). 2.0 has no drift repair today, so this only matters when 1.0's engine is ported. |

### B.3 Charging, retries and the Visualizer

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-11 | **Cancel a render** | Charged when the request starts, refunded only on failure. A cancelled request is not refunded (`render/route.ts:39-55`) | Cancel before "Keeping the version" is free, "nothing was kept or charged" (Q-31) | Changes 1.0 (the route must refund when a request is aborted) | **Your call, with the developers.** The safe version keeps 1.0's rule and honest words: "Stopped — the render may still finish and use its credits". |
| B-12 | **Retry safety** | Every request makes a random reference (`render:${randomUUID()}`), so a retry charges twice (known, A §2.3) | A stable reference per Generate, the render job's id | Fixes 1.0 | **Change.** B-13, B-27 and B-28 depend on it. |
| B-13 | **After buying, the work carries on** | The dialog stays open and the user re-runs the action (B §5) | The blocked action re-runs by itself (Q-33) | Additive (client only), but it needs B-12 first | **Additive**, after B-12. |
| B-14 | **A Designer's render held until credits arrive** | No job queue; renders are synchronous calls | The held render runs by itself (Q-34, E-03) | Changes 1.0 a lot (a pending-render queue and a worker) | **Keep 1.0 now.** The Designer gets a bell: "Dane added AI credits — press Generate again". The picks are already saved in 2.0. |

### B.4 Monthly amounts, asks and alerts

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-15 | **"+200 this month" (a raise that ends)** | Only a permanent `monthly_cap` | A temporary raise (Q-25, Q-34) | Changes 1.0 (`spend_credits`' cap check, or a job that puts caps back) | **Keep 1.0 now:** the owner's answer is "Raise to 800", 1.0's `PUT /caps`. The temporary raise comes later. |
| B-16 | **A default monthly amount for new members** | None (no row = no cap) | A studio default (Q-25) | Additive (a setting that writes the caps row when a member is added) | **Additive.** |
| B-17 | **"Running low"** | The pill turns amber below a fixed 20 (`credit-pill.tsx:27`) | 75% · 90% · 0 of the month, plus a forecast (Q-35) | Additive (read side, from the ledger) | **Additive.** |
| B-18 | **Credit notifications** | None | 8 events (Q-38) | Additive (1.0's notification engine; 2.0's `EVENTS`) | **Additive.** |
| B-19 | **Asking the owner** | "Request more" does nothing | A real request, answered from the bell (Q-34) | Additive (a new `credit_requests` table and endpoints; the answers reuse `PUT /caps` and checkout) | **Additive.** |

### B.5 Plans, seats, tax and payments

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-20 | **Change plan · downgrade · cancel** | None. Change plan is always disabled; `/upgrade` only hands off to checkout | All inside the app (Q-19) | Changes 1.0 (Dodo change-plan with a proration preview; cancel at period end; `plan_changed` also resolves only monthly products today) | **Change, lightly.** Upgrading happens in the app (a new checkout, as 1.0 does). Change, downgrade, cancel, card and invoices open **Dodo's customer portal**, the one step that leaves the app. That is 1.0's own "Manage billing" target. |
| B-21 | **Seats** | Fixed at purchase. Studio sends `quantity = seats` against a S$100 product (the S$300 risk). No check against members (`max_members` is only displayed). No self-serve change | Seats = active members, never below; add a seat from Add member, prorated (Q-13) | Changes 1.0 a lot (a seat add-on product, `changePlan`, a check in the members API) | **Keep 1.0's rule:** no enforcement. The seat stepper at checkout defaults to the active members, and it changes only the checkout quantity. Adding a seat from Members waits for the business rule. The S$300 pricing still needs fixing (C-01). |
| B-22 | **GST on the checkout** | No tax words; no `tax_id` or business name sent to Dodo | The line for the studio's own GST status; UEN and GST number filled in (Q-15) | Additive (two fields Dodo's checkout session already accepts: `customer_business_name`, `tax_id`) | **Additive.** The words wait for finance. |
| B-23 | **Payment provider** | Dodo (decision 2026-09-21) | Dodo, or Stripe for PayNow (Q-14) | Stripe would replace 1.0's whole payments layer | **Keep 1.0 (Dodo).** PayNow waits unless the business moves provider. |
| B-24 | **The Upgrade entry** | Upgrade is on everyone's rail (Pro, Max, visitors too) and goes to `/upgrade`: Owner-only, others bounced; with no plan it goes to the marketing site and loops to the dashboard | Upgrade only while Free; Plans as a modal, read-only for non-owners with "Ask Dane" (Q-04, Q-10) | None on the server (checkout stays Owner-only); routing is 2.0's own | **Change** (2.0 side). |
| B-25 | **Where the Plans content comes from** | The website reads `/api/reference/plans` and `pricing-data.ts` (comparison rows, FAQ) | The same content inside the app (Q-11) | None, if 2.0 reads the same source rather than a copy | **Keep 1.0's source.** Read the same plans and comparison data, so the app and the website never disagree. The words need one change: the source says "tokens", the app "AI credits" (Q-01), so rename on the website too. |
| B-26 | **Where the usage page lives** | `/settings/usage` (and `/accounts/usage` is Studio Health analytics) | Company › Plan & AI credits (Q-22) | None (routes are 2.0's; the same APIs) | **Change** (2.0 side). |

### B.6 Linking charges to work

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-27 | **By lead** | The ledger has only `ref_id` (a random reference, B-12). No lead | Credits per lead, won vs lost (Q-27) | Additive once B-12 lands: read `ref_id` → render job / quote → lead. `spend_credits` doesn't change | **Additive**, after B-12. No `lead_id` column is needed. |
| B-28 | **A receipt on each version** | — | "20 AI credits · Dane · 12 min ago" (E-18) | Additive, after B-12 | **Additive.** |

### B.7 Later and business calls

| # | Topic | 1.0 today | Proposal (audit) | Impact | Recommendation |
|---|---|---|---|---|---|
| B-29 | **Auto top-up** | None | Opt-in, with a monthly ceiling (Q-36) | Additive but heavy (saved payment method, charging off-session, a threshold job) | **Later.** |
| B-30 | **Rollover of monthly credits** | None | One month while subscribed (Q-47) | Changes 1.0's refresh | **Your call** (business); later. |
| B-31 | **The run-out forecast** | None | "Runs out around 25 Oct" | Additive (read side) | **Additive.** |
| B-32 | **Notice before credits count** (1.0's unmetered studios) | Enforcement flips silently per studio; the pill shows 0 | A month's notice with their usage (Q-46) | Additive (a date such as `enforcement_starts_at`; the usage is already written as shadow rows) | **Additive.** |
| B-33 | **Payment-failed banner** | None (lapse is silent) | Owner's banner and bell with the grace date (Q-37) | Additive (reads `subscriptions.status` and `grace_until`) | **Additive.** 1.0's lapse bug is C-05. |
| B-34 | **One-time tip on the first metered press** | — | E-17 | None (a per-member flag) | **Additive.** |
| B-35 | **"Monthly amount"** for 1.0's "monthly cap"; **"AI credits"** for "credits" / "tokens" | — | Q-01 · Q-25 | None (words; the columns keep their names) | **Change** (words only). |
| B-36 | **Plan feature locks** | Flags defined (`feature_flags`), nothing enforced; `guardCredits` already takes `feature` | Their own round (Q-40) | Additive (pass `feature` per route) | **Later**, as decided. |
| B-37 | **Tax invoices list** | 1.0 has the platform-billing table `invoices` (009: invoice_number, plan_name, amount, period, `dodo_payment_id`) but no screen | A list in Plan & billing | Additive (read-only) | **Additive**, reading 1.0's `invoices`. The audit's `billing_invoices` name is withdrawn. |
| B-38 | **The demo base plan and "Studio plan (demo only)"** | — | Q-41 | None (prototype only) | **Change** (prototype). |


---

## C. 1.0 faults its team should fix regardless (2.0 does not copy them)

| # | Fault | Where |
|---|---|---|
| C-01 | Pro Studio checkout sends quantity 3 of a S$100 product, so the charge may be **S$300** against the S$100 advertised | `checkout/route.ts:243`; Dodo product setup |
| C-02 | Paid monthly credits are filed as top-ups: they never expire and they stack (= B-06) | `webhook:671-678` |
| C-03 | Annual subscribers get one month of credits a year (= B-07) | webhook, refresh job |
| C-04 | Free's welcome 150 is overwritten on the 1st (= B-08); the page reads "150 of 30 · Used −120" | `provision.ts:54`; usage page |
| C-05 | Lapse leaves the subscription past-due: Free's 30 never arrives, and a resubscribe may be refused | `lapse.ts`, `billing-lapse` job |
| C-06 | `plan_changed` resolves only monthly products; an annual change comes back unresolved | webhook |
| C-07 | The Co-Pilot meter has no caller. Free blocks are never decremented and default to 3 for every studio | `copilot-meter.ts` |
| C-08 | Random references, so a client retry double-charges (= B-12) | every metered route |
| C-09 | Declutter logs as "Render", not "Defurnish room" | `api/render/declutter` |
| C-10 | The pill isn't refreshed after a spend, so the dialog can say "N left" while refusing | `use-credits.ts` |
| C-11 | Studios without a balance row are unmetered, and their pill shows 0 | `credits/context.ts`, shadow path |
| C-12 | Upgrade → `/upgrade` → marketing site → the login ignores `redirectTo` → dashboard | `upgrade/page.tsx`, `login/page.tsx:58-64` |
| C-13 | Change plan is always disabled, although the FAQ says "anytime, in either direction" and the Terms promise cancelling in settings | usage page; `/terms` §10 |
| C-14 | The dialog's "Upgrade plan" always starts Pro Freelance, monthly, 1 seat, even for a Pro Studio studio | `credit-blocked-dialog.tsx` |
| C-15 | "{Feature} is included in Pro" is said even for Max-only features | `credit-blocked-dialog.tsx` |
| C-16 | "Payment is processing" shows after an abandoned checkout; raw codes ("forbidden", "contact_sales") reach the screen; there is no `return_url` | `checkout-status-line.tsx`, checkout route |
| C-17 | "Used = allowance − balance" goes negative with any top-up | usage page |
| C-18 | By member leaves out members who haven't spent, so a new member's cap can't be set | usage page |
| C-19 | `can&apos;t` / `studio&apos;s` print literally | usage page |
| C-20 | The website says "tokens", the app says "credits" | `pricing-data.ts` |
| C-21 | The pricing page's own conflicts: "No card to start" beside "card required", "/year" beside "/month", the badge vanishes on Studio, Free 150 vs 30 in the table, 4 vs 5 markets | C §5 |

---

## D. What could break in 2.0, and how the build keeps it safe

| # | 2.0 piece | What changes | How it stays safe |
|---|---|---|---|
| D-01 | Rail · Upgrade row (REG-164 · REG-206 · REG-329) | Paid studios see the credits row in its place | The same 200 × 36 box: `--rail-w`, the rail's height and its scroll don't move. Free keeps today's row pixel for pixel. |
| D-02 | UAT ch1 (the rail items step lists "Upgrade") | With a Pro base plan the slot reads the balance | Update the step with the base plan (Q-41). |
| D-03 | More sheet (REG-300) | A credits card as the first row | Update the phone probe shots (`verify-view-as` va-08). |
| D-04 | Company panel (REG-484) | A new Studio-group row | Update `verify-st-r1`, `verify-folders-pickers`. |
| D-05 | Settings › Notifications (the events table) | 8 more rows, drawn from `EVENTS` | Give each its default channels; update `verify-sw-r4`, `verify-st-r2`, `verify-st-r3`. |
| D-06 | Settings › Studio › Who may do what | New rows | They come from new rule functions (`lib/credits/policy.ts`), like every row today; "Roles are fixed" stays true. |
| D-07 | View as (REG-667) | A "Studio plan (demo only)" row | Update `verify-view-as` (23) and `verify-panel-order`. The switch must never touch members. |
| D-08 | AI Visualizer (REG-671…698) | Charge and refund around the existing save; a balance chip in the top bar and the compact go bar | The render pipeline is untouched; the charge is a ledger row beside `render_jobs`. Duplicate design copies jobs and **must not charge**. Re-run `verify-viz-{studio,client,sheets}`. |
| D-09 | Upload a quote | Charged at the read; a failed read refunds | Words only on the existing failure path; re-run `verify-qe-r5`. |
| D-10 | Quote X-Ray · Write with AI · template recreate · Auto Fill · Fill from a document | Nothing (free) | — |
| D-11 | Company › Members | Nothing in phase 1 (no seat enforcement, B-21) | Add and deactivate keep working; `verify-st-r2` unchanged. |
| D-12 | Reset to base | New tables | Add them to **both** baseline lists (`lib/db/baseline.ts` `BASELINE_TABLES`, `scripts/snapshot-baseline.ts` `TABLES`) or Reset leaves them behind. |
| D-13 | Dates after a restore | The baseline shifts only open tasks' due dates to the demo day | The credit period (refresh date, "in N days") is worked out from today at read time, like 1.0's resolver. Otherwise a restored demo says "refreshed 3 months ago". |
| D-14 | Demo data | Balance must equal the ledger | Repair R62 charges every render and reading on record, including renders made after the baseline (the owner's `local.db` holds 3 from today), and checks balance = ledger sum. |
| D-15 | The icon subset | New glyphs (the page used `generating_tokens`, `savings`, `event_repeat`, `back_hand`, `group_add`) | Re-subset the font; an icon missing from the subset prints its name. The token itself is an SVG component, not a font glyph. |
| D-16 | "Credits" in Qanvast Ops and Return Lead (lead credits) | Nothing | Nothing is renamed there; the new feature always says "AI credits". |
| D-17 | The owner's running :3000 | A new migration (0057) | Migrate `local.db` at once and restart :3000 (the price-book lesson: a schema on disk breaks the running dev server until it is migrated). |
| D-18 | Maison AI › Reset prototype to base | Must reset the plan and credits too | It follows from D-12. |

---

## E. What this means for the questions

The questions in the audit's §8 are updated so that **1.0's definitions stand wherever changing them isn't worth the cost.**

- **Now "Keep 1.0":**
  - Q-08 (a Designer's figures);
  - Q-13 (seats, no enforcement);
  - Q-14 (Dodo);
  - Q-21 (one 1,000 pack for now);
  - Q-23 (Owner buys and sets amounts);
  - Q-24 (Owner and Admin see the studio);
  - Q-25 and Q-34 (a permanent raise now; the temporary raise later);
  - the held render in Q-34 (bell and press again).
- **Changed only because 1.0 breaks its own promise:** B-06 · B-07 · B-08 · B-09 · B-12 (Q-43).
- **Still your call:**
  - Q-26 (the provider-cost column);
  - Q-28 (Drift repair);
  - Q-31 (cancel = free needs 1.0's routes to refund aborts);
  - Q-15 (GST words);
  - Q-47 (rollover).
- **Everything else is additive.**
