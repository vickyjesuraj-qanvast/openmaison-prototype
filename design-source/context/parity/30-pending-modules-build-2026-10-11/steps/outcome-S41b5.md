# S41b-5 · Qanvast Ops › Lead credits and Reviews & Rankings — outcome (2026-10-14, lane B)

Found by the S41b data sweep (`s41b/sweep-data.md` § M-04, § 4 note 3, the `qanvast/[...path]` row; `sweep-pages.md` on Qanvast Ops' sidebar):
1.0's Qanvast line (`origin/deployment/qanvast` @ 40f8635e2) has real pages behind 2.0's two signpost tabs — S16 had said "nothing to port"
because the working tree lacks them. Read in full on that branch: `src/app/(main)/qanvast-ops/credits/{_api.ts,_hooks.ts,page.tsx,
contracts/page.tsx,leads/page.tsx,transactions/page.tsx}`, `qanvast-ops/reviews/{_api.ts,_hooks.ts,page.tsx,feedback/page.tsx}`,
`src/app/api/qanvast/[...path]/route.ts`, `src/lib/{qanvast-fetch,qanvast-cookies,qanvast-api}.ts`, `src/types/credits-api.ts`,
`docs/features/reviews/spec.md`, `src/data/mock-{credits,reviews}.ts` (unused by the branch's pages), `src/components/qanvast-ops/lead-info-modal.tsx`,
the rules in `src/lib/access-control.ts`, `scripts/migrations/{051,109}`, `src/app/admin/{settings,studios/[id]}/page.tsx`,
`src/components/layout/{app-sidebar,bottom-nav,topbar}.tsx`.

Register rows: `steps/reg-S41b5.md` (REG-S41b5.1…11). Probe: `design-source/verify/pending-modules/verify-pm2-s41b5.cjs` (+ its one-process seam
harness `pm2-s41b5-seam.mts`); shots in `design-source/verify/pending-modules/pm2-s41b5/`. **No migration. No repair** (R147…R159 unused —
every figure is read from records the demo already holds).

## Ledger — every 1.0 qanvast-branch Credits / Reviews piece, and its status

| 1.0 piece (`deployment/qanvast`) | Status | Where in 2.0 |
| --- | --- | --- |
| **Credits** page `credits/page.tsx` — "Credits · Manage your Qanvast lead credits and view usage." | **built** | Qanvast Ops › **Lead credits** › Overview — `/qanvast-ops/credits` (`app/qanvast-ops/credits/[[...view]]`, `components/qanvast/account/lead-credits.tsx`) |
| — Lead Credits Balance card | built | *Credits left* tile (`balanceOf` — the month's last transaction's free + paid, 1.0's rule) |
| — "Need more credits? Contact your BD to top-up credits" banner | built | the balance tile's help: "Need more? Ask your Qanvast account manager to top up." (no in-app top-up — Qanvast sells credits) |
| — *Lead Received vs Credits Used* (bars + line on two axes, hover readout, legend) | **built in 2.0's form** | two small charts, one axis each (the house ArticleChart: hover tooltips, *Show the numbers*); a dual-axis chart is the dataviz rule's first don't |
| — Monthly Overview table (Month · Leads Received · Budget Allocated · Credits Used · Closures) | built | *Month by month* on the listing's model (Column settings, phone cards), newest first, each month opening its statement |
| — Action cards View All Leads · View Contracts · View Transactions | built | the view chips (Overview · Transactions · Contracts) and the strip's Leads tab |
| — Closures in the last 6 months (Approved Contracts · Conversion Rate · Sum of Contracts) + 2 footnotes | built (**one 1.0 bug fixed**) | *Closures in the last six months* tiles; Sum of Contracts now sums what the contracts closed for (1.0 summed the leads' budgets) |
| **Contracts** `credits/contracts/page.tsx` (desk table + phone cards; Contract ID · Start · Contract Amount · Credit Amount · Min. Budget · Entitlement *View more*) | built | `/qanvast-ops/credits/contracts` — Contract · Started · Paid · Credits (+ free) · Leads’ budget · Includes (the counts as the cell's lines) |
| **Transactions** `credits/transactions/page.tsx` (month select back to the earliest transaction; Date · Description + sub-lines · Deductions · Credits · Balance; brought forward · total · carried forward) | built | `/qanvast-ops/credits/transactions?month=` — the month menu (house select, a sheet on a phone), the statement, a lead's client opening the studio's own lead (with the way back), a quiet month's door |
| **Lead Transaction Log** `credits/leads/page.tsx` (status chips, Export CSV, sort, Load more, Lead info modal) | **kept** — dead in 1.0 (`const allLeads = []`; the hub's *View All Leads* opened Qanvast Leads) | Qanvast Ops › Leads (status scope, Export, Filters, Column settings, the lead's page); 1.0's address lands there |
| `credits/_api.ts` · `_hooks.ts` (5 calls through the proxy) | built | the seam's `creditStatistics` · `contracts` · `transactions` · `earliestTransaction` (+ `leadCredits`) — `lib/qanvast-account/service.ts`; the mapping `lib/qanvast-account/model.ts` |
| `src/types/credits-api.ts` | built | `lib/qanvast-account/api.ts` (field for field; `lead.referenceId` added so a row opens the studio's lead) |
| **Reviews & Rankings** `reviews/page.tsx` — header + **Request Reviews** | built | Qanvast Ops › **Reviews** (`app/qanvast-ops/reviews/[[...view]]`, `components/qanvast/account/qanvast-reviews.tsx`), the header's one filled button |
| — Reviews tab: rating filter, sort (Most Recent · Oldest · Highest · Lowest · Responded · Unresponded) | built | Show chips (All · Waiting for a reply · Replied) + Rating and Sort menus |
| — Review card: title, stars, Read More / Show Less (200), thumbnails + lightbox (Standard size, ← →, counter), metadata line | built | the review card; the photo viewer is the house Dialog |
| — Response: Respond… box (5,000, counter), Submit / Update, Edit, toasts | built | Reply · Edit (DS text area, 5,000 counted), Post reply / Save reply, Discard asks, Write with AI (S29) |
| — Load more (12 a page) | built (better) | every page read so filters find every review; twelve shown at a time, *Show n more* |
| — Overview sidebar (Total · Avg · star distribution · "view all reviews" · "Get your homeowners to review…") | built | the Overview card (at the side; above it on a tablet / phone) |
| — **Rankings** tab (rank hero + listing link; four factors over 12 months and the year with * ^ footnotes and SuperTrust's link; tips; page views 7 days with change; Homeowner Feedback Overview, dashes below 2 answers; View More) | built | `/qanvast-ops/reviews/ranking`; the tip "Upload more projects" → *add it on Your public profile* (S27's home for the studio's work) |
| — RequestReviewDialog (Select Leads / All Closed Projects, search, link + Copy, WhatsApp step: editable message, per-contact Send → Opened, Back, Done n/m, toast) | built | *Request reviews* (`request-reviews-dialog.tsx`, the house message box) — doors: header, Overview, Ranking tip, ⌘K, Company › Profile › Reviews |
| **Feedback Insights** `reviews/feedback/page.tsx` (30 · 60 · 90 days, summary, Contact rate · Meeting rate · Meeting experience with SG average, coloured value, stacked bar, legend, reasons) | built | `/qanvast-ops/reviews/feedback?days=`; the big value in ink (red is for late and ours) — the bar and its legend carry green / yellow / red with words |
| `reviews/_api.ts` · `_hooks.ts` (`fetchReviews` · `postReviewResponse` · `fetchRanking` · `fetchFeedbackInsights`) | built | the seam's `reviews` · `reply` · `businessStatistics` · `feedbackStatistics` · `links` |
| `docs/features/reviews/spec.md` (the proxy-first design: the client knows only `/api/qanvast/…`) | built in 2.0's form | the client knows only the seam; the adapter decides the upstream (api-neo or QB) |
| **The proxy** `api/qanvast/[...path]/route.ts` + `qanvast-fetch.ts` (bearer cookie, refresh, 401 → login `?session=qanvast-expired`) + `qanvast-cookies.ts` | **stand-in** (the seam) | the adapter carries the token; a 401 → `QanvastSessionExpired` → the page's *Your Qanvast session expired · Sign in again* (S30's `signInHref({ reason: 'qanvast', next })`, whose words S30 already wrote) |
| Access: `ROUTE_ACCESS` credits / contracts / transactions / reviews → owner; Admin role without them; QB Designer hidden | built | `lib/qanvast-account/policy.ts` — the Owner; everyone else the tab's gate; Accounting the house gate; nothing asked of Qanvast for them |
| Sidebar / bottom nav / Tools grid entries (Credits · Reviews & Rankings, `isQanvastListed`) | built (tabs) / **kept** (the listed gate) | Qanvast Ops' strip; showing Qanvast Ops only to a listed studio stays S16's call (REG-1835: waits for the port of `is_qanvast_listed`) |
| `src/data/mock-credits.ts` · `mock-reviews.ts` (packages, sample reviews) | **not ported** — mock data the branch's pages never read | the demo's figures come from its own records (REG-343) |

## Found in 1.0, not on a card

- **`/qanvast-ops/leads`** (the Qanvast line's Qanvast Leads, read live from Qanvast with each lead's credits) — 2.0's Qanvast Ops › Leads already
  is it; its Credits column now reads the seam (REG-S41b5.7) and 1.0's address lands there.
- **`/qanvast-ops/credits/packages`** (older 1.0 lines, Demo / Staging: the credit packages) — lands on Contracts.
- **For S41b:** the older lines' `/qanvast-ops/portfolio` (S27's public profiles cover the job — no redirect added here), `/complaints` and `/promote`
  (S16: not drawn) still answer the app-wide page not found.

## Decisions taken (as recommended — her "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12 · "build all of them" 2026-10-11)

1. **Read live, keep no copy** — 1.0 kept no table; a balance and a reply must be current, and a reply is a write: one service slot (S37's
   pattern), not the feeds' hourly copy (S24 · S27). No migration.
2. **The Owner only** — 1.0's rule; flagged for Vicky (Admins may be expected to answer reviews).
3. **Two charts, not one on two axes** (the dataviz rule); **Sum of contracts fixed**; **every review page read** (1.0 filtered only what it had
   loaded); **Responded / Unresponded are Show chips**, not sorts.
4. **Request reviews defaults to the finished projects' clients, all ticked** (1.0 opened on Select Leads with none ticked; switching to All Closed
   Projects ticked them all — the likelier ask first). It sends **Qanvast's** write-a-review link (1.0's hard-coded `qanvast.com/sg/reviews/new
   ?company=`, "TODO: wire to real link from API" — now the seam's `links()`); Company › Profile's review link (S14) is the studio's own page and
   gets a door here, not a second home. Nothing is recorded (1.0 recorded nothing).
5. **The demo's stand-in is built from records**, its Qanvast-only facts said to be samples; its review link is on `.example` (REG-1910).
6. **No Dashboard row, no bell** — 1.0 surfaced neither an unanswered review nor low credits anywhere (its dashboard and notifications read
   neither). Doors added where 2.0 has them: ⌘K (three rows, Owner only), Maison AI (page suggestions + the Ask box's `qanvast_credits` ·
   `qanvast_reviews` — "lead credits" never answers with the AI credits again), Company › Profile › Reviews, the lead's crumb.

## What is a stand-in, and what is honest about it

- Every call to Qanvast is the stand-in (`lib/qanvast-account/demo.ts`): it answers from the demo's records and says so under every view
  ("Simulated on this prototype — …"). The contract (#20714), the rank (#27 of 1,186), page views, board pins, Singapore's averages and the
  sample reviews' words are samples; the credits, refunds, months, closures, reviews' people, projects, designers and pictures, and the
  homeowners' feedback are the records'. A reply is kept in the demo's store, and its snackbar says it wasn't posted.
- Swap: `setQanvastAccountService({ … })` in `lib/services/install.ts` — the 1.0 call behind each method is listed at the top of
  `lib/qanvast-account/service.ts`; registry `qanvast-account`; `services.md` section; `.env.example` `NEXT_PUBLIC_QANVAST_COMPANY_ID`.

## What to check in the browser

- **Dane (Owner), 1440:** Qanvast Ops › Lead credits — Credits left **2,000** (3,000 + 400 − 7 × 200), Used in October 0, **On the way back 200**
  (Farah Isa); the two charts (Jul 1 · Aug 6 leads; 200 · 1,200 credits); Month by month; Closures 0 · 0% · S$0. Transactions → *Show August
  2026* → six leads (each name opens the lead; its crumb reads "Lead credits / Leads"), carried forward 2,000; the month menu → July: +3,000 ·
  +400 · −200 (Arjun Mehta). Contracts: #20714. Qanvast Ops › Leads: Credits 200 each.
- **Reviews:** 8 reviews, 4.5 ★, Waiting for a reply · 2 (Shalini Menon's, Kenneth Ong's); photos open in the viewer; Reply → "Reply kept here
  …"; Edit; Cancel with changes asks. **Request reviews** → Shalini ticked → Next · 1 → Open WhatsApp (opens wa.me) → Opened → Done. Ranking:
  #27, Reviews 6, Rating 4.8, Projects 5; told: dashes (no Qanvast lead in 30 days). Feedback: 60 days → 2 of 6 answered, 100% contacted, 0%
  met, "We haven’t set a meeting date yet · 2"; 90 days → 3 of 7.
- **Hui Min (Admin) · James (Manager) · Germaine / Michelle (Designers):** both tabs show the gate; no Request reviews; ⌘K "lead credits" finds
  nothing of it; Company › Profile has no door. **Priya (Accounting):** the house gate.
- **390 / 320 (touch):** views wrap under the month menu; statement rows are cards (the description leading); Request reviews and the month menu
  are sheets; no sideways scroll.

## Probes run

All against `next start -p 3170` on a scratch copy of `pbuild/base.db`, migrated and repaired in the lane (`DATABASE_URL` on the command);
builds under the lanes' lock with `DATABASE_URL=file:<scratch>/build.db`.

| Probe | Tally |
| --- | --- |
| **`verify-pm2-s41b5.cjs`** (final build) — incl. the one-process seam harness `pm2-s41b5-seam.mts` **51 / 51** (a stub on 1.0's JSON, a failing Qanvast, a 401 → session expired, the Owner-only rule with no call made, the stand-in back) | **177 / 177** |
| `verify-pm2-s16.cjs` · `s14` · `s22` · `s24` · `s27` · `s37` · `s41b2` | 56 / 56 · 69 / 69 · 116 / 116 · 132 / 132 · 155 / 155 · 84 / 84 · 206 / 206 |
| `verify-pm2-s34.cjs` (all) · its § 2 with `CRON_SECRET` (the ops report's **15** slots, a deliberate change, commented) | 162 / 162 · 14 / 14 |
| Regression (`regression/run.cjs`, port 3170): `dane-p6` (its plain *Coming soon* now from Request Leads — deliberate, commented) · `search` · `view-as` | 41 / 41 · 27 / 27 · 23 / 23 |
| `ghosts/verify-ghosts-same.cjs` — Qanvast Ops' nine routes (Leads · Studios · Hangouts + the six new views), 1440 and 390 touch | 9 / 9 · 9 / 9 (0.00% apart) |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (16 warnings, all in files this step didn't touch) · nothing new breaks a house rule |

The step probes ran on the build before the last small changes (the rank link's words, the studio's short name in the request, the reply's
keyed snackbar, the session-expired state); the final build re-ran this step's probe, S34's § 2 and the ghosts. Widths looked at besides the
probe's 1440 · 390 · 320: 1024 and 768 touch — no sideways scroll, no page errors.

## Principles check

1. **The mock wins, every exception written down** — the mock (931:49232) draws the strip, which stays; the two tabs had no mock: built on house
   pieces, every invented word listed in REG-S41b5.1…11.
2. **One system, no one-offs** — StatTiles, Chips, the listing's table model (`CreditsTable`), ArticleChart, the house Dialog / ConfirmDialog /
   PortalMenu + SelectTrigger / EmptyState / MessageField / WritingHelp / DS TextArea; the card frame composed from the Overview's card; no
   hand-rolled head, menu or table; design:lint holds at its baseline.
3. **Plain words** — "Credits left", "On the way back", "Taken · Added", "Waiting for a reply", 1.0's reasons rewritten ("The designer didn’t
   follow up", "Didn’t show up"); BD → "your Qanvast account manager".
4. **Nothing is lost** — a typed reply asks before it is discarded; Reset message in the request; nothing here deletes (1.0 had no reply delete).
5. **Say why** — the gate says whose it is; a failed read says Qanvast didn't answer (Try again); an expired session says so (Sign in again);
   "–" with "it takes 2 answers"; a quiet month says so; a person with no mobile says so; a message without the link says so.
6. **Back returns where you came from** — a lead opened from the statement goes back to it ("Lead credits" crumb); Ranking → Your public profile
   carries `?from=`; a dialog opened by the address leaves the plain address on close.
7. **Every screen is whole** — shell, header, strip, one ghost per view (the gate's own for a non-Owner), empty states, the error and
   expired states, Maison AI's suggestions on every view.
8. **Every width is designed** — 1440 · 1024 (one column, the Overview above) · 768 · 390 · 320: phone cards, sheets, the views' own row, no
   sideways scroll (probe-checked at 390 and 320).
9. **Tables follow the leads listing** — Month by month, the statement and Contracts on the table core: frozen first column, Column settings,
   resizable / draggable heads, phone cards.
10. **Motion with purpose** — house pieces only (the dialog's sheet, the chips, the reveal).
11. **Honest data** — every figure is read from the demo's records or said to be a sample; no repair needed; the probe checks each figure
    against SQL (credits, months, closures, reviews' people and pictures, the feedback's counts).
12. **Reach for everyone** — chips are radio groups (arrows), menus keyboard-walkable, the viewer's ← →, stars with an accessible "n out of 5
    stars", the feedback bars with their labels and counts (never colour alone), ⌘↵ posts a reply, every icon button named with a tooltip.

How to add a missing thing: **one home** (the two tabs the mock drew; Request reviews' doors open it); **shown only when it applies** (On the way
back, the quiet month's door, Reply only on a waiting review, the gate instead of figures); **one filled button** (Request reviews; Reply is
outlined); **defaults need no set-up** (the stand-in answers from the records; nothing to configure).

## Shared pieces changed

- `components/qanvast/qanvast-tabs.ts` — Lead credits and Reviews hrefs, every tab live (the Studios / Hangouts / Leads pages read it).
- `components/shell/global-search.tsx`, `components/shell/app-shell.tsx`, `app/(editor)/layout.tsx` — an `owner` prop for Owner-only ⌘K rows
  (`SearchPage.owners` in `lib/global-search/model.ts`).
- `lib/services/slots.ts` (+ `qanvast-account`, the fifteenth slot), `lib/services/registry.ts` (+ entry, `SIMULATED_WORDS.qanvastAccount`),
  `components/company/integrations-view.tsx` (`Simulated` leaves the new key out).
- `lib/maison-ai/intents.ts` · `answer.ts` (+ `qanvast_credits` · `qanvast_reviews`; `credits` no longer takes "lead credits") — **lanes: merge
  other lanes' intents by hand**.
- `lib/nav.ts` `fromLabel` (Lead credits · Reviews), `lib/links/old-addresses.ts` (three addresses), `lib/leads/qanvast.ts` (Credits from the
  seam, `credits: number | null`), `components/qanvast/{qanvast-table,qanvast-leads}.tsx` ("—"), `components/company/profile-view.tsx` +
  `company-ghosts.tsx` + `lib/company/review-link.ts` (Reviews' door), `app/company/profile/page.tsx`.
- Probes updated deliberately (commented): `verify-pm2-s34.cjs` (slots 14 → 15), `uat-dane-2026-10-01/P6/verify-p6.cjs` (the plain Coming soon
  now comes from Request Leads — Lead credits is live), `ghosts/verify-ghosts-{same,strips}.cjs` (+ the six views).

## For the next steps

- **S41b:** the older 1.0 lines' `/qanvast-ops/portfolio` · `/complaints` · `/promote` (above). Showing Qanvast Ops only to a Qanvast-listed
  studio (1.0's `isQanvastListed`) still waits for the port's `studios.is_qanvast_listed` (S16).
- **S42:** the demo's Qanvast leads are dated Jul–Aug 2026; as the calendar moves, the six-month chart, the 30/60/90-day feedback and "the last
  12 months" age with them (the demo-ageing note) — a re-anchor of the demo's recent moments would keep them current.
- **For Vicky:** Owner-only (1.0) — should Admins read or reply? The Request reviews default (finished projects first, ticked). No in-app top-up
  (Qanvast sells credits through its account managers, as 1.0 said).
