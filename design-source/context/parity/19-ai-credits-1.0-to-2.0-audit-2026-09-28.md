# AI credits & plans — 1.0 → 2.0 audit and design proposal (2026-09-28)

**Written for:** the owner, to decide before anything is built. It is also the map the 1.0 developers will use once the calls are made.

**The brief** (owner, 2026-09-28): "There is a new feature developed in 1.0 which we need to add in 2.0. It's about the AI credit usage widget. Currently, in 2.0 we have an upgrade button in the side navbar; post upgrade it will change to the AI credits left shown in that place (1st screenshot) and while hovered (2nd screenshot). The 3rd screenshot is when they click on upgrade and after the upgrade button … On click of Upgrade we need this (https://openmaison-plg.vercel.app/pricing) content within our platform without redirecting to a new window, since the user is logged in and we want the user to stay within the platform. I want you to go in depth, analyse and identify all the touchpoints across the prototype, features and functionalities of this feature, and design an intuitive, zero-cognitive and super interesting UI and UX with our 2.0 context and design principles. Ask all the questions to clarify and give me a detailed report before developing this feature." Then: "check for all the enhancements for this feature on how it can be the best and intuitive way for the studio users and suggest better improvements."

**Nothing here is built.** The questions in §8 wait for the owner's marks. A blank mark means the recommendation stands, as in the earlier audits. The visual proposal is the claude.ai page **"AI Credits & Plans"** (https://claude.ai/artifact/HeHRhV1Ub13RqFPqAvbDQt). It draws every surface on 2.0's tokens, and the whole upgrade journey can be played through.

---

## 0.1 Sources

- **1.0** = `qanvast-id-tool`, branch **`origin/feat/om-ui-port` @ `3174b912f` (2026-09-27)**. That branch merged the credits work (`worktree-phase2-credits-entitlements`), and it also ports the 2.0 rail into 1.0 behind `NEXT_PUBLIC_OM_UI=1`. Everything was read with `git show`; nothing was checked out. Four readers wrote the inventories beside this file in `ai-credits-1.0-inventory/`:
  - **A** — the rules, the money and the payments.
  - **B** — every credit and billing screen, word for word.
  - **C** — the pricing page, live on 2026-09-28, plus its source.
  - **D** — 2.0 today.
  - Two research readers, **E** (how other products do credits) and **F** (interior-design render tools; in-app checkout in Singapore), feed §6.
- **The owner's eight screenshots** are in `ai-credits-1.0-inventory/owner-screens/`. Several of their parts exist in **no 1.0 branch we can read** (B, `git log --all -S`):
  - the popover's buy slider;
  - the popover's *S$ 2.00 per 100 credits · plus any applicable tax* line;
  - the popover's *Buy 1,000 credits* button;
  - the Usage page's *Upgrade* and *Manage billing* buttons;
  - the Usage page's buy slider.

  The screenshots are therefore ahead of the code: a newer unpushed build, or a design. This audit treats them as the target and the code as the rules.
