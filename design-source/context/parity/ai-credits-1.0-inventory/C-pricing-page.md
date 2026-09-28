# C — the pricing page (live 2026-09-28) and its source

> Reader's report for the AI credits audit (`../19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`), banked as written. 1.0 = `qanvast-id-tool` on `origin/feat/om-ui-port` @ `3174b912f` (2026-09-27), read with `git show`; nothing was checked out. Rows marked **[inferred]** were worked out from the code, not run.

OpenMaison pricing page, documented for the design audit

I read the live page on 2026-09-28 and the source at `origin/feat/om-ui-port` @ 3174b91 (2026-09-27 16:45 IST) in `/Users/vicky/Documents/GitHub/qanvast-id-tool`. I did not check anything out.

**How the live page was captured.**
- WebFetch refused to return the text word for word.
- The page draws itself in the browser. The server HTML has no prices: every CTA reads "Get started" and each price is a pulsing bar until `/api/reference/plans` answers.
- So I rendered it in headless Chromium at 1440×1024 and 390×844, clicked through all four toggle states, opened every FAQ item, and fetched the public plans API it reads.
- `git fetch` failed because there are no GitHub credentials, and `gh` is not logged in. The local refs may be stale.

---

## 1. The pricing page, word for word, in order (live, 2026-09-28)

Items marked **[LIVE ONLY]** are not in the om-ui-port source. Labels written in sentence case below display in uppercase through CSS: the eyebrows, the badge, the table heads and the group labels.

### 1.0 Head
- `<title>`: "Pricing — OpenMaison | OpenMaison". The source title is "Pricing — OpenMaison" and a site-wide template adds the brand a second time.
- Meta description: "Start free with no card. AI runs on tokens with a published price per action, so you can see what each render, quote or meeting costs before you spend it."
- OG description: "Start free with no card. AI runs on tokens with a published price per action."

### 1.1 Header (marketing nav)
- The logo, labelled "OpenMaison, home", goes to `/`.
- **Platform ▾** opens a mega menu with three pillars:
  - **CLIENTS & PROJECTS:** Leads "All prospects, prioritized by AI" · Projects "Automated project plans" · Meeting Co-Pilot "Convert better with AI" · mAIson Bot "Instant answers across studio"
  - **FINANCE:** Quote Digitizer "Margin check before signing" · Finance & Margins "Live per-project P&L"
  - **DESIGN MEETINGS:** AI Visualiser "Photorealistic renders" · 3D Space Planner "Layout planning simplified"
  - It ends with the link "See the whole platform".
- Then **Story** (`/story`), **Resources** (`/blog`), the button **Book a demo** (opens the beta-signup modal) and an avatar link labelled "Sign in" (`/login`).
- There is no Pricing link in the nav or the footer.
- On a phone there is a bottom dock: Home · Platform (opens a sheet) · Demo (a raised Book a demo button) · Resources · Story. A "Back to top" button appears near the end of the page.
- A hidden "Skip to content" link is present. An intro overlay ("Welcome to" / "Tap anywhere to skip") plays only on the homepage.

### 1.2 Hero and billing toggle
- Eyebrow: "Pricing"
- H1: "Pricing that respects your margins."
- Lede: "Start free with no card. AI runs on tokens, so you pay for what you use — and you can see exactly what each action costs before you spend it."
- Toggle: **"Monthly"** (the default) | **"Annual · 1 month free"**.
  - "1 month free" is computed as 12 − round(yearly ÷ monthly) for the Pro variant selected.
  - There is no percentage and no saving amount anywhere.

### 1.3 The three plan cards (Free | Pro | Max)
Pro is the featured card: accent border and shadow, and a filled CTA. The other two CTAs are outlined. Each card's allowance line sits in a grey pill with a sparkle icon.

