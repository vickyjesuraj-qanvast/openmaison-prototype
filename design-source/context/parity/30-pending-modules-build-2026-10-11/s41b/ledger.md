# S41b · The ledger — every pending line on the 41 cards (2026-10-13)

Her words, 2026-10-12: "please make sure nothing left behind from 1.0 to 2.0". This is part (1) of S41b: every `pending` line on all 41 cards
of the pending-modules report (`design-source/context/parity/29-pending-modules-2026-10-11/`) against what the steps did
(`30-pending-modules-build-2026-10-11/steps/outcome-S*.md`). Platform admin was out from the start, on her word.

**How to read it.** The cards come in the report's order (its five groups). Each line is quoted word for word from the survey files as
`compile.py` merges them into the card. The report itself swaps "her" for "your", which garbles a few words ("neither" → "neityour"), so
the survey's own wording is used here. Each line has one status:

- **built** — on screen or on the server in 2.0. *Where* names the file or page. A line that is built with an honest stand-in for an outside
  service (no SMS, no provider, no model) is still **built** when the flow itself is real; *Where* says what is simulated.
- **kept** — not built, on purpose. *Where* gives the reason and whose call it was.
- **stand-in** — the line's core is a service or model the prototype simulates. *Where* says what is honest about it and where the real
  one plugs in.
- **parked by her** — her explicit holds of 2026-10-12 (S32 themes / dark / tours, S33 countries, S38 Languages, the UAE page) and her
  "you can ignore admin" (Platform admin).
- **in progress** — S39 (Studio Health) and S41 (AI sandboxes) are still being built; their outcome files are not there yet.
- **NOT ANSWERED** — no outcome says what happened to the line.

## Counts

| Status | Lines |
| --- | --- |
| built | 206 |
| kept | 47 |
| stand-in | 34 |
| parked by her | 22 |
| in progress | 5 |
| NOT ANSWERED | 0 |
| **All** | **314** |

Per card:

| # | Card | Step | built | kept | stand-in | parked | in progress | not answered |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `dashboard` | S22 | 11 | 1 | 3 |  |  |  |
| 2 | `maison-assistant` | S10 | 13 | 3 | 5 |  |  |  |
| 3 | `meetings` | S23 | 18 |  | 1 |  |  |  |
| 4 | `marketplace` | S24 | 4 |  |  |  |  |  |
| 5 | `market-insights` | S25 | 2 |  |  | 1 |  |  |
| 6 | `studio-chats` | S26 | 10 |  |  |  |  |  |
| 7 | `hangouts` | S27 | 3 |  | 1 | 1 |  |  |
| 8 | `floor-plan-ai-picture` | S28 | 2 |  | 1 |  |  |  |
| 9 | `ai-writing-help` | S29 | 1 |  |  |  |  |  |
| 10 | `sign-in` | S30 | 5 |  | 1 |  |  |  |
| 11 | `sign-up` | S31 | 4 |  |  |  |  |  |
| 12 | `studio-setup` | S08 | 5 |  |  | 3 |  |  |
| 13 | `team-invitations` | S09 | 3 |  |  |  |  |  |
| 14 | `my-profile` | S01 | 5 |  |  |  |  |  |
| 15 | `appearance` | S32 | 2 | 1 |  | 3 |  |  |
| 16 | `regions` | S33 |  |  |  | 6 |  |  |
| 17 | `leads` | S05 | 12 | 3 | 3 |  |  |  |
| 18 | `quotes` | S04 | 11 | 6 | 1 |  |  |  |
| 19 | `quote-templates` | S11 | 5 | 4 |  |  |  |  |
| 20 | `contracts` | S03 | 7 |  | 2 |  |  |  |
| 21 | `price-book` | S12 | 3 | 3 |  |  |  |  |
| 22 | `projects` | S07 | 5 | 5 | 2 | 1 |  |  |
| 23 | `finance` | S06 | 6 | 2 | 3 | 1 |  |  |
| 24 | `client-portal` | S13 | 2 | 1 | 3 |  |  |  |
| 25 | `space-planner` | S15 | 2 | 4 | 1 |  |  |  |
| 26 | `settings-company` | S14 + S01 | 9 | 4 |  | 1 |  |  |
| 27 | `notifications` | S18 | 3 |  | 1 |  |  |  |
| 28 | `ai-credits` | S19 | 6 | 3 | 1 |  |  |  |
| 29 | `ai-visualizer` | S20 | 5 | 2 | 2 |  |  |  |
| 30 | `quote-x-ray` | S21 | 2 | 2 |  | 1 |  |  |
| 31 | `shell` | S16 + S01 | 7 | 2 |  |  |  |  |
| 32 | `consistency-leftovers` | S17 | 3 | 1 |  |  |  |  |
| 33 | `client-links` | S02 | 10 |  | 1 |  |  |  |
| 34 | `real-services` | S34 | 4 |  | 1 |  |  |  |
| 35 | `marketing-site` | S35 | 7 |  |  | 2 |  |  |
| 36 | `try-it` | S36 | 4 |  | 1 |  |  |  |
| 37 | `verify-listing` | S37 | 2 |  |  | 1 |  |  |
| 38 | `languages` | S38 |  |  |  | 1 |  |  |
| 39 | `studio-health` | S39 |  |  |  |  | 4 |  |
| 40 | `portfolio-profiles` | S27 built it | 3 |  |  |  |  |  |
| 41 | `sandboxes` | S41 |  |  |  |  | 1 |  |

## Modules 1.0 has that 2.0 doesn’t

### 1 · `dashboard` — Dashboard (the home page)

