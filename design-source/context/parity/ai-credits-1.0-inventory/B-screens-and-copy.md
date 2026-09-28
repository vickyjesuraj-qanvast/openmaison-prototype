# B — 1.0: every credit and billing screen, word for word

> Reader's report for the AI credits audit (`../19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`), banked as written. 1.0 = `qanvast-id-tool` on `origin/feat/om-ui-port` @ `3174b912f` (2026-09-27), read with `git show`; nothing was checked out.

# OpenMaison 1.0: AI credits and billing UI audit (branch `origin/feat/om-ui-port`, head 3174b912f, 27 Sep 2026)

All paths are in the repo `/Users/vicky/Documents/GitHub/qanvast-id-tool`. I read them with `git show origin/feat/om-ui-port:<path>`, because the working tree is on `integ/security-non-qanvast`. Nothing was modified.

**Read these first:**
- **Two different chromes.**
  - The new rail (`src/components/om-shell/app-rail.tsx`) only renders when `NEXT_PUBLIC_OM_UI=1` (`src/lib/om/flag.ts`). The docs say this flag is unset on live PLG and only used on preview deployments.
  - With the flag off (live 1.0), the credit pill sits in the legacy Topbar (`src/components/layout/topbar.tsx:295-305`) and **there is no Upgrade entry anywhere in the chrome**.
- **Three popover items from your list are not in 1.0.** The buy slider, the line "S$ 2.00 per 100 credits · plus any applicable tax" and a "Buy 1,000 credits" button do not exist:
  - not on this branch;
  - not on any ref (`git log --all -S` found nothing);
  - not in the openmaison-prototype repo.
  - The pricing behind them does exist in 1.0: one fixed top-up of 1,000 credits for S$20 per the docs and FAQ, which works out to S$2.00 per 100.
  - The rest of your examples match 1.0 exactly for a Free studio that signed up in September: "150 credits available", "Refreshes in 3 days", "STUDIO POOL", "150 plan · 0 top-up".
- **Plan data** (migrations 317/326/327):

| Plan | Credits | Price |
|---|---|---|
| Free | 30 a month, plus 150 once at signup | — |
| Pro — Freelance | 1,500 a month, 1 seat | S$35/mo, S$385/yr |
| Pro — Studio | 1,500 per seat, 3 seats minimum (4,500 pooled) | S$100/mo, S$1,100/yr; extra seat S$35 |
| Max | 3,000 per seat | Contact sales, no checkout |
| Top-up | 1,000 credits (`TOPUP_CREDITS`, webhook line 119) | S$20 per docs |

- **Cost per action** (`src/lib/credits/schedule.ts`):

| Action | Credits |
|---|---|
| Digitize quote | 5 |
| Draft render | 5 |
| Defurnish room | 10 |
| Render (fast) | 10 |
| Photorealistic render | 15 |
| Pro render | 20 |
| Drift repair | 2 |
| Co-Pilot (10 min) | 25 |
| Email/screenshot parse, segment, detect | 0 |

- **Enforcement.** Studios created from now on have enforcement ON. Existing studios run in "shadow mode": nothing is ever debited or refused, and shadow rows are hidden from the Usage page.

---

## 1. The credit pill (`src/components/credits/credit-pill.tsx`)

### Where it sits
- **Live 1.0 (flag off):**
  - Legacy topbar, right-hand cluster: after the mobile search icon, before the Notifications bell.
  - Wrapped in `hidden sm:block`, so it is hidden below 640px.
  - Not rendered for signed-out visitors.
- **om-ui rail, bottom group.** The order is:
  1. credit pill
  2. Upgrade
  3. Notifications
  4. Settings
  5. then the avatar/profile row
- **Rail visibility:**
  - Signed-in users only (`!isAnon`, app-rail.tsx:482-489).
  - The rail only exists at ≥1024px (`hidden lg:flex`), and between 768 and 1024px it is forced collapsed.
  - The mobile chrome (`om-shell/mobile-nav.tsx`, below 1024px) has **no pill and no Upgrade**.
- **Expanded rail (216px):** a full-width 192×32 bar (`h-8 px-3 rounded-xl border`) with a 14px token icon and the number.
- **Collapsed rail (52px, the default):**
  - A 36×36 "compact" tile: 12px icon above a **9px** number, abbreviated by `compactNumber` (1,240 → "1.2k", 25,000 → "25k").
  - Added in e69111c33. Before that the slot was `display:none` when collapsed.
  - Stale CSS comment at app-rail.module.css:273-274 still says the slot "hides".
- **Visual system mismatch.** The pill and popover use PLG Tailwind tokens and PLG's Radix `Popover`, not the om design tokens the rail uses.

