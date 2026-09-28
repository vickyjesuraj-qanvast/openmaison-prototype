# E — research: how the leading products handle AI credits (web, 2026-09-28)

> Research reader's report for the AI credits audit (`../19-ai-credits-1.0-to-2.0-audit-2026-09-28.md` §6), banked as written. Every claim carries its source link; (3P) marks a third-party claim, (unverified) one the reader could not confirm.

# AI credits: how the leading products handle balance, cost, limits and teams (checked 28 Sep 2026)

**What I did.** I covered 17 products (plus Bolt briefly). I read each product's official help centre, docs, pricing page and changelog first, then press, then vendor forums, Trustpilot and Hacker News for complaints. Every claim has its source link beside it. **(3P)** marks a claim only a third party makes; **(unverified)** marks one I could not confirm. Nothing in the repo was changed.

**Limits on the evidence:**
- Reddit refused direct reads (403). Reddit opinion appears only where press or forums quote it.
- The session's shared web-search quota (200 calls) ran out partway through. Later checks were done by fetching pages directly.
- Adobe's and Canva's help centres block page fetchers, so I read them in a headless browser.
- I re-checked the claims the conclusions rest on against the live pages: Lovable's check-ins and pause at zero, GitHub's budget requests, Claude's request flow, Krea's cost estimates, Notion's projection, Cursor's run-out forecast, VS Code's Copilot messages, Replit's consent before paid use, Miro's "No" to showing cost first, and Runway's charge-and-refund.

---

## 1. The short version

