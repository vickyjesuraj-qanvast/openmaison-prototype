# A · The Dashboard as it is (2026-10-26)

Study A of three (README › *How it runs*). This is a read-only audit: no code was changed. It covers the page per role, the problems Vicky
named (measured), Maison AI on the page, consistency, every width, and what must survive.

**How it was seen.** The production build in `.next` (BUILD_ID `MHAkhE0SiRLF-VtUijMbvS`, built 24 Oct 23:52, the same tree as `83d7c1f8`)
ran with `next start -p 3221` against a copy of `scratchpad/calls-close/base.db`. Because that copy was two days old, **the baseline was
restored onto the copy** (`DATABASE_URL=… tsx scripts/restore-baseline.ts`), so the demo day is today, Mon 26 Oct; `local.db` was not
touched. The signed-in member was switched by setting `members.is_you` on the scratch DB (View as's own flag). The six roles were Dane
(Owner), Hui Min (Admin), James (Manager), Germaine (Designer), Priya Tan (Accounting) and Nurul Huda (Marketing). Widths: 1440×1024,
1280×800 and 1024×768 with a mouse; 768×1024, 390×844 and 844×390 with touch. Every role was shot at every width, first screen and full page
(72 shots), plus the presses. The scripts and the measurements (`capture.cjs`, `press.cjs`, `type.cjs`, `fab.cjs`, `keys.cjs`,
`measures-*.json`, `press-log.json`) are in `…/scratchpad/dashboard/`, and the shots are in `…/scratchpad/dashboard/shots/`. The server on
:3221 was stopped afterwards.

Sources read: `components/dashboard/{dashboard-view,dashboard-ghost}.tsx` + `.module.css`, `app/dashboard/*`, `lib/dashboard/{model,queries,updates}.ts`,
REG-2002…2013 · 2233…2242 · 2248 · 2294 · 2448 · 2476 · 2504 · 2514 · 2914, `…/30-pending-modules-build-2026-10-11/steps/outcome-S22.md`,
`DESIGN-PRINCIPLES.md`, and the house pieces it composes (`AiBrief`, `Card`, `Row`, `MyWorkCard`, `ComingUpCard`, `StatTile(s)`,
`MaisonAi` / `MaisonAiSheet` / `MaisonFab`).

---

## 1 · The page, per role

### The frame (every role)

- `/dashboard` sits inside `AppShell` (the rail, the phone's top bar and dock, the snackbar host, the FAB). It is the rail's first item,
  G then D, and the front door at `/` for every role except Accounting (`/` → `/company/finance/todo` — checked).
- **L1 header** "Dashboard": the title alone, with no action, date or filter.
- **The brief** (`AiBrief stage="dashboard"`, the lead Overview's mocked MAISON AI BRIEF 858:24867, full width) holds the yellow tag
  "TODAY · MON 26 OCT", one rule-written sentence, **the Ask box** (the FAB sheet's field, "Answers from your records"), and two
  outlined buttons (two questions, by role).
- **Two stacks** on the project Overview's grid, weighted act : glance 53 : 33 (796 : 496 px at 1440). The act stack holds Needs you · MY
  TASKS · Coming up. The glance stack holds Where it stands · Workload · Site updates · From Market Insights. The stacks merge into one
  column at ≤1024, and a phone reorders them by `order` (needs, tasks, coming, stands, team, updates, article).
- **The data:** one server read, `fetchDashboard()` (`lib/dashboard/queries.ts`). It calls `fetchProjectDetail()` for **every**
  project the viewer sees, plus the leads rows, Finance › To do, `railBadges`, meetings, Hangouts, articles, unread chats, members,
  capacity, Insights / Sales, the ticket tally, `buildReport('ar'|'pl')` and the Qanvast listing. Each read is wrapped in its own
  `.catch`, so a part that fails leaves its card out. TTFB was **0.29 s** (Leads 0.07–0.09 s).
- Nothing on the page refreshes on its own. It is the state at load, plus `router.refresh()` after a task is ticked.

### Dane (Owner) · Hui Min (Admin) — the full page (1440: 1,770 px tall, 1.7 screens)

| # | Card | What it shows (demo, today) | Data comes from | What a press does | Reason · where it is weak |
|---|---|---|---|---|---|
| 0 | **MAISON AI BRIEF** (1316×264) | "Good afternoon, Dane. **15 things need you** — first, **“Feature wall panels have arrived” — HDB 5-Room — Benjamin Han**. 1 task is overdue." · Ask box · *What did I miss?* · *How is the studio doing?* | `dashboardBrief()` over the ordered Needs you rows + the viewer's tasks + today's meetings; `asksFor(role)` | The field, its send and both buttons **all open the FAB's 320×467 popover** in the bottom-right corner, answered there (§3) | Reason: the greeting and "what's in here". **Weak:** the sentence repeats Needs you's count and first row word for word, and that row sits right below it. It takes **23 % of the first screen's area** (55 % of a phone's usable first screen). Hui Min's has no tasks clause. |
| 1 | **NEEDS YOU · 15** (796×453; 6 rows, then *Show 9 more*) | *Needs your OK · 5*: “Feature wall panels have arrived” (Review) · More time on Carpentry fabrication (Review) · 1 template waits for your approval (Review) · 1 item proposed for the Price book (Review) · **18 things in Finance’s To do** — red (Open). Then, under a rule: Start the project — Condo 3-bedder (Start) · On hold since 14 Oct ’26 — Aisha (Resume) · 1 lead has no member yet (Assign) · 3 leads have an overdue follow-up — red (Open) · Save the brief of the meeting with Kevin · *Tue 25 Aug* (Open) · … with Nur · Thu 22 Oct (Open) · 4 × "n compliance items to do · {phase}" (Open) | Each project's own Needs you top row (`fetchProjectDetail().needs`) + "n more"; Finance › To do (`todoRows`); `railBadges` approvals; the Leads listing's scopes (`isOverdueLead`, no assignee); S23 meetings (`standingOf`); `complianceCountsOf`; Set up your studio; the Qanvast listing ask. Ranked by `orderNeeds` | The words open the place (`?from=/dashboard`). The one text button opens the step: Review → the project's Updates tab (never approves in place, S-20); Start / Resume → the project with `?run=` (its sheet opens); Assign / Open → the Leads listing's scope; Finance → `/company/finance` | Reason: **the strongest card** — what waits on me, in one ranked list. **Weak:** (a) a project's row is its top row lifted out of the project, so it loses its subject and verb: “Feature wall panels have arrived” is *Germaine's update waiting for your review*, and "More time on Carpentry fabrication" is *Michelle asks for 1 week more* (the bell says both properly); (b) "· 9 more" and "· 11 more" hide 24 project items that the headline 15 does not count; (c) nine kinds of thing in one list, a third of which (4 compliance rows and a 2-month-old "save the brief") are not today's work; (d) the Finance row sits inside *Needs your OK* (purple label) but is painted red; (e) nothing can be done here — every button leaves the page. |
| 2 | **MY TASKS** · Mon, 26 Oct · "1 task needs attention" ↗ (796×196) | Overdue · 1: *Order the kitchen cabinets* — General · HDB 5-Room — Benjamin Han · Wed, 21 Oct ’26 · 10:00 AM (5d overdue). *Upcoming · 13*, folded | `myOpenTasks()` (the rail badge's rule); `whereOf` names the lead or project | Tick → "Task completed · Undo" (works, Undo works). Chevron → `/tasks?open=`. ↗ → `/tasks?scope=mine`. Upcoming unfolds 13 rows in place | Reason: my own work. **Weak:** "Due today" is empty, so the card is one red row and a fold. Two of the 13 upcoming tasks (*Wardrobe laminate delivered*, *Install the quartz countertop*) **also appear in Coming up** as the outside people's rows. "(5d overdue)" abbreviates where every other place says "n days". |
| 3 | **COMING UP** (796×330, 5 rows) | Qanvast Hangout · Marina Bay · 11:00 AM – 7:00 PM · *Mon 26 Oct* · Jason Lim (Lamitak) — Wardrobe laminate delivered · Tue 27 Oct · Cleaning & touch-up starts · Mon 2 Nov · Ah Seng Stone Works — Install the quartz countertop · Tue 3 Nov · Handover & defect check starts · Sat 7 Nov | The in-progress projects' own `comingUp`, the viewer's planned meetings, the confirmed Hangouts; `comingList` (this week and next) | Each row opens its record: the Hangout, the project's Tasks `?open=`, the Schedule `?open=` | Reason: what's next. **Weak:** today's event says "Mon 26 Oct", never "Today". Outside people's tasks duplicate MY TASKS. There is no time-of-day view of today, and the meeting rows appear only when one is planned. |
| 4 | **WHERE IT STANDS** (496×620, 9 tiles, two-up) | Leads **31** "4 added in the last 7 days · 1 the week before" · Sales **S$121,087.50** "2 of 30 leads won · last 90 days, before GST" · Response time **26.3h** · Open projects **4** "3 need attention" · Contractors **4** "free this week · 1 over capacity · 1 starting with no contractor" · Tickets **0** "Nothing waits on you · 3 open" · Messages **1** · Owed to you **S$34,802.98** "3 invoices not paid in full · S$34,154.98 overdue" · Profit this month **S$47,536.53** "Margin 93.6% on S$50,783.97 invoiced" | Each tile is its home's own figure: the listing, `salesReport`, `insightsReport`, the listing's attention, the contractors' `boardOf`, `ticketTally`, `countUnreadChats`, `buildReport` | Every tile is a link: `/leads`, Reports › Leads (Sales / Response time, `?from=`), `/projects?scope=attention`, the Workload's contractors, `/tickets?from=`, `/chat?show=unread`, Reports › Finance AR / P&L (`?from=`) | Reason: the studio's pulse. **Weak:** nine equal grey tiles, so none leads. There is no trend, target or bar. The units mix (count · S$ with cents · hours · "free" · "waiting on you"), and so do the time windows (all time · 90 days · this month · now). A **0** gets a tile. **There is no hover state** (only the pointer cursor), so the tiles read as static labels. The margin of 93.6 % is the records' own, but it misleads: the Money card's "Early estimate" guard (`profitShown`) is not applied. The words-to-numbers ratio is 76 : 24, even on the number card. |
| 5 | **WORKLOAD** ↗ (496×366, 5 rows + *Show 1 more*) | Michelle 2 of 2 projects · Full · 2 open leads · Germaine 2 of 3 · Room for 1 more · 3 open leads · Dane 1 of 4 · **10 open leads** · Alex 0 of 4 · James 0 of 4 · … | `workloadOf` (Projects › Workload's lines) + `fetchMemberStats().active` | **All six presses (5 rows + ↗) open the same address**, `/projects?view=workload` | Reason: who has room (for Owners, Admins and a Manager). **Weak:** the load is written in words with no bar. The Owner's own 10 open leads raise no signal. Six doors lead to one place. |
| 6 | **SITE UPDATES** (496×114, 1 row) | *Kitchen cabinets are in* · HDB 5-Room — Benjamin Han · Dane · Wed 21 Oct | `recentSiteUpdates` (published in the last 14 days, three newest) | → that update on the project's Updates tab | Reason: 1.0's owner feed. **Weak:** one 5-day-old row, a camera glyph and **no photo**, though the photo is the most engaging thing the studio makes. The update that actually waits (Germaine's) is in Needs you, not here. |
| 7 | **FROM MARKET INSIGHTS** ↗ (496×114) | *Resale flats are reshaping the renovation brief* · Trends · **Sample** · 5 min read | `featuredOf(liveArticles())` | → the article (`?from=`); ↗ → Market Insights | Reason: 1.0's Industry News. **The weakest card:** a sample article with no link to today's work, on a page meant for "what needs me". |

The Owner's page and the Admin's are the same. The Admin's sees 13 needs and 2 unread messages, and her MY TASKS is the quiet row
"Nothing on your list · Add a task".

### James (Manager) — 1,240 px

The brief reads "7 things need you — first, HDB 5-Room — Aisha Rahman is on hold"; its buttons are *What did I miss?* and *Who on my team is
busy?*. **Needs you · 7** holds Resume (Aisha on hold) · Bright Spark asked for changes to PO-2026-007 (*Change it*) · 1 lead no member
(Assign) · 3 leads overdue (red) · Save the brief of the meeting with Kevin · **Tue 25 Aug** (two months old and not marked late) · 16
compliance items · Show 1 more. MY TASKS is only "Upcoming · 1", folded. Coming up has 2 milestones. Where it stands has 5 tiles (Leads 31 ·
Open projects 4 · Contractors 4 · Tickets 0 · Messages 2). Workload shows his team of 3. Market Insights is there; Site updates is not. Weak
points: his figures are the whole studio's (Leads 31 is the Owner's 31, under Who sees leads in the demo), so nothing on the page is "my
team's" except Workload.

### Germaine (Designer) — 1,280 px

The brief reads "5 things need you — first, start Condo 3-bedder — Marcus Teo. 1 task is overdue." (lower-case "start" mid-sentence). Her
buttons are *What did I miss?* and *Which leads need attention?*. **Needs you · 5** holds Start the project · **INV-2026-006 · Mid-Project →
Record a payment** (a Designer recording a client payment from the front door) · Save the brief of the meeting with Kelvin · 2 compliance
rows. MY TASKS shows Overdue 1 and Upcoming 21 (folded). Coming up has 3 rows. **Where it stands has 4 tiles: My leads 4 · My projects 2 · Tickets 0 ·
Messages 2.** Market Insights is there; there is no Workload and no Site updates. Weak points: the money row reads as an invoice number
with no verb ("INV-2026-006 · Mid-Project"), and a third of her glance stack is a sample article.

### Priya Tan (Accounting) — 1,024 px; her front door is Finance › To do

The brief reads "Good afternoon, Priya Tan. One thing needs you: **14 things in Finance’s To do**." ("one thing … 14 things"). Her buttons are
*What did I miss?* and *Who owes the studio money?*. **Needs you · 1** is a single row pointing to her own front door. MY TASKS is quiet ("Nothing on
your list"). Coming up has 1 row (Kallang Co-Work Pte Ltd · Studio overhead · S$2,180.00 · Tue 27 Oct). Where it stands has 3 tiles (Owed to you
· You owe · Profit this month). **First-screen ink is 5.4 %.** Two of the four cards say "a door to To do" or "nothing". **The page has no
reason to exist for her as it stands:** everything on it is To do's, one press away on the rail, and `/` already lands her there.

### Nurul Huda (Marketing) — 1,024 px

The brief reads "2 things need you — first, 1 lead has no member yet." Her buttons are *What did I miss?* and *Which leads need attention?*. Needs
you has 2 rows (Assign · 3 overdue follow-ups, red). MY TASKS is quiet. **Coming up is empty ("Nothing coming up this week or next")**.
Where it stands has 2 tiles (Leads 31 · Response time 26.3h). There is no article. **First-screen ink is 4.9 %; 2 of the 5 cards are empty.**
There is nothing about where leads come from (sources, campaigns, this week's arrivals by channel), which is the job of a Marketing
member.

---

## 2 · The problems he names, measured

### "Text heavy" — words against numbers, per card (Dane, 1440)

| Card | Size (px) | Words | Figures | Presses | Words per press |
|---|---|---|---|---|---|
| Brief | 1316×264 | 42 | 4 | 4 (all open the same popover) | 10.5 |
| Needs you | 796×453 | 78 | 15 | 13 | 6.0 |
| MY TASKS | 796×196 | 35 | 10 | 4 | 8.8 |
| Coming up | 796×330 | 75 | 11 | 5 | 15.0 |
| Where it stands | 496×620 | 76 | 24 | 9 | 8.4 |
| Workload | 496×366 | 65 | 20 | 7 (6 → one address) | 9.3 |
| Site updates | 496×114 | 18 | 2 | 1 | 18.0 |
| From Market Insights | 496×114 | 21 | 1 | 2 | 10.5 |
| **Page** | 1770 tall | **410** | **87** | **45** | — |

("Figures" counts every number token, dates and times included. The *number* card is still 3 words to every figure.)

### The first screen

| Width | Characters of text on it | Text at 12–14 px | Secondary grey | Larger than 14 px | Pictures / charts | Cards started | Dashboard presses on it |
|---|---|---|---|---|---|---|---|
| 1440×1024 | 1,380 | **92 %** | **59 %** | the page title + 9 tile figures (4 %) | 1 (the sparkle) / 0 | brief · Needs you · MY TASKS · Where it stands | 30 |
| 1280×800 | — | — | — | the same | 1 / 0 | brief · Needs you · Where it stands | 23 |
| 1024×768 | — | — | — | the page title only | 1 / 0 | brief · Needs you | 16 |
| 390×844 | 489 | 100 % of the body | 33 % | **only the word "Dashboard"** | 1 / 0 | brief · **2 rows** of Needs you | 10 |
| 844×390 | — | — | — | the page title only | 1 / 0 | **the brief alone** | 4 |

- **Where the eye has nowhere to start.** At 1440 the largest type on the screen is the word "Dashboard" and nine identical 20 px tile
  figures. On a phone, the largest type on the first screen is the word "Dashboard", and nothing else is above 14 px. There is no single
  number, picture, face or colour block that says "start here". The brief is the biggest object, but its message is a paragraph at 14 px. Of
  the 1,380 characters, 816 are secondary grey and 75 red; purple appears only on buttons and the *Needs your OK* label.
- **Ink:** text boxes cover 11 % of the 1440 screen, but the cards are full of short grey lines: the page *reads* busy while saying
  little. Each Needs you row is two lines of 12–14 px text plus a text button.

### "Less interactive" — what a press does

Of the Owner's **45** presses: **37 leave the page** (6 row words + 6 row buttons + 2 task doors + 5 Coming up + 9 tiles + 6 Workload + 1
update + 2 article), **4 open the Maison AI popover** (the field, its send, the brief's two buttons), **3 fold or unfold** (Show 9 more,
Upcoming · 13, Show 1 more) and **1 acts in place** (tick a task, with Undo). On this front door you cannot approve, assign, reply, record,
remind, reschedule or start anything without leaving it:

- **Review** never approves, by S-20 ("never approved unread"). The project Overview's own Needs you, the same card, **approves in the
  row** (REG-1447). The page reads as a table of contents.
- **Static:** no tile has a hover state; no figure shows a trend, a week, a target or a change since yesterday; nothing moves or updates while
  the page is open; nothing remembers what you have already seen (the bell does, the Dashboard does not).
- **Keyboard:** the page registers no keys of its own. "/" does nothing, because the Dashboard has no search and the Ask box can't be reached
  by a key. J does not walk the rows (no `data-kb-list`, unlike the listings). G then D and ⌘K work.

### "Cognitive load" — what the reader has to reconcile

- **The page disagrees with itself and with its own Maison AI.** Needs you says "**3** leads have an overdue follow-up", while *How is the
  studio doing?* says "**2** with an overdue follow-up". Maison AI drops leads that have handed over to a live project (S42 D-11); the
  Dashboard's `isOverdueLead` pass doesn't. The Leads tile says "**4** added in the last 7 days", while Maison AI says "**5** new leads in the last 7
  days" (the listing's date preset against `createdAt ≥ now − 7×24 h`). There are three lead totals: **31** (the tile), **30** (Sales "2 of 30") and **21**
  ("in the pipeline").
- **The headline undercounts:** "15 things need you" counts places, while the rows' "· 9 more" and "· 11 more" hide 24 more project asks. For
  Accounting: "One thing needs you: 14 things…".
- **The same thing appears twice:** two outside-people tasks are in both MY TASKS and Coming up; the brief's sentence is the first Needs you
  row; the date appears three times in three formats (tag "TODAY · MON 26 OCT", MY TASKS "Mon, 26 Oct", Coming up "Mon 26 Oct");
  Ask appears twice on one screen (the page's box and the FAB's).
- **Rows without a subject** (§1 card 1): the reader has to know what “Feature wall panels have arrived” *is* before it can be acted on.
- **Mixed tile semantics:** "Contractors 4" means *4 free*; "Tickets 0" means *0 waiting on you* while 3 are open; "Response time
  26.3h" is a 90-day median beside "Messages 1", which is now.
- **Unbalanced columns:** at 1440 the act stack ends at y 1,415 and the glance stack at 1,674, leaving 260 px of empty left column at the
  page's end. The money tiles ride the narrow column, and Coming up the wide one.

### Every card's reason, graded

| Card | Reason today | Grade |
|---|---|---|
| Brief | greeting + summary + the Ask | **weak** as written (it repeats the cards); the Ask is the strong part |
| Needs you | what waits on me | **strong**, but its rows need subjects and in-place actions |
| MY TASKS | my own work | **strong** (thin when "Due today" is empty) |
| Coming up | what's next | **medium** (it duplicates tasks and has no "Today") |
| Where it stands | the studio's pulse | **medium**: the right data, but no hierarchy, no change, no visual |
| Workload | who has room | **medium** for Owners / Managers (it should be a picture, not words) |
| Site updates | what the client sees from site | **weak** as drawn (1 row, no photo) |
| From Market Insights | outside news | **weakest** (a sample article; no daily reason) |

**Not on the page at all** (noticed while auditing; Study B does the module sweep): the rail's own Leads badge (**2** unseen new leads,
REG-2505) has no row; there are no quotes waiting on the client or expiring, and no contracts out for signature (Tools › Quotes / Contracts
to-do chips); there is no lead pipeline by stage; there are no client messages to answer (only an unread count), no payments due today
(only inside the Finance row), and no leads by source for Marketing.

---

## 3 · Maison AI on the page today

| Piece | What it is | What it does |
|---|---|---|
| The brief's **Ask box** (`AskBox`, page) | The FAB sheet's own field, words and limit; "Answers from your records" | Enter → `askMaisonAi()` → **opens the shell's popover with the question asked**. The page's field then **clears**, so the question leaves the place it was typed. |
| The brief's **two buttons** | Two role questions (`asksFor`) | `actions(label) = { run: () => ask(label) }` → **always the popover**. The AiBrief can answer inside its own card (P-33's `view`), as the lead and project Overviews do; **the Dashboard never uses it**. |
| The **FAB** (48 px, bottom-right 24) | The shell's button, one per page | Opens the same popover: Ask field, the page's 5 questions (*What did I miss? · How is the studio doing? · What are my tasks today? · Which leads need attention? · Draft a site update*), *Keyboard shortcuts for this page*, *Reset prototype to base*, and *Recent* once you have asked. |
| The **popover / sheet** | `MaisonAiSheet` on `AiSheet`: **320×467 at x 1096 · y 473** (1440), a bottom sheet on a phone | An answer replaces the suggestions in place ("16 notices, 11 due …", "Your studio today …", "9 leads need attention …" with a door such as *Open the overdue follow-ups*). Back returns to the list. Answers are by rule (`lib/maison-ai/answer.ts`), with no model and no credits. Proposals run house actions with Undo. |

What a person meets:

- **Four doors to one popover on the first screen** (field, send, two buttons, plus the FAB): three of them at the top-left, the
  answer appearing **~850 px away** in the bottom-right corner (`owner-1440-ask-answered.png`), next to a *second* Ask field holding the
  same question.
- **The Ask box scrolls away.** At a scroll of 900 px it is 680 px above the viewport. Only the header "Dashboard" is sticky. At a desk the FAB
  stays; on a phone it is tucked at the top (REG-2240) and returns on scroll-up; **on a touch tablet it shows only at the page's end**
  (the rule kept from Leads on the move's L1 with REG-2734, `maison-fab.tsx` `TOUCH_TABLET_ONLY`). So mid-page on a 768 or 1024 tablet **there is no way to ask Maison AI** without scrolling to the top or
  the bottom.
- **At 1024 with a mouse, the FAB covers the Finance row's "Open" button on the first screen.** At 1440 at rest it covers the corner of the
  Profit tile, and mid-scroll at 1280 it covers Workload's ↗ and rows (`fab.cjs`).
- One question gets one answer. There is no thread, and nothing is kept on the page; the history lives in the popover's *Recent* (three
  rows).

**What "sticky like the Claude chat input" would change** (for the proposal, not decided):

1. **One composer, docked, and always reachable.** It would be pinned to the bottom of the content area at a desk (or under the header), and
   above the dock on a phone, with the safe-area insets. It never scrolls away. On the Dashboard it **replaces** both the page's Ask box
   and the FAB: one door, not four. This touches REG-507 (every page ships the FAB) and REG-2240 / the tablet's at-end rule, which were
   written for a page whose Ask is at the top.
2. **Answers open from the composer, in place.** The answer would be a panel growing up out of the input (Claude's thread), over the page,
   with Esc / ↓ to fold it back. There would be no corner popover far from where you typed, and the question stays visible above its
   answer. Recent becomes the thread's past.
3. **Suggestions ride on the composer as chips** chosen by role *and by the moment* (for example "Review Germaine's update" when Needs your OK
   holds it, or "Assign Olivia Martinez"). They replace the brief's two outlined buttons. There is still no marquee (S22 rejected 1.0's
   rotating chips).
4. **The brief collapses into the composer's greeting.** On scroll it would shrink to one line or the composer's placeholder ("Good afternoon,
   Dane — 15 things need you"), so the first screen goes to the cards and not to a 264 px paragraph.
5. **Acting from it:** answers that propose (MaisonPlans, with Undo) are the shortest path to "interactive": approve, assign, remind or start
   from the composer without leaving the front door. It is the same house action the row would run.
6. **Costs to plan for:** fixed chrome on a phone (top bar 56 + composer ~64 + dock 72 = ~190 of 844 px); the iOS keyboard pushing it up (the
   visual viewport); bottom clearance so it never covers the last row's button (today's FAB already does at 1024); a focus key ("/" is free
   on the Dashboard; ⌘K stays search); and **honest copy**. A chat box promises conversation, but answers are rule-based, so "Answers from
   your records" and the "can't answer that yet — try …" chips must stay visible, and follow-ups ("and last week?") will often miss.

---

## 4 · Consistency with the house and the rest of the app

**Where it holds (the page is composed and never copied):** `AiBrief`, `Card`, `Row`, `MyWorkCard`, `ComingUpCard`, `StatTile(s)`,
`TextField`, `IconButton`, `CardGhost` and the ghost kit; its own stylesheet is 27 lines (the frame, two-up tiles, the phone's order). Doors
carry `?from=/dashboard`, and Back names "Dashboard" (checked on Sales, Profit, Tickets, a project, a meeting and the article). The ghost
draws this viewer's page (`owner-1440-ghost.png`, `owner-390-ghost.png`). Red is used only for late-and-ours; tiles are uncoloured (S-05).

**Where it drifts:**

| Thing | On the Dashboard | Elsewhere / the house rule |
|---|---|---|
| Approving from Needs you | *Review* opens the record (S-20) | The project Overview's same card approves in the row (REG-1447) |
| The brief's buttons | Always open the corner popover | The lead / project Overview answer in the card (P-33) |
| Money on a card | "S$121,087.50" (Reports' tile values, with cents, no space) | `moneyCard` "S$ 77,900" on record cards (Q-03, REG-1381…); documents keep cents |
| Dates | "TODAY · MON 26 OCT" · "Mon, 26 Oct" · "Mon 26 Oct" · "Wed, 21 Oct ’26 · 10:00 AM" · "14 Oct ’26" · "Tue 25 Aug" | One page, six spellings |
| Late | "(5d overdue)" | "n days late" (Maison AI), `dayWords` "n days", never abbreviated (REG-1381…) |
| Durations | "26.3h" | `durationWords` gives hours under 2 days; it reads technical beside "n days" |
| Overdue follow-ups | 3 (`isOverdueLead` over every visible lead) | 2 in Maison AI (handed-over leads out, S42 D-11) |
| New leads in 7 days | 4 (the listing's date preset) | 5 in Maison AI (rolling 7 × 24 h) |
| Profit | "Margin 93.6 %" shown outright | A project's Money card shows "--" + *Early estimate* until costs pass a tenth (`profitShown`) |
| Card heads | ↗ on MY TASKS, Workload, Market Insights; none on Needs you, Coming up, Where it stands, Site updates | By the one-home rule, but it reads arbitrary |
| L1 header | Title only | Other L1 homes carry their Create; the Dashboard offers no "new …" (⌘K does) |
| Keys | None of its own; J/K don't walk the rows | The listings walk rows; "/" focuses a page's search |
| Ask | Two fields on one screen (the page and the popover) | Every other page has one (the FAB's) |

A side note for the developers: the greeting and "today" are worked out on the server's own clock (`new Date(now).getHours()`;
no `Asia/Singapore` pin anywhere in `lib` or `app`). This machine is IST, so a UTC server would greet a Singapore studio with "Good
morning" at 3 pm. This is app-wide, not the Dashboard's alone.

---

## 5 · Every width

Page height and screens: 1440 **1,770 (1.7)** · 1280 1,786 (2.2) · 1024 2,605 (3.4) · 768 2,781 (2.7) · 390 **3,198 (3.8)** · 844×390 2,765
(**7.1**). There is no sideways scroll at any width, for any role.

| Width | Layout | What folds / scrolls | What's lost |
|---|---|---|---|
| **1440** mouse | Brief full width; two stacks 796 / 496 | Needs you 6 + *Show 9 more*; MY TASKS Upcoming folded; Workload 5 + 1 | 260 px of empty left column at the end; the FAB on the Profit tile's corner |
| **1280** mouse | The same, tiles narrower (help lines to 3 rows) | The same | MY TASKS falls below the fold (y 865 of 800); the FAB over Tickets / Workload mid-scroll |
| **1024** mouse | **One column**: brief · Needs you · MY TASKS · Coming up · Where it stands (3-up) · Workload · updates · article | 3.4 screens | **Where it stands starts at 1.9 screens** (y 1,439), so the money is off the first two screens. **The desk FAB covers "Open" on the Finance row** on the first screen. |
| **768** touch | One column, tiles 3-up | FAB hidden until the page's end (touch-tablet rule) | No Ask mid-page; Where it stands at 1.5 screens |
| **390** touch | Phone bar + dock; cards in reading order; tiles 2-up; brief buttons stacked | Needs you 4 + *Show 11 more*; Coming up 3 + *Show 2 more*; the FAB tucked at the top, back on scroll-up (then over the tiles) | **The first screen is the brief (352 px, ~55 % of the usable height) and 2 Needs you rows.** Where it stands at 1.8 screens; Workload at 2.7; the article at 3.5. The money is 2 screens down. |
| **844×390** touch (a phone held sideways) | The rail appears (the width is > 767); the brief at full width | 7.1 screens | **The first screen is the header and the brief, nothing else**; "HDB 5-\|Room" breaks inside a word |
| Accounting / Marketing 390 | 1,336 / 1,288 px | — | Half the page is the quiet MY TASKS and an empty Coming up |

---

## 6 · What is GOOD and must survive

1. **One home per thing.** Every row and tile is a door into its own home with `?from=/dashboard`, and Back says "Dashboard". Nothing on
   the page is a second copy of a list (REG-1360's rule, kept).
2. **Numbers are their homes' own** (the listing, the rail, To do, Reports, Workload), with no sample figures. Fix the two Maison AI
   mismatches rather than drop the rule.
3. **Needs you as one ranked list:** *Needs your OK* first, red only for late-and-ours, one button per row, places rather than records,
   "Nothing waits on you" when clear. That is the right spine for the page.
4. **Per role and per permission:** Accounting's and Marketing's scopes, Who sees leads, Who sees costs (no Profit without costs), the
   Owner-only approvals. The ghost follows the role.
5. **The landings that act on arrival:** `?run=` (Start / Resume open their sheet), `?todo=approval`, `?show=unread`. These are the
   building blocks of in-place actions.
6. **Tick a task with Undo**: the page's one in-place act, done right.
7. **Calm and honest:** no marquee, no decorative chart, no invented headline. The sample article is labelled "Sample". "Answers from your
   records" says what Maison AI is.
8. **Maison AI's machinery:** rule answers from the records, proposals that run house actions with Undo, *Recent* as a record
   (`maison_questions`), role questions. The composer Vicky wants can reuse all of it.
9. **Resilience:** each read fails alone (its card leaves) and the page never errors. One ghost, the page's own, per role (REG-708 /
   REG-2242).
10. **Responsive basics:** a phone's reading order, tiles that fit at 320 (REG-2914), no sideways scroll, the quiet-top FAB, 44 px targets.

---

## 7 · The shots (best 8)

All in `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/dashboard/shots/`
(72 role × width shots named `<role>-<width>-<first|full>.png`, plus the presses):

1. `owner-1440-first.png`: the front door as an Owner opens it (the brief, Needs you, nine grey tiles).
2. `owner-1440-full.png`: the whole page (410 words, the unbalanced stacks, the weak glance cards at the bottom).
3. `owner-1440-ask-answered.png`: typed at the top-left, answered in a 320 px corner popover beside a second Ask field.
4. `owner-390-first.png`: a phone's first screen (the brief and two rows).
5. `owner-390-full.png`: 3.8 screens; the money two screens down.
6. `owner-844-first.png`: a phone held sideways (the brief and nothing else).
7. `owner-1024-first.png`: one column; the desk FAB over the Finance row's "Open".
8. `accounting-1440-first.png`: Accounting's Dashboard (one pointer to her own front door, a quiet task card, 5 % ink).

Also useful: `owner-1440-needs-all.png` (all 15 rows), `owner-1440-fab-sheet.png`, `owner-1440-brief-button.png`, `owner-390-ask-answered.png`
(the phone's sheet), `owner-390-scrolled.png` (the FAB back over the tiles), `marketing-1440-first.png` (two empty cards),
`designer-1440-first.png` ("Record a payment"), `manager-1440-first.png`, `owner-1440-ghost.png`.