### What it shows (b6118ff20: "AVAILABLE, not used")

| Viewer | Figure shown | Examples |
|---|---|---|
| Capped member (any role, including a capped owner) | Their own remaining allowance (`memberCapRemaining`) | "760" |
| Trusted viewer, uncapped | Studio balance (plan + top-up) | "1,240" |
| Non-trusted, uncapped (typical designer) | Their own spend | Full pill "1,015 used"; compact tile just "1.2k", with **no "used"** (tested at credit-pill.test:209-213) |

- "Trusted" means owner/admin, or anyone granted `settings.editStudio`.
- For non-trusted viewers the server returns `balance: null`.

### States

| State | What renders |
|---|---|
| Loading, or no figure yet | Pulsing skeleton `h-8 w-[72px]` (compact `h-9 w-9`), `bg-surface-variant`, aria-label "Loading credits" |
| Error (balance route 500) | Nothing at all. The slot stays as empty padding. |
| Normal | `bg-primary-variant border-primary-variant-hover text-primary-default hover:bg-primary-variant-hover` (lavender tint, purple text) |
| Low | Below `LOW_BALANCE = 20` (line 27): `bg-tertiary-yellow-variant2 border-tertiary-yellow-variant1 text-on-tertiary-yellow-variant` (amber) |

- **Who can go amber:**
  - Capped member: compares their own remainder to 20.
  - Trusted uncapped viewer: compares the studio balance to 20.
  - Uncapped designer: **never** amber, by design (line 10-26).
- **Zero:** no separate red or empty state. "0" is just amber, and an uncapped designer sees "0 used".
- **Unprovisioned studio (no balance row):**
  - Owner sees "0" in amber, and the popover has no "Refreshes" line.
  - Designer sees "0 used".
- **Signed out:** the pill is not rendered.
- **Enforcement state:** never shown. `enforcementEnabled` is fetched but unused, so shadow-mode studios see a balance that never moves.
- **Focus:** `focus-visible:ring-2 ring-primary-default/40`.

### Click vs hover
- The pill is a real `<Link href="/settings/usage">`, so **click navigates**.
- The popover opens on mouseenter/focus and closes on mouseleave/blur (lines 162-165). It has no interactive content, and moving the pointer off the pill closes it.
- On touch devices you cannot see the popover without navigating.
- The popover is a PLG Radix Popover:
  - `w-64 p-3`, `rounded-md border shadow-md`, z-70, fade/zoom animation.
  - `align="end"`. `side="right"` when compact; otherwise the default bottom, flipping when there is no room. `sideOffset` 4. No autofocus.
- Accessible name: `"{fullLabel} — view usage and credits"`.

### Popover content, line by line (lines 190-202)

**Block 1 — the viewer's own figure (everyone):**
1. Bold (`text-body-s font-medium`), one of:
   - `"760 credits left of your 2,000"` (capped)
   - `"1,240 credits available"` (trusted, uncapped)
   - `"1,015 credits used this month"` (non-trusted, uncapped)
2. Caption (`text-caption-s`, secondary), one of:
   - `"Refreshes in N days"`
   - `"Refreshes tomorrow"`
   - `"Refreshes today"`
   - omitted if there is no period end

**Block 2 — trusted viewers only.** A top divider, then:
3. `"STUDIO POOL"` (source text "Studio pool", uppercase via CSS, caption)
4. `"1,240 credits"`
5. `"940 plan · 300 top-up"`

**Not in the popover:**
- no buy button, slider, price, tax line, or plan name;
- no link text (the pill itself is the link);
- no per-member cap list. The only cap information is the viewer's own, in line 1.

### Refresh behaviour
- Nothing refreshes the balance after an AI spend. `useCredits` has a 30s staleTime and refetches only on window focus or remount, and the rail never remounts between pages.
- The only invalidation happens after a completed checkout (use-checkout.ts:153).

---

## 2. The Upgrade entry, `/upgrade` and `/pricing`

### The rail item (om-ui only)
- `navItem({icon:'diamond', label:'Upgrade', href:'/upgrade'}, styles.upgrade)` at app-rail.tsx:490.
- **Visuals** (app-rail.module.css:133-152):
  - Tile background `linear-gradient(90deg, rgba(214,97,66,.1), rgba(189,58,95,.1))`.
  - Filled Material "diamond" glyph with a gradient fill `#b42c69 → #eb802b`.
  - The gem spins once around its Y axis every 8s; turned off under reduced motion.
  - Tooltip "Upgrade" when collapsed; label "Upgrade" when expanded.
- **Who sees it:** everyone, including visitors, admins, designers, accounting users, and Pro/Max studios. It depends on neither plan nor role.

