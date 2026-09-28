# A — 1.0: the rules, the money and the payments (credits, plans, metering, Dodo)

> Reader's report for the AI credits audit (`../19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`), banked as written. 1.0 = `qanvast-id-tool` on `origin/feat/om-ui-port` @ `3174b912f` (2026-09-27), read with `git show`; nothing was checked out. Rows marked **[inferred]** were worked out from the code, not run.

OpenMaison 1.0: AI credits and billing, as read from the code and docs

Where this comes from
- Repo: /Users/vicky/Documents/GitHub/qanvast-id-tool. Branch origin/feat/om-ui-port, head 3174b912f (2026-09-27). Everything was read with `git show` / `git grep`, and the working tree was not touched. All paths below are relative to that repo root on that branch.
- I read every document you listed. The Dodo spec, the anonymous-first spec, the signup-gating spec and plan, the launch runbook, the launch-blockers plan, the launch-inputs checklist, the onboarding plan and the mockups in design/*.dc.html also bear on this, so I read those too.
- Migration numbering: the plans call the migrations 301–305, but the shipped files are 317 (plans), 318 (ledger), 319 (spend), 320 (grant) and 321 (Dodo). Most migration headers still say "NOT YET APPLIED ANYWHERE". The later docs describe a live PLG database, with plan rows "mirror the live PLG database on 2026-09-22" and Dodo test products "verified … 2026-09-22".
- I label anything I worked out rather than read as **[inferred]**.

## Bottom line: problems the audit should know about first
All of these are **[inferred]** from reading the code; none was run.
- **Co-Pilot is not charged at all.** The per-10-minute meter exists but nothing calls it.
- **Paid-plan credits never expire.** The webhook files a subscription's monthly allowance in the top-up bucket, which contradicts "Plan credits do not roll over".
- **Annual subscribers get one month of credits per year.** The allowance is granted only on the yearly renewal.
- **Pro Studio can be charged S$300/month.** The checkout sends 3 seats against a product priced at S$100 for all three.
- **A lapsed studio can be stuck.** After lapsing from past_due it may never get Free's monthly 30 credits, and may be blocked from resubscribing.
- **Plan feature gates are not enforced anywhere.** Free studios can use Quote X-Ray.
- **Most existing studios are unmetered in practice.** Studios without a balance row get everything through.
- **There is no top-up slider and no "Manage billing".**

## 1. Business model

### 1.1 The unit, and what it is called
- 1 credit = US$0.0068312 of provider cost (`USD_PER_CREDIT`, src/lib/credits/schedule.ts). The anchor is **1 fast render = 10 credits = $0.068312**, measured 2026-09-01 on gemini-3.1-flash-image.
- The ledger doubles as usage data: each row stores `actual_cost_usd`, filled in after the model call by `record_spend_cost()` (migration 314).
- The user-facing name is inconsistent:
  - The public /pricing page says **"tokens"** everywhere.
  - Inside the app, every surface says **"credits"**: the pill, the blocked dialog, Settings → Usage.
  - The credits spec left this open: "Decide the user-facing name before UI work."
  - src/data/mock-credits.ts is a different thing: Qanvast marketing (lead) credits. The spec calls that half dead code.

### 1.2 Plans
Source: scripts/migrations/317_credit_plans.sql, 326, 327. Prices are stored in SGD cents.

| id | Name | Monthly | Annual | Credits / seat / month | Min seats → pooled | Extra seat | Other |
|---|---|---|---|---|---|---|---|
| free | Free | S$0 | S$0 | 30 | 1 → 30 | — | 150 one-time signup grant; storage 1 GB; unlimited members |
| pro_freelance | Pro — Freelance | S$35 (3500) | S$385 (38500) | 1,500 | 1 → 1,500 | — | max_members 1; 10 GB; badge "Most Popular" |
| pro_studio | Pro — Studio | S$100 (10000) | S$1,100 (110000) | 1,500 | 3 → 4,500 | S$35/seat/month (3500) | 10 GB |
| max | Max | S$70 (7000) | S$770 (77000) | 3,000 | 1 → 3,000 | — | `is_contact_sales = true`; 100 GB |

- Annual pricing is 11× monthly. The doc wording is "the tracker's '1 month extra for annual purchase' expressed as a price". The pricing page computes the saving from the two prices and shows "Annual · 1 month free".
- **Max is not sold online.** Its price shows as "Let's talk" with the line "Priced per seat, against a signed agreement." The button "Talk to us" goes to /contact?plan=max. Checkout refuses it with 409 `contact_sales` ("This plan is arranged with our team."). The spec's figure is S$70/seat for 3,000/seat, "exactly 2× PRO".
- The old plans (starter S$0, pro S$49/mo, enterprise) are switched off, not deleted; 46 studios still point at them. /admin/billing is still a hard-coded mock showing those old prices (Pro S$49, Enterprise S$1,440/yr).
- Dodo **test-mode** products (migration 327):

| Product id | Product | Price |
|---|---|---|
| pdt_0Nniqprr7SBKfAayqJWIG | PRO — Freelance | SGD 35 monthly |
| pdt_0Nniqpvic7JmxPVDaNS4o | PRO — Studio | SGD 100 monthly |
| pdt_0No9QEKGH0CM756y2K4NE | PRO — Freelance (Annual) | SGD 385 |
| pdt_0No9QELwVN4eZpGAwrAI3 | PRO — Studio (Annual) | SGD 1,100 |
| pdt_0Nniqq3T42xoyygqJPXA9 | Top-up (env `DODO_TOPUP_PRODUCT_ID`) | — |

- Migration 311, now superseded, also gave Max a product (pdt_0Nniqq0JPof4TPcIB8ZvP, SGD 70). Live-mode ids do not exist yet; the runbook lists this as blocker D.

Economics from the credits spec §4 (utilisation not measured):

| Plan | Worst-case provider cost | % of revenue |
|---|---|---|
| Free | $1.02 + $0.20/month | — |
| Pro Freelance | $10.25 | 39.6% |
| Pro Studio | $30.74 | 41.5% |
| Max | $20.49/seat | 39.6% |
| Top-up | $6.83 | 2.2× margin |

The handoff's "~16% expected" figure borrows a 40% industry utilisation norm.

### 1.3 What Free gets, and trials
- **Credits:** 150 on signup, then 30 a month. The 150 is sized as exactly 10 fast renders plus 10 quote digitizations.
- **Co-Pilot:** one 30-minute meeting, once, never refreshed. It is stored as `free_copilot_blocks_remaining` = 3 ten-minute blocks, outside the credit pool. The pricing table shows it as "1 meeting".
- **Plan features:** every `feature_flags` value is false for Free.
- **No paid-plan trial.** Nothing sets a trial on a Dodo checkout; `trialing` only appears as a subscription status **[inferred]**.
- Pricing page trust lines: "No card to start" and "Cancel anytime, no lock-in".

### 1.4 Plan credits and top-up credits
There are two buckets on `studio_credit_balances` (migration 318):
- `plan_credits`: "Refreshes monthly, no rollover. Spent BEFORE topup_credits."
- `topup_credits`: "Purchased. Never expires. Spent only after plan_credits is exhausted."
- Neither can go negative (CHECK constraints).

**Which is spent first:** plan credits. The debit takes `LEAST(plan_credits, charge)` from plan credits and the rest from top-ups (319_spend_credits_fn.sql). The spec's reason: "Reversing this burns purchased credits while free ones expire unused."

**Which bucket each kind of grant lands in** (`grant_credits()`, migration 320):

| Grant reason | Bucket |
|---|---|
| refresh | plan_credits |
| topup | topup_credits |
| refund | topup_credits (deliberately, so the user is never left worse off) |
| grant, adjust | topup_credits |

**Monthly reset (Free only):**
- The `/api/cron/credit-refresh` job runs `0 2 1 * *` (02:00 UTC on the 1st).
- It overwrites `plan_credits` with the allowance (no rollover), moves the period on a calendar month, and never touches top-ups.
- It **skips any studio with a live subscription** (active, past_due or trialing), because the Dodo webhook owns paid balances.
- It writes directly to the balance table. **[inferred]** No ledger row is written for a refresh or for the signup grant, so the "Monthly credits renewed" activity label never appears for these.

**Paid-plan allowance goes to the wrong bucket. [inferred bug]**
- The webhook grants the paid allowance through `grant_credits` with reason `'grant'` and action `plan_allowance`.
- That lands in `topup_credits`. Paid monthly credits therefore never expire, pile up, and appear as "Top-up" on the Usage page.
- This contradicts the page copy "Plan credits do not roll over".

**Free signup grant can vanish within days. [inferred]**
- The 150 signup credits are stored as `plan_credits`.
- On the next 1st of the month the cron overwrites them to 30. Someone who signs up on the 28th loses most of the 150 within days.

**How the split is described to users:**
- Usage page: "Plan credits do not roll over. Top-up credits never expire."
- Pricing page: "Monthly tokens reset at the end of each period. Tokens you top up never expire, and your plan's are always spent first so you never lose ones you paid for."

### 1.5 Top-up
- It is one fixed product: **1,000 credits for S$20**. The webhook hard-codes `TOPUP_CREDITS = 1000`, and checkout always sends quantity 1.
- S$2.00 per 100 credits is only arithmetic. No per-100 rate, **slider, or amount picker exists anywhere on the branch**, so there is no min/max/step. A quick grep of the openmaison-prototype repo's .ts/.tsx files for top-up/per-100 also found nothing (not exhaustive).
- Copy that mentions it:
  - Pricing FAQ: "You can top up 1,000 tokens for S$20".
  - Blocked mockup: "Buy 1,000 credits · S$20".
  - Implemented button text is just "Buy credits".
- Open questions: the credits spec asked whether Free/Pro users should see top-up before payments existed. The Dodo spec asks to "confirm it matches what is configured in Dodo".

### 1.6 Tax wording
- **There is no tax copy on any billing surface**: no "incl./excl. GST" on /pricing, the checkout hand-off or the dialogs.
- The Dodo spec: Dodo is Merchant of Record, so "GST/VAT across SG/MY/AE/IN is their obligation, not ours."
- The only related user copy is in the pricing FAQ: "…with local taxes, phone formats and property types inside the product. Prices are published in Singapore dollars."
- Open question: multi-region pricing. Plans are stored in SGD while studios can be SG/MY/AE/IN.

### 1.7 Pricing page copy
Files: src/app/(marketing)/pricing/page-client.tsx and pricing-data.ts.

**Hero and toggles**
- Heading: "Pricing that respects your margins."
- Lead line: "Start free with no card. AI runs on tokens, so you pay for what you use — and you can see exactly what each action costs before you spend it."
- Billing toggle: "Monthly" / "Annual · 1 month free".
- The Pro card has a "Freelance / Studio" toggle.

**The three cards**
- Taglines:
  - Free: "Everything you need to see if this fits."
  - Pro: "For a working studio that bills clients."
  - Max: "For firms that need it bent to their shape."
- Price suffixes: "forever" (Free), "/month", "/year".
- Seat lines:
  - Pro Studio: "For 3 seats · S$35 per extra seat/month".
  - Pro Freelance: "1 seat".
- Buttons: "Start free", "Get started", "Talk to us".
- Token lines under each card:
  - Free: "150 tokens to start, then 30 a month".
  - Pro Freelance: "1,500 tokens a month, per seat".
  - Pro Studio: "4,500 tokens a month, pooled across 3 seats".
  - Max: "3,000 tokens a month, per seat".

**What an allowance buys** (heading "A token is a unit of AI, not a mystery.")

| Allowance | Renders | Quotes digitized | Co-Pilot |
|---|---|---|---|
| 150 · Free, to start | 15 | 30 | 1 h |
| 1,500 · Pro Freelance | 150 | 300 | 10 h |
| 4,500 · Pro Studio | 450 | 900 | 30 h |
| 3,000 · Max, per seat | 300 | 600 | 20 h |

**Comparison matrix, AI tools rows**
- AI Visualizer, Quote digitizer and mAIson Bot read "Tokens" in every column.
- Meeting Co-Pilot reads "1 meeting" for Free and "Tokens" for Pro and Max.
- The gated feature rows get their ticks from `feature_flags`.

**FAQ, verbatim**
- "What is a token?" — "A unit of AI. One render is 10 tokens, digitizing a quote is 5, ten minutes of Meeting Co-Pilot is 25. Every button shows its cost before you press it, so nothing is spent by surprise. Everything that is not AI — leads, projects, quotes, finance — is unmetered on every plan."
- "Do I need a card to start?" — "No. You get 150 tokens on signup and 30 a month after that, with no card and no expiry date on the account. The tools also run before you sign up at all."
- "What happens when I run out of tokens?" — "The AI actions pause; nothing else does. … You can top up 1,000 tokens for S$20, or move up a plan — and topped-up tokens never expire."
- "Why is Studio three seats?" — "…starts at three licences and pools 4,500 tokens across them … Extra seats are S$35 each per month…"
- "Can I change plans later?" — "Anytime, in either direction. Upgrades take effect immediately; downgrades at the end of your billing period…"
  - **[inferred]** No self-serve plan change exists in the code (see 4.7).

## 2. Metered actions

### 2.1 Price list (`CREDIT_SCHEDULE`, src/lib/credits/schedule.ts)
This is the single source of truth. The UI reads it from GET /api/credits/schedule (login required; the measured cost is not returned).

| Key | Label | Credits | Measured cost (USD) |
|---|---|---|---|
| lead_email_parse | Parse enquiry email | 0 | 0.000549 |
| lead_screenshot_parse | Parse screenshot | 0 | 0.001174 |
| render_segment | Segment surfaces | 0 | 0.001421 |
| render_detect | Detect surfaces | 0 | 0.002802 |
| quote_digitize | Digitize quote | 5 | 0.023898 |
| render_fast_lite | Draft render | 5 | 0.034156 (not exposed) |
| render_defurnish | Defurnish room | 10 | 0.068130 |
| render_fast | Render | 10 | 0.068312 |
| render_photorealistic | Photorealistic render | 15 | 0.090000 |
| render_pro | Pro render | 20 | 0.138664 |
| render_repair | Drift repair | 2 | 0.068312 |
| copilot_block | Co-Pilot (10 min) | 25 | 0.177000 |

- **Zero-credit actions are unmetered:** no ledger row and no balance check. The anonymous path has its own ceiling on them (see 5.3).
- **Variants:** credits × variants, charged as one debit. A 3-variant pro render is one charge of 60. All variants run together, so if any fails the whole call fails and the whole charge is refunded.
- **Drift repair** is priced below cost on purpose ("the incentive to reduce drift should sit with us"). The auto-fix loop is capped at 1 attempt, so one advertised 10-credit click costs at most 12; it used to be 50.
- **Model to price mapping** (`renderActionForModel`):

| Model | Action | Credits |
|---|---|---|
| gemini-3.1-flash-lite-image | render_fast_lite | 5 |
| gemini-3.1-flash-image | render_fast | 10 |
| gemini-2.5-flash-image (mAIson Bot) | render_fast | 10 |
| flux.2-pro | render_photorealistic | 15 |
| gemini-3-pro-image(-preview) | render_pro | 20 |
| unknown | render_pro | 20 ("never guess cheap") |

### 2.2 Routes that charge

| Route | Action charged | Default model → credits | Notes |
|---|---|---|---|
| POST /api/render | by model | client sends the model; visualizer default flash → 10 | × variants |
| /api/render/declutter | model's action, else render_defurnish | visualizer sends the flash model → render_fast 10 | **[inferred]** logs as "Render", not "Defurnish room" |
| /api/render/photorealistic | render_photorealistic | 15 | |
| /api/render/drift-fix | render_repair | 2 | |
| /api/render/relight | by model | flash → 10 | |
| /api/render/style-transfer | by model | flash → 10 | charged once per variant call |
| /api/render/auto-furnish | by model | flash → 10 | |
| /api/render/depth | by model | pro → 20 | |
| /api/render/outpaint | by model | pro → 20 | |
| /api/render/reangle | by model | pro → 20 | grid and single modes each charge once |
| /api/quotes/parse | quote_digitize | 5 | |
| /api/copilot/render | by model | pro → 20 | |
| /api/copilot/moodboard | by model | pro → 20 | |
| mAIson Bot `generate_render` tool (src/lib/agents/executors.ts) | render_fast | 10 | refusal text: "This studio is out of render credits — generate_render was not run." |

**Not charged at all:**
- Quote X-Ray (all /api/quote-xrays routes).
- mAIson Bot chat. Measured at $0.0078 per iteration, up to 10 iterations; the doc says this "needs a product decision".
- detect, segment, room-analyze, style-analyze and drift-check.
- orbit-video and floorplan-3d-sandbox.
- Co-Pilot sessions (see 2.4).

### 2.3 When the charge happens and when it is refunded
The server charges before doing the work (src/lib/credits/guard.ts, `guardCredits`). The steps:
- It runs after the request body and file are validated and after the dry-run short-circuit. "A 415 must never cost a credit."
- It resolves permission in this order: role → plan → member cap → credits.
- It debits atomically with a row lock.
- Every route refunds on every failure path with `gate.refund()`. The refund goes through `grant_credits` with reason refund, the reference `<refId>:refund`, and lands in the top-up bucket.
- After success, the real provider cost is attached to the ledger row.

**Idempotency** is keyed on (studio, action, ref). The refs are random per request, e.g. `render:<uuid>`, so a client retry of the same HTTP request double-charges. This is documented in the route comments. A caller that only got "already_charged" or "shadow" is not given a refund.

**How refunds are shown:**
- Recent activity shows "Credit refunded" as a green "+N".
- The per-tool breakdown nets refunds off and says "N credit(s) refunded in this period has/have already been deducted below."
- **No refund message appears in the tool itself at the moment of failure** (grep found none).

### 2.4 Co-Pilot, charged by time (src/lib/credits/copilot-meter.ts)
How it is designed:
- 25 credits per **completed** 10-minute block, with the reference `session:<id>:block:<n>` so reconnects cannot double-charge.
- When credits run out it reports that rather than throwing, so the caller can end the meeting gracefully ("never mid-sentence").
- Free trial blocks are used before the pool.

**[inferred]** What the code actually does:
- **`meterCopilotSession` has no production caller** (only tests reference it), so Co-Pilot is currently free for everyone.
- The free-block check never decrements `free_copilot_blocks_remaining`.
- Once elapsed blocks exceed the free count, it charges from block 1.
- The column defaults to 3 for every studio, not just Free.

### 2.5 Cost labels in the UI
- In the Visualizer, the primary button's trailing text is "· {cost}" followed by the token icon (screen readers hear "credits"). Model names are hidden.
- The price is shown on purpose. Owner call 2026-09-16, reversing the earlier "no cost either": "a user who cannot see the price of an action only learns it by being refused."
- Quality presets are "Fast" (flash) and "High quality" (FLUX).

## 3. Rules

### 3.1 Who can do what
Roles are defined in src/lib/access-control.ts.
- "admin" means "Same access as owner except plan/billing".
- `settings.editStudio` is owner-only; admin is explicitly denied.

| Action | Who | Where enforced |
|---|---|---|
| Buy credits / start checkout | settings.editStudio (owner; custom roles can grant it) | POST /api/billing/checkout; the dialog's `canPurchase` must match (a test enforces this) |
| Buy button on the Usage page | `isOwner(tags)` only | **[inferred]** a custom-role purchaser sees it disabled here |
| Set or clear member monthly caps | owner via settings.editStudio; target must be an active member; cap 0 to 2147483647; blank = no cap (row deleted) | PUT /api/credits/caps |
| See the studio pool, plan/top-up split, plan, seats, allowance, dollar costs, balance column | owner or admin tag, or anyone with settings.editStudio | redacted to null server-side by `resolveTrustedActor`; decisions 2026-09-17 (pool) and 2026-09-21 (dollars) |
| Everyone else | sees only their own usage, cap and "Refreshes" date | same |
| Assign a plan, set seats, flip enforcement | platform admins only (super_admin, or an admin allowed the "plans" page), cross-tenant | /api/admin/plans-audit and /admin/plans; no studio user can |

- **[inferred]** The checkout route's role lookup falls back to the "id" role for a caller with no tags. That is the fail-open case that was fixed in the caps route but not here.

### 3.2 Refusal responses
| Response | Meaning |
|---|---|
| 402 `{error:"insufficient_credits", needed}` | pool too low; the balance was removed from the body so it doesn't leak |
| 402 `{error:"member_cap_reached", needed, remaining}` | personal cap reached |
| 403 `{error:"plan_required", feature, requiredPlan:"pro_freelance"}` | plan gate |
| 403 `{error:"forbidden"}` | role gate |

- On the client, `meteredFetch` spots these and publishes to a small event bus. A single `CreditBlockProvider` in the main layout shows `CreditBlockedDialog`.
- A 402 is never retried, and a 500 is never shown as a paywall.

### 3.3 When the studio pool is empty
- Title: "Your studio is out of credits".
- For someone who can buy:
  - Body: "This needs {needed} credits. Your studio has {balance} left." The balance comes from the permission-checked balance endpoint; if it isn't known, only "This needs {needed} credits."
  - Buttons: "Buy credits" (top-up) and "Upgrade plan", which always starts a Pro Freelance, monthly, 1-seat checkout.
- For someone who can't buy:
  - Body: "Ask your studio owner to top up, and this will work again."
  - Button: "Close" only.
- If billing isn't configured, the buttons are disabled with the tooltip "Billing isn't set up for this environment yet — ask an admin to configure it."

### 3.4 When a member hits their cap
- Title: "You've used your monthly credits".
- Body: "This needs {needed} credits and you have {remaining} left of your personal allowance. Your studio still has credits available."
- Buttons: "Request more", which does nothing on purpose ("not a checkout", with no decision on where it goes), and "Close".
- How the cap works:
  - Used amount = sum of real spend rows over the resolved billing period.
  - The same window is passed to the SQL as `p_period_start`, so the page and the refusal agree.
  - In shadow mode the cap also counts shadow spend.

### 3.5 Plan feature gates
- The dialog branch exists: "{Feature} is included in Pro" / "Upgrade to unlock it for your whole studio." with "Upgrade to Pro" and "Not now".
- **[inferred] No route passes a feature to `guardCredits`, and no locked-feature UI exists.** `feature_flags` are only read by the pricing page to draw ticks. Free studios can use Quote X-Ray, and it is uncharged.
- The spec's intended treatment was: show the real UI with a lock and an "Included in PRO" badge, not hidden. The mockup is design/LockedFeature.dc.html with "Upgrade to Pro · S$35/mo" and "You're on Free".

### 3.6 Enforcement defaults and shadow mode
**What shadow mode does:**
- The debit function writes a `shadow_spend` or `would_block` row carrying the amount it would have charged.
- It debits nothing and never refuses.
- Real consumption must be counted from `reason='spend'` only.

**The defaults:**
- Originally the column default was false.
- The 2026-09-20 runbook decided "SHIP IN SHADOW", and noted that signing up removed the limit while anonymous visitors were capped.
- On 2026-09-21 that was reversed for new studios:
  - Migration 325 made the default true.
  - `grantSignupCredits` writes enforcement true.
  - **Existing studios stay in shadow** (decision 2026-09-21, no backfill).

**Flipping per studio:** only through the admin PATCH, with these guards:
- 400 "Assign a plan before enabling enforcement".
- 409 "Studio has no credit balance row; nothing to flip".
- 400 "Studio has no credits; granting credits must happen before enforcement."
- Unassigning a plan forces enforcement off.
- Assigning a plan grants no credits; the docs leave that as an open product decision.

**[inferred] Studios without a balance row are unlimited.**
- Only self-serve signup creates balance rows; there is no backfill.
- For any studio without one (pre-existing, admin-created), the credit context comes back with enforcement off. The guard then takes the shadow path and lets every metered action through.
- The owner's pill meanwhile shows 0.

**Stale copy:** the admin screen still says "Enforcement is off by default. Until it is on, a studio is metered but never blocked."

### 3.7 Grace and overdraft
- **There is no overdraft.** Balances cannot go negative, and a spend is refused if the total is short.
- Co-Pilot running out was designed to end the session gracefully.
- The only grace period is subscription lapse (below).

### 3.8 Lapse
Sources: src/lib/billing/lapse.ts and the /api/cron/billing-lapse job (runs `0 5 * * *`, daily at 05:00 UTC).

**The rule:** "a payment failure NEVER changes planId. Only grace.expired does."

**Events:**
- on_hold or past_due → status past_due, grace until now + **14 days**. This is a backstop, not a timer, because Dodo's own retries run past 7 days.
- cancelled → status cancelled, grace until the current period end.
- payment.succeeded during grace → active, grace cleared, nothing re-granted.
- Grace expired (strictly earlier than now) → `studios.plan_id` = 'free'.

**At the drop:** plan credits are left alone, and top-up credits are never touched. The cron also expires checkout sessions still pending after 24 hours. The two dunning warnings are deferred (they need the notification rules).

**[inferred bug]**
- The sweep leaves the subscription at past_due. The refresh cron treats past_due as live, so the studio never receives Free's 30 a month.
- The one-live-subscription-per-studio index would also make a later resubscribe's subscription insert fail and retry forever.

### 3.9 Which billing period applies (src/lib/credits/billing-period.ts)
- It always returns a window containing today.
- Each boundary is computed from the original anchor (`addMonthsUtc(anchor, k × months)`), with 12 months for an annual period and a calendar-month fallback.
- One resolver is shared by the Usage page, the credit context and the spend SQL.
- Nothing advances the stored period for a paid studio, and the resolver deliberately does not read the Dodo anniversary.
- **[inferred]** So in practice the cap window and the "Renews" date follow the calendar-month anchor from signup, while Dodo grants on the subscription anniversary.

### 3.10 Scheduled jobs (vercel.json)
| Job | Schedule |
|---|---|
| credit-refresh | `0 2 1 * *` |
| billing-lapse | `0 5 * * *` |
| anon-sweep | `0 6 * * *` |
| anon-storage-gc | `0 8 * * *` |

## 4. Payments (Dodo)

### 4.1 Provider
- Dodo Payments is Merchant of Record. Server SDK `dodopayments`, client SDK `dodopayments-checkout`.
- Scope is "Flow A" only: the studio pays OpenMaison. Homeowner payments ("Flow B") are out of scope.
- **Dodo instead of Stripe** is a recorded deviation from the tracker (decided 2026-09-21). Moving to Stripe, if ever required, is Phase 3.

### 4.2 Starting a checkout (POST /api/billing/checkout)
- Body: `{kind:'topup'|'plan', planId?, seats?, period?:'monthly'|'yearly'}`. Any other period value is a 400.
- The studio and member always come from the session, never the body.
- Checks and responses:
  - Owner check → 403.
  - `DODO_API_KEY` missing → 503 "Billing is not configured for this environment".
  - Unknown plan → 400.
  - Contact-sales plan → 409.
  - No product configured → 503.
- It writes a pending checkout-session row first, then calls Dodo with the product and metadata {studio_id, member_id, kind, period, checkout_row_id, plan_id}.
  - For a plan, quantity = seats; for a top-up, quantity = 1.
  - **No `return_url` is passed.**
- Dodo failure → the row is marked failed and the route returns 502.
- Success returns `{checkoutUrl, checkoutRowId}`.

### 4.3 Overlay versus redirect
**In-app purchases use an overlay.** This covers the blocked dialog and the Usage page "Buy credits" (src/hooks/use-checkout.ts).
- `DodoPayments.Initialize({mode, displayType:"overlay"})`, then `Checkout.open`.
- It polls GET /api/billing/checkout/[id] every 2 s for up to 60 s. A studio that doesn't own the row gets 404.
- "checkout.closed is not paid": only the poll can mark success.
- A 60-second timeout is never shown as a failure.
- The hook sends only kind and planId, never period or seats.

**The /pricing route is a full-page redirect.** The flow:
- /pricing → /login?redirectTo=/upgrade?plan=…&period=…&seats=…
- /upgrade (src/app/(main)/upgrade/page.tsx) calls `window.location.replace(checkoutUrl)` to Dodo's hosted page.
- It waits for the session first, and sends owners who haven't finished setup to /studio-setup?next=… (this fixed a race).
- **[inferred]** Where Dodo returns the buyer after payment is not set in code.

**Upgrade page copy:**
- "Taking you to checkout…" / "One moment. You will be able to review everything before you pay."
- No plan: "Choose a plan" / "See plans".
- 403: "Only the studio owner can change the plan".
- 409: "Max is arranged with our team".
- 503: "Checkout is not available right now … Nothing was charged."
- Other errors: "We could not start the checkout" / "We could not reach the checkout".

### 4.4 The checkout status line (src/components/credits/checkout-status-line.tsx)
| Phase | Copy |
|---|---|
| starting | "Opening checkout…" |
| polling | "Waiting for payment confirmation…" |
| completed | "Payment received — your credits are ready." |
| processing | "Payment is processing — your credits will appear shortly." |
| error | message, or "Something went wrong. Please try again." |

### 4.5 Webhook (/api/webhooks/dodo)
This is the only thing allowed to grant purchased credits.

**Order of operations:**
- Read the raw body.
- Verify the signature with `DODO_WEBHOOK_SECRET`. A missing secret gives 401 in every environment.
- Drop duplicates via `billing_webhook_events` (unique provider + event_id).
- Find the studio from our own row (the checkout-session row or the subscription row). Metadata that disagrees is recorded as unresolved and nothing is granted.

**Events handled:**
- Top-up paid → +1,000 to the top-up bucket, keyed on the payment id (not the webhook id); the checkout row is marked completed with 1,000 granted.
- First subscription.active → grant `credit_allowance × seats` (action plan_allowance, ref `{sub}:{period_start}`), set the studio's plan, complete the checkout row, insert the subscription row.
- renewed / active → grant again and move the period on.
- plan_changed → grant the difference on an upgrade, no clawback on a downgrade. The target plan is found by the **monthly** product id only; **[inferred]** an annual change would come back unresolved.
- refund.succeeded → flagged for manual review.
- Events it knows to ignore, or doesn't recognise, still get a 200.
- Out-of-order events are skipped using `last_event_at`.
- Credits are always granted before any state write.

**Known accepted edge case:** upgrade → downgrade → upgrade within one period grants the difference twice.

### 4.6 Annual product and seats
**Annual:**
- The annual price uses a second product id per plan; the period is recorded on the checkout row (migration 328).
- **[inferred]** The allowance is still the monthly per-seat figure and is granted once per renewal, so annual subscribers get one month's credits per year.

**Seats:**
- `min_seats` is 3 for Pro Studio. The per-seat price (`extra_seat_price_cents` 3500) is shown on the page only.
- Seats are fixed at purchase; self-serve seat changes are deferred ("contact-us for v1"). Admins can set seats on a live subscription.
- **[inferred risk]** Pricing sends seats=3 for Studio, and checkout sets quantity=3 against a product priced SGD 100 for the plan, so the buyer may be charged 3 × S$100 = S$300/month. There is no separate extra-seat product. Verify this in Dodo test mode.

### 4.7 "Manage billing"
**It does not exist.**
- No customer portal or invoice UI for studios; the only mention of a portal is a code comment in the webhook.
- The Usage page "Change plan" button is disabled with the tooltip "Changing plan isn't self-serve yet — talk to us and we'll move you."
- "Request more" does nothing.
- The side rail's "Upgrade" link goes to /upgrade with no plan, which shows "Choose a plan" → /pricing.

**Environment variables:** `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_ENVIRONMENT` (test_mode/live_mode, defaults to test), `DODO_TOPUP_PRODUCT_ID`, and `NEXT_PUBLIC_DODO_ENVIRONMENT` for the overlay.

## 5. Self-serve signup, anonymous visitors and credits

### 5.1 Self-serve signup
- An unknown phone number creates a studio (src/lib/auth/provision-studio.ts) on the Free plan. The owner gets tags owner, admin and id.
- Then `grantSignupCredits` runs: 150 plan credits, calendar-month period, enforcement on.
- Anonymous work is claimed into the new studio in the same request.
- Signup is controlled by the `signup_paused` switch, seeded **true** by migration 324.
- Signup rate limits: 5 per hour per IP and 3 per hour per phone, stored as hashed keys.
- **Turnstile** keys are required. Without them, production blocks the anonymous and signup paths (403).
- **Master OTP:** `bypass_otp` is an accepted risk and now mints tenancies.
- **Naming:** studios were named "Studio ••••1234" at first. Onboarding has since been cut to one screen (name, optional email, studio name, country) — commit b4bc74270.

### 5.2 The "50 free tokens"
- `ANON_GRANT = 50` (src/lib/anon/quota.ts, `anon_spend_tokens` in migration 316). That is five fast renders; the worst case is "$0.34 per visitor".
- **Fast tier only.** Allowed actions: the 4 unmetered ones, quote_digitize, render_fast_lite, render_defurnish, render_fast.
- Turnstile is checked before a visitor's first spend.
- Unmetered calls are capped at 60 per workspace for its 7-day life.
- At most 25 workspaces per IP per 24 hours. Anonymous output is watermarked; if watermarking fails the image is served without it.

**Anonymous refusal dialog copy:**
- Quota: "Create an account to keep going" / "You've used your free allowance. Your work is saved — sign up and it moves straight into your studio."
- Tier: "The better models need an account".
- Expired: "Pick up where you left off".
- Turnstile: "One more check" … "Try again".

**What happened to the visible counter:**
- 2026-09-22: the label was changed to "50 credits" rather than "50 free", and the "50 of 50 free tokens left" subtitle was dropped.
- 2026-09-23 (commit efb1af3ff): the whole visible counter was removed.
- **The server-side 50-token limit still applies.**

**The signup-gating model (2026-09-22):**
- Every route is open, walled (blurred demo data behind a dismissible signup ask) or private.
- The gate fires when a visitor uploads **their own photo or quote**. Generating on bundled sample photos stays ungated and still costs us money, by design.
- /tools/ai-visualizer is the landing page for paid campaigns. /try-visualizer and its six sub-paths redirect there (308).

**Other anonymous limits:**
- 3 leads.
- 1 digitizer parse. I did not verify whether this is reachable behind the upload gate.
- The anonymous Quote X-Ray route was removed.
- /api/demo/restyle allows 1 own-photo render per browser (om_demo_v1 cookie) and 4 per minute per IP.

## 6. Decisions, open questions and known issues

**Credits spec (2026-09-02)**
- Decisions: the 10-credit anchor; round numbers, 5-credit minimum; zero means unmetered; variants as one debit; three rows priced up to 3.5% under cost; the plan allowances; Free's Co-Pilot as blocks rather than credits; `feature_flags` as the gate source; spend plan credits first; member usage calculated from the ledger, not stored; idempotency; append-only ledger; resolution order; charge before work, refund on failure; the 402 response family; price list served from the server; Co-Pilot in 10-minute blocks; shadow mode; plan features shown with a lock rather than hidden; rollout shadow → audit → flip.
- Out of scope then: Stripe checkout, in-app plan comparison, self-serve downgrade, the old /try-visualizer.
- Open (§10): top-up visibility before payments existed; what to charge for mAIson Bot; Quote X-Ray cost unmeasured; Deepgram rate unconfirmed (~45% of Co-Pilot cost); the naming question.

**Handoff (2026-09-04)**
- Settled: the subscriptions table is the billing record; credit periods anchor to the subscription; allowance is per seat; 14-day grace backstop.
- Open: mAIson Bot and X-Ray uncharged; the 46-studio plan audit; Stripe naming (since fixed in migration 321).

**Dodo spec**
- Decisions: see 4.1–4.5 and the lapse rules.
- Deferred: seat changes, refund clawback, homeowner payments.
- Open: where Max leads go (a lead form to BD is unresolved); test versus live products; multi-region pricing; confirming the top-up price.

**Plans**
- Enforcement: `guardCredits` replaced the spec's route wrapper.
- UI: the locked-feature treatment and bulk plan assignment were deferred; enforcement flips should go to the audit log.
- Paywall wiring: dialogs can appear from Co-Pilot routes without a direct click; nothing grants credits when a plan is assigned.
- Payments: dunning warnings deferred.

**Gated acquisition spec (2026-09-21)**
- Decisions: Dodo, not Stripe; existing studios stay in shadow; the launch bar is "Tier 1".
- Open: uploads between 4.5 and 8 MB hit Vercel's limit; "Refunded is not free" (a refund can be abused on anonymous X-Ray); MY/AE/IN visitors can't complete X-Ray; `actual_cost_usd` is never read.

**Other decisions recorded in code or docs**
- 2026-09-17: studio-wide figures are owner/admin only.
- 2026-09-21: dollar costs are owner/admin only.
- Runbook 3.2 and 3.3 asked whether 50 anonymous tokens and 150 Free credits were the right numbers; I found no recorded answer.

**Bugs the docs say were fixed**
- Refunds made as negative spends were silently failing.
- An ambiguous-column error in the spend function blocked every member with a cap.
- A studio could mint itself credits (fixed in 323).
- Plans were invisible to studio queries (fixed in 322).
- Functions were executable by the public role.
- A stale or month-end period anchor.
- A 200-row ledger window hid a designer's own history.
- Drift repairs were overcharged.
- The pool figure leaked through `creditsRemaining` and 402 bodies.

**Still open in the docs**
- A client retry double-charges.
- Refund safety relies on `runGenerate` never throwing.
- Utilisation is unmeasured.

**[inferred] Additional issues found by reading the code**
- The Usage page's member-table subtitle shows the literal text "can&apos;t" and "studio&apos;s".
- The credit pill is not refreshed after a spend.
- The balance mockups promised copy that was not built: "Notify Wei Ling", "Request more from Wei Ling", "Buy 1,000 credits · S$20", "Generate · 10 cr", "2,050 credits left after this", "Each variant costs full price — 3 pro renders is 60 cr."
- /admin/billing still shows mock data with the old prices.

## Where things are
- Server logic: src/lib/credits/, src/lib/billing/, src/app/api/credits/*, src/app/api/billing/checkout/*, src/app/api/webhooks/dodo/route.ts, src/app/api/cron/{credit-refresh,billing-lapse}.
- Screens: src/app/(main)/settings/usage/page.tsx, src/components/credits/*, src/context/credit-block-context.tsx, src/hooks/use-checkout.ts, src/app/(main)/upgrade/page.tsx, src/app/(marketing)/pricing/*.
- Admin: src/app/admin/plans/page.tsx, src/app/api/admin/plans-audit/route.ts.
- Anonymous: src/lib/anon/quota.ts, src/components/anon/signup-required-dialog.tsx.
- Mockups: design/{Main,Generate,Blocked,Usage,LockedFeature,AdminPlans}.dc.html.
- Preview harness only (not product): src/app/credits-preview/page.tsx.
