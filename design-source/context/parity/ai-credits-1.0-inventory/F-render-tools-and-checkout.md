# F — research: interior-design render tools, in-app checkout and Singapore GST (web, 2026-09-28)

> Research reader's report for the AI credits audit (`../19-ai-credits-1.0-to-2.0-audit-2026-09-28.md` §6), banked as written. Web sources cited inline; UNVERIFIED marks what the reader could not confirm. Not legal or tax advice — the GST lines are for the owner to take to finance.

AI credits, in-app upgrade and in-app checkout: research for OpenMaison 2.0 (as of 28 Sep 2026)

How to read this: [key] is a source listed at the end with its URL. UNVERIFIED means I saw it only in a search excerpt or a third-party page, or the official page wouldn't load. "Inference" means it's my own synthesis. I didn't log into any product, so every out-of-credits screen below is described from the vendor's docs, not seen. The session's web-search budget ran out partway through, so the later checks were done by fetching known URLs directly. I read the IRAS PDFs in full.

## 1. Headlines

1. **Two pricing families.** Gen-AI render tools sell monthly credit pools, with the cost weighted by the output (Spacely, mnml, Maket, Collov, REimagineHome, Paintit, Chaos Credits). Classic 3D/desktop renderers sell seats with "unlimited" renders (Houzz Pro, D5, Planner 5D Professional, Foyr Premium, Homestyler Master for 4K).
2. **Credit mechanics that suit a studio:**
   - one balance shared by all seats (Spacely, LookX Team, Chaos floating pool);
   - an admin-set cap per member, plus a "Request credits" path to the admin (Chaos, Figma);
   - balances expressed as "≈ N renders" (mnml, Spacely top-ups).
3. **Cost is published per action, and exploring is free.** Paintit shows the cost before you generate; Spacely, Maket and Homestyler publish per-action rates. Cheap exploratory steps cost nothing: REimagineHome chat and exploring, Homestyler unlimited 1K and speed previews, LookX unlimited image generation, Collov unlimited regeneration.
4. **Failed renders are refunded automatically by the credible tools.** Coohom refunds render coupons; Chaos Cloud refunds failed frames. Adobe users complain publicly when refunds can't be seen. Interior AI refuses refunds.
5. **Running out:**
   - Top-ups are instant and don't change the plan (Paintit, Spacely), and are usually for subscribers only (Spacely, Maket, Paintit).
   - Chaos Cloud pauses active jobs when credits run out. That's the argument for reserving credits when a render is submitted.
6. **Dodo Payments covers most in-app pieces:**
   - overlay checkout (the default) and inline checkout (labelled beta in the npm README) through `dodopayments-checkout`;
   - a hosted customer portal (24 h sessions);
   - seats as add-ons, with 4 proration modes and a preview call;
   - one-time credit packs;
   - a full credits ledger with rollover and expiry settings, a `credit.balance_low` webhook, and the balance shown in the portal.
7. **Dodo gaps for Singapore studios:**
   - No PayNow or GrabPay in its payment-methods list.
   - Apple Pay isn't supported in the overlay.
   - Invoices name the Dodo entity as seller; you can only customise the logo and brand name.
   - A company name prints on the invoice only when a tax ID is entered, and Singapore tax IDs get a format/checksum check only.
   - SGD through Adaptive Currency adds a 2–4% FX fee to the customer, unless you set Localized Pricing or absorb the fee.
   - Dodo doesn't block usage at a zero balance.
8. **Stripe, with OpenMaison as the seller, is the only option found with PayNow.** PayNow costs 1.3%, its QR code is valid for 1 hour, and it has no chargebacks. It can't auto-renew subscriptions (`send_invoice` only) and isn't available in Checkout's subscription mode. That makes it a good fit for credit top-ups and invoiced annual plans. Stripe prints `sg_gst` / `sg_uen` in the invoice header.
9. **Singapore GST.**
   - The rate is 9% since 1 Jan 2024.
   - A GST-registered local seller must show GST-inclusive prices, with the inclusive price at least as prominent as the exclusive one. It must issue tax invoices to GST-registered customers within 30 days.
   - An overseas merchant of record (MoR) under the Overseas Vendor Registration (OVR) regime charges GST unless the studio gives its GST number. Local tax-invoice and price-display rules don't apply to that vendor.
   - A GST-registered studio that is wrongly charged must get the GST refunded by the vendor; it can't claim it back as input tax.
10. **InvoiceNow (Peppol) is being phased in.** It already applies to new voluntary GST registrants (since 1 Apr 2026). It reaches every GST-registered business in phases from 1 Apr 2028 to 1 Apr 2031, and it covers both purchase and sales invoice data.
11. **Checkout UX:**
   - put the top-up in an overlay at the moment of need;
   - put plan choice on a page or large sheet with the comparison visible;
   - open "Manage billing" in a new tab (the Stripe portal can't be iframed; Dodo's portal is a hosted redirect);
   - show the GST-inclusive total and any proration before payment;
   - fulfil the order from webhooks, not from client events;
   - on success, show what changed, a reference, an invoice link and the next step.
12. **Couldn't verify:** PayNow usage statistics for SME B2B payments, and whether Singapore B2B SaaS companies usually show prices before GST.

## 2. Part A — visualisation tools

### 2.1 Tool by tool