**What clicking it does:**

| Viewer | Result |
|---|---|
| Owner | `/upgrade` with no params: "Choose a plan" / "Pick the one that fits your studio and we will take it from there." / [See plans] → `/pricing` (marketing site, leaves the app) |
| Non-owner | `access-control.ts:129` has `upgrade: ["owner"]`, so the route guard silently bounces them to their default route (/dashboard, or /finance/pipeline for accounting) |
| Visitor | `/login?redirectTo=%2Fupgrade` |

**Upgrade is a dead end for signed-in owners:**
1. /pricing "Get started" goes to `/login?redirectTo=/upgrade?plan=…`.
2. login/page.tsx:58-64 sends any already-signed-in user to `getDefaultRoute()`, i.e. /dashboard, **ignoring redirectTo**.
3. So Upgrade → See plans → Get started lands back on the dashboard.

The only in-app purchase paths that actually work are:
- the blocked dialog's buttons;
- "Buy credits" on the Usage page.

### `/upgrade` with params (`src/app/(main)/upgrade/page.tsx`)
- Used after a logged-out visitor picks a plan on /pricing.
- If the owner has not finished setup, it first goes to `/studio-setup?next=<this URL>`.
- Otherwise it shows a spinner, "Taking you to checkout…", "One moment. You will be able to review everything before you pay."
- It then POSTs `{kind:"plan", planId, period, seats}` and does `window.location.replace(checkoutUrl)`: a **same-tab redirect** to Dodo's hosted checkout.

Error screens (amber AlertCircle):

| Case | Title | Body | Button |
|---|---|---|---|
| 403 | "Only the studio owner can change the plan" | "Ask whoever set up your studio to do this, and it will apply to everyone on the team." | [Back to dashboard] |
| 409 contact_sales | "Max is arranged with our team" | "It is priced per seat against an agreement, so there is no checkout for it. Tell us about your studio and we will set it up." | [Talk to us] → /contact?plan=max |
| 503 | "Checkout is not available right now" | "Payments are not configured for this environment. Nothing was charged." | [Back to pricing] |
| Other error | "We could not start the checkout" | "Nothing was charged. Try again, or talk to us and we will sort it out by hand." | [Back to pricing] |
| Network error | "We could not reach the checkout" | "Nothing was charged. Check your connection and try again." | [Back to pricing] |

### `/pricing` (`src/app/(marketing)/pricing/page-client.tsx`)
The pricing page says "tokens"; the app says "credits".

**Hero:**
- Eyebrow "Pricing"; heading "Pricing that respects your margins."
- Lede: "Start free with no card. AI runs on tokens, so you pay for what you use — and you can see exactly what each action costs before you spend it."

**Period toggle:** "Monthly" | "Annual · 1 month free" (computed from the database, 385/35 = 11 months).

**Cards:**

| Card | Tagline | Price | Seat line | CTA | Token line |
|---|---|---|---|---|---|
| Free | "Everything you need to see if this fits." | "S$0 forever" | — | "Start free" | "150 tokens to start, then 30 a month" |
| Pro (featured) | "For a working studio that bills clients." | S$35/month or S$385/year (Freelance); S$100/month or S$1,100/year (Studio) | "1 seat", or "For 3 seats · S$35 per extra seat/month" | "Get started" | "1,500 tokens a month, per seat" or "4,500 tokens a month, pooled across 3 seats" |
| Max | "For firms that need it bent to their shape." | "Let's talk" | "Priced per seat, against a signed agreement." | "Talk to us" | "3,000 tokens a month, per seat" |

- The Pro card has a "Freelance | Studio" segmented control.
- The "Most Popular" badge comes only from pro_freelance, so it **disappears when you toggle to Studio**.
- Trust row: "No card to start" · "Cancel anytime, no lock-in".

**Tokens section:** "A token is a unit of AI, not a mystery.", with this table:

| Allowance | Renders | Quotes digitized | Co-Pilot |
|---|---|---|---|
| 150 · Free, to start | 15 | 30 | 1 h |
| 1,500 · Pro Freelance | 150 | 300 | 10 h |
| 4,500 · Pro Studio | 450 | 900 | 30 h |
| 3,000 · Max, per seat | 300 | 600 | 20 h |

- Footnote: "Monthly tokens reset… Tokens you top up never expire, and your plan's are always spent first…"

**Rest of the page:**
- Compare matrix: AI rows say "Tokens"; Co-Pilot on Free says "1 meeting".
- FAQ, including:
  - "top up 1,000 tokens for S$20"
  - "Every button shows its cost before you press it"
  - "Can I change plans later? Anytime, in either direction…"
