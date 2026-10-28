# C · Benchmark: the daily front door and the docked assistant

*Dashboard redesign, study C · 2026-10-26 · written for Vicky · research only: no code, nothing decided, nothing built*

**The ask (his words).** "It looks very text heavy, but less interactive … the Maison AI card can be more sticky, like how your Claude chat input is … intuitive design, less cognitive load, very engaging, because the studio opens this as the first screen and looks at it day to day … every card has a reason … all interactions, layouts, consistency, and the mobile, tablet and desktop perspective."

**What this study covers.** 17 daily-first home screens and 9 assistant composers, and what they suggest for OpenMaison's Dashboard (`/dashboard`, REG-2002…2013, plus the tiles S45 and S46 added). Every claim names its source.

**Source marks.** **[P]** the maker's own docs, changelog or blog. **[S]** press, a design teardown or a community forum. **[K]** the live product's long-standing behaviour where I found no document; check it on the product before quoting it to a client.

---

## The short answer

1. **The best homes answer "what needs me now?" first,** as a short ranked list where every row is a door with one verb. Examples: Linear's Priority inbox and its *focus order*, HubSpot's new home ("Join · Prep · Reply" on a row), Houzz Pro's *Today*, Procore's Project Overview. Numbers come second, and always come with something to compare them against.
2. **They change every morning because the business changed, and they come to an end.** Shopify shows at most three insights a day and each expires after 24 hours. ChatGPT Pulse's cards end with the day. Linear sends a daily summary. Nobody good runs an endless feed on the home.
3. **Assistants have converged on one shape.** A calm text field with three to five chips that fit the moment. It knows the page you are on, answers *beside* the page rather than over it, and proposes changes instead of making them.
4. **On a phone the field lives with the bottom navigation, never as a second floating thing.** iOS 26 has a bottom accessory that sits above the tab bar. Shopify's Sidekick "stays on your screen". Material warns against pairing a toolbar with the navigation bar. Our own register shows a floating Maison AI button covering a control eight times: REG-824 · 2240 · 2602 · 2667 · 2693 · 2729 · 2830 · 2869.
5. **The keyboard is the hard part.** Safari, and Chrome since version 108, shrink only the *visual* viewport. A bar fixed at the foot can therefore sit behind the keyboard. The robust answer is a field that opens into a sheet that owns the keyboard. The house already does this in Notes (REG-381 · REG-2724).

---

## 0. Where our Dashboard stands today

What exists, from the register:

- **The brief (REG-2003).** "Today · {day}", a greeting by the clock, one sentence from the records, two question buttons by role, and an *Ask* field that opens Maison AI's sheet with the question already asked.
- **Needs you (REG-2004).** One ranked list of places: six rows at a desk, four on a phone, then "Show n more". Each row has one text button.
- **My tasks (REG-2005).** Overdue · Due today · Upcoming, ticked done in place with Undo.
- **Coming up (REG-2006).** This week and next.
- **Where it stands (REG-2007).** Number tiles by role, each a door to its home: Leads with Studio Pulse's "the week before", Open projects, Messages, Owed to you, Profit this month. S45 added Sales and Response time; S46B added Tickets; S45B added Contractors.
- **Workload, Site updates and From Market Insights** (REG-2008…2010).
- **Layout and ghost (REG-2011).** Two stacks weighted act : glance, one column up to 1024.
- **The floating button (REG-2240).** On a phone the FAB stays tucked at the top, because the brief already has its own Ask.

Read against the benchmark, four things explain "text heavy, less interactive":