- **Foyr Neo** [foyr]
  - Credits come bundled with seats:
    - Basic US$39/mo: 30 render credits/mo, 1 user.
    - Standard US$89/mo: 180/mo, 2 users, 3D walkthrough.
    - Premium US$159/mo: "Unlimited Render Credits", 5 users, 12K rendering.
  - HD, 2K and 4K renders on every plan.
  - 14-day trial; "No credit card details are required".
  - Not stated: cost per resolution, top-ups, refunds for failed renders.
  - Third-party listings show US$29/55/99 (UNVERIFIED [foyr-3p]).
- **Coohom** [coohom-price][coohom-help][coohom-fail][coohom-points]
  - Basic free, Pro US$29/mo, Elite US$69/mo, Enterprise through sales. Elite is "suitable for small team to share projects and model library".
  - The unit is plan-granted "rendering coupons". 8K and 16K/32K walkthrough coupons "can only be gained by paid plan".
  - Task-centre points convert to coupons for Pro and Elite only; points expire on 30 Jun or 31 Dec.
  - Failure: "Render coupon will be refunded to your account".
  - Upgrading from Plus to Pro monthly gives "no refund on the remaining days due to the rendering coupons already granted".
  - Unlimited 4K and 2x faster rendering on Pro per third parties (UNVERIFIED [coohom-3p]).
- **Homestyler** [homestyler] (prices showed in INR for our region)
  - Four units run side by side: monthly render quotas per resolution, AI credits, earned "coins", and pay-per-render packs.
  - Free: unlimited 1K renders; 2K/4K bought singly or in packs of 5/10; video costs 199–399 coins.
  - Pro: 75 each of 2K and 4K per month, 20 8K panoramas, 2 12K panoramas, video seconds, 100 AI credits.
  - Master: unlimited 4K, 6 12K panoramas, 300 AI credits.
  - Team (priced per seat): shared design space and model library, 500 AI credits per account per month, sub-account management, logo on renders.
  - Published AI rates: AI Render 25 credits for 2K and 35 for 4K; AI Stager 10 per image; AI Planner 15; AI Modeler 20.
- **Planner 5D** [planner5d]
  - Premium: "Standard renders", 100 AI Studio credits/mo.
  - Professional: "Unlimited 4K Renders", 360° panoramas, 1,000 credits/mo.
  - Trials "depend on eligibility".
  - Free plan = 5 lifetime HD renders (UNVERIFIED [p5d-3p]).
- **Spacely AI** [spacely-plans][spacely-credits][spacely-pricing]
  - Plans:
    - Personal US$25: 500 credits/mo, 1 seat.
    - Studio US$50: 1,500/mo, up to 2 seats.
    - Agency US$100: 3,500/mo, up to 5 seats; extra seats US$25/mo, or US$20 on yearly.
  - All seats draw from a "shared pool". Unused credits "rollover and stack up — no expiration date, as long as you're subscribed".
  - Top-ups: 200 credits for US$9 (labelled "~100 renders"), 1,000 for US$35, 5,000 for US$150. They are "added to your pool instantly and never expire", and are for subscribers only.
  - Cost per feature runs from 2 credits (remove background) to 16 (Creative Render Pro).
  - 40 free trial credits.
- **Collov AI** [collov]
  - 60 / 150 / 263 / 526 photo credits per month at US$19 / 49 / 79 / 127 per month, billed yearly.
  - 1 credit per staging generation; a virtual tour costs 5 credits per image.
  - "Unlimited regeneration"; 4 renders per version.
  - "Photo usage resets each month".
  - Enterprise add-on: US$0.24 per photo.
  - 5 free trials, watermarked.
- **REimagineHome** [reimagine]
  - US$14–99/mo for 30 / 200 / 400 / 900 credits.
  - 1 credit per design; 2 credits for a design with real, shoppable products.
  - "Chatting with the system" and "Exploring ideas and options" cost zero.
  - Parallel processing from the Pro tier.
  - Free designs for new users: UNVERIFIED.
- **Interior AI** [interiorai]
  - Allowances, not credits:
    - Pro US$49/mo: 1,000 designs.
    - Premium US$99/mo: 5,000 designs.
    - Ultra US$199/mo: 25,000 designs.
  - Render quality rises with the plan, as does parallel work: 4 / 8 / 16 rooms.
  - "we cannot offer refunds as costs incurred for generating AI images are extremely high".
- **RoomGPT** [roomgpt]
  - The site shows no prices, only a "60% off all plans" code.
  - 1 credit per redesign per third parties (UNVERIFIED [roomgpt-3p]).
- **Houzz Pro** [houzz-news][houzz-help][houzz-ai]
  - Photoreal renders are unlimited on the Essential and Ultimate packages.
  - A render "typically takes a few minutes, so feel free to keep working". A notification at the bottom of the screen shows progress and completion.
  - Finished renders "automatically save in the Files section of your project".
  - The AI tools page states no usage limits.
  - Pricing page returned 503 twice (UNVERIFIED).
- **D5 Render** [d5][d5-blog]
  - Sold as a licence, not credits: Pro US$38/mo or US$360/yr; Teams US$75/seat/mo or US$708/seat/yr.
  - 15+ AI features are unlimited on Pro and Teams; the free Community plan gets 50 trial credits.
  - Teams adds a shared asset library, member access control and a data dashboard.