- Closing: "Try it before you decide." with [Get started], which links to /pricing itself, and [Talk to us].

**Checkout gaps:**
- **No seat stepper anywhere.** Studio always sends `seats=minSeats` (3), and extra seats cannot be bought.
- **No current-plan indicator** anywhere, e.g. no "You're on Free".

---

## 3. Usage & credits pages

### Settings › Usage & credits (`src/app/(main)/settings/usage/page.tsx`)
**Reaching it:**
- Settings nav item "Usage & credits", with the token icon.
- Settings card titled "Usage & Credits" (note the capital C), text "See your credit balance, per-member spend, and recent activity", button [View usage].
- The pill.
- Route access: owner, admin, ID. Accounting-only users are bounced.

**Header:**
- "Usage & credits".
- Subtitle for trusted viewers: `"{Studio} · {Plan|No plan assigned} · {N} seat(s)"`. Non-trusted viewers see only the studio name.

**Period chips** (`role=group`, aria "Billing period"):
- Chips: "This period" · "Last period" · "Last 3 months" · "Last 6 months". Active chip is filled primary.
- Below them, the server's label, e.g. "Current period · 1 – 30 Sept 2026", "Previous period · …", "Last 3 months · 1 Jun – 30 Sept 2026".
- "Updating…" while refetching.
- Windows follow the **billing** period (Dodo anniversary for paid studios).

**Loading and error:**
- Loading: 3 skeleton cards.
- Error (only when nothing is cached): red card "Could not load your usage and credits." / "Check your connection and try again." / [Retry].

Section order: headline card → member table → Recent activity → "Where your credits went".

#### A. Headline card — trusted viewer: `BalanceCard`
- Label "CREDITS REMAINING"; big number; then "of {allowance}" or "No plan assigned".
- Two-segment bar: Plan (primary) and Top-up (primary-hover/50).
- Legend: "Plan · N", "Top-up · N", "Used · {allowance − balance | —}".
- Divider, then "RENEWS": "{1 October} · {allowance/seats} per seat", or "No plan assigned", or "No active billing period".
- "Plan credits do not roll over. Top-up credits never expire."
- Buttons:
  - [Buy credits] (primary). Owner only (`isOwner`). Disabled for others, with hover title "Only the studio owner can buy credits.", or the unconfigured title.
  - [Change plan] (outline). **Always disabled**, hover title "Changing plan isn't self-serve yet — talk to us and we'll move you."
- Checkout status line underneath, for owners.
- The card ignores the period chips; it is always "now".

#### A'. Headline card — non-trusted viewer: `MemberHeadlineCard`
- "YOUR USAGE THIS MONTH" (or "…IN THIS PERIOD"); big number used; then "of {cap} credits" (current period and capped, with a bar) or "credits used".
- Off-period with a cap: "Your cap of {cap} credits applies to a single month, so it is not compared against this window."
- Then "Refreshes {1 October}" or "No active billing period".

#### B. Member table
**Title and subtitle:**
- Trusted: "By member" / `"Set a monthly ceiling so one person can&apos;t spend the studio&apos;s month."`. **The entity is rendered literally** because it is a JS string (line 647).
- Non-trusted: "Your usage" / "Only you can see your own spend and cap here. Owners and admins see the full team."

**Header and banners:**
- [Export CSV] (outline-secondary, Download icon), shown to everyone.
- Amber truncation banner: "Based on the most recent {N} events — older activity in this window is not included in these totals."
- Empty state: "No credit activity this period yet."

**Columns:** MEMBER | USED THIS MONTH (or "USED IN THIS PERIOD") | CREDITS | MONTHLY CAP.

