# 6 · The client portal — what 2.0 still lacks from 1.0 (read-only audit, 2026-10-07)

Reviewer 6 of 7. Inventories covered: `projects-1.0-inventory/I-homeowner-side.md` (I-01…I-427) and
`M-portal-setup-admin-side.md` (M-001…M-310), with M §19's corrections applied (I-378 and I-419 partly wrong, I-393 replaced by
M §8–§11). 1.0 read at `qanvast-id-tool` `integ/security-non-qanvast` @ `620190192`; 2.0 = the working tree (`app/my/**`,
`components/portal/**`, `lib/portal/**`, `app/portal/**`, `app/company/portal/**`, `components/company/portal/**`, plus the
confirmation / signing / renders links the portal opens). Nothing was run.

## Bottom line

2.0's portal covers most of what a 1.0 client could do and fixes 1.0's worst holes. A client signs in with a phone number and a
code. Home starts with *What needs you* and the steps before work starts. They can confirm a finished stage, read updates with
photos, pay (PayNow QR with the amount, *I have paid* with proof, receipts), approve a variation order, pick a choice, open their
designs and files, read a bell, and share access with their household. The studio has a real invite / opened / withdrawn state, a
preview that needs no client login, Company › Client portal (address, Live / Paused enforced on the server, checklist, Clients
tab), and six section switches enforced on the server.

Most of what 1.0 had and 2.0 doesn't was dropped on purpose by Q-37…Q-50: five layouts, twelve themes, login-screen layouts,
branding fine-tuning, greeting tone, renamed tabs and fifteen switches. Four client-facing things are parked for later by a call:
support tickets and chat (Q-43), automatic SMS / email to the client (Q-41), About / Team pages (Q-47) and floor-plan mark-up
(Q-19). One of these is a step back that the calls never named. 1.0 did email the client automatically for *invoice sent*,
*signature requested* and *timeline published* (`src/lib/notifications/dispatch.ts:391-427`). Inventory I said it didn't (I-114).

Gaps with no call behind them:
- The client's bell never rings for a quote, agreement or variation order to sign, or for a new file or design.
- A client can't reject a choice or ask for other options.
- A client can't decline a variation order on the record.
- The client's schedule shows a blocked stage as "Under way", with no reason or restart date, and doesn't show where payments fall.
- Shared designs disappear from the portal 7 days after sharing, when their link expires.
- There is no CaseTrust step at signing.
- There are no to-dos the studio can give the client.

## Features

| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |
|---|---|---|---|---|---|---|
| **The client's bell rings for everything that waits on them** | I-104…I-112 | Partly | The bell has rows for schedule shared or changed, a new update, a stage to confirm, a choice, an invoice (sent, due in 3 days, overdue) and a payment (confirmed or not received). 1.0 also rang for *a new quote was shared* (I-110), *ready for your signature* (I-111) and *variation order needs your approval* (I-106). In 2.0 these show only in *What needs you* on Home. A newly shown file or a newly shared design rings nothing either (left open in round 9's register rows). Ticket replies have no home because there are no tickets. | Medium | S | `lib/portal/notifications-model.ts` `BellKind` / `BELL_PRODUCERS` (no quote · contract · VO · file · design kind) |
| **Choices: reject, ask for other options, the client's receipt** | I-282…I-287 | Partly | Built: the options with prices, a pick with a note, *Confirm {option}*, the price difference (GST-inclusive), the studio told, and a variation order drafted from the pick. Missing: 1.0's **Reject** and **Request changes** (I-284). A client who likes none of the options can only write a note and must still pick one. Also missing: the per-pick **selection receipt PDF** under Documents (I-287). The map's D-10 still waits on Vicky for porting 1.0's rejected / change-requested rows. | Medium | S | `components/portal/choices/choice-board.tsx` (pick + note only), `app/portal/choices-actions.ts` `chooseOption`; map 24 §8 D-10 |
| **Decline a variation order, on the record** | I-292, I-293, I-302 | Partly | Built: approving on the confirmation link (type a name, *Approve the changes*), which moves the contract and re-sizes the drafts. 1.0's **✗ Reject** with an optional reason, recorded as *rejected* and sent to the studio as `vo.client_rejected` (I-293, I-310), is missing. 2.0 offers *Ask for a change*, which opens WhatsApp to the designer. No decline lands on the order or on the Money tab. Also missing: the inline list of variation orders with expandable lines on the client's Money page. Orders are reached through Files › Documents and *What needs you*. | Medium | S | `components/quotes/confirm/confirm-page.tsx` (Approve · Ask for a change); `lib/portal/needs.ts` (VO need) |
| **The client's schedule tells the whole story** | I-251…I-256 | Partly | Built: stages in order with Done / Under way / Coming up, *Since you last looked*, the designer's note and answered stages kept. Missing: **a blocked or paused stage, with its reason and restart date**. 1.0 showed "Paused — {reason} · Resuming around {date}" (I-254). 2.0 maps *blocked* to "Under way" for the client. Also missing: **payment points on the timeline** (1.0's "Payment S$x (30%) · Paid", I-253; Money shows them separately), invoices on the timeline, the filter chips (All · Payments · In progress · Blocked · Upcoming) and the one "you are here" row. | Medium | M | `lib/projects/schedule-model.ts` `ClientState` + `clientStateOf` (blocked → in_progress); `components/portal/project/portal-schedule.tsx` |
| **Designs stay on the client's page** | I-96…I-99, I-270…I-279, I-281 | Partly | Built and better than 1.0: favourite, a note, pins and replies on the renders link; the studio replies, resolves and reopens pins and is notified. 1.0 never notified the studio (I-281). Missing: in 1.0 a shared render stayed on the portal for good (`homeowner_shared_assets` has no expiry). In 2.0 the Designs tab lists only live share links, which expire after **7 days** (`SHARE_DAYS`). After that, the design vanishes from the client's portal until someone renews the link. | Medium | S | `lib/portal/designs.ts` (`readShareLink` state open only); `lib/visualizer/policy.ts:62` `SHARE_DAYS = 7`; `app/renders/actions.ts`; `app/visualizer/actions.ts` `replyPin` · `setPinStatus` |
| **CaseTrust deposit-protection step when signing (Singapore)** | M-260 | Missing | 1.0's Feature Flags › *CaseTrust signing step* added a disclosure box and a required tick to the signing step (I-356, I-357). 2.0's signing pages have no such step, and Lock-project-on-handover is covered by Completed being read-only (Q-24). The contracts audit parked this as **Later** (CP-17) without a numbered call. | Medium | S | no `casetrust` in `app/` · `components/` · `lib/` beyond `lib/templates/assets.ts`; `07-contracts-…audit` CP-17 |
| **To-dos the studio gives the client ("Your to-dos")** | I-95, I-244 | Missing | 2.0 has no task assigned to the client and no to-do list on the portal. 1.0 had Homeowner Tasks: title, description, due date, pictures, ticked by the studio. The developers' map lists it as not built ("a homeowner's own to-dos", map 24 §10) with no call. 1.0 shipped it off by default, and a Choice with a *needed by* date covers the commonest case. | Low | M | `lib/portal/needs.ts` `NEED_PRODUCERS` (no task kind); `24-…migration-map` §10 |
| **Review before the client sees it: updates and the timeline** | M-258 | Partly | Built: *Updates need review* (Q-17; an Owner's or Admin's post publishes at once). Missing: 1.0's **Timeline approval required**, where an owner approves the schedule before it goes live. In 2.0 anyone on the team presses *Share changes* and it reaches the client at once. 1.0's per-member approvers ("add extra members to route this approval to") were dropped too (map D-14, still waiting on Vicky). | Low | S | `app/settings/projects-settings.tsx` (Updates review only); `app/projects/schedule-actions.ts` `shareSchedule` (no approval) |
| **Updates feed extras** | I-257…I-261 | Partly | Built: the newest-first feed, photos with a viewer, video, documents, a *New* mark and *Confirm this stage*. Missing: **Search updates** once there are more than three (I-257), the type pill (check-in · check-out · site update, I-258), and the **invoice chip** on an update tied to an invoiced milestone (I-260). | Low | S | `components/portal/project/portal-updates.tsx` |
| **Documents: grouped, with selection receipts** | I-321…I-325 | Partly | Built: quotes, agreements and variation orders with their state (Signed · Confirmed · Sent), the files shown to the client, and receipts on Money. Missing: **selection receipts**, grouping by kind (contracts · quotes · VOs · renders · floor plans · site photos) and a payment-receipt group in the documents list. | Low | S | `components/portal/portal-files.tsx`; `lib/portal/home.ts` `docsOf` |
| **The questionnaire on the studio side: answer history** | M-169…M-175 | Partly | Built: *By Client* / *By Studio* on each answer, answering for the client, *Ask the client*, and the answers reading back on the lead. Missing: the clock icon's **answer history** (every overwrite kept as old → new, M-170, M-175) and the 5-minute throttle on asking again (M-173). | Low | S | `components/leads/questionnaire/question-card.tsx`; `app/leads/portal-actions.ts` `askClient` |
| **A progress update written for the client when a designer asks for more time** | M-262 | Missing | 1.0's Proactive Alerts › *Auto-create progress update* added an update, through the review rule, when a designer asked for an extension. 2.0 has no equivalent. This belongs to the schedule more than the portal. | Low | S | no match for "proactive" / "extension" in `lib/` · `app/` |
| **Support tickets: report an issue with photos, follow the replies, close it** | I-93, I-326…I-335 | Left out on purpose (later) | **Q-43**: "'Message your designer on WhatsApp'; tickets and chat later". Map 24 §10 lists it under *Client contact and tools*. The client loses a tracked defect report with photos, categories, a thread and Close; *Contact your designer* opens WhatsApp instead. | — | — | `components/portal/contact-line.tsx` |
| **Chat with the studio inside the portal** (plus *Show chat history* at invite and the client conversation the invite made) | I-10, I-37, I-38, I-336…I-338 | Left out on purpose (later) | **Q-43** (as above). It was off by default in 1.0. | — | — | `components/portal/contact-line.tsx` |
| **The client is told outside the portal** (automatic email / SMS) and Settings › Notifications › *Customer Notifications* | I-114, M-265 | Left out on purpose (later) | **Q-41**: "A WhatsApp message the studio sends in one press + the portal's bell; automatic SMS / email later". 2.0 drafts WhatsApp for invite, resend, remind, an invoice and a payment reminder. Nothing reaches the client by itself. Note that 1.0 did email automatically (see *Things the inventory missed*). | — | — | `lib/portal/model.ts` `inviteMessage` · `remindMessage`; `app/portal/remind-actions.ts` |
| **About the studio, Our Team and the studio's profile on the portal** (story with images and video, year, awards, contact, socials, footer links Privacy · Terms · Contact; Team cards) | I-184, I-199, I-200, I-202, I-203, I-393, M-143…M-157, M-189…M-213 | Left out on purpose (later) | **Q-47**: "About / Team later, from Company › Profile and Members". Scope, the fourth part of I-393, is built (see the question bank row below). | — | — | `24-…migration-map` §3.9 (`studioProfile` · `aboutTeam` · `aboutUs` → —) |
| **Floor-plan collaboration in the portal** (view, upload a plan, draw / pin / comment, approve a layout) | I-289 | Left out on purpose (later) | **Q-19**: "Floor-plan mark-up and the 3D planner later, own modules". | — | — | — |
| **Credit notes on the client's Money** ("Credits issued −S$x") | I-294 | Left out on purpose (later) | **F-09**: "No credit notes in this build: an omission bigger than the drafts can absorb shows as 'S$x to credit'". The totals part of I-294 is built (*Paid so far* of the contract, what's due per stage). | — | — | `components/portal/money/portal-money.tsx` `PaidSoFar` |
| **Five portal layouts, twelve themes, branding fine-tuning, fonts, favicon, login logo, cover photo, watermark, six login-screen layouts, trust badge** | I-138…I-144, I-171, I-185…I-193, I-387…I-391, M-090…M-102, M-104, M-105, M-107…M-136 | Left out on purpose | **Q-39**: "The studio's brand kit (logo, colour) on 2.0's type and one layout". **Q-44** (the set-up page): "Not taken: themes, layouts, login layouts, fine-tuning". | — | — | `lib/portal/queries.ts` `fetchPortalLook` (brand kit logo + accent) |
| **Greeting tone and renaming the portal's tabs** (Voice) | I-194, I-392, M-137…M-142 | Left out on purpose | **Q-44**: "Not taken: … greeting tone, tab renaming". 2.0 greets with "Hello {first name}". | — | — | `components/portal/portal-home.tsx` |
| **Fifteen studio-wide feature switches** | I-385, M-073…M-089 | Left out on purpose | **Q-45**: "Six section switches (Schedule · Updates · Money · Files · Designs · Choices), all on, enforced on the server". 1.0's fifteen map onto six, and the rest have no switch (map 24 §3.9). Built: the six, refused on the server, on pages, actions, files and the bell. | — | — | `lib/portal/sections.ts`; `components/company/portal/portal-sections-card.tsx`; `lib/portal/session.ts` `portalGate` · `portalActor` |
| **Every lead with a phone gets portal access automatically** | I-39 | Left out on purpose | **Q-38**: "only numbers the studio added". Access now starts at the invite. | — | — | `app/portal/actions.ts` `requestCode` (invited links only) |
| **A real SMS code and rate limits** (Twilio Verify) | I-165 | Left out on purpose | **Q-38**: "in the prototype the code step shows and any six digits pass". The developers wire SMS (map 24 line 318). | — | — | `app/portal/actions.ts` `verifyCode` |
| **Paying online by card** (1.0 showed only a disabled "Coming soon") | I-311 | Left out on purpose | **F-15**: "no card payments"; the portal proposal: "Not taken: … online card payment". | — | — | — |
| **Old client links: `/pay` portal, public invoice / receipt pages, `/my/{slug}/p/{token}`** | I-372…I-377 | Left out on purpose | **Q-37** (the portal replaces the single client link) and map 24 **D-11** (redirect each to the studio's sign-in, still waiting on Vicky). A client who was never invited gets an invoice as WhatsApp text with the bank details and no invoice page (REG-1056). | — | — | `lib/projects/invoices-model.ts` `invoiceMessage` |
| **Countries beyond Singapore** (dial-code picker, MY / AE / IN, DuitNow, the family member's country) | I-153, I-172, M-234 | Left out on purpose | **REG-547** "One Singapore phone rule"; map 24 §10 "Regions: countries beyond Singapore". | — | — | `lib/format.ts` `isSgPhone`; `lib/portal/model.ts` `waLink` (+65) |
| **OpenMaison's platform admin and usage numbers for the portal** (per-studio switch, Studios list *Portal* column, create-studio, portal logins / issues reported, Studio Health) | I-378, M-012…M-019, M-281…M-295 | Left out on purpose | Audit 22 (set-up side): "For the developers' map only: a platform switch that really closes a studio's portal, and usage counts". Accounts Setup **Q-16**: Studio Health "No — the platform's telemetry". The developers' map (24) does not carry the switch or the counts (see *Uncertain*). | — | — | `app/settings/studio-settings.tsx` (Studio Health stays out) |
| **Invite the client — the Client access panel** (from the lead, the project kebab, Getting started and the listing's row; WhatsApp in one press; copy the address; Not invited · Invited, not opened · Opened {when} · Withdrawn; resend; withdraw with Undo; mobile check) | I-01…I-09, I-11…I-24, I-28…I-36, I-40, I-41, I-44 | Built | Better than 1.0: a real state, last opened, withdraw (1.0 had no revoke, I-41), and the client team's rule. | — | — | `components/portal/client-access-panel.tsx`; `app/portal/studio-actions.ts` `inviteClient` · `withdrawAccess` · `undoWithdraw`; `lib/portal/model.ts` `accessChip` · `inviteMessage` |
| **See it as the client** (the real pages, read-only, an hour, a preview bar with *Close preview*, refused writes; plus the Schedule's *What {client} sees* pane) | I-51…I-67, I-70…I-72 | Built | Needs no client login (1.0's I-73 defect). | — | — | `lib/portal/session.ts` `startPreview` · `readPreview`; `app/my/[slug]/preview/route.ts`; `components/portal/portal-frame.tsx`; `components/projects/schedule/client-schedule.tsx` |
| **The studio hears the client's answer on a stage** (bell, needs-attention reason, the row's line) | I-80…I-84 | Built | Replaces 1.0's banner, whose rows did nothing (I-83). | — | — | `app/portal/project-actions.ts` `answerStage` (`stage_confirmed` · `stage_changes`); `lib/projects/attention.ts` `client_concern` |
| **The client sees only what the studio shared** (the schedule's last share, files *Shown to client*, quotes and agreements sent, published updates, shared choices, VOs sent, invoices sent; per-item control, studio-wide sections) | I-85…I-92, I-94, I-401 | Built | Server-side, never only in the browser (1.0's I-240). | — | — | `lib/portal/home.ts` `loadHomeFacts`; `lib/portal/files.ts` `PORTAL_FILE_RULES`; `app/portal/studio-actions.ts` `setFilesShown` |
| **The client's bell itself** (count, list, open a row, mark all read, each person's own reads, the household) | I-113, I-339…I-341 | Built | — | — | — | `components/portal/bell.tsx`; `app/portal/bell-actions.ts`; `lib/portal/notifications.ts` |
| **Family members → someone else from the household; Project Links → the Clients tab; update the contact number** | I-115…I-129, M-230…M-233, M-235…M-241 | Built | Each person signs in with their own number and has their own invite, opened, withdraw and remove. A lead-stage member follows into the project (1.0's M-236 lost them). A changed lead phone moves the sign-in. The Clients tab has search and state. The household dialog doesn't take 1.0's optional email. | — | — | `app/portal/household-actions.ts`; `components/portal/household-rows.tsx`; `components/company/portal/portal-clients-view.tsx`; `lib/portal/sign-in.ts` `movePortalSignIn` |
| **Sign in with a phone and a 6-digit code** (resend after 30 s, paste, Enter, "not added" / "access stopped" / paused / unknown address states, 30-day session, sign out, back to the page asked for, `/my` → the studio's address) | I-135…I-137, I-145, I-146, I-149…I-152, I-154…I-161, I-164, I-166…I-170 | Built | — | — | — | `components/portal/portal-sign-in.tsx`; `app/portal/actions.ts`; `lib/portal/session.ts`; `app/my/page.tsx`; `app/my/[slug]/gone/page.tsx` |
| **The studio's own words on the sign-in page** (1.0's login title, subtitle and welcome message) | I-147, I-148, M-103, M-106 | Built | One welcome line of 80 characters (**Q-44**). Tagline and trust badge not taken. | — | — | `lib/portal/sections.ts` `WELCOME_KEY`; `app/portal/sections-actions.ts` `setPortalWelcome` |
| **Portal home** (hello, *What needs you* replacing 1.0's count tiles and attention box, each home with its stage, before-work steps, progress, project details, latest update, money card, designs, sign out, empty / ghost) | I-182, I-183, I-195…I-198, I-201, I-204, I-206, I-213, I-242, I-243, I-245, I-250 | Built | — | — | — | `components/portal/portal-home.tsx`; `lib/portal/needs.ts` `NEED_PRODUCERS` · `BEFORE_STEPS`; `components/portal/project/home-cards.tsx` |
| **The portal's tabs and frame** (studio mark, tabs at a desk, phone bar + More, a section switched off loses its tab, deep links that land) | I-222…I-232, I-234, I-235 | Built | — | — | — | `lib/portal/model.ts` `PORTAL_TABS` · `portalBar`; `components/portal/portal-frame.tsx` |
| **Confirm a finished stage** (Looks good · Something is not right with a note; the answer stays) | I-246…I-249 | Built | **Q-16**: only when the studio asks. | — | — | `components/portal/project/portal-schedule.tsx`; `app/portal/project-actions.ts` `answerStage` |
| **Money** (contract value and what it's made of; the signed quote; invoices on the studio's paper; how to pay with bank, PayNow QR carrying the amount and reference, copy buttons, the entity's uploaded QR; *I have paid* with proof; the confirmer told; trust mode; receipts; VO approval re-sizes the drafts; no costs reach the client; one bank store) | I-290, I-291, I-295…I-301, I-303, I-305…I-310, M-254…M-257, M-263 | Built | **Q-48 · F-02 · F-07 · F-08 · F-10…F-15**. Receipts come only once confirmed (F-12), where 1.0 issued one per proof (I-308). The pay box shows no branch code or SWIFT. | — | — | `components/portal/money/portal-money.tsx` · `pay-box.tsx` · `i-have-paid.tsx` · `portal-doc.tsx`; `app/portal/payment-actions.ts` `sayPaid`; `lib/projects/payments-paynow.ts` |
| **Before work starts** (1.0's lead-stage page: the quotes shared, which one to sign, sign with read-and-accept and a drawn signature, the legal line, signed state, the deposit) | I-343…I-351, I-353…I-357, I-359…I-363 | Built | On Home's steps, opening today's `/confirm` and `/sign` links (Q-40). The CaseTrust box is the Missing row above. | — | — | `lib/portal/needs.ts` `BEFORE_STEPS`; `components/portal/portal-home.tsx` `BeforeWork`; `app/sign/[id]` |
| **Questions for the client on the portal** (any stage — 1.0 showed them only before a quote; the needed ones marked; change an answer later) | I-352, I-358, I-364, M-176…M-179 | Built | — | — | — | `app/my/[slug]/questions/[homeId]/page.tsx`; `components/portal/portal-questions.tsx`; `app/portal/actions.ts` `answerQuestions` |
| **The question bank** (add, edit, reorder, needed, on / off) | M-158…M-168 | Built | Lives in Company › Questionnaire (REG-612). | — | — | `components/company/questionnaire-view.tsx`; `app/company/scope-questions-actions.ts` |
| **The portal's address** (made from the studio's name; reserved words refused; taken said plainly; a change keeps the old address working, with Undo) | I-384, M-039…M-041, M-055…M-060, M-276, M-277 | Built | **Q-44**. | — | — | `lib/portal/model.ts` `slugFromName` · `RESERVED_SLUGS` · `slugProblem`; `lib/portal/queries.ts` `currentPortalSlug` · `resolvePortalSlug`; `app/portal/studio-actions.ts` `setPortalAddress` |
| **Live / Paused** (every client page and request, today's four links kept) | I-386, M-051, M-052 | Built | **Q-50**. | — | — | `app/portal/studio-actions.ts` `setPortalPaused`; `lib/portal/session.ts` `portalGate` |
| **Company › Client portal** (one page; Owners and Admins change it, checked on the server; *Getting it live* checklist; works out of the box with every section on) | I-379…I-383, M-001…M-011, M-022…M-030, M-032…M-037, M-049, M-050, M-271…M-275, M-278…M-280 | Built | **Q-44 · Q-49**. One door, not 1.0's two (M-001, M-008). | — | — | `components/company/portal/portal-setup-view.tsx`; `lib/portal/queries.ts` `fetchPortalSetup`; `lib/portal/model.ts` `mayRunPortal` |
| **See the portal as a client from set-up** (1.0's live preview) | I-394, M-214…M-229 | Built | The real page for a sample client in a phone frame, plus *Open as a test client*. 1.0's desktop / phone switch and its mock views are not drawn. | — | — | `components/company/portal/portal-setup-view.tsx` (*What a client sees*) |
| **Invoices need approval before they're sent** | M-259 | Built | **F-05**. | — | — | `app/settings/projects-settings.tsx`; `lib/projects/invoices-model.ts` |
| **The company's logo and colour carry into the portal** | M-253 | Built | **Q-39** (the brand kit). | — | — | `lib/portal/queries.ts` `fetchPortalLook` |
| *Not a product feature* — 1.0 motion and loaders | I-25…I-27, I-69, I-162, I-163, I-207…I-209, I-233, I-280, I-304, M-031, M-053, M-054 | Not a product feature | 2.0 uses its own motion and ghosts. | — | — | — |
| *Not a product feature* — 1.0 routes, data shapes, polling, the settings APIs and the Accounts page frame | I-42, I-43, I-68, I-100…I-103, I-205, I-210…I-212, I-312, I-395…I-400, M-180, M-242…M-252 | Not a product feature | — | — | — | — |
| *Not a product feature* — the set-up hub's autosave / reset / save mechanics | M-038, M-042…M-048, M-061…M-072 | Not a product feature | — | — | — | — |
| *Not a product feature* — 1.0 defects in invite, preview, family and sign-in (already avoided) | I-45…I-50, I-73…I-79, I-130…I-134, I-173…I-181, M-020, M-021 | Not a product feature | — | — | — | — |
| *Not a product feature* — 1.0 defects on the portal's pages | I-214…I-221, I-236…I-241, I-262…I-269, I-288, I-313…I-320, I-342, I-365…I-371 | Not a product feature | Includes the dead quote-line comment route (I-318). | — | — | — |
| *Not a product feature* — 1.0 defects in set-up and its settings (dead switches, the dead *Sharing Methods*, three bank stores, scope defects) | I-402…I-410, M-181…M-188, M-261, M-264, M-266…M-270 | Not a product feature | — | — | — | — |
| *Not a product feature* — dead code (satisfaction route, unused components, hooks bug) | I-411…I-414 | Not a product feature | — | — | — | — |
| *Not a product feature* — where 1.0's docs disagree with its code | I-415…I-427, M-296…M-310 | Not a product feature | — | — | — | — |

Counts by status: Missing 3 · Partly 9 · Left out on purpose 15 (6 of them "later": tickets, chat, automatic messages, About /
Team, floor plan, credit notes) · Built 21 · Not a product feature 8 groups.
All 427 I rows and 310 M rows are covered, each in one line.

## Top gaps

1. **Support tickets** (later, Q-43). A client can't report a defect with photos and follow it to *Resolved*. Every issue becomes a
   WhatsApp thread the studio can't track or count. A client notices this first once work starts.
2. **Automatic messages to the client** (later, Q-41). Nothing reaches a client who isn't looking at the portal unless a designer
   presses WhatsApp. 1.0 emailed *invoice sent*, *signature requested* and *timeline published* by itself, so for those this is a
   step back.
3. **The bell never rings for something to sign.** A quote to confirm, an agreement to sign and a variation order to approve wait
   silently on Home, and new files and designs never ring. 1.0 rang for the first three.
4. **Designs vanish from the portal after 7 days.** Share links expire and the Designs tab lists only live ones. A client who comes
   back to compare finishes finds an empty tab.
5. **A choice can't be refused.** A client who likes none of the options must pick one or write a note. 1.0 had Reject and Request
   changes, and the map's D-10 still waits on that data.
6. **A variation order can't be declined on the record.** *Ask for a change* opens WhatsApp, so the order stays *Sent* with no
   recorded "no" and no reason.
7. **A blocked stage reads "Under way" to the client.** The client sees neither the reason nor a restart date (1.0: "Paused —
   reason · Resuming around …"). They also don't see where payments fall on the schedule.
8. **No CaseTrust step at signing.** Singapore studios accredited by CaseTrust are expected to show the deposit-protection
   disclosure, which 1.0 could add as a flag.
9. **In-portal chat and the studio's About / Team pages** (later, Q-43 · Q-47). These are the softer parts of a studio's
   "branded space". Chat was off by default in 1.0, but About and Team were a selling point of 1.0's portal set-up.
10. **No to-dos for the client.** "Bring the keys Friday" or "Pick the tile by Monday" can only be a Choice or a WhatsApp message.

## Things the inventory missed

- **1.0 did email the client automatically.** I-114 says "There is no homeowner SMS, WhatsApp or email for any of them", which
  is true of the bell helper `src/lib/homeowner-binding.ts`. But `dispatchNotification` sends an **external email** to the
  client wherever a route passes `externalEmail` (`src/lib/notifications/dispatch.ts:391-427`). *Functional* events always go;
  *informational* ones follow Settings › Notifications › Customer Notifications. The emitters:
  - `invoice.sent`: `src/app/api/projects/[id]/invoices/milestone/route.ts:535-545`, `…/invoices/adhoc/route.ts:363`,
    `src/app/api/finance/invoices/[id]/send/route.ts:277-284`.
  - `quote.signature_requested`: `src/app/api/quotes/request-signature/route.ts:1003-1010`, and the resend route.
  - `contract.composed_sent`: `src/app/api/contracts/send-to-client/route.ts`.
  - `project.timeline_published`, to the email on a homeowner profile: `src/app/api/projects/[id]/notify-publish/route.ts:70-91`.
  - `escalation.resolved`: `src/app/api/escalations/[id]/status/route.ts:97-114`.
  - The floor-plan routes.

  M-265 lists these events but not where they fire. Q-41 ("automatic SMS / email later") therefore takes away real emails 1.0
  sent.
- **1.0's shared renders never expired.** `homeowner_shared_assets`
  (`supabase/migrations/20260323000001_homeowner_portal.sql:42`) has no expiry or revoke column, so a shared render stayed on
  the portal until un-shared. No row says so, and 2.0's 7-day share link changes it (top gap 4).

## Uncertain

- **The platform switch and usage counts.** Audit 22 sends "a platform switch that really closes a studio's portal, and usage
  counts" to the developers' map. A search of `24-projects-migration-map-2026-10-05.md` for "platform", "usage" and "logins"
  finds nothing, so the item may have been dropped rather than handed over.
- **Rows listed "for Vicky".** Map 24's D-10 (choices answered *rejected* / *change requested*), D-11 (old client links) and
  D-14 (per-member update approvers) are still in its decisions table for Vicky. I treated D-11 as covered by Q-37. I did not
  treat D-10 or D-14 as calls, so those features read Partly.
- **CaseTrust.** I rated it Missing, not Left out: the contracts audit marks it *Later* (CP-17) without a numbered call. Whether
  that row counts as an accepted call is the owner's to say.
- **1.0's emails.** I didn't check whether 1.0's email sending was configured in production, for example a Resend key on this
  branch. The code path exists; whether clients really received the emails is not known.
- **Bell gaps.** Whether *a newly shared file or design rings no bell* is still open is read from the round-9 note in the build
  record. I didn't check the register row's final state.
- **Per-project switches.** 1.0 had none (I-401), and the map's "a per-project portal switch" is listed as not built. I didn't
  count it as a gap against 1.0.
- **Floor plan.** 1.0's floor-plan canvas (`src/components/floor-plan-collab/*`) was not read by inventory I either. Its
  client-side capability is taken from I-289 alone.