| | Free | Pro · Freelance (default) | Pro · Studio | Max |
|---|---|---|---|---|
| Badge | — | "Most Popular" (shows only while Freelance is selected) | none (the badge disappears) | — |
| Name | "Free" | "Pro" | "Pro" | "Max" |
| Tagline | "Everything you need to see if this fits." | "For a working studio that bills clients." | same | "For firms that need it bent to their shape." |
| Switch | — | Segmented "Freelance \| Studio" (aria-label "Studio size") | same | — |
| Monthly price | "S$0" "forever" | "S$35" "/month" | "S$100" "/month" | "Let's talk" |
| Annual price | "S$0" "forever" | "S$385" "/year" | "S$1,100" "/year" | "Let's talk" |
| **[LIVE ONLY]** trial line, monthly only | — | "14-day free trial · card required. You won't be charged if you cancel before day 15." | same | — |
| Seat line | (empty) | "1 seat" | "For 3 seats · S$35 per extra seat/month" (also on Annual) | "Priced per seat, against a signed agreement." |
| CTA | "Start free" → `/login?redirectTo=/dashboard` | "Get started" → `/login?redirectTo=/upgrade?plan=pro_freelance&period=monthly\|yearly` | "Get started" → same with `plan=pro_studio…&seats=3` | "Talk to us" → `/contact?plan=max` |
| Allowance line | "150 tokens to start, then 30 a month" | "1,500 tokens a month, per seat" | "4,500 tokens a month, pooled across 3 seats" | "3,000 tokens a month, per seat" |

- The cards have no feature bullets.
- The plan data carries `features` and `limits` arrays, but the page never shows them (see §4).
- The Annual view shows only the full-year figure, with no per-month equivalent.
- On the live site each CTA carries `data-cta` (`pricing_free` / `pricing_pro_freelance` / `pricing_pro_studio` / `pricing_max`) plus `data-period` and `data-plan` **[LIVE ONLY]**.

Under the cards is a row of two reassurances:
- "No card to start" (shield icon)
- "Cancel anytime, no lock-in" (refresh icon)

### 1.4 Allowance explainer (tokens)
- Eyebrow: "Tokens"
- H2: "A token is a unit of AI, not a mystery."
- Lede: "Every AI action has a published price, and the button tells you what it costs before you press it. Here is what each month's allowance comes to in real work."

| Allowance | Renders | Quotes digitized | Co-Pilot |
|---|---|---|---|
| 150 · Free, to start | 15 | 30 | 1 h |
| 1,500 · Pro Freelance | 150 | 300 | 10 h |
| 4,500 · Pro Studio | 450 | 900 | 30 h |
| 3,000 · Max, per seat | 300 | 600 | 20 h |

- The row labels are typed by hand. The numbers are computed: renders = tokens ÷ 10, quotes = tokens ÷ 5, hours = tokens ÷ 150.
- Footnote: "Monthly tokens reset at the end of each period. Tokens you top up never expire, and your plan's are always spent first so you never lose ones you paid for."

### 1.5 Compare plans
- Eyebrow: "Compare plans"
- H2: "Everything, side by side."
- Columns: (blank) | Free | Pro | Max. The Pro column is tinted.
- ✓ has the aria-label "Included" and — has "Not included".
- `flag` marks a row whose ticks are derived from `plans.feature_flags`. Every other row is typed by hand.

| Row | Free | Pro | Max | Source |
|---|---|---|---|---|
| **Leads & CRM** | | | | |
| Manual lead uploads | ✓ | ✓ | ✓ | typed |
| Email lead syncing | ✓ | ✓ | ✓ | typed |
| Roles, access & permissions | ✓ | ✓ | ✓ | typed |
| WhatsApp notifications | — | ✓ | ✓ | flag `whatsapp_notifications` |
| Custom stage definitions | — | ✓ | ✓ | flag `custom_stages` |
| Webhooks, API & custom integrations | — | — | ✓ | typed |
| **Quotes** | | | | |
| Quote builder & margin calculator | ✓ | ✓ | ✓ | typed |
| Quote templates | ✓ | ✓ | ✓ | typed |
| Package creation | — | ✓ | ✓ | flag |
| Template editor | — | ✓ | ✓ | flag |
| Internal approvals | — | ✓ | ✓ | flag |
| Quote X-Ray | — | ✓ | ✓ | flag |
| Custom price book & catalogue | — | — | ✓ | flag `custom_pricebook` |
| Remove OpenMaison branding | — | — | ✓ | flag |
| **Projects & tasks** | | | | |
| Gantt tracking & homeowner portal | ✓ | ✓ | ✓ | typed |
| Floor plan coordination | ✓ | ✓ | ✓ | typed |
| Task templates | — | ✓ | ✓ | typed |
| Custom invoice templates | — | ✓ | ✓ | typed |
| **Finance** | | | | |
| Project & studio-level reporting | ✓ | ✓ | ✓ | typed |
| Expense management | — | ✓ | ✓ | flag |
| Purchase orders | — | — | ✓ | flag `po_support` |
| Xero, MYOB & ZohoBooks | — | — | ✓ | flag `accounting_integrations` |
| **AI tools** | | | | |
| AI Visualizer, renders & restyling | Tokens | Tokens | Tokens | typed |
| Quote digitizer | Tokens | Tokens | Tokens | typed |
| Meeting Co-Pilot | 1 meeting | Tokens | Tokens | typed. Free's "1 meeting" is a one-time 30-minute trial (3 × 10-minute blocks) that never refreshes. |
| mAIson Bot | Tokens | Tokens | Tokens | typed |
| **Team** | | | | |
| Seats | 1 | 1, or 3+ on Studio | Per seat | typed |
| Onboarding | Self-serve | Guided | Small-group & on demand | typed |