1. **OpenMaison's fixed prices per action are its biggest advantage.** The products people complain about most can't show a price before an action runs, because the cost depends on work discovered along the way.
   - Figma Make: "we can't predict exactly how many credits it will use" ([Figma](https://help.figma.com/hc/en-us/articles/33459875669015-How-AI-credits-work)).
   - Miro, asked "Can I see the cost of a prompt… before I run it?": "No." ([Miro](https://help.miro.com/hc/en-us/articles/19756209116178-Miro-AI-credits)).
   - Lovable: "does not show an upfront credit estimate" ([Lovable](https://docs.lovable.dev/features/agent-mode)).
   - Cursor's model picker shows no prices ([forum](https://forum.cursor.com/t/show-pricing-on-model-selector/130882)).

   Products with fixed prices put the number on the button: Leonardo, ElevenLabs, Krea (since 7 Sep 2026), Runway, and Adobe on hover.
2. **The market has settled on one team model:**
   - an included allowance;
   - a stated order for which credits are spent first;
   - paid overflow only if someone opts in;
   - caps the owner sets (a studio default plus a per-member override);
   - alerts at usage thresholds;
   - a one-tap "ask the owner", and a one-click approval.

   Claude Team, ChatGPT Business, Figma, GitHub Copilot, Notion, Lovable and Krea all shipped versions of this in 2025–26.
3. **A shared studio pool works better than separate allowances per seat.**
   - With allowances per seat, one member is blocked while another seat's credits go unused. Figma, Canva, Adobe, Cursor Teams and Bolt work this way, and they draw complaints.
   - The newer designs share one pool and let the owner cap each member: Lovable, Krea Business (Sep 2026), Notion, Copilot Business, Runway Team and Miro. OpenMaison's plan already matches them.
4. **At zero, the best products don't just stop. They do one of three things:**
   - pause and keep the work (Lovable: **Add credits / Finish up / Ask an admin → Resume**; Krea: "Your draft is kept");
   - let the job already running finish (Notion, Codex, Copilot CLI);
   - switch to a slower or cheaper mode (Canva's "short pauses", Midjourney Relax, Leonardo's slow Unlimited, Notion's fallback models, Copilot's 2025 automatic switch).

   A hard stop that doesn't say when access returns is what users hate most.
5. **The most trusted products refund failures automatically and visibly.** Adobe refunds within minutes, Runway's charge disappears, Leonardo shows a refund row, and Midjourney, Miro and Anthropic don't charge for failures at all.
   - The most common complaint everywhere is paying for the AI's own mistakes (Figma Make, Replit, v0, Copilot, Runway).
   - What fixed it was free "fix" actions: Figma, v0, Lovable, ElevenLabs.
6. **Bought credits that never expire are rare.** Only Runway's purchased credits and Leonardo's top-ups (which need an active plan) never expire. Everyone else's expire after 30 days to 12 months. Most products spend the credits closest to expiry first (Canva, Lovable, Runway, Notion). "Top-ups never expire" can be a real selling point for OpenMaison.
7. **Credits mean little until they are translated into outcomes.**
   - Plan pages increasingly do this: Adobe "Generate 5-second videos: Up to 20", Krea "64 … generations", Runway "112 images", Miro "Enough to generate approx. N screens".
   - **No product shows "≈ N renders left" in the live balance.** OpenMaison can, because its prices are fixed.
   - Meters that show only a percentage, or say "10x more AI", draw complaints like "What I need is actual numbers" (Canva).
8. **Every major backlash came from changing the deal, hiding costs, or enforcing limits without warning. Price levels mattered less.**
   - Cursor (June 2025)
   - Adobe (June 2025: 500 → 25 credits for new single-app subscribers)
   - Figma (enforced limits on 18 Mar 2026 after tracking usage without enforcing)
   - Anthropic (quietly tightened Claude Code limits, Jul 2025)
   - GitHub Copilot (Apr 2026 move to token billing: 958 thumbs-down)
   - v0 (May 2025: "we will not be reverting")
   - Runway (retired its Unlimited plan)

   Metronome's field report: "Usage stopped not because of price, but because admins didn't trust they'd stay in budget." ([Metronome, Aug 2025](https://metronome.com/blog/ai-pricing-in-practice-2025-field-report-from-leading-saas-teams))

---

## 2. Side by side

| Product | Unit · pool | Where the balance is | Cost shown before? | At zero | Member caps · asking for more | Failures · undo | Plan credits · bought credits |
|---|---|---|---|---|---|---|---|
| Adobe | Credits per user (enterprise contracts can add an org pool) | Account-menu counter; Photoshop usage panel | Notice on first use, icons, cost on hover; Firefly Graph shows cost or "Credits vary" | Wait or buy; standard features stay unlimited on Pro/Firefly plans | None; enterprise members request the org pool | Refunded in minutes (≤24 h for video) | Monthly, no rollover |
| Canva | "Uses" by tier, per member | Settings › Billing › AI usage (%) | Tier name only | "Short pauses" between generations; Ultra tools wait | None; admins buy per member; members "contact their owner or admin" | Not documented | Monthly · top-ups last 30 days |
| Figma | Credits per seat, plus an optional shared pool and pay-as-you-go | Main menu › AI balance | No for Make; hover after for a receipt | Blocked; "Request more" | Full / Custom / No access per person | Undo not refunded; fix actions free | Monthly, no rollover |
| Miro | Credits, one team pool | Admins only | "No" | Pause; member requests email admins | None per member | Errors free; undo not refunded | Monthly (bought credits too) |
| Notion AI | Allowance (6-hour + monthly windows) plus pooled credits | Settings › Usage; admin dashboard with a projection | Estimate tables only | Wait up to 6 h; fall back to included models | Default + overrides; per-agent caps; requests | Not documented | Monthly · annual credits last to renewal |
| Copilot | AI credits ($0.01), pooled for organisations | IDE status bar (% and reset time) | Price tier in the model picker; receipt per turn | Blocked unless paid overage is on | User budgets (can expire); "Approve and increase" | Not documented | Monthly |
| Cursor | Dollars of usage per seat | Dashboard; in chat after 50% | None; a run-out forecast | Pay on demand or upgrade | Team limit only (per-member on Enterprise) | Aborted runs charged since Oct 2025 | Monthly |
| OpenAI | API: prepaid $ · ChatGPT: plan limits + credits | Billing and Limits pages; limit messages give a time | API: none · ChatGPT: fixed rate card | API: requests fail; auto-reload on by default | Budgets, alerts, hard limits; per-user overrides | — | API credits expire after 12 months |
| Anthropic / Claude | Console: prepaid $ · Claude apps: session + weekly limits + usage credits | Billing; Settings › Usage bars with reset times | None; consent before paid overflow | Wait, or continue on usage credits | Defaults per seat type + per user; "Request usage credits" | "Failed requests aren't charged" | Console 12 months · Claude app credits mostly never expire |
| Midjourney | Fast GPU time per user | `/info` shows "X / Y" | Approximate table only | Relax queue (Standard plan and up) | None | "Blocked jobs don't cost you any credits" | Monthly · bought time 60 days |
| Runway | Credits; Team plan pooled | Chip at top right | Shown at start (the maximum, for Auto length) | Buy, or Auto Refill | Caps only on Enterprise | Errors refunded; cancelling a stuck job isn't | Monthly · bought credits never expire |
| Krea | Compute units; Business pooled | Usage page; "My Usage" | Estimate before running (Sep 2026) | Draft kept; slower relaxed mode on Max+ | Workspace default + member limit | API failures not billed | Monthly · packs 90 days |
| Leonardo | Tokens | Count above your profile, hover for breakdown | On the button | Free daily 150; slow Unlimited mode | Not documented | Refund row in history | Rollover up to 3 months · top-ups never expire |
| ElevenLabs | Credits; shared pool | Subscription page | On the Generate button | Pay-as-you-go pauses at $0 | Billing groups with quotas | Failed step free; free regenerations | Rollover up to 2 months · bought 12 months |
| Lovable | Credits; workspace pool | Credit bar in workspace menu | No; live receipt plus check-ins | Pause: Add credits / Finish up / Ask an admin → Resume | Default + per member; members can ping owners | No refunds; 10 free fixes | Rolls over · 12 months |
| Replit | Dollar credits; Pro plan pooled | Usage page | Asks consent before paid use | Overage billed by default | Enterprise only | Non-refundable | Monthly · packs 6 months |
| v0 | Dollar credits per user plus a shared pool | User menu | Model rates on hover; receipt after | Pauses until credits are added | Upgrade requests only | "Fix with v0" free (10 a day) | 65 days · 1 year (needs a paid plan) |

---

## 3. Product by product

Each product below covers: (1) where the balance is, (2) cost shown before, (3) at zero, (4) teams, (5) refunds and expiry, (6) upgrading, (7) touches that reduce anxiety.

### 3.1 Adobe Firefly and Creative Cloud (generative credits)

**Numbers** ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html), updated 10 Sep 2026):
- Creative Cloud Pro: 4,000 credits for premium features; standard features unlimited.
- Firefly Standard / Pro / Pro Plus / Premium: 2,000 / 4,000 / 10,000 / 50,000 credits a month.
- Single-app and Photography plans: 25 credits for anyone who subscribed on or after 17 Jun 2025 (500 before that).
- Example costs: 1080p video 100 credits per second; Firefly Image 5 10 credits per generation.
- Partner models in Photoshop: Firefly 1, Nano Banana 10, FLUX.2 Pro 20, Nano Banana Pro 40 ([Glyn Dewis, Dec 2025](https://glyndewis.com/blog/adobe-credit-crunch), 3P).

1. **Balance.** The account menu counter shows credits "left in the current billing cycle" against those "included in your plan". The same counter is under the profile icon on each app's home screen ([access and use](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-access-and-use.html)). Photoshop 27.6 (Apr 2026) added a Generative Credits Usage panel. Its icon sits next to the Workspace selector, in the contextual task bar, in the Properties panel and in generative dialogs, and you can buy credits from it ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html); [PetaPixel](https://petapixel.com/2026/04/28/adobes-latest-photoshop-and-lightroom-updates-focus-on-speed/)).
2. **Cost before.**
   - A one-time message the first time you use a feature says it "is using generative AI and may consume generative credits". A sparkle icon marks features that spend credits; a crown or coloured background marks premium ones ([access and use](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-access-and-use.html)).
   - Hover over the model icon to see the cost ([PHLEARN, Dec 2025](https://phlearn.com/tutorial/10-days-of-ai-in-photoshop-and-lightroom-day-7/)). Hovering the Generate button also works, but only with tooltips switched on ([Fstoppers, May 2026](https://fstoppers.com/education/adobes-new-ai-credit-cost-preview-photoshop-what-need-know-902663)).
   - Firefly Graph shows the cost next to Run, or a "Credits vary" label whose hover names the steps that make the cost vary ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html)).
3. **At zero.**
   - Wait for the reset or buy more. Standard features stay unlimited on Pro and Firefly plans. "Adobe will not charge you for additional credits unless you decide to buy more" ([access and use](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-access-and-use.html)).
   - The message reads: "You don't have enough credits for this generative action. Upgrade your Firefly plan now to get more credits for continued access or wait until your monthly reset." ([community](https://community.adobe.com/t5/photoshop-ecosystem-discussions/p-you-don-t-have-enough-credits/m-p/15401022)).
   - Firefly Premium users can queue up to 20 videos past their limit. They are "processed in the background with an unspecified completion time" ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html)).
4. **Teams.** Credits are "not pooled or shared across users" on teams and enterprise plans. Enterprise customers on term licence agreements (ETLA) can buy **Shared Credits** ([Shared Credits](https://helpx.adobe.com/business/enterprise/products-entitlements/manage-entitlements/generative-credit-pool.html)):
   - members use their own credits first, then the organisation's pool;
   - members request access with a business reason, and admins approve by hand or with automatic rules;
   - requests expire after 60 days, and approval arrives by email;
   - there is no per-user limit on the pool; overage is billed at the next true-up.
5. **Refunds and expiry.** "Credits are deducted up front… On an unsuccessful generation, credits are typically refunded to your credit balance within minutes", or up to 24 hours for video ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html)). Credits don't roll over and reset on the billing day. Free users get daily generations whose "Limits refresh every day" ([plans](https://www.adobe.com/products/firefly/plans.html)).
6. **Upgrading.** Buy from Photoshop's panel, or from the profile panel's Buy button ([Photoshop Essentials](https://www.photoshopessentials.com/basics/how-to-check-your-generative-credits-in-photoshop/)). The plans page has add-on credit plans under the heading "Out of credits. Not ideas." There is a limited offer of "unlimited generations on select models… for the first year". It covers individual plans only, and may be slowed or queued when demand is high ([plans](https://www.adobe.com/products/firefly/plans.html); [promotion](https://helpx.adobe.com/firefly/web/get-started/learn-the-basics/current-firefly-promotions.html)).
7. **Touches.** Plan cards translate credits into outcomes: "Generate 5-second videos: Up to 20 / 40 / 100", "Translate audio and video: Up to 6 minutes…" ([plans](https://www.adobe.com/products/firefly/plans.html)). Free trial uses of premium features, e.g. "2 free video generations" ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html)).

### 3.2 Canva

**Numbers** ([AI usage](https://www.canva.com/help/ai-access/)):
- Free: up to 20 uses of Standard or Premium tools.
- Pro / Teams: up to 200 Premium uses or 20 Ultra uses.
- Business / Enterprise: 400 Premium or 40 Ultra.
- Standard tools are unlimited on paid plans (fair use).
- **AI Pass**: US$100 per person per month, 40× Pro's allowance and 20× Business's ([AI Pass](https://www.canva.com/help/ai-pass/)).
- **AI top-up** (Business only): one month's Business allowance as a one-off purchase, valid 30 days ([top-ups](https://www.canva.com/help/ai-top-ups/)).

1. **Balance.** Profile › Settings › Billing › "AI usage" shows "your AI usage and remaining balance". The plan and a top-up get separate trackers ([top-ups](https://www.canva.com/help/ai-top-ups/)). It reads as a percentage; one user wrote "already hit 73% usage on the free tier" ([Creative Kat, 2026](https://thecreativekatstudio.com/blogs/canva/canvas-ai-limits-updated-heres-what-you-actually-need-to-know)).
2. **Cost before.**
   - There are no numbers per action, only the tool's tier. The ranges "assume simple tasks" ([pricing](https://www.canva.com/pricing/)).
   - An "AI quality" picker offers Standard / Premium / Ultra; Premium is "the default for all". If a tool can't do the tier you chose, Canva uses Premium and "You'll see a message explaining which tier was used". Greyed-out AI options usually mean you've hit your limit. (Canva Help, "Set the quality of Canva AI-generated content", linked from [top-ups](https://www.canva.com/help/ai-top-ups/).)
3. **At zero.**
   - "You'll get a notification in Canva as you approach your AI allowance limit, so you can plan ahead."
   - Paid plans then keep working "with short pauses between tasks", while Ultra tools wait for the reset ([AI usage](https://www.canva.com/help/ai-access/)).
   - "If you reach your AI usage limit while designing, you'll be prompted to upgrade your subscription or choose AI Pass" ([AI Pass](https://www.canva.com/help/ai-pass/)).
4. **Teams.** "Each member has their own allowance. Allowances aren't shared or pooled" ([AI usage](https://www.canva.com/help/ai-access/)).
   - Owners and admins buy AI Pass or top-ups for individual members from the People page.
   - Members "should contact their owner or admin directly"; there is no request button ([top-ups](https://www.canva.com/help/ai-top-ups/)).
   - Admins switch AI tools on or off under Permissions › Magic and AI ([admin controls](https://www.canva.com/help/magic-features-admin-controls/), search result only).
5. **Refunds and expiry.**
   - The allowance resets on the billing day, monthly even on yearly plans; Free resets at 00:00 UTC on the 1st.
   - Top-ups expire after 30 days and can't be cancelled.
   - "AI tools will always use the allowance that expires soonest" ([top-ups](https://www.canva.com/help/ai-top-ups/)).
   - The policy on failed generations isn't documented.
6. **Upgrading.** Settings › Billing › AI usage › "Get more". Yearly AI Pass is charged pro rata ([AI Pass](https://www.canva.com/help/ai-pass/)).
7. **Touches.** Credits closest to expiry are spent first. Slowing down replaces a hard stop. The quality picker works as a cost dial.

### 3.3 Figma

**Numbers:**
- Monthly credits per seat: Starter 500; Professional full seat 3,000; Organization 3,500; Enterprise 4,250; other seats 500 ([how credits work](https://help.figma.com/hc/en-us/articles/33459875669015-How-AI-credits-work)).
- Starter and View seats also have a limit of 150 a day.
- Add-on packs (Dec 2025): 5,000 credits at $120 a month as a subscription or $150 pay-as-you-go; 10,000 at $240 / $300 ([blog](https://www.figma.com/blog/updates-to-ai-credits-in-figma/)).
- From 25 Aug 2026, add-ons give 2× the credits for the same price on Professional and 1.6× on Organization/Enterprise ([FAQ](https://help.figma.com/hc/en-us/articles/42614902212887-AI-credit-updates-FAQ)).
- Example costs: search and layer renaming free; remove background 1–5; images 2–16; Figma Make "~30+" to "~100+".

1. **Balance.** In a file, Main menu › "AI balance" shows used, remaining and the reset date. A "You're low on AI credits" banner is reported (3P, [appshot](https://www.appshot.app/posts/2026-07-09-figma-ai-credits-explained/)).
2. **Cost before.** Not for Make ("we can't predict exactly how many credits it will use"). Afterwards, hover "the AI credits icon below the completed prompt".
3. **At zero.** "When you run out of credits, you'll see an in-product message", and paid AI is blocked. If you hit your personal cap while plan credits remain, you see "Out of AI credits" and **Request more** ([set limits](https://help.figma.com/hc/en-us/articles/41944442159767-Set-AI-credit-limits)).
4. **Teams** ([manage](https://help.figma.com/hc/en-us/articles/35865276858647-Manage-AI-credits); [set limits](https://help.figma.com/hc/en-us/articles/41944442159767-Set-AI-credit-limits)):
   - Seat credits are personal and can't be transferred.
   - Admins can add a shared monthly pool, pay-as-you-go with a monthly spend-limit slider, or both. Credits are spent in the order seat → shared pool → pay-as-you-go.
   - Per person, admins choose Full access / Custom credit limit (slider) / No access, one at a time or in bulk. "Whichever one runs out first blocks."
   - The dashboard shows who is using AI, "People at seat credit limit" and "Days until credits reset". CSV export is on Organization and Enterprise.
   - Requests reach admins "by email and in the product".
5. **Refunds.** Undo "does not refund credits". "Auto fix" and "Fix for me" "do not use additional AI credits". No rollover.
6. **Upgrading.** "+ Add credits" → choose a tier → "Confirm". "Price per credit decreases as more credits are purchased", and changes are prorated. Pay-as-you-go is set with a slider, then "Review and confirm".
7. **Touches.** Fix actions are free. Access is set in three clear levels. Admins see a countdown to the reset. Figma showed usage for three months before enforcing limits.

### 3.4 Miro

**Numbers** ([AI credits](https://help.miro.com/hc/en-us/articles/19756209116178-Miro-AI-credits)):
- Free: 25 a month for the whole team. Starter: 25 per licence. Business: 50 per licence.
- Enterprise pools from 2,500 ([Enterprise](https://help.miro.com/hc/en-us/articles/19973211245586-Miro-AI-Credits-for-Enterprise-Plans)).
- Example costs: sticky note 1, image 3, diagram 5, slides 5 per slide, search 0.

1. **Balance.** Only Billing and Company admins can see it, and "it isn't shown on Free plans". They see the allowance, purchased credits, renewal date and a used bar.
2. **Cost before.** "Can I see the cost of a prompt in Miro before I run it? No." There is a static cost table. The pricing page says "100 credits could perform one of the following…" and "Enough to generate approx. {{usageLimit}} screens" ([pricing](https://miro.com/pricing/)).
3. **At zero.** "AI actions pause until they refresh. Admins can buy more credits or upgrade, and members can request more — which notifies admins by email." Enterprise has a soft limit.
4. **Teams.** "Everyone draws from one balance." There are no per-member caps; AI can only be switched on for everyone, specific teams or no one. Analytics show usage by feature, team and user, with a burn-rate chart and a switch to hide per-user data ([analytics](https://help.miro.com/hc/en-us/articles/36816076051602-Miro-AI-Credit-Usage-Analytics)).
5. **Refunds.** An error costs nothing. "Undoing or discarding a result doesn't refund credits." Purchased credits also reset monthly.
6. **Upgrading.** An in-app dialog. Mid-cycle purchases are prorated and available at once; 20% off yearly ([add-ons](https://help.miro.com/hc/en-us/articles/28897507989138-Purchase-and-manage-add-ons)).
7. **Touches.** Outcome framing; free search and accessibility actions.

   Complaint: top-up prices aren't published. A volunteer moderator: "not sure why Miro does not making the pricing visible" ([community](https://community.miro.com/ask-the-community-45/any-way-to-increase-miro-ai-credits-27127)).

### 3.5 Notion AI

**Numbers:**
- Full AI comes with Business ($20) and Enterprise.
- Notion credits cost $10 per 1,000 monthly (reset each month) or $13 per 1,000 annual (expire at renewal) ([credits](https://www.notion.com/help/what-are-notion-credits)).
- An included allowance is measured over a 6-hour window and a monthly window. Its size is not published ([allowance](https://www.notion.com/help/manage-your-usage-allowance-for-notion-ai)).

1. **Balance.** Settings › Notion AI › Usage, "and a heads-up within Notion Agent chat as you get close". Admins get a credits dashboard with a "Current" line and an "Estimated" line projected to the reset date ([dashboard](https://www.notion.com/help/track-usage-in-the-notion-credits-dashboard)).
2. **Cost before.** No preview per action. There are estimate tables per agent type, e.g. a Q&A agent at "~$0.03–$0.11" a run ([agents](https://www.notion.com/help/buy-and-track-notion-credits-for-custom-agents)).
3. **At zero.**
   - At the allowance: "Your access resets automatically within six hours."
   - A member at their premium-model cap "can keep using the models included in your plan… Ask an admin" ([models](https://www.notion.com/help/manage-ai-models-and-member-credit-spend)).
   - An agent at its cap: "we let it finish before stopping new usage" ([dashboard](https://www.notion.com/help/track-usage-in-the-notion-credits-dashboard)).
4. **Teams.** Credits are pooled. There is a default member limit with per-person or per-group overrides, and per-agent caps that members can ask to raise in the product ([admin guide](https://www.notion.com/help/guides/admin-guide-to-getting-started-with-custom-agents)). Premium models are off by default. Admins are alerted at 80% and 100%.
5. **Refunds.** Refunds for failed runs are not documented. "Try again" counts as another response.
6. **Upgrading.** Auto Adjust (automatic top-up) is off by default and recommends a spending cap. It confirms with "Auto Adjust successful: +$50 credits." But each run is "a permanent plan change" ([Auto Adjust](https://www.notion.com/help/set-up-auto-adjust-for-notion-credits)).
7. **Touches.** The projection line; falling back to included models instead of stopping; a grace period while a payment clears.

### 3.6 GitHub Copilot

**Numbers.** On 1 Jun 2026 GitHub moved from "premium requests" to **GitHub AI Credits**: 1 credit = $0.01, metered by tokens ([individuals](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals); [organisations](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises)).
- Pro $10 → 1,500 credits a month; Pro+ $39 → 7,000; Max $100 → 20,000.
- Business / Enterprise: 1,900 / 3,900 credits per user, pooled.
- Code completions are free.

1. **Balance** (exact strings from the [VS Code source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/chatStatus/chatStatusDashboard.ts)).
   - The IDE status bar opens a dashboard with "{0} used", "{0}%", "Resets {0} at {1}", "Manage Budget" and "Upgrade".
   - From 75%: "Copilot will pause when the limit is reached."
   - At 100%: "Copilot is paused until the limit resets."
   - On GitHub.com: "450 / 1,000 AI credits used" ([monitoring](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-ai-usage)).
2. **Cost before.**
   - The model picker shows prices per token and a Low / Medium / High tier. Each turn's cost appears on hover afterwards, plus a session total ([VS Code docs](https://code.visualstudio.com/docs/agents/guides/optimize-usage)).
   - The CLI has session caps: "If a response is in progress when the limit is reached, that response completes." ([CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/set-session-limit)).
3. **At zero.**
   - In 2025, Copilot switched you to an included model and said so: "We have automatically switched you to {0} which is included with your plan" ([source](https://github.com/microsoft/vscode-copilot-chat/blob/main/src/extension/conversation/vscode-node/chatParticipants.ts)).
   - Since June 2026 there is no fallback. You are blocked unless paid overage is on, which is the default for organisations.
   - Members see a banner to request more budget. Admins press **Approve and increase**, which "immediately restores their access to AI credits" (general availability 16 Sep 2026, [changelog](https://github.blog/changelog/2026-09-16-copilot-budget-increase-requests-are-generally-available/)).
4. **Teams** ([budgets](https://docs.github.com/en/copilot/concepts/billing/budgets-for-usage-based-billing)).
   - User budgets "always enforce a hard stop" and can expire "at the end of the current billing cycle".
   - Spending budgets have "Stop usage when budget limit is reached" **off by default**.
   - Alerts at 75, 90 and 100%.
5. **Refunds.** None documented. No rollover.
6. **Upgrading.** "The upgrade cost is only the price difference… Your usage from earlier in the billing cycle is counted within the new plan's larger allowance."
7. **Touches.**
   - Receipts per turn; budgets that expire on their own.
   - In 2025, usage appeared in the IDE weeks before billing started, and counters were reset to zero when enforcement began ([May 2025](https://github.blog/changelog/2025-05-07-enforcement-of-copilot-premium-request-limits-coming-soon/); [Jun 2025](https://github.blog/changelog/2025-06-18-update-to-github-copilot-consumptive-billing-experience/)).
   - A preview bill before the 2026 switch.

### 3.7 Cursor

**Numbers** ([blog](https://cursor.com/blog/june-2025-pricing); [Teams pricing](https://cursor.com/blog/teams-pricing-june-2026); [limits](https://cursor.com/help/models-and-usage/usage-limits)):
- Pro $20: "$20 of frontier model usage per month at API pricing". Pro+ $60. Ultra $200.
- Teams: Standard $40 per user, Premium $120.
- Usage beyond that is billed on demand at API rates, after the fact. No rollover.

1. **Balance.**
   - The dashboard's Spending tab shows usage and the reset date.
   - Usage appears in chat once you pass 50% ([changelog 1.4](https://cursor.com/changelog/1-4)).
   - Dollar amounts were removed from the Usage page on 31 Jul 2026 ([forum](https://forum.cursor.com/t/usage-page-to-token-amount-what/167153)).
2. **Cost before.** The model picker shows no prices. Instead, a forecast ([forum, Jul 2025](https://forum.cursor.com/t/you-are-projected-to-reach-your-usage-limits-by/122351)): "You are projected to reach your usage limits by 7/31/2025 based on your current usage. Consider switching to Auto for more requests, asking for smaller changes, or enabling pay-as-you-go to avoid interruptions until your cycle resets on 8/2/2025."
3. **At zero.** "You've hit your usage limit", with options to turn on on-demand usage or upgrade. Teams first move from third-party models to Cursor's own models ([Teams docs](https://cursor.com/docs/account/teams/pricing)).
4. **Teams.**
   - Usage is per seat and not pooled; only Enterprise pools.
   - There is one spend limit for the whole team. Per-member limits became Enterprise-only in Dec 2025 ([forum](https://forum.cursor.com/t/team-admins-now-can-control-spend-alerts-and-limits/145259)).
   - Spend alerts "don't stop usage". Usage can be broken down by user and model, with CSV export.
5. **Refunds.** The dashboard once labelled rows "Errored, Not Charged". Since 15 Oct 2025, aborted runs are charged ([forum](https://forum.cursor.com/t/aborted-errored-requests-are-being-charged/137676)).
6. **Upgrading.** Unused included usage is credited when you upgrade ([refunds](https://cursor.com/help/account-and-billing/refunds)).
7. **Touches.** The forecast comes with three concrete remedies. The meter stays quiet until 50%.

### 3.8 OpenAI (API platform and ChatGPT)

**API platform:**
- Prepaid credits (minimum $5), which expire after a year.
- Auto-reload is "turned on by default during setup" ([prepaid](https://help.openai.com/en/articles/8264644-how-can-i-set-up-prepaid-billing)).
- The Limits page shows "July budget $0.00 / $120.00" and "Resets in 28 days.", with alert rows "80% usage alert" and "100% usage alert". The alert dialog reads "Alert when budget usage exceeds [90] %" and has "Also send alerts to" ([projects](https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects)).
- Hard spend limits, which return an error once reached, arrived in Jul 2026 ([forum](https://community.openai.com/t/hard-spend-limits-rolling-out-to-all-api-platform-accounts/1387914)).
- Usage can be broken down by project, user, key and model, with CSV export ([dashboard](https://help.openai.com/en/articles/10478918-api-usage-dashboard)).
- There is no cost preview, and the balance can go negative.

**ChatGPT:**
- Limit messages give the time: "You've reached your image creation limit. Upgrade to ChatGPT Plus or try again tomorrow after 9:17 AM." ([Free FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq)).
- A fixed rate card: images 5 credits per generation, deep research 50 per task ([rate card](https://help.openai.com/en/articles/11481834-chatgpt-rate-card-business-enterpriseedu)).
- On Business, a banner appears when included usage runs out, and members "can ask a workspace owner to add more". Limits can be set per seat type, with a "Per user override" ([Business](https://help.openai.com/en/articles/11487671); [spend controls](https://help.openai.com/en/articles/20001155)).
- On Enterprise, approvals can be temporary or permanent ([Enterprise](https://help.openai.com/en/articles/20001001-manage-usage-limits-and-overages-in-chatgpt-enterprise-and-edu)).
- Codex finishes the turn it is on when a limit hits ([Codex](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)).

### 3.9 Anthropic (Console and Claude.ai)

**Console:**
- Prepaid credits expire after a year. Auto-reload and spend limits per workspace are available.
- "Failed requests aren't charged" ([billing](https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage)).
- Hitting a tier cap tells you exactly when access returns: "You will regain access on 2026-09-01 at 00:00 UTC" ([rate limits](https://platform.claude.com/docs/en/api/rate-limits)).
- Usage can be broken down by model, key and workspace, but not by user.

**Claude.ai:**
- Settings › Usage shows the current session's share with the time left, plus the weekly limits with their reset ([best practices](https://support.claude.com/en/articles/9797557-usage-limit-best-practices)).
- Paid overflow only starts after "a confirmation that you'll continue with usage credits" ([usage credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)). Claude Code asks you to type a confirmation for amounts over $1,000 ([changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md), v2.1.207).
- **Team plans** ([Team](https://support.claude.com/en/articles/12005970-manage-usage-credits-for-team-and-seat-based-enterprise-plans)):
  - default limits per seat type, plus limits per user with an "MTD Spend" column;
  - members press "Request usage credits", which changes to "Request sent to admin";
  - admins open "Review requests", press "Increase limit", and get a daily email of open requests.
- **Enterprise pooled budgets** ([pooled](https://support.claude.com/en/articles/17005973-manage-pooled-group-budgets-on-enterprise-plans)):
  - the starting budget is suggested from recent usage;
  - the bar turns amber at 75% and red at 90%, with emails at 50, 75, 95 and 100%;
  - "Users never see the group's name or the pooled budget amount".
- A panel shows "Blocked right now", "Near their limit" and "Member-days lost this month" ([Enterprise billing](https://support.claude.com/en/articles/11526368-how-am-i-billed-for-my-enterprise-plan)).
- Occasional free resets: "Reset for free" ([resets](https://support.claude.com/en/articles/17007452)).

### 3.10 Midjourney

- **Numbers.** Fast GPU time per month: Basic 3.3 h ($10), Standard 15 h ($30), Pro 30 h, Mega 60 h ([plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans)). Extra time costs $4 an hour, expires after 60 days and needs an active plan ([extra time](https://docs.midjourney.com/hc/en-us/articles/33570952624141-Purchasing-Extra-Fast-Time)).
- **Balance.** `/info` shows "Fast Time Remaining" as "X / Y"; the account page has Usage Details ([info](https://docs.midjourney.com/hc/en-us/articles/32084927086861-Info-Command)).
- **Cost before.** No preview per job, only an approximate table: "one image prompt usually takes about one minute of GPU time" ([GPU speed](https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo)).
- **At zero.** Unlimited Relax mode on Standard and up, with waits of "0 to 30 minutes".
- **Teams.** No seat or admin tools ([group plans](https://docs.midjourney.com/hc/en-us/articles/27870607078285-Group-Plans-Corporate-Billing)).
- **Refunds.** "Blocked jobs don't cost you any credits. GPU time will only be deducted when you see your results" ([video](https://docs.midjourney.com/hc/en-us/articles/37460773864589-Video)). Unused plan time is lost each month.
- **Touches.** Draft mode makes 24 images at 512 px for 0.4 GPU minutes ([draft](https://docs.midjourney.com/hc/en-us/articles/35577175650957-Draft-Conversational-Modes)). You can earn an extra hour by rating images. Upgrading mid-month is discounted by your unused fast time.

### 3.11 Runway

- **Numbers** ([credits](https://help.runwayml.com/hc/en-us/articles/15124877443219-How-do-credits-work); [carry over](https://help.runwayml.com/hc/en-us/articles/23987639973267-Will-unused-credits-carry-over-after-my-billing-day)):
  - Standard 625 credits ($15); Pro 2,250 ($35); Max 9,500 ($95, rolls over one month).
  - Team $69 per seat with 6,900 credits, pooled.
  - Bought credits cost $10 per 1,000 and "never expire".
- **Balance.** A button at the top right shows your credits, or "Unlimited ∞" in Unlimited Mode. Plans & Billing separates plan credits from purchased ones and has a 30-day usage table.
- **Cost before.**
  - Shown when you start. For clips with "Auto" length, Runway holds the maximum and refunds the rest: "The number you see when you start is the most the video could cost" ([charge and refund](https://help.runwayml.com/hc/en-us/articles/55412733862675-Why-do-I-see-a-charge-and-a-refund-for-the-same-generation)).
  - Apps say "uses up to 48 credits per generation".
- **At zero.**
  - Buy more, or turn on **Auto Refill**, with fields "Amount per recharge", "Maximum spend per month" and "Refill when credits hit". "You will not need to retry the generation", and an email goes out on every refill ([Auto Refill](https://help.runwayml.com/hc/en-us/articles/52891343848851-Setting-up-Auto-Refill-for-Credits)).
  - Unlimited Mode on Pro and Max covers some models, at slower speed.
- **Teams.** One pooled balance, and only admins can buy. On Enterprise, workspace caps send members "to their workspace admin", with low-credit and spend alerts and per-user CSV.
- **Refunds and spend order.**
  - Credits for errors come back "within a few minutes and the spend entry will disappear" ([refunds](https://help.runwayml.com/hc/en-us/articles/34266159290003-Can-I-have-credits-refunded)).
  - Bad results are not refunded. Cancelling a stuck job returns nothing ([stuck](https://help.runwayml.com/hc/en-us/articles/32881061675795-Why-is-my-generation-stuck)).
  - Spend order: plan credits, then rollover, then purchased.
- **Upgrading.** Prorated; upgrading Standard to Pro "will add 1625 credits". A nudge: "If you find yourself purchasing credits often, you might consider upgrading".
- **Touches.** Plan pages speak in outcomes: "112 images with Nano Banana Pro (2K) — 2,240 credits" ([Pro plan](https://help.runwayml.com/hc/en-us/articles/52070807060755-Pro-plan-details)). A cheap Draft can be upgraded with "Enhance Draft".

### 3.12 Krea

- **Numbers** ([pricing](https://www.krea.ai/pricing)):
  - Free 100 compute units a day; Basic 5,000 ($9); Pro 20,000 ($35); Max 60,000 ($105).
  - Business: 80,000 ($200), shared by up to 50 members.
  - Extra packs last 90 days.
- **Cost before.** Since 7 Sep 2026: "The image and video tools now show an estimated compute cost before you run a job. No more guessing what a generation will use." The model picker shows the cost per generation ([changelog](https://www.krea.ai/docs/changelog)).
- **At zero.**
  - The error "Insufficient Compute Units" comes with four fixes.
  - The Agent "stops before the next billable turn… Your draft is kept" ([agent credits](https://www.krea.ai/docs/user-guide/agent/plans-and-credits)); in the API, "In-flight jobs finish normally".
  - A slower, unlimited "relaxed" mode on Max and above.
- **Teams (16 Sep 2026).** A workspace default limit plus member limits, where "the tighter one wins". (The org docs say the member override wins; the two disagree.) A limit of 0 blocks the member. The Overview "surfaces members approaching their limits" ([organisation](https://www.krea.ai/docs/user-guide/help-and-support/organization-management)).
- **Touches.** Plan cards speak in outcomes: "5,000 units/month — 64 Nano Banana 2 generations, 20 Seedance 2.0 videos". The card and the pricing table give different figures.

### 3.13 Leonardo.ai

- **Numbers.** Essential 8,500 tokens ($12), Premium 25,000 ($30), Ultimate 60,000 ($60) (3P, [eesel](https://www.eesel.ai/blog/leonardo-ai-pricing)). Unused tokens roll into a "bank" holding up to 3 months. Top-ups "never expire" but need an active plan.
- **Balance.** The token count sits above your profile. Hovering shows "Fast tokens", "Rollover bank", "Top-Up tokens" (with **Add Tokens**) and "Unlimited generations"; free users also see the next reset ([tokens FAQ](https://intercom.help/leonardo-ai/en/articles/9044700-tokens-frequently-asked-questions)).
- **Cost before.** "You will see how many Tokens an action costs, generally on the button itself."
- **At zero.** Paid users with no rollover or top-ups get a free daily reset to 150 tokens. Premium and Ultimate switch to slower "Unlimited Generations", which "cannot be manually enabled".
- **Teams.** Tokens are allocated by seat, and Teams can't buy top-ups. A Token History can be filtered by member, model and action ([history](https://intercom.help/leonardo-ai/en/articles/16387764-token-history-faq)).
- **Refunds.** "You'll see a refunded token amount next to (or close to) the generation deduction."
- Rollover was added in Jul 2024 after complaints: "You asked, we listened" ([X](https://x.com/LeonardoAi_/status/1809166039911170295)).

### 3.14 ElevenLabs

- **Numbers.** Free 10k credits; Starter 30k ($6); Creator 121k ($22); Pro 600k ($99); Scale 1.8M ($299, 3 seats); Business 6M ($990, 10 seats) ([pricing](https://elevenlabs.io/pricing)).
- **Cost before.** Once the free regenerations are used, "the number of credits that will be used for the generation will be displayed" on the button. Flows show the cost when you hover over **Run** ([quota](https://elevenlabs.io/docs/help-center/account/general/do-i-use-quota-on-every-generation)).
- **At zero.** Prepaid pay-as-you-go pauses at $0: "This is by design… no overage charges" ([pay-as-you-go](https://elevenlabs.io/docs/overview/administration/pay-as-you-go)).
- **Teams.** A shared pool. Billing groups have their own quotas. A percentage alert goes to all admins ([notify](https://elevenlabs.io/docs/help-center/account/general/can-i-be-notified-when-im-running-low-on-credits)). Usage by user, with CSV.
- **Refunds and expiry.**
  - A step that fails in Flows isn't charged.
  - 2 free regenerations within 2 hours, with the remaining count on hover.
  - Studio re-runs mispronunciations "up to two times, at no extra cost".
  - Unused credits roll over for up to 2 months. Pay-as-you-go credits expire after 12 months.
- The pricing page shows approximate minutes of speech per plan.

### 3.15 Lovable

- **Numbers.** Priced by credits, not seats; Pro starts at 100 credits for $25. Top-ups cost $15 per 50 on Pro and last 12 months. 5 free build credits a day ([credits](https://docs.lovable.dev/introduction/credits-and-usage); [plans](https://docs.lovable.dev/introduction/subscription-plans)).
- **Balance.**
  - "The workspace menu shows a credit bar with your remaining credits. The bar empties as you use credits."
  - A Breakdown tab lists batches by expiry; a History tab covers 12 months.
  - Free chat shows "95% of free chat left (resets 2:00 AM)" ([chats](https://docs.lovable.dev/features/chats)).
- **Cost before and during.**
  - "Lovable does not show an upfront credit estimate before a Build mode request runs" ([agent mode](https://docs.lovable.dev/features/agent-mode)).
  - Instead, a live "Working for / Credits used" receipt shows while it works.
  - **Check-ins:** when a message passes 20 credits (the default), it pauses and shows the cost so far, with **Continue** or **Finish up**.
- **At zero.**
  - "Choose **Add credits** to resume the message where it left off, or **Finish up**… If you can't manage billing… the card shows **Ask an admin** instead, and once credits are available again the card offers **Resume**."
  - When running low, "A nudge appears above the chat input with your remaining credits and an option to add more".
- **Teams.**
  - One pool, unlimited members.
  - A "Default monthly member credit limit" plus a per-member "Set credit limit". Both reset "on the 1st of each month at 00:00 UTC".
  - Hosting and in-app AI never count against a member.
  - The CSV export shows each member's "Credit Limit Source". Members can send a "credits ping" to owners.
- **Refunds and spend order.**
  - No refunds, and reverting a change doesn't refund.
  - "Try to fix" is free: 10 free fixes, each available again 24 hours after use ([troubleshooting](https://docs.lovable.dev/tips-tricks/troubleshooting)).
  - "Lovable spends soonest-expiring general credits first to minimize what you lose."
- **Auto top-up.** Fields: amount, threshold, and a "Monthly spend limit" (default 400). Owners get an email if a top-up fails or the limit is reached.
- **Upgrading.** "Upgrading from 100 credits to 200 credits adds 100 credits, not 200."

### 3.16 Replit

- **Numbers.** Core $20 includes $20 of usage. Pro $100 has pooled credits that roll over for a month. Packs last 6 months. Pricing has been "effort-based" since Jun 2025 ([pricing](https://replit.com/pricing); [managing spend](https://docs.replit.com/billing/managing-spend)).
- **Balance.** A Usage page with a daily spend chart. The cost of each checkpoint shows "by hovering over the usage icon", and usage data "can take up to 30 minutes" to appear ([AI billing](https://docs.replit.com/billing/ai-billing)).
- **Cost before.** Only consent: "A paid escalation requires your confirmation before the paid request starts" ([Free Mode](https://docs.replit.com/help/free-agent-mode), Aug 2026; its allowance resets every five hours). Scheduled runs need a budget per run.
- **At zero.** Overage is billed by default. Opt-in limits block usage until the next cycle.
- **Teams.** Per-member limits (May 2026) and access requests (Sep 2026) are Enterprise-only.
- **Refunds.** "Agent and AI usage charges are non-refundable" ([billing and refunds](https://docs.replit.com/help/billing-and-refunds)). After a billing bug in Jul 2025, Replit refunded affected users and gave everyone $10 ([recap](https://replit.com/blog/effort-based-pricing-recap)).
- **Upgrading.** Proration is shown on the confirmation screen. An email arrives 7 days before a downgrade.

### 3.17 v0 by Vercel

- **Numbers** ([pricing](https://v0.app/pricing); [docs](https://v0.app/docs/pricing)):
  - Plus and Business include $30 of credits per user a month, plus "$2 of free daily credits on login".
  - Unused credits roll over for 65 days.
  - Bought credits last a year but need an active paid plan.
- **Balance** ([changelog](https://v0.app/changelog)).
  - In the user menu since Jan 2026.
  - A low-credits warning and opt-in auto-recharge since Mar 2026.
  - At zero the message reads "You are out of credits".
- **Cost before and after.**
  - Model rates show on hover in the picker.
  - The "Fix with v0 Free" badge appears only while free fixes remain ([forum](https://community.vercel.com/t/improving-credit-usage-transparency-for-the-fix-with-v0-free-button/32245)).
  - After each generation v0 shows "time worked, files modified, lines of code changed, and credits used".
- **At zero.** "Once you run out, we'll pause generation until you add more."
- **Teams.**
  - Personal monthly credits are used first, then a purchased shared pool.
  - No per-member caps.
  - Non-owners can request an upgrade, which notifies owners.
  - The CSV export has a Free Fix column; waived fixes appear struck through and tagged FREE ([usage](https://v0.app/docs/usage-dashboard)).
- **Upgrading.** After upgrading, "you return to the chat you upgraded from".

**Bolt, briefly.**
- Tokens are per member and not shared.
- The in-chat meter is off by default ([settings](https://support.bolt.new/settings/account-settings)).
- Tokens roll over for 2 months; the "Attempt fix" button costs tokens ([tokens](https://support.bolt.new/account-and-subscription/tokens)).

---

## 4. The 25 strongest patterns

Sources for each pattern are in section 3 unless linked here.

### Seeing the balance

1. **One balance chip in a fixed place, with a hover or tap breakdown.**
   - Leonardo's hover lists fast, rollover and top-up tokens and the next reset. Runway separates plan from purchased credits.
   - Lovable's credit bar empties as you spend. v0 keeps it in the user menu. Adobe's counter shows credits left against credits included.
   - *OpenMaison:* studio pool · top-ups · your cap.
2. **A reset date or time in every limit message.**
   - ChatGPT: "try again tomorrow after 9:17 AM". Copilot: "Resets {0} at {1}". OpenAI: "Resets in 28 days.".
   - Claude API: "You will regain access on 2026-09-01 at 00:00 UTC". Figma admins: "Days until credits reset".
   - Leaving it out is a named complaint:
     - Figma's beta limit had no reset time and no "Learn more" ([forum](https://forum.figma.com/report-a-problem-6/figma-design-ai-beta-credit-cap-57043));
     - Adobe users asked for "resets on [date]" ([request](https://community.adobe.com/feature-requests-713/add-clear-message-when-generative-fill-credits-are-exhausted-656559)).
3. **Keep the meter quiet until it matters.**
   - Cursor shows usage in chat only after 50%. Copilot warns from 75% ("Copilot will pause when the limit is reached."). Claude Code warns from 70%.
   - Canva notifies "as you approach… so you can plan ahead". Lovable places a nudge above the chat input.
4. **Translate credits into outcomes.**
   - Adobe: "Generate 5-second videos: Up to 20". Krea: "64 … generations". Runway: "112 images… 2,240 credits".
   - Miro: "Enough to generate approx. {{usageLimit}} screens". ElevenLabs: minutes of speech.
   - Cursor's apology translated its budget into "about 225 Sonnet 4 requests" ([blog](https://cursor.com/blog/june-2025-pricing)).
   - Nobody puts "≈ N left" in the live balance.
5. **A run-out forecast that lists what you can do.**
   - Cursor: "projected to reach your usage limits by 7/31/2025… Consider switching to Auto…, asking for smaller changes, or enabling pay-as-you-go…".
   - Notion's "Estimated" line; Miro's burn-rate chart; Claude Enterprise's forecast.

### Before an action

6. **The fixed price on the button, steady while you type.**
   - Leonardo and ElevenLabs show it on the button.
   - Krea: "Estimates stay stable while you type, and free promotional generations show as zero".
   - Runway shows it at start; Adobe on hover.
7. **Honest labels when the cost varies.**
   - Adobe Firefly Graph shows "Credits vary" next to Run, and the hover names the steps that vary.
   - Runway: "up to 48 credits", and it holds the maximum then refunds the rest.
   - Copilot: a Low / Medium / High tier.
8. **Explain once, then mark it everywhere.**
   - Adobe: a one-time notice on first use, then a sparkle icon and a premium crown.
   - Canva: tier names. v0: "Fix with v0 Free". Lovable: a "Chat for free" button.
9. **A cost dial with a sensible default, plus a cheap draft.**
   - Canva's quality picker defaults to Premium and says when it used another tier.
   - Midjourney Draft: 24 images for 0.4 GPU minutes. Runway: Draft, then "Enhance Draft".
   - Krea's model picker shows each model's cost.
10. **Ask before any paid overflow or escalation.**
    - Claude: "a confirmation that you'll continue with usage credits", and a typed confirmation above $1,000.
    - Replit: "A paid escalation requires your confirmation before the paid request starts".
    - Notion keeps premium models off so that "nothing spends credits until you decide to allow it".

### During and after

11. **A receipt for every action, live for long ones.**
    - Lovable's "Working for / Credits used", which is "what Lovable has already charged rather than an estimate".
    - v0's credits used per generation; Copilot's cost per turn plus a session total.
    - Figma's hover afterwards; Leonardo's Token History.
12. **Check-ins and caps for metered sessions.**
    - Lovable pauses at 20 credits with **Continue / Finish up**.
    - Copilot CLI's session cap: "that response completes".
    - Replit's budget per scheduled run.
13. **Refund failures automatically, and show it.**
    - Adobe refunds within minutes (up to 24 h for video). Runway: "the spend entry will disappear". Leonardo shows a refund row next to the deduction.
    - Midjourney: "GPU time will only be deducted when you see your results". Miro and Anthropic: errors aren't charged.
    - Cursor used to show "Errored, Not Charged".
14. **Fixing the AI's own mistakes is free.**
    - Figma: Auto fix and Fix for me. v0: "Fix with v0" (10 a day).
    - Lovable: "Try to fix" (10, each available again after 24 h). ElevenLabs: free regenerations and Auto-Regenerate.

### At the limit

15. **Pause, keep the work, then resume.**
    - Lovable: **Add credits / Finish up / Ask an admin → Resume**.
    - Krea: "Your draft is kept"; in the API, "In-flight jobs finish normally".
    - Notion: "we let it finish before stopping new usage". Codex finishes the active turn.
    - Runway refills mid-generation: "You will not need to retry the generation".
16. **Slow down or switch to something cheaper instead of stopping dead.**
    - Canva's short pauses; Midjourney Relax; Leonardo's slow Unlimited; Adobe's queued videos.
    - Notion falls back to the included models. Copilot in 2025 switched automatically and said so.
    - Cursor Teams move to Cursor's own models first.
17. **A zero-state message that says why, when access returns, and what to do.**
    - Copilot: "Copilot is paused because your limits are reached. Please contact your admin to increase your limits."
    - ChatGPT's messages give the exact time.
    - Krea's "Insufficient Compute Units" lists four fixes. Runway's disabled Generate button explains itself on hover.

### Team controls

18. **A shared pool with caps in layers: a studio default, a per-member override, and raises that expire.**
    - Lovable: a default plus "Set credit limit"; the CSV shows each cap's source; only a member's own work counts against them.
    - Figma: Full / Custom / No access; "Whichever one runs out first blocks".
    - Krea: 0 blocks a member; members near their limit are surfaced.
    - Claude Team: limits by seat type and by user, with "MTD Spend".
    - Copilot: budgets that expire "at the end of the current billing cycle". Notion: default plus overrides.
19. **One tap to ask the owner, one click to approve with an amount.**
    - Claude: "Request usage credits" → "Request sent to admin" → "Increase limit", plus a daily digest.
    - GitHub: **Approve and increase** restores access at once. Figma: requests by email and in the app.
    - Adobe Enterprise: a business reason, auto-approval rules, and 60-day expiry.
    - Also: Lovable's credits ping, v0's upgrade request, and ChatGPT Enterprise's temporary or permanent approvals.
20. **Threshold alerts to the people who pay, with colour steps.**
    - Claude: amber at 75%, red at 90%, emails at 50 / 75 / 95 / 100%.
    - OpenAI: "80% usage alert" with "Also send alerts to". Copilot: 75 / 90 / 100% by email and banner.
    - Notion: 80 / 100%. ElevenLabs: an admin-set percentage slider.
21. **An owner dashboard by person and by tool.**
    - Figma: "People at seat credit limit", "Days until credits reset", CSV.
    - Miro: by feature and by user, a burn-rate chart, and a privacy switch.
    - Notion: a "Mine" tab and a projection.
    - Claude Enterprise: "Blocked right now", "Near their limit", "Member-days lost this month".

### Money and policy

22. **A spend order that protects the customer, stated plainly.**
    - Canva: "AI tools will always use the allowance that expires soonest".
    - Lovable: "spends soonest-expiring general credits first to minimize what you lose", with a breakdown by expiry.
    - Runway: plan, then rollover, then purchased. Notion: free, then monthly, then annual. Figma: seat, then shared pool, then pay-as-you-go.
23. **Automatic top-up only if the owner opts in, with a monthly ceiling and a receipt each time.**
    - Lovable: a "Monthly spend limit" and an email if a top-up fails or hits the limit.
    - Runway: "Maximum spend per month" and an email on every refill.
    - Claude: "Reload when balance reaches or goes below: $5".
    - Notion: off by default, with a recommended cap.
24. **Low-cost generosity.** Leonardo's rollover bank ("You asked, we listened"); ElevenLabs' rollover; Runway's credits that never expire; Claude's "Reset for free"; Midjourney's earned hours; Adobe's free daily generations and free trial uses of premium features.

### Upgrading

25. **Upgrade in place, charge only the difference, and return the user to their work.**
    - GitHub: "The upgrade cost is only the price difference", and earlier usage is "counted within the new plan's larger allowance".
    - Lovable: "adds 100 credits, not 200". Runway: "will add 1625 credits". Replit shows proration on the confirmation screen.
    - v0 returns you to the chat. A locked Krea model opens the upgrade dialog. Canva prompts at the limit.
    - Nudges based on usage:
      - Lovable: "If you consistently need more credits each month, upgrading your plan is usually better value".
      - Runway: "If you find yourself purchasing credits often…".

---

## 5. Anti-patterns: what the backlash was about

1. **Changing the deal mid-subscription, and calling it unchanged.**
   - **Cursor, 16 Jun 2025.** 500 requests became "$20 … at API pricing", and users ran out "after just a few prompts" ([TechCrunch](https://techcrunch.com/2025/07/07/cursor-apologizes-for-unclear-pricing-changes-that-upset-users/)). On 4 Jul Cursor said it was "not communicated clearly, and we take full responsibility", offered refunds, and translated the budget into requests ([blog](https://cursor.com/blog/june-2025-pricing)).
   - **GitHub, Apr 2026 switch to token billing.** 958 thumbs-down to 24 thumbs-up. "Plan prices aren't changing" was answered with "It's a 6-9x price increase" ([discussion](https://github.com/orgs/community/discussions/192948)).
   - **Adobe, 17 Jun 2025.** New single-app subscribers got 25 credits instead of 500 ([FAQ](https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html); [Fstoppers](https://fstoppers.com/artificial-intelligence/ai-photo-editing-credits-industrys-dirtiest-money-grab-900407)).
   - **v0, May 2025.** "We will not be reverting this change" ([forum](https://community.vercel.com/t/updated-v0-pricing/10612/159)).
   - **Runway** retired its Unlimited plan, then extended it to 30 Nov 2026 ([help](https://help.runwayml.com/hc/en-us/articles/52068047744019-Unlimited-plan-is-switching-to-Max)).
2. **Tightening limits quietly, or tracking usage without enforcing and then enforcing.**
   - **Anthropic, Jul 2025,** tightened Claude Code limits without notice. One user: "Just be transparent" ([TechCrunch](https://techcrunch.com/2025/07/17/anthropic-tightens-usage-limits-for-claude-code-without-telling-users/)).
   - **Figma** let usage run past zero before 18 Mar 2026 ("Full seat limits weren't enforced yet"). The dashboard later showed 6,266 credits used of 3,000 ([forum](https://forum.figma.com/report-a-problem-6/figma-make-ai-credits-tracked-beyond-zero-balance-with-no-enforcement-resulting-in-2x-overage-after-renewal-52425)).
   - **Adobe** said in 2024 that running out would only make things slower; in 2025 it became a hard stop. One user called it a "huge disruption" without "proper communication beforehand" ([PetaPixel](https://petapixel.com/2025/06/24/adobe-is-now-tracking-generative-credit-use-what-you-need-to-know/)).
   - **OpenAI's** hard API caps quietly became alerts in 2025, then came back in Jul 2026 ([community](https://community.openai.com/t/monthly-budget-limit-silently-removed/1193635)).
   - *The counter-example:* GitHub showed usage in the IDE before it started billing.
3. **Costs revealed only afterwards.**
   - **Figma Make:** a monthly bill went from $20 to $286, and the user asked for an "AI Credit Fuel Gauge" and an "AI Credit Price List" ([forum](https://forum.figma.com/report-a-problem-6/working-on-a-single-make-project-for-two-months-within-my-base-ai-credits-now-this-month-i-paid-200-54013)). Another user lost 1,000 credits on one prompt ([forum](https://forum.figma.com/report-a-problem-6/why-is-figma-make-ai-consuming-ai-credits-so-quickly-request-for-explanation-and-credit-usage-transparency-55366)).
   - **Replit:** "$1,000 in a single week" ([The Register](https://www.theregister.com/2025/09/18/replit_agent3_pricing/)).
   - **Lovable:** "I am blind" ([dev.to](https://dev.to/momen_hq/the-hidden-costs-of-vibe-coding-a-practical-look-at-lovables-credit-usage-3cec)).
   - **Copilot:** "822 credits gone" on one request.
   - **Notion:** users hesitate over whether a task "is worth spending token on" ([Substack](https://solopreneurcode.substack.com/p/notion-ai-usage-limit)).
4. **Charging for the AI's own mistakes, and for failures, cancellations and undo.**
   - **Figma Make:** "70% of my prompts are fixing…", and "The first time I run out of credits and have to explain I can't meet a deadline will be the last time I'm allowed to use Figma Make" ([forum](https://forum.figma.com/share-your-feedback-26/figma-make-ai-credit-limits-not-feasible-51713)).
   - **Replit:** about 75% of $1,500 went on "fixing problems caused by Replit" ([forum](https://replit.discourse.group/t/agent-creates-a-costly-problem-for-every-solution/5293)).
   - **Copilot:** wrong answers "should be FREE" ([discussion](https://github.com/orgs/community/discussions/163114)).
   - **Runway:** "charged me credits to fix those mistakes" ([Trustpilot](https://www.trustpilot.com/review/runwayml.com)). Cancelling a stuck job isn't refunded either.
   - **Cursor** started charging aborted runs (Oct 2025).
   - **Undo** isn't refunded at Figma, Miro or Lovable.
   - Fstoppers: "you're paying per attempt, not per finished image".
5. **Silent or vague limits.**
   - **Adobe:** when credits run out, the "Generating…" window just closes ([request, Nov 2025](https://community.adobe.com/feature-requests-713/add-clear-message-when-generative-fill-credits-are-exhausted-656559)).
   - **Figma's beta limit:** "There isn't an in-product way to track your remaining beta usage today" ([forum](https://forum.figma.com/report-a-problem-6/figma-design-ai-beta-credit-cap-57043)).
   - **Miro:** members see no balance until a dialog at zero.
   - **Canva:** percentages and "10x more AI". One user: "What I need is actual numbers not 'Whatever'" ([comment](https://thecreativekatstudio.com/blogs/canva/canvas-ai-limits-updated-heres-what-you-actually-need-to-know)).
   - **Unpublished numbers:** Notion's allowance size and Miro's top-up prices.
   - **Hidden by default:** Adobe's cost preview only shows with tooltips on; Bolt's meter is off by default.
6. **Spending switches that default to on, and "budgets" that don't stop spending.**
   - OpenAI turns auto-reload on at setup.
   - Copilot's overage for organisations is on, and "Stop usage when budget limit is reached" is off, by default.
   - Cursor Teams' on-demand usage is on by default. Replit bills past the included credits unless you set a limit.
   - Notion's Auto Adjust permanently raises the plan.
   - v0 users asked for refunds after unexpected auto-recharges ([forum](https://community.vercel.com/t/how-to-request-a-refund-for-unexpected-v0-auto-recharge-credit-charges/36235)).
7. **"Unlimited" that isn't.**
   - Cursor's "unlimited" applied only to Auto, and ended in Sep 2025. Runway retired Unlimited. Leonardo's Unlimited can't be switched on by the user.
   - Claude's weekly limits drew "If I do hit the limit, that's it for the entire week" and "'Woops! Times up!'… worse than credit quotas — at least then I can make a conscious decision to spend more" ([HN](https://news.ycombinator.com/item?id=44713757)).
8. **Separate allowances per seat, and use-it-or-lose-it.**
   - Figma's credits "can't be shared or transferred". Canva's "aren't shared or pooled". Adobe, Cursor Teams and Bolt don't pool either.
   - No rollover draws "Use them or lose them" ([Matt Kloskowski](https://mattk.com/are-generative-credits-getting-out-of-control/)) and "like the cell phone plans they used to have, with limited minutes without roll over" (Copilot).
9. **Bought credits that expire or become unusable.**
   - Expiry: Canva top-ups 30 days; Midjourney 60 days (and a plan is required); Krea 90 days; Replit 6 months.
   - v0's bought credits need a paid plan, which a user said was "blocking client work" ([forum](https://community.vercel.com/t/cannot-use-purchased-credits-after-plan-expired-blocking-client-work/39702)).
   - Bolt: tokens are lost when you cancel. ElevenLabs: users say their "credits [were] stolen" ([Trustpilot](https://www.trustpilot.com/review/elevenlabs.io)).
10. **Units people can't budget in, and rules that contradict each other.**
    - Cursor replaced dollars with tokens; users said people "budget in dollars, not tokens".
    - ElevenLabs used "character" without defining it (now renamed credits). Krea's units cost less on higher tiers.
    - Krea and Leonardo contradict themselves on which cap wins and which credits are spent first. Miro gives two different free-plan numbers (10 and 25).
11. **Team controls missing, or Enterprise-only.**
    - Cursor removed per-member Team limits. Runway's and Replit's caps are Enterprise-only.
    - Midjourney has none. Leonardo Teams can't top up.
    - Canva members can't ask for more inside the product.
12. **Only large packs.** Adobe users complained they couldn't buy small add-on packs ([community](https://community.adobe.com/t5/photoshop-ecosystem-discussions/p-you-don-t-have-enough-credits/m-p/15401022)). Canva's next step up is AI Pass at US$100 a person.

---

## 6. What this suggests for OpenMaison

These are research inputs for Vicky to decide on; nothing has been built.

1. **Put the fixed price on every AI button:** "Render · 10", "Pro render · 20", "Digitize · 5", and "Free" where it is free. This closes the gap most of the market has. Keep one price table and derive every display from it; Krea and Miro show what happens when numbers drift.
2. **One balance chip in one place** (for example the Maison AI sheet or the rail). Tapping it opens:
   - Studio pool · resets 1 Oct
   - Top-ups · never expire
   - Your cap · 40 of 100
   - ≈ 24 renders left

   Nobody shows "≈ N left" live. OpenMaison can, because its prices are fixed.
3. **Spend the monthly pool first, then top-ups,** and say so in the breakdown and the top-up sheet. Keep top-ups usable on Free and after a downgrade; v0, Bolt and ElevenLabs drew complaints for not doing this.
4. **Refund failures automatically, and show the refund where the charge was:** "Render didn't finish — 10 credits returned", plus a line in the history. Write the rules for cancel, timeout and "bad result" once, up front; Runway and Cursor show the cost of leaving them vague.
5. **Drift repair (2 credits):** the market's answer to "paying for the AI's mistakes" is free fixes, sometimes with a daily limit (Figma, v0, Lovable, ElevenLabs). Worth deciding whether it should be free, or at least refunded when it fails.
6. **Co-Pilot (25 credits per 10 minutes):**
   - show "25 credits · 10 min" before starting, then a live meter;
   - at the end of each block, check in: "Keep going? 25 credits for 10 more minutes · Wrap up" (Lovable);
   - if the pool or cap runs out mid-block, let the current answer finish and keep the thread (Notion, Codex, Copilot CLI, Krea);
   - end with a receipt: "Co-Pilot · 23 min · 75 credits".
7. **Member caps:** a studio default, overrides per member, and "+50 for this month only" (Lovable, Notion, Copilot, Claude). Members see their own cap, and only their own actions count against it (Lovable).
8. **At a cap or at zero:** one "Ask Dane for more" button. It puts an item in the owner's notification bell with "Approve +50 this month", "Raise cap" and "Top up" (GitHub, Claude, Figma). The member's message says why they're blocked, when it resets, and what they can still do.
9. **Offer something cheaper instead of stopping dead:** "Render (10) instead of Pro render (20)". Viewing, editing and sharing past results never cost credits (Notion, Copilot 2025, Canva).
10. **Alerts:** the owner at 75 / 90 / 100% of the pool (amber, then red, as Claude and Copilot do), and each member near their own cap. Add a forecast such as "At this pace the studio runs out around 24 Oct", with what to do about it (Cursor, Notion).
11. **Owner view:** usage by member and by tool, "At their cap", "Days until reset", and CSV export (Figma, Miro, Claude). Show S$ next to credits for the owner; Cursor was criticised for removing dollar amounts, and OpenAI and Claude set budgets in money.
12. **No automatic top-up by default.** If offered, make it opt-in, with a monthly ceiling and a receipt each time (Lovable, Runway, Claude). Avoid OpenAI's default-on setting and Notion's permanent plan raise.
13. **From the low or zero state, one sheet with three options:**
    - wait (resets 1 Oct);
    - top up (S$2 per 100, ≈ 10 renders);
    - upgrade, which charges only the difference, adds the extra credits, and returns you to your action (GitHub, Lovable, Runway, v0).
14. **When anything changes,** never change the unit or tighten limits quietly. Announce it, show usage before enforcing (GitHub 2025), preview the new bill (GitHub 2026), and translate the change into renders (as Cursor's apology did).

---

## 7. Gaps

- **Not documented:** Figma's and Canva's warning copy near the limit, and the thresholds that trigger it. Also how Canva, Notion, Copilot and Krea (in the app) handle failed generations.
- **Prices not verified:** Leonardo's official prices (its pricing page blocked fetches; the figures here are third-party), Krea's pack prices and Miro's top-up prices.
- **Reddit** could not be read directly.
- **Fuller detail** for two of the product groups is in the saved research reports:
  - Miro, Notion and Copilot: `/Users/vicky/.claude/projects/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/tool-results/toolu_01UcNxaT6ZQ1SfrPMGriNtE1.txt`
  - Midjourney, Runway, Krea, Leonardo and ElevenLabs: `/Users/vicky/.claude/projects/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/tool-results/toolu_01Wre9tjbG8awauEZn3k56pu.txt`