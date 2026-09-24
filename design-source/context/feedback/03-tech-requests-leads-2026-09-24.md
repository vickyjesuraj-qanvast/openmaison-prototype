# The studios' Leads requests — the third sheet, audited against 2.0 (2026-09-24)

Source: the Tech Feature Request sheet (`1nRylNpelEd8eo5gYXgE7YMI7kzL03qQm7OERjhw8I_k`, tab gid 1489139182, 111 rows). The quotes / templates / price-book rows were built as REG-584…597 (`02-tech-requests-quotes-templates-2026-09-23.md` §5). This is the round that was held: every row about leads, their capture, their assignment, their follow-up and the notifications around them — checked against the prototype's code, reported only. Nothing here is built.

Rows read as Leads: 8, 9, 10, 17, 20, 25, 28, 35, 62, 68, 71, 72, 73, 88, 89, 101. Ops rows that touch leads but are not product changes: 27 (remove test data), 40–43 and 107 (create accounts). Portal rows (21, 49) belong to Projects.

## 1. Row by row

| Row | Studio · status | Ask | 2.0 today | Gap |
|---|---|---|---|---|
| 62 | Flipstone · Done in 1.0 | Add TikTok (and others) to the lead sources | `lib/leads/enums.ts` `SOURCES` is a fixed list of 12 (Qanvast · Instagram · Referral · Walk-in · Facebook · Organic · Hangout · Website · Email · Google Ads · Meta Ads · Others); no TikTok; nothing in Settings edits it | **Parity gap** |
| 101 | Dyel · Done in 1.0 | Upload a Homematch lead PDF | The import wizard accepts `.csv` only (`import-wizard.tsx` `accept=".csv"`), with the review sheet, duplicates and merge behind it | **Parity gap** |
| 88 | Cove · Done in 1.0 | Follow-up visibility: timestamps on uploaded images, at a glance | A contact log prints its date · time in the Notes list and the Activity feed; the attachment tiles carry no time; the listing has no "Last contact" column (columns: Lead Name · Stage · Tasks · Members · Source · Budget · Property Type · Created · Address) | **Parity gap**, small |
| 89 | Cove · Done in 1.0 | Analytics dashboard for owners / managers (leads + sales / ID performance) | The rail's Dashboard answers coming soon; no analytics anywhere | **Parity gap**, needs mocks |
| 35 | Urban Home · to do | A sales dashboard apart from the leads dashboard (the IDs' closed deals) | Same as 89 | New, with 89 |
| 68 · 71 · 72 · 73 | Flipstone · Cove · Done in 1.0 | Email sequences checked; follow-up notification at 30 minutes; a closed lead must stop getting follow-ups; WhatsApp notifications | No notification centre (the bell in the rail and the phone's top bar answer coming soon), no sequences, no settings for them. What exists: follow-up **tasks** (a quote's due date raises one, REG-470; Contacted's suggested tasks), the overdue badge on the rail's Tasks, and WhatsApp drafts opened on the press for signing, confirmation and X-Ray | **Parity gap** (the sending is the platform's; the product surface is missing) |
| 8 | Dyel · to do | WhatsApp the owner the moment a new lead arrives, without signing in | None | New — an event of the notifications surface |
| 10 | Dyel · to do | Check every WhatsApp message's copy; dynamic links for every recipient, not just Diana | None | New — the messages screen of the notifications surface |
| 28 | Dyel · 26 Aug | Every notification (approvals, leads…) carries a shareable link, by email and WhatsApp | Every record has a stable URL already (`/leads/[id]`, `/quotes/[id]`, `?from=` carries the way back) | New — the link goes into each message |
| 9 | Dyel · to do | Website leads arrive by email and appear in the leads list | Leads come from the form, the CSV import and the seeded Qanvast feed; no intake address | New |
| 17 | Cove · testing | Meta Ads lead integration ("confirm requirements") | "Meta Ads" is a source value; no connection | New — requirements first |
| 25 | Dyel · TBD | A manager level: the owner assigns some leads to a manager, the manager assigns to designers, designers cannot reassign, the manager sees only the leads given to him | Roles are Owner · Admin · Designer; every member sees every lead; the Assign popover is open to everyone; the one rule is "assign a member before leaving New" (REG-334); Company › Members is "Soon" | New |
| 20 | Kansohaus · blocked | Calendar integration / appointments (Google; Apple hard) | Meetings tab and quick link hidden until the mocks (REG-552); Met's log carries an optional schedule pair (REG-319); Company › Integrations is "Soon" | Waits for the Meetings mocks |
| 27 | Dyel · ops | Remove the test data before go-live | Not a product change; the prototype has Reset to base (REG-343) | — |

## 2. What a 2.0 build would be (proposed, nothing existing removed)

| # | Build | Rows | Size |
|---|---|---|---|
| **L1** | **Lead sources in Settings.** Settings › Leads › Lead sources: the list editable (add · rename · retire — a retired source keeps its old leads), TikTok in the defaults. The lead form, the import mapping, the Filters modal and the Source column read the list instead of the enum. | 62 | S |
| **L2** | **Last contact at a glance.** Attachment tiles in a contact log carry their upload time; the listing gains a "Last contact" column (the latest log's date · time · outcome, off by default in Column settings, sortable); the lead's Overview card shows the same line. | 88 | S |
| **L3** | **Import a Homematch PDF.** The import wizard accepts PDF and XLSX beside CSV: a Homematch lead PDF is read into the same review sheet (duplicates, merge, the primary band on arrival) with the source "Homematch". Needs one real Homematch PDF from Dyel for the parse. | 101 | M |
| **L4** | **Notifications.** (a) The bell becomes a notifications list — new lead, assignment, follow-up due, quote approval / confirmation / signature — each row a deep link. (b) Settings › Notifications: channels per member (email · WhatsApp), the events, the follow-up delay ("30 minutes after a lead goes untouched"), and the rule "no follow-ups once a lead is Won, Lost or On Hold". (c) A Messages tab listing every email / WhatsApp template with its dynamic link, previewable per recipient. The prototype shows the feed and the previews; the sending stays the platform's (360dialog). | 68 · 71 · 72 · 73 · 8 · 10 · 28 | M–L |
| **L5** | **Lead capture.** Settings › Leads › Lead capture: a studio intake address (forward the website form's email; the prototype demonstrates one forwarded email becoming a New lead with source Website) and a Meta Lead Ads connection in Company › Integrations (the form's fields mapped to the lead; duplicates by phone go to the review sheet). | 9 · 17 | M |
| **L6** | **Managers and who sees what.** Company › Members (live) with a Manager role. Rules: Owners and Admins assign anyone; a Manager assigns the leads assigned to them onward to designers; a Designer's Assign popover is read-only (their own name shown, "Ask your manager to reassign"); an owner's switch "Designers and managers see only the leads assigned to them" scopes the listing, the kanban, Tasks and search. The Members column and filters follow. | 25 | M |
| **L7** | **Dashboard.** The rail's Dashboard: the funnel by stage, new leads by source and week, response time, per-member conversion and won value, a Sales view of closed deals per ID (Urban Home). Design-first — the mock wins. | 89 · 35 | L |
| **L8** | **Meetings with a calendar.** After the Meetings mocks: a meeting on the lead (from the Met log's schedule pair), a Google Calendar invite from Company › Integrations, Apple as .ics. | 20 | M, waits on mocks |

Order suggested: parity first (L1 · L2 · L3 · L4), then L6, L5, then L7 and L8 once drawn.

## 3. Questions before building

1. **L6:** does the manager also see the leads his designers hold (a team view), or only the ones the owner gave him personally, as the row says?
2. **L4:** which events go to WhatsApp and which to email by default — and does the owner get every new lead, or only unassigned ones?
3. **L3:** one Homematch PDF sample, so the parse follows the real layout.
4. **L5:** for Meta Ads, which forms and fields (Cove's "confirm requirements"), and whether a lead with a known phone merges or lands in the review sheet.
5. **L7:** draw the dashboard first, or take a first cut from the listing's own numbers?

The testers' sheet's Leads holds (L-1…L-7 in `01-testers-sheet-audit-2026-09-23.md` §8) are a separate list and stay parked.

## 4. Built (2026-09-24)

The owner's go the same day: "for most of these there are no mocks and everything should align to 2.0 with our DS and UI components that we already have."

| # | Build | REG | Probe |
|---|---|---|---|
| L1 | Lead sources in Settings (TikTok in the defaults, retire · restore · remove; every picker reads the list) | REG-599 | `verify-leads-a.cjs` 1–2 |
| L2 | Last contact at a glance (listing column, the Lead stages card's line, tile upload times) | REG-600 | `verify-leads-a.cjs` 3–4 |
| L3 | Import an XLSX or a lead-sheet PDF (tuned to the real Homematch sample when it arrives) | REG-603 | `verify-leads-c.cjs` 3–4 |
| L4 | Notifications — the bell's feed, Settings › Notifications (channels · follow-ups · messages) | REG-604 | `verify-leads-d.cjs` |
| L5 | Lead capture — the intake address, Company › Integrations › Meta Lead Ads, the Add Lead menu's rows | REG-602 | `verify-leads-c.cjs` 1–2 |
| L6 | Managers and who sees what — Company › Members, Who sees leads, the assignment reach | REG-601 | `verify-leads-b.cjs` |
| L7 | Dashboard | — | not built: waits on frames (the one item that should be drawn first) |
| L8 | Meetings with a calendar | — | not built: waits on the Meetings mocks (REG-552) |

Answers used without asking again: a manager also sees their team's leads; the owner hears of every new lead; WhatsApp for a new lead, an untouched lead, a confirmation and a signature, email for approvals and assignments; the intake domain `in.openmaison.sg` and the simulated enquiries are invented and marked so.