- **1.0's own mockups** `design/{Main,Generate,Blocked,Usage,LockedFeature,AdminPlans}.dc.html` (2026-09-03) are rendered in `ai-credits-1.0-inventory/1.0-mockups/`. Most of what they promise was never built (B §4, §6).
- **The live pricing page** was captured in `ai-credits-1.0-inventory/pricing-page/`. It is newer than the branch: it adds a 14-day Pro trial and one extra FAQ (C §2a).
- **2.0** = `openmaison-prototype` on `main` @ `a530686`.
- **Figma** `JCGkMBFLjeOyXYiEkOxFMO` has no plans, credits, pricing or billing frame (all 18,334 node names on the proto page were searched). The only mocked piece is the Upgrade row itself (rail bottom slot `I779:26353;6759:2760`, "red diamond icon, tinted row"). Everything proposed below is therefore invented UI and invented copy, built on the house pieces (REG-614's rule), to be logged `user-directed` once marked.

## 0.2 Scope

- **In scope:**
  - the unit and the price list;
  - the rail's Upgrade slot and the credits it becomes;
  - the credits card;
  - the plans (the pricing page's content) inside the app, with checkout and its success;
  - the cost on every metered action;
  - the moments: out of credits, a member's monthly amount reached, a feature on another plan, a refund, running low, a payment that fails;
  - the usage and billing page;
  - who may do what;
  - the notifications;
  - phone, tablet and the rail-less editors;
  - the demo data.
- **Later (their own round or module):**
  - plan feature locks (Q-40);
  - Meeting Co-Pilot metering, since 2.0's Meeting Copilot tile is still coming soon;
  - Projects' metered reads (1.0's Gantt quote parse).
- **Platform** (the prototype keeps a stand-in):
  - the payment provider: Dodo's overlay, webhook, customer portal and tax invoices;
  - the monthly refresh and lapse jobs;
  - idempotency and provider costs;
  - 1.0's shadow / enforcement switch;
  - rate limits.
- **Excluded:**
  - the platform's own admin console (1.0 `/admin/plans`, Qanvast's tool rather than a studio's);
  - the anonymous visitor tools and sign-up gates (the AI Visualizer audit's Q-27 rule);
  - the marketing site's chrome.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | 1.0 says one thing and does another, or two 1.0 surfaces disagree; a call decides (§2). |
| **Broken** | 1.0 ships it, but it fails a user (B §7); 2.0 does not copy the fault. |
| **Target** | only in the owner's screenshots, not in any 1.0 branch. |
| **Later** · **Platform** · **Excluded** | as §0.2. |
| **2.0 only** | no 1.0 counterpart; new in 2.0 (the enhancements of §6). |

## 0.4 What 2.0 has today (from D)

| # | 2.0 today | Where |
|---|---|---|
| F-01 | **Upgrade** is the first item of the rail's bottom block. It uses a coral → raspberry tint, and a gem that turns once every 8 s. A press answers "Coming soon in OpenMaison 2.0". | `components/shell/app-rail.tsx:181`, CSS `:133-152` (REG-164 · REG-206) |
| F-02 | Upgrade has **no phone home**; the More sheet holds Tasks · Marketplace · Company · Qanvast Ops │ Settings │ View as. | REG-300; `components/shell/mobile-nav.tsx:30-36` |
| F-03 | Tablet keeps the rail collapsed (52), with 44px touch targets. | REG-330 · REG-273 |
| F-04 | **The AI Visualizer editor and the quote, contract and template editors have no rail** (the `(editor)` group). Generate lives there, so a balance on the rail alone is invisible where most credits are spent. | `app/(editor)/layout.tsx` |
| F-05 | **"Credits" already means Qanvast lead credits.** It appears in Qanvast Ops' *CREDITS* column and inert *Credits* tab, in the Return wizard's "return of credits", and on the Returned card's *Refund Credited*. | `components/qanvast/qanvast-leads.tsx:42-46`, `return-lead-wizard.tsx:46` |
| F-06 | 2.0 never calls a model. Every AI action is local, curated, scripted or coming soon (D §1): the list of metered moments below is where credits *would* be spent. | D |
| F-07 | No plans, credits, billing or usage tables. `members.role` = Owner · Admin · Manager · Designer. `runsStudio` = Owner or Admin. The Owner-only precedent covers making, unmaking or deactivating an Owner. | `lib/db/schema.ts`, `lib/leads/assign-policy.ts:11`, `lib/company/member-rules.ts` |
| F-08 | *Who may do what* has no row for AI tools; everyone may Generate, compare, upload a quote or write with AI. | `lib/settings/permissions.ts` |
| F-09 | A Designer-submits / Owner-approves pattern already exists: template approval, price book proposals and quote approval. It is the precedent for "ask for more credits". | REG-501 · REG-651 · REG-624 |
| F-10 | Settings › Notifications draws its rows from `EVENTS` (18 events), so new credit events appear there without new UI. `notify()` never tells the actor. | `lib/notifications/model.ts:13-39` |
| F-11 | A count on a rail glyph is the 16px red pill (`railBadges`). | `app-rail.module.css:209-220` |
| F-12 | **Demo data:** 7 active members. The baseline holds 6 renders (Dane 3 Fast + 1 High, Michelle 2 Fast) and 3 X-Ray readings (Dane). Activity already logs "{who} rendered V{n} of {room}" and "{who} compared …". | `fixtures/baseline.json`, repair R61 |
| F-13 | View as switches the signed-in member and carries a "Demo only" pill; Maison AI › *Reset prototype to base* restores the baseline. | REG-667 · `components/shell/view-as-popover.tsx` |
| F-14 | Company panel: the Studio group (Profile · Members · Questionnaire · Templates · Price book · Materials) and the Operations group (Finance *soon* · Reports *soon* · Integrations). Settings modules: Studio · Lead management · Quotes & pricing · Notifications. | `lib/company/sections.ts`, `lib/settings/modules.ts` |

---

## 1. Definitions — the same thing under different names

| # | Concept | 1.0 | 2.0 | Verdict · call |
|---|---|---|---|---|
| DEF-01 | **The unit** | The website says **tokens**; the app says **credits** (A §1.1, C §2). The spec left the name open. | "Credits" is taken by Qanvast lead credits (F-05). | **Mismatch** — **Q-01**: **AI credits**. |
| DEF-02 | **Plan credits · top-up credits** | Two buckets. Plan credits refresh each period and never roll over; they are spent first. Top-ups never expire (A §1.4). | — | **Missing**. Kept as 1.0 means them (see MM-02). |
| DEF-03 | **The studio's pool** | Every member draws from one pool. On Pro Studio the pool is the per-seat allowance × seats (4,500 for 3). | — | **Missing**. Kept. |
| DEF-04 | **Seat · member** | Free: unlimited members, the pool doesn't grow. Freelance: one member. Studio: 3 seats minimum, S$35 each after. Seats are fixed at purchase, with no self-serve change (A §4.6). | 7 active members. | **Missing** — **Q-13**. |
| DEF-05 | **Monthly cap** | The owner's ceiling on one member's spend inside the pool (A §3.4). | — | **Missing** — word: *monthly amount* (Q-25). |
| DEF-06 | **Period / refresh** | A billing period anchored at sign-up. The Free refresh cron runs on the 1st; paid plans refresh on the payment anniversary. The two can disagree (A §3.9). | — | **Mismatch** — one date: the plan's renewal date (Q-43). |
| DEF-07 | **Co-Pilot · mAIson Bot** | *Meeting Co-Pilot* is the live-meeting assistant: 25 per 10 minutes, and Free gets one 30-minute meeting (C §1.5). *mAIson Bot* is the chat, and it is free; its renders cost 10. | Maison AI is the FAB and sheet. *Meeting Copilot* is a Tools tile, coming soon. | **Later** for Co-Pilot (Q-45). Maison AI chat stays free (Q-30). |
| DEF-08 | **Digitize quote** | 5 credits per read (`quote_digitize`). | *Upload a quote* in the Create Quote modal (it reads at pick), and X-Ray's reading of a file. | Map: Upload a quote = Digitize quote (Q-29). |
| DEF-09 | **Render tiers** | Draft 5 · Render 10 · Photorealistic 15 · Pro render 20. Charged per variant, in one charge (A §2.1). | Quality *Fast / High* × Versions 1–3 (`render_jobs.model`). | Map: Fast = Render, High = Pro render (Q-29). |
| DEF-10 | **Defurnish room** | 10 credits. | *Empty the room*. | Same thing (Q-29). |
| DEF-11 | **Drift repair** | 2 credits (a fix-up pass on a render that drifted). | No counterpart (the curated engine mends locally). | **Platform**. |
| DEF-12 | **Upgrade** | A rail link to `/upgrade`, a checkout hand-off. With no plan it sends the owner to the marketing site, and it loops back to the dashboard. Non-owners bounce (B §2). | *Upgrade* is coming soon. | **Broken** in 1.0 — Q-10: Plans open inside the app. |
| DEF-13 | **Manage billing** | Only in the screenshots; no portal or invoice UI in code (A §4.7). | — | **Target** — Q-19 · the Plan & billing tab. |
| DEF-14 | **Usage & credits** | Settings › Usage & credits (the ledger). A separate *Studio Health* page is product analytics (B §3). | — | **Missing** — Q-22: Company › **Plan & AI credits**. |
| DEF-15 | **Shadow mode** | Existing studios are metered but never blocked, and their pill shows 0 (A §3.6). | — | **Platform**. |

## 2. Mismatches and faults — what 2.0 must not copy

The developers' list; each line points to its reader.

| # | Topic | 1.0 says | 1.0 does | Call |
|---|---|---|---|---|
| MM-01 | The unit | "tokens" on the website | "credits" in the app | Q-01 |
| MM-02 | Paid monthly credits | "Plan credits do not roll over" | The webhook files them as **top-ups**: they never expire and pile up (A §1.4) | Q-43 |
| MM-03 | Annual plans | 1,500 a month per seat | Credits are granted once per yearly renewal, so a year gets **one month** of credits (A §4.6) | Q-43 |
| MM-04 | Pro Studio price | "S$100 /month for 3 seats" | Checkout sends quantity 3 of a S$100 product, so the charge may be **S$300** (A §4.6, B §5) | developers |
| MM-05 | Free's welcome credits | "150 tokens to start, then 30 a month" | Stored as plan credits, so the 1st of the month **overwrites them with 30**. The page reads "150 **of 30** · Used · **−120**" (B §7.2) | Q-43 |
| MM-06 | Co-Pilot | "Ten minutes of Meeting Co-Pilot is 25" · "1 meeting" free | The meter has no caller; Co-Pilot is free for everyone (A §2.4) | Q-45 |
| MM-07 | Plan features | Free lacks Quote X-Ray, the template editor, approvals, WhatsApp notifications and custom stages. The blocked dialog says "{Feature} is included in Pro" | **No gate is enforced anywhere.** The dialog is unreachable, and it names Pro even for Max-only features (A §3.5, B §4) | Q-40 |
| MM-08 | Upgrade | "Can I change plans later? Anytime, in either direction" | Upgrade loops to the dashboard. *Change plan* is always disabled. There is no downgrade or cancel, although the Terms §10 promise cancelling "through your account settings" (B §2, C §1.9) | Q-10 · Q-19 |
| MM-09 | "Upgrade plan" in the blocked dialog | Upgrade | Always starts **Pro Freelance, monthly, 1 seat**, even for a studio already on Pro Studio (B §4) | Q-33 |
| MM-10 | Request more | [Request more] | Does nothing (A §3.4, B §4) | Q-34 |
| MM-11 | "Every button shows its cost before you press it" | Everywhere | Only the Visualizer's desktop button shows it. Quote parse, Photo Render, Co-Pilot, mAIson and the phone Generate bar show nothing (B §6) | Q-29 · Q-32 |
| MM-12 | Refunds | "Credit refunded" in the ledger | Nothing in the tool says so at the failure (A §2.3) | Q-31 |
| MM-13 | The Cost column | — | Shows **OpenMaison's own provider cost in US$** ("$4.71") to studio owners. The "$" reads as S$, and it contradicts the price list's wish not to publish costs (B §3 D, §7.7) | Q-26 |
| MM-14 | The pill after a spend | The balance | Not refreshed after a spend (30 s stale), so the dialog can say "you have N left" while refusing (B §1) | Q-31 |
| MM-15 | A designer's pill | "credits available" | Shows their **spend** ("1.2k" with no "used" on the collapsed tile). It never turns amber, has no zero state, and the low threshold is a fixed 20 whatever the pool (B §1) | Q-06 · Q-08 |
| MM-16 | The popover | Hover | Hover only, with the pill itself a link: **unreachable on touch** (B §1) | Q-07 |
| MM-17 | By member | "Set a monthly ceiling…" | Prints `can&apos;t` / `studio&apos;s`. It lists only members who spent or have a cap, so a new member's cap can't be set. The cap saves silently on blur and floors decimals (B §3) | Q-25 |
| MM-18 | Checkout feedback | "Waiting for payment confirmation…" | Shows "Payment is processing" for an abandoned checkout, and raw codes ("forbidden", "contact_sales") reach the screen. No return URL; no amount before paying (B §5) | Q-14 |
| MM-19 | Lapse | 14-day grace, then Free | The sweep leaves the subscription past-due, so Free's 30 a month never arrives and a resubscribe may be refused. There are no dunning messages (A §3.8) | Q-37 |
| MM-20 | The pricing page's own copy | — | "No card to start" sits beside "card required". The annual price is "/year" while the seat line is "/month". The badge vanishes on Studio. The table shows Free's 150, not the 30. It lists 4 markets, the footer 5. "Visualiser" vs "Visualizer". The title repeats the brand (C §5) | website team |
| MM-21 | The ported rail (1.0 behind the flag) | One slot | Shows the pill **and** Upgrade to every studio, visitors included (B §2) | Q-04 |

## 3. Feature matrix

Columns: the 1.0 feature (reader rows) · status · what 2.0 builds (the recommendation) · round (§9).

### 3.1 The unit, the plans and the price list

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| CR-01 | Plans Free · Pro Freelance · Pro Studio · Max with prices, allowances, seats, annual = 11 × monthly, 14-day Pro trial (A §1.2, C §4) | Missing | The same four plans and numbers, as reference rows in `plans` (§7). | R1 |
| CR-02 | Two buckets, plan first, top-ups never expire, refunds into top-up (A §1.4) | Missing | The same rules in a pure `lib/credits/` (balance, spend, refund, refresh), with MM-02 · 03 · 05 corrected (Q-43). | R1 |
| CR-03 | The price list `CREDIT_SCHEDULE` (A §2.1) | Missing | The same numbers; 2.0's actions mapped onto them (Q-28 · Q-29). | R1 |
| CR-04 | Variants in one charge (A §2.1) | Missing | Kept: *Versions × quality* is one charge, shown as one number. | R3 |
| CR-05 | Charge first, refund on every failure (A §2.3) | Missing | Kept, plus: Cancel before "Keeping the version" refunds, and the tool says so (Q-31). | R3 |
| CR-06 | Top-up 1,000 for S$20 (A §1.5); slider (Target) | Missing · Target | Chips of 1,000-credit packs, 1 · 2 · 5 (Q-21). | R2 |
| CR-07 | Tax: Dodo is merchant of record; no tax copy (A §1.6); "plus any applicable tax" (Target) | Mismatch | One line under every price (Q-15). | R2 |

### 3.2 The rail slot and the credits card

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| RL-01 | Upgrade on the ported rail for everyone (B §2) | Broken | **One slot, two states**: Upgrade while on Free; the credits row once on a paid plan (Q-04). | R1 |
| RL-02 | The pill: lavender, amber below 20, no zero state; designers see spend (B §1) | Missing · Broken | The credits row: the 2.0 token glyph whose rim is a level ring, the number and "AI credits". Healthy · low · empty · capped states (Q-06 · Q-08). | R1 |
| RL-03 | Collapsed tile: 12px icon over a 9px "1.2k" (B §1) | Broken | The ring alone, with the number in the tooltip (Q-06). | R1 |
| RL-04 | Hover popover, the pill a link (B §1) | Broken | Press opens the **credits card** beside the rail, like Tools, Company and View as (Q-07). | R1 |
| RL-05 | Popover lines (B §1); the screenshots' buy block (Target) | Missing | The card: the number · plain terms · a two-part bar · the refresh date · a forecast when short · a quick top-up · *See usage* · *Change plan*. A designer sees *what you can use* and *Ask Dane* (Q-20). | R1 |
| RL-06 | — | 2.0 only | The balance inside the AI Visualizer's top bar (rail-less), opening the same card (Q-09). | R3 |

### 3.3 Plans inside the app, checkout, success

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| PL-01 | `/pricing` (marketing) · `/upgrade` (checkout hand-off) (C §2b) | Broken | **Plans** as an xxl modal over the page (Q-10), with a tab of the same content in Company (Q-22). | R2 |
| PL-02 | Cards, toggles, allowance table, comparison, FAQ (C §1) | Missing | The owner-relevant parts only (Q-11). | R2 |
| PL-03 | No current plan, no seat stepper, no recommendation (B §2) | Missing | *Your plan*; the suggested plan for the team; seats one per active member; why Freelance won't do (Q-12 · Q-13). | R2 |
| PL-04 | Overlay checkout for top-ups; redirect for plans; no return (A §4.3) | Mismatch | Dodo's overlay inside the Plans modal for everything (Q-14). The prototype shows a labelled demo step with no card fields. | R2 |
| PL-05 | Status line copy (A §4.4) | Missing | The same four states, in the modal's footer, with the fixes of MM-18. | R2 |
| PL-06 | — | 2.0 only | **Success**: "You're on Pro"; the credits count in, and on close the rail's gem turns once more and becomes the credits row (§5.4). | R2 |
| PL-07 | Trial on the live page (C §2a) | Missing | Offered in Plans, with the date it turns paid (Q-16). | R2 |
| PL-08 | Max: Talk to us → /contact (C §1.3) | Missing | A short request inside the app (Q-18). | R2 |
| PL-09 | Change plan disabled; no cancel (B §3) | Broken | *Change plan* · *Cancel plan* in Plan & billing, both effective at the period's end, said plainly (Q-19). | R2 |

### 3.4 Costs and moments inside the tools

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| PM-01 | "Generate · 3 · 60 [coin]" on the desktop Visualizer only (B §6); mockup "2,050 credits left after this" | Mismatch | Every metered button carries its cost; the Visualizer's options line says what is left after (Q-29 · Q-32). | R3 |
| PM-02 | Out of credits: buyer / non-buyer (B §4) | Missing | Buy inside the dialog, then the action carries on by itself (Q-33). | R3 |
| PM-03 | Monthly amount reached; "Request more" inert (B §4) | Broken | *Ask Dane* sends a real request; Dane answers from the bell (Q-34). | R3 |
| PM-04 | Plan-gated feature dialog (unreachable) · LockedFeature mockup | Later | Q-40. | R6 |
| PM-05 | Refund without a word (A §2.3) | Broken | The failure message names the refund (Q-31). | R3 |
| PM-06 | No low-balance warning (B §6) | Missing | Amber row + a bell row with the run-out date (Q-35). | R3 |
| PM-07 | No payment-failed message (A §3.8) | Missing | Owner's banner + bell row with the grace date (Q-37). | R3 |
| PM-08 | — | 2.0 only | Auto top-up, opt-in (Q-36). | R4 |

### 3.5 The usage and billing page

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| US-01 | Settings › Usage & credits (B §3) | Missing | Company › **Plan & AI credits**, tabs *Usage* · *Plan & billing* (Q-22). | R4 |
| US-02 | Period chips (B §3) | Missing | A scope pill *Period: This month ▾* (REG-297's rule: one dimension, one pill). | R4 |
| US-03 | Headline card; "Used = allowance − balance" goes negative (B §7.2) | Broken | Three tiles (`StatTile`): what's left · used this period · how long it lasts at this pace. Used is counted from the ledger. | R4 |
| US-04 | By member with caps (B §3) | Broken | Every active member, with the monthly amount set in place. Human terms ("42 renders · 3 quotes read") (Q-25). | R4 |
| US-05 | Recent activity (50 rows) (B §3) | Missing | *Activity* on the listing's table model: what · the lead or design (a link) · who · when · credits · balance. Filters, search, export (Q-27). | R4 |
| US-06 | Where your credits went, with a US$ Cost (B §3) | Broken | *By tool* without the provider cost (Q-26). | R4 |
| US-07 | — | 2.0 only | *By lead*: credits on each lead, won vs lost (Q-27). | R4 |
| US-08 | Export CSV of the member table only (B §3) | Missing | The house `ExportDialog` (all or shown; CSV · XLSX). | R4 |
| US-09 | Manage billing (Target) | Target | Plan & billing: plan · seats · payment method · billing details · tax invoices · auto top-up (Q-19 · Q-36). | R4 |

### 3.6 Rules, notifications, phone, data

| ID | 1.0 | Status | 2.0 builds | R |
|---|---|---|---|---|
| RO-01 | Buy, caps and checkout Owner-only; pool and S$ figures Owner/Admin only (A §3.1) | Missing | Q-23 · Q-24; five rows in *Who may do what*. | R1 |
| NT-01 | No credit notifications (B §6) | Missing | Eight events (Q-38). | R3 |
| PH-01 | No pill and no Upgrade below 1024 (B §1) | Missing | More › a credits card; moments as bottom sheets; Plans full screen (Q-39). | R5 |
| DA-01 | `plans` · `studio_credit_balances` · `credit_ledger` · `studio_member_credit_caps` · `subscriptions` · `billing_checkout_sessions` (§7) | Missing | The same names; `credit_requests` is new; repair R62 backs every demo state (Q-42). | R1 |
| EX-01 | `/admin/plans`, visitor trial, sign-up gating | Excluded | — | — |

---

## 4. Every touchpoint across 2.0

Where the feature reaches, with today's behaviour and the proposal. **Moments** are where a studio meets credits without looking for them. **Ways in** are where Plans opens.

### 4.1 The shell

| T | Surface | Today | Proposal |
|---|---|---|---|
| T-01 | Rail · Upgrade slot (expanded 216) | Upgrade row, gem, coming soon | Free: *Upgrade* as drawn, with the Free balance quiet at its right end ("110"), which opens Plans (Q-05). Paid: the credits row (§5.1). |
| T-02 | Rail · collapsed 52 / tablet | Gem tile + tooltip "Upgrade" | Free: gem tile, tooltip "Upgrade · 110 AI credits left". Paid: the ring tile, tooltip "6,800 AI credits". |
| T-03 | Rail · touch (hover: none) | 44px targets | The same targets; the card opens on tap. |
| T-04 | The credits card (panel beside the rail) | — | §5.2 |
| T-05 | Studio block (Demo Studio) | Name · owner | Unchanged. The plan name is on the card and in Company; the block stays a person's block. |
| T-06 | Phone · More sheet | Rows | A credits card as the sheet's first row (§5.8). |
| T-07 | Phone · top bar / dock | Search · Chat · bell · avatar / five tabs | Unchanged (no room; the More card carries it). |
| T-08 | Snackbar host | 344×48 | *Couldn't render this one — your 20 AI credits are back* [Try again] · *1,000 AI credits added* · *Asked Dane for more AI credits*. |
| T-09 | The bell | 18 events | Eight more (Q-38), each opening where it can be acted on. |
| T-10 | Maison AI (FAB + sheet) | Scripted suggestions | On the usage page: *Who used the most this month?* · *How long will our credits last?* · *Which leads had renders?* (coming soon, like the rest). *Reset prototype to base* resets the plan and the credits too. |
| T-11 | View as | Members | A *Studio plan (demo only)* row: Free · Pro trial · Pro Studio (Q-41). |

### 4.2 Company, Settings, Members

| T | Surface | Today | Proposal |
|---|---|---|---|
| T-12 | Company panel | Studio · Operations | A new row **Plan & AI credits** (Studio group, `diamond`), with "*n* asks" when members are waiting for credits. |
| T-13 | Company › Plan & AI credits › Usage | — | §5.7 |
| T-14 | Company › Plan & AI credits › Plan & billing | — | §5.7 |
| T-15 | Company › Members · Add member | Adds | When the plan's seats are all used: "Adding Nadia takes an 8th seat · S$35 a month from today" (Owner), or "Ask Dane to add a seat" (others) (Q-13). |
| T-16 | Company › Members · Deactivate | Undo | "Frees a seat from 28 Oct" when the plan counts seats. |
| T-17 | Settings › Studio › Who may do what | 22 rows | + *Buy AI credits* · *Change the plan and billing* · *Set members' monthly AI credits* · *See the studio's AI usage* · *Use AI tools* (Q-23 · Q-24). |
| T-18 | Settings › Notifications | Event table | The new events appear as rows (F-10). |

### 4.3 Moments inside the tools (every metered action)

Cost column: the recommendation of Q-28 · Q-29 · Q-30, in AI credits.

| T | Action (2.0 label) | Where | 1.0 equivalent | Cost | Moment |
|---|---|---|---|---|---|
| T-19 | **Generate** (every intent: Generate · Restyle as … · Style transfer · Relight · Generate from note · Furnish the room · Render from sketch) | `components/visualizer/editor/rail.tsx:160, 186` | Render / Pro render by model × variants | Fast 10 · High 20 per version | The button carries the cost; the options line says "Makes 2 versions · Fast · 20 AI credits · 6,780 left after". |
| T-20 | **Empty the room** | Tools panel → Generate | Defurnish room | 10 | Same |
| T-21 | Quality *Fast / High* | `rail.tsx:133-137` | Fast · Pro quality (mockup) | per version | The segment says the per-version price: *Fast · 10* · *High · 20*. |
| T-22 | Versions 1 · 2 · 3 | `rail.tsx:125-128` | variants | × n | The total updates as you pick. |
| T-23 | Cancel on the progress card | `stage.tsx:518-535` | — | refund | "Stopped — nothing was kept or charged". |
| T-24 | Failure | `visualizer-editor.tsx` | refund row | refund | "Couldn't render this one — your 20 AI credits are back". |
| T-25 | Room photo reading · lighting preview · material taps · moodboard palette · Duplicate design | Visualizer | detect / segment (0) | free | Nothing shown. |
| T-26 | **Upload a quote** (Create Quote modal) | `components/quotes/create-quote-modal.tsx:85-97` | Digitize quote | 5 | The tile's chip: "PDF · XLS · JPG · 5 AI credits". Charged at the read; a failed read gives it back. |
| T-27 | **Quote X-Ray** · Compare · Run again | `components/xray/xray-workspace.tsx` | not metered in 1.0 | free (Q-30) | Nothing shown; a Pro lock if Q-40 goes. |
| T-28 | **Write with AI** (Terms · Notes) | `components/quotes/editor/text/text-section.tsx:97-106` | none (2.0 only) | free (Q-30) | — |
| T-29 | **Upload my existing quote** (template) | `recreate-dialog.tsx` | structure read, not metered | free (Q-30) | — |
| T-30 | **Auto Fill** (Move stage · Notes) · **Fill from a document** · PDF import | leads | screenshot / email parse (0) | free | — |
| T-31 | Maison AI brief · FAB · sheet | leads, editors | mAIson Bot chat (free) | free; a render through Maison AI = 10 | — |
| T-32 | Meeting Copilot (Tools tile, coming soon) | `tools-popover.tsx:25` | 25 per 10 min, Free 1 meeting | Later | — |
| T-33 | Create with AI (contracts) · Draft with Maison AI (quotes) · the other coming-soon AI tiles | — | — | when built | — |

### 4.4 Ways into Plans

| T | Where | Proposal |
|---|---|---|
| T-34 | Rail · Upgrade (Free) | Opens Plans. |
| T-35 | Credits card · *Change plan* | Opens Plans on the current plan. |
| T-36 | Out-of-credits dialog · *See plans* | Opens Plans; the blocked work waits underneath. |
| T-37 | A locked feature (if Q-40) | Opens Plans on the plan that has it. |
| T-38 | Company › Plan & billing · *Change plan* | Opens Plans. |
| T-39 | Members · a seat past the plan | Opens the seats step of Plans. |
| T-40 | The bell · trial ending / payment failed | Opens Plan & billing. |
| T-41 | Maison AI suggestion *Which plan fits us?* | Coming soon (scripted). |

### 4.5 Outside the studio app

| T | Where | Proposal |
|---|---|---|
| T-42 | The marketing pricing page | Stays the website's. Ask the website to say *AI credits*, and fix MM-20. |
| T-43 | Dodo checkout · customer portal · tax invoices | Platform. The prototype stands in for them with a demo step and a static invoice list. |
| T-44 | The platform console (plans, enforcement, grants) | Excluded. |
| T-45 | UAT | A chapter 14, *Plan & AI credits* (R5). |

---

## 5. The proposal — how it looks and behaves

The visual page draws every surface below at 1440 and 390 on 2.0's tokens.

**After the integration review** (`20-…`, §E), phase 1 follows 1.0's definitions in five places:
- one "Buy 1,000 AI credits · S$20" button rather than packs;
- no "+200 this month" (only *Raise to …*);
- no render held until credits arrive;
- Designers see their own figures, not the studio's pool;
- only the Owner buys.

The surfaces below show the full design; those parts wait for 1.0 to support them.

Five principles steer every call:

1. **Price before the press.** Nobody should learn a price by being refused (1.0's own reason, A §2.5). Every metered button shows its cost, and the Visualizer shows what is left after.
2. **One slot, two states.** The rail never grows. Upgrade becomes the balance, in the place Upgrade already holds.
3. **Never stuck, never lost.** Every refusal offers the way on in the same dialog: buy, ask or pick a cheaper option. The work waits underneath and carries on by itself.
4. **Plain terms.** "About 680 renders" next to "6,800 AI credits". A date next to "in 3 days". S$ in the owner's view only.
5. **The owner stays in control and is never surprised.** Warnings come early, with a date. Members ask rather than get stuck. Every charge links to its lead. Our costs are never shown.

### 5.1 The rail slot

- **Free** — the Upgrade row stays exactly as drawn (779:19690, REG-164 · REG-206).
  - When the rail is wide, a quiet count sits at its right end: `110`, in body-s, secondary. It needs no second row.
  - Press opens **Plans** (§5.3).
  - Collapsed, the gem tile's tooltip reads "Upgrade · 110 AI credits left".
- **Paid** — the same 200 × 36 row, radius 8, with no tint at rest (a tint would read as "the page you're on", which is what `primary-variant` means on the rail):
  - **the token glyph** (24): the OpenMaison mark on a coin, redrawn from 1.0's token (`1.0-mockups/credit-token-1.0.png`). **Its rim is a ring** that shows how much of this month's credits is left, like a fuel gauge;
  - the number, e.g. `6,800` (subtitle-m);
  - `AI credits` in body-s, secondary;
  - hover: `hover-04p`, as every rail item.
- **States** (the ring and the number take the colour; the row stays calm):

| State | When | Ring and number |
|---|---|---|
| Healthy | more than 10% of the month left | primary |
| Low | under 10% of the month, or would run out before the refresh at this pace (Q-35) | tertiary yellow; the card leads with the forecast |
| Empty | 0 | tertiary red; the number reads `0`; the card leads with buying |
| Capped (a member) | their monthly amount reached | yellow; the number is theirs: `0 of 600` |

- **Collapsed** — the ring glyph alone in the 36 tile. The tooltip gives the number ("6,800 AI credits"). A 9px number (1.0) fails the page checklist's type scale.
- **What a Designer sees** (Q-08): the number they can use. That is their monthly amount left, or the studio's balance when they have none. It is never the S$ figures or the plan / top-up split.

### 5.2 The credits card

A panel beside the rail, like Tools, Company and View as. It opens on press, closes on Esc or an outside press, and is a bottom sheet on a phone (REG-353). Width 320.

**Owner or Admin:**
1. `6,800` (heading-h2) · "AI credits left".
2. "Refreshes 28 Oct · in 30 days".
3. "About 680 renders" (Q-03).
4. The two-part bar: this month's credits (primary) · top-up (primary-l30) · used (surface-variant). Legend: "This month's 6,300 · refresh 28 Oct" · "Top-up 500 · never expire".
5. When short, the forecast in yellow: "At this pace they run out around 3 Oct, before the refresh."
6. **Top up** — chips "1,000 · S$20" · "2,000 · S$40" · "5,000 · S$100". The button "Buy 1,000 AI credits · S$20" sits under a one-line tax note (Q-15 · Q-21).
7. Footer links: *See usage* · *Change plan*.

**Designer:**
1. `115` · "AI credits you can use this month".
2. "Your monthly amount is 600 · set by Dane".
3. "About 11 renders".
4. **Ask Dane for more** (Q-34). Once asked, the line reads "Asked Dane · 2 min ago".

### 5.3 Plans (the pricing page, inside the app)

An **xxl** modal: fluid, 48px from every edge, the house 64px header "Plans" with close. It opens over the page you are on; your unfinished render waits underneath. It has four steps, each in the same frame:

1. **Choose.**
   - A one-line context: "You're on Free · 110 AI credits left · 30 more on 1 Oct".
   - `Monthly` | `Annual · 1 month free`. Annual shows the S$ saved and the per-month figure (Q-17).
   - Three cards (Free · Pro · Max), with the website's taglines. Pro has `Freelance | Studio`. *Your plan* marks the current one. *Fits your team of 7* marks the suggestion (Q-12). Freelance with 7 members says why it won't do: "Freelance is for one person — you have 7 members".
   - Each card's allowance line is in AI credits, and states what it buys: "10,500 AI credits a month · about 1,050 renders".
   - *What your AI credits buy* — the website's allowance table, for the plans shown.
   - *Compare everything* — the comparison, collapsed by default.
   - *Questions* — FAQs 1 · 3 · 4 · 5 · 6 (Q-11).
   - For a studio that only needs a few more: "Just need a few more? 1,000 AI credits · S$20 — top-ups never expire, on any plan" (E-11).
   - A sticky footer with the choice and one button: "Pro — Studio · 7 seats · S$240 a month · [Continue]".
2. **Review.**
   - Plan and period.
   - **Seats**: a stepper, default = active members, never below them. The reason shows in the row: "7 members are active" (Q-13).
   - What changes: "10,500 AI credits every month, shared by 7 seats. Your 100 welcome credits stay."
   - Today and next: "S$240 today, then S$240 on 28 Oct". With the trial: "Free until 12 Oct, then S$240 a month".
   - One tax line (Q-15). Owner only; others see "Only Dane can change the plan · [Ask Dane]".
3. **Pay.** Dodo's overlay inside the modal (Q-14). The footer carries 1.0's status lines, with MM-18 fixed:
   - "Opening checkout…"
   - "Waiting for payment confirmation…"
   - "Payment received"
   - "Still processing — we'll tell you when it's through"
   - a closed checkout reads "Checkout closed — nothing was charged".

   In the prototype this step is a demo panel with no card fields: "Demo checkout — no card is charged · [Complete demo payment]".
4. **Done.**
   - "You're on Pro".
   - The number counts up to 10,600.
   - Three plain lines: "Your 7 seats share them" · "They refresh on 28 Oct" · "Top-ups never expire".
   - [Back to work] closes the modal and plays the rail's moment (§5.4).

**Phone:** full screen with its own top bar and the same steps (REG-353's wizard rule).

### 5.4 The moments of motion (one orchestrated, the rest quiet)

All timings are `lib/motion` tokens, and `prefers-reduced-motion` swaps each in place.

- **The upgrade moment** — the one flourish:
  1. As Plans closes, the rail's gem makes its REG-164 turn one last time.
  2. At the edge-on point it becomes the token.
  3. The ring fills clockwise (sheet 280, `settle`), and the number counts up.
  4. The coral tint fades (toggle 150).

  The owner wanted a subtle cue for the paid ingress (REG-164). This moment pays it off.
- **A spend** — the number rolls down by the cost, the ring shortens, and a small "−20" rises 8px and fades. This happens only where the balance is on screen (the rail or the editor's chip); no snackbar per spend.
- **A refund** — the reverse, with "+20 back" in green.
- **Running low** — the ring turns yellow (toggle 150). There is no pulse: a pulse reads as an alarm.

### 5.5 Price before the press (inside the tools)

- **The Visualizer's Generate** keeps its verb (the intent label, REG-679):
  - A **cost chip** sits at the button's end: the token at 80% and the number, e.g. `◎ 20`.
  - The options line becomes "Makes 2 versions · Fast · 20 AI credits · 6,780 left after".
  - The Quality segment names the per-version price.
  - The compact go bar (≤1024) keeps the chip.
  - When the balance can't cover the choice, the line says so before the press ("Needs 60 — you can use 45 · pick Fast or 1 version") and the button opens the moment of §5.6 instead of failing.
- **Upload a quote**: the tile's chip "PDF · XLS · JPG · 5 AI credits".
- **Free actions** show nothing (Q-32).
- **Inside the rail-less Visualizer**, a compact balance chip sits in the top bar and opens the same card (Q-09).

### 5.6 When credits run short — one dialog family

The house Dialog, size s (400), with the 64px header. It is a bottom sheet on a phone. The blocked work waits underneath, and everything that can be done is in the dialog.

| Moment | Title | Body | Actions |
|---|---|---|---|
| Out, Owner / Admin | "Out of AI credits" | "This render needs 20. Demo Studio has 4 left." · the bar · "Refreshes 28 Oct" | The pack chips + **Buy 1,000 and render · S$20** · *See plans*. After buying, "1,000 AI credits added — rendering now" and the job starts (Q-33). |
| Out, Designer | "Out of AI credits" | "This render needs 20. Dane or Hui Min can add credits." | **Ask Dane** → "Asked Dane. Your changes are kept — we'll tell you when credits are in." · *Close* (Q-34) |
| Monthly amount reached | "You've used your 600 for September" | "The studio still has 6,800. Dane sets each person's monthly amount." | **Ask Dane for 200 more** (a number to agree to) · *Close* |
| Choice too big | "Needs 60 — you can use 45" | "Make 1 version, or pick Fast." | **Make 1 version · 20** · *Ask Dane for more* |
| Feature on another plan (Q-40) | "Quote X-Ray comes with Pro" | "Compare a competitor's quote line by line and see where you win." | *See plans* (Owner) · *Ask Dane to upgrade* (others) |

**The owner's side of an ask:**
- The bell reads "Sarah asks for more AI credits — they have used their 600 for September".
- Its actions: **+200 this month** (ends with the month) · *Raise to 800* · *Buy 1,000 · S$20* · *Open usage*. *Open usage* opens Sarah's row, with the caret in the monthly amount (REG-224). Asks waiting also show as "n asks" on Company's Plan & AI credits row.
- Sarah hears back: "Dane raised your monthly AI credits to 800".

### 5.7 Company › Plan & AI credits

The Company frame (`CompanyShell`, L1 header, tab strip), with two tabs.

**Usage:**
- A scope pill *Period: This month ▾*, and Export.
- Three `StatTile`s:
  - *AI credits left* 6,800 (the bar under it);
  - *Used this month* 4,200 (with the change vs last month);
  - *Lasts until* ~30 Oct ✓, or "runs out ~3 Oct".
- **By member** on the listing's table model: member · role · used this month (bar + "42 renders · 3 quotes read") · AI credits · monthly amount.
  - The monthly amount is a `TextField numeric="digits"` with "No limit" when empty. It saves with an Undo snackbar.
  - Every active member appears.
- **By tool**: tool · share · times used · AI credits. No US$.
- **By lead**: lead · stage · renders · quotes read · AI credits. Won and Lost show in the stage chip.
- **Activity**: when · what ("Pro render · 2 versions") · for (the lead, design or quote, a link) · who · AI credits (−20 / +20 back / +1,000) · balance. It has a search and filters.
- Designers see their own rows. Managers see their team (Q-24).

**Plan & billing:**
- **Plan card**: "Pro — Studio · 7 seats · monthly · S$240 a month · renews 28 Oct", with [Change plan] and [Cancel plan].
- **Seats**: "7 of 7 seats used".
- **Auto top-up** (off by default; Q-36): "When AI credits fall under 500, add 1,000 (S$20) · at most S$100 a month".
- **Payment method**: "Visa ending 4242", with [Update] (Dodo's portal).
- **Billing details** from Company › Profile: the entity, UEN and address.
- **Tax invoices**: date · for · amount · [PDF].
- Everything but the invoices list is Owner-only; others see it read-only, with the one-line reason (`ReadOnlyScope`).

### 5.8 Phone and tablet

- **Phone:**
  - The More sheet's first row is a small credits card. Free shows "You're on Free · 110 AI credits · [Upgrade]"; paid shows "6,800 AI credits · refresh 28 Oct".
  - A tap opens the credits card as a sheet.
  - The moments are bottom sheets. Plans is full screen. The Visualizer's go bar keeps its cost chip.
- **Tablet:** the collapsed rail's ring tile; the card beside it.

### 5.9 Copy vocabulary (proposed; invented until marked)

| Use | Words |
|---|---|
| The unit | *AI credits* (first mention on a surface) · *credits* after |
| Balance | "6,800 AI credits" · "AI credits left" · "AI credits you can use this month" |
| Time | "Refreshes 28 Oct · in 30 days" |
| Plain terms | "About 680 renders" |
| Cost | "◎ 20" on a button · "20 AI credits" in a line |
| Refund | "your 20 AI credits are back" |
| A member's cap | "monthly amount" (not "cap"; not "ceiling") |
| Asking | "Ask Dane for more" · "Asked Dane" |
| Buying | "Buy 1,000 AI credits · S$20" · "1,000 AI credits added" |
| Plans | "Plans" · "Your plan" · "Fits your team of 7" · "Upgrade to Pro" · "Start 14-day free trial" · "Talk to us" |

### 5.10 Who may do what (proposed rows)

| Row | Owner | Admin | Manager | Designer |
|---|---|---|---|---|
| Use AI tools (within their monthly amount) | ✓ | ✓ | ✓ | ✓ |
| Buy AI credits | ✓ | ✓ | — | — |
| Set members' monthly AI credits | ✓ | ✓ | — | — |
| Change the plan, seats and billing; cancel | ✓ | — | — | — |
| See the studio's AI usage | all | all | their team | their own |

---

## 6. Enhancements beyond 1.0

Two research readers studied the products studios compare OpenMaison with:
- **E**: Adobe, Canva, Figma, Miro, Notion, Copilot, Cursor, OpenAI, Anthropic, Midjourney, Runway, Krea, Leonardo, ElevenLabs, Lovable, Replit and v0;
- **F**: the interior-design render tools (Foyr, Coohom, Homestyler, Planner 5D, Spacely, Collov, REimagineHome, Interior AI, Houzz Pro, D5, Chaos, Maket, mnml and others), in-app checkout, and Singapore GST.

Their headline: **OpenMaison's fixed price per action is its biggest advantage.** The products people complain about most can't show a price before an action runs (Figma Make, Miro's "No", Lovable, Cursor). And every large backlash came from **changing the deal, hiding costs, or enforcing limits without warning**, not from price levels (E §1, §5).

The enhancements below are ranked by how much they take off a studio's mind. Each names where it comes from and the question that decides it.

| # | Enhancement | Where it comes from | Decides |
|---|---|---|---|
| E-01 | **"About N renders left", live.** Fixed prices let the balance read in outcomes. The market does this only on plan pages (Adobe's "Up to 20 videos", Krea, Runway, Miro); nobody does it in the live balance. It goes on the card, the Plans cards and the top-up chips ("1,000 · about 100 renders"). | E §1.7, §4.4 | Q-03 |
| E-02 | **The price on every metered button, from one table.** Leonardo, ElevenLabs and Krea put it on the button. One price table drives every display, because Krea's and Miro's numbers drifted between surfaces. | E §4.6, §6.1 | Q-28 · Q-32 |
| E-03 | **Ask the owner: the work waits, then carries on by itself.** Lovable's *Add credits / Finish up / Ask an admin → Resume*. Claude's *Request usage credits → Request sent → Increase limit*, plus a daily digest. GitHub's *Approve and increase*, which restores access at once. In 2.0: *Ask Dane* becomes "Asked Dane", and Dane's bell offers **+200 this month** (ends with the month) · **Raise to 800** · **Buy 1,000 · S$20**. Then the held render runs. | E §4.15, §4.19; F §2.3 | Q-34 |
| E-04 | **Refunds you can see, where the charge was.** Adobe refunds in minutes, Runway's charge disappears, and Leonardo shows a refund row. Midjourney, Miro and Anthropic charge nothing for failures. The rules for cancel, timeout and a bad result are written once, because Runway and Cursor show what vagueness costs. | E §4.13; F §2.1 | Q-31 |
| E-05 | **Fixing the AI's own mistakes is free.** This is the loudest complaint everywhere: Figma Make's "70% of my prompts are fixing", Replit, Copilot, Runway. Figma, v0, Lovable and ElevenLabs made fix actions free. For 1.0's Drift repair (2 credits): free, or at least refunded when it fails. | E §4.14, §5.4 | Q-28 |
| E-06 | **Warnings in steps, with a date and what to do.** Claude goes amber at 75% and red at 90%. Copilot warns at 75 / 90 / 100%. Cursor's forecast offers three remedies. In 2.0: the owner's bell at 75% and 90% of the month used, and at 0, each with "At this pace they run out around 25 Oct". The remedies are top up, make Fast the default, or add seats. The ring's colour follows. | E §4.3, §4.5, §4.20 | Q-35 |
| E-07 | **Every limit says when it comes back.** Compare ChatGPT's "try again tomorrow after 9:17 AM" and Copilot's "Resets {0} at {1}". A missing reset time is a named complaint (Figma, Adobe). Every dialog and sheet in §5.6 carries "refreshes 28 Oct". | E §4.2 | §5.6 |
| E-08 | **Offer the cheaper way before stopping.** Canva adds short pauses, Midjourney has Relax, and Notion falls back to included models. In 2.0, when the choice is too big, "Make 1 version · 20" or "Fast instead of High" is the primary action. Viewing, editing and sharing past renders never cost credits, and the FAQ says so. | E §4.16 | §5.6 |
| E-09 | **Monthly amounts in layers.** Lovable, Notion, Claude and Copilot use a studio default, a per-member override, and a raise that ends with the month. Figma sets three levels (Full · Custom · No access). In 2.0: a default for new members, quick picks in By member (No limit · 300 · 600 · 1,000), and the temporary raise from an ask. | E §4.18 | Q-25 |
| E-10 | **The spend order, said plainly.** Canva: "AI tools will always use the allowance that expires soonest". Lovable spends "soonest-expiring … first to minimize what you lose". In 2.0: "This month's credits are used first; top-ups never expire", on the card, in Plans and on the top-up sheet. | E §4.22 | Q-43 |
| E-11 | **Top-ups that truly never expire**: on any plan (Free included), after a downgrade, after cancelling. This is rare. Runway's bought credits and Leonardo's top-ups do it; v0, Bolt and ElevenLabs drew complaints when bought credits became unusable. It is a real selling point. | E §1.6, §5.9 | Q-19 · Q-43 |
| E-12 | **Automatic top-up only if the owner opts in**, with a monthly ceiling and a receipt each time (Lovable, Runway, Claude). It is never on by default (OpenAI; v0's unexpected recharges), and never a permanent plan raise (Notion's Auto Adjust). | E §4.23, §5.6 | Q-36 |
| E-13 | **Owners budget in S$.** Cursor was criticised for removing dollar amounts; OpenAI and Claude set budgets in money. In 2.0, for the owner only: "3,700 AI credits · about S$74 at the top-up price" on the Usage tiles. OpenMaison's own cost never appears. | E §6.11 | Q-26 |
| E-14 | **An owner's view of who is blocked.** Claude Enterprise shows *Blocked right now · Near their limit · Member-days lost*. Figma shows *People at seat credit limit · Days until credits reset*. In 2.0: By member marks *At their amount* and *Near it*, and the Company row shows "n asks" while members wait. | E §4.21 | Q-24 · Q-25 |
| E-15 | **Tie every charge to a lead, and show the pay-off.** No product can, because it needs 2.0's lead record. *By lead* shows renders and quotes read per lead, and "Won 3 of the 8 leads with renders". | — (2.0 only) | Q-27 |
| E-16 | **Upgrade in place, pay the difference, land back on your work.** GitHub: "The upgrade cost is only the price difference". Lovable "adds 100 credits, not 200". v0: "you return to the chat you upgraded from". A nudge from usage (Runway: "If you find yourself purchasing credits often…"): after two top-ups in a month, the card names the plan that would have cost less. | E §4.25 | Q-12 · Q-19 |
| E-17 | **Explain once, then mark everywhere.** Adobe shows a one-time notice on first use, then a sparkle mark. In 2.0, the first press of a metered button shows a one-time tip: "Renders use AI credits — 10 for Fast, 20 for High. Demo Studio has 6,800. Nothing is charged if a render fails." After that, only the chip. | E §4.8 | §5.5 |
| E-18 | **A receipt on each result.** v0 shows credits used after each generation; Leonardo keeps a token history. In 2.0 a version's info reads "20 AI credits · Dane · 12 min ago". | E §4.11 | Q-27 |
| E-19 | **The total the studio will pay, before it pays.** 40% of shoppers who abandon checkout cite extra costs (Baymard), and IRAS has display rules. Review shows today's amount (prorated), the next date and amount, and the tax line for the studio's own GST status. Its UEN and GST number are filled in. | F §3.3, §3.4 | Q-15 |
| E-20 | **Pay the way Singapore pays.** PayNow for top-ups, which needs OpenMaison selling through Stripe (Dodo lists no PayNow). | F §3.1, §3.2 | Q-14 |
| E-21 | **Never change the deal quietly.** Cursor (Jun 2025), Adobe (Jun 2025), Figma (Mar 2026), Anthropic (Jul 2025) and GitHub (Apr 2026) all drew backlash for changes, hidden costs or enforcement without warning. Metronome: "Usage stopped not because of price, but because admins didn't trust they'd stay in budget." GitHub showed usage in the IDE before billing it. For 1.0's studios in shadow mode (A §3.6): a month's notice in the app, with their own usage in credits and renders, before anything counts. | E §1.8, §5.1–5.2 | Q-46 |
| E-22 | **Meeting Co-Pilot, when it comes.** "25 AI credits · 10 min" before starting, and a live meter. At each block a check-in: "Keep going? 25 for 10 more minutes · Wrap up" (Lovable). At zero the current answer finishes (Notion, Codex, Copilot CLI). A receipt at the end: "Co-Pilot · 23 min · 75 AI credits". | E §6.6 | Q-45 |
| E-23 | **Background renders with a bell when done.** Houzz lets you keep working, notifies you, and files the render into the project. This is for the live engine, not today's curated one. | F §2.1 | Later |
| E-24 | **Credits that survive a quiet month.** A business call. Leonardo banks rollover for 3 months ("You asked, we listened"), ElevenLabs for 2 months, and Spacely while you're subscribed; mnml caps rollover at twice the allowance. "Use them or lose them" is a named complaint; 1.0 and the website say plan credits don't roll over. | E §4.24, §5.8; F §2.3 | Q-47 |

**What studios hated elsewhere, and where the proposal stands** (E §5):

| Backlash | The proposal |
|---|---|
| Changing the deal mid-subscription | Open — Q-46 (announce, show usage first) |
| Tightening quietly, or enforcing after tracking silently | Open — Q-46 (1.0's shadow studios) |
| Costs revealed only afterwards | Avoided — price on every button (E-02) |
| Charging for failures, cancels and the AI's own mistakes | Avoided — E-04 · E-05 · Q-31 |
| Limits with no reset time | Avoided — E-07 |
| Spend switches on by default | Avoided — auto top-up is opt-in (E-12) |
| "Unlimited" that isn't | Avoided — nothing is called unlimited |
| Allowances per seat that can't be shared | Avoided — one studio pool (DEF-03) |
| Bought credits that expire or become unusable | Avoided — E-11 |
| Units nobody can budget in | Avoided — renders (E-01) and S$ for owners (E-13) |
| Team controls missing or Enterprise-only | Avoided — monthly amounts on every paid plan (E-09) |
| Only large packs | Avoided — packs from 1,000 (S$20) |
| Use-it-or-lose-it | Open — Q-47 (rollover is a business call) |

---

## 7. Data plan

**Tables.** They keep 1.0's names, so the developers' port is a mapping, not a rename (the parity rule). Migration `0057`. Every table joins **both** baseline lists (`lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`).

| Table | Columns (1.0 names first) | Notes |
|---|---|---|
| `plans` | id · name · monthly_price_cents · yearly_price_cents · credit_allowance · signup_credit_grant · min_seats · extra_seat_price_cents · is_contact_sales · trial_days · feature_flags (JSON) · sort | Reference rows: free · pro_freelance · pro_studio · max (A §1.2, C §4). |
| `subscriptions` | plan_id · seats · period (monthly/yearly) · status (active · trialing · past_due · cancelled) · current_period_start · current_period_end · trial_ends_at · grace_until · cancel_at_period_end | One row per studio. 1.0 adds the Dodo ids (Platform). |
| `studio_credit_balances` | plan_credits · topup_credits · period_start · period_end · updated_at | One row per studio. `balance = plan + topup` and must equal the ledger (repair check). |
| `credit_ledger` | id · member_id · action_key · credits (signed) · balance_after · reason (spend · refund · topup · refresh · grant · adjust) · ref_id · created_at | + 2.0: `lead_id` · `ref_kind` (render_job · comparison · quote · checkout) for the links and *By lead*. **No** `actual_cost_usd` (Platform, never shown). |
| `studio_member_credit_caps` | member_id · monthly_cap · updated_at | Empty = no monthly amount. |
| `billing_checkout_sessions` | id · member_id · kind (topup · plan) · plan_id · seats · period · quantity · amount_cents · status · credits_granted · created_at · completed_at | The prototype's demo payments write here. |
| `credit_requests` *(2.0 only)* | id · member_id · kind (pool · monthly) · needed · asked_for · status (open · granted · declined) · answered_by · answered_at · created_at | The ask of §5.6. |
| `invoices` *(1.0's platform-billing table, 009)* | id · invoice_number · plan_name · amount · currency · billing_period_start · billing_period_end · dodo_payment_id · issued_at · paid_at | **Revised:** 1.0's name and columns, so the port is a mapping (integration B-37). |
| settings `credit_alerts` · `auto_topup` | low threshold · { on, below, packs, monthly ceiling } | JSON in `settings`, like `quote_rules`. |

**Pure logic** in `lib/credits/`, beside 1.0's names so the developers can swap in the real RPCs:
- `schedule.ts` — the price list, without costs;
- `balance.ts` — spend order, refunds, refresh, the forecast;
- `plans.ts` — allowance × seats, prices, annual, trial;
- `policy.ts` — who may buy, cap or see; `{ error: <the rule> }` refusals.

**Demo data** (repair **R62**, idempotent, with its own checks). Every visible state is backed by records (REG-343):
- a subscription;
- the welcome grant and each month's refresh as ledger rows (1.0 writes none, B §7.4);
- **every demo render and reading charged to its maker at its time**: Dane 3 Fast + 1 High = 50, Michelle 2 Fast = 20, and X-Ray free;
- one refund, with its failed render row;
- one top-up by Dane, with its checkout session and tax invoice;
- a monthly amount for Sarah;
- one open ask.

The base plan is Q-41's answer. `npm run db:baseline` follows, and *Reset prototype to base* covers the new tables.

## 8. Questions for the owner

Mark each **As recommended**, **Build it your way** (with a note), **Hold** or **Don't build**. A blank mark keeps the recommendation.

**Revised after the integration review (2026-09-28, `20-ai-credits-integration-differences-2026-09-28.md`).** Where a proposal would have changed something the 1.0 team defined on purpose, and the gain was small, the recommendation now keeps 1.0's definition. Those questions are marked **Revised · keep 1.0**, with the first proposal kept as the alternative.

### A · Words and the unit
- **Q-01 · The unit's name.** Rec: **AI credits** in 2.0. 2.0 already says "credits" for Qanvast lead credits (F-05), and the website says "tokens" (MM-01). Ask the website to say AI credits too.
- **Q-02 · The glyph.** Rec: 1.0's token (the OpenMaison mark on a coin), redrawn as a 2.0 SVG glyph (currentColor). Its rim doubles as the level ring. *Alt:* a Material Symbol such as `toll`, which needs a re-subset.
- **Q-03 · Plain terms.** Rec: yes. "About 680 renders" beside the balance, in renders only (the common case), from the price list.

### B · The rail slot
- **Q-04 · One slot, two states.** Rec: yes, as briefed. Free shows Upgrade; a paid plan shows the credits row in the same place. Plans stay reachable from the credits card. (1.0's ported rail shows both, MM-21.)
- **Q-05 · The Free balance.** Rec: a quiet count at the Upgrade row's right end when the rail is wide ("110"), and in the collapsed tooltip. Plans open with it too.
- **Q-06 · The credits row.** Rec: the token whose rim is the level ring · the number · "AI credits". Yellow when low, red at 0. Collapsed = the ring alone with the number in the tooltip.
- **Q-07 · Press or hover.** Rec: a press opens the card, as with Tools / Company / View as. Hover only gives the tooltip. (1.0's hover popover can't be reached on touch, MM-16.)
- **Q-08 · What a Designer's row shows.** **Revised · keep 1.0:** 1.0 hides the studio's pool from everyone but the Owner and Admin (decision 2026-09-17; the balance API returns `null`).
  - A capped Designer sees their own amount left: "115 of your 600".
  - An uncapped one sees their use: "420 used this month".
  - Optional and additive: a coarse `poolState` (ok · low · out, no numbers), so Designers are warned before a refusal (B-03).
  - *Alt (first proposal):* the studio's balance for uncapped Designers, which changes 1.0's redaction.
- **Q-09 · Inside the rail-less editors.** Rec: a small balance chip in the AI Visualizer's top bar that opens the same card. Other editors show costs on their buttons only.

### C · Plans inside the app
- **Q-10 · Where Plans open.** Rec: an **xxl modal over the page you're on**, with the same content as Company › Plan & AI credits › Plan & billing › Change plan. *Alt:* a page only.
  - Usability research advises a page or a large sheet for a complex choice, rather than a small modal (F §3.4). The house xxl is that large sheet: fluid, 48px from every edge.
  - It keeps the studio's unfinished work underneath.
  - A top-up at the moment of need stays in the small dialog of §5.6.
- **Q-11 · What comes over from the website.** Rec: the plan cards, Monthly / Annual, Freelance / Studio, *What your AI credits buy*, *Compare everything* and FAQs 1 · 3 · 4 · 5 · 6. Leave the hero, the trust row, the sign-up buttons and the footer.
- **Q-12 · Plans that know the studio.** Rec: *Your plan*; *Fits your team of 7*; the reason in place when a plan can't fit ("Freelance is for one person — you have 7 members").
- **Q-13 · Seats.** **Revised · keep 1.0:** no check of seats against members (1.0 has none; `max_members` is only displayed).
  - The seat stepper at checkout defaults to the active members (7) and changes only the checkout quantity.
  - Adding a seat from Company › Members waits for the business rule: must every active member hold a seat? (B-21)
  - 1.0's S$300 pricing risk still needs fixing (C-01).
- **Q-14 · Checkout.** **Revised · keep 1.0 (Dodo, decision 2026-09-21).** Rec: Dodo's overlay inside Plans, never a redirect. The prototype shows a labelled demo step with no card fields. Only *Update card* in Plan & billing leaves the app: it opens the provider's hosted portal in a new tab, because a billing portal can't be framed (F §3.1, §3.2).
  - *Needs finance and the developers: who sells.* It is a business choice with visible effects (F §4):
    - **Dodo, as 1.0 has it:** Dodo is the merchant of record. The overlay has no PayNow and no Apple Pay, the tax invoice carries Dodo's name, and SGD may carry an FX fee.
    - **Stripe:** OpenMaison sells. PayNow works for top-ups, the tax invoice is OpenMaison's own with the studio's UEN and GST number, and OpenMaison keeps its own credit ledger (1.0 already has one).
- **Q-15 · Tax wording.** Rec: show **the amount the studio will actually pay**, worked out from its own GST status (Settings › Studio's GST card; Company › Profile's GST number):
  - A GST-registered studio sees the price and the line "Your GST number M90371234 goes on the invoice". Its UEN and GST number are filled into checkout, so nobody types them.
  - A studio that isn't registered sees the total with GST first.
  - *Needs finance*:
    - A Singapore seller registered for GST must show GST-inclusive prices; "S$100 + GST" is not allowed (IRAS, F §3.3).
    - An overseas merchant of record under OVR (Dodo) is exempt from that rule. It charges GST only when the studio gives no GST number.
    - The answer to Q-14 therefore decides the words. 1.0 and the website show no tax wording at all (A §1.6).
- **Q-16 · The 14-day Pro trial.** Rec: offer it, as the website does. Monthly only, card up front, one per studio, with the date it turns paid.
- **Q-17 · Annual.** Rec: the per-month figure and the S$ saved beside "1 month free". *Needs:* how extra seats are priced on annual (MM-20).
- **Q-18 · Max.** Rec: *Talk to us* opens a short request inside the app (studio, name and phone filled in). A snackbar confirms. It does not leave for `/contact`.
- **Q-19 · Change plan, downgrade, cancel.** Rec, the lighter version after the integration review (B-20):
  - Upgrading happens in the app, as a new checkout (1.0's flow).
  - Change plan, downgrade, cancel, the card and the invoices open **Dodo's customer portal**. It is the one step that leaves the app, and it is 1.0's own "Manage billing" target.
  - The Plan & billing tab says plainly what happens ("You keep Pro until 28 Oct; your top-ups stay"). That keeps the Terms' promise (MM-08).

### D · The card and the page
- **Q-20 · The credits card's content.** Rec: as §5.2.
- **Q-21 · Top-up amounts.** **Revised · keep 1.0 for now:** one button, "Buy 1,000 AI credits · S$20". 1.0 sells one product, and both its route and its webhook assume quantity 1 (B-05).
  - Packs of 1 · 2 · 5 come later: a small change in 1.0.
  - *Alt:* the screenshot's slider in hundreds, which needs a new product.
- **Q-22 · Where the page lives.** Rec: **Company › Plan & AI credits** (records: the ledger, the plan, the invoices), with tabs *Usage* · *Plan & billing*. *Alt:* a Settings module.
- **Q-23 · Who buys.** **Revised · keep 1.0:** only the Owner buys, sets monthly amounts and changes the plan. 1.0 excludes Admins on purpose ("same access as owner except plan/billing").
  - An Admin sees "Only Dane can buy AI credits" and **Ask Dane** (B-01, B-02).
  - *Alt (first proposal):* Admins buy top-ups too, which changes 1.0's access control.
- **Q-24 · Who sees the usage.** **Revised · keep 1.0:** the Owner and Admins see the studio; everyone else sees their own. A Manager's team view waits, because it changes 1.0's usage scoping (B-03).
- **Q-25 · Monthly amounts.** Rec: 1.0's permanent `monthly_cap`, called *monthly amount*:
  - an amount per member, with quick picks (No limit · 300 · 600 · 1,000);
  - a default for new members, which is additive (B-16).

  List every active member, and mark *At their amount* and *Near it*. A change saves with Undo.
  - **Revised:** the raise that ends with the month waits, because it changes 1.0's spend function (B-15).
- **Q-26 · The Cost column.** Rec: drop it; it is OpenMaison's provider cost (MM-13). Show the owner the S$ value at the top-up price instead ("3,700 AI credits · about S$74"), because owners budget in money (E-13).
- **Q-27 · Link every charge to its work.** Rec: yes — the activity row links the lead, design or quote, and a *By lead* view shows what AI cost per lead, won vs lost.

### E · What costs what in 2.0
- **Q-28 · The price list.** Rec: 1.0's numbers as they are, kept in one table that drives every display. The one exception is **Drift repair, which becomes free**, or at least refunded when it fails. Fixing the AI's own mistakes is the market's loudest complaint (E-05).
- **Q-29 · The mapping.**
  - Fast = Render 10 per version; High = Pro render 20 per version.
  - Empty the room = Defurnish 10; every other Generate kind is priced by its quality.
  - Upload a quote = Digitize quote 5, charged at the read.
  - Room reading, Auto Fill, Fill from a document and PDF import are free.
  - Rec: yes.
- **Q-30 · Actions 1.0 doesn't charge.** Quote X-Ray, Write with AI, Upload my existing quote and Maison AI chat. Rec: free for now, and the FAQ says so.
- **Q-31 · When a charge happens.** Rec: when the work starts. Cancel before "Keeping the version" and every failure give the credits back, and the tool says it in the same message.
- **Q-32 · Free actions.** Rec: show nothing; costs appear only when there is one.

### F · The moments
- **Q-33 · Out of credits, Owner.** Rec: buy inside the dialog and the work carries on by itself.
- **Q-34 · Asking for more.** Rec: *Ask Dane* sends a real request (additive, B-19), and the member's button turns into "Asked Dane".
  - The ask reaches the Owner in the bell with *Raise to 800* (1.0's `PUT /caps`) · *Buy 1,000 · S$20* · *Open usage*.
  - The member hears back: "Dane added AI credits — press Generate again". Their picks are already kept.
  - **Revised:** "+200 this month" (B-15) and the render held until credits arrive (B-14) wait. Both change 1.0's spend path or need a job queue.
- **Q-35 · Running low.** Rec: bell rows for the Owner and Admins at **75% and 90% of the month used, and at 0**. Each carries the run-out date at this pace and what to do (top up · Fast by default · more seats) (E-06). The rail row turns yellow when the credits would run out before the refresh, and red at 0.
- **Q-36 · Auto top-up.** Rec: build it as an option in Plan & billing (off by default, with a monthly S$ ceiling).
- **Q-37 · Payment trouble.** Rec: the Owner's banner and a bell row when a payment fails, with the grace date. After grace, the studio moves to Free and keeps its top-ups.
- **Q-38 · New notification events.** Rec: credits low · out of credits · a member asks · an ask answered · a monthly amount reached · this month's credits in · a payment failed · a receipt.

### G · Phone and tablet
- **Q-39 · Phone.** Rec: a credits card at the top of More, the moments as bottom sheets, and Plans full screen.

### H · Beyond credits
- **Q-40 · Plan feature locks.** 1.0's plans also lock features (Free: no Quote X-Ray, template editor, approvals, WhatsApp notifications or custom stages; Max-only: custom price book, no OpenMaison branding), but 1.0 enforces none of it (MM-07). Rec: **their own round (R6) after credits**. A locked feature stays visible with a *Pro* tag, and a press opens the "comes with Pro" card. Until then Plans shows the comparison as the website does.
- **Q-41 · The demo's base plan.** Rec: **Pro — Studio, 7 seats**, so every feature works and the credits row shows. View as gains a *Studio plan (demo only)* row (Free · Pro trial · Pro Studio), so a demo can show Upgrade and play the upgrade moment. Reset returns to Pro. *Alt:* Free as the base (Upgrade on screen as today; the upgrade played live).
- **Q-42 · The record.** Rec: the tables of §7 with 1.0's names. Every demo render and reading is charged to its maker at its time. The welcome and monthly credits are ledger rows. Repair R62.
- **Q-43 · Where 2.0's rules differ from 1.0's code** (developers' notes). Rec:
  - monthly credits are plan credits and don't roll over (unless Q-47 says otherwise);
  - annual plans get their credits every month;
  - Free's welcome 150 lasts until used;
  - top-ups never expire on any plan, after a downgrade or after cancelling (E-11);
  - the spend order is said plainly wherever credits are bought (E-10);
  - one renewal date drives both refresh and billing.

  These are the website's promises, and the map tells the developers where 1.0 differs.
- **Q-44 · Excluded.** Rec: yes — the platform console, the visitor trial and sign-up gates, and the marketing site stay out.
- **Q-45 · Later.** Rec: yes. Meeting Co-Pilot metering waits for the tool (25 per 10 minutes; Free's one 30-minute meeting), with E-22's design ready: the cost before starting, a check-in at each block, the current answer finishing at zero, and a receipt. Projects' reads wait for Projects.
- **Q-46 · Turning credits on for studios that used AI free.** 1.0's existing studios run in shadow mode: they are metered, never charged, and their pill shows 0 (A §3.6). The worst backlash elsewhere came from enforcing without warning (E-21). Rec:
  - a month's notice in the app before anything counts, e.g. "From 1 Nov, AI tools use AI credits. In September Demo Studio would have used 3,700 — about 370 renders. Pro — Studio covers that.";
  - the studio's own usage visible during that month;
  - never a quiet switch.

  This is for the developers' rollout; the words are Vicky's.
- **Q-47 · Two business calls to take to the business.** Rec:
  - **Rollover:** let unused monthly credits roll over one month while subscribed. It answers "use them or lose them", and Leonardo, ElevenLabs and Spacely do it (E-24).
  - **A Draft quality at 5:** 1.0 already prices `render_fast_lite` at 5 but never shows it. Rec **hold** it, so the quality choice stays at two: Fast and High.

## 9. Rounds (after the marks)

| Round | What | Probe |
|---|---|---|
| **R1 · The record and the slot** | Tables + `lib/credits/*` + R62; *Who may do what*; the rail slot's two states; the credits card (Owner / Designer); the glyph. | `verify-cr-r1.cjs` |
| **R2 · Plans inside the app** | The Plans modal (choose · review · pay · done); the demo checkout; the upgrade moment; the trial; Talk to us; change / cancel. | `verify-cr-r2.cjs` |
| **R3 · Price before the press, and the moments** | Cost chips on every metered action; spend / refund motion; the dialog family; asks + answers; low and payment-failed; the new events; the Visualizer's balance chip. | `verify-cr-r3.cjs` |
| **R4 · The page** | Company › Plan & AI credits: Usage (tiles, by member with monthly amounts, by tool, by lead, activity, export) · Plan & billing (plan, seats, auto top-up, payment method, details, invoices). | `verify-cr-r4.cjs` |
| **R5 · Phone, tablet, the map, the UAT** | More's card, sheets, full-screen Plans; the developers' migration map `20-ai-credits-migration-map-…md`; UAT chapter 14. | `verify-cr-r5.cjs` |
| **R6 · Plan feature locks** *(if Q-40 goes)* | Lock tags, the "comes with Pro" card, the demo plan switch across every locked surface. | `verify-cr-r6.cjs` |

## 10. Answers

**2026-09-28 — the owner: "go ahead and build it perfectly."** Every question **As recommended**, with the revisions of the integration review (`20-ai-credits-integration-differences-2026-09-28.md`), which keep 1.0's definitions wherever 1.0 defined something on purpose. The build: REG-699…705.

| Q | Mark | As built |
|---|---|---|
| Q-01 … Q-03 | As recommended; **Q-02 changed by the owner the same day** | *AI credits* everywhere; the glyph is **Maison AI's spark, filled to the level** (REG-706 — the owner picked it from six directions: "the icon we use across AI related things"), replacing the coin token first built; "about N renders" beside every balance. |
| Q-04 … Q-07 | As recommended | One slot, two states; the Free count quiet at the row's end; a press opens the card (never hover alone). |
| Q-08 | Revised · keep 1.0 | A Designer sees "115 of your 600" or "420 used this month", and the coarse *low / out* state, never the pool. |
| Q-09 | As recommended | The Visualizer's top bar carries the balance chip. |
| Q-10 … Q-12 | As recommended | Plans is the xxl modal over the page; the website's content; *Your plan* · *Fits your team of 7* · the reason a plan can't fit. |
| Q-13 | Revised · keep 1.0 | No seat check; the stepper defaults to the active members. |
| Q-14 | Revised · keep 1.0 | Dodo; the prototype's Pay step is a labelled stand-in with no card fields. |
| Q-15 | As recommended | The studio's own GST line, UEN and GST number filled in. Finance to confirm the words. |
| Q-16 · Q-17 · Q-18 | As recommended | The 14-day trial (monthly, once per studio, with the date it turns paid); annual's per-month figure and S$ saved; *Talk to us* inside the app. |
| Q-19 | Revised · keep 1.0 | Upgrading in Plans; change, cancel and the card through *Manage billing* (Dodo's portal in the live app). |
| Q-20 | As recommended | The card as §5.2. |
| Q-21 | Revised · keep 1.0 | One pack: 1,000 AI credits · S$20. |
| Q-22 | As recommended | Company › Plan & AI credits: Usage · Plan & billing. |
| Q-23 · Q-24 | Revised · keep 1.0 | Only the Owner buys, sets amounts and changes the plan; the Owner and Admins see the studio, everyone else their own. |
| Q-25 | Revised · keep 1.0 | 1.0's permanent cap as the *monthly amount*: quick picks, *Another amount…*, a default for new members, Undo; no raise that ends with the month. |
| Q-26 · Q-27 | As recommended | No provider cost; the Owner sees S$ at the top-up price; every charge links its lead, design or quote; *By lead*. |
| Q-28 · Q-29 · Q-30 · Q-31 · Q-32 | As recommended | 1.0's price list in one table; Fast 10 · High 20 per version, Empty the room 10, a quote read 5; X-Ray, Write with AI, Upload my existing quote and Maison AI chat free; charged at the start, given back on Cancel and on every failure, said in the same message; free actions show nothing. (Drift repair has no 2.0 counterpart.) |
| Q-33 | As recommended | Buy inside the dialog; the render starts by itself. |
| Q-34 | Revised · keep 1.0 | A real ask; "Asked Dane"; the Owner answers from the page (Raise to 800 · Another amount · Buy); no held render, no "+200 this month". |
| Q-35 · Q-37 · Q-38 | As recommended | Low at 75% / 90% with the run-out date, out, the payment-failed banner and bell with the grace date, eight events. |
| Q-36 | As recommended, **held** | Auto top-up waits: integration B-29 (a saved card, off-session charging and a threshold job in 1.0). |
| Q-39 | As recommended, **read through the house** | More's first row is the credits card (Upgrade on Free); the moments are sheets; Plans on a phone is the house xxl sheet (REG-511, the tallest bottom sheet) rather than a one-off full-screen page. |
| Q-40 | As recommended | Plan feature locks stay their own round (R6) — not built. |
| Q-41 | As recommended | Pro — Studio · 7 seats is the base; View as › *Studio plan · demo only* (Free · trial · Pro · Payment failed · Not counted yet). |
| Q-42 · Q-43 · Q-44 | As recommended | 1.0's tables and names + `credit_requests`; the five fixes of 1.0's own promises; the excluded parts stay out. |
| Q-45 · Q-46 · Q-47 | As recommended | Co-Pilot later; the notice month exists as the demo state *Not counted yet* (the rollout is the developers'); rollover and a Draft quality held. |

Rounds as built: R1 + R2 → `design-source/verify/ai-credits/verify-cr-r1.cjs` (59), R3 → `verify-cr-r3.cjs` (40), R4 → `verify-cr-r4.cjs` (41), R5 → `verify-cr-r5.cjs` (16); R6 not built. The developers' map: `21-ai-credits-migration-map-2026-09-28.md`.