- **Every card is sentences plus rows.** Few things on the page show shape.
- **The tiles are bare numbers.** One has a "week before" caption; none has a trend mark or a goal.
- **The Ask field sits inside a card that scrolls away.** It stops being the "sticky" field he described.
- **Maison AI has two entrances on one page:** the card's field and the FAB. ChatGPT's teardown names the same problem, starter pills competing with the + menu ([S aiuxplayground · ChatGPT](https://aiuxplayground.com/teardowns/chatgpt/composer)).

---

## 1. The benchmark, product by product

Each entry covers the same eight things: **what it answers first · layout · density · numbers · how it invites action · how it personalises · what changes day to day · the lesson for us.**

### 1.1 Linear: Inbox, My issues, Pulse, Agent

- **Answers first.** *What changed that involves me.*
  - Inbox is the notification centre for issues you are subscribed to. Creating an issue, being assigned or being mentioned subscribes you ([P docs/inbox](https://linear.app/docs/inbox)).
  - Since September 2026 a **Priority** tab separates notifications that need you from those that can wait, so that "a review blocking a release" is not lost among routine updates. Linear picks its contents by default and you can tune it ([P changelog 2026-09-03](https://linear.app/changelog/2026-09-03-priority-inbox)).
  - *My issues › Assigned* groups in a declared **focus order**: urgent, SLA-bound, blockers, cycle, other active, triage, backlog, completed. "Some sections appear only when relevant" ([P docs/my-issues](https://linear.app/docs/my-issues)).
- **Layout.** One list, one row shape, no cards, no charts.
- **Density.** High but uniform, so scanning costs nothing.
- **Numbers.** None on the home; counts are badges.
- **Action.**
  - Keyboard verbs on the row. **Snooze** (H) hides an item until a set time (an hour, tomorrow, next cycle), then it returns unread; new activity cancels the snooze ([P docs/snooze](https://linear.app/docs/snooze)).
  - Triage uses 1 accept · 2 duplicate · 3 decline ([P docs/triage](https://linear.app/docs/triage)).
- **Personalises.** The subscription rule *is* the personalisation. Saved Pulse feeds are private to you ([P changelog 2025-05-15](https://linear.app/changelog/2025-05-15-custom-feeds-in-pulse)).
- **Day to day.** **Pulse** is a feed of project and initiative updates (For me · Popular · Recent). It adds a personal AI summary, daily or weekly, delivered to the inbox and also playable as a short audio "Daily Pulse" ([P changelog 2025-04-16](https://linear.app/changelog/2025-04-16-pulse)). It reached mobile in November 2025 with comments and reactions ([P](https://linear.app/changelog/2025-11-13-pulse-on-mobile)).
- **Assistant.** Linear Agent opens with ⌘/Ctrl J from the bottom-right of the desktop app or from mobile; each open chat is a tab ([P docs/linear-agent](https://linear.app/docs/linear-agent); [S releases.sh](https://releases.sh/release/rel_2BkMVMOmVYHNf81kuzkFk)).
- **Lesson.** *An order beats a layout.* One list in a declared order, with sections that only appear when they have rows, is Needs you's whole job. Our rows also lack a verb Linear has: **"Not today", which hides a row and brings it back**.

### 1.2 Stripe: Home

- **Answers first.** Business performance, plus anything urgent. Home "provides analytics and charts about your business performance. It also surfaces important notifications, like unresolved disputes or identity verifications" ([P docs/dashboard/basics](https://docs.stripe.com/dashboard/basics)).
- **Layout.** The notifications come first, then *Your overview*, a grid of chart widgets you add or remove. The sidebar's *Shortcuts* holds pinned and recently visited pages ([P basics](https://docs.stripe.com/dashboard/basics)).
- **Density.** Low: a few large charts.
- **Numbers.**
  - Every chart takes a comparison range: "Pick a comparison range from the third dropdown menu" ([P support](https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights)).
  - Stripe labels its glance numbers honestly: the home charts are estimates, and Financial Reports are the place for accurate figures (same page).
  - [K] The web home opens on a *Today* band with today's gross volume drawn as a line against yesterday. This is widely seen but not in the docs.
- **Action.** On mobile, **+** at the top right of every tab creates a charge, invoice, payment link, customer or payout ([P docs/dashboard/mobile](https://docs.stripe.com/dashboard/mobile)).
- **Personalises.** Chart choice and order, per user (web and app).
- **Day to day.** A daily-summary push, lock-screen widgets for 17 metrics, and Android home widgets such as "Daily gross volume" (same mobile page).
- **Lesson.** *A home number is a glance; its report is its home.* Stripe says so in its own help. Our tiles already open their homes (REG-2007). What they lack is the comparison. "Against the same point last month" is the cheapest way to make a number readable.

### 1.3 Shopify: Home and Sidekick

- **Answers first.** "Daily tasks, next steps for orders, recent sales activity" ([P help/shopify-home](https://help.shopify.com/en/manual/shopify-admin/shopify-home)).
- **Layout, top to bottom:**
  1. A metrics strip with four metrics and the first one's chart open.
  2. **Order tasks** with counts (capture payments, fulfil, returns, high-risk, chargebacks). These cannot be dismissed.
  3. A feed of cards you can dismiss, with feedback.
  4. Sidekick Pulse recommendations.
  5. Guides showing progress ("completed tasks out of total" plus the next task).
  6. Insights (same page).
- **Density.** Medium; only one chart is expanded at a time.
- **Numbers.**
  - Four metrics. In the app you swipe between them and tap one to expand its chart.
  - Insights come as *trends, streaks, top 5*.
- **Action.**
  - Each card has one button.
  - A Pulse card opens a Sidekick chat that builds a to-do list ([P help/sidekick/pulse](https://help.shopify.com/ur/manual/ai-powered-tools/sidekick/pulse)).
  - Sidekick "can't make changes to your store without your approval" ([P sidekick features](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/sidekick/features)).
- **Personalises.** Each user swaps any of the four metrics for one of 16, and "Changes don't affect other users" ([P shopify-home](https://help.shopify.com/en/manual/shopify-admin/shopify-home)).
- **Day to day.**
  - Insights: "up to three per day, each expiring after 24 hours."
  - Pulse: up to five suggestions at a time, each dismissible with a reason ([P pulse](https://help.shopify.com/ur/manual/ai-powered-tools/sidekick/pulse)).
- **Assistant.**
  - In the refreshed admin, "the Sidekick field … appears on most pages" and "opens in a panel beside the page". On Home it fills the window instead.
  - On mobile it "stays on your screen as you move through your store".
  - Voice works everywhere.
  - It "uses the page you're on as context" ([P sidekick features](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/sidekick/features)).
- **Lesson.** *Quotas and expiry keep a feed worth reading*: three a day, five at once, gone tomorrow. And *the field itself is the entrance*, docked in the page's chrome, answering beside the page.

### 1.4 HubSpot: the new home and Breeze

- **Answers first.** The new home (beta) opens on "Upcoming high-value meetings" for the day and "Active contacts follow-up" (contacts who replied) ([P use-your-home-page](https://knowledge.hubspot.com/help-and-resources/use-your-home-page)).
- **Layout.** Two main cards, plus a right panel, **Your day at a glance**, with tabs: Meetings · Tasks · Deals · Metrics · Activities · Campaigns · Tickets (same page).
- **Density.** Medium; depth lives behind tabs in one panel instead of in seven cards.
- **Numbers.** Metrics are a *tab*, not the page.
- **Action.**
  - Hover a meeting for **Join** (when it is live) or **Prep** (Breeze prepares you). Hover a contact for **Reply**.
  - The legacy *Needs attention* card offered one action button or a dismiss ✕ per item.
- **Personalises.** *Customize Home* holds an **"About you"** description, Daily brief feeds on or off, and the side-panel tools reordered or hidden.
- **Day to day.** A Daily brief. Meetings and replies are today's by definition.
- **Assistant.** Breeze opens from the top nav ([P use-breeze-assistant](https://knowledge.hubspot.com/ai/use-breeze-assistant)):
  - it expands to full screen;
  - a right sidebar shows the context it used;
  - there are suggested and saved prompts;
  - answers carry action buttons (e.g. *Summarize*);
  - when it needs clarity it shows a question card with options.
- **Lesson.** *The assistant's best entrance is a verb on a row.* "Prep" sits on a meeting, so the AI is attached to the thing, not to a box. And one sentence of "About you" lets a person shape the home without building it.

### 1.5 Pipedrive: activities, goals, rotting

- **Answers first.** Your activities: "a single to-do view" synced with your calendar. Managers see their team's planned and overdue activities ([P features/activities-goals](https://www.pipedrive.com/en/features/activities-goals)).
- **Numbers.** Goals are a column chart per period against its target; hover a column for its summary, click to see the deals ([P support/insights-goals](https://support.pipedrive.com/en/article/insights-goals)).
- **Attention: rotting.**
  - A deal not updated within a **per-stage** period turns red in the pipeline, with its days in a red oval. Scheduling an activity or editing the deal clears it.
  - The help notes that long windows hurt short-term productivity and short ones make future-dated work hard to sort ([P the rotting feature](https://support.pipedrive.com/en/article/the-rotting-feature)).
- **Lesson.** *Staleness is a signal the studio sets per stage.* Our "days in stage" and Sales' *Going quiet* are this. The threshold should be the studio's, and red should be earned.

### 1.6 monday.com: My Work

- **Answers first.** Your items in time buckets: Overdue · Today · This week · Next week · Later · Without a date ([S community](https://community.monday.com/t/add-groups-to-my-work-section-e-g-split-later-into-this-month-next-month-this-year-next-year-etc/84030)).
- **A warning from the community.** There is a 1,000-item cap, and users report *Later* filling it so that overdue items stop showing ([S community](https://community.monday.com/t/my-work-prioritizes-later-category-instead-of-overdue-or-this-week-when-over-1000-items-limit/54646)).
- **Lesson.** Time buckets read instantly. But a long list must cut from the bottom, never from the top: the overdue rows always stay.

### 1.7 Asana: Home

- **What it is.** "An overview of your most important work". Widgets can be dragged, resized and removed ("Remove, rearrange, and resize every part of your homepage"), with a minimalist or colourful background ([P features/home](https://asana.com/features/project-management/home)).
- **Two kinds of content.**
  - *Starting your day*: goals, to-dos, latest updates, notes.
  - *Jumping back in*: drafted comments, request forms, follow-ups on tasks you assigned.
- **Numbers.** Task completion by week or month (same page).
- **Lesson.** *"Start your day" vs "jump back in"* is a useful split for our two stacks. A fully free widget board, though, hands the design job to the user.

### 1.8 Notion: Home and the Agent

- **Home.** Sections: Upcoming events, Recents, Favorites, Agents, Teamspaces, Shared and Private pages. For each section you set how many items it shows, move it, or hide it ([P help/home-and-my-tasks](https://www.notion.com/help/home-and-my-tasks)). Upcoming events joins a meeting and opens its doc.
- **Agent.** "The friendly face at the bottom of Notion"; it "will take in the context of the page you're currently in". Selecting blocks focuses it on those blocks, and @ adds pages or people ([P help/notion-agent](https://www.notion.com/help/notion-agent)).
- **Lesson.** The meeting's document one tap from *Upcoming*. And an assistant that reads **the selection** is the model for "ask about this card".

### 1.9 Procore: Project Overview

- **What it is.** The card-based Project Overview replaced Project Home, on by default from 21 July 2026. It puts "relevant insights, real-time risk factors, and critical daily tasks into a single, customizable workspace". Cards can be dragged, resized, reordered and removed, and RFIs and Observations can be created from the one page ([P FAQ](https://v2.support.procore.com/en-gb/faq-what-is-the-difference-between-the-legacy-project-home-page-and-the-new-project-overview)).
- **Live counts with a trust cue.** The *All Open Items* card gained a better count, a **Last Updated** time and a **Refresh** button ([P release notes](https://support.procore.com/products/online/user-guide/project-level/project-overview/release-notes)).
- **Permissions.** *My Open Items* shows only the tools you may open ([P](https://support.procore.com/products/online/user-guide/project-level/home/tutorials/open-items-from-the-project-overview-in-the-projects-home-page)).
- **Lesson.** A live count earns trust when it says how fresh it is. And quick-create from the home saves a trip.

### 1.10 Buildertrend: Summary

- **The first screen after login.** The activity feed began on mobile and was then brought to desktop, and "the most important information appears based on set deadlines" ([S Buildertrend podcast](https://buildingcode.podbean.com/e/inside-buildertrend-a-quicker-way-to-start-your-day/)).
- **The mobile summary** pulls together:
  - time-clock status;
  - open to-dos;
  - upcoming schedule tasks;
  - recent daily logs;
  - a feed of schedule edits, **new photos**, comments and completed tasks.

  Source: [P help/introduction-to-mobile-navigation](https://buildertrend.com/help-article/introduction-to-mobile-navigation/), read through search because the page refuses direct fetch.
- **Lesson.** In our domain, **photos from site** are the most engaging thing that can change overnight. *Site updates* (REG-2009) deserves pictures, not just titles.

### 1.11 Houzz Pro: the homepage (the closest competitor)

- **Sections** ([P Houzz Pro Learn](https://pro.houzz.com/pro-learn/blog/new-houzz-pro-homepage-start-your-mornings-off-armed)):
  - three **quick activities**: Floor Plan, Mood Board, Lead;
  - **Today**, "like your personal assistant": new leads, new client messages, and outstanding documents such as invoices;
  - **Recent Places**;
  - **Learn**.
- **Personalises.** Show or hide Leads, Projects and Marketing; choose a background colour or image ("get rid of what you don't want to see").
- **Task Center colours.** Overdue red, upcoming yellow, future black ([P help/tasks](https://pro.houzz.com/pro-help/r/how-to-create-and-manage-your-tasks)).
- **Lesson.** The whole page is short: three creates, Today, Recent places. That is the bar for "less cognitive load" in our category.

### 1.12 CoConstruct (now part of Buildertrend)

- **The rule.** "Upcoming selection items will not show up on the builders' main page as items requiring attention … to avoid any unnecessary clutter." They appear once overdue, while the client's own dashboard shows upcoming selections prominently ([P](https://www.coconstruct.com/learn-construction-software/will-upcoming-selection-items-show-up-on-my-main-page)).
- **Alert counts.** Per project, a *detailed* or *simple* view of the updated / overdue / upcoming icons ([P](https://coconstruct.com/learn-construction-software/your-projects-dashboard)).
- **Lesson.** *The same fact is "needs attention" for one person and "coming up" for another.* Role decides the bucket, and "late" is what earns the attention.

### 1.13 Apple Fitness and Health: Summary

- **Fitness.**
  - Rings: tap a date for its history; a ring that overlaps itself means the goal was beaten ([P support/108359](https://support.apple.com/108359)).
  - **Trends** compare the last 90 days with the last 365. An arrow points up or down, a tap shows the history, and *Show More* offers how to turn a trend around ([S iPhone Life](https://iphonelife.com/content/understanding-fitness-trends-apple-fitness-challenges)).
  - iOS 18 added *Edit Summary* to reorder and add cards ([S iDrop News](https://www.idropnews.com/how-to/how-to-customize-your-iphones-fitness-summary/227225)).
- **Health.** **Pinned** shows today's figure for each category you chose; **Highlights** show "your Health over time" ([P support/104997](https://support.apple.com/en-ie/HT203037)).
- **Lesson.** Use a **ring for what is finite today** (tasks done of tasks due) and an **arrow for what is a trend** (leads this month against usual). Highlights *write* the trend as a sentence, which is what our brief's sentence can become.

### 1.14 Material 3: dashboards, panes and docks

- **Canonical layouts.**
  - **Feed**: a grid of equivalent items.
  - **Supporting pane**: the primary area takes about two thirds; at compact and medium widths the supporting content goes below it or into a bottom sheet.
  - **List-detail.**

  Source: [P developer.android.com canonical layouts](https://developer.android.com/guide/topics/ui/layout/canonical-layouts).
- **Window classes.** Compact < 600, medium < 840, expanded ≥ 840 dp ([S DEV](https://dev.to/tkuenneth/about-window-size-class-libraries-5c5m)).
- **Navigation.** A navigation bar carries two to five destinations at compact width; the rail takes over from medium ([S SAP's M3 mirror](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage)).
- **M3 Expressive.** The *docked toolbar* replaces the bottom app bar, and Google advises **against combining a toolbar with the navigation bar** on primary pages ([S 9to5Google](https://9to5google.com/2025/05/18/material-3-expressive-toolbars/); [MDC docs](https://gitea.com/784622644/material-components-android/src/branch/master/docs/components/DockedToolbar.md)).
- **Lesson.** A phone's composer cannot be a second bar on top of the dock. It must be the dock's accessory, or open as a sheet.

### 1.15 Microsoft 365 Copilot: the app home

- **The home.** A centred "Hi, how can I help?", an *Ask Copilot* field with voice, and suggestion buttons ([S WSU ITS](https://its.wsu.edu/2026/06/10/microsoft-365-copilot-app-updates/)).
- **The 2026 redesign** ([P Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2026/05/28/introducing-a-new-design-for-microsoft-365-copilot)):
  - it turns "a once static text box — the prompt line — into a task-aware workspace";
  - tools appear *beneath* the field for the task at hand;
  - suggested prompts appear "when they deepen the work";
  - answers start "clear, readable" and add formatting only when it helps;
  - inside Word and Excel it works in a side pane or "within a paragraph, cell, or slide";
  - the governing principle is progressive disclosure, "starting with a clean, focused interface, then revealing more capabilities as you need them".
- **Lesson.** The prompt line can be the page's spine, with tools appearing under it only when they are relevant. A chat product makes it the hero; a work product docks it.

### 1.16 Gemini: the home screen

- **How it has moved** ([S 9to5Google](https://9to5google.com/2025/07/23/gemini-web-redesign/); [S 2025-11](https://9to5google.com/2025/11/14/gemini-android-homepage-redesign/)):
  - Android, late 2024: "Hello, [name]" with a one-line field.
  - Web, July 2025: the prompt bar moved from the bottom to the centre, "How can I help?", and a *Tools* menu replaced the row of chips.
  - Android, November 2025: chips as a vertical list under "Where should we start?" (Create image · Write anything · Build an idea · Deep Research · Create video).
- **Lesson.** Vendors keep moving their chips. Keep ours few, verb-led and drawn from the day, so they are worth their place.

### 1.17 ChatGPT: Pulse, and the composer

- **Pulse** (launched September 2025):
  - it researches overnight from chats, memory, feedback and, if switched on, Gmail and Calendar (off by default);
  - it shows **5–10 visual cards each morning**;
  - each card **expires at the end of the day** unless saved;
  - *curate* steers tomorrow's set;
  - the coverage reports the aim of ending each day rather than scrolling forever.

  Sources: [S eWeek](https://www.eweek.com/news/openai-chatgpt-pulse/); [S Vaizle](https://insights.vaizle.com/news/openai-launches-chatgpt-pulse-a-once-a-day-brief-inside-chatgpt-that-runs-overnight); OpenAI's own page refused fetching.
- **Composer.**
  - A calm bar with three starter pills, a **+** for attach and modes, and a mic ([S aiuxplayground](https://aiuxplayground.com/teardowns/chatgpt/composer)).
  - Picking a tool shows a removable chip in the bar and suggestions under it ([S BGR](https://www.bgr.com/tech/chatgpt-got-a-makeover-but-all-of-your-ai-tools-are-still-there/)).
  - [K] In a conversation the bar docks at the foot and grows with the text up to a cap.
- **Lesson.** *A finite morning set beats an endless feed.* The page should feel finished by 10 a.m.

### 1.18 Also read: Copilot in Dynamics 365 Sales, and Claude

- **Copilot in Dynamics 365 Sales.** It opens in a side pane "side-by-side with a record such as an opportunity or a lead", or full screen. Its suggestions are "based on the context of the record you're viewing", and it reads only records the user may open ([P Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/sales/use-sales-copilot)).
- **Claude.ai.**
  - A calm card with starter pills; the model and effort are visible before sending; attach, connectors and skills sit behind **+** ([S aiuxplayground · Claude](https://aiuxplayground.com/teardowns/claude/composer)).
  - [K] A new chat centres the field under a greeting. Once a conversation starts the field docks at the foot of the column, keeps the column's width, grows to a cap and then scrolls inside itself, while the conversation scrolls behind it under a soft fade. On the phone app it rides on top of the keyboard.

---

## 2. Patterns for the AI composer

### 2.1 Where the field lives: six placements seen

| Placement | Who does it | When it fits | What it costs |
|---|---|---|---|
| **The home is the composer** (hero) | M365 Copilot, Gemini, Claude / ChatGPT new chat | A chat product | On a work home it pushes the work below the fold |
| **Docked at the foot of the content column** | Claude, ChatGPT in a thread [K] | The field must always be at hand | Needs reserved space at the page's end; a keyboard plan on phones |
| **A field in the page chrome that opens a pane beside** | Shopify ("panel beside the page") [P]; Breeze (top nav) [P]; Dynamics (side pane) [P] | Asking about what you are looking at | The pane takes about a third of the width at a desk |
| **A corner launcher** | Linear Agent ⌘J bottom-right [P]; Notion's face [P]; our FAB (REG-507) | A shell-wide door | It floats over content (our eight REG fixes) |
| **On the object** | HubSpot *Prep* [P]; Notion's selected blocks [P]; M365 "within a paragraph, cell" [P]; Atlassian's hover a chart → "summarise it?" ([S](https://www.atlassian.com/blog/developer/ai-user-experience-patterns)) | The strongest *reason* to ask | Needs a defined context per object |
| **Proactive cards that open a chat** | Shopify Pulse and guides [P]; ChatGPT Pulse [S]; Linear's daily summary [P] | What changed overnight | Must be capped and expire, or it becomes noise |

**The synthesis.** The best tools pick **one** home for the field and pin it to the page's chrome; none floats a button over a work surface *and* runs a field in a card. "Like your Claude chat input" means a field **docked at the foot of the Dashboard's content column**, always visible. It answers into a pane beside the page at a desk and a sheet on a phone. Its entrances on cards and rows (*Ask about this*) feed the same field.

### 2.2 Prompt chips

- **Three to five, ranked.** Refresh or hide the ones nobody uses. Show them at moments of need, not everywhere ([S Shape of AI · Suggestions](https://www.shapeof.ai/patterns/suggestions)).
- **Contextual beats static.** Shape of AI separates *static* (first run), *contextual* (the page, document or mode) and *adaptive* (role, history). Its counter-example is Typeform's chips appearing "before any context", which makes them "often irrelevant" (same page).
- **Fill vs send.** A chip that *writes something* fills the field so the person can review the parts in brackets before sending. A *question* or follow-up chip sends at once ([P Cloudscape · support prompts](https://cloudscape.design/patterns/genai/support-prompts)).
- **Placement.** Chips that discover capabilities sit **above the field**; follow-ups sit **at the end of an answer** ([P NN/g · prompt controls](https://www.nngroup.com/articles/prompt-controls-genai/)).
- **Pitfalls.** Irrelevance, overload, overexposure, staleness, and chips that trigger "data access, publishing, or heavy compute" without "a preview or confirmation" ([S Shape of AI](https://www.shapeof.ai/patterns/suggestions)).
- **Don't add a second entrance.** ChatGPT's pills "compete with the + menu as a second entry point" ([S aiuxplayground](https://aiuxplayground.com/teardowns/chatgpt/composer)). Our brief's two question buttons and the field's chips must be the same row, not two.

### 2.3 Context: "ask about this card"

- **The page is the default context.**
  - Shopify: "uses the page you're on as context" [P].
  - Notion: "the context of the page you're currently in" [P].
  - Dynamics: suggestions "based on the context of the record" [P].
- **A selection narrows it.** Notion focuses on the selected blocks [P]; Atlassian offers to summarise the chart you hover [S].
- **Show what the next turn will use,** as removable chips: "invisible context causes surprise" ([S aiuxplayground · how to design a composer](https://aiuxplayground.com/guides/how-to-design-ai-chat-composer)). Breeze's right sidebar shows the context it used [P].
- **Permission is part of context.** Dynamics, Notion and Linear only read what the viewer may open [P]. For us that means Who sees leads (`visibleLeadIds`) and `Viewer.costs` (REG-2100…2108).
- **For our Dashboard.** Each card's head carries a small *Ask* entrance. Pressing it focuses the docked field with a removable chip ("About: Needs you · 6"), and the chips above the field change to that card's own questions. This is how "every card has a reason" becomes interactive.

### 2.4 Results: in place, in a pane, or in a sheet

- **A readable answer first, then layers.** M365 Copilot starts with a "clear, readable answer" and adds formatting and next steps as the request is refined [P].
- **Beside the page, so the page stays in view.** Shopify's panel and the Dynamics side pane [P]. Full screen for long work: Breeze's expand, Shopify on Home [P].
- **Propose, never act silently.**
  - Shopify "can't make changes … without your approval" [P].
  - Shape of AI: show a result "as a suggestion the user can accept, reject, or refine, not as an overwrite" ([S inline action](https://www.shapeof.ai/patterns/inline-action)).
  - Atlassian lets "the user … review and edit the AI response before submitting" [S].
  - We already settled this in S10 (REG-1785…1793: proposals only, *Not now* plus one house action).
- **Answers carry verbs.** Breeze's action buttons and clarification cards [P].
- **A candidate for us.** A short answer (three rows with their doors, e.g. "Who owes us this week?") opens *in the composer's own expansion* above the field, at its width. Anything longer opens the Maison AI pane or sheet, which keeps Recent (`maison_questions`). This needs his call (§6).

### 2.5 Phones and tablets: the keyboard, safe areas and the dock

- **Reachable everywhere, in one place.** Shopify's Sidekick "stays on your screen as you move through your store"; voice is first-class on Shopify and M365 [P].
- **The system's own pattern for "something that lives with the dock".** iOS 26's tab-view *bottom accessory* sits above the tab bar at normal size and goes inline when the bar collapses on scroll (`tabBarMinimizeBehavior(.onScrollDown)`) ([P Apple docs](https://developer.apple.com/tutorials/data/documentation/swiftui/view/tabviewbottomaccessory(content:).md); [S Create with Swift](https://www.createwithswift.com/enhancing-the-tab-bar-with-a-bottom-accessory/)). Developers report it misbehaves when hidden on condition ([S Apple forums](https://developer.apple.com/forums/thread/803404)), a reminder to keep the accessory always present on the page that has it.
- **Never a second bar.** Material says toolbars and the navigation bar do not belong together on a primary page [S/P, §1.14].
- **The keyboard.**
  - Chrome 108 aligned with Safari: the on-screen keyboard shrinks only the *visual* viewport, so `position: fixed` bottom elements can end up behind it ([P Chrome blog](https://developer.chrome.com/blog/viewport-resize-behavior); [S HTMHell](https://htmhell.dev/adventcalendar/2024/4/)).
  - `interactive-widget=resizes-content` brings back resizing the layout in Chrome 108+ and Firefox 132+, **not in Safari** ([P MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element)).
  - The usual fallback, following `visualViewport` and moving the bar, has an iOS 26 bug: `offsetTop` may not return to 0 after the keyboard closes ([S Apple forums 800125](https://developer.apple.com/forums/thread/800125)).
- **Safe areas.** `env(safe-area-inset-bottom)` with `viewport-fit=cover` keeps a bottom bar off the home indicator ([P MDN env()](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env)). The house already pads by `env(safe-area-inset-*)` since W1 (REG-2810…2829).
- **What follows.** On a phone, the docked thing is **a field-shaped button** above the dock. A tap opens the **house Sheet**, sized to the visual viewport, with the real input at its foot and the chips above it. The keyboard is then the sheet's problem, solved once, not the page's. The house already works this way: Notes' docked composer on a phone and an upright tablet (REG-381 · REG-2724), the Maison AI sheet at ≤767, and inputs at 16px so iOS does not zoom.

---

## 3. Fifteen principles for our Dashboard

Each one: **the principle**, then what it means for *our* page, then the evidence.

1. **What needs me comes first, as a ranked list of doors, not a count.**
   - *For us.* Needs you stays at the top of the act stack, in its declared order (REG-2004). Its sections appear only when they have rows.
   - *Evidence.* Linear's focus order and Priority tab · HubSpot's day-first home · Houzz *Today* · Buildertrend "based on set deadlines" · Few's monitoring order: overview, then the problem areas, then the detail ([PDF](https://blogs.ischool.berkeley.edu/i247s13/files/2013/02/WhyMostDashboardsFail.pdf)).

2. **One press per row, and the verb sits on the row.**
   - *For us.* Every row's one text button is the main interaction: *Review · Send reminder · Approve · Call*. Tasks tick done in place with Undo (already). Add one quiet verb, **Not today**, which comes back tomorrow.
   - *Evidence.* HubSpot Join · Prep · Reply and Needs attention's action or ✕ · Linear's snooze that returns · Shopify's order tasks with counts · Procore's quick create.

3. **A number earns its place only if it changes a decision, and it never comes alone.**
   - *For us.* Every tile carries its comparison (vs the same point last month, or the week before as Studio Pulse does today) and a mark of direction: an up / down glyph and a short bar or sparkline drawn by length and position. Tiles that change no decision go.
   - *Evidence.* Ries on vanity metrics ([tim.blog](https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/)) · Stripe's comparison range · Apple's trend arrows · NN/g: length and 2D position read preattentively ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)) · Shopify keeps only four metrics.

4. **Finite things get a ring; trends get an arrow; nothing gets a gauge.**
   - *For us.* "3 of 5 done today" as a small ring on My tasks. "Leads ↑ 4 vs usual" as an arrow plus a sentence. No donuts, no dials.
   - *Evidence.* Apple Fitness rings and Trends · Health's Highlights as sentences · NN/g: gauges "consume a lot of precious space", pies "should be avoided most of the time".

5. **Red is earned: late and ours is loud, upcoming is calm.**
   - *For us.* Keep the rule that only a row that is ours *and* late is red. What is merely coming up sits in Coming up, never in Needs you. Staleness thresholds are the studio's, per stage.
   - *Evidence.* CoConstruct holds upcoming selections back "to avoid any unnecessary clutter" · Houzz's red / yellow / black · Pipedrive's per-stage rotting.

6. **The page changes because the studio changed, and says what changed since you were last here.**
   - *For us.* The brief's sentence becomes *since yesterday*: new leads, client replies, signatures, payments in, site photos. It is written from the records, as Health's Highlights are.
   - *Evidence.* Linear's daily summary · Shopify's three daily insights · Stripe's daily-summary push · ChatGPT Pulse's morning set.

7. **The page can be finished.**
   - *For us.* Bounded lists ("Show n more"), an honest done state ("Nothing waits on you", REG-2004), and a visible finish line for the day (the ring in 4). No endless feed on the home. Market Insights and Site updates are capped.
   - *Evidence.* Pulse's cards end with the day · Shopify's 24-hour expiry · monday.com's *Later* crowding out what is overdue.

8. **The assistant is a field you type into, always at hand, not a card you scroll past.**
   - *For us.* Maison AI's field docks at the foot of the Dashboard's content column (§5). The brief card gives up its own field. The FAB is not needed on this page: one entrance, not two.
   - *Evidence.* Shopify's field "on most pages", opening "beside the page" · M365's prompt line as "task-aware workspace" · Linear ⌘J · Claude and ChatGPT [K] · our REG-2240, where the FAB was tucked because the card already had a field.

9. **Chips are few, drawn from today and from the role, and say what they will do.**
   - *For us.* At most three chips above the field, ranked from the day's records:
     - "Remind Ryan about the deposit" fills the field, so it can be reviewed;
     - "What did I miss since Friday?" sends at once.

     The brief's two role questions (REG-2003) *become* these chips.
   - *Evidence.* Shape of AI's contextual and adaptive suggestions, three to six and refreshed · Cloudscape's fill vs send · NN/g's chips above the field and follow-ups after the answer.

10. **Every card can be asked about, and the field shows what it is reading.**
    - *For us.* Each card head carries an *Ask* entrance. It focuses the docked field with a removable chip naming the card, and that card's questions appear. The answer respects Who sees leads and who sees costs.
    - *Evidence.* Notion's selected blocks · Shopify and Dynamics' page context · Breeze's context sidebar · "invisible context causes surprise" (aiuxplayground).

11. **Answers come where you are, and propose; the person approves.**
    - *For us.* At a desk, the answer opens in a pane beside the page (Material's supporting pane, about a third) and the cards stay visible. On a phone it opens in the sheet. Every change is a proposal with *Not now* plus one house action (S10).
    - *Evidence.* Shopify's panel and approval · Dynamics' side pane · M365's layered answer · Shape of AI's inline action as a suggestion, not an overwrite.

12. **Every card answers one question and has one home; the card is the door, not the destination.**
    - *For us.* Write each card's question down and keep it in the card's head:
      - Needs you: *what waits on me?*
      - My tasks: *what do I do today?*
      - Coming up: *what is next?*
      - Where it stands: *are we OK?*
      - Workload: *who has room?*
      - Site updates: *what happened on site?*

      A card with no question goes. Every ↗ opens its home with `?from=/dashboard` (one home per thing, REG-1360).
    - *Evidence.* NN/g: a dashboard communicates, a portal routes ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)) · Stripe: the report is the source of truth · Houzz's Recent Places.

13. **Fewer containers: group by question, not one card per number.**
    - *For us.* The tiles become **one** *Where it stands* strip, with rules between the figures and no card each. Glance content that only some roles see (Workload, Site updates, Market Insights) folds into the glance stack's foot rather than adding three more cards.
    - *Evidence.* HubSpot puts seven topics in one tabbed panel · the EC design system: overused cards make users "rely on their short-term memory" ([EC cards](https://ec.europa.eu/component-library/eu/components/card/usage)) · Material's *feed* is for *equivalent* items only.

14. **The role sets the default; the person may tune a little; the layout holds still while the content moves.**
    - *For us.* Keep the per-role defaults (REG-2007). If tuning comes, it is hide and reorder at most, never a free widget board: the owner may be older and wants it simple, the house rule behind REG-542. Positions stay fixed day to day so the eye learns them. What changes is the rows, the sentence and the chips.
    - *Evidence.* Shopify swaps metrics per user without affecting others · HubSpot's "About you" · Notion's per-section counts · Asana's and Procore's free drag-and-resize boards, which hand the design job to the user.

15. **Same rows and same verbs at every width; the phone gets a dock with an accessory, never a second floating thing.**
    - *For us.* Each card's rows are the same component at 1440, 768 and 390; only the columns and the number of rows shown change. On a phone, the composer is the dock's accessory and opens the house Sheet.
    - *Evidence.* iOS 26's bottom accessory · Material's "no toolbar with the nav bar" · Shopify's Sidekick that stays on screen · our eight REG fixes for a FAB over a control.

---

## 4. Anti-patterns to avoid

| Anti-pattern | Why it fails (evidence) | Where we are exposed |
|---|---|---|
| **A wall of KPIs** | NN/g: a dashboard is "an at-a-glance, single-screen view"; Few: most dashboards deliver "only a fraction of the needed insight" | The tile row keeps growing by role (Sales, Response time, Contractors, Tickets…) |
| **Vanity numbers** (all-time totals, raw counts) | Ries: numbers that "rarely tell you what to do next" ([tim.blog](https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/)) | "Leads 214" with no period or comparison |
| **Gauges, donuts, 3-D** | NN/g: gauges waste space; pies only for very large gaps; 3-D distorts | Any "progress" drawn as a dial |
| **Everything as a card** | EC: overused cards force short-term memory; Material keeps cards for equivalent items | Eight to ten cards, one per topic |
| **Red-dot and badge blindness** | Badges that are always on lose their effect ([S Braze](https://www.braze.com/resources/articles/beware-red-dot-badging); [PatternFly](https://v5-archive.patternfly.org/components/notification-badge/design-guidelines)); Linear built Priority because "the inbox … treated them all the same" | Red counts on every tile, card head and rail item at once |
| **An endless feed on the home** | Pulse's cards end with the day; Shopify's insights expire after 24 h | Site updates or Market Insights growing into a feed |
| **Stale or generic chips** | Shape of AI: irrelevance, overexposure, staleness; Typeform's context-free chips | Fixed chips that never change with the day |
| **Two entrances to the same assistant** | Starter pills compete with the + menu (aiuxplayground) | Today: the brief's Ask field **and** the FAB |
| **A floating button over work** | Our own register: REG-824 · 2240 · 2602 · 2667 · 2693 · 2729 · 2830 · 2869 | Any FAB left on the Dashboard once the field docks |
| **Invisible AI context, silent AI changes** | aiuxplayground: "invisible context causes surprise"; Shopify needs approval | An *Ask about this card* that does not show the card as a chip |
| **Nudges as thinly veiled upsells** | Shape of AI warns against using nudges this way ([S nudges](https://shapeof.ai/patterns/nudges)) | S41b-4's upgrade nudges, or Market Insights, dressed as "needs you" |
| **Customising as a stand-in for a good default** | Asana's and Procore's free boards; monday.com's 1,000-item *Later* | A "Customize" button where the default should have been right |
| **One number in two places that disagree** | Our rule since REG-1360: one home per thing; REG-2007's tiles are the listings' own figures | A sparkline or delta computed differently from its report |

---

## 5. Responsive patterns: desk, tablet, phone

The house breakpoints are ≤767 · 768–1024 · ≥1025 (REG-315), and the desk at 1440 stays byte-identical unless Vicky approves a change.

### 5.1 Desk (≥1025, mouse)

- **Layout.** Keep the two stacks weighted act : glance (REG-2011).
  - *Act* (left, wider): Needs you · My tasks · Coming up.
  - *Glance* (right): Where it stands as one strip · then the role's extras.
  - This matches Asana's *start your day / jump back in* and Material's supporting pane (primary about two thirds).
- **The composer.**
  - Docked at the foot of the **content column**, centred to the column's width and never over the rail.
  - Height grows with the text to a cap, then the text scrolls inside it.
  - The page's end reserves the composer's height plus a gutter, so the last card scrolls clear of it.
  - Chips sit directly above the field; a context chip, when there is one, sits inside the field's left edge.
  - ⌘K stays search (REG-709). A key from the keyboard registry (`lib/keys/registry.ts`) could focus the field, like Linear's ⌘J; that is a new key and his call.
- **Answers.** One-liners grow the composer upwards. Anything longer opens the existing Maison AI panel as a pane beside the cards, never over them.
- **The FAB.** It does not show on the Dashboard; the docked field replaces it. Every other page keeps REG-507.

### 5.2 Tablet (768–1024, touch)

- **768 upright (Material's *medium*).** One column, in reading order: Needs you, My tasks, Coming up, Where it stands, then the extras (REG-2011's order). The composer is docked at the foot as on the desk, at 16px with a 44 target. Answers open in the house Sheet, as Notes does on an upright tablet (REG-2724).
- **1024 sideways (*expanded*).** Two stacks are possible again, with the answer in a side pane. The composer docks under the act stack.
- **Hardware and floating keyboards on iPad.** The docked field must not assume the keyboard is at the bottom: keep it in the page's flow, and let the sheet own focus on touch.
- **The FAB.** Not shown on the Dashboard. Today's rule for a touch tablet, resting at the page's end (REG-2667), stays for every other page.

### 5.3 Phone (≤767)

**At rest:**

```
┌──────────────────────────────┐
│ top bar (MobileChrome)       │
│ Good morning, Dane · Mon     │  ← one sentence: since yesterday
│ ┌ Needs you ─────── 4 of 7 ┐ │
│ │ row · verb               │ │  ← 4 rows, then "Show 3 more"
│ └──────────────────────────┘ │
│ ┌ My tasks ──── ◔ 3 of 5 ──┐ │  ← ring for what's finite today
│ └──────────────────────────┘ │
│ Where it stands  (2 × 2)     │  ← figure · ↑↓ vs usual · door
│ …                            │
├──────────────────────────────┤
│ ( ✦ Ask Maison AI…      🎙 ) │  ← accessory: a field-shaped button
├──────────────────────────────┤
│ Dashboard · Leads · … · More │  ← the dock
└──────────────────────────────┘
```

- **The accessory.**
  - It sits directly above the dock, padded by `env(safe-area-inset-bottom)` with the dock.
  - Scrolling down collapses it into the dock's line as a compact ✦ glyph; scrolling up brings it back. This is the iOS 26 accessory behaviour.
  - It is always present on this page and never hidden on condition (Apple's own bug reports).
- **On tap.**
  - The house **Sheet** opens, sized to the visual viewport: the chips above, the real input at its foot (16px, so no zoom), voice beside it, and the answer in the sheet.
  - The keyboard pushes the sheet, not the page. This avoids the fixed-bar-behind-the-keyboard trap in both Safari and Chrome 108+.
  - The page underneath keeps its scroll.
- **Rows.** Needs you shows four rows (REG-2004). Coming up and My tasks show three. Tiles are a 2 × 2 grid with figure, direction and door; Shopify's app-style sideways swipe hides what is off screen.
- **The page's end** reserves dock plus accessory plus 16, as the lists' `--fab-clearance` does today (REG-2869).
- **Phone held sideways (844 × 390).** Vertical space is gone, so the accessory stays collapsed into the dock's ✦ and the Sheet opens at full height. Safe areas left and right apply on a notched phone (REG-2810…).

### 5.4 The composer's states, every width

| State | Desk | Tablet | Phone |
|---|---|---|---|
| Rest | Field docked at the column's foot, chips above | Same, 16px / 44 | Field-shaped button above the dock |
| Scrolling | Stays | Stays | Collapses into the dock's ✦; returns on scroll up |
| *Ask about this card* | Focus the field, add a context chip, swap in the card's chips | Same | Open the Sheet with the context chip |
| Typing | The field grows to a cap | Same; a hardware keyboard needs nothing more | The Sheet owns the keyboard |
| Short answer | Grows above the field, at its width | Sheet | Sheet |
| Long answer or a proposal | Maison AI pane beside the cards | Sheet (upright) / pane (sideways) | Sheet |

---

## 6. Open questions for Vicky (the benchmark cannot answer these)

1. **Does the FAB step aside on the Dashboard** once the field docks there (principle 8)? It would be one entrance, not two.
2. **Do short answers open in place**, growing the composer, or always in the Maison AI pane? (§2.4)
3. **Are chips written by rule from the day's records,** like the brief's sentence today, or left to the model seam? By rule keeps them honest on the prototype.
4. **Trends need history.** A sparkline per tile needs a figure per day or week in the records (REG-343: demo data must back every state). Is "vs the same point last month" in words enough for the first round?
5. **Any personal tuning?** None, hide only, or hide plus reorder (principle 14)?
6. **"Not today" on a Needs you row** (principle 2): it is a new verb and needs his approval.

---

## Sources

**Daily homes**
- Linear: [Inbox](https://linear.app/docs/inbox) · [Priority inbox](https://linear.app/changelog/2026-09-03-priority-inbox) · [My issues](https://linear.app/docs/my-issues) · [Snooze](https://linear.app/docs/snooze) · [Triage](https://linear.app/docs/triage) · [Pulse](https://linear.app/changelog/2025-04-16-pulse) · [Custom feeds](https://linear.app/changelog/2025-05-15-custom-feeds-in-pulse) · [Pulse on mobile](https://linear.app/changelog/2025-11-13-pulse-on-mobile) · [Linear Agent](https://linear.app/docs/linear-agent) · [releases.sh note](https://releases.sh/release/rel_2BkMVMOmVYHNf81kuzkFk)
- Stripe: [Dashboard basics](https://docs.stripe.com/dashboard/basics) · [Home charts](https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights) · [Mobile app](https://docs.stripe.com/dashboard/mobile)
- Shopify: [Home](https://help.shopify.com/en/manual/shopify-admin/shopify-home) · [Sidekick features](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/sidekick/features) · [Sidekick Pulse](https://help.shopify.com/ur/manual/ai-powered-tools/sidekick/pulse)
- HubSpot: [Home page](https://knowledge.hubspot.com/help-and-resources/use-your-home-page) · [Breeze Assistant](https://knowledge.hubspot.com/ai/use-breeze-assistant)
- Pipedrive: [Activities and goals](https://www.pipedrive.com/en/features/activities-goals) · [Goals](https://support.pipedrive.com/en/article/insights-goals) · [Rotting](https://support.pipedrive.com/en/article/the-rotting-feature)
- monday.com (community): [groups](https://community.monday.com/t/add-groups-to-my-work-section-e-g-split-later-into-this-month-next-month-this-year-next-year-etc/84030) · [limit](https://community.monday.com/t/my-work-prioritizes-later-category-instead-of-overdue-or-this-week-when-over-1000-items-limit/54646)
- Asana: [Home](https://asana.com/features/project-management/home)
- Notion: [Home](https://www.notion.com/help/home-and-my-tasks) · [Agent](https://www.notion.com/help/notion-agent)
- Procore: [Overview FAQ](https://v2.support.procore.com/en-gb/faq-what-is-the-difference-between-the-legacy-project-home-page-and-the-new-project-overview) · [Release notes](https://support.procore.com/products/online/user-guide/project-level/project-overview/release-notes) · [My Open Items](https://support.procore.com/products/online/user-guide/project-level/home/tutorials/open-items-from-the-project-overview-in-the-projects-home-page)
- Buildertrend: [Mobile navigation](https://buildertrend.com/help-article/introduction-to-mobile-navigation/) · [Podcast](https://buildingcode.podbean.com/e/inside-buildertrend-a-quicker-way-to-start-your-day/)
- Houzz Pro: [Homepage](https://pro.houzz.com/pro-learn/blog/new-houzz-pro-homepage-start-your-mornings-off-armed) · [Tasks](https://pro.houzz.com/pro-help/r/how-to-create-and-manage-your-tasks)
- CoConstruct: [Upcoming selections](https://www.coconstruct.com/learn-construction-software/will-upcoming-selection-items-show-up-on-my-main-page) · [Projects dashboard](https://coconstruct.com/learn-construction-software/your-projects-dashboard)
- Apple: [Activity rings](https://support.apple.com/108359) · [Health app](https://support.apple.com/en-ie/HT203037) · [Fitness trends (S)](https://iphonelife.com/content/understanding-fitness-trends-apple-fitness-challenges) · [Edit Summary (S)](https://www.idropnews.com/how-to/how-to-customize-your-iphones-fitness-summary/227225)
- Material / Android: [Canonical layouts](https://developer.android.com/guide/topics/ui/layout/canonical-layouts) · [Navigation bar (M3 via SAP)](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage) · [Window classes](https://dev.to/tkuenneth/about-window-size-class-libraries-5c5m) · [M3 Expressive toolbars](https://9to5google.com/2025/05/18/material-3-expressive-toolbars/) · [Docked toolbar (MDC)](https://gitea.com/784622644/material-components-android/src/branch/master/docs/components/DockedToolbar.md)

**Assistants and composers**
- [Microsoft 365 Copilot redesign](https://microsoft.com/en-us/microsoft-365/blog/2026/05/28/introducing-a-new-design-for-microsoft-365-copilot) · [WSU notice](https://its.wsu.edu/2026/06/10/microsoft-365-copilot-app-updates/) · [Copilot in Dynamics 365 Sales](https://learn.microsoft.com/en-us/dynamics365/sales/use-sales-copilot)
- Gemini: [Web redesign](https://9to5google.com/2025/07/23/gemini-web-redesign/) · [Android home Nov 2025](https://9to5google.com/2025/11/14/gemini-android-homepage-redesign/)
- ChatGPT: [Pulse, eWeek](https://www.eweek.com/news/openai-chatgpt-pulse/) · [Pulse, Vaizle](https://insights.vaizle.com/news/openai-launches-chatgpt-pulse-a-once-a-day-brief-inside-chatgpt-that-runs-overnight) · [Composer, BGR](https://www.bgr.com/tech/chatgpt-got-a-makeover-but-all-of-your-ai-tools-are-still-there/) · [Composer teardown](https://aiuxplayground.com/teardowns/chatgpt/composer)
- Claude: [Composer teardown](https://aiuxplayground.com/teardowns/claude/composer) · [Composer patterns guide](https://aiuxplayground.com/guides/how-to-design-ai-chat-composer)
- Pattern libraries: [Shape of AI · Suggestions](https://www.shapeof.ai/patterns/suggestions) · [Inline action](https://www.shapeof.ai/patterns/inline-action) · [Nudges](https://shapeof.ai/patterns/nudges) · [Cloudscape · Support prompts](https://cloudscape.design/patterns/genai/support-prompts) · [NN/g · Prompt controls](https://www.nngroup.com/articles/prompt-controls-genai/) · [Atlassian · AI UX patterns](https://www.atlassian.com/blog/developer/ai-user-experience-patterns)

**Phone platform**
- [Chrome viewport resize](https://developer.chrome.com/blog/viewport-resize-behavior) · [HTMHell · interactive-widget](https://htmhell.dev/adventcalendar/2024/4/) · [MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element) · [MDN env()](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env) · [web.dev viewport units](https://web.dev/blog/viewport-units) · [Apple forums · visualViewport on iOS 26](https://developer.apple.com/forums/thread/800125) · [Apple · bottom accessory](https://developer.apple.com/tutorials/data/documentation/swiftui/view/tabviewbottomaccessory(content:).md) · [Create with Swift](https://www.createwithswift.com/enhancing-the-tab-bar-with-a-bottom-accessory/) · [Apple forums · accessory hiding](https://developer.apple.com/forums/thread/803404) · [Apple HIG · Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

**Dashboard craft**
- [NN/g · Dashboards and preattentive processing](https://www.nngroup.com/articles/dashboards-preattentive/) · [Few · Why most dashboards fail](https://blogs.ischool.berkeley.edu/i247s13/files/2013/02/WhyMostDashboardsFail.pdf) · [Ries · Vanity metrics](https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/) · [EC · Cards](https://ec.europa.eu/component-library/eu/components/card/usage) · [Braze · Red-dot blindness](https://www.braze.com/resources/articles/beware-red-dot-badging) · [PatternFly · Notification badge](https://v5-archive.patternfly.org/components/notification-badge/design-guidelines)

**Our own record**
- `design-source/REGISTER.md`: REG-381 · 507 · 1360 · 1785…1793 · 2002…2013 · 2100…2108 · 2240 · 2602 · 2667 · 2693 · 2724 · 2729 · 2810…2829 · 2830 · 2869.