### 1.6 FAQ
- Eyebrow: "Questions"
- H2: "Before you ask."
- It is an accordion and the first item starts open. The live site has 7 questions; the source has 6.

1. **What is a token?** "A unit of AI. One render is 10 tokens, digitizing a quote is 5, ten minutes of Meeting Co-Pilot is 25. Every button shows its cost before you press it, so nothing is spent by surprise. Everything that is not AI — leads, projects, quotes, finance — is unmetered on every plan."
2. **Do I need a card to start?** "No. You get 150 tokens on signup and 30 a month after that, with no card and no expiry date on the account. The tools also run before you sign up at all." Then **[LIVE ONLY]**: " Pro's free trial does take a card, because it continues as a paid plan unless you cancel."
3. **[LIVE ONLY] Is there a free trial of Pro?** "Yes — 14 days on monthly Pro, Freelance or Studio. We take a card up front and charge only after the trial ends; cancel before then and you pay nothing. You get the full Pro token allowance during the trial. It's one trial per studio, and annual plans don't include one."
4. **What happens when I run out of tokens?** "The AI actions pause; nothing else does. Your leads, quotes, projects and finance keep working exactly as before. You can top up 1,000 tokens for S$20, or move up a plan — and topped-up tokens never expire."
5. **Why is Studio three seats?** "Studio is priced for a team, so it starts at three licences and pools 4,500 tokens across them — any designer can draw from the same allowance. Extra seats are S$35 each per month. If you work alone, Freelance is the same product at one seat."
6. **Can I change plans later?** "Anytime, in either direction. Upgrades take effect immediately; downgrades at the end of your billing period, so you keep what you have already paid for."
7. **Do you support my region?** "OpenMaison is built for Singapore, Malaysia, the UAE and India, with local taxes, phone formats and property types inside the product. Prices are published in Singapore dollars."

**Top-up pricing appears only here, in FAQ 4:** 1,000 tokens for S$20, never expiring. The price lives on a DodoPayments product set in the environment, not in code. The webhook grants `TOPUP_CREDITS = 1000`.

### 1.7 Closing CTA
- H2: "Try it before you decide."
- Lede: "The tools run without an account. Open one, use it on a real quote, and sign up only if it earned it."
- Live buttons: **"Get started"** → `/login?redirectTo=/dashboard` (`data-cta="pricing_free_bottom"`) and **"See pricing"** → `/pricing`, which links to the page you are already on.
- Source buttons: "Get started" → `/pricing` and "Talk to us" → `/contact`.

### 1.8 Footer
- "One platform for your entire studio, powered by AI."
- "Encrypted by default. Your data stays yours."
- Newsletter:
  - Field label (screen-reader only) "Email address", placeholder "Occasional studio notes.", button "Subscribe →".
  - Success: "Thanks, you're on the list."
  - Errors: "Please enter a valid email address." / "Couldn't subscribe right now. Please try again." / "Couldn't reach the server. Please try again."