Step: S22 (lane B) — `outcome-S22.md`. Survey keys: `studio:dashboard`, `held:dashboard`, `api:industry-news`, `public:industry-news-feed`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 1.1 | A front door with a greeting and the assistant's chat box (rides on the mAIson assistant card) | **built** | `/dashboard` (`app/dashboard/*`, `components/dashboard/dashboard-view.tsx` `AskBox`): the MAISON AI BRIEF greets the viewer by name; its Ask box is Maison AI's own, answers land in Recent (REG-S22.1 · .2). |
| 1.2 | Priority widget: overdue tasks, follow-ups due, unassigned new leads | **built** | Needs you (`lib/dashboard/queries.ts`, `NeedsCard`): unassigned leads and overdue follow-ups are the listing's own to-do scopes with the same numbers; overdue tasks stay red in MY TASKS. |
| 1.3 | Leads, Tasks, Projects and Chats count widgets that open their lists | **built** | Number tiles: Leads · Open projects · Messages (unread, `?show=unread`); Tasks is MY TASKS itself. |
| 1.4 | Studio Pulse: leads per day against last week, the funnel, open escalations (Owners and Admins) | **built** | In 2.0's shape: the Leads tile says this week against last (Owners, Admins); the funnel is one press away on the listing; escalations are ticket rows in Needs you. 1.0's sparkline not drawn. |
| 1.5 | Team Workload: leads and tasks per member (Owners and Admins) | **built** | Workload card (projects against capacity, open leads; Owners, Admins, a Manager's team). Tasks per member kept out — 2.0's Tasks has no list by member to open (flagged, REG-S22.7). |
| 1.6 | Upcoming: a month calendar of tasks and follow-ups | **built** | Coming up (this week and next, else the next three). The month grid kept out — 1.0's dots only covered seven days (REG-S22.5). |
| 1.7 | Industry News from Singapore property and design RSS feeds | **stand-in** | The reader is ported (`lib/market-insights/rss.ts`, 1.0's five sources) and its headlines are Market Insights' Industry News; nothing fetches in the prototype — the developers' hourly fetch (`setFeedSource`, S34). No headline in the demo (a made-up story under a real newsroom would be a fabricated record). |
| 1.8 | Recent site updates across every project (Owners) | **built** | Site updates card (`lib/dashboard/updates.ts`), Owners and Admins. |
| 1.9 | Classic mode's margin alerts, One-Click Profit and compliance alerts (held: N-02, TD-106) | **built** | Profit this month + Owed to you from Reports' own reports; margin alerts as the projects' money rows; compliance as Needs you rows. Classic's sample figures not carried. |
| 1.10 | Settings › Home Screen: chat-first or classic | **kept** | Decided in S22 (as recommended): one page carries the box and the cards, so there is no choice to make (1.0 kept it per browser). |
| 1.11 | The whole page (lead KPIs, Studio Pulse, team workload, upcoming, priority feed) — held · her call (L7 'waits on frames'; REG-1560 kept it held) · revisit: it is the rail's first item and the first thing a demo client presses | **built** | Her hold lifted by "build all of them" (2026-10-11); built on house pieces, no mock — flagged (REG-S22.1…12). |
| 1.12 | Project widgets, compliance alerts, recent updates, the 'Site Update' chip (PR-030 · FR-108 · TD-106 · UC-026 · UC-027) — held (Dashboard) | **built** | Open projects tile, each project's Needs you, compliance rows, Site updates, *Draft a site update*. |
| 1.13 | Margin alerts, the One-Click Profit card, a revenue KPI — held (N-02) · 1.0's revenue tile showed fixed sample figures | **built** | Profit this month (revenue in its help line) and Owed to you; no sample figure. |
| 1.14 | The Industry News card and its RSS feed reader | **stand-in** | Same reader as 1.7 — built; the fetch is the developers'. |
| 1.15 | The news card with stories by category and their links out | **stand-in** | Market Insights › Industry News (chip, count, each story "Read it on {source}"); no live headlines until the developers' fetch runs. |

### 2 · `maison-assistant` — mAIson assistant (the full AI chat)

Step: S10 — `outcome-S10.md` (2.17 finished by S22). Survey keys: `studio:maison-assistant`, `api:maison-bot-assistant`, `held:maison-ai`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 2.1 | Free questions on any topic — today the Ask box understands five | **stand-in** | About 45 intents answered by rule (`lib/maison-ai/{intents,answer}.ts`, `answers/*`); anything else gets "I can't answer that yet" with what it can. A model replaces `readQuestion`. |
| 2.2 | Leads, tasks, quotes and team questions ("which leads need attention", "my overdue tasks") | **built** | `answers/work.ts`: my tasks, leads that need attention, a client's card, quotes, the team and one member. |
| 2.3 | Money questions answered as reports: P&L, GST, AR and AP ageing, cash-flow forecast, commission | **built** | P&L, GST, AR / AP ageing, cash flow (90 days), commission, expenses, a client's statement — through Reports › Finance's `buildReport`; Accounting included (fixed). |
| 2.4 | Charts drawn inside the answer | **built** | Small: report rows carry a share bar (`MaisonRow.share`, `components/shell/maison-answer.tsx`); full charts stay on Reports. |
| 2.5 | Changes by chat: create or update leads, tasks, projects, invoices, expenses, POs, VOs; record payments | **built** | Every change is proposed first (Not now + one button running the house action) or opens the house form filled in. **Not built:** a project's stage / hold / dates by chat, approving from the box, invoice / PO lines read from the words. |
| 2.6 | Drafts: a WhatsApp follow-up or a client message for a picked lead | **built** | Stage drafts (`lib/maison-ai/drafts.ts`), opened in WhatsApp on the press. |
| 2.7 | Attach a file: read a quote, find a room's surfaces, render a room, floor plan to 3D | **stand-in** | The box takes no files; it says so and opens the tools that read them (X-Ray, Upload a quote, the Visualizer, the Space Planner). |
| 2.8 | Voice input | **kept** | Not built — voice needs a speech provider (the developers'); the phone keyboard's dictation types into the box. S10's call under the card's "the model is the developers'". (S34's transcriber seam is for Meetings only.) |
| 2.9 | A conversation that carries from the home's chat box into the panel | **built** | As a record: `maison_questions` (migration 0094) — Recent on every page and device; the Dashboard's box writes the same rows. |
| 2.10 | Free questions on any topic (leads, quotes, tasks, the team) answered by a language model; 2.0's Ask box knows four topics, by rule | **stand-in** | By rule; the model is the developers' (`readQuestion`). |
| 2.11 | Getting things done by chat: create or update a lead, task, project, invoice, expense, PO or variation order; record a payment; generate the milestone invoices | **built** | As 2.5, plus "generate the milestone invoices" lists each running project's next stage invoice (`moneyNewAnswer`). |
| 2.12 | Draft a client WhatsApp or a follow-up from a lead's record, ready to copy | **built** | As 2.6. |
| 2.13 | Charts in an answer, and finance answers beyond Reports' tiles: cash-flow forecast, money owed by age (to the studio and by it), statement of account | **built** | As 2.3 and 2.4. |
| 2.14 | Attachments in the chat: read a photo, PDF, spreadsheet or voice note, for example a competitor's quote | **stand-in** | As 2.7. |
| 2.15 | One-tap prompts on a lead or project: Optimize Quote · Draft Follow-up · Analyze Lead · Generate Moodboard · Site Update | **built** | Where 2.0 has the record: the lead brief's buttons and the box's phrases (Compare to past quotes · stage drafts · call script / scope risks · Share moodboard · Draft an update). |
| 2.16 | Lead scoring, quote benchmarking and a render made from the chat | **kept** | No lead score (2.0 dropped temperature, Q-10); benchmarking = Compare to past quotes + Quote X-Ray; a render = the AI Visualizer, metered there. |
| 2.17 | The chat-first Home screen (it goes with the Dashboard) | **built** | S22: the Dashboard's MAISON AI BRIEF with the Ask box on top of the cards (S10 had kept it for S22). |
| 2.18 | A model-backed assistant for free questions, drafting and acting — stand-in (lib/maison-ai/intents.ts, no model) · package (P-H) under 'AI stays honest' · developers' lane | **stand-in** | The seam is `readQuestion` (`lib/maison-ai/answer.ts`); every proposal runs a house action that re-checks its own rule. |
| 2.19 | Words-only suggestions that answer Coming soon: the Leads listing's three, the Visualizer and Planner homes and editors, Company › Client portal set-up, Plan & AI credits, the AI brief's 'Attach a client review' and 'Add to newsletter list' · REG-14 · REG-507 · REG-1339 · revisit: make each act or drop it | **built** | Each acts (listing, Visualizer and Planner homes and editors, Client portal set-up, Plan pages, Qanvast Ops, the brief's two in `lib/leads/briefs.ts`); no "Coming soon" left in Maison AI (checked: comments only). |
| 2.20 | Eight editors open an empty Maison AI sheet (quote, contract, contract template, quote template, T&Cs, payment, task, schedule) — package (UI sweep) · revisit | **built** | All ten editor sheets (EDITOR_LIST in `outcome-S10.md`; checked `useMaisonAi` / `MaisonAiSheet` in the quote, contract, contract template, quote template, T&Cs, payment, task and schedule template editors). |
| 2.21 | The lead brief's copy was never signed off (REG-169) — her sign-off owed | **kept** | Her sign-off is still owed (REG-169); S10 changed two button words, flagged as invented copy. |

### 3 · `meetings` — Meetings and the Meeting Co-Pilot

Step: S23 (lane B) — `outcome-S23.md`. Survey keys: `studio:meetings-copilot`, `held:meetings`, `api:copilot-objections-competitors`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 3.1 | Start a meeting from a lead or project: aim, consent, prep card | **built** | New Meeting ▾ (Plan · Start now · Write up · Upload a recording) on the lead, the project's Client › Meetings, Tools › Meeting Copilot, the Meeting quick link; consent refused without its tick on the page and the server (`components/meetings/**`, `lib/meetings/{model,prep,queries}.ts`). |
| 3.2 | A live transcript, in person or on a video call | **stand-in** | Nothing records or transcribes; the studio types or pastes, saved as typed. A transcriber plugs in (`setTranscriber`, S34). |
| 3.3 | AI nudges, a smart checklist and a deal score during the meeting | **built** | By rule: 1.0's seven fast-path rules, ten objection kinds, the checklist, the deal score (`lib/meetings/engine.ts` `readMeeting`; 1.0's ×100 bug fixed). |
| 3.4 | An estimate built from the talk, turned into a draft quote | **built** | `estimateOf` + Make a draft quote through Create Quote's draft (`draftQuoteFromMeeting`; never a guessed price). |
| 3.5 | Renders, mood boards, portfolio and a competitor's quote during the meeting | **built** | Mood board, Render a room, Past projects, Their quote — on 2.0's own tools. |
| 3.6 | The brief afterwards — profile, estimate, upsells, action items — saved to the lead | **built** | `lib/meetings/brief.ts`; Save to the lead with a follow-up task, Undo. |
| 3.7 | Upload a recording for a brief | **built** | The recording kept in the lead's Files with its consent; the transcript is pasted (stand-in); never charged. |
| 3.8 | Share a brief by link | **built** | `/meeting/<token>` (30-day window, Stop sharing with Undo); 1.0's `/copilot/share/<id>` redirects. |
| 3.9 | History, Gallery, Analytics with coaching, Objections report | **built** | History = Tools › Meeting Copilot; Gallery = From this meeting + the Visualizer's home; Company › Reports › Meetings = Analytics + Objections. |
| 3.10 | Project › Meeting Summary card | **built** | As the With {client} card's *Last met* row — no new card on the simplified Overview (flagged). |
| 3.11 | The Meetings tab and the Meeting quick link on a lead — held · her call ('actually lets hide the meetings tab', REG-552) · keep until mocks | **built** | REG-552's hold lifted by "build all of them": the tab where 858:24784 drew it, the quick link after Contact Log. |
| 3.12 | Live co-pilot from a lead or project (consent, transcript, brief) and uploading a recording — held (REG-552) | **built** | As 3.1 and 3.7 (the transcript a stand-in). |
| 3.13 | Save a brief's facts to the lead with a follow-up task; who sees briefs; filing to a project — held (REG-552) | **built** | Save to the lead; Who sees leads governs a lead's meetings everywhere; a project's lead's meeting files on the project. |
| 3.14 | Meeting Summary card on the project; weekly analytics; Co-Pilot renders and moodboards — held (REG-552) | **built** | Last met row; Reports › Meetings' ranges; boards and renders listed on the brief. |
| 3.15 | What waits on it elsewhere: quote lines from a brief, X-Ray's competitor analyser, Co-Pilot metering (25 credits / 10 min), Google Calendar invites, the AI & Copilot settings, the client's meeting email | **built** | Quote lines (draft quote) · X-Ray (Their quote) · metering at her Q-45 price (flag: 1.0 never charged it) · Calendar (.ics + Google's filled-in page; a two-way sync is the developers', `setCalendarSync`) · Settings › Meetings · the client's email through the outbox. |
| 3.16 | The Objection Responses library (ten kinds, platform defaults, edit, on / off) | **built** | `lib/meetings/objections.ts`: 1.0's 26 answers in ten kinds — edit, switch, reset. |
| 3.17 | The Competitor List | **built** | Settings › Meetings; feeds the tips and the Lost dialog's competitor chips. |
| 3.18 | The co-pilot's objection log and Objections report | **built** | `copilot_objection_log`; Reports › Meetings › Objections. |
| 3.19 | Note: in 1.0 nothing reads either list. The co-pilot spots competitors on its own and never shows the studio's saved answer, so both lists are saved and unused | **built** | Fixed: both lists are read in the meeting (`readMeeting`). |

### 4 · `marketplace` — Marketplace (brands and deals)

Step: S24 (lane B) — `outcome-S24.md`. Survey keys: `studio:marketplace`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 4.1 | Brands directory: categories, search, filters, sort, load more | **built** | `/marketplace` (`components/marketplace/marketplace-home.tsx`): Brands · Deals, category chips, search, Sort pill (1.0's three), Show more. |
| 4.2 | Deals view and the deal dialog (terms, how to redeem, Get Deal) | **built** | The deal dialog; Get deal = the brand's own way. Nothing is bought — the ask is recorded (`marketplace_deal_asks`), the honest stand-in. |
| 4.3 | Brand page: gallery, services, links, socials, FAQs, its deals, WhatsApp the brand | **built** | `/marketplace/<brand>`: pictures, About, Contact, Web links, Services, Deals, Products (→ Price book), Questions, WhatsApp. |
| 4.4 | Banners at the top (fixed pictures) | **built** | The feed's banners; they don't turn on their own (1.0: every 4 s) — flagged. |

### 5 · `market-insights` — Market Insights (articles)

Step: S25 (lane B) — `outcome-S25.md`. Survey keys: `studio:market-insights`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 5.1 | Article list: a featured article, category chips, search | **built** | `/market-insights` (`components/market-insights/insights-home.tsx`): featured, category chips with counts, search, 24 at a time. |
| 5.2 | Article page with its text and charts | **built** | `/market-insights/<id>`: the Markdown body, 1.0's five chart kinds, Show the numbers. |
| 5.3 | Writing and publishing the articles (Platform admin, not the studio) | **parked by her** | Platform admin (her "you can ignore admin"). The studio side is built: the feed's seam (`lib/market-insights/feed.ts`) and six labelled sample articles (repair R142). |

### 6 · `studio-chats` — Team and group chats beyond a project

Step: S26 (lane B) — `outcome-S26.md`. Survey keys: `studio:team-chats`, `api:messages-free-chats`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 6.1 | One-to-one chats between members | **built** | `startDirectChat` (`app/chat/actions.ts`), one conversation per pair (`pair_key`). |
| 6.2 | Group chats with a name | **built** | `createGroupChat` · `renameGroupChat` (Undo). |
| 6.3 | A chat about a lead before it has a project, or about nothing in particular | **built** | Every lead's Team conversation before Won; the studio's room, two people and groups for "nothing in particular". |
| 6.4 | Pinned chats; attachments other than photos | **built** | Pin · Mute · Copy link; Photo · File · Voice note · A contact · emoji; `conversation_files`, `/chat/file/<id>`. |
| 6.5 | Reply suggestions | **built** | By rule for members (`suggestTeamReplies`) — a tap fills, never sends (1.0's was a fixed list too). |
| 6.6 | A chat with any phone or contact, or with a lead who was never invited (2.0: every conversation belongs to a home, H-Q11) | **built** | A lead never invited: New message › A client, with Invite to Portal in place. **The "any phone or contact" half kept out** — 1.0's reached nobody; WhatsApp stays the way to anyone outside. |
| 6.7 | New Group with hand-picked people; studio-wide team chats not tied to a project | **built** | Groups with hand-picked members + the studio's room "Everyone at {studio}" (Accounting in none). |
| 6.8 | Add or remove a conversation's members by hand | **built** | Groups: Add people · Take out · Leave, each with Undo. A lead's / project's Team conversation follows the record's members (kept, one home). |
| 6.9 | All · Unread · Escalations filters (2.0 sorts unread first; tickets have their own place) | **built** | All · Unread + Clients · Team. Escalations kept as tickets (one home). |
| 6.10 | The Docs · Media · Links view of a conversation's shared files (2.0 files them in Files › Messages) | **built** | Details › Shared in this conversation (Media · Docs · Links) + All in Files › Messages. |

### 7 · `hangouts` — Hangouts (meet-the-designer events)

Step: S27 (lane B) — `outcome-S27.md`. Survey keys: `public:hangouts`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 7.1 | The homeowner's event page: SMS sign-in, preferences, 'we're matching' wait, the day's meetings with designer profiles and portfolios, AI insights after each meeting, voucher progress | **built** | `/hangout/[token]` in the studio's brand + the homeowner's own page. Stand-ins: SMS sign-in (the private link), the matching wait (the rule picks at booking), AI insights (S23's brief by rule). Voucher progress kept (Qanvast's rewards). |
| 7.2 | Staff console: events, shifts, studios and designers taking part, homeowner registration, preference matching (0–100 score), the live table board, outcomes, analytics, recordings and transcripts | **parked by her** | The staff console is Qanvast's platform admin (excluded by her). The studio's share is built on Qanvast Ops › Hangouts: the feed, the Plan, walk-ins, the 0–100 score, live Chats, outcomes, How it went. |
| 7.3 | The studio's side (apply to an event, plan which designers attend, a designer's own meetings, upload a recording, turn a meeting into a lead): its hooks and routes exist in 1.0, but no screen uses them today | **built** | Apply / Take back, the Plan, a designer's own meetings, a recording through S23's write-up; every booking is a lead. |
| 7.4 | AI meeting transcripts and the homeowner's insights (Gemini, from audio). Nothing in current 1.0 records the audio. | **stand-in** | Notes typed or pasted make S23's brief by rule; no model reads audio (as in 1.0 today). |
| 7.5 | Two bell events: a homeowner registered, a meeting assigned | **built** | `hangout_registered` · `hangout_meeting_assigned` (+ the client message `client_hangout`). |

### 8 · `floor-plan-ai-picture` — Floor-plan photo to a 3D picture

Step: S28 (lane A) — `outcome-S28.md`. Survey keys: `studio:floorplan-isometric-ai`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 8.1 | Upload a floor-plan photo and get a furnished 3D picture | **built** | Make a 3D picture: the photo straightened in the browser (1.0's deskew), the studio places the rooms on it in the planner, the planner furnishes and draws them (`components/planner/photo/*`, `lib/planner/straighten.ts`). No image model (a photographic look goes through Render in AI Visualizer); no credits (flagged). |
| 8.2 | The room list read from the plan, editable before drawing | **stand-in** | The list starts from the flat type on record (`roomsForType` — the model seam), editable; it is not read from the photo. |
| 8.3 | Two looks, Dollhouse and Top-down, and a download | **built** | Dollhouse · Top-down, Download PNG, Save to Files › Renders, Render in AI Visualizer. |

### 9 · `ai-writing-help` — AI writing help on quote text

Step: S29 (lane A) — `outcome-S29.md`. Survey keys: `api:ai-writing-help-quotes`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 9.1 | Improve · Shorten · Expand · Rewrite · Plain English on a quote's Terms and Notes (the rich editor) and on a contract's text; no quote audit listed it | **built** | By rule, every one a proposal first (`components/writing/writing-help.tsx`, `lib/writing/*`): Terms / Notes, a contract's text, templates, line descriptions, send messages; free; the model seam is `proposeWriting`. |

## Getting a studio in

### 10 · `sign-in` — Signing in and staying signed in

Step: S30 (lane A) — `outcome-S30.md`. Survey keys: `onboarding:studio-sign-in`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 10.1 | Sign-in screen: mobile number with its country code, then a 6-digit code by SMS; resend after 30 s; paste the code | **built** | `/sign-in`: +65 mobile or work email → 6-digit code, resend after 30 s, paste. No SMS is sent and any six digits pass — the page says so. Other countries' codes wait with S33 (on hold). |
| 10.2 | Keep me signed in for 30 days (else 24 hours), renewed on each visit; Sign out | **built** | 30 days renewed / 24 hours (`lib/auth/session.ts`, `studio_sessions`); Sign out is the You group's last row. |
| 10.3 | Already signed in → straight to your home; signed out → every page goes to sign-in | **built** | `proxy.ts` + `PUBLIC_PATHS`: signed out → sign-in with `?next=`, files and pictures 401; the demo's standing session keeps the demo working. |
| 10.4 | Unknown number: 'No account found' with Sign Up — or 'Contact support for account setup' while sign-ups are paused; a pending invitation says so | **built** | "No account found…"; an open invitation joins on sign-in, an expired one is refused; the Sign Up door (S31); sign-ups paused built in S31 as an environment switch. |
| 10.5 | Repeated attempts slowed down; staff can set a temporary test code for demos | **built** | Five tries a minute per number / email (`lib/auth/limit.ts`). The staff test code is Platform admin (parked by her); the stand-in's any six digits is the demo's code. |
| 10.6 | Sign in with a Qanvast account: studio and member created on first sign-in, the role taken from Qanvast; 'Your Qanvast session expired' when that link times out | **stand-in** | Qanvast as a provider behind `setSignInProvider` (`provision`, `roleFromQanvast`); the "session expired" notice is built; nothing talks to Qanvast. |

### 11 · `sign-up` — A new studio joins

Step: S31 (lane A) — `outcome-S31.md`. Survey keys: `onboarding:studio-sign-up`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 11.1 | Create a new studio and its owner in one go (staff do it in 1.0; nobody can in 2.0, which is one demo studio) | **built** | `/sign-up` + `createStudio` (`lib/studios/create.ts`). Stand-in: each new studio is its own database file beside the demo's, one open at a time; the tenancy seam is `setStudioProvisioner`. |
| 11.2 | A new studio starts with starter lists: 11 lead sources, 6 project types, 8 issue categories, the roles and the standard pipeline | **built** | As 2.0's house defaults (1.0's 11 lead sources + REG-607's five, 8 ticket categories, the seven stages, four roles). Project types kept at 2.0's three fixed ones (1.0's editor is on no card — see Found). |
| 11.3 | Pause sign-ups for the whole platform ('Contact support for account setup') | **built** | The behaviour and 1.0's words built; the switch is an environment setting (`OPENMAISON_SIGN_UPS_PAUSED=1`) until Platform admin (excluded) keeps it. |
| 11.4 | The public sign-up tour with a role choice (Owner / in-studio designer / freelancer) — a sandbox in 1.0 that saves nothing | **built** | The role choice decides: run a studio → the studio; work in one → ask your studio; on my own → a studio of one. |

### 12 · `studio-setup` — Setting up a new studio

Step: S08 — `outcome-S08.md`. Survey keys: `onboarding:studio-setup-wizard`, `onboarding:welcome-and-tips`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 12.1 | A guided first run for the owner through what documents need: details, logo, bank, numbering | **built** | Settings › Roles & access › Set up your studio (`lib/studio-setup/*`, `app/settings/studio-setup-card.tsx`): seven steps, each ticked by its own record. |
| 12.2 | Skip a step, with the default it falls back to on the button ('Skip, defaults INV / PO / T used') | **built** | 2.0's shape: nothing is forced; each open step says what happens until it is done; defaults named in the foot; Hide (with Undo) for "Skip entire setup". |
| 12.3 | Resume where you left off ('Welcome back! Picking up where you left off.') | **built** | Read from the records every time, so it always resumes ("3 of 7 done"). |
| 12.4 | 'Your studio is live' with next steps, adding 'Set up your branding' only when it was skipped | **built** | "Your studio is set up · 7 of 7 done" once, with Add your first lead. |
| 12.5 | Country chosen on the first step (held by DEF-30) | **parked by her** | Countries are S33, on hold by her (2026-10-12). |
| 12.6 | A welcome on first sign-in, one for an owner and one for an invited member | **built** | `components/shell/first-visit-welcome.tsx`, `members.welcome_due · welcomed_at`, by role; the invited member's words came with S09. |
| 12.7 | One-time tips on the first visit to a page (12 pages in 1.0), by role | **parked by her** | Page tips are guided tours — S32, parked whole by her (REG-1837). S08 had kept them for S32. |
| 12.8 | Reset all tips | **parked by her** | Reset / Restart tours — S32, parked whole. |

### 13 · `team-invitations` — Inviting your team

Step: S09 — `outcome-S09.md` (13.3 finished by S30). Survey keys: `onboarding:team-invitations`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 13.1 | An invitation message to the new member (SMS, WhatsApp or email) with the sign-in link | **built** | Add member sends WhatsApp + email through the house outbox (`lib/company/invitations-server.ts`), link `/join/<token>`. Nothing is really sent until a provider plugs in (`setDeliveryAdapter`). |
| 13.2 | 'Invited — hasn't signed in yet' on the member until their first sign-in; Resend; Cancel; expires after 30 days | **built** | Invited / Invitation expired chips, Send again, Copy link, Cancel invitation with Undo, the 30-day window. |
| 13.3 | First sign-in with that number joins the studio | **built** | S30: the first sign-in (or the join page's code) calls `acceptInvitationOf` (checked in `app/sign-in/actions.ts`). |

### 14 · `my-profile` — Your own profile

Step: S01 — `outcome-S01.md`. Survey keys: `onboarding:my-profile`, `api:my-account-profile`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 14.1 | Change your own name, email and phone | **built** | Your profile `/profile` (`components/profile/your-profile-view.tsx`, `saveMyDetails`). |
| 14.2 | The same phone or email can't belong to two members (2.0 checks only the email, only at Add member) | **built** | `detailsClash` (`lib/company/member-rules.ts`): name, email and phone against every other member, on every save and at Add member. |
| 14.3 | A page where I change my own name, email, phone and photo | **built** | As 14.1, with the photo row. |
| 14.4 | A member's own uploaded photo (2.0 shows a tinted initial, or one fixed demo photo) | **built** | Saved and drawn on every avatar (`lib/company/member-photo*.ts`, `components/om/avatar.tsx`); repair R103. |
| 14.5 | My signature as a card on that page (contracts Q-30 said 'later') | **built** | Your signature card (Change, Remove with Undo); consent switch added by S03. |

### 15 · `appearance` — Dark mode, guided tours and theme skins

Step: S32 — **parked whole by her** (REG-1836 · REG-1837, no outcome file); three lines were answered by S01, S16 and S22. Survey keys: `studio:personal-settings`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 15.1 | A member changes their own name, email, phone and photo | **built** | Built by S01 (Your profile) — the line repeats my-profile's; the rest of this card is S32's. |
| 15.2 | Dark mode (the design system already has dark colours) | **parked by her** | Dark mode parked (REG-1836: "ignore the dark and languages completely for now"). |
| 15.3 | A welcome window and page tips, with Restart tours | **parked by her** | Guided tours, page tips and Restart tours parked (REG-1837). The first-visit welcome window itself was built by S08. |
| 15.4 | Home Screen choice (comes with the Dashboard) | **kept** | Decided in S22: one Dashboard carries the box and the cards, so there is no home screen to choose. |
| 15.5 | Theme skins and mascots | **parked by her** | Theme skins parked (REG-1837). |
| 15.6 | Open / Closed to new leads in the top bar | **built** | S16: Open to new leads in the studio block's menu and the phone's You sheet (`setMyAccepting`) — flagged as a second control beside Members' switch. |

### 16 · `regions` — Countries beyond Singapore

Step: S33 — **on hold by her** ("holdon to countries beyond singapore for now", 2026-10-12; DEF-30 stands; no outcome file). Survey keys: `onboarding:regions-beyond-singapore`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 16.1 | Pick the studio's country; currency, tax name and rate, time zone and date format follow | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |
| 16.2 | Phone rules per country at sign-in and in every phone box (+60 9–10 digits, +971 9, +91 10, +20) | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |
| 16.3 | One studio serving several countries; each lead's own country; re-tag leads between countries | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |
| 16.4 | Each country's lists: property types, areas, budget ranges, property status, key collection, design styles; its registration label (UEN · SSM · Trade licence · GSTIN) | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |
| 16.5 | Compliance checklists for Malaysia, UAE, India and Egypt; floor-plan templates for Malaysia, UAE and India | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |
| 16.6 | Each country's lead-email senders for lead capture, news sources for market insights and a sample client for template previews | **parked by her** | S33 on hold (her words 2026-10-12; DEF-30 stands). Nothing built. |

## Left inside the modules already built

### 17 · `leads` — Left in Leads

Step: S05 — `outcome-S05.md` (17.14 by S07). Survey keys: `held:leads`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 17.1 | Edit the lead funnel (Manage Stages) — held · her call (Leads Q-02 'hold') · keep the hold, but the stage chip's 'Manage Stages ›' row still answers Coming soon: hide it as Meetings was (1.0: Accounts › Pipeline Stages, 391 lines) | **kept** | Her hold (Leads Q-02) kept — adding / renaming / reordering stages not built. The row now opens Settings › Lead management › Lead stages (stages, live counts, 1.0's two per-stage flags, Linear / Flexible) instead of being hidden — flagged for Vicky (the card said hide it). |
| 17.2 | Testers' L-2…L-5 (change status after Won, company + UEN on the lead, co-owner on the lead, kanban card density) — held since 2026-09-23 · her call ('hold back the other module changes') · revisit L-3 and L-4: Commercial fit-out and the portal's household now need them | **built** | L-3 company + UEN and L-4 co-owner built (`lead-form.tsx`, `client_company` · `client_uen`, the second client on quotes and the household). L-2 (move after Won) and L-5 (kanban density) kept — her hold. |
| 17.3 | Maison AI creates or updates a lead and moves its stage — later · package call (Leads audit §0.2) · revisit: it already does this for projects (REG-1645) | **built** | Ask box intents `add_lead` · `move_lead` · `edit_lead`, through the form / Move stage window; it never writes on its own. |
| 17.4 | Fill a new lead from a document; Auto Fill from a chat screenshot — stand-in (scripted values) · her call (Q-28) · keep until developers wire an AI read; carry the testers' date rule L-6 | **stand-in** | The document / screenshot read stays scripted (her Q-28; the developers' AI read). L-6 built: dated now, next step 3 days on at 7 PM, the screenshot kept as the log's file. |
| 17.5 | Lead-sheet PDF import — stand-in fitted to a guessed Homematch layout · package call (the sample never arrived) · revisit: get a real sheet before developers wire it | **stand-in** | Kept as the guessed-layout stand-in — the real sample sheet never arrived (the developers, with a real sheet). |
| 17.6 | Move stage Quote Sent / Won upload keeps only the file's name — stand-in · her call (REG-149, the mock) · revisit: every other upload keeps its bytes since gaps build E | **built** | Quote Sent's PDF in Files › Quotes & BOQ, Won's signed quote with its bytes (`keepQuoteSentUpload`, `fileWonQuote`). |
| 17.7 | Export: Quote status and Project type columns — dropped · package call ('no lead-side value') · revisit: a Won lead has a project and each quote has a status | **built** | `lib/leads/export.ts`: + Quote status, Project type, Company, UEN, Second client. |
| 17.8 | Lead capture (webhook receiver, Gmail OAuth + poll, website form, Meta Lead Ads) — stand-ins (Simulate a POST, Sync now) · her call (Q-36) · developers' lane | **stand-in** | The developers' lane (her Q-36). Since S34 the webhook receiver is real (`POST /api/webhooks/leads/<token>`, 1.0's HMAC); Gmail OAuth / poll and Meta stay stand-ins (the `lead-gmail` seam). |
| 17.9 | Return a lead: Appeal a rejected return (the 'here' link and the Returned card's banner), the policy behind the info icon, Tips › View all, deleting evidence — Coming soon · her call (REG-193) / package (D-39) · revisit: a rejected return's only way forward is a dead link (1.0 had none of these; it only submitted) | **built** | Appeal on a rejected return, the return policy dialog, View all / Show fewer, a file off a return with Undo (`app/leads/return-actions.ts`). |
| 17.10 | Coming soon presses whose target now exists: the Overview FILES card's Create Folder / Upload (the Files tab does both), Move stage › From System quote 'View' (1.0 opened the quote), Imports › Filters (1.0 had none) · old mock / package calls · revisit: build or hide | **built** | FILES card Create Folder / Upload built; From System › View built; Imports › Filters removed. |
| 17.11 | Coming soon sort on the Tasks and Files table heads (1.0 sorted tasks; it had no sortable file list) · her call (REG-468) · revisit: the listing and galleries sort | **built** | Tasks: Due date · Status; Files: Title · Last updated · Size; one sort with Filters'. |
| 17.12 | Attach files dialog: type chip, Sort, list view, select all, folder ⋮ answer Coming soon · her call (REG-173) · revisit: the Files tab has real filters, list view and folders (1.0 had nothing comparable) | **built** | `attach-files-modal.tsx`: File Type, Sort, Grid / List, folders with the crumb, the folder ⋮. |
| 17.13 | Files › New ▾ › From Company Files · From Google Drive — Coming soon · package call · keep Drive for developers (OAuth); 'Company Files' names a home that does not exist | **built** | From Company Files removed (checked: `files-toolbar.tsx`, comments only); From Google Drive kept for the developers (OAuth). |
| 17.14 | Files: Download on a file with no stored copy (seeded PDFs, invoice and receipt entries) — Coming soon · as recommended (REG-1229) · revisit: the invoice page already has Download PDF | **built** | S07: a money paper's entry opens its paper with `?print=1` (`FileRow.paper`, `moneyPapersOf`). |
| 17.15 | Notes › AI chip › Refine — Coming soon · her call (REG-185) · keep without a model | **built** | By rule with Undo (`lib/leads/note-refine.ts`); no model, nothing metered. |
| 17.16 | Tasks hub phase 3 (View by Lead · Due · Member bands) — later · her call (REG-466) · keep | **kept** | Her call (REG-466). |
| 17.17 | Small 1.0 conveniences dropped by package calls (bulk Unassign, Scope preference, live response-time clock, kanban column collapse, back-to-top, swipe stage tabs, drawer autosave, coach mark, phones starting with 7) · keep | **kept** | Package calls; the card says keep. |
| 17.18 | On Hold phone line clips at the 240 Lead Name floor (REG-891) — flagged for her · needs her pick | **built** | The day on its own line under the phone (`components/leads/table.tsx`). |

### 18 · `quotes` — Left in Quotes and the quote editor

Step: S04 — `outcome-S04.md` (18.18 by S23). Survey keys: `held:quotes`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 18.1 | Draft with Maison AI (a brief becomes a quote) — Coming soon in Create Quote › More ways to start · as recommended (quote editor Q-17 hold) · revisit: a rule-built draft from the price book by property type would replace the dead row | **built** | Rule-built (`lib/quotes/draft.ts` `draftPlan` — the model seam): My Sections, My Items by trade, 1.0's baseline at S$0. |
| 18.2 | Upload a quote reads spreadsheets for real, but a PDF or photo only if it is one of the three reference quotes — stand-in · as recommended (Q-16, REG-627) · developers' lane; but its chip says 'PDF · XLS · JPG' on a 5-credit press, so fix the words | **built** | The chip says "XLSX · CSV · 5 AI credits" (checked). Reading a PDF / photo stays the developers' (only the three reference quotes read). |
| 18.3 | AI help in the editor (insights, margin warnings, set a global margin) — the editor's Maison AI sheet is empty · as recommended · revisit: below-cost and low-margin hints can be worked out by rule | **built** | By rule: below cost · under 10 % · no price yet, one markup through Set a value (`lib/quotes/hints.ts`, `useQuoteMaison`). Under-market / upsell not built (need market data or a model). |
| 18.4 | Starter Quote (1.0's quote rules add lines by project type) — held · her call (templates Q-07) · keep: My Sections with property-type tags cover it | **kept** | Her call (templates Q-07): My Sections with property-type tags cover it, and Draft with Maison AI reads them. |
| 18.5 | Prices that include GST — held · her call ('Hold — ask the studios first') · keep | **kept** | Her hold ("ask the studios first"). |
| 18.6 | The client's link with a token, a 7-day expiry and an SMS code — stand-in (keyed on the quote id) · as recommended (Q-33 'the platform's') · developers must land it before real clients use it | **built** | Token built (`/confirm/<token>`, `quotes.confirm_token`). Expiry kept: the quote's Valid until is its window (REG-625). SMS code a stand-in (Q-33). |
| 18.7 | 'Viewed' on the quote link — missing · package call (never asked; contracts record it) · revisit: 'they opened it' is the follow-up cue | **built** | `stampQuoteSeen` (`app/quotes/seen-actions.ts`): first · last · count, never a chat fetch. |
| 18.8 | A stored PDF with its render hash; quote emails really sent — stand-ins · developers' lane | **stand-in** | Preview prints; `printPaper()` + `setPdfRenderer` are plug-ready (S34); quote emails = the outbox. |
| 18.9 | Sort the Items table by a column head — held · her call (REG-483, 'creating some confusion') · keep | **kept** | Her call (REG-483). |
| 18.10 | SKU and Add New Column; eight column switches refused — Coming soon · as recommended · revisit: hide the switches (1.0's SKU was real but always blank; its custom columns were unreachable) | **built** | Removed: Column settings lists only what the table draws; no Add New Column (checked). |
| 18.11 | Items › row thumbnail › Upload Logo and the Create strip's Brand Catalog tile — Coming soon · 1.0 had neither · revisit: drop or define; a photo upload still stamps a canned thumbnail (REG-415) | **built** | Upload Logo and Brand Catalog dropped (checked); Upload Image keeps the picked picture. |
| 18.12 | Quote Files › Download of a non-image — Coming soon · package call · revisit: a lead's Files now download any kind | **built** | Any kind downloads (`components/quotes/editor/files/files-section.tsx`). |
| 18.13 | Sort on the Quotes table heads (Valid until sorts) — Coming soon · her call (REG-468) · revisit | **built** | Eight heads (`sortQuotesByHead`). |
| 18.14 | Round-2 testers' asks (a priced add-on under a line, four photos per line, a bundle price per part) — held · package (the design lead's Later list, never asked) · keep | **kept** | The design lead's Later list. |
| 18.15 | A line's status (Pending · Approved · Declined) is a record with no screen (REG-435) — held · revisit: decide or drop | **built** | Decided: dropped (no screen, no writer, 1.0 had none); R106 turned the demo's Declined line into a declined optional. |
| 18.16 | Accounting approves quotes — kept with Owners and Admins · package call flagged for her (REG-1660) · needs her answer | **kept** | Decided no (1.0's owner-only rule); open for Vicky. |
| 18.17 | Word labels on the Items toolbar (D5) and muted section prompts (D7) — held · her 'not now' · keep | **kept** | Her "not now". |
| 18.18 | Quote lines from a meeting brief — held (REG-552) · see Meetings | **built** | S23: Make a draft quote from the meeting's estimate. |

### 19 · `quote-templates` — Left in Quote templates

Step: S11 — `outcome-S11.md` (19.8 by S10). Survey keys: `held:quote-templates`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 19.1 | The Outfit font and fonts a studio uploads — held · her call ('the list first, uploads later') · revisit before porting 1.0 designs: they will print in a fallback | **built** | Outfit + self-hosted faces (`public/fonts/doc/`); Brand kit › Fonts › Your own fonts (`studio_fonts`, `/files/font/<id>`); the licence tick is an honest stand-in. |
| 19.2 | An issuing entity's tagline, accent colour, contacts and footer on its quotes — partial · package call (REG-618 built logo, address, UEN and GST only) · revisit: a quote under entity B prints the studio's tagline while its invoice prints B's | **built** | `docLetterhead` + the `{studio_footer}` field (checked `lib/templates/fields.ts`). |
| 19.3 | Recreate a template from an uploaded quote — stand-in (three curated PDFs) · her call (REG-491 'a later build') · developers' lane | **built** | By rule for a PDF with words (`lib/templates/recreate.ts` `readLayout` — the model seam); a photo or picture-only PDF is matched by its name and says so. |
| 19.4 | 1.0's five cover-page presets — partial (only the Presentation style has a cover) · package call · revisit (low) | **built** | `lib/templates/covers.ts`, under the cover's More options. |
| 19.5 | Header / footer on chosen pages only — held · package call · keep (1.0 had the same three choices) | **kept** | The card's call (1.0 had the same three choices). |
| 19.6 | Template comments — held, no button left (REG-485) · her call · keep | **kept** | Her call (REG-485). |
| 19.7 | A fixed-amount row in a Payments template — partial · package call (REG-1563) · keep: the fee lives on the quote | **kept** | The fee lives on the quote (REG-1563). |
| 19.8 | Maison AI in the template, Tasks, T&Cs, Payments and Schedules editors opens an empty sheet — package call (UI sweep) · revisit: the shell's Ask box answers from the records now | **built** | S10: each editor's own suggestions on the shared sheet. |
| 19.9 | Invoice and PO paper live in Settings › Finance, not Templates — package call (one-home K2a) · revisit against the one-home rule | **kept** | Kept in Settings › Finance (one home with its numbers and preview), with a door from the Brand kit. |

### 20 · `contracts` — Left in Contracts and signing

Step: S03 — `outcome-S03.md`. Survey keys: `held:contracts`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 20.1 | Standard PDF documents added to every signing — held · as recommended (Contracts Q-26: '2.0 keeps no file bytes') · revisit: that reason ended with gaps build E | **built** | PDF templates (`contract_templates` kind `pdf` + `contract_template_files`), offered by Send together. |
| 20.2 | Import from File, Mark as signed and the Won upload keep only a name, not the PDF — stand-in · as recommended · revisit: the signed copy is the file a studio most needs to open again | **built** | The PDF kept in the lead's Files › Contract & VOs (`keepContractPdf`); Files refuses to trash it. |
| 20.3 | Signing link with a token, a 7-day expiry, resend and cancel — stand-in (keyed on the contract id) · as recommended (Q-28) · revisit: every newer client link has a token | **built** | `/sign/<token>` (`contracts.sign_token`), the 7 / 14 / 30-day window, Stop = Draft + a fresh token with Undo, reminders renew. |
| 20.4 | SMS code before signing — stand-in (any six digits) · her call (REG-534) · developers' lane | **stand-in** | Any six digits (her REG-534); a real SMS is the developers'. |
| 20.5 | Server-rendered PDF and signing packet; the link sent by SMS / email — stand-ins · developers' lane | **stand-in** | A written contract prints from Preview through `printPaper()` (plug-ready, S34); a PDF contract downloads its own file; the link travels on WhatsApp / Copy link. |
| 20.6 | A member's signature auto-applied only with their consent — dropped · package call (Accounts Setup) · revisit: 1.0 asked before stamping a signature | **built** | `members.signature_consent`, Your profile's switch, `appliedSignatureOf`; R105. |
| 20.7 | Contract value moves when a Signed quote is edited (1.0 froze it at signing) — partial · revisit | **built** | `quotes.signed_amount_minor`; the banner says when an edit moved today's total. |
| 20.8 | The 'Prepared with OpenMaison' footer stays on contracts but left invoices — package call flagged for her (REG-1120) | **built** | Removed (checked `contract-paper.tsx`). |
| 20.9 | Coming soon: New Contract ▾ › Create with AI (1.0 had none), ⋮ › Contracts Settings (1.0: Accounts › Document Templates), sort on the table heads · her call (REG-178 mock copy) · revisit: drop Create with AI, point Settings at Settings › Quotes & pricing | **built** | Create with AI gone (checked), Contracts Settings → Settings › Quotes & pricing › Contracts, head sort. |

### 21 · `price-book` — Left in the Price book

Step: S12 — `outcome-S12.md`. Survey keys: `held:price-book`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 21.1 | Matching quote lines to the book (cost filled after an upload, new-item suggestions) — filed as model work · as recommended · revisit: 1.0's matcher is plain code (synonyms + overlap) | **built** | `lib/company/price-book-match.ts` (1.0's matcher in 2.0's words): sure matches after an upload, Match N lines review, Undo. |
| 21.2 | Waste factor % per item — dropped, handed to Finance and never picked up · revisit: Order from the quote sends quoted quantities to vendors | **built** | `price_book_items.waste_pct`, applied on Order from the quote / Add from the quote, never on the quote. Open for Vicky: should the margin include waste? |
| 21.3 | Market rates, drift tab, crowd price signals; model-read vendor PDFs — platform / stand-ins · as recommended (Q-16) · keep | **kept** | The platform's / stand-ins (Q-16). |
| 21.4 | Bulk Set vendor and the import's vendor are free text, not Finance › Vendors — package call · revisit (one vendor list, N-16) | **built** | `VendorNameField` in bulk edit and the import (checked). |
| 21.5 | Old binary .xls refused — package call · keep | **kept** | Refused with the way out. |
| 21.6 | Volume tiers — declined as recommended (Q-06) · keep | **kept** | Declined (Q-06). |

### 22 · `projects` — Left in Projects

Step: S07 — `outcome-S07.md` (with S02, S23, S34). Survey keys: `held:projects`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 22.1 | AI-written schedule from the quote, a timeline from an uploaded PDF or photo, AI task suggestions — stand-ins (rules, no credits) · as recommended / package (I-Q13) · keep | **stand-in** | Rule-built, no credits (I-Q13) — kept as they are. |
| 22.2 | Generate (replace) a milestone's tasks with approval — partial (suggestions only add) · package (P-E) · keep | **kept** | Suggestions only add (P-E). |
| 22.3 | Hide modules a studio doesn't use — later · as recommended (simplify Q-11) · keep | **kept** | Later (simplify Q-11). |
| 22.4 | A payment above what is owed goes to the note, not a credit — package call flagged for her (REG-1117, D-14) · revisit: credit notes exist now | **built** | Overpayment credit notes (`credit_notes.kind = 'overpayment'`, `holdOverpayment`, `applyCredit`). |
| 22.5 | 1.0's old client links (/pay/…, /my/{studio}/p/{token}) do not redirect — waits on her (map 24 D-11) · decide before the port | **built** | S02 (`lib/links/old-links.ts`). |
| 22.6 | Files: Download on an invoice or receipt entry answers Coming soon (REG-1229) · revisit | **built** | Download opens the paper with `?print=1`; a real PDF file needs a server renderer (`setPdfRenderer`, S34). |
| 22.7 | A 3-D layout started on a lead before Won is not carried to its project — package (one-home N-10) · revisit | **built** | A lead's layouts (`space_layouts.lead_id`), carried at Won (`carryLeadLayouts`). |
| 22.8 | Tickets: AI analysis and the Proactive Alerts tab; Messages: 'Show chat history' on invite, chat with any contact, groups — dropped by package (H-Q16 · H-Q27 · P-G) · keep | **kept** | Kept dropped (H-Q16 · H-Q27 · P-G): tickets' AI analysis and Proactive Alerts, Show chat history (its dead code removed in S02), chat with any contact. Groups were built later by S26. |
| 22.9 | Floor plan live refresh — dropped by package (G-Q17) · keep | **kept** | G-Q17. |
| 22.10 | Reconcile tasks, over-bill treatments, top-up invoices, a client rating at the close — not carried as recommended · keep | **kept** | Not carried, as recommended. |
| 22.11 | Other countries' compliance lists and timelines — held (DEF-30) | **parked by her** | DEF-30 — S33 on hold. |
| 22.12 | Object storage and the five-minute reminder sweep — developers' lane | **stand-in** | Object storage stays the developers' (plug-ready `setFileStore`, S34). The sweep is built (S34: `/api/cron/<job>`, CRON_SECRET) — a scheduler has to call it. |
| 22.13 | Meeting Summary, launching the Co-Pilot from a project — held (REG-552) · see Meetings | **built** | S23: the With {client} card's Last met row; Create › Meeting on the project. |

### 23 · `finance` — Left in Finance

Step: S06 — `outcome-S06.md` (23.10 by S22). Survey keys: `held:finance`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 23.1 | Real Xero (OAuth, an organisation per entity, mapping, queue with retries, five-minute sync, expiry alert) — stand-in · package (F2-Q13) · developers' lane | **stand-in** | The developers' (F2-Q13); `setAccountingProvider` + the accounting job (S34). |
| 23.2 | Zoho Books / QuickBooks — Coming soon in Integrations · package · keep (1.0 showed them as coming soon too) | **kept** | Coming soon in Integrations, as in 1.0. |
| 23.3 | AI reading of supplier bills and invoice scans — stand-in (text PDFs by rule) · package (F1-Q10) · developers' lane | **stand-in** | Text PDFs by rule (F1-Q10). |
| 23.4 | Recurring expenses — dropped · package (F1-Q11) · revisit: rent, software and retainers recur at every studio | **built** | `expenses.repeat_*`, `raiseDueRepeats` (lazy on read; S34's `repeats` job). |
| 23.5 | Expense categories the studio edits — dropped · package · revisit: Reports group by category | **built** | Settings › Finance › Money out › Expense categories. |
| 23.6 | Expense verification track, vendor kind and default markup, several profit readings, an AI PO-vs-quote compare, commission at creation — dropped · package · keep | **kept** | Package calls; the card says keep. |
| 23.7 | The PO paper's acceptance block is off by default (1.0: on) — package flagged for her (REG-1580) | **built** | On by default (`DEFAULT_PO_PAPER`). |
| 23.8 | Accounting role leftovers: approving invoices, POs and expenses (REG-1660), raising POs, read-only Files, Settings limited to Finance — package flagged for her (P-I questions 2·3·5·6) · revisit: a bookkeeper can delete project files | **built** | Accounting raises POs, reads Files only, sees Settings › Finance alone; approvals kept with Owners and Admins (her "go ahead" 2026-10-10). |
| 23.9 | 'Where costs go' has no design-system category palette (REG-1577) — flagged for her | **built** | A house palette (`components/om/category-palette.module.css`, `lib/chart-palette.ts`) — a DS chart palette is Vicky's call. |
| 23.10 | Margin alerts across projects, the One-Click Profit card, a revenue KPI — held (N-02, her call) · keep: Reports has the numbers | **built** | S06 kept it held (N-02); S22 then built it on the Dashboard — Profit this month · Owed to you from Reports, margin rows from the projects' money (checked in `components/dashboard`). |
| 23.11 | Bank feed / matching transfers — stand-in · developers and OpenMaison ops | **stand-in** | The developers and OpenMaison ops. |
| 23.12 | DuitNow, multi-currency, the FX job — held (DEF-30) | **parked by her** | DEF-30 — S33 on hold. |

### 24 · `client-portal` — Left in the client portal

Step: S13 — `outcome-S13.md` (with S02, S34). Survey keys: `held:client-portal`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 24.1 | SMS code with rate limits at sign-in — stand-in (any six digits) · as recommended (Q-38) · developers' lane | **stand-in** | Any six digits; since S34 the portal asks the one sign-in provider with 1.0's limits once it is real, and says "Demo only — no text is sent". |
| 24.2 | Several studios on one platform (the /my studio picker) — stand-in · developers' lane | **stand-in** | One studio's portal; an unknown address gets its own notice (S13). |
| 24.3 | Client emails and WhatsApp actually sent — stand-in (outbox) · developers' lane | **stand-in** | The outbox; S34's delivery slot. |
| 24.4 | Footer Privacy · Terms · Contact links — dropped · package (H-Q27) · revisit: a portal that signs people in by phone needs a privacy notice (PDPA) | **built** | `components/portal/portal-foot.tsx`; Company › Client portal › Privacy and terms; Getting it live's fifth check. |
| 24.5 | 1.0's portal and pay links do not redirect — waits on her (D-11) | **built** | S02. |
| 24.6 | Themes, six sign-in layouts, card payments, client to-dos — dropped as recommended (Q-37 · Q-39 · Q-44 · F-15 · M-03) · keep | **kept** | Dropped as recommended. |

### 25 · `space-planner` — Left in the 3-D Space Planner

Step: S15 — `outcome-S15.md` (25.7 by S10). Survey keys: `held:space-planner`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 25.1 | Start a layout from a room photo — held · package (J-Q20) · keep: the Visualizer works on photos | **kept** | The Visualizer works on photos (J-Q20); S28 does a floor-plan photo. |
| 25.2 | AI furniture from a photo or catalogue page, AI auto-arrange, the isometric as an AI picture — stand-ins (a word table, a placement rule, a true isometric) · package · keep | **stand-in** | Kept as rule-built stand-ins (word table, Arrange's rule, true isometric). |
| 25.3 | Render Tour; Present's HD mode, sun angle and time of day — not built · package (P-J) · keep | **kept** | Not built (P-J). |
| 25.4 | Elevations' reference lines (counter, cabinets, sockets) — partial · package · revisit: cheap and useful for briefing carpenters | **built** | `referenceLinesOf` (`lib/planner/elevation.ts`), Show the usual heights. |
| 25.5 | Storeys stacked in 3D — partial (one level at a time) · keep | **kept** | One level at a time. |
| 25.6 | 1.0's ~390 furniture models (2.0 has 42 sized pieces) — partial (J-Q7) · later content work | **kept** | The content port, later (J-Q7). |
| 25.7 | The editor's Maison AI suggestions answer Coming soon · revisit | **built** | S10; checked again by S15. |

### 26 · `settings-company` — Left in Settings and Company

Step: S14 + S01 (profile lines) — `outcome-S14.md`, `outcome-S01.md` (with S09, S23, S30). Survey keys: `held:settings-company`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 26.1 | Roles & Permissions editor, custom roles — held · her call (Q-40 'recommendation (hold)') · keep: 1.0's matrix enforced almost nothing | **kept** | Her hold (Q-40), the card's recommendation; an editor first needs every rule to read a role table (the developers' auth). |
| 26.2 | Edit a member's name, email, phone, photo — dropped · package call (never asked) · revisit: nobody can fix a mistyped email that prints on quotes; the phone avatar answers Coming soon (1.0: profile popover › Your Profile) | **built** | S01: Company › Members › Edit details; Your profile. |
| 26.3 | My signature as its own card — later as recommended, never taken up · revisit: a new designer has to open a quote to set it | **built** | S01: the Your signature card. |
| 26.4 | Invite a member, sign-in, sessions, SSO — stand-ins (View as) · developers' lane | **built** | Invitations (S09), sign-in and sessions (S30, `studio_sessions`); SSO = the Qanvast provider seam (stand-in, S30). |
| 26.5 | Review Link — later as recommended · revisit: 'Ask for a review' sends a WhatsApp with no link | **built** | Company › Profile › Reviews (`lib/company/review-link.ts`); Ask for a review carries it. |
| 26.6 | Who sees leads sits in Lead management though it also governs projects, quotes and contracts — package · revisit | **built** | Moved to Settings › Roles & access; Qanvast Ops' list now follows it. |
| 26.7 | 'Studio' names both a Settings module and a Company group — package (N-06) · revisit | **built** | The module renamed "Roles & access" (checked `lib/settings/modules.ts`); the Company group keeps "Studio" (REG-484). |
| 26.8 | Qanvast Ops' home (the studio rail or Company › Integrations) — her open call (REG-1372) | **kept** | Decided as recommended: Qanvast Ops stays on the rail (REG-77); Integrations' Qanvast card is its door. |
| 26.9 | Google Calendar 'Notify me' — Coming soon · waits for Meetings | **built** | S23: Company › Integrations' Calendar invites card (.ics + Google's filled-in page) — no "Notify me" left on it (checked: "Notify me" is now only on Zoho Books); a two-way sync is the developers' (`setCalendarSync`). |
| 26.10 | AI & Copilot settings (Copilot tuning, objection responses, meeting checklists) — held with Meetings (REG-552) | **built** | S23: Settings › Meetings. |
| 26.11 | Journey mode, per-member overrides, Studio Health, lead categories, AI assignment prompt, quote approval thresholds, quote sharing, sub-categories, the competitor list, personal prefs — skipped as recommended or by her rule ('Journey and Archive are out') · keep: 1.0 saved most of them and read them nowhere | **kept** | Skipped as recommended / her rule ("Journey and Archive are out"). |
| 26.12 | Demo shows a CaseTrust badge and award while the record says not done — package flagged · her data call | **built** | Repair R116: the record follows the badge; one switch on Profile reverses it. |
| 26.13 | Branch protection on main so the design checks block — hers to switch on (REG-726) | **kept** | A GitHub setting, hers to switch on. |
| 26.14 | Studio region, currency, an entity's own tax rate — held (DEF-30) | **parked by her** | DEF-30 — S33 on hold. |

### 27 · `notifications` — Left in Notifications

Step: S18 (lane A) — `outcome-S18.md` (with S34). Survey keys: `held:notifications`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 27.1 | Daily digest email — held · Q-42 left blank, so it fell to hold · revisit: per-event email is built; a once-a-day summary is the quiet option owners expect | **built** | Your profile › Your notifications › A daily summary (8 AM; `sendDueSummaries`). |
| 27.2 | Choose who hears each notice — held · Q-43 left blank, so it fell to hold · revisit as a personal mute only (today an event can be switched off only for the whole studio) | **built** | A personal mute (`lib/notifications/personal.ts`; `emit.ts` honours it). |
| 27.3 | Email and WhatsApp really sent; the timed reminders (T−30, the 09:00 hold ping) arrive only when the bell is opened — stand-ins · developers' lane | **stand-in** | Nothing leaves the machine (`setDeliveryAdapter`). S34 built the sweep (`/api/cron/run`) that sends the timed reminders once a scheduler calls it. |
| 27.4 | The bell's 'Updates' group shares its name with a project's Updates tab — her open call (N-14) | **built** | The bell's group is "Notices" (flagged). |

### 28 · `ai-credits` — Left in AI credits and plans

Step: S19 (lane A) + S08b — `outcome-S19.md`, `outcome-S08b.md` (with S10, S23). Survey keys: `held:ai-credits`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 28.1 | Dodo checkout, the webhook grant, refresh and lapse jobs, Manage billing, tax invoices — stand-ins · as recommended (her 'go ahead and build it perfectly') · developers' lane | **stand-in** | The demo checkout; S34 added `setPaymentProvider` and `/api/webhooks/payments`. |
| 28.2 | Plan feature locks — held as recommended (Q-40) · revisit: the in-app Plans table says Free lacks X-Ray, the template editor, approvals and 'Custom stage definitions' (2.0 has none), yet nothing locks; lock or soften it before demoing Free | **built** | `PRO_FEATURES` + `requirePlan` / `usePlanLock` / `ProLocked`; the Plans table reads the plans' flags. |
| 28.3 | Auto top-up with a monthly ceiling — held by the build although her mark said build (Q-36) · tell her | **built** | `lib/credits/auto-topup.ts` (Owner, once per crossing, a monthly ceiling, off by default); told her. |
| 28.4 | Seats checked against members; Accounting takes no seat (REG-1669) — held · a pricing call flagged for her | **kept** | Her hold: seats are said, never refused; Accounting takes none. Change seats built. |
| 28.5 | Digitizing a contractor's quote into a variation order is free while Upload a quote costs 5 (REG-1200) — package call · revisit: one price table | **built** | Every quote read is 5 credits (`quote_digitize`), the VO and schedule uploads too. |
| 28.6 | Packs of 2,000 / 5,000, a '+200 this month' raise, a blocked render that runs itself, rollover, Draft quality, a manager seeing team usage, PayNow at checkout — held as recommended (keep 1.0) · keep | **kept** | Keep 1.0 — which meant building 1.0's 100…5,000 picker (1.0 moved from packs). |
| 28.7 | Maison AI on the Plan & AI credits pages — Coming soon · revisit: the answers are in the ledger | **built** | S10. |
| 28.8 | GST line at checkout — built; finance must confirm the words before go-live | **kept** | Built; the words still wait on finance. |
| 28.9 | Since 2026-10-10 every Reset to base rolls the demo's credits month (two 'credits renewed' rows, empty 'this month') — her call: shift the period with the demo day, or accept | **built** | S08b (`lib/credits/demo-month.ts`, R111); S19's R118 moves the paid work with its charges. |
| 28.10 | Co-Pilot metering — waits for Meetings (REG-552) | **built** | S23: `copilot_block`, 25 a 10-minute block (her Q-45; flag: 1.0 never charged it). |

### 29 · `ai-visualizer` — Left in the AI Visualizer

Step: S20 (lane A) — `outcome-S20.md` (with S23, S30). Survey keys: `held:ai-visualizer`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 29.1 | A real image model for every pass (render, detect any photo, lasso re-detect, empty, remove, furnish, sketch to photo, restyle in 25 looks, relight, style transfer, the finishing note, Fast vs High) — stand-ins · as recommended (audit 16) · developers' lane | **stand-in** | The curated engine; seams `runPass`, `coerceDriftReport`, `guardRender`. |
| 29.2 | Replace a piece with a new one — the build changed her answer from 'say it can't' to recolour (Q-21) and never put it back to her · tell her | **built** | As she answered (Q-21): the picker stays and says it can't draw a new piece; Recolour it to match with Undo; told her. |
| 29.3 | Drift guard (check and repair; Drift repair priced at 2 credits) — held as recommended ('not needed') · revisit for production: a real model drifts | **built** | `lib/visualizer/drift.ts`, `render_repair` 2 credits, kept only when better. |
| 29.4 | HEIC photos — partial (only where the browser opens them) · revisit: the iPhone default; a small converter (1.0: normalize-image.ts) | **built** | `lib/heic.ts` (`heic-to` 1.5.2 pinned) in every picker and Files. |
| 29.5 | Maison AI on the Visualizer home and in the editor — every suggestion answers Coming soon · as recommended · revisit: Maison AI acts elsewhere since gaps build I | **built** | Every suggestion acts; Suggest {style} finishes applies as one step with Undo. |
| 29.6 | 1.0's 900 px sample rooms (one at an off angle) still front the welcome — package call · revisit: new photography | **kept** | New photography is an asset to commission (Vicky's). |
| 29.7 | Pictures in object storage; picture routes behind sign-in with rate limits — stand-ins · developers' lane | **stand-in** | Pictures stay in the database tables (object storage and rate limits are the developers'); S30 put the studio picture routes behind sign-in (401, checked). |
| 29.8 | Co-Pilot moodboards and renders filed into a project — held (REG-552) | **built** | S23: boards kept with the meeting, Render a room opens the lead's design (the project's after Won); nothing filed into Files on its own (Q-13). |
| 29.9 | Materials: no vendor or price per material (1.0 Material Catalog) — package call · keep: the price lives in the Price book | **kept** | The price lives in the Price book. |

### 30 · `quote-x-ray` — Left in Quote X-Ray

Step: S21 (lane A) — `outcome-S21.md` (with S23). Survey keys: `held:quote-x-ray`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 30.1 | A model reading any PDF or photo of the other quote — stand-in (three curated quotes; spreadsheets are real) · her call (REG-529 'a curated engine, not a model') · developers' lane | **built** | Any PDF with words is read by rule (`lib/quotes/pdf-quote.ts` `readQuoteText`) with the adds-up check; a photo or scan is refused honestly — OCR / a model are the developers'. |
| 30.2 | Brand reading with web dossiers, market-rate bands, their arithmetic slip — stand-ins · as recommended (Q-06 · Q-23) · keep | **kept** | Web brand dossiers and market-rate bands stay the platform's (Q-23 · Q-06). Their arithmetic slip is built ("Their numbers don't add up", `slipsOf`). |
| 30.3 | Other currencies — held (DEF-30) | **parked by her** | Currencies wait with S33 (on hold); a non-S$ quote is refused at once (built). |
| 30.4 | Competitor-quote analyser in the Meeting Copilot — held (REG-552) | **built** | S23's Their quote + S21's Pro openers. |
| 30.5 | Win / loss, X-Ray settings, a PDF or public link — declined as recommended (Q-22 · Q-24 · Q-25) · keep | **kept** | Declined (Q-22 · Q-24 · Q-25). |

### 31 · `shell` — Rail, Tools and the phone bar

Step: S16 + S01 — `outcome-S16.md`, `outcome-S01.md` (the Soon items made live by S22 · S23 · S24 · S25; Sign out by S30). Survey keys: `held:shell`, `studio:studio-navigation`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 31.1 | Rail › Marketplace and the phone's More › Marketplace — Coming soon · her call (REG-808) · 1.0: a supplier brand directory with deals and brand pages | **built** | S24: Marketplace live in the rail and More (checked `TOP_ITEMS`). |
| 31.2 | Tools › Market Insights — Coming soon · her call (REG-808) · 1.0: articles OpenMaison publishes (reports, case studies, news) | **built** | S25: the Tools tile has its `href` (checked). |
| 31.3 | Tools › Meeting Copilot — Coming soon · see Meetings | **built** | S23: Tools › Meeting Copilot → `/meetings` (checked). |
| 31.4 | The quote editor's Brand Catalog tile — Coming soon · package · whether it is the Marketplace is still her call | **built** | S04 dropped the tile (1.0 had none); no Brand Catalog press left (checked). |
| 31.5 | The phone top bar's avatar — Coming soon · revisit: open View as, as the rail's studio block does (1.0: profile menu with settings and sign-out) | **built** | S01: the phone avatar opens the You sheet (Your profile, View as; later Open to new leads, Sign out). |
| 31.6 | The unsaved-edits guard misses the browser's own Back — package (REG-791) · keep: the App Router cannot hold Back | **kept** | The App Router can't hold Back; S16 made every scripted move ask the guard instead. |
| 31.7 | Rail › Dashboard and Marketplace, Tools › Market Insights and Meeting Copilot still answer coming soon (each has its own card) | **built** | Dashboard (S22), Meeting Copilot (S23), Marketplace (S24), Market Insights (S25) — none answers coming soon now. |
| 31.8 | No Log out and no personal Settings in a profile menu (sign-in is the developers') | **built** | Personal settings = Your profile (S01); Sign out (S30). |
| 31.9 | Qanvast Ops' Credits · Raise Complaint · Promote · Portfolio · Reviews & Rankings · Hangouts: 1.0's menu links to pages missing from the 1.0 repo; 2.0 has Leads · Studios | **kept** | Nothing to port (1.0's Qanvast Ops pages are gone from its repo). 2.0's Lead credits / Reviews stay signposts; Hangouts built (S27); Portfolio = public profiles (S27); Raise Complaint · Promote not drawn. |

### 32 · `consistency-leftovers` — Consistency leftovers (2.0 only)

Step: S17 — `outcome-S17.md`. Survey keys: `held:consistency-leftovers`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 32.1 | Side-panel widths 360 · 400 · 420 · 440 · 480 · 560 and xl dialog heights 928 vs 960 — package · revisit: menus got a scale (REG-728), panels did not | **built** | `PANEL_WIDTH` 360 / 400 / 480 / 560 (checked) and one xl height 928 (`Dialog height="xl"`). |
| 32.2 | Custom fields and the question bank are twin components with twin dialogs — package · revisit: copies are the drift the programme names as its root cause | **built** | `components/om/definition-list.tsx` (checked). |
| 32.3 | '3D' and '3-D' side by side ('Plan the space in 3D' beside '3-D Space Planner') — package (N-04) · revisit | **built** | "3D" everywhere (checked: no "3-D" left outside comments). |
| 32.4 | Small marks kept from mocks (X-Ray's 'S$ 45.7K', the mini discount controls, Payment Schedule heads that resize but don't drag, Settings' list chips) — package · keep | **kept** | The mocks' marks, recorded (REG-S17.5). |

### 33 · `client-links` — Client links: previews, old links, a read-only quote

Step: S02 — `outcome-S02.md` (33.5 with S23). Survey keys: `public:client-links-no-login`, `api:link-previews`, `api:portal-loose-ends`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 33.1 | Links from 1.0 already in clients' WhatsApp threads have nowhere to land in 2.0. The projects migration map's D-11 (send /pay/…, /pay/inv/…, /pay/receipt/… and /my/{slug}/p/… to the portal's sign-in) is waiting on her. | **built** | `lib/links/old-links.ts` redirects each (D-11 as recommended). |
| 33.2 | A read-only 'have a look' quote link: 1.0's /quote-preview/[token] (from the Quote Digitizer's Share) updates live as the studio edits. In 2.0 the client gets the quote only through Send for confirmation (/confirm) or the signing link. | **built** | `/quote/<token>`, ⋮ › Share a view-only link. |
| 33.3 | A real SMS code before a client link opens. 1.0's old payment portal never actually sends its code, and the quote link's code screen has no generator mounted. 2.0's portal accepts any six digits (a stand-in). This is developers' work. | **stand-in** | The developers'; nothing new claims a code. |
| 33.4 | A picture card when the link is pasted into WhatsApp. 2.0's design link has one. Its signing, confirm, invoice, receipt and PO links show their title only, where 1.0 showed the website's card. Small. | **built** | The studio's card on every client link (`app/card/[kind]/[key]`). |
| 33.5 | The meeting brief link /copilot/share/[shareId] is held with Meetings (REG-552). The X-Ray's public link was decided no (X-Ray audit Q-24). | **built** | The meeting brief link came with S23 (`/meeting/<token>`; 1.0's `/copilot/share/<id>` redirects). X-Ray's public link stays declined (Q-24); its old address lands on the studio's notice. |
| 33.6 | A preview card on every link sent to a client: /sign, /sign/bundle, /confirm, /invoice, /receipt, /po, /my/[slug], /space, /f | **built** | As 33.4. |
| 33.7 | Note: 1.0's card says 'OpenMaison', which breaks 1.0's own rule that clients never hear the platform's name | **built** | Fixed: every word on the card is the studio's. |
| 33.8 | Share a render file from Files straight to the portal's Designs (inventory H-82…H-84; no map row) | **built** | Files › Show to client lands a render on the portal's Designs (`render_share_links.file_id`). |
| 33.9 | The line count on 'From the signed quote' (map MI-014 says kept, but the count was dropped) | **built** | `signedQuoteLines`: "From the signed quote · n line items". |
| 33.10 | A redirect for 1.0's old /my/[slug]/p/[token] links (map 24 D-11, still waiting on you) | **built** | As 33.1. |
| 33.11 | Developers' clean-up: invitePortal still writes homeowner_lead_links.chat_history_visible and invite-portal-modal.tsx still has 'Show chat history'; neither is mounted or read (H-Q16 dropped it) | **built** | Removed (checked: no `invitePortal` / Show chat history code left, comments only); the column stays (additive). |

## For the developers

### 34 · `real-services` — Real services behind the stand-ins

Step: S34 (lane B) — `outcome-S34.md`. Survey keys: `api:message-delivery-providers`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 34.1 | A real email and WhatsApp provider behind setDeliveryAdapter (Resend · 360dialog or another) | **stand-in** | Plug-ready: the adapter contract, the `globalThis` slot, the allow-list, `not_in_plan` never handed over, a start-up warning. No provider here. |
| 34.2 | The production five-minute sweep that runs deliverDerived and releaseHeldMessages for every member; today these run when someone opens the bell | **built** | `runJobs` behind `/api/cron/<job>` (CRON_SECRET, idempotent). |
| 34.3 | Delivered and Read receipts from WhatsApp; 2.0's Sent messages knows only sent, failed, held and no address | **built** | `POST /api/webhooks/whatsapp`, `applyReceipts` → Delivered · Read in Sent messages. |
| 34.4 | Branded HTML emails (the studio's logo and colours) in place of plain text | **built** | `emailHtml` — a first cut for Vicky (the look is hers). |
| 34.5 | What happens to a client's WhatsApp reply (1.0 only logged it) | **built** | `inbound_messages`, filed into the client conversation. |

## I’d skip

### 35 · `marketing-site` — The marketing website and Book a demo

Step: S35 (lane A) — `outcome-S35.md`. Survey keys: `public:marketing-website`, `onboarding:book-a-demo`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 35.1 | Home, Platform hub and the 8 module pages, Story, Trust & Security | **built** | `/site` (`app/site/**`, `components/site/*`), 2.0's names. |
| 35.2 | Blog index + 21 articles, What's New changelog, Jobs page | **built** | The Journal with 1.0's 11 articles (the card's 21 was a miscount), What's New 29 of 30, Jobs. |
| 35.3 | Contact form (saved, and emailed to the team), the footer's newsletter sign-up, 'Book a demo' form → Calendly | **built** | `contact_messages`, `newsletter_subscribers`, `beta_signups` + Calendly; the team's emails go through the outbox (delivery a stand-in). |
| 35.4 | Privacy, Terms, Cookies pages | **built** | Privacy and Terms verbatim; Cookies rewritten to the cookies 2.0 sets. |
| 35.5 | SEO layer: metadata, structured data, sitemap, robots (blocks AI training crawlers), the branded link-preview picture | **built** | Titles, JSON-LD, sitemap, robots (AI training crawlers blocked), `llms.txt`, `/card/site/<page>`. |
| 35.6 | UAE free-trial landing page /uae-get-started (regions beyond Singapore are held, DEF-30) | **parked by her** | Her hold (2026-10-12, REG-1854). |
| 35.7 | The site's words describe 1.0's modules and names (Quote Digitizer, Meeting Co-pilot, mAIson bot) — they will need updating to 2.0's (Quote X-Ray / Upload a quote, Maison AI) when 2.0 ships | **built** | Every page in 2.0's names; claims 2.0 doesn't make cut. S42 still checks the Home's results band (steps.md note). |
| 35.8 | Book a demo form → beta sign-up list + Calendly | **built** | The list itself is Platform admin's (excluded); the rows are kept for it. |
| 35.9 | The UAE campaign landing page | **parked by her** | Her hold. |

### 36 · `try-it` — Try the AI Visualizer without an account

Step: S36 (lane A) — `outcome-S36.md`. Survey keys: `public:try-it-visualizer`, `onboarding:try-visualizer-public`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 36.1 | The anonymous trial editor: upload or sample → style / materials / lighting / furniture / defurnish / sketch, with before/after and download | **built** | `/site/try` — the studio's own editor (`components/visualizer/trial/*`, shared `room-session.ts`). |
| 36.2 | 3 free renders per browser, a watermark on every result, a sign-up gate at the end | **built** | 3 a browser (a signed cookie, `om_trial`) + 10 a minute; 1.0's mark on every picture; 1.0's gate. |
| 36.3 | Six per-tool landing pages with their own search-engine copy | **built** | `/site/try/{style,…,sketch}` with 1.0's search-engine copy. |
| 36.4 | In production it shows 'not found' unless a flag is set. 1.0 is still waiting for bot protection (Turnstile) and a lasting rate-limit store. | **stand-in** | The switch is built (`TRIAL_VISUALIZER_ENABLED`; on in the demo through `TRIAL_IN_DEMO`); Turnstile and a lasting limit store are seams (`setBotCheck` · `setLimitStore`). |
| 36.5 | A public, no-account try of the visualizer with a one-render limit and a watermark | **built** | With the limit 1.0's code has, three (the "one-render" figure was 1.0's superseded `/try`). |

### 37 · `verify-listing` — Verify for a Qanvast listing

Step: S37 (lane B) — `outcome-S37.md`. Survey keys: `studio:verify-listing`, `onboarding:qanvast-listing-verification`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 37.1 | Apply to be listed on Qanvast, with documents | **built** | Company › Profile › Listed on Qanvast (`components/company/qanvast-listing-card.tsx`, `studio_verifications` + files). |
| 37.2 | A staff queue to verify or reject an application with a note | **parked by her** | The staff queue is Platform admin (excluded by her); its two answers land through `POST /api/webhooks/qanvast-listing`; the demo's "(demo)" answers stand in. |
| 37.3 | A studio's application to be listed on Qanvast, reviewed by staff | **built** | The application is built; Qanvast's review is a stand-in (the seam + webhook; the demo's plays are labelled). |

### 38 · `languages` — Languages (Arabic)

Step: S38 — **parked by her** (REG-1836; no outcome file). Survey keys: `onboarding:languages`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 38.1 | Nothing working to port: an Arabic 'Book a demo' form nobody can switch to | **parked by her** | Languages parked by her (REG-1836). |

### 39 · `studio-health` — Studio Health (app usage for the owner)

Step: S39 — **being built now** (no `outcome-S39.md` yet). Survey keys: `studio:studio-health`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 39.1 | Engagement tiles: active members, sessions, AI runs, page views | **in progress** | S39 (Studio Health) is being built; no outcome file yet. |
| 39.2 | Team and client-portal activity tiles | **in progress** | S39 (Studio Health) is being built; no outcome file yet. |
| 39.3 | Top pages, feature funnels, a table per member | **in progress** | S39 (Studio Health) is being built; no outcome file yet. |
| 39.4 | Page-view and event tracking with a nightly rollup | **in progress** | S39 (Studio Health) is being built; no outcome file yet. |

### 40 · `portfolio-profiles` — Designer portfolio profiles

Step: S27 built it (`outcome-S27.md`); S40's completeness check rides with S39 — **in progress**. Survey keys: `api:designer-portfolio-profiles`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 40.1 | Years of experience and specialisations on a designer's public card | **built** | S27: `members.portal_years`; Known for = the member's specialty. |
| 40.2 | Portfolio projects with pictures per designer | **built** | S27: `member_portfolio_projects` · `member_portfolio_pictures`. |
| 40.3 | A screen to edit any of it (1.0 has none: its editor is dead code) | **built** | S27: the member's Public profile page (`app/company/members/[memberId]/profile`). |

### 41 · `sandboxes` — AI model sandboxes (7 pages)

Step: S41 — **being built now** (no `outcome-S41.md` yet). Survey keys: `studio:ai-sandboxes`.

| # | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| 41.1 | Outpaint, Reangle, Orbit video and Depth — experiments that only ever lived here | **in progress** | S41 (AI sandboxes) is being built; no outcome file yet. S20 and S28 named 1.0's sandbox pages for it. |

## Two survey entries that never reached a card

`compile.py` builds the 41 cards from 60 survey entries. Two entries are on no card, so the report never showed their lines: the roles editor
(the settings-company card mentions it only in its *why*) and the usage analytics jobs (Studio Health's back end). They are listed here so that
nothing is missed. **They are not in the counts above.**

| Survey key | Pending line (verbatim) | Status | Where / why |
| --- | --- | --- | --- |
| `studio:roles-permissions-editor` | Custom roles | **kept** | Her hold (Q-40). S14 kept the editor held, as the settings-company card recommended (line 26.1): 2.0's *Who may do what* is computed from the rules the app enforces, and an editor would first need every rule to read a role table (the developers' auth work). |
| `studio:roles-permissions-editor` | Page access, data scope and action switches per role | **kept** | As above. |
| `studio:roles-permissions-editor` | Overrides for one member | **kept** | As above; "per-member overrides" also kept skipped on line 26.11. |
| `api:usage-analytics` | Event tracking across the app | **in progress** | Goes with Studio Health (S39, being built). S30 built the session record (`studio_sessions`) and left the usage events to S39. |
| `api:usage-analytics` | Daily rollups per studio and per member | **in progress** | S39. S34 lists 1.0's `usage-rollup` cron for it. |
| `api:usage-analytics` | Pulling totals from each customer's deployment | **parked by her** | 1.0's `fork-analytics-pull` is an OpenMaison platform job. S34's registry note files it under Platform admin, which she excluded. |
| `api:usage-analytics` | 90-day retention | **in progress** | S39. S34 lists 1.0's `usage-retention` cron for it. |
| `api:usage-analytics` | The platform's Admin › Analytics dashboards (no audit decides them; Studio Health for the owner was dropped, Accounts Setup Q-16) | **parked by her** | Platform admin ("you can ignore admin"). |

## Not answered

**None.** All 314 card lines have an answer. Each card's lines were matched against its step's ledger table. The parked cards (S32, S33,
S38) were matched against `steps.md` and REG-1836 · REG-1837. S39 and S41 are marked in progress.

Some lines were answered only indirectly, because no outcome quotes them by name. They are recorded so the reader can judge them:

- **15.1, 15.4, 15.6** (the parked `appearance` card). Answered by other steps: S01's Your profile, S22's decision that the Dashboard needs no
  Home Screen choice, and S16's Open to new leads.
- **16.1–16.6 and 38.1.** No outcome file exists. The status comes from `steps.md` (S33 on hold, S38 parked) and REG-1836.
- **26.9** (Google Calendar "Notify me"). S23's ledger answers "Google Calendar invites" but doesn't name the press. The code was checked:
  Integrations' Calendar invites card has no Notify me. The only Notify me left is on the Zoho Books row (1.0 also showed Zoho as coming soon,
  line 23.2).
- **17.8, 22.12, 23.10, 27.3.** An earlier step's answer was changed by a later step: S34 made the lead webhook and the sweep real, and S22
  built the One-Click Profit tiles. The ledger shows the later state.

### Answered, but her call is still open

The steps built these as recommended and flagged them. Nothing is missing, but each one waits on Vicky:

- **17.1** Manage Stages: the row opens Lead stages; the card had said to hide it.
- **18.16** Accounting approving quotes: answered no, following 1.0's owner-only rule.
- **21.2** Whether the margin should include waste.
- **2.21** Signing off the lead brief's copy (REG-169).
- **23.9** A DS chart palette (the house one is in use now).
- **27.4** "Notices" as the bell's group name.
- **28.8** The GST wording at checkout (finance).
- **3.15 · 28.10** Co-pilot metering at her Q-45 price. 1.0 published the price but never charged it.
- **29.2** Replace now recolours, as she answered; she was told.
- **29.6** New sample-room photography.
- **26.13** Branch protection on main.
- **1.5** Workload without tasks per member.
- **3.10** Meeting Summary as a *Last met* row instead of a card.
- **4.4** Banners that don't rotate.
- **8.1** No credits for the 3D picture.
- **15.6** A second Open-to-new-leads control.
- **34.4** The branded email's look.

## Found in 1.0, not on a card

Every item the outcomes list under "Found in 1.0, not on a card", together with the 1.0 rows that S01, S03, S09, S15 and S16 kept in their
ledgers. **Open** marks an item that no step built or decided; the next section collects those for S41b.

**S01 · Your own profile**
- The studio name read-only on the profile: built (the role line).
- The phone normalised to E.164, region-aware: kept (Singapore's 8 digits; regions on hold with S33).
- My Signature › Auto-apply on approval: built in S03 (the consent switch).
- A sign-in number change sends no code: a stand-in in S01, built in S30 (a code confirms a new sign-in number or email).
- The profile menu's Settings / Accounts Setup / Sign out: kept (they are the rail's Settings and Company); Sign out built in S30.

**S03 · Contracts:** 1.0's `/sign/<token>` links: built (the port column `contracts.sign_token` / `contract_bundles.sign_token`).

**S09 · Inviting your team**
- Roles on the invite, and only an Owner invites an Owner: built.
- `plans.max_members` (shown, never checked): said, never refused (kept; her seat hold, S19).
- "Request member addition" (an email to OpenMaison staff) and Pending requests: kept out (a 2.0 studio adds its own members, REG-646).
- A Hangout's invitation (`hangout_event_id`): built in S27.
- The login refusal "You have a pending invitation": built in S30 (an open invitation joins on sign-in; an expired one is refused).

**S15 · Space Planner**
- 1.0's Kitchen / Wardrobe Elevation presets: built (`firstWallOf`).
- Doors and windows labelled with size, sill and head: built (the wall list names them).

**S16 · Rail and phone bar (1.0's frame)**
- G then I (Inbox): built as G then M (Messages). G then E (Escalations) has no rail place; tickets live in Projects › Tickets.
- Badges capped at "99+": built (`badgeCount`).
- Open / Closed to new leads: built.
- The logo opening the Dashboard: kept (the mock's logo expands the rail; S22 kept that).
- Qanvast Ops only for a Qanvast-listed studio: kept (1.0 sets `isQanvastListed: true` for every studio; S31 · S37).
- The offline banner and the Quick Action menu: not brought (both were dead in 1.0).
- A count on Leads: not added; flagged for Vicky (2.0's red rule).

**S18 · Notifications**
- The bell's All / Unread pills: already decided (UC-075 "changed"); not built.
- `whatsapp-status` and `recipient-allowlist.ts`: built in S34 (`serviceWarnings`, `NOTIFY_ALLOWLIST`).
- Stored and cancellable reminders (`notification-scheduled`): 2.0 works every reminder out from its date; the sweep was built in S34.
- Studio-wide digests and recipient roles per category: replaced by each member's own summary and mute. **A studio-wide "everyone gets a
  digest" switch is not built.**
- `dedupe.ts`: not needed (one notice per action, keyed messages). `log-hub` and `admin/notifications`: Platform admin. The portal's bell,
  the message wording and the client-message settings were already built.

**S19 · AI credits**
- **Flat issuance (extra seats buy access, not credits): flagged for Vicky, not built.**
- **Seat enforcement (refusing a member past the seats, with Add a seat): flagged, not built** (her seat hold). Change seats is built.
- Yearly plans granting twelve months at once: kept 2.0's monthly grant (credits Q-43).
- Free running in 30-day cycles from sign-up: kept 2.0's period; noted for the port.
- The seat picker as a select: the house stepper is used instead.
- `quote_xray` priced at 10 and never charged: S21 decided X-Ray stays unmetered.
- Approvals opt-in on PLG: noted; 2.0's defaults unchanged. Pending approvals stay decidable on Free: kept.
- The render drift repair credit: built in S20. Billing alerts to the platform's Slack: Platform admin.

**S20 · AI Visualizer**
- The AI sandboxes (six `tools/*-sandbox` pages, spatial-view / depth-parallax, the outpaint · reangle · orbit · depth routes): **S41, in
  progress.**
- `mask-composite.ts` and `/api/render/segment`: the developers' (they need the model).
- `/api/render/room-scan`: already said by rule (`toolAvailability`).
- `/api/render/photorealistic` (15 credits): left unused by S28 (no credits; flagged).
- Port spec V17 (a drift repair can add 2 credits after a Generate): built.

**S21 · Quote X-Ray**
- 1.0's demo competitor quote: built (`public/uat-files/urban-nest-competitor-quote.pdf`).
- The currency sniff: built as the refusal.
- The `quote_xray` price: decided (unmetered).
- The anonymous run: dead in 1.0 (removed 2026-09-23).
- The 2026-10-01 reskin: screens only.
- Every other X-Ray file is mapped: nothing for S41b.

**S22 · Dashboard**
- The Business Performance Analyzer and its quick queries: answered by rule where 2.0 has the facts. "Most likely to close" has no rule
  (no lead score); that waits on the model seam.
- The inline conversation: the Maison AI sheet's Recent.
- The page tip and the skin's greeting: parked with S32.
- The rotating chip marquee and 1.0's DRY_RUN headlines: not carried (the headlines were invented stories under real newsrooms).

**S23 · Meetings**
- Ask Copilot: answered by rule as the meeting page's suggestions.
- Floor-plan notes (a canvas 1.0 never saved): not rebuilt; mark-up is the project's Floor plan.
- The outcome on End: derived from the lead.
- Wake lock: none (the page saves as you type).
- Per-item share links: one link per meeting.
- "Powered by", demo mode, the debug engine: not carried.
- Speaker labels, transcript clean-up, audio chunks: go with the transcriber (the developers').
- 1.0's bugs fixed on the way.

**S24 · Marketplace**
- The brand's products: built (Products, Add to Price book).
- Addresses, email, YouTube, the brand's line, flash deals, deal dates: built.
- The featured strip: dead code; its live part kept.
- `isUpsizePromo` and `dealsRedeemedCount`: not carried.
- Category pictures: not drawn.
- `vendor-card.tsx`: an unused mock.
- The Marketplace Categories admin and its flag: Platform admin.
- The PO dialog's "Add new vendors in Marketplace.": the intent is built (Add to my vendors).

**S25 · Market Insights**
- A draft opening at its address: not carried.
- 1.0's seeded articles (figures credited to real bodies): not carried; labelled samples were written instead.
- Region-scoped articles: wait with S33.
- The CMS and its flags: Platform admin.
- The role editor's permission: the editor stays held.
- "Shown on the marketing pricing surface": S35 kept the pricing page hidden.
- **1.0's studio addresses `/tools/market-insights` and `/tools/market-insights/<id>` are not redirected. Open:** S02 redirects only the
  links 1.0 sent to clients, and no other 1.0 studio page (`/tools/quote-xray`, `/tools/ai-visualizer` …) redirects either.
- The small marks (crumb, cover fallback, y-axis label, per-series colours, the Navigator's redirect): decided.

**S26 · Team chats**
- Read receipts: built ("Seen by …").
- "Send via Chat" on the brief: built (Share with the team).
- "Draft Message": built (⌘K › Create › New message).
- The lead drawer's Chat: now the lead's own conversation.
- Call / Video call, online status, Archive: not carried.
- `chat-highlights.tsx`: Needs you does its job.
- "View messages": the Dashboard's Messages tile.
- The coach marks: parked with S32.
- External participants and `messages.status`: not carried.
- The `i` key: G then M.

**S27 · Hangouts**
- Built: each designer's share, the preferred profile with its six weights, the table per shift, pre-registering a designer, a lead from a
  meeting (the booking is the lead), the desk's walk-ins, promised meetings, the homeowner's confirmation (outbox), the live board's refresh,
  the `/hangouts/<eventId>` redirect, and portfolios edited on the studio's side.
- Kept: vouchers (Qanvast's rewards).

**S28 · Floor plan to 3D**
- The calibration workbench `/tools/floorplan-3d-sandbox`: **S41, in progress.**
- The fidelity gate with its silent retry, Regenerate, and `floorplan-scaffold.ts`: not needed without a model; the planner draws the placed
  rooms.
- scanic's paper finder: a rule stand-in (`findPaper`, no perspective correction).
- Example tiles and the Beta tag: dropped.
- **The planner's AI plan reading (TD-078: `cv-preprocess`, `floor-plans/generate` v1–v3): the developers'.** Its Calibrate Scale step is
  built as *A length on the plan*.
- "Share to portal": 2.0's existing ways.

**S29 · Writing help**
- The AI badge / Remove AI flag: not carried, on purpose (nothing in 2.0 is written by a model).
- "Regenerate selected section (AI)": built in 2.0's shape.
- The AI toasts: replaced by the proposal and Undo.
- `skipTools` never honoured: a note for the developers.
- **The quote document editor's other parts (sections as blocks, conditional visibility, bulk delete / duplicate, page breaks): open, for
  S41b to confirm against S11.** 2.0's template model already has blocks and a page-break element (`lib/templates/model.ts`).

**S30 · Signing in**
- Session analytics: the record is built (`studio_sessions`); the usage events go to S39 (in progress).
- The terms line under sign-in: built in S35.
- Test numbers, `PHONE_OVERRIDE`, a durable limiter, the Qanvast token refresh: the developers'.
- `/admin/login`: Platform admin.
- The `users` table with `password_hash`: never read; the developers may drop it.

**S31 · A new studio**
- The admin form's password: nothing to build.
- A studio's region: S33, on hold.
- `verification_status`: built by S37.
- Studio status, Beta sign-ups, the staff interview: Platform admin / staff.
- **`settings.workflow.leadAssignment` (auto / round-robin / manual): open.** It appears only in 1.0's interview doc, never in its code.
- **1.0's per-studio Project Types editor (Accounts › Project Types): open**, her call whether studios edit their project types.
- `chat_identity_name`: nothing to build.

**S34 · Real services**
- 1.0's other crons: `invoice-overdue` is a derived reminder, `copilot-analytics` is read on demand, `poll-emails` is Gmail's seam, and
  `fx-rates` waits with S33.
- **`price-drift`, `aggregate-rates`, `brand-dossier-scan`, `usage-rollup`, `usage-retention`, `fork-analytics-pull` were named for S41b.**
  The registry files them as platform jobs; the usage ones go with S39.
- `email-gallery`: one preview per outbox row instead.
- `log-hub`: Platform.
- Webhook endpoint management: already Integrations' actions.

**S35 · The website**
- **1.0's web manifest (`src/app/manifest.ts`): open**, for the developers / Vicky (2.0 has no app icon set yet).
- The Arabic pages: Languages, parked.
- The UAE page's FAQ and form: her hold.
- `/try`: built by S36.
- The older landing parts and the articles' image prompts: not ported.
- Vercel analytics and the contact email's reply-to: the developers'.
- **The module FAQs (`MODULE_FAQS`) drawn on the pages: open, her call.** 1.0 held them back too; they are kept as data.

**S36 · Trial**
- The older `/try` and `/api/demo/restyle`: superseded in 1.0; the old address opens the trial.
- "Detect again" and the per-surface lock: not in 2.0's editor, so not added for the trial alone.
- `track()` analytics: the developers'.
- The full-screen Before / after: the stage's Compare does it.

**S37 · Qanvast listing**
- `studios.verification_status`: built as the record's read.
- `isQanvastListed`: kept for every studio; Integrations' card says Connected only when the studio is listed.
- The admin badge and the pending count: Platform admin.
- **1.0's platform-curated accreditation badges: open, for S41b to confirm.** The catalogue itself is Platform admin. The studio's switch-on
  and the quote's Accreditation strip look covered by 2.0's brand kit badges (`BrandKit.badges`) and the template's badges block
  (`lib/templates/model.ts`).

### Still open after the steps (for S41b's part 2)

| Item | Found by | What it would take |
| --- | --- | --- |
| 1.0's studio bookmarks (`/tools/market-insights[/<id>]`, `/tools/quote-xray`, `/tools/ai-visualizer` …) | S25 | A studio-route table beside `lib/links/old-links.ts` (or `next.config.ts` redirects) mapping each 1.0 path to its 2.0 home; an article id maps to `mi-<id>`. Server only, but where each lands is her call. |
| The quote document editor's other parts | S29 | Read `outcome-S11.md` and the template editor against 1.0's `quote-document-editor.tsx` (blocks, conditional visibility, bulk delete / duplicate, page breaks); build any missing piece in the template editor, not the quote. |
| A per-studio Project Types editor | S31 | A Settings › Projects list (the Trades card's grammar) behind `PROJECT_TYPES`, with a schedule rule per type; needs her yes. |
| Auto / round-robin lead assignment | S31 | It never existed in 1.0's code. If wanted, it is a Lead management rule on top of `suggestMember` (REG-612); otherwise record it as nothing to port. |
| The web manifest | S35 | An app icon set (Vicky's design) and `app/manifest.ts`. |
| The site's module FAQs drawn | S35 | `MODULE_FAQS` + `faqJsonLd` already exist; drawing them is her call. |
| The accreditation strip vs the brand kit's badges | S37 | Compare 1.0's `accreditations-tab.tsx` and its strip with `BrandKit.badges` and the badges block. The catalogue is Platform admin. |
| Platform crons (`price-drift`, `aggregate-rates`, `brand-dossier-scan`) | S34 | Platform jobs over crowd rates and web dossiers (Q-23 kept 2.0's curated notes). Record them as platform; the usage crons go with S39. |
| A studio-wide "everyone gets a digest" switch | S18 | A Settings › Notifications switch over `sendDueSummaries`. Not asked for. |
| Flat issuance, seat refusal, a count on Leads | S19, S16 | Vicky's pricing and red-rule calls, flagged. |
| The planner's AI plan reading (TD-078), `mask-composite` | S28, S20 | The developers' (they need a model). |

## Claims that didn't hold

**None of the spot-checked claims failed.** More than 100 "built" claims (about 120 checks) were checked in the code, from every step that has an outcome. Each check
grepped the named file for its symbol, or for the absence of a removed press, against the main working tree on 2026-10-13. Examples:

- **S01** `saveMyDetails`, `detailsClash`, `/profile`.
- **S02** `lib/links/old-links.ts` (quote-preview), `app/quote/[token]`, `invitePortal` gone.
- **S03** `contracts.sign_token`, `stopSigningLink`, `quotes.signed_amount_minor`, "Prepared with OpenMaison" gone, "Create with AI" gone.
- **S04** `clientQuoteOf`, `app/confirm/[token]`, `stampQuoteSeen`, `draftPlan`, the "XLSX · CSV" chip, Brand Catalog / Add New Column /
  Upload Logo gone, `quotes.confirm_token`, `client_view_count`.
- **S05** `lead-stages-card.tsx` and the Manage Stages door, `note-refine.ts`, `client_uen`, `appeal_of`, From Company Files gone.
- **S06** `raiseDueRepeats`, the expense categories settings, `DEFAULT_PO_PAPER`, `repeat_every`.
- **S07** `holdOverpayment`, `carryLeadLayouts`, `FileRow.paper` + `?print=1`.
- **S08** `welcomeFor`, the set-up card.
- **S09** `studio_invitations`, `app/join/[token]`, `acceptInvitationOf` on sign-in.
- **S10** `readQuestion`, `maison_questions`, Maison AI in all eight editors.
- **S11** `studio_fonts`, `covers.ts`, Outfit, `{studio_footer}`.
- **S12** `matchLines`, `waste_pct`, `VendorNameField` in bulk edit.
- **S13** `portal-foot.tsx`, `FOOT_LINKS`, the face route.
- **S14** `review-link.ts`, "Roles & access", the PayNow dialog.
- **S15** `referenceLinesOf`.
- **S16** `badgeCount`, `setMyAccepting`, G then M.
- **S17** `PANEL_WIDTH`, `definition-list.tsx`, no "3-D" left outside comments.
- **S18** `your-notifications.tsx`, "Notices", the mute in `emit.ts`.
- **S19** `PRO_FEATURES`, `requirePlan` on X-Ray's actions, `auto-topup.ts`, `quote_digitize` on the VO upload.
- **S20** `lib/heic.ts` + `heic-to`, `drift.ts`, `render_repair`.
- **S21** `readQuoteText`.
- **S22** `app/dashboard`, `/` → the Dashboard, `rss.ts`, the Profit this month tile.
- **S23** `readMeeting`, `/meeting/[token]`, the `/copilot/share` redirect, `objections.ts`, `copilot_block` 25, the Calendar card without
  Notify me.
- **S24** `/marketplace`, `vendors.marketplace_brand_id`, the rail's `href`.
- **S25** `/market-insights/[articleId]`, `market_insights`, the Tools `href`.
- **S26** `startDirectChat`, `pair_key`.
- **S27** `/hangout/[token]`, the member's public profile, `member_portfolio_projects`, `portal_years`.
- **S28** `straighten.ts`, `components/planner/photo`.
- **S29** `writing-help.tsx`, `proposeWriting`.
- **S30** `/sign-in`, `studio_sessions`, `proxy.ts`, "Sign out", `signedOutResponse` on the picture routes.
- **S31** `createStudio`, `OPENMAISON_SIGN_UPS_PAUSED`.
- **S34** the registry, `/api/cron/[job]`, `/api/webhooks/whatsapp`, `/api/webhooks/leads/[token]`, `inbound_messages`, `inbound.ts`.
- **S35** `/site`, `beta_signups`, `llms.txt`, `OLD_SITE_ADDRESSES`.
- **S36** `/site/try`, `TRIAL_VISUALIZER_ENABLED`, `TRIAL_IN_DEMO`.
- **S37** the listing card, `studio_verifications`, the listing webhook.

Things that read differently from their write-up but still hold:

1. **`fetchedForPreview`** lives in `lib/link-cards/origin.ts`, not in `lib/link-cards/bots.ts` as `steps.md`'s note after S02 says.
   `bots.ts` holds the fetcher list (`isPreviewFetcher`) that `origin.ts` imports. The behaviour holds: `app/quotes/seen-actions.ts` and
   `app/meeting/actions.ts` refuse to stamp a preview fetch.
2. **Presses removed by S03, S04 and S05** (Create with AI, Brand Catalog, Add New Column, Upload Logo, From Company Files) and S02's
   `invitePortal` / Show chat history still have their names in code **comments** that record the removal. No live string or control is
   left.
3. **S16's "kept as a signpost" answers** (Marketplace, Market Insights, Meeting Copilot, Dashboard) were overtaken by S22–S25. The rail's
   `TOP_ITEMS` and the Tools tiles now carry live `href`s, so no Soon is left on them.
4. **Lines whose first answer a later step changed** (17.8, 22.12, 23.10, 26.9, 27.3) were checked in the code at their later state.