- **Chaos (Enscape, V-Ray, Corona, Veras)** [chaos-credits][chaos-limits][chaos-pool][chaos-cloud]
  - One "Chaos Credits" currency since 29 May 2026. It covers Veras, AI Upscaler, AI Enhancer and V-Ray cloud rendering.
  - Monthly allowance: Solo 100, Premium 500, Collection 1,500; Veras Pro 2,000, Ultra 6,000. The allowance does not roll over.
  - Top-ups of 250 / 1,000 / 3,500 credits, one-time or recurring.
  - Organisation controls:
    - A shared "Floating pool", plus credits tied to named seats that "can't be redistributed".
    - Admins set a limit per user, with quick picks: "Disable access", 1,000, 5,000, "No limit".
    - A capped user presses "Request credits". The button changes to "Requested" and the admin gets an email; "the user can't override their limit".
    - The pool gauge turns orange at 80% and red at 99%.
    - Usage reports for the organisation and per user, and a "Buy credits" card.
  - Cloud rendering:
    - Jobs queue when no resources are free.
    - Running out of credits pauses "Active" jobs and blocks new ones.
    - Credits for failed frames and still scenes are refunded; deleted jobs are not refunded.
    - Trial credits expire after 90 days.
  - AI Enhancer at 10 credits per object / 20 per full image: UNVERIFIED [chaos-ops].
- **Lumion**: annual licences; no render credits found (UNVERIFIED, third-party [lumion-3p]).
- **Maket** [maket]
  - Free: 50 one-time credits that don't expire.
  - Homeowner US$20/mo: 300 credits. Pro US$100/mo: 3,000 credits.
  - Cost: 20 credits per floor, 10 per render, 5 per optimisation.
  - Plan credits refresh and expire monthly.
  - Top-ups "stack on top and never expire". They're for paid plans only and are kept if you resubscribe.
- **Rendair** [rendair-faq] (the site returned 403; everything here is UNVERIFIED)
  - 1 credit per image; upscales cost 5–40 credits.
  - Team Pro: 7,500 credits, described as "7,500 standard renders, or 1,500 upscales, or 375 videos".
  - Shared workspace for up to 4 extra members.
- **Paintit.ai** [paintit]
  - Free: 30 credits.
  - "Paintit.ai shows the credit cost before you generate". Images cost 3 credits and up.
  - No rollover.
  - Active subscribers can top up "without changing their main plan".
  - 4K upscaling on Pro and Max; shared projects on Max.
  - Prices: UNVERIFIED.
- **LookX** [lookx][lookx-team]
  - Paid plans include "unlimited image generations". "X-points" pay only for training, upscaling and advanced features.
  - Speed is the plan lever:
    - Free: "normal lane", 100 X-points.
    - US$20/mo or US$199/yr: "Lightning Lane", 580 X-points/mo, 7-day trial.
    - Team US$269/mo: 5 seats, 3,000 X-points "shared by all members", "Super Lightning Lane".
- **mnml.ai** [mnml]
  - Lite US$29: 1,000 credits ≈ 100 Fast or 30 Ultra renders; 2 renders at once; rollover capped at 2,000.
  - Plus US$49: 3,000 credits; 4 at once; cap 6,000.
  - Studio US$119: 10,000 credits; 6 at once; cap 20,000.
  - One-time pack: US$149 for 10,000 credits, valid 6 months.
  - 100 free credits, no card needed. No team seats listed.
- **Adjacent references**
  - Figma [figma-credits]:
    - Credits are spent in order: personal seat credits (monthly, no rollover), then a shared pool, then pay-as-you-go.
    - Admins can turn access off or set a monthly limit per user.
    - A user at the limit "may see an option to request more from their admin"; the admin gets an email and an in-product notification.
    - Usage is shown per user and can be exported to CSV.
  - Adobe [adobe-thread]:
    - From 20 Dec 2025, users reported credits taken for failed generations.
    - Staff reply of 15 Jan 2026: credits are deducted on "generate" and "restored... within a minute or so".
    - Users still reported missing restorations days later.
  - Midjourney: after Fast time runs out, renders go to a "Relax" queue; extra Fast time expires after 60 days (UNVERIFIED [mj]).
- **Popularity with Singapore or Asian studios:** no survey found (UNVERIFIED).

### 2.2 What the market does, question by question

- **Pricing model**
  - Credit pools (gen-AI tools).
  - Allowances or "unlimited" (3D and desktop tools).
  - Hybrid quotas plus à la carte purchases (Homestyler, Coohom).
- **What a credit buys:** weighted by output.
  - Homestyler: 25 credits for 2K vs 35 for 4K.
  - mnml: an Ultra render costs about 3.3x a Fast one.
  - Collov: a tour image costs 5x a staging image.
  - Maket: 10 per render vs 20 per floor plan.
  - Spacely: 2–16 credits.
- **Cost shown before rendering**
  - Per-action tables (Spacely, Maket, Homestyler, REimagineHome).
  - Cost shown before generating (Paintit).
  - Pools translated into renders (mnml, Spacely).
- **Queues and priority**
  - Speed lanes (LookX).
  - Concurrency limits (mnml, Interior AI, REimagineHome).
  - Render in the background and notify (Houzz).
  - Cloud queue (Chaos).
- **Failed renders**
  - Automatic refund (Coohom, Chaos Cloud).
  - Refund promised but hard to see (Adobe).
  - No refunds (Interior AI).
- **Team plans**
  - Pooled credits (Spacely, LookX, Chaos floating pool).
  - Credits per seat (Homestyler Team, Chaos named seats, Figma), with a pool as overflow (Figma, Chaos).
  - Admin caps plus a request flow (Chaos, Figma).