- **Platform:** AI Visualiser · 3D Space Planner · Quote Digitizer · Finance & Margins · Leads · Projects · Meeting Co-Pilot · mAIson Bot · Platform overview
- **Company:** Story · Trust & Security · What's New · Resources · Careers · Contact
- **Legal:** Terms of Service · Privacy Policy · Cookie Policy
- "© 2026 OpenMaison · Built by the team behind Qanvast."
- Flag discs for SG, MY, AE, IN and EG, labelled "Available in Singapore, Malaysia, UAE, India, Egypt".
- Instagram and LinkedIn icons.

### 1.9 What the page does not have
- No testimonials, no logo wall, no feature bullets on the cards, no top-up section of its own, no tax or GST note and no refund policy.
- The nearest tax and refund notes are on `/terms`:
  - **"9. Payment and Billing"**: "Certain features of the Service require a paid subscription. All fees are quoted in Singapore Dollars (SGD) unless otherwise stated. Subscription fees are billed in advance on a monthly or annual basis. You authorise us to charge your designated payment method for all applicable fees."
  - **"10. Cancellation and Refunds"**: "You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. Refunds for Qanvast-sourced leads are subject to our lead return policy."

### 1.10 Full action-cost list
Source: `src/lib/credits/schedule.ts`, served by `GET /api/credits/schedule`, which requires a session. The page names only three of these costs.

| Action | UI label | Credits |
|---|---|---|
| lead_email_parse · lead_screenshot_parse · render_segment · render_detect | Parse enquiry email · Parse screenshot · Segment surfaces · Detect surfaces | 0 (unmetered) |
| quote_digitize | Digitize quote | 5 (on the page) |
| render_fast_lite | Draft render | 5 |
| render_defurnish | Defurnish room | 10 |
| render_fast | Render | 10 (on the page) |
| render_photorealistic | Photorealistic render | 15 |
| render_pro | Pro render | 20 |
| render_repair | Drift repair | 2 |
| copilot_block | Co-Pilot (10 min) | 25 (on the page) |

- Variants multiply into one charge: a 3-variant Pro render is one charge of 60.
- mAIson Bot's render tool is priced as Render (10). There is no chat entry.
- An unknown render model is priced as Pro render (20).
- `measuredUsd` is internal cost and is removed before the data reaches the browser.

---

## 2. Differences

### 2a. Live site vs om-ui-port
The live deployment is newer than any local ref. No local branch contains the trial copy.

1. A Pro trial line is on the live cards.
2. The live plans API returns `trialPeriodDays` (Pro 14, Free and Max 0). The source's `Plan` type and `transformPlan` have no such field.
3. FAQ 2 has an extra sentence and FAQ 3 is new.
4. The closing CTA differs: live "Get started / See pricing", source "Get started / Talk to us", with different links.
5. The `data-cta`, `data-period` and `data-plan` analytics attributes are live only.

Everything else matches word for word.

### 2b. Marketing /pricing vs in-app /upgrade
`src/app/(main)/upgrade/page.tsx` is not a pricing page. It has no plans, no comparison and no prices.
- It is a checkout hand-off inside the app. It reads `?plan&period&seats`, waits for the session, and sends an owner who has not finished setup to `/studio-setup?next=…`.
- It then posts `/api/billing/checkout` and replaces the page with DodoPayments' checkout.

Its states, word for word:
- **No plan in the URL:** "Choose a plan" / "Pick the one that fits your studio and we will take it from there." / [See plans] → `/pricing`. This sends a signed-in user back out to the marketing site.
- **Working:** "Taking you to checkout…" / "One moment. You will be able to review everything before you pay."
- **403:** "Only the studio owner can change the plan" / "Ask whoever set up your studio to do this, and it will apply to everyone on the team." / [Back to dashboard]
- **409 (contact sales):** "Max is arranged with our team" / "It is priced per seat against an agreement, so there is no checkout for it. Tell us about your studio and we will set it up." / [Talk to us]
- **503:** "Checkout is not available right now" / "Payments are not configured for this environment. Nothing was charged." / [Back to pricing]
- **Other failure:** "We could not start the checkout" / "Nothing was charged. Try again, or talk to us and we will sort it out by hand." / [Back to pricing]
- **Network failure:** "We could not reach the checkout" / "Nothing was charged. Check your connection and try again." / [Back to pricing]