**Rows:**
- Initials avatar, in one of 4 colours hashed from the member id.
- Name; role ("Owner", else the member's title, else "Interior designer"; "Unknown member"/"—" as fallbacks).
- Current period only: a bar plus "{pct}% of their cap" or "No cap set". Uncapped members get an **empty** bar.
- Other periods: "Cap applies per month — not compared over this window".
- **Rows only exist for members who spent in the window or already have a cap row.** Idle or new teammates are missing, so their cap cannot be pre-set.

**Cap input (`CapEditor`):**
- Editable only when `isOwner`. Admins see read-only "No cap" or the number.
- `type=number`, min 0, placeholder "No cap". Small grey "No cap" helper text when null.
- **Saves on blur.** No Save button and no success feedback, just a refetch. Disabled while saving.
- Empty value means no cap (DELETE).

Cap errors, shown in red under the field:

| Case | Message |
|---|---|
| Client validation | "Enter a non-negative number, or clear it for no cap." |
| 403 | "Only the studio owner can change credit caps." |
| 404 | "This member could not be found." |
| Other server error | The server's text, e.g. "monthlyCap must be a non-negative number <= 2147483647 or null", or "Could not save the cap." |
| Network | "Could not save — check your connection and try again." |

Decimals are silently floored.

**Export CSV:**
- Header row: `Member, Role, "Used — {periodLabel}", Monthly cap`.
- One row per visible member: name, role, used, cap or "No cap".
- If truncated, a blank line then "Based on the most recent {N} events — older activity in this window is not included."
- Formula injection is neutralised.
- Filename `credit-usage-{period}-{YYYY-MM-DD}.csv`.
- Only the member table is exported: no activity, no per-tool data. Non-trusted viewers get just their own row.
- UTF-8 with no BOM, so "—", "·" and "–" may garble in Excel.

#### C. Recent activity
**Columns:** ACTION | MEMBER | WHEN | CREDITS | BALANCE (Balance column trusted only).

**Rows:**
- At most the 50 newest rows in the window (server side). No pagination or "load more".
- Shadow rows (`shadow_spend`, `would_block`) are filtered out after the 50 are fetched.

**Action labels by ledger reason:**

| Reason | Label |
|---|---|
| topup | "Top-up purchased", plus a green pill "never expires" |
| refresh | "Monthly credits renewed" |
| refund | "Credit refunded" |
| grant | "Credits granted" |
| adjust | "Balance adjustment" |
| spend | The schedule label ("Pro render", "Co-Pilot (10 min)", …), else the raw key |

**Other columns:**
- Member: the name, "—" if there is no member, "Former member" if not in the table.
- When: "Just now", "12m ago", "3h ago", "2d ago", "1w ago", "2mo ago".
- Credits: "+1,000" in green or "−60" in red.
- Balance: studio pool after the row.
- Empty state: "No activity in this period yet."

#### D. "Where your credits went" (per-tool rollup)
- Description: "Credits spent per tool in the selected period, with refunds deducted from the tool they came back from. Top-ups and renewals are credits coming in, so they are not counted here."
- Refund note, when there were refunds: "{N} credit(s) refunded in this period has/have already been deducted below."
- Truncation banner: "Showing the most recent {N} events — older activity in this window is not included in these totals." The window cap is 200 events for the current period and 1,000 otherwise.
- Empty state: "No usage in this period."

**Columns:**
- TOOL.
- SHARE: a bar plus "{pct}% of this period" (same wording even for 3- or 6-month windows).
- TIMES USED: spend events, **not** reduced by refunds.
- CREDITS: net of refunds, floored at 0.
- **COST** (owner/admin only):
  - Sum of `credit_ledger.actual_cost_usd`, the **provider cost-of-goods in USD** that OpenMaison pays OpenRouter/fal.
  - Not reduced by refunds.
  - Formatted "$0.28", or 4 decimal places below a cent.
  - An unknown cost renders "$0.00".
  - The column is dropped entirely for non-trusted viewers.
- Sorted by credits, descending. No totals row.

**Mobile:** all tables are fixed flex columns with no horizontal scroll.

### Accounts › Studio Health (`/accounts/usage`)
- Owner only; everyone else is redirected to /dashboard.
- Uses `src/components/settings/usage-dashboard.tsx` → `StudioHealthView`. This is product analytics, **not credits**.
- "Studio Health" / "How your team is using OpenMaison"; a 7d/30d/90d segmented control.
- KPI groups:
  - Engagement: Active members, Sessions, AI runs, Page views.
  - Business outcomes: Leads created, Projects created, Quotes sent, Invoices sent.
  - Team productivity: Tasks completed, Escalations resolved, Progress updates, Hangout meetings.
  - Homeowner engagement: Portal logins, Issues reported.
- Also: a "{range} trend" chart, "Feature usage", "Top pages viewed", and a "Team activity" table (…AI runs…).
- Loading text is "Loading…".
- Its "AI runs" do not reconcile with credits.

### Design references vs build
**`design/Usage.dc.html`, 1100px mock, "Usage & credits" / "Arthaus Studio · Pro — Studio · 3 seats":**
- Balance card:
  - "2,060 of 4,500"; bar 23.5% plan + 22.2% top-up.
  - "Plan · 1,060 / Top-up · 1,000 / Used · 2,440" (the same flawed formula the build uses).
  - "RENEWS 1 October · 1,500 per seat"; the roll-over line; [Buy credits] [Change plan].
- "By member":
  - Correct apostrophes in the subtitle; [Export CSV].
  - Rows: Wei Ling (Owner, 1,240, cap 2,000, "62% of their cap · 118 renders"); Marcus Tan (890, cap 1,500, "59% of their cap · 71 renders, 24 quotes"); Priya Raman (310, "No cap set · 22 renders", partly filled bar).
  - Cap boxes are formatted "2,000".
- "Recent activity" with Balance:
  - "Pro render · 3 variants" −60, "Co-Pilot · 40 min meeting" −100, "Quote digitization" −5, "Top-up purchased [never expires]" +1,000.
  - Times shown as "10 min ago", "1 hr ago", "Yesterday".
- The design has **no** period chips, no per-tool table, and no Cost column.
- The build **lacks**: per-member action counts, variant/meeting detail in labels, and formatted cap values.

**`design/AdminPlans.dc.html` ("Studios & plans"):**
- Subtitle "Assign a plan, then turn enforcement on once the studio has been reviewed."
- Stat cards: Studios 46 / Plan assigned 18 / Enforcing 6 (green) / Would have blocked 3 (amber).
- Table: STUDIO ("was: pro") | PLAN (select) | SEATS | SHADOW USAGE ("2,440 / 4,500", "no blocks in 30 days") | ENFORCING (toggle).
- Amber row: Level-Up Studio · Free · "1,880 / 150" · "would have blocked 31 times" · off. Note it treats Free as 150 a month.
- Row: "DC Vision · Not assigned · 40 / —".
- Footer: "Enforcement is off by default. Until it is on, a studio is metered but never blocked."
- Built at `/admin/plans` (platform admin) with the same copy, plus "balance: N credits" and "used / allowance".
- Confirm dialog: "Turn on enforcement for {studio}?" / "Members will start being refused when the studio runs out of credits."

---

## 4. The blocked dialog (`credit-blocked-dialog.tsx`, mounted once in `(main)/layout.tsx`)
- Only 4 kinds render (`RENDERABLE_KINDS`).
- `canPurchase` = `settings.editStudio`, effectively the owner.
- Width 420px; a 36px icon tile; stacked full-width buttons.

**Out of credits (`credits`), red AlertCircle:**
- Title "Your studio is out of credits".
- Purchaser:
  - Body "This needs {needed} credits. Your studio has {balance} left." Balance is not number-formatted and comes from the possibly stale `useCredits`; if unknown, just "This needs {needed} credits."
  - Buttons: [Buy credits] (top-up) and [Upgrade plan] (outline, **always Pro — Freelance, monthly, 1 seat**, even for studios already on Pro/Studio), then the status line.
- Non-purchaser (designers **and admins**): "Ask your studio owner to top up, and this will work again." with only [Close]. No names, no figures, no notify.

**Member cap reached (`member_cap`), amber Clock:**
- Title "You've used your monthly credits".
- Body: "This needs {needed} credits and you have {remaining} left of your personal allowance. Your studio still has credits available." The last sentence is asserted without checking the pool.
- [Request more] is **inert** (no onClick); [Close].

**Plan-gated feature (`plan`), Lock on lavender:**
- Title "{Feature} is included in Pro", e.g. "Quote X-Ray is included in Pro". Labels come from FEATURE_LABELS, fallback "This feature".
- Body "Upgrade to unlock it for your whole studio."
- [Upgrade to Pro] and [Not now]; shown with no canPurchase check.
- **Unreachable in 1.0:** no metered route passes `feature` to `guardCredits`, so no plan gate is enforced. Quote X-Ray is neither gated nor metered.

**Role (`role`), no icon:**
- "You don't have access to this" / "Ask a studio admin if you need it." / [Close].
- Raised by any metered 403 whose body is `{error:"forbidden"}`.

**Variants that do not exist:**
- **Plan lapsed / grace / payment failed:** no variant, banner or notification. Lapse is silent: a 14-day grace backstop, then `plan_id → free`.
- **Trial:** no credit-dialog variant.
- **Not allowed to buy:** there is no separate variant. It is the non-purchaser branch of "Out of credits" above.

**Visitor dialogs (`anon/signup-required-dialog.tsx` via AnonBlockProvider)** — each has [Create your studio] → `/login?redirectTo=<path>` and [Not now]:

| Reason | Title | Body |
|---|---|---|
| quota | "Create an account to keep going" | "You've used your free allowance. Your work is saved — sign up and it moves straight into your studio." |
| tier | "The better models need an account" | "Pro and photorealistic renders are included once you sign up. Your work is saved and comes with you." |
| account_action | "This one needs an account" | "Inviting teammates and sending quotes for signature need somewhere to send them from. Your work is saved." |
| expired | "Pick up where you left off" | "This session has expired. Your work is saved for seven days — sign in to bring it into a studio." |
| none | "Create an account to keep going" | "Sign up to save your work and pick up right where you leave off." |

- The verification variant is "One more check" / "That didn't go through. Please try again — your work is still here." with [Try again], which only closes the dialog.

**Design deltas** (`design/Blocked.dc.html`, `design/LockedFeature.dc.html`):
- The Blocked mock has:
  - a meter plus "4 of 4,500 remaining · resets in 12 days";
  - "Buy 1,000 credits · S$20";
  - "Ask Wei Ling to top up — they can add credits from Settings." with [Notify Wei Ling];
  - "Request more from Wei Ling".
- The LockedFeature mock has a dimmed real screen plus an "INCLUDED IN PRO" card ("See how your quote compares", [Upgrade to Pro · S$35/mo], "You're on Free").
- **None of these are built.**

---

## 5. Checkout UX (`hooks/use-checkout.ts`, `credits/checkout-status-line.tsx`)
**Overlay flow ("Buy credits" on the Usage page and in the dialog; "Upgrade plan"/"Upgrade to Pro" in the dialog):**
- Opens a Dodo **overlay** in-page (not a new tab).
- Test vs live mode comes from `NEXT_PUBLIC_DODO_ENVIRONMENT`.
- The top-up is one SKU of 1,000 credits. The UI **never shows quantity or price** before the overlay; tax is left to Dodo as merchant of record.
- Polling of `/api/billing/checkout/{id}` **starts when the overlay opens**, every 2s for up to 60s. `checkout.closed` is ignored by design.

**Status line states:**

| Phase | Copy | Style |
|---|---|---|
| starting | "Opening checkout…" | spinner |
| polling | "Waiting for payment confirmation…" | spinner; shown while the user is still typing card details |
| completed | "Payment received — your credits are ready." | green; also used for plan purchases; the pill and usage refetch |
| after 60s | "Payment is processing — your credits will appear shortly." | grey; shown **even if the user abandoned the checkout** |
| error | Server's raw `error` string, e.g. "forbidden", "contact_sales", "Unknown plan", "Could not create checkout session", or "Could not start checkout" / "Something went wrong. Please try again." | red |
| idle | nothing | — |

- **Busy state:** buttons stay disabled for up to 60s after closing the overlay.
- **Billing unconfigured (503):** after that first click, the buttons silently turn disabled. The only explanation is the hover title "Billing isn't set up for this environment yet — ask an admin to configure it."
- **After success:** the dialog stays open; the user closes it and re-runs the action. Closing the dialog mid-poll drops the feedback.

**Hosted flow (`/upgrade`):** a same-tab `window.location.replace`. **No `return_url`** is sent to Dodo, so there is no in-app return or success page.

**Seat quantity risk:** Pro — Studio is sent as `quantity: seats` (3) of a product priced S$100, which could charge S$300/mo instead of the advertised S$100 (checkout route:243). This needs checking against the Dodo product setup.

---

## 6. Other touchpoints
**Cost labels next to AI actions.** Only the project Visualizer shows one:
- Desktop rail button: "✦ Generate · 3 · 60 [coin]" / "Defurnish · 10 [coin]", where the cost is `· {n}` plus a 12px token icon at 80% opacity and a screen-reader-only " credits" (visualizer.tsx:5519-5525).
- The older mobile Controls sheet: "Generate 3 Renders · 60 [coin]" (5605-5607).
- **The phone `MobileGenerateBar` shows no cost.**
- The Fast / High-quality toggle has no per-option cost.
- The price list endpoint is session-only, so visitors see no costs at all.

**Places with no cost shown:**
- Quote digitizer; PhotoRenderDialog ("Generate Render"/"Regenerate"/"Refine this", FLUX.2 Pro = 15).
- Co-Pilot mood board and render (20 each), ID Buddy/mAIson render.
- Gantt "upload quote" parse. The new-lead quote parse runs **silently after navigation** (5 credits).
- RenderTourDialog marks an entry "Out of credits".

**Co-Pilot / mAIson "meter":** none.
- The 25-credits-per-10-minutes metering (`lib/credits/copilot-meter.ts`) has **no callers**, and Free's one-time Co-Pilot trial is never consumed.
- The mAIson bot tool returns the text "This studio is out of render credits — generate_render was not run.", not a dialog.

**Notifications / onboarding / dashboard:**
- No low-balance, top-up, payment-failed, grace or lapse notifications or emails.
- No credit mention in onboarding (only "No credit card required") or on the dashboard.

**Visitor surfaces:**
- Rail: no pill, no bell, no Settings; a filled "Sign in" button; **"Upgrade" still visible**.
- Visitor grant is `ANON_GRANT = 50` credits with no counter.
- The trial visualizer subtitle says "No sign-up needed".
- `TrialSignupGate`: "You've used your free tokens" / "Sign up free to keep rendering, save your designs, and unlock the full editing suite." / [Sign up free].
- The account gate has per-intent titles, [Continue with your phone number] / [Keep looking around], and "{surface} · free to start, no card needed".
- The signup wall: "{surface} is part of your free studio" … [Look around some more].
- Marketing copy says "3 free renders".

**Dev harness:** `/credits-preview` (not in the app shell; needs a session): "Local preview · fixture data · no database", with the pill (healthy/low), 5 dialog buttons, and the owner Usage page on fixtures.

---

## 7. Bugs and UX problems (most severe first)
1. **The Upgrade path is broken:**
   - Signed-in owners loop back to /dashboard (login ignores `redirectTo`).
   - Non-owners are silently bounced.
   - Upgrade shows for Pro/Max studios and visitors.
   - "Change plan" is disabled, while the FAQ says "Anytime, in either direction".
2. **Free-plan numbers:**
   - A new Free studio sees Usage "Credits remaining 150 **of 30**", "Plan · 150", **"Used · -120"**, "Renews 1 October · 30 per seat".
   - The pill says "150 credits available · Refreshes in 3 days", but the refresh *overwrites* plan credits to 30. The unused signup grant evaporates at the first month end, which the pricing page never says.
   - "Used = allowance − balance" also goes negative with any top-up (e.g. "1,030 of 30 · Used · -1,000").
3. **Paid allowance lands in the wrong bucket.** It is granted with reason "grant", which goes to `topup_credits` (migration 320:24-26). Paid plan credits show as "Top-up", never expire and stack every month, contradicting "Plan credits do not roll over".
4. **Recent activity labels:**
   - "Monthly credits renewed" is never written.
   - The Free refresh and the 150 signup grant write no ledger row, so the Balance column jumps unexplained.
   - A top-up by an owner with no spend or cap in the window shows as **"Former member"**.
5. **The literal `can&apos;t` / `studio&apos;s`** shows in the "By member" subtitle, which is also shown to admins who cannot edit caps.
6. **By member omits** members with no spend and no cap, so caps cannot be pre-set. Uncapped rows show an empty bar.
7. **The Cost column exposes OpenMaison's provider COGS** to customer owners/admins:
   - The "$" symbol is easily misread as S$.
   - An unknown cost reads "$0.00".
   - This contradicts the price-list route's stated wish not to publish the cost structure.
8. **Hard-coded plan in the dialog.** "Upgrade plan"/"Upgrade to Pro" are fixed to Pro — Freelance monthly, which could mean a duplicate or downgrade subscription.
9. **Dialog dead ends:**
   - "Request more" is inert.
   - The cap copy claims the studio still has credits.
   - The plan variant shows purchase buttons to non-purchasers, and plan gates are not enforced at all.
10. **Checkout feedback:**
    - "Processing" is shown for abandoned checkouts.
    - Raw error codes such as "forbidden" and "contact_sales" leak into the status line.
    - Billing-unconfigured is only explained by a hover title.
    - No return URL; no amount or price before paying.
    - A possible 3× seat charge for Pro — Studio.
11. **Pill freshness and legibility:**
    - Stale after spends (no invalidation), so the dialog's "Your studio has N left" can contradict the refusal.
    - The compact tile shows a designer's *spend* with no "used".
    - 9px text.
    - Hidden below 1024px (om-ui) or 640px (legacy).
    - Popover unreachable on touch.
    - Capped pill ignores an empty pool.
    - Designers never get a low warning; no distinct zero state.
    - The low threshold of 20 is fixed regardless of pool size.
12. **Shadow mode is invisible.** All pre-existing studios: the pill never moves, and the Usage page says "No usage in this period."
13. **Copy inconsistencies:**
    - "tokens" (pricing, trial gate) vs "credits" (app).
    - "Every button shows its cost" is only true in the Visualizer.
    - Co-Pilot "25 per 10 min" and Free's "1 meeting" are advertised but not metered.
    - "3 free renders" vs a 50-credit visitor grant.
    - Chips say "This period" while the label says "Current period".
    - "% of this period" on multi-month windows.
    - Settings card promises designers balance and per-member data they cannot see.
    - "Usage & Credits" vs "Usage & credits".
    - The "tier" dialog says Pro renders are "included".
14. **Smaller issues:**
    - Designers see their usage twice (headline card plus a one-row table).
    - Tables are not responsive.
    - The cap field saves silently on blur and floors decimals.
    - The CSV has no BOM.
    - Accounting-only users see the pill, but its link bounces.
    - The pricing closing CTA links to itself.
    - The "Most Popular" badge vanishes on the Studio toggle.
    - Pill and popover use PLG styling inside the om rail.