- **Running out**
  - Instant top-ups, for subscribers only (Spacely, Maket, Paintit).
  - Buy a single render (Homestyler).
  - Ask the admin (Chaos, Figma).
  - Jobs paused (Chaos Cloud).
  - A slower queue (Midjourney, UNVERIFIED).
- **Trials**
  - One-time grants with no card (Spacely 40, Maket 50, mnml 100, Paintit 30, LookX 100).
  - Watermarked outputs (Collov).
  - Time-limited trials (Foyr 14 days, LookX 7 days).

### 2.3 Patterns to adopt for a studio team

Each item is backed by the market examples named; the OpenMaison application is inference.

1. **One studio balance paid by the owner,** with an optional monthly cap per member and a "Request credits" path from designer to owner. The owner gets an email and an in-app notification. [spacely-plans][lookx-team][chaos-limits][figma-credits]
2. **Price by render type and put the cost on the Render button.** Show the balance as "≈ N renders". [paintit][spacely-credits][mnml][homestyler]
3. **Keep exploration free and charge only for finished output** (previews, drafts, chat). [reimagine][homestyler][lookx][collov]
4. **Credits that survive quiet months:** rollover while subscribed, or rollover capped at about 2 months; top-ups that last 6 months or never expire. [spacely-plans][mnml][maket] Dodo supports rollover %, timeframe, rollover count and expiry [dodo-credits].
5. **Automatic refund on failure that the studio can see,** as a line in the credit history. [coohom-fail][chaos-cloud][adobe-thread]
6. **Reserve credits at submit, settle on success, release on failure.** This avoids Chaos-style paused jobs and being "charged for nothing". It matters because Dodo processes usage events every minute and "doesn't block usage when a balance reaches zero" [dodo-credits]. (Inference.)
7. **Warn before zero.** Chaos turns the gauge orange at 80% and red at 99% [chaos-limits]; Dodo sends a `credit.balance_low` webhook [dodo-credits].
8. **Use speed and "renders at once" as plan differences** rather than hard walls. [lookx][mnml][interiorai]
9. **Render in the background, notify when done, and file the result into the project.** [houzz-help]
10. **A small trial grant with no card.** [spacely-pricing][maket][mnml][paintit]
11. **Usage reports per member.** [chaos-pool][figma-credits] For OpenMaison, also per lead or design (inference).

### 2.4 Pitfalls