The other in-app surfaces on om-ui-port all say "credits"; the marketing page says "tokens".
- **Top-bar credit pill** (links to `/settings/usage`). Hovering opens a popover with:
  - one of "{n} credits left of your {cap}" / "{n} credits used this month" / "{n} credits available"
  - "Refreshes in N days" (or today / tomorrow)
  - "Studio pool" · "{n} credits" · "{plan} plan · {topup} top-up"
- **Settings card:** "Usage & Credits" / "See your credit balance, per-member spend, and recent activity" / [View usage]
- **Settings › Usage & credits:**
  - Subtitle "{Studio} · {Plan} · {N} seats". Period chips: This period · Last period · Last 3 months · Last 6 months.
  - "Credits remaining {n} of {allowance}", with a Plan · Top-up · Used bar.
  - "Renews {date} · {n} per seat" and "Plan credits do not roll over. Top-up credits never expire."
  - [Buy credits] is owner-only. It states neither the amount nor the price.
  - [Change plan] is disabled, with the tooltip "Changing plan isn't self-serve yet — talk to us and we'll move you."
  - Then the By member (caps), Recent activity and "Where your credits went" tables.
- **Blocked dialog:**
  - "Your studio is out of credits" [Buy credits] [Upgrade plan]
  - "You've used your monthly credits" [Request more] (does nothing) [Close]
  - "{Feature} is included in Pro" / "Upgrade to unlock it for your whole studio." [Upgrade to Pro] [Not now]
  - "You don't have access to this"
- **Checkout status line:** "Opening checkout…" / "Waiting for payment confirmation…" / "Payment received — your credits are ready." / "Payment is processing — your credits will appear shortly."
- Nothing in the app shows the plan comparison, lets you choose Freelance or Studio, Monthly or Annual, or seats, or lets you cancel.

---

## 3. Marketing-only vs what a signed-in studio owner needs

**Marketing only:**
- The nav and mega menu, Book a demo, the Sign-in avatar, the phone dock and the intro overlay.
- The hero's brand line.
- "No card to start".
- The sign-up CTAs ("Start free", "Get started" through `/login`).
- The closing "Try it before you decide." block.
- FAQs 2 and 7.
- The footer: newsletter, link columns, flags, socials.
- SEO and JSON-LD.

**Matters in-app:**
- Monthly / Annual toggle with the saving.
- The three plans with price, seat line and allowance line.
- The Freelance / Studio switch plus a seat count. Checkout already accepts seats, and each extra seat adds its per-seat allowance.
- Trial terms.
- The allowance table.
- The comparison matrix.
- The full action-cost list.
- Top-up: 1,000 for S$20, never expire, plan allowance spent first.
- FAQs 1, 3, 4, 5 and 6.
- Max as Talk to us.
- The owner-only rule, with a read-only view for everyone else.
- Checkout states.

**Missing today and needed in-app:**
- A "current plan" marker, with the studio's plan, seats, renewal date and balance (all available from the usage API).
- Upgrade and downgrade CTAs in place of the sign-up ones.
- A cancel path (Terms §10 promises cancelling "through your account settings").
- The top-up price shown on Buy credits.

---

## 4. Plan data model
The `plans` table (seeded by migrations 317 and 326) stores prices in cents. `transformPlan` converts them to S$. These values are from the live `/api/reference/plans`.

| id | name | S$/mo | S$/yr | allowance / seat / mo | signup grant | min seats | pooled | extra seat | contact sales | trial days (live only) | highlighted · badge |
|---|---|---|---|---|---|---|---|---|---|---|---|
| free | Free | 0 | 0 | 30 | 150 | 1 | 30 | — | no | 0 | no |
| pro_freelance | Pro — Freelance | 35 | 385 | 1,500 | 0 | 1 | 1,500 | — | no | 14 | yes · "Most Popular" |
| pro_studio | Pro — Studio | 100 | 1,100 | 1,500 | 0 | 3 | 4,500 | 35/mo | no | 14 | no |
| max | Max | 70 | 770 (not shown) | 3,000 | 0 | 1 | 3,000 | — | **yes** (no Dodo product) | 0 | no |