- **Several currencies at once** (Homestyler quotas + AI credits + coins + packs; Coohom coupons + points). Inference: this confuses non-technical owners.
- **"Unlimited" with hidden sub-limits,** e.g. Homestyler Master is unlimited 4K but gives 6 12K panoramas/mo. That works for local GPU renders but is risky when every AI call costs money.
- **Monthly use-it-or-lose-it allowances** (Collov, Paintit, Chaos, Maket plan credits).
- **Credits locked to a seat** (Figma seat credits; Chaos named credits can't be redistributed).
- **Credits granted up front that block fair plan changes** (Coohom's no-refund rule). Dodo's credit entitlements have an "Allow Proration" option [dodo-credits].
- **No refunds, or refunds users can't see** (Interior AI; Adobe thread).

## 3. Part B — in-app checkout for a Singapore SaaS billing in SGD

### 3.1 Dodo Payments, requirement by requirement

- **Overlay checkout: yes.** [dodo-overlay]
  - Package `dodopayments-checkout`. Set up with `DodoPayments.Initialize({ mode, displayType: 'overlay', onEvent })`, then `DodoPayments.Checkout.open({ checkoutUrl })`, where the URL comes from a Checkout Session created on the server.
  - Events: `checkout.opened`, `form_ready`, `payment_page_opened`, `customer_details_submitted`, `closed`, `redirect` ("e.g., to a bank page"), `error`, `link_expired`.
  - With `manualRedirect: true` you also get `checkout.status` and `checkout.redirect_requested`, so the app decides where to go.
  - Options: `showTimer` (on by default), `payButtonText`, font size. Theming is set on the server through `customization.theme_config`.
  - **"Apple Pay is not yet supported in overlay checkout."**
- **Inline (embedded) checkout: yes, labelled "Beta" in the npm README.** [dodo-inline][dodo-readme]
  - Set up with `displayType: 'inline'` and an `elementId`.
  - Your page must render the order summary and a live price breakdown from `checkout.breakdown` (subTotal, discount, tax, total).
  - You must "Always display the complete inline checkout frame, including the footer".
  - Apple Pay needs domain verification.
  - "Always implement server-side validation using webhooks."
- **Checkout session options.** [dodo-session]
  - Prefill the customer and billing address.
  - Business fields `tax_id` and `customer_business_name`; `feature_flags.allow_tax_id` / `require_tax_id`.
  - `show_saved_payment_methods`, and `payment_method_id` + `confirm: true` for an instant charge.
  - `custom_fields` (up to 5), `force_3ds`, `billing_currency`, `allowed_payment_method_types`, `single_page`, `minimal_address`, `subscription_data.trial_period_days`, `on_demand`.
  - A session lasts 24 h, or 15 min when confirmed.
- **"Manage billing" portal: yes, hosted redirect.** [dodo-portal]
  - Created with `client.customers.customerPortal.create(customerId, { return_url })`; `send_email` is optional. Valid 24 h.
  - Customers can see and download invoices, cancel now or at period end, pause, change plan within a Product Collection, update the payment method, and edit name and address.
  - Tax ID editing isn't mentioned.
  - The portal shows the credit balance and credit history [dodo-credits].
  - With "Collect Plan Change Payments by Payment Link" on, paying for a plan change opens a hosted checkout in a new tab.
- **Seats and quantity: yes, as add-ons.** [dodo-seats]
  - A base subscription plus a seat add-on with a quantity. `changePlan` takes the new total add-on count; preview it with `previewChangePlan`.
  - "Your application must enforce seat limits."
- **Proration: four modes.** [dodo-change][dodo-subs]
  - `prorated_immediately`, `difference_immediately`, `full_immediately`, `do_not_bill`.
  - `on_payment_failure: prevent_change | apply_change`, and `collect_via_payment_link`.
  - Failed renewals go to `past_due` with a grace period of 1–30 days, retries and dunning emails, then `on_hold`.
- **One-time top-ups and credits: yes.** [dodo-credits][dodo-subs]
  - Single-payment products can grant credits; subscriptions grant credits every cycle, with separate trial credits.
  - Rollover can be capped by %, time window and count; expiry can be 7/30/60/90 days, custom, or never.
  - Four overage behaviours.
  - Ledger entry types include `credit_added`, `credit_deducted`, `refund` and `manual_adjustment`.
  - Credits are deducted by a worker every minute, first-in first-out.
  - On-demand subscriptions let you charge a saved payment method later, e.g. for top-ups.
- **Payment methods for Singapore buyers: partial.** [dodo-pm]
  - Cards, Apple Pay and Google Pay (both with subscriptions).
  - No PayNow, GrabPay or any other Singapore method is listed (the Asian methods listed are Alipay HK/FPS, GCash, Touch 'n Go and WeChat Pay).
- **SGD: partial.** [dodo-adaptive][dodo-localized][dodo-fees]
  - Listed in Adaptive Currency (minimum S$0.50). The FX fee is 4% / 3% / 2% by order size and is paid by the customer, unless you switch on "Fees Inclusive".
  - Localized Pricing sets fixed SGD prices; these are "pre-tax".
  - Whether a product's base price can be SGD: not confirmed [dodo-products].
- **Merchant of record and GST.** [dodo-buyer][dodo-b2b]
  - The buyer contracts with Dodo, which charges "any applicable taxes according to the tax jurisdiction".
  - "Purchasing as a business" asks for a business name and tax ID. Live registry lookups exist only for the EU, UK and Australia; other countries get format/checksum checks only.
  - Reverse charge applies "where applicable by law".
  - Whether Dodo is GST-registered in Singapore under OVR is UNVERIFIED.
- **Invoices.** [dodo-invoice][dodo-b2b]
  - They show "your brand's name and logo, with the Dodo Payments entity that sells to your customer as the Merchant of Record".
  - The customer's business name prints only for a business purchase with a tax ID; `customer_business_name` can't be set without `tax_id`.
  - Invoice numbers are generated automatically; you can only change the logo and brand name.
  - Whether a UEN is accepted as the Singapore tax ID: UNVERIFIED.
- **Tax-inclusive prices:** a per-product flag; the invoice shows the net amount and the tax. [dodo-taxincl]
- **Fees:** 4% + 40¢ base, +1.5% for international cards, +0.5% for subscriptions. [dodo-fees] My reading is that a Singapore card on a subscription pays about 6% + US$0.40; confirm with Dodo.
- **Eligibility:** Singapore is on the merchant-country list. Eligibility is decided by the country that issued each director's or owner's ID. [dodo-countries]

### 3.2 Comparison

| | Dodo | Stripe (OpenMaison as seller) | Paddle | Lemon Squeezy |
|---|---|---|---|---|
| In-app UI | Overlay; inline (beta) | Embedded Checkout `ui_mode:'embedded_page'`; Elements mode `ui_mode:'elements'`; don't nest inside another iframe [stripe-embedded][stripe-taxid-checkout] | Overlay and inline via Paddle.js [paddle-overlay][paddle-inline] | Overlay via Lemon.js [lemon-overlay] |
| Finish without leaving the page | `manualRedirect` + `checkout.status` | `redirect_on_completion:'if_required'` + `onComplete`; `'never'` drops redirect-based methods [stripe-redirect] | Built-in success screen or `checkout.completed` [paddle-events] | `Checkout.Success` [lemonjs] |
| PayNow / GrabPay | Not listed | PayNow 1.3%, QR valid 1 h, no chargebacks, not in Checkout subscription mode, subscriptions `send_invoice` only; GrabPay 3.3%, redirect, no recurring [stripe-paynow][stripe-grabpay][stripe-sg-pricing] | Not listed [paddle-pm] | UNVERIFIED |
| SGD | Via Adaptive Currency (FX fee) or Localized Pricing | Native | UNVERIFIED (currency list page 1 of 2 ends at RUB) [paddle-currencies] | UNVERIFIED |
| Who sells / whose invoice | Dodo entity | OpenMaison (or Stripe as MoR with Managed Payments: Singapore businesses eligible, Checkout and Payment Links only, +3.5%) [stripe-mp][stripe-mp-elig] | Paddle; 9% GST, Singapore row marked "B2C" [paddle-tax] | Lemon Squeezy; "2026 Update: Lemon Squeezy + Stripe Managed Payments" [lemon-pricing] |
| Customer tax ID on invoice | Business name + tax ID; Singapore gets format check only | Checkout collects `sg_gst`; customer record holds `sg_gst` and `sg_uen`, printed in the invoice header, editable in the portal [stripe-taxid][stripe-portal] | Not researched | UNVERIFIED |
| Proration preview | `previewChangePlan` | `invoices.create_preview` + `proration_date` [stripe-prorations] | 5 modes [paddle-proration] | UNVERIFIED |
| Manage billing | Hosted, 24 h | Hosted; "can't display the customer portal inside an iframe"; a session must be opened within 5 min; `send_invoice` subscriptions can only be cancelled there, not changed [stripe-portal] | Not researched | Not researched |
| Headline fee | 4% + 40¢ (+1.5% international, +0.5% subscriptions) | 3.4% + S$0.50 local cards, +0.5% international, +2% FX; Billing 0.7%; Stripe Tax 0.5% [stripe-sg-pricing] | 5% + 50¢ [paddle-fees] | 5% + 50¢ plus extras [lemon-pricing] |

Note on PayNow through Stripe: the customer's banking app shows "STRIPE PAYMENTS SINGAPORE PTE. LTD." as the payee, and custom statement descriptors aren't supported [stripe-paynow].

### 3.3 Singapore specifics

- **Rate and registration.** GST is 9% "Since 1 Jan 2024" [iras-guide §2.1]. Registration is compulsory above S$1M of taxable supplies in 12 months [pwc-sg].
- **Price display (local GST-registered seller).** [iras-guide §8.1–8.4, §8.7]
  - Show and quote GST-inclusive prices on everything displayed or quoted "to the public", including web pages and price lists.
  - If you show both, the inclusive price must be at least as prominent. "$100 + GST" is not acceptable.
  - Fine of up to $5,000.
  - The only written exception is hotels and F&B that charge a service charge; there is no B2B exception in the guide.
  - Whether B2B-only SaaS may show prices before GST: UNVERIFIED. Treat inclusive-first as the safe default.
- **Tax invoices.** [iras-guide §7.1.1–7.2.2, §7.4.1]
  - Must be issued to GST-registered customers within 30 days.
  - Required fields: the words "tax invoice", an invoice number, the date, the supplier's name, address and GST number, the customer's name and address, a description, amounts excluding GST, the GST rate and amount, and the total including GST.
  - A simplified tax invoice is allowed up to $1,000 including GST.
  - A local sale invoiced in a foreign currency must also show SGD totals.
  - The customer's UEN is not an IRAS-required field; SMEs expecting it is UNVERIFIED common practice.
- **Overseas MoR under OVR** (6th ed., 30 Jan 2026).
  - Such vendors register if global turnover is over S$1M and sales to non-GST-registered Singapore customers are over S$100k [pwc-sg].
  - They must charge GST unless the customer gives a GST registration number [iras-ovr §2.4, §9.2], and must not charge it to customers who do [§2.5].
  - Non-GST-registered businesses count as B2C [§3.2].
  - A customer who is wrongly charged must get a refund from the vendor rather than claim input tax [§2.6, §9.6].
  - Local tax-invoice and GST-inclusive display rules don't apply to these vendors [§2.7].
- **InvoiceNow (Peppol):**
  - from 1 Nov 2025: newly incorporated voluntary registrants;
  - from 1 Apr 2026: all new voluntary registrants;
  - from 1 Apr 2028: new compulsory registrants and existing businesses with up to $200k in supplies;
  - from 1 Apr 2029: up to $1M;
  - from 1 Apr 2030: up to $4M;
  - from 1 Apr 2031: everyone else.
  It covers invoice data for both sales and purchases [iras-invoicenow §2.3, §3.3, §5.5].
- **PayNow.**
  - Launched 10 Jul 2017. PayNow Corporate lets a business receive SGD against its UEN. Businesses may not surcharge consumers for PayNow [abs-paynow].
  - 125M transactions worth S$22B in 2020 [wiki-paynow] (secondary source).
  - SME B2B usage statistics: none found.

### 3.4 Plan picker and checkout practices

1. **Match the surface to the decision.**
   - A top-up at the moment of need belongs in an overlay. NN/g: modals fit when "missing information prevents the system from continuing a user-initiated process".
   - Choosing a plan belongs on a page or large sheet. NN/g advises against modals for complex decisions and against modals that interrupt checkout [nng-modal]. Inline checkouts also require your page to show items, tax, totals and billing frequency [dodo-inline][paddle-inline].
   - "Manage billing" opens in a new tab.
2. **Show the whole price before payment:** GST-inclusive total, proration and next renewal date. In Baymard's data, 40% of shoppers who abandon checkout cite extra costs and 12% couldn't work out the total up front [baymard]. Previews are available: `create_preview` with `proration_date`; `previewChangePlan`.
3. **Keep context.** Card payments complete in place. Redirect-based methods and some 3DS flows leave the page, so keep the pending action (the render) on the server and set `return_url` back to the same design. (Inference, built on [stripe-redirect][dodo-overlay].)
4. **Success comes from the webhook** [stripe-redirect][dodo-inline]. Say what changed (new balance or plan). Give a reference, the invoice as a PDF, and what happens next [govuk-confirm].
5. **3D Secure.** Stripe shows it in a modal automatically, and the bank controls how it looks. Don't sandbox the 3DS iframe; mobile SDK timeouts must be at least 5 minutes; test with the 3DS test cards [stripe-3ds]. Dodo emits `checkout.redirect` and supports `force_3ds`.
6. **Failures.** Put the message near its cause, in plain words, with a way to fix it, and keep what the user typed [nng-errors]. On a decline, offer another payment method in place. For plan changes use `prevent_change` so a failed charge can't leave the plan half-changed.
7. **After purchase:** an email receipt or tax invoice, billing history in the portal, the credit history, and a notice to the owner. (The owner notice is inference.)

## 4. What this means for OpenMaison (inference, for Vicky and the team)

- **Who sells is a bigger choice than which SDK.**
  - For Singapore-only B2B, Dodo's global-tax advantage matters little.
  - Against Dodo: the invoice is Dodo's, not OpenMaison's UEN or GST number; there's no PayNow; GST-registered studios must enter their GST number or pay GST they can't claim back (if Dodo is registered under OVR); SGD may carry FX fees.
  - Stripe with OpenMaison as the seller gives SGD, PayNow top-ups, `sg_gst`/`sg_uen` on invoices and OpenMaison's own tax invoices. The cost is that OpenMaison builds its own credit ledger.
- **Flow sketch:**
  1. The Render button shows its cost.
  2. If the balance is short, a sheet opens: "Needs 2 credits, you have 1".
  3. An owner or admin gets a one-click top-up (saved card or overlay; PayNow if on Stripe), and the render starts on its own once payment lands.
  4. A designer gets "Ask [owner]". The render is held as "Waiting for credits" and the request goes to the owner's notifications.
  5. Low-balance notices reach the owner's notifications and email.
  6. Plans live on a Settings page; "Manage billing" opens in a new tab.
  7. The studio's UEN and GST number are prefilled into checkout from Company › Profile's issuing entities.
- **Engineering:** OpenMaison's own ledger is the gate (reserve / settle / release per render job). Webhooks are the source of truth. Grants must be idempotent. Enforce seat and member caps in the app.

## 5. Open questions to put to vendors

- **Dodo:**
  - Is it GST-registered in Singapore under OVR, and how does it treat Singapore GST numbers?
  - Is a UEN accepted as the tax ID, and does it print on the invoice?
  - Can a product's base price be in SGD?
  - Is PayNow or GrabPay on the roadmap?
  - When will Apple Pay work in the overlay?
  - Does 3DS stay inside the overlay or redirect?
  - Is inline checkout GA? The docs don't call it beta; the README does.
  - Can customers edit their tax ID in the portal?
  - How do localized (pre-tax) prices combine with the tax-inclusive flag?
- **Paddle:** SGD support; PayNow.
- **Stripe:** whether Managed Payments works with the embedded page; Stripe's billing-credits feature (not researched).
- **Singapore:** B2B practice on showing prices before GST; SME expectation of UEN on invoices; SME PayNow usage.
- **Tools:** Houzz pricing; Coohom quotas; Rendair; RoomGPT; the Chaos per-operation cost table (help centre returned 403); Adobe and Midjourney official docs (returned 403).

## Sources

- foyr https://marketing.foyr.com/pricing
- foyr-3p https://sourceforge.net/software/product/Foyr-Neo/
- coohom-price https://www.coohom.com/pricing
- coohom-help https://www.coohom.com/helpcenter/pricing,-subscriptions,-and-payments
- coohom-fail https://www.coohom.com/helpcenter/how-to-resolve-render-failed-error-in-video-rendering
- coohom-points https://www.coohom.com/helpcenter/task-center-points-collection-and-redemption-for-coohom-users
- coohom-3p https://www.g2.com/products/coohom/pricing
- homestyler https://www.homestyler.com/pricing
- planner5d https://planner5d.com/pricing
- p5d-3p https://www.firstchair.app/blog/planner-5d-pricing
- spacely-plans https://www.spacely.ai/blog/spacely-ai-subscription-plans-2026-new-pricing-explained
- spacely-credits https://www.spacely.ai/blog/spacely-ai-tool-plans-2026-how-credits-work
- spacely-pricing https://www.spacely.ai/pricing
- collov https://collov.ai/pricing
- reimagine https://www.reimaginehome.ai/pricing
- interiorai https://interiorai.com/
- roomgpt https://www.roomgpt.io/
- roomgpt-3p https://vizcraft.ai/blog/posts/is-roomgpt-free
- houzz-help https://pro.houzz.com/pro-help/r/how-to-create-photorealistic-renderings
- houzz-news https://www.insightdiy.co.uk/news/houzz-brings-projects-to-life-with-photorealistic-renders/13812.htm
- houzz-ai https://pro.houzz.com/for-pros/software-ai-ar-tools
- d5 https://www.d5render.com/pricing
- d5-blog https://www.d5render.com/posts/render-pricing-d5-plans
- chaos-credits https://blog.chaos.com/chaos-credits
- chaos-limits https://docs-chaos.atlassian.net/wiki/spaces/LIC5/pages/860651522/Manage+Users+and+Credit+Limits
- chaos-pool https://docs-chaos.atlassian.net/wiki/spaces/LIC5/pages/858914911
- chaos-cloud https://documentation.chaos.com/space/VCLOUD/125784779/FAQ
- chaos-ops https://support.chaos.com/hc/en-us/articles/46871789830929-How-many-credits-does-each-operation-cost
- lumion-3p https://visualizee.ai/blog/lumion-pricing
- maket https://www.maket.ai/pricing
- rendair-faq https://rendair.ai/faq/what-are-the-credit-costs-for-each-tool-action
- paintit https://paintit.ai/prices/
- lookx https://www.lookx.ai/price.html
- lookx-team https://www.lookx.ai/team-price.html
- mnml https://mnml.ai/pricing
- figma-credits https://help.figma.com/hc/en-us/articles/35865276858647-Manage-AI-credits
- adobe-thread https://community.adobe.com/t5/adobe-firefly-bugs/credits-are-being-deducted-even-when-video-generation-fails/idi-p/15659871
- mj https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo
- dodo-overlay https://docs.dodopayments.com/developer-resources/overlay-checkout
- dodo-inline https://docs.dodopayments.com/developer-resources/inline-checkout
- dodo-readme https://cdn.jsdelivr.net/npm/dodopayments-checkout/README.md
- dodo-session https://docs.dodopayments.com/developer-resources/checkout-session
- dodo-portal https://docs.dodopayments.com/features/customer-portal
- dodo-seats https://docs.dodopayments.com/features/seat-based-billing
- dodo-change https://docs.dodopayments.com/api-reference/subscriptions/change-plan
- dodo-subs https://docs.dodopayments.com/features/subscription
- dodo-credits https://docs.dodopayments.com/features/credit-based-billing
- dodo-pm https://docs.dodopayments.com/features/payment-methods
- dodo-adaptive https://docs.dodopayments.com/features/adaptive-currency
- dodo-localized https://docs.dodopayments.com/features/localized-pricing
- dodo-products https://docs.dodopayments.com/features/products
- dodo-taxincl https://docs.dodopayments.com/features/tax-inclusive-pricing
- dodo-b2b https://docs.dodopayments.com/features/b2b-payments
- dodo-invoice https://docs.dodopayments.com/features/invoice-generation
- dodo-buyer https://dodopayments.com/legal/buyer-terms
- dodo-fees https://dodopayments.com/pricing
- dodo-countries https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories
- stripe-embedded https://docs.stripe.com/checkout/embedded/quickstart
- stripe-redirect https://docs.stripe.com/payments/checkout/custom-success-page?payment-ui=embedded-page
- stripe-paynow https://docs.stripe.com/payments/paynow
- stripe-grabpay https://docs.stripe.com/payments/grabpay
- stripe-taxid-checkout https://docs.stripe.com/tax/checkout/tax-ids
- stripe-taxid https://docs.stripe.com/billing/customer/tax-ids
- stripe-portal https://docs.stripe.com/customer-management
- stripe-prorations https://docs.stripe.com/billing/subscriptions/prorations
- stripe-3ds https://docs.stripe.com/payments/3d-secure/authentication-flow
- stripe-mp https://docs.stripe.com/payments/managed-payments
- stripe-mp-elig https://docs.stripe.com/payments/managed-payments/eligibility
- stripe-sg-pricing https://stripe.com/en-sg/pricing
- paddle-overlay https://developer.paddle.com/build/checkout/build-overlay-checkout
- paddle-inline https://developer.paddle.com/build/checkout/build-branded-inline-checkout
- paddle-events https://developer.paddle.com/paddlejs/events/overview
- paddle-pm https://developer.paddle.com/concepts/payment-methods/overview
- paddle-proration https://developer.paddle.com/concepts/subscriptions/proration
- paddle-currencies https://developer.paddle.com/concepts/sell/supported-currencies
- paddle-tax https://www.paddle.com/help/sell/tax/which-countries-does-paddle-charge-sales-tax-or-vat-for
- paddle-fees https://www.paddle.com/pricing
- lemon-overlay https://docs.lemonsqueezy.com/help/checkout/checkout-overlay
- lemonjs https://docs.lemonsqueezy.com/help/lemonjs/what-is-lemonjs
- lemon-stripe https://www.lemonsqueezy.com/blog/stripe-acquires-lemon-squeezy
- lemon-pricing https://www.lemonsqueezy.com/pricing
- iras-guide (GST General Guide, 17th ed., 30 Jan 2026) https://www.iras.gov.sg/media/docs/default-source/e-tax/etaxguide_gst_gst-general-guide-for-businesses(1).pdf?sfvrsn=8a66716d_0
- iras-ovr (OVR remote services, 6th ed., 30 Jan 2026) https://www.iras.gov.sg/media/docs/default-source/e-tax/gst-e-tax-guide_taxing-imported-remote-services-by-way-of-the-overseas-vendor-registration-regime_(1st-ed).pdf?sfvrsn=7a18d6f5_49
- iras-invoicenow (2nd ed., 9 Mar 2026) https://www.iras.gov.sg/docs/default-source/e-tax/etaxguide_gst_invoicenow_requirement.pdf?sfvrsn=d2828aad_35
- pwc-sg https://taxsummaries.pwc.com/singapore/corporate/other-taxes
- abs-paynow https://www.abs.org.sg/consumer-banking/pay-now
- wiki-paynow https://en.wikipedia.org/wiki/PayNow
- nng-modal https://www.nngroup.com/articles/modal-nonmodal-dialog/
- nng-errors https://www.nngroup.com/articles/error-message-guidelines/
- baymard https://baymard.com/lists/cart-abandonment-rate
- govuk-confirm https://design-system.service.gov.uk/patterns/confirmation-pages/