How the numbers work:
- Annual = 11 × monthly, which is the "1 month free".
- A subscription's monthly allowance is `credit_allowance × seats` (`allowanceFor`).
- Plan credits refresh each period and do not roll over. Top-ups never expire.
- Credits are checked in this order: role → plan → member cap → credits.

**Feature flags** (the 11 keys in `src/lib/credits/plans.ts`). Free is false on all of them. Pro Freelance and Pro Studio have identical flags, and a test enforces that.

| Flag | Free | Pro | Max |
|---|---|---|---|
| quote_xray, template_editor, package_creation, custom_stages, internal_approvals, whatsapp_notifications, expense_management | ✗ | ✓ | ✓ |
| po_support, accounting_integrations, remove_om_branding, custom_pricebook | ✗ | ✗ | ✓ |

**Copy in the data that the page never shows:**
- `features`:
  - Free: ["Lead management","Quote digitizer","AI Visualizer","Basic analytics"]
  - Freelance: ["Everything in Free","WhatsApp notifications","Quote X-Ray","Template editor","Package creation"]
  - Studio: ["Everything in Free","3 seats included","WhatsApp notifications","Quote X-Ray","Template editor"]
  - Max: ["Everything in Pro","PO support","Xero / MYOB / Zoho","Custom pricebook","Remove OM branding"]
- `limits`: storage is 1 / 10 / 10 / 100 GB. Freelance reads "1 team members"; the others read "Unlimited members".

**What `src/__tests__/pricing-page-matches-gates.test.ts` guarantees:**
- Flagged rows name flags that exist on every plan, and their ticks come from plan data, never from typed cells.
- A row with neither flag nor cells renders as not included.
- Pooled = allowance × min seats: Studio 4,500 and Freelance 1,500.
- The extra seat price is in dollars (35).
- yearly ÷ monthly = 11.
- The allowance math: 150 → 15 / 30 / 1 h, 1,500 → 150 / 300 / 10 h, 4,500 → 450 / 900 / 30 h, 3,000 → 300 / 600 / 20 h.
- Max is contact-sales and the Pro plans are purchasable.
- No Dodo product id reaches the browser.

It checks the flag data against the page. It does not check that the product enforces anything.

---

## 5. Worth flagging before bringing this into the app
- **No plan gate is actually enforced on om-ui-port.** 13 metered routes call `guardCredits`, and none passes a `feature`. The three typed "—" rows (Webhooks/API, Task templates, Custom invoice templates) aren't enforced either.
- **The blocked dialog says Pro for Max-only features.** It says "{Feature} is included in Pro" and offers Pro Freelance even for Max-only features such as Purchase orders.
- **"Tokens" on the marketing page vs "credits" everywhere in the app.**
- **Possible Studio overcharge.** Studio checkout sends quantity = seats (3). The test-mode product is "PRO — Studio SGD 100.00", so unless Dodo prices per seat, 3 × S$100 is charged against a displayed S$100. A developer should check this.
- **Copy conflicts:**
  - "No card to start" sits under a Pro card that says "card required".
  - Annual Studio mixes "/year" with "per extra seat/month".
  - The badge vanishes on Studio.
  - The allowance table shows Free's one-time 150, not the 30 a month.
  - FAQ 7 names 4 markets; the footer shows 5 (Egypt included).
  - "AI Visualiser" in the nav and footer vs "AI Visualizer" in the matrix.
  - The page title repeats the brand.
- **A visible bug on the Usage page.** "Set a monthly ceiling so one person can&apos;t spend the studio&apos;s month." sits inside a JavaScript string, so the owner sees `&apos;` literally.
- **The 2.0 prototype already has an in-app entry point:** the rail's inert **Upgrade** item (diamond icon, REG-164 / REG-206, `components/shell/app-rail.tsx:181`).

Files are in `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/scratchpad/pricing/`:
- live-rendered.txt
- plans.json
- live.html
- live-1440-monthly-freelance.png
- live-1440-annual-studio.png
- cards-monthly-freelance.png
- cards-monthly-studio.png
- live-390-full.png
- render-live.cjs
