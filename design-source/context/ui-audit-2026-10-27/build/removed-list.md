# What the calm UI build removed: the full list (for Vicky, 2026-10-30)

Vicky, you asked for everything the calm UI build removed, apart from what you have already restored. This is that list.

**What counts as removed:** you can no longer see it or press it anywhere, or you now reach it deeper than before. Deeper means
one more press, a hover, a fold, a drawer, a tooltip, a "More ›" submenu, another tab, or Column settings. It also counts when
something now shows only at some widths or in some states. A rename in the same place, a restyle and a move to an equally
visible spot are not listed.

**How it was checked:**
- **The records:** every lane's outcome (§1, §2, §8), B5's four parts, `changes-for-developers.md`, `calls-for-vicky.md`, X and
  Y, the Dane merge (M1, M2) and the six regression triages.
- **The code:** `git diff 83d7c1f8 e290c824`, file by file. Every row was then checked at `main`, so a later commit could have
  brought it back.
- **Where the two disagreed, the code wins.** Twelve rows were found in the code alone (marked "code only"), and a few records
  turned out to be wrong:
  - B1 1-29 says Your profile's help went behind a tooltip, but three of those lines were cut.
  - B5's parts say "moved, nothing removed", but seven lines are gone outright.

**Left out:** the Dashboard redesign and its calm pass (REG-2930…3069), the Floorplan to 3D audit (REG-3070…3074) and Dane's
own Tasks / Tickets changes. These landed in the same commit but you approved them separately.

**Read this before the tables: tooltips don't open on touch.** The house `Tooltip` never opens on a phone or a touch tablet. Only
a refused control speaks, through the snackbar (`components/om/tooltip.tsx`). So everything the build moved "into a tooltip"
shows **nowhere** under a finger. That includes:
- the Demo chips (`DemoNote` says "on a tap" in its comment, but it is a plain Tooltip);
- Finance's and Payments' "How this works";
- the Reports captions and averages;
- the Settings doors' sentences;
- the Company panel's help.

`InfoTip` and the "How this works" folds do work on a tap. **One fix covers most of the "(touch)" rows below:** let the plain
Tooltip, or at least `DemoNote` and the "How this works" tooltips, answer a tap the way `InfoTip` does.

**Calls you already closed:** several rows are calls you closed "as built" on 2026-10-28; the row names the call (C-nn). I still
give my own recommendation. You brought most of the 10-29 list back after closing those calls, so the closing didn't seem final.

**Found on the way (not a removal):** the build took Change off a signed quote's Template card. But the quote Preview's template
words still open the picker on a signed quote, and `setQuoteTemplate` (`app/company/templates-actions.ts`) has no signed check.
So a signed quote can still change its paper from the Preview.

**Classes:**
- **A**: a thing you used to do or reach in one step, now gone or deeper.
- **B**: information gone from the screen, or now only behind a tooltip, fold or setting.
- **C**: a repeat of what the screen already says elsewhere.

Answer with the row numbers, e.g. "bring back R-03, R-07".

## Shell & Dashboard

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-01 | **Dashboard** — the ✦ Ask button in each card's head (1-19 · REG-3082) | Card head, desk, on hover | The card's ⋮ › Ask Maison AI about this | A | Keep off — one press more; the docked field asks too |
| R-02 | **Dashboard (phone)** — a card's own ⋮ (Ask about this · Hide this card) (1-28 · REG-3082) | Every card head, phone | Hide: page ⋮ › Cards on your page. Asking about one card: nowhere on a phone | A | Keep off — the dock is Maison AI on a phone; Hide is one ⋮ away |
| R-03 | **Dashboard (phone)** — the Whole studio · Just me switch (1-28 · 1-16 · REG-3080) | Its own row under the greeting | Page ⋮ › Show; nothing at rest says which view is on | A | Bring back — on a phone you can't tell whose numbers you're reading |
| R-04 | **Dashboard** — Needs your attention's tabs with their counts (All · Approvals n · Clients waiting n · Overdue n) (1-01 · REG-3075) | Card head, always | Only when the list has 8 rows or more | B | Keep off — under eight rows the list itself shows them |
| R-05 | **Dashboard** — a project's standing to-dos as rows of their own, each with its verb (1-01 · REG-3076 · closed C-17) | One row each | One row per project, "n things to do"; each to-do in its ⋮ (up to 6) | A | Keep off — it was a 51-row inbox; each is one ⋮ away |
| R-06 | **Dashboard** — the count in the greeting ("· 51 things need you") (1-18 · REG-3080) | The greeting's line | Screen reader only; the card head says it | C | Keep off — a repeat of the card head |
| R-07 | **Dashboard** — Since's Market Insights chip ("n new articles") (1-18 · REG-3080) | The greeting's Since popover | Nowhere on the Dashboard (Tools › Market Insights) | B | Keep off — editorial, not the studio's own news |
| R-08 | **Dashboard** — Team workload's head key "projects / capacity" (1-33 · REG-3083) | Card head | Screen reader only | C | Keep off — each row says it in words |
| R-09 | **Bell** — the Due rows as their own group, leading the bell while any was late (1-20 · REG-3086) | Notifications panel / phone sheet | One fold at the end, "Due · n · k late · Show" | B | Keep off — the fold line shows the count and the late count |
| R-10 | **Bell** — "· also by email and WhatsApp" / "· in your daily summary" on each row (1-20 · REG-3086) | Each row's meta line | The time's tooltip — nowhere on touch | B | Bring back — tooltip only, so a phone never shows it |
| R-11 | **Bell** — group heads "Notices n" and "Due n" (1-20 · REG-3086) | Above each group | None | C | Keep off — the badge and the fold line carry the counts |
| R-12 | **Studio block menu · phone You sheet** — the "Open to new leads" switch with its state line (1-39 · REG-3089 · closed C-18, ↩ REG-1833) | One press from any page | Your profile › New leads ("Take new leads") | A | Bring back — S16's one-press switch (1.0's top bar), now a page away |
| R-13 | **Studio block menu** — View as · Studio plan · Studios (1-40 · REG-3088) | Top of the menu | The "Demo" fold at its foot (remembered once opened) | A | Keep off — demo tools; More › View as on a phone is unchanged |
| R-14 | **Maison AI sheet** — the "Keyboard shortcuts for this page" suggestion (1-19 · REG-3091) | The sheet's suggestions, desk (REG-715) | Not in the sheet; ?, ⌘K and the bell's note open the panel | A | Bring back — REG-715's discovery door for the ? panel |
| R-15 | **Maison AI sheet** — the helper "Answers from your records" (1-19 · REG-3091) | Under the Ask field | Gone | C | Keep off — a reassurance every answer gives |
| R-16 | **Maison AI button (desk)** — always in sight in its corner (1-43 · 5-50 · REG-3092 · closed C-13) | Bottom-right at rest | Fades while words or controls sit under it; back as the pointer nears, on focus, ⌘J | A | Bring back — on dense pages Maison AI has no visible door |
| R-17 | **Maison AI button (phone, a project's pages)** — at rest at the top (3-09 · REG-3109) | Bottom-right on the first screen | Tucked; back on the first scroll up and at the end | A | Keep off — the brief carries Maison AI's steps there |
| R-18 | **⌘K (touch)** — the Keyboard shortcuts row (1-37 · REG-3093) | Go to, always listed | Only once a real keyboard has pressed a key | A | Keep off — no keyboard, no shortcuts |
| R-19 | **⌘K (phone)** — the long placeholder "Search leads, projects, quotes…" (1-37 · REG-3093) | The field | "Search" | C | Keep off — the scope chips say the kinds |
| R-20 | **Column settings (every table)** — help "Toggle columns … drag to reorder" (2-43 · REG-3096) | Over the list | An ⓘ tooltip on the title (touch: nothing) | C | Keep off — the switches and handles show it |
| R-21 | **Column settings (every table)** — the pin glyph on every row (2-43 · REG-3096) | Each row at rest | On hover / focus at a desk (touch unchanged) | A | Keep off — rare, one hover away |
| R-22 | **Your profile** — Your details' help ("Your name and photo show … in the messages clients read") (1-29 · REG-3090 · REG-3366) | The card head | An ⓘ InfoTip by the role chip (answers a tap) | B | Keep off — the tip works on touch too |
| R-23 | **Your profile** — the role sentence "You're an Owner … An Owner or an Admin sets roles on Company › Members" (1-29 · REG-3090) | A line under Your details | The role chip's tooltip — nowhere on touch | B | Bring back — who sets roles is said nowhere else (touch) |
| R-24 | **Your profile** — Signature help "Draw it, type your name … or upload a picture" (1-29 · REG-3090) | The card head | "Printed on your quotes and contracts" | C | Keep off — the consent switch and the box say it |
| R-25 | **Your profile** — PayNow help "a claim paid back, your commission … with a copy button" (1-29 · REG-3090) | The card head | "For claims and commission"; the rest in the PayNow dialog | C | Keep off — the dialog says the rest |
| R-26 | **Your profile** — Public profile's "on their portal and your studio's Hangout pages" (1-29 · REG-3090) | The row's second line | "What clients see about you"; where it shows is said nowhere | B | Keep off — the profile page is one press away |
| R-27 | **Sign-in** — the demo's two lines ("no text or email is sent", "Dane, the studio's Owner, …") (1-46 · REG-3101) | Under the form | One box "Demo: any 6 digits work — try dane@demostudio.sg" | C | Keep off — a stand-in note |

## Leads

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-28 | **Leads listing** — the "Insights" button (1-30 · 2-47 · REG-3112 · closed C-33) | Header, outlined at a desk, a square on a phone | The listing ⋮'s first row, "Reports" | A | Bring back — the mock's header (779:19690, phone 1082:25131, REG-305) |
| R-29 | **Leads listing** — New lead ▾'s Link to Email · Link to Zapier · Connect to Ads, each landing on its card (2-33 · REG-3112) | Three rows of the menu | One row "Get leads automatically…" → Integrations' top | A | Keep off — a one-time set-up; the help names all three |
| R-30 | **Leads listing (table)** — Edit on every row (2-06 · REG-3113 · closed C-33) | The row's hover pair at a desk; at rest on a touch tablet | Row ⋮ › Edit | A | Bring back — the mock's row hover (606:75167, REG-163) |
| R-31 | **Leads listing (table, kanban)** — "+ Add task" on a lead with none (2-06 · REG-3113) | Purple link at rest | "No task" at rest; Add task on hover (touch unchanged) | A | Keep off — the cell still opens the popover in one press |
| R-32 | **Leads listing (table, kanban)** — the person-plus beside the faces (2-06 · REG-3113) | At rest | On hover / focus at a desk | A | Keep off — at rest on every touch screen |
| R-33 | **Leads listing (phone cards)** — the "New" tag on a not-opened lead (2-15 · REG-3116 · closed C-35) | The card's name row | Nowhere; the left band stays | C | Keep off — the band says it |
| R-34 | **Review imported leads** — per-card Approve · Reject (2-16 · REG-3115 · closed C-34) | Every clean card's foot | The detail pane's foot, after opening the card | A | Bring back — a 14-lead queue was one press a card, now two |
| R-35 | **Review imported leads** — the "Pending" tag (2-16 · REG-3115) | Every clean card | Nowhere | C | Keep off — every card in the queue is pending |
| R-36 | **Deleted leads** — the foot note "hidden from the board and reports. Use the Restore button…" (2-31 · REG-3118) | Under the table | Nowhere | C | Keep off — Restore is every row's button |
| R-37 | **Import leads** — "Tips on Importing … using this template" (the inline link) (2-32 · REG-3118) | The tips panel | Nowhere; "Download the template" stays | C | Keep off — the same download is the panel's link |
| R-38 | **Lead form** — the helper "Client project address." (2-49 · REG-3119) | Under Property address | Nowhere | C | Keep off — the label says it |
| R-39 | **Lead form › duplicate dialog** — which field matched ("…with this email / phone already exists") (2-49 · REG-3119) | The title | "Already in your leads"; the body shows both | B | Keep off — the body shows the match |
| R-40 | **Assign members popover** — the suggestion's "(must match)" / "(preferred)" split (2-41 · REG-3119) | The suggested member's line | "Takes HDB 4-Room & … leads." | B | Keep off — preferences live on Members |
| R-41 | **A lead's header** — the locked "Convert to Project" (2-05 · REG-3120 · closed C-25) | Beside the primary, ≥1025 | Stage ▾ › the Won row, same refusal | A | Bring back — REG-469 kept the lock in the header; Won's way at a glance |
| R-42 | **A lead's header (Overview)** — chips phone · budget · type · source (with the Qanvast mark) (2-02 · REG-3120 · closed C-26) | Beside the title, ≥1025 | The info column's rows; one grey line on the other tabs | C | Keep off — the column beside it holds them |
| R-43 | **A lead's header (Overview)** — the return-state chips (2-02 · 2-38 · REG-3120) | Beside the title | The LEAD RETURNED card; other tabs keep the chips | C | Keep off — the card says it with its dates |
| R-44 | **Info column (lead and project)** — the "Owner" row (2-14 · 3-18 · REG-3122 · closed C-27) | Collaborators section | Members marks "(you)" and "· in charge" | C | Keep off — the list says both (mock 858:24806 drew the row) |
| R-45 | **Info column (lead)** — the "Stage" row (2-02 · REG-3122) | Lead info | Stage ▾ and the LEAD STAGES card | C | Keep off — said twice beside it |
| R-46 | **Info column (lead and project)** — every empty row ("District --", "Portal --"…) (2-03 · 3-32 · REG-3122 · closed C-27, ↩ REG-228) | Each section at rest | Hidden; one "Add district, area size…" link per section | B | Keep off — the link opens the form on the field |
| R-47 | **Info column** — Team chat's helper "Only the team reads it" (2-37 · REG-3122) | Beside the link | Nowhere | C | Keep off — "Team chat" beside "Client chat" says it |
| R-48 | **A lead's page (phone)** — the name in the identity block (2-36 · REG-3122) | Under the page bar | The page bar only | C | Keep off — the bar holds the name |
| R-49 | **A lead's Overview › Maison AI card** — the brief's second action (2-01 · REG-3121 · closed C-28) | Two outlined buttons | The Maison AI sheet only | A | Bring back — the mock's two actions (858:24867) |
| R-50 | **A lead's Overview › Maison AI card** — the other briefs under "Show more" (2-01 · REG-3121 · closed C-28) | Stacked behind Show more | Their sentences nowhere; only their actions, in the sheet | B | Bring back — REG-237, your "two cards below and a show more button" |
| R-51 | **A lead's Overview › Maison AI card** — the brief's tag ("Fresh lead · respond fast") (2-01 · REG-3121) | The card head | Nowhere on a lead | C | Keep off — the stages card says where the lead is |
| R-52 | **A lead's Overview › Maison AI card** — the "n× more often" figures (2-01 · REG-3121) | The brief's third sentence | Nowhere | B | Keep off — invented numbers, not the studio's |
| R-53 | **A lead's Overview › Maison AI card** — the New brief's restated facts ("from Instagram — HDB 4-Room, S$70K") (2-02 · REG-3121) | First sentence | The info column | C | Keep off — the column beside it says them |
| R-54 | **Quotes card (lead and project)** — the step names under the track (Draft · … · Signed) (2-25 · REG-3123 · closed C-29) | Under the bar (≤1024 the current step, B-06) | Nowhere; one state sentence above | B | Bring back — the mock's labels (858:25057) and your B-06 call |
| R-55 | **Quotes card, empty** — "From Scratch" (a blank quote in one press) and "From Template" (2-04 · REG-3123 · closed C-29) | Two buttons | One "Create a quote" → the window → Blank (two presses) | A | Bring back — the mock's empty card (858:24272) |
| R-56 | **Lead stages card** — "n days in pipeline" (2-39 · REG-3123 · closed C-30) | Card head, right | "In {stage} for n days" | B | Keep off — Created gives the age |
| R-57 | **Lead stages card** — "--" on future stages (2-03 · REG-3123) | Each future row | Nothing | C | Keep off — the empty circle says "not yet" |
| R-58 | **Lead stages card · Stage ▾ sheet (touch)** — the locked reason under every locked row (2-05 · REG-3123 · REG-3124) | Under each row | Said once when all share one reason | C | Keep off — the same sentence, once |
| R-59 | **Lead stages card** — the running Won leg of Response time before Quote Sent (2-17 · REG-3123) | The Response time line | From Quote Sent on only | B | Keep off — on a New lead "won …" read as won |
| R-60 | **Questionnaire (Overview card and the tab's Summary)** — "Total answered n / N" and "Client answered n · Studio answered n" (2-18 · REG-3149) | Under the track | "7 of 11 answered · none by Olivia yet"; the studio's count not said | B | Keep off — the studio's is the difference |
| R-61 | **Questionnaire tab** — the disabled "Ask Client" (3-33 · REG-3149) | Toolbar while empty | Hidden until a question exists | C | Keep off — it couldn't act; "Add them" is the way in |
| R-62 | **Questionnaire tab** — the "Q:" / "A:" prefixes (2-18 · REG-3149) | Every card | Nowhere | C | Keep off — the layout says which |
| R-63 | **Notes & logs (phone, upright tablet)** — the docked note composer (2-46 · REG-3148 · closed C-38, ↩ REG-381 · 402) | At the tab's foot, ready to type | New note ▾ › Note (or the Note quick link) | A | Bring back — the mock's composer (995:23383): a note with no press |
| R-64 | **Files › file info** — "Owner --" (T-08 · REG-3150) | The info panel | Left out | C | Keep off — a stand-in row |
| R-65 | **Move stage window** — "Log 1" on a step's only log (2-30 · REG-3147) | The log card's head | Blank (named from two logs) | C | Keep off — a lone "Log 1" names nothing |
| R-66 | **Put on hold / Mark as lost** — the subtitles "Moving to On Hold / Lost" (2-29 · REG-3147) | Dialog head | Nowhere | C | Keep off — on your "kept off as repeats" list |
| R-67 | **Meeting Copilot (/meetings)** — the "Insights" button (1-30 · REG-3137) | Page header | Toolbar ⋮ › Reports | A | Keep off — no mock; follow your Leads Insights call |
| R-68 | **Meetings lists (a lead's tab, a project's, /meetings)** — the "Deal score" column (2-20 · REG-3136 · closed C-41) | On at a desk; on the phone card | Off by default (Column settings); a phone has none, so nowhere | B | Bring back — on a phone it is gone entirely |
| R-69 | **Meetings lists** — "Open" beside the ⋮ (2-20 · REG-3136) | Row hover | The meeting's name (live keeps Rejoin) | C | Keep off — the name opens it |
| R-70 | **Meetings lists** — "Its planned time has passed" (2-20 · REG-3136) | Under To write up | Nowhere; "Needs notes" stays | C | Keep off — the status says it |
| R-71 | **Meetings, empty** — what Meeting Copilot does ("keeps the checklist, the tips … then makes the brief") (2-23 · REG-3136) | Empty state | "Plan one and Meeting Copilot keeps the notes." | B | Keep off — the meeting page explains it |
| R-72 | **A meeting's page** — the consent script under "Tell {first} before you start" (2-48 · REG-3139 · closed C-41) | Always open above the tick | Behind "What to tell {first}" | B | Bring back — the words to say before ticking consent, every time |
| R-73 | **A meeting's page** — "Listening isn't connected in this prototype — …" (2-09 · REG-3139) | A line | A "?" tooltip (touch: nothing) | B | Keep off — a stand-in note |
| R-74 | **A meeting's page (held)** — the heard tags (2-21 · REG-3138) | What we heard, always | Behind "Show details" | B | Keep off — the rows above say the profile |
| R-75 | **A meeting's page (held)** — the "Concerns" row (2-21 · REG-3138) | What we heard | The "Concerns they raised" card | C | Keep off — said once, with the answers |
| R-76 | **A meeting's page (held)** — Save on "Not saved to the lead yet" (2-21 · REG-3138) | ON THE LEAD card | The header's "Save to the lead" | C | Keep off — the same press in the header |
| R-77 | **Qanvast Ops › Hangouts and a Hangout's page** — "Sample" on every card, the sample line, the page's Sample chip (2-26 · 2-09 · REG-3141) | Card heads, a line, header chips | A "?" tooltip beside the search / the title | B | Keep off — stand-in notes |
| R-78 | **A Hangout › Chats** — "Booked on your page" head (2-26 · REG-3141) | Each chat card | Only a walk-in says how | C | Keep off — it stood on every card |
| R-79 | **A Hangout › Chats** — the status chip while the scope filters to it (2-26 · REG-3141) | Each card | Shown under All only | C | Keep off — the chip above says it |
| R-80 | **A Hangout › Chats** — the match figure "Fits you 72%" (2-26 · REG-3141 · closed C-41) | The told line | "Good / Fair / Weak match" | B | Keep off — the band reads at a glance |
| R-81 | **Qanvast Ops › Leads** — "Add Lead" (2-27 · REG-3142 · closed C-42) | Header, filled | Header ⋮ › New Qanvast lead (C still opens it) | A | Bring back — the mock's header (931:49232), REG-361 |
| R-82 | **Qanvast Ops › Leads** — "Insights" (2-27 · REG-3142 · closed C-42) | Header, outlined | Header ⋮ › Reports | A | Bring back — the mock's header (931:49232) |
| R-83 | **Qanvast Ops › Leads** — "Request Leads" (answers Coming soon) (2-27 · REG-3142) | Toolbar | Header ⋮ › Request leads | A | Keep off — inert |
| R-84 | **Qanvast Ops › Leads** — the inert sort arrows on the heads (2-27 · REG-3142) | Name · Credits · Budget · Created | Nowhere (Filters › Sort) | C | Keep off — on your "kept off as repeats" list |
| R-85 | **Qanvast Ops › Leads** — "Expired (30 days)" in the Return window cell (2-27 · REG-3142) | Every expired row | "—" | B | Bring back — "—" reads as unknown, not "the window closed" |
| R-86 | **Qanvast Ops › Reviews** — SuperTrust's footnotes ("* SuperTrust 2027 will be based on these…", "^ This year's reviews are counted…") (2-42 · REG-3143) | Under the tiles | A "?" tooltip (touch: nothing) | B | Bring back — how the year counts; touch shows nothing |
| R-87 | **Qanvast Ops › Lead credits · Reviews** — the stand-in line (2-09 · REG-3143) | A line | A Demo chip's tooltip | B | Keep off — a stand-in note |
| R-88 | **Return to Qanvast wizard** — the (i) policy control on the late / reason steps (2-38 · REG-3120) | Every step's head | Only on steps whose text has no policy link | C | Keep off — those steps link it in their text |

## Tasks

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-89 | **/tasks** — the "All · Leads · Projects" switch (1-06 · 1-26 · REG-3130 · C-134) | Toolbar, desk and tablet | The scope pill's menu, "Whose tasks" | A | Bring back — a frequent narrow; Dane's review was built around it |
| R-90 | **Tasks tables (lead, project, /tasks)** — the Status column (1-07 · REG-3131 · closed C-40) | On by default | Column settings, off | C | Keep off — the row's ring says done |
| R-91 | **/tasks** — the Creator column (1-07 · REG-3131 · closed C-40) | On at a desk | Column settings, off | B | Keep off — rarely read |
| R-92 | **/tasks** — the Tags column (1-07 · REG-3131 · closed C-40) | On at a desk | Column settings, off; tags only in the panel | B | Bring back — the studio's tags show nowhere on /tasks at rest |
| R-93 | **Tasks tables** — "+ Add Tags" on every untagged row (1-07 · 2-19 · REG-3131 · closed C-40) | Every row, every width (mock REG-170) | Desk: a hover hint; touch: nothing visible; row ⋮ › Add tags | A | Keep off — the row ⋮ and the panel hold it |
| R-94 | **Tasks tables** — the person-plus beside an assigned row's faces (1-07 · REG-3131) | At rest | On hover / focus at a desk | A | Keep off — the panel and the bulk bar assign |
| R-95 | **Tasks tables** — an undated task's "Set due date" calendar (1-07 · REG-3131) | At rest (mock 902) | On hover / focus at a desk | A | Keep off — the panel sets it |
| R-96 | **Tasks tables** — the floating "Edit" pill (1-07 · REG-3131) | Row hover | Row ⋮ › Edit; the title opens the same panel | C | Keep off — the title press does it |
| R-97 | **/tasks** — "Delete all" in the page ⋮ (1-42 · REG-3132 · closed C-40) | Header ⋮ | Select all → the bulk bar's Delete all | A | Keep off — a dangerous neighbour of Export |
| R-98 | **Tasks tables** — the new-task row's inert placeholders (calendar, "OPEN", "+ Add Tags") (1-07 · REG-3131) | The add row | Empty cells | C | Keep off — they couldn't act |
| R-99 | **Task panel** — the Due date's second format under the field (1-23 · REG-3133) | Under the field | Gone (the field shows the weekday) | C | Keep off — a true repeat |
| R-100 | **Tasks tab and Overview's Open tasks, empty** — "Stay organised — track, prioritise…" (2-23 · 2-28 · REG-3134) | Under the empty title | "No tasks yet" alone | C | Keep off — a marketing line |
| R-101 | **Overview's Open tasks card (lead and project)** — today's date in the head ("· 27 Oct") (2-28 · REG-3134) | Card head | Gone | C | Keep off — it was today, not the tasks' |

## Projects & the client portal

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-102 | **Projects listing** — the "Insights" button (1-30 · REG-3164) | Header, every width | Header ⋮ › Reports | A | Bring back — decide with the Leads listing's (the mock's door) |
| R-103 | **Projects listing** — the five tiles on Workload, Contractors and Completed (3-38 · REG-3164) | Above the toolbar on every view | Not drawn there | B | Keep off — they count open projects, not those rows |
| R-104 | **Projects listing (phone)** — every attention reason on a card (3-11 · REG-3165) | The card body, in red | The top one + "+n more" (opens in place) | B | Keep off — one tap shows them all |
| R-105 | **Projects listing › scope menu** — the full help under Needs your attention, Waiting on client, Needs my review (3-24 · REG-3164) | The row's second line | A short line; the full list in the row's tooltip (touch: nothing) | B | Bring back — on a phone the full list shows nowhere |
| R-106 | **New project** — the split helper "From Company › Templates › Payment schedules…" (W-524 · REG-3173) | Under the field | Nowhere | C | Keep off — on your "kept off as repeats" list |
| R-107 | **A project's header** — the number · project type · property type chips (3-31 · REG-3156) | Beside the title, every tab | The Overview's info column only; **the P-number shows on no other tab** | B | Bring back the number — off the Overview it shows nowhere |
| R-108 | **Stage ▾** — the "Active" / "Inactive" heads (3-53 · REG-3168) | Menu group labels | Gone; a divider | C | Keep off — on your "kept off as repeats" list |
| R-109 | **Overview · Payments › Needs your attention** — rows 4–6 at a desk, row 4 on a phone (3-07 · REG-3157) | Six (four) rows before "Show n more" | Three at every width | A | Bring back the desk's six — half the card now needs a press |
| R-110 | **Needs your attention** — an approval's second button "Send back" / "Decline", and the hold's "Change" (3-05 · 3-22 · REG-3157 · REG-3160) | A text button beside the verb | The row's ⋮ | A | Keep off — a rare counterpart, one press |
| R-111 | **Needs your attention** — "Remind on WhatsApp" / "Call {client}" on an overdue invoice (3-05 · REG-3160) | Beside Record a payment | The row's ⋮ | A | Bring back — chasing a late payment is a daily one-press step |
| R-112 | **Needs your attention** — "See the bank's confirmation" · "Not received" on "{client} says they paid" (3-05 · REG-3160) | Beside Confirm | The row's ⋮ | A | Bring back the confirmation — you check it before Confirm |
| R-113 | **Payments › Needs your attention** — the other second steps (Open · Record a payment · Change the amount · Message {vendor} · Record the refund) (3-05 · REG-3160) | Text buttons | The row's ⋮ | A | Keep off — occasional; the row's words open the record |
| R-114 | **Overview › Needs your attention** — a late milestone's own "Mark done" row and a late start's "Start" row (3-01 · REG-3157 · closed C-48) | Rows of their own | Merged into the ask's row; its ⋮ | A | Keep off — the milestone's panel has both |
| R-115 | **Overview › Needs your attention** — the VO-days row's caption "{VO title} · approved by {client}" (W-426 · REG-3170 · code only) | Under "VO-1 adds 3 days…" | Nowhere | B | Bring back — it said which change adds the days |
| R-116 | **Overview › AI brief (desk, tablet)** — the first button that repeated the header's step (3-01 · REG-3158) | The brief | The header's button only (a phone keeps it) | C | Keep off — a true repeat |
| R-117 | **Overview › AI brief** — the yellow "This week" tag (3-30 · C-50 · REG-3336) | The brief | Nowhere | C | Keep off — decided C-50 |
| R-118 | **Overview › brief and Progress** — the hold's day and reason said three times (3-31 · REG-3158 · 3159) | Brief, Progress row and note | Its Needs row only | C | Keep off — said once |
| R-119 | **Overview › AI brief (completed)** — "Completed · took n days" from Won to handover (3-16 · REG-3158) | The brief's tag | "Completed · n days on site" — the Won-to-handover span shows nowhere | B | Keep off — one length, the closing summary's |
| R-120 | **Payments** — New ▾'s variants at the first level (from a contractor's quote · an invoice made elsewhere · order from the quote · a PO made elsewhere) (3-26 · REG-3162 · closed C-51) | Top-level rows | One level in under each kind | A | Keep off — the five kinds read at once |
| R-121 | **Payments** — New ▾'s helper line under every row (3-26 · REG-3162) | Each row | Nowhere; each dialog says it | C | Keep off — the dialogs' subtitles say it |
| R-122 | **Payments › Client payments** — "From Q-…'s payment schedule — each payment bills its share … (a fixed fee first)" (W-525 · REG-3163) | Under the title | "How client payments work" tooltip (touch: nothing) | B | Bring back — names the source quote; touch shows nothing |
| R-123 | **Payments › Variation orders** — "{client} approves each on its link; once approved…" (W-638 · REG-3163) | Under the title | "How variation orders work" tooltip | B | Keep off — a how-it-works note |
| R-124 | **Payments › Costs** — the PO rule "Over S$5,000, or with an advance, a PO waits for an Owner or an Admin." (W-644 · REG-3290) | The list's help | "How this works" tooltip (touch: nothing) | B | Bring back as the house fold — touch shows nothing |
| R-125 | **Payments · invoice panel** — confirming a client's payment in one press (REG-3161) | One press | A press, then "Confirm payment" | A | Keep off — the confirm you approved |
| R-126 | **Schedule** — the ask band "Germaine marked Carpentry done … 1 more ask waits too" with "Open it" (3-01 · REG-3189) | Above the list | The asking row's line; ⋮ › Open the ask; the other-asks count gone | A | Keep off — the Overview's Needs row leads with it |
| R-127 | **Schedule** — the legend (today's line, weekends, diamonds, links) (3-23 · REG-3190) | Under the chart, desk | A "?" tooltip (touch tablet: nothing) | B | Bring back for touch — the "?" shows nothing under a finger |
| R-128 | **Schedule (phone)** — "Done" on every unfinished row (3-19 · REG-3191) | Every not-done row | Running / blocked rows only; others via the panel | A | Keep off — an unstarted milestone is rarely done |
| R-129 | **Milestone panel** — the Bar colour chips (3-46 · REG-3192) | Open | Behind "More options" | A | Keep off — rarely used |
| R-130 | **Schedule › Start / Rebuild** — the ways not open yet as disabled cards with their helpers (3-34 · REG-3193) | The source picker | One grey line | C | Keep off — the line says what opens it |
| R-131 | **Schedule › Start / Rebuild** — "Picked for a HDB … Pick another if the job differs" and the longer helpers (3-34 · REG-3193) | Under the select, on the cards | Nowhere | C | Keep off — the select names the template |
| R-132 | **Tasks › Compliance** — the phase chips with their to-do counts (3-29 · REG-3194) | A chip row | A "Phase" pill; counts in its menu | A | Keep off — this project's phase shows; others one press |
| R-133 | **Tasks › Compliance** — the progress line's phase help "· the phase this project is in" (3-29 · REG-3194) | Under the chips | The menu row; "(now)" on the pill | B | Keep off — "(now)" says it |
| R-134 | **Compliance (project and Navigator)** — the "ITEM" / "Rule" table heads (3-29 · 6-13 · REG-3194 · 3324) | Above each list | Nowhere | C | Keep off — a one-column head said nothing |
| R-135 | **Design › Choices** — the Group chips (By room · By milestone) (3-27 · REG-3195) | A chip row | A "Group: … ▾" pill | A | Keep off — rarely changed; the pill says it |
| R-136 | **Design › Choices** — "Choose with {client}" (3-27 · REG-3195) | The card's band | The card's ⋮ | A | Keep off — the client picks on the portal |
| R-137 | **Design › Choices** — the room / milestone tag under its own group (3-27 · REG-3195) | Card head | Left out under that group | C | Keep off — the group heading says it |
| R-138 | **Design › Floor plan** — nine of 13 tools (Box · Arrow · Photo · Zone · Cloud · Callout · Stamp · Measure · Erase) (3-28 · REG-3196) | The tool chip row | "More tools ▾" | A | Keep off — the four everyday tools stay |
| R-139 | **Design › Floor plan** — Whose marks · Show resolved · trade layers with counts (3-28 · REG-3196) | The marks rail | One "Show: … ▾" pill | A | Keep off — the pill says the filter |
| R-140 | **Design › Floor plan** — the "Main plan" tag (3-28 · REG-3196) | Toolbar | Nowhere | C | Keep off — on your "kept off as repeats" list |
| R-141 | **Complete handover sheet** — a row's other fixes and its tab door (3-17 · REG-3197) | Beside the first verb | The row's ⋮ | A | Keep off — one verb a row |
| R-142 | **Complete handover sheet** — the margin strip when above plan (3-16 · REG-3197 · closed C-53) | Above the summary | Only below plan | C | Keep off — good news needs no warning |
| R-143 | **Projects › Workload** — "Counting 4 running projects · 1 completed left out · a person can run 4…" (3-15 · REG-3198) | The caption | The line's tooltip (touch: nothing) | B | Bring back — the filters change the loads; touch shows nothing |
| R-144 | **Projects › Workload** — "· studio default" after "1 of 4" (3-15 · REG-3198) | Each person's row | Nowhere | B | Bring back — the only sign a limit isn't the person's own |
| R-145 | **Workload › Contractors** — "Put on a site" on every free row (3-15 · REG-3198) | Each free row | Only where work waits; else the row's ⋮ | A | Keep off — the verb shows where it's needed |
| R-146 | **Workload › Contractors** — a contractor's code ("· AF") (3-15 · REG-3198) | The trades line | The vendor record (search finds it) | B | Keep off — Finance › Vendors shows it |
| R-147 | **Workload › Contractors** — "· every running site counts" (3-15 · REG-3198) | The caption | Nowhere | C | Keep off — the window pill says when |
| R-148 | **Deleted projects** — "Delete Forever" (3-47 · REG-3167) | A red link on each row | Row ⋮ › Delete forever | A | Keep off — rare and destructive |
| R-149 | **Deleted projects** — the Client column (3-47 · REG-3167) | Its own column | The number's line when the name lacks it | C | Keep off — always said |
| R-150 | **Deleted projects** — the banner and foot note (retention; hidden from reports) (3-47 · REG-3167) | Banner + note | One subtitle on Restore and who may | C | Keep off — the line says what matters |
| R-151 | **Messages (/chat)** — the Direct · Group · Studio tags and a lead's blue "Client" tag (1-21 · REG-3175) | Rows and the conversation head | One "Team" tag on internal rows | C | Keep off — on your "kept off as repeats" list |
| R-152 | **Messages (/chat)** — the project name on a client's row (1-21 · REG-3175 · closed C-53) | The row's title | "{Client} · client"; the pane and search name it | B | Keep off — search and the pane name the project |
| R-153 | **Messages (/chat)** — the head's readers line ("…read this on their page" / "…never sees it") (1-21 · REG-3175) | Conversation head | Under the composer only | C | Keep off — said where you write |
| R-154 | **Messages (/chat)** — the empty pane's help about the kinds (1-21 · REG-3175) | Under "Pick a conversation" | Nowhere | C | Keep off — the rows say who reads |
| R-155 | **A project › Client › Messages** — the "Client" tag on each client line (3-13 · REG-3176) | Thread lines | Nowhere in this client-only thread | C | Keep off — the thread is theirs alone |
| R-156 | **Issues** — the "Open" chip in the Open list (1-22 · REG-3178) | Each card | All / Closed lists and the drawer | C | Keep off — the scope says Open |
| R-157 | **Issues (/tickets)** — the project number on a card (1-22 · REG-3178) | The second line | The drawer's Project row | B | Keep off — the name identifies it |
| R-158 | **Issues** — who reported it, with "(studio)" (1-22 · REG-3178) | The second line | The drawer's "Reported by … on …" | B | Keep off — the drawer's first line |
| R-159 | **Client portal (desk)** — Choices · Designs · Floor plan · Messages · Issues · About · Files links (3-36 · REG-3179) | The top bar | The bar's "More ▾" (with counts) | A | Keep off — matches the phone's dock |
| R-160 | **Portal › Schedule** — the invoices sent, under All (3-52 · REG-3184) | Among the milestones | Under the Payments chip only | B | Keep off — each milestone's payment line says it |
| R-161 | **Portal › Choices** — a choice's state tag (3-48 · REG-3185) | Under its title | The studio's preview only | C | Keep off — on your "kept off as repeats" list |
| R-162 | **Portal › Schedule** — "You are here" while two milestones run (3-52 · REG-3184 · closed C-53) | The first running one | On no row | B | Keep off — closed C-53 |
| R-163 | **Client portal panel** — "Not invited yet" beside the "Not invited" chip (2-40 · REG-3187) | The person line | The chip alone | C | Keep off — the chip says it |

## Quotes, contracts, templates, Price book

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-164 | **Quote editor › Items toolbar** — Undo · Redo (4-03 · REG-3207) | Toolbar, desk | Items ⋮'s first rows (⌘Z unchanged) | A | Bring back — the mock's toolbar (1260:31210) |
| R-165 | **Items toolbar** — Column settings (tune) (4-03 · REG-3207) | Toolbar | Items ⋮ | A | Bring back — every table's tune sits in its toolbar (REG-454) |
| R-166 | **Items toolbar** — Row density (4-03 · REG-3207) | Toolbar | Items ⋮ › Row density › | A | Keep off — set once |
| R-167 | **Items toolbar** — "View by: None ▾" (the grouping said at rest) (4-03 · REG-3207 · 3224) | Toolbar | Items ⋮ › View by › | A | Bring back — the mock's control |
| R-168 | **Items toolbar** — "Expand All / Collapse All" (4-03 · REG-3207) | Toolbar | Items ⋮ | A | Bring back — a long quote folds often |
| R-169 | **Items toolbar** — Full screen (expand) icon (4-03 · REG-3207) | Toolbar's last control | Items ⋮ › Full screen | A | Bring back — your own placement (REG-458) |
| R-170 | **Items toolbar** — the "Maison AI" button (4-03 · REG-3207) | Toolbar, desk | The page's Maison AI button and the Create strip's tile (REG-3417) | A | Keep off — two doors are at rest already |
| R-171 | **Items table** — the "Price book" link in the Add Item row (4-03 · REG-3207) | Under the table | Create ▾, each section's foot, Add item ›, the strip's tile | A | Bring back — the mock's link, your name for it (REG-662) |
| R-172 | **Totals** — "Round Prices" beside Total (4-29 · REG-3211) | Totals card, desk | Items ⋮ › Round prices… (touch keeps it) | A | Bring back — the mock's link, by the figure it rounds |
| R-173 | **Totals** — the Additional Discount row (4-29 · REG-3211) | Always | While it holds a value; else "+ Add a discount" | A | Keep off — the same job, with a name |
| R-174 | **Totals** — "Discount · S$0.00" (4-29 · REG-3211) | Always | Once a line has a discount | C | Keep off — a zero said nothing |
| R-175 | **Items table** — the Discount and GST (%) columns on a new quote (4-02 · REG-3222 · C-56) | Default columns | Off; each returns when a line uses it | B | Keep off — they return on their own |
| R-176 | **Items table** — a child line's eye at rest (4-12 · REG-3209) | Every child line | On hover / focus at a desk | A | Bring back — the mock's eye; visibility at a glance |
| R-177 | **Items table** — the "Section" / "Sub-section" tag (4-12 · REG-3209) | Every section row | Nowhere (band, fold, count) | C | Bring back — REG-567's tag; it told the two apart |
| R-178 | **Items row ⋮** — Highlight › · No number · Words on this line… · Section note… · Add section / sub-section · Add item › · Move item › · Copy name · Show full content (4-07 · W-157 · REG-3210) | The ⋮'s top level | Row ⋮ › More › | A | Keep off — occasional; the + and drag do add / move |
| R-179 | **Items row ⋮** — Save to My Items · Update the item · Save as a new item (4-07 · REG-3210) | Top level | Row ⋮ › Price book › | A | Keep off — one named level |
| R-180 | **Items section ⋮** — Print as one line · Label the sub-total… · Remove the label · Price after the contract (4-07 · REG-3210) | Top level | Section ⋮ › Print as › | A | Keep off — print choices together |
| R-181 | **Items › By trade** — "· n · share of the subtotal" (4-01 · REG-3208) | The breakdown's head | "By trade" alone | B | Bring back — a Designer sees bare % with no meaning |
| R-182 | **Items › sum row** — the Qty and Unit price sums (4-44 · REG-3211) | At rest | Blank unless one unit | B | Keep off — mixed units made no number |
| R-183 | **Quote editor header** — the Comments icon (4-03 · REG-3206) | Header, desk | Header ⋮ › Comments | A | Bring back — the mock's header button (1261:35488) |
| R-184 | **Quote editor header** — the Client view eye (4-03 · REG-3206) | Header, desk | Header ⋮'s first row | A | Keep off — not the mock's |
| R-185 | **Quote editor header** — the status as a tag (4-11 · REG-3206) | Title row | The status pill alone | C | Keep off — the pill says it |
| R-186 | **Template card** — "Edit template" (4-10 · REG-3213) | General info | Header ⋮ › Edit template | A | Keep off — named once in the ⋮ |
| R-187 | **Template card** — "Save as new template" (4-10 · REG-3213) | General info | Header ⋮ (it was there too) | C | Keep off — a true twin |
| R-188 | **Template card** — the defaults line "By trade › room · 10/30/30/30 · Valid 30 days…" and "Starts with …" (4-10 · REG-3213) | The card | The template's Quote settings tab | C | Keep off — each value shows in its section |
| R-189 | **Quote editor (variation order)** — the Template card (4-52 · REG-3213) | General info | Nowhere in the editor; the Preview's picker | A | Keep off — a VO rarely changes paper |
| R-190 | **Quote editor (signed)** — the Template card's "Change" (4-10 · REG-3213) | The card | Nowhere in the editor (the Preview still allows it — see the intro) | A | Keep off — and close the Preview's gap |
| R-191 | **Variation order bar** — the contract's figure today, the project number, "An omission is a line with a minus quantity" (4-52 · REG-3214) | The bar, desk | An info tooltip (touch: nothing) | B | Bring back — the omission rule is how a VO is written |
| R-192 | **Mark as sent** — one press (4-22 · REG-3215) | Send ▾ row | Then a confirm "Mark OM-… as sent?" | A | Keep off — the confirm you approved |
| R-193 | **Mark as sent** — "Move to Quote Sent" in the snackbar (4-22 · REG-3215 · closed C-58) | The snackbar | The editor's sent banner and the lead's stage pill; from the Preview, nowhere | A | Bring back — every other send's snackbar still offers it |
| R-194 | **Comments drawer** — "0 Comments" and "Comment on a line from its ⋯ menu…" (4-49 · REG-3216) | Empty head | "No comments yet — pick an item below." | C | Keep off — Comment is a top-level ⋮ row |
| R-195 | **Quote screen (phone, tablet)** — "16 lines" in the document's head (4-28 · REG-3220) | Reading cards' head | The hero above | C | Keep off — the hero counts them |
| R-196 | **Tools › Quotes · a lead's Quotes** — the hover "View" button (4-46 · REG-3202) | Row hover, desk | The title opens; ⋮ › Open on touch | C | Bring back — the mock's hover (910:36644) |
| R-197 | **Tools › Quotes · a lead's Quotes** — the follow-up add on an empty cell (4-12 · 4-13 · REG-3202) | At rest, desk and tablet | On hover at a desk; none on Confirmed / Signed | A | Bring back at rest — the mock's calendar_add_on (910:36324) |
| R-198 | **Tools › Quotes · a lead's Quotes** — "· Shared" / "· Private" under the number (4-15 · REG-3202) | Every row | A lock + tooltip on Private only | B | Bring back — the mock's line (910:36324); the lock is hover-only |
| R-199 | **Tools › Quotes** — "All Quotes" in the toolbar (1-30 · REG-3204 · 3223) | Toolbar | A spacer; the page title says Quotes | C | Keep off — the title says it |
| R-200 | **New quote** — the starter sections' names on each template tile (4-32 · REG-3218) | Each tile | A native title; View all lists them | B | Keep off — View all lists them |
| R-201 | **New quote** — Blank quote's "The default template's settings, an empty table" (4-32 · REG-3218) | The Blank tile | "Start with an empty list" | B | Bring back — REG-580's fact: Blank takes the default's split, validity, GST |
| R-202 | **New quote** — "your 9-item price book" (2-51 · REG-3218) | Draft with Maison AI's row | No count | B | Keep off — the count didn't help the choice |
| R-203 | **Client's /quote/<token>** — the "View only" badge and "nothing to confirm or sign on this page" (4-09 · 4-34 · REG-3219) | Top bar and card | "Private link"; that it's a look only is said nowhere | B | Bring back the sentence — a client may hunt for a Confirm |
| R-204 | **Contract header** — the Automation bell, lit while on (4-18 · REG-3227) | Header, desk | Header ⋮ › Reminders…; the on state not shown | A | Keep off — set once per contract |
| R-205 | **Contract header** — the Copy signing link icon (4-18 · REG-3227) | Header, desk | Header ⋮; the Send dialog's Copy link | A | Keep off — the Send dialog is the usual way |
| R-206 | **Contract editor** — the title typed in place (4-18 · REG-3226 · C-123) | Meta row | Header ⋮ › Rename… (a dialog) | A | Bring back — as the editable header title C-123 plans |
| R-207 | **Contract template editor** — the name typed in place (4-17 · REG-3226 · C-123) | Meta row | ⋮ › Rename… | A | Bring back — with the contract's (C-123) |
| R-208 | **Contract header** — the "From template" tag (4-11 · REG-3226 · closed C-68) | Header chips, phone hero | The Activity fold; the template's card | B | Keep off — low value, one fold away |
| R-209 | **Contract header** — the "Signed {date}" tag (4-11 · REG-3226) | Header chips | The signed banner | C | Keep off — the banner says it |
| R-210 | **Signed contract** — the greyed formatting toolbar (4-18 · REG-3228) | Document bar | Hidden; Outline stays | C | Keep off — the tools did nothing |
| R-211 | **Signatures drawer** — "Place the fields where the parties sign…" (4-19 · REG-3229) | The foot note | One shorter line | C | Keep off — the rows' helpers say it |
| R-212 | **Contract Send dialog** — "The link opens for N days from when you send it." (4-20 · REG-3230) | Subtitle, desk | "How signing works" tooltip (desk) | B | Bring back — decides when to remind |
| R-213 | **Contract Send dialog** — the signing-code demo note (4-20 · REG-3230) | Subtitle, desk | "How signing works" | B | Keep off — a stand-in note |
| R-214 | **Send together** — how the client confirms (the code line) (4-20 · REG-3230) | Subtitle | A tooltip at every width (touch: nothing) | B | Bring back on touch — use the Send dialog's fold |
| R-215 | **Send dialogs** — the signing link written out (4-20 · REG-3230) | Under the message | Only when the message lacks it | C | Keep off — the message shows it |
| R-216 | **Send dialogs** — the "n characters" count (4-20 · REG-3230) | Under the message | Only past 900 | B | Keep off — matters only near WhatsApp's limit |
| R-217 | **New contract › picker** — "Start from the studio agreement" in one press (4-21 · REG-3231 · closed C-66) | The foot button | A card + Continue | A | Keep off — choose and Continue is the house dialog |
| R-218 | **New contract › picker** — "Pick a template to start the contract from." (4-21 · REG-3231) | Subtitle | The title asks it | C | Keep off — the title says it |
| R-219 | **Tools › Contracts · a lead's Contracts** — the "Signed Copy" column (4-26 · REG-3232) | Default, desk | Column settings; row ⋮ › Signed copy | A | Bring back — the mock's column, one-press open |
| R-220 | **Tools › Contracts · a lead's Contracts** — the hover "View" (4-46 · REG-3232) | Row hover | The title; ⋮ › Open on touch | C | Bring back — with the Quotes twin |
| R-221 | **A lead's Contracts, empty** — "Create contracts and share it with your clients" (2-23 · REG-3239) | Empty state | The title alone | C | Keep off — the buttons say how |
| R-222 | **Quote template editor › Items block** — a column's alignment · place · heading · width · colour (4-23 · REG-3245) | Every column card | Behind each card's chevron | A | Keep off — REG-542's simplicity rule |
| R-223 | **Quote template editor** — the first-visit hint banner (4-23 · REG-3246) | Under the top bar | The inspector's empty state | C | Keep off — the empty state says it |
| R-224 | **Quote template editor › Quote settings** — "once you publish. Quotes you already have keep their own settings; a Draft … (Apply defaults)" (W-472 · REG-3246) | The intro | "How this works" fold | B | Bring back — REG-578 put these at rest because they were missed |
| R-225 | **Template canvas and print** — a details row whose fields are empty (4-47 · REG-3257 · C-76) | Paper and canvas | Left off; the inspector lists it | B | Keep off — the print fix is right |
| R-226 | **Letter house style** — "Fax:" in the footer (4-33 · REG-3256) | New templates from the preset | Gone | B | Keep off — few keep a fax |
| R-227 | **Company › Templates galleries (Contracts · Payment / Project schedules · Tasks · T&Cs)** — "edited {when} by {who}" (4-36 · REG-3241 · C-75) | Every card's foot | The list view's columns; nowhere on a phone | B | Bring back — on a phone who changed it last shows nowhere |
| R-228 | **Company › Templates galleries** — "Not used yet" / "Not a default anywhere" (4-36 · REG-3241) | Card foot | Blank until used | C | Keep off — no line means unused |
| R-229 | **Company › Templates › Quotes** — "· A4" on each card (4-36 · REG-3241) | Card foot | The list's Paper column; nowhere on a phone | B | Keep off — nearly all are A4 |
| R-230 | **Templates › Contracts · T&Cs** — the text's first words on the card (4-36 · REG-3241) | Card meta | "n clauses"; the thumbnail | C | Keep off — the thumb draws them |
| R-231 | **Library editors (Payment / Project schedules · Tasks · T&Cs · Contracts)** — the usage tag ("Default on n…", "Used by n contracts") (4-11 · 4-17 · REG-3242 · 3243 · 3226) | The editor's header | The gallery card's usage line | B | Keep off — one home for usage |
| R-232 | **Library editors** — the count / kind repeats (split chip, "n milestones", "n steps", "Template") (4-11 · 4-17 · REG-3242 · 3243) | Header / name row | The editor's own table | C | Keep off — the table says it |
| R-233 | **Every library gallery, grid view (Templates · Price book · Visualizer · Planner)** — the "☐ Folders" head with its select-all box (4-37 · 6-20 · REG-3339 · C-117) | Above the folder cards | List view's Select all; each card keeps its tick; none on a phone | A | Keep off — rare |
| R-234 | **Brand kit** — the card helpers (logo / colours / text roles) (4-35 · REG-3254) | Under each card head | Removed | C | Keep off — on your "kept off as repeats" list |
| R-235 | **Brand kit** — "A template can still differ on its own Brand tab." (4-35 · REG-3254) | The intro | The preview's note | C | Keep off — the note carries it |
| R-236 | **Price book › Items** — the Status column ("Approved" / "Proposed by {name}") (4-12 · REG-3251 · closed C-71) | Default column | Column settings; a chip in the name cell (no proposer) | B | Bring back — REG-820 chose the column so no chip cuts the name |
| R-237 | **Price book › item dialog** — each field's helper (Unit price, Unit / Trade, Vendor, Waste, Website link, photo) (4-40 · REG-3252) | Under each field | "How the Price book works" fold | B | Keep off — every word one press away |
| R-238 | **Price book › Import** — "A header row … names the columns", "The book's own export reads back in", the vendor helper (4-40 · REG-3252) | Subtitle, dropzone, field | The same fold | B | Keep off — one press away |
| R-239 | **Price book › bulk Set trade** — "The studio's trades — Settings › Quotes & pricing." (4-01 · REG-3250) | The field's helper | The item dialog's fold | C | Keep off — "New trade…" makes one in place |

## Company, Settings, Finance, Reports

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-240 | **Company panel (rail)** — each section's help line ("People, roles and who reports to whom"…) (1-15 · 5-40 · REG-3262 · closed C-84) | Under every row | A tooltip at a desk; nowhere on a phone or touch tablet | B | Bring back — on touch it shows nowhere |
| R-241 | **Members** — the pencil "Edit details" (5-01 · REG-3259 · closed C-79) | Beside every name | Row ⋮ › Edit details; the drawer | A | Keep off — your own example |
| R-242 | **Members** — your own pencil (5-01 · REG-3259) | Your row | Your row's ⋮; the drawer | A | Keep off — Your profile opens from the studio block |
| R-243 | **Members** — "Reports to" and a Manager's "Team: …" (5-01 · REG-3259 · closed C-79) | Every row | The member's drawer only | B | Bring back as a read-only fact — the panel calls Members "who reports to whom" |
| R-244 | **Members** — the role lines "Runs the studio" · "Keeps the books" · "Looks after the leads" (5-03 · REG-3259 · code only) | Those rows | Nowhere | C | Keep off — the role names it |
| R-245 | **Members** — another member's "Open to new leads" switch (5-01 · REG-3259) | The row | The drawer; "Not taking new leads" when off | A | Keep off — the off state still shows |
| R-246 | **Members** — "Projects at once" (now Max projects) (5-01 · REG-3259) | The row | The drawer | A | Keep off — set rarely |
| R-247 | **Members** — Lead preferences summary and button (5-01 · REG-3259) | The row | The drawer | A | Keep off — rare |
| R-248 | **Members** — "Signature: not set" on others' rows (5-01 · REG-3259) | The row | The drawer | B | Keep off — only they can add it |
| R-249 | **Members** — PayNow with Add / Change (5-01 · REG-3259) | The row | The drawer › Pay | A | Keep off — set once |
| R-250 | **Members** — the "On the About page" tag (5-03 · REG-3259) | The row | The drawer | B | Keep off — the profile page says it |
| R-251 | **Members** — "Public profile" (5-01 · REG-3259) | Text button on the row | Row ⋮; the drawer | A | Keep off — one press |
| R-252 | **Members** — an invitation's Copy link · Cancel invitation (5-01 · REG-3259) | The invitation line | Row ⋮ | A | Keep off — Send again stays |
| R-253 | **Members** — Deactivate (5-01 · REG-3259) | The row | Row ⋮ | A | Keep off — destructive, rare |
| R-254 | **Members** — the card title "People and roles" (5-02 · REG-3260) | Card head | aria-label only | C | Keep off — it repeated the page |
| R-255 | **Members** — the roles paragraph (Owners, Admins, Managers, Accounting) (5-02 · REG-3260) | Card head | Settings › Roles & access › See the list | B | Keep off — the rules' home |
| R-256 | **Lead preferences dialog** — what "Must match" and "Nice to have" do (5-31 · REG-3261 · code only) | Dialog head | Nowhere | B | Bring back behind a fold — said nowhere now |
| R-257 | **Lead preferences dialog** — "This category won't affect lead matching…" ×4 (5-31 · REG-3261) | Each row on Don't care | Nowhere | C | Keep off — "Any" says it |
| R-258 | **Lead preferences dialog** — "n of 4 categories configured" (5-31 · REG-3261) | The foot | Screen reader only | C | Keep off — the rows show it |
| R-259 | **Company › Profile** — Issuing entities, Registrations (with Listed on Qanvast) and About page on one page (5-36 · REG-3263 · closed C-80) | One page | Each its own tab (old #addresses land) | A | Keep off — tabs are the house pattern |
| R-260 | **Company › Profile** — the Brand kit door card with its line (5-36 · REG-3263) | The page's foot | A link in Company details' help | C | Keep off — the link opens it |
| R-261 | **Company › Profile** — the field codes in the helpers ({studio_name}, {studio_social}…) (5-35 · REG-3264) | Field helpers | The template editor's Insert field | B | Keep off — codes belong to the editor |
| R-262 | **Company › Integrations and Profile › Registrations** — "Simulated on this prototype — …" lines (5-16 · REG-3265 · C-81 · C-119) | A line under each card | A Demo chip's tooltip (touch: nothing) | B | Keep off — stand-ins; but make the chip answer a tap |
| R-263 | **Integrations › Webhooks** — the three steps and the JSON field list (5-15 · REG-3266) | On the card | "For your developer" fold | B | Keep off — developer detail |
| R-264 | **Integrations › Webhooks** — Simulate a POST · Regenerate · Revoke (5-15 · REG-3266) | Text buttons | The link's ⋮ | A | Keep off — rare |
| R-265 | **Company › Questionnaire** — the long help (5-30 · REG-3267) | Card head | "How this works" fold | B | Keep off — one press, words kept |
| R-266 | **Questionnaire · Settings › Custom fields** — Move up · Move down · Edit · Delete icons (5-30 · REG-3338 · closed C-115) | Every row | Row ⋮; drag still reorders | A | Keep off — decided C-115 |
| R-267 | **Client portal › Set up** — the Privacy step's PDPA reason (5-37 · REG-3268) | The step | "Not linked yet."; the card it opens says it | C | Keep off — said once |
| R-268 | **Client portal › Set up › Clients card** — when each client opened or was withdrawn (5-42 · REG-3187) | The access chip | Nowhere on the card | B | Bring back as a caption — who looked lately |
| R-269 | **Client portal › Clients table** — the withdrawn day (5-42 · REG-3187) | The Access chip | The client panel's line only | B | Keep off — rare |
| R-270 | **Finance › Needs your attention** — the chip counts ("All · 18", "Approvals · 4") (5-08 · REG-3284) | The chips | Nowhere on the chips | B | Bring back — the same call as Vendors' counts (REG-3418) |
| R-271 | **Finance › Needs your attention** — Column settings for each of the five tables (5-08 · REG-3284 · closed C-96) | Each table's tune | Nowhere (rows, no tables) | A | Keep off — no table to set |
| R-272 | **Finance › Needs your attention** — Confirm / Check a payment in one press (REG-3285) | The row's verb | Then a confirm | A | Keep off — the confirm you approved |
| R-273 | **Finance › Client payments** — "Open" in Next step (5-11 · REG-3286) | Each row | Row ⋮; the number opens it | C | Keep off — the number does it |
| R-274 | **Finance › Client payments** — "View receipt" (5-11 · REG-3286) | Confirmed rows | Row ⋮; the receipt number | C | Keep off — the number does it |
| R-275 | **Finance › Client payments** — Send · Confirm · Remind for Designers (C-93) | Each row (refused) | Not shown | C | Keep off — they could only meet a refusal |
| R-276 | **Finance › Client payments** — each kind's rule ("a stage's Draft joins once its milestone is reached"…) (5-11 · REG-3286) | The list's help | "How this works" tooltip (touch: nothing) | B | Bring back as the house fold |
| R-277 | **Finance › Client payments (phone)** — an invoice card's status line (sent-back reason, "For an Owner or an Admin", "S$x to confirm", "credited"), Paid and "sent {day}" (5-10 · REG-3288 · code only) | The phone card | Nowhere on a phone | B | Bring back the status line — it is the next step |
| R-278 | **Finance › Costs (phone)** — a supplier bill's Issued date (5-10 · REG-3288 · code only) | The phone card | Nowhere on a phone | B | Keep off — Due is the date that acts |
| R-279 | **Finance › Vendors** — a contractor's code and "works on site" (5-43 · REG-3289) | The row's caption | The vendor's panel | B | Keep off — the panel holds it |
| R-280 | **Finance › Vendors** — the Status column and the Inactive / All chips (5-27 · REG-3289 · closed C-97) | Always | Only while a vendor is inactive | C | Keep off — they'd list nothing |
| R-281 | **Finance › Commission** — a project line's "Pay" (5-12 · REG-3286) | Each line | Its ⋮ › Pay this project | A | Keep off — the member's Pay is the common one |
| R-282 | **Finance › Commission** — a rate request's "Decline" (5-12 · REG-3286) | The row | Row ⋮; Approve reads "Answer" | A | Keep off — Answer's dialog does both |
| R-283 | **Finance › Commission** — the rate rule (which rate applies, before GST) (5-39 · REG-3289) | By member's help | "How this works" tooltip (touch: nothing) | B | Bring back as the house fold |
| R-284 | **Finance › Commission** — "A reversed payment stays on the record and counts for nothing." (W-099 · REG-3289) | Commission paid's help | Nowhere | C | Keep off — the row says Reversed |
| R-285 | **Settings › Finance** — the Purchase order paper card (5-34 · REG-3271) | Under Money out | Printed papers › Purchase order chip | A | Keep off — set once |
| R-286 | **Settings › Finance** — "How a client pays … are kept on Profile; the payment schedules … in Templates" (5-17 · REG-3271 · 3275) | Under the module head | A door's tooltip at the module's end (touch: nothing) | B | Bring back — says where bank, PayNow and GST went |
| R-287 | **Settings › Finance** — "POs are numbered under Document numbers" / "Invoice numbers are set under…" (5-34 · REG-3280) | Two helpers | Nowhere | C | Keep off — the card is on the same page |
| R-288 | **Settings › Finance** — Document numbers' rules (prefix, padding, the year) (5-34 · REG-3280) | The card's help | "How numbers work" fold | B | Keep off — one press, words kept |
| R-289 | **Settings lists (sources, reasons, trades, units, expense categories)** — "Not set yet — these are the defaults." (W-281 · REG-3278 · 3280 · code only) | Each list's help | Nowhere | B | Keep off — it read as an error |
| R-290 | **Settings › Roles & access** — Who may do what (≈120 actions × six roles) (5-04 · REG-3273 · closed C-86) | On the page | See the list → a drawer | B | Keep off — an 8,000 px page; decided |
| R-291 | **Settings › Roles & access** — what Who sees leads covers ("contracts … X-Ray readings, and its row in Qanvast Ops") (W-534 · code only) | The card's help | "Who can see a lead, and its project, quotes and files." | B | Bring back the reach — said nowhere now |
| R-292 | **Settings (every module)** — "Your own details, signature and notifications: Your profile" (5-17 · REG-3275 · closed C-89) | Under each module's title | The Related line at the module's end | A | Bring back near the head — S46C's door for 1.0 users |
| R-293 | **Settings (every module)** — the "Kept in Company:" doors with icons (5-17 · REG-3275 · closed C-89) | Under each title | The Related line at the end | A | Keep off — every door kept |
| R-294 | **Settings (Lead management · Projects · Roles & access)** — the pointer paragraphs (5-17 · REG-3275) | Under the heads | Doors' tooltips (touch: nothing) | C | Keep off — the doors' names say where |
| R-295 | **Settings (every module)** — the module's H2 title (5-17 · REG-3275) | Above the module | Screen reader only | C | Keep off — the tab names it |
| R-296 | **Studio notifications** — the Message wording card (every event's WhatsApp and Email words) (5-05 · REG-3274 · closed C-85) | On the page | Each row's Edit wording → a drawer | B | Keep off — the page was 26,000 px |
| R-297 | **Studio notifications** — the channel rule ("email and WhatsApp go out with them … listed under Sent messages") (W-432 · REG-3274) | The help | A switch's tooltip; the Sent messages door | B | Keep off — the door carries it |
| R-298 | **Reports (Leads · Meetings · Studio health · Projects)** — the range chips (5-19 · REG-3291) | The bar | A "Period: … ▾" pill | A | Keep off — one look on every report |
| R-299 | **Reports (Leads · Sales · Meetings · Health · Projects)** — the foot notes (5-09 · 5-21 · REG-3293) | Paragraphs | "How these are counted" fold | B | Keep off — one press, works on touch |
| R-300 | **Reports › Leads** — the Response time · Sales chips (5-20 · REG-3291) | Above the range | "Report: … ▾" pill | A | Keep off — the Dashboard's Sales tile opens it too |
| R-301 | **Reports › Leads** — "Filtering on lead created date · n leads in range" (5-19 · REG-3292) | Beside Export | The pill's tooltip (touch: nothing) | B | Bring back the count — shown nowhere else |
| R-302 | **Reports › Leads** — each tile's average ("avg 52m") (5-09 · REG-3294) | The tile's help | The figure's tooltip (touch: nothing) | B | Bring back in the caption |
| R-303 | **Reports › Sales** — By source's rows with no win (5-21 · REG-3295) | The table | "Show n more sources…" | B | Keep off — zero rows |
| R-304 | **Reports › Sales** — Over time's table (5-21 · REG-3295 · closed C-100) | Under the chart | "Show the table" | B | Keep off — decided |
| R-305 | **Reports › Sales** — Going quiet by member (5-21 · REG-3295) | Its own section | The section's By member view | B | Keep off — the switch names both |
| R-306 | **Reports › Meetings** — "Filtering on meeting date · n meetings held in range" (5-19 · REG-3292) | Beside Export | The pill's tooltip | C | Keep off — the Meetings held tile counts them |
| R-307 | **Reports › Meetings** — the coaching line's "best: n%" (W-649 · C-121) | The coaching tip | Nowhere; By member lists every share | C | Keep off — the table beside it |
| R-308 | **Reports › Studio health** — 11 of 15 tiles (5-22 · REG-3296 · closed C-99) | Four groups | "Show all figures" (not remembered) | B | Keep off — decided |
| R-309 | **Reports › Studio health** — "Filtering on the day each thing was done" (5-19 · REG-3292) | Beside Export | The pill's tooltip | C | Keep off — How these are counted says it |
| R-310 | **Reports › Projects** — "Your team's projects · Filtering on start and completion dates · n projects in range" (R-B3-1 · REG-3292) | Beside Export | The pill's tooltip (touch: nothing) | B | Bring back — a Manager no longer sees it's his team's only |
| R-311 | **Reports › Projects** — the Project length average ("avg 120 days") (5-09 · REG-3172) | The tile's help | The figure's tooltip (touch: nothing) | B | Bring back in the caption, as the Leads tiles |
| R-312 | **Reports › Finance** — the ten report chips (5-20 · REG-3291 · closed C-98) | The bar, desk and tablet | "Report: … ▾" pill | A | Keep off — decided |
| R-313 | **Reports › Profitability** — the method ("Weighted by contract value · early estimates left out"…) (5-07 · REG-3298 · C-01) | The tiles' help | The values' tooltips (touch: nothing) | B | Bring back as "How these are counted" |
| R-314 | **Plan & AI credits › Usage** — members with no AI use and no limit (5-38 · REG-3301) | Rows | "n members haven't used AI this month" | B | Keep off — rows of zeros |
| R-315 | **Plan & AI credits › Usage** — the Status column (5-38 · REG-3301) | Always | Only while someone has one | C | Keep off — an all-dash column |
| R-316 | **Plan & billing** — "(demo)" after the card (5-16 · REG-3302) | The payment line | Nowhere | C | Keep off — stand-in |
| R-317 | **Plan & billing** — "Paid through Dodo Payments…" (5-16 · REG-3302) | Under the card | Update card's tooltip (Owners) | B | Keep off — a stand-in note |

## Tools & website

The website (`/site`) only had words renamed, so it has no rows. These had no calm-build change at all: the client's `/renders`
and `/space` links, the developers' bench, and `components/site` / `app/site`. Shared pieces carry some rows below onto the
website's `/site/try` trials (the X-Ray cards, the Visualizer's picker and panels).

| # | What was removed | Where it was | Where it is now | Class | Recommend |
|---|---|---|---|---|---|
| R-318 | **Marketplace** — the view counts "Brands · 12" / "Deals · 8" (6-01 · REG-3303) | The toolbar chips | Nowhere (the house Tabs, no counts) | B | Bring back — as Vendors' counts came back (REG-3418) |
| R-319 | **Marketplace** — the category chips with counts (6-01 · 6-27 · REG-3303) | A chip rail | "Category: All ▾" pill, no counts | A | Keep off — but put the counts in its rows |
| R-320 | **Marketplace** — the "Featured" badge on a brand card (6-01 · REG-3304) | The card's photo | The brand page's chip only | B | Bring back — 1.0's BrandCard badge |
| R-321 | **Marketplace** — the first deal's title as a ribbon (6-01 · REG-3304) | The card's photo | "n deals" badge (still opens it) | B | Keep off — the badge still opens it |
| R-322 | **Marketplace** — a brand's review count (6-01 · REG-3304) | The card's foot | The brand page's About | B | Bring back — "Most reviews" sorts by a count you can't see |
| R-323 | **Marketplace** — a vendor brand's categories (6-01 · REG-3304 · code only) | The card's meta | "✓ In your vendors"; the brand page | B | Keep off — the Category pill finds it |
| R-324 | **Marketplace** — the tagline as the card's foot fallback (6-01 · REG-3304 · code only) | Rare cards | The brand page | B | Keep off — a rare fallback |
| R-325 | **Marketplace** — "Brands and deals come from Qanvast's partners…" (W-125 · REG-3304) | A line under the list | The title's info glyph (answers a tap) | B | Keep off — a disclaimer |
| R-326 | **Marketplace** — the drawn monogram logos (6-01 · C-110) | The cards and About | Not drawn | C | Keep off — a stand-in |
| R-327 | **Brand page** — "· n" after the Deals · Products · Questions heads (6-11 · REG-3305) | Card heads | Nowhere | C | Keep off — the items are listed |
| R-328 | **Brand page** — "Not in your vendors yet" (6-11 · REG-3305) | The About card | "Add to my vendors" says it | C | Keep off — the button says it |
| R-329 | **Brand page** — the brand's name on its own deal cards (6-11 · REG-3305) | Each deal card | Nowhere on this page | C | Keep off — it's the page's title |
| R-330 | **Deal dialog** — the date chip ("Until 31 Dec") (6-24 · REG-3306) | The chip row | In the deal's last week only; the "Runs …" line | C | Keep off — the line says the dates |
| R-331 | **Add to Price book** — "It joins My Items with its words, picture and page" (6-25 · REG-3307) | Subtitle | "{brand} becomes its vendor…" | C | Keep off — the fields show it |
| R-332 | **Market Insights** — the category chips with counts (6-12 · 6-27 · REG-3308) | A chip rail | "Category: All ▾" pill, no counts | A | Keep off — but put the counts in its rows |
| R-333 | **Market Insights** — "· Sample" on each card (6-12 · REG-3308) | Every card | The list's and the article's notes | C | Keep off — said once above |
| R-334 | **Market Insights** — "Articles come from OpenMaison's editors." (W-114 · REG-3308) | A line | The title's info glyph | B | Keep off — a source note |
| R-335 | **Market Insights › article** — the title in the sticky header (6-34 · C-116) | The header, in view while reading | The h1 below, which scrolls away | C | Keep off — the h1 names it |
| R-336 | **AI Visualizer home** — the intro card's three steps (6-10 · REG-3311) | Above the gallery | "How it works" → a Drawer; the first run keeps its welcome | B | Keep off — one press |
| R-337 | **AI Visualizer home** — a card's lead stage and project number (6-21 · 6-32 · REG-3315) | Every card's meta | The list view's Kind column; nowhere on a phone | B | Bring back — on a phone they show nowhere |
| R-338 | **AI Visualizer home** — a card's room names (6-21 · REG-3315) | The card's usage line | The design's page | B | Keep off — the count stays |
| R-339 | **AI Visualizer editor** — "Makes 1 version · Fast · n AI credits · n left after" (6-04 · REG-3309) | Under Generate, desk | The tune button's tooltip and its open head | B | Keep off — the price stays on Generate |
| R-340 | **AI Visualizer editor** — the design's kind chip ("LEAD · MET", "PROJECT · P-…") (6-08 · REG-3315 · closed C-111) | Beside the name | The name's tooltip (touch: nothing) | B | Keep off — the name and Back name the client |
| R-341 | **AI Visualizer editor (and the trial)** — "Missed one? Draw it on the photo, or add it by name…" (6-04 · REG-3309) | The Surfaces panel's foot | The pencil's and +'s tooltips | C | Keep off — Whole room's hint says it |
| R-342 | **AI Visualizer editor** — the "By hand" head (6-17 · REG-3312) | The Tools panel | Nowhere | C | Keep off — the button names itself |
| R-343 | **AI Visualizer editor** — "describe a change in the box above Generate" (6-17 · REG-3312) | The panel's sub | Nowhere | C | Keep off — the box is in view |
| R-344 | **Material picker (Visualizer, Planner Finishes, the trial)** — the category chips (6-31 · REG-3330 · closed C-107) | A chip row | "Category: All ▾" pill | A | Keep off — the section heads name them |
| R-345 | **AI Visualizer editor** — the on-screen version's ⋮ Share with the client… · Download (6-18 · REG-3313 · closed C-111, ↩ REG-806) | That version's ⋮ | The top bar's Share and the canvas bar's Download | C | Keep off — both in view on the bars |
| R-346 | **AI Visualizer editor (touch)** — the ⋮ on every thumbnail (6-28 · REG-3317) | Every tile | The version on screen only | A | Keep off — one tap brings its ⋮ |
| R-347 | **AI Visualizer › Present** — "Everything in V3" and the desk title's descriptor (6-33 · REG-3316) | The facts column, the title | One "In V3" list with New marks | C | Keep off — nothing dropped |
| R-348 | **Quote X-Ray setup** — the intro box after the first run (6-10 · REG-3321) | Every visit until dismissed | First run only; then "How it works" → a Drawer | B | Keep off — one press |
| R-349 | **Quote X-Ray setup (and the trial)** — the captions "LEAD", "YOUR QUOTE", "THE OTHER STUDIO'S QUOTE" (6-14 · REG-3321 · 3333) | Over each field | Nowhere | C | Keep off — each is labelled already |
| R-350 | **Quote X-Ray › Recent** — the trash icon (6-15 · REG-3321) | Every row | Row ⋮ › Delete | A | Keep off — rare |
| R-351 | **Quote X-Ray › Recent** — the quote's job name in the row (6-21 · REG-3321) | Row meta | Searchable only | B | Keep off — the lead and the other studio name it |
| R-352 | **Quote X-Ray record (and the trial)** — the eyebrow "Comparing your quote (studio · OM-… · job) with…" and "Yours (Demo Studio)" (6-03 · REG-3318) | Above the headline | The crumb; the job name only in a tooltip | B | Keep off — the crumb and tiles say it |
| R-353 | **Quote X-Ray record** — the summary's footnote (how it's counted, the quote's own total) (6-03 · REG-3318) | Under the tiles | "How we counted" (opens in place) | B | Keep off — opens in place |
| R-354 | **Quote X-Ray record** — each point's evidence line (6-23 · REG-3319) | Under every point | Behind "Why" (in place) | B | Keep off — opens in place |
| R-355 | **Quote X-Ray record** — each point's own "Say it as a question" (6-23 · REG-3319 · code only) | Under every point | One toggle for all points; **one point can't be switched alone** | A | Bring back — the per-point choice is gone, not moved |
| R-356 | **Quote X-Ray record** — the "Impact: high / mild" chips on risk brands (W-214 · REG-3319) | Each risk card | Nowhere (only the order) | B | Bring back — the level now shows nowhere |
| R-357 | **Quote X-Ray record** — a brand's "Sources · …" line (6-23 · REG-3319) | Under each brand | Behind "Sources" (in place) | B | Keep off — opens in place |
| R-358 | **Quote X-Ray › Item by item** — the legend (6-05 · REG-3320 · closed C-112) | Table head, desk | Nowhere; the Status chip | C | Keep off — on your "kept off as repeats" list |
| R-359 | **Quote X-Ray › Item by item** — the row's left status bar (6-05 · REG-3320 · closed C-112, ↩ REG-871) | Every row | Nowhere; the Status chip | C | Keep off — on your "kept off as repeats" list |
| R-360 | **Quote X-Ray record** — the "24 items compared" header chip (6-08 · REG-3320) | Header chips | Item by item's head | C | Keep off — a true repeat |
| R-361 | **Compliance Navigator** — the intro's "The steps carry {legal name} and UEN…" (6-02 · REG-3323) | Under the tabs | "2 of 5 done · Recorded in Company › Profile" | C | Keep off — the steps print them |
| R-362 | **Compliance Navigator** — "Record in Company › Profile" on every card (6-02 · REG-3323 · closed C-109) | The card | The card's ⋮ › Record as done | A | Keep off — the page's link opens the same place |
| R-363 | **Compliance Navigator** — "+ Add a note" (6-02 · REG-3323) | Every card | The card's ⋮ | A | Keep off — rare |
| R-364 | **Compliance Navigator** — the rest of each step's "about" (6-02 · REG-3323) | Every card | Inside the opened steps | B | Keep off — opens with the steps |
| R-365 | **Compliance Navigator** — the agency tag (HDB, CaseTrust, BCA…) (6-02 · REG-3323 · closed C-109) | Card head | Nowhere; the title names it | C | Keep off — on your "kept off as repeats" list |
| R-366 | **Navigator › Rules by home** — the head "Rules for an HDB flat" (6-13 · REG-3324) | A toolbar row | The picked chip | C | Keep off — the chip names it |
| R-367 | **Navigator › Rules by home** — "…on its Compliance tab" (6-13 · REG-3324) | The count line | "Each project ticks its own." | C | Keep off — a trim |
| R-368 | **3D Space Planner** — New ▾ "From an example…" (6-30 · REG-3325) | New ▾ | New ▾ › From a ready-made flat… › Furnished examples tab | A | Keep off — one picker; first run keeps them |
| R-369 | **3D Space Planner › New layout** — My templates above the flats (6-30 · REG-3325 · closed C-105) | The dialog's top | Its own tab; opens on Flats | A | Bring back — open on My templates when the studio has some |
| R-370 | **3D Space Planner home** — a layout card's project number (6-21 · REG-3326 · C-106) | Card meta | The list's Project no. column; nowhere on a phone | B | Bring back — on a phone it shows nowhere |
| R-371 | **3D Space Planner home** — "by {member}" on a card (6-21 · REG-3326) | Card foot | The list's Updated by; nowhere on a phone | B | Bring back — the Visualizer's cards keep it |
| R-372 | **3D Space Planner home** — "n pieces" / "No furniture yet" (6-21 · REG-3326) | Card foot | The list's Furniture column | B | Keep off — minor |
| R-373 | **3D Space Planner home (and every gallery without folders)** — the count in the title ("5 layouts") (W-466) | The bar's title | "Layouts"; the count in the pill's menu | B | Keep off — the grid shows them |
| R-374 | **3D Space Planner editor** — whose the layout is ("P-2026-002 · Benjamin Han", "Personal") (6-16 · REG-3327) | A chip by the title | The title's tooltip (touch: nothing) | B | Bring back — a layout's name doesn't say whose |
| R-375 | **3D Space Planner editor** — "Shared" on Share at ≤1024 (W-369 · REG-3327 · code only) | The button's label | Only the link icon and a tooltip | B | Bring back — on a tablet the shared state is just an icon |
| R-376 | **Planner › Finishes (3D / Walk)** — the swatches on the room chips (6-31 · REG-3330 · closed C-108) | The panel | The stage's room strip (no swatches) | B | Keep off — Top keeps them |
| R-377 | **Planner › Rooms** — "Take it away" (remove the floor plan underneath) (6-16 · REG-3328) | A link in the card | The card's ⋮ › Remove floor plan | A | Keep off — rare and destructive |
| R-378 | **Floorplan to 3D** — "On the prototype, your own plan is straightened but not drawn in 3D…" (6-22 · REG-3332 · closed C-102, ↩ REG-3073) | Under the drop box (REG-3073; same commit, never on screen at 83d7) | The header's info glyph (answers a tap) | B | Bring back — REG-3073 put it there so the dead end is no surprise |
| R-379 | **Floorplan to 3D (done)** — the sample's name and "made ahead with the image model the live app uses" (6-22 · REG-3332) | Under a sample's view | "Sample plan — ready-made views" | B | Keep off — prototype talk |

## Totals

| Module | Rows | A | B | C | Recommended back |
|---|---|---|---|---|---|
| Shell & Dashboard | R-01…R-27 | 11 | 7 | 9 | 6 |
| Leads | R-28…R-88 | 14 | 19 | 28 | 15 |
| Tasks | R-89…R-101 | 5 | 2 | 6 | 2 |
| Projects & the client portal | R-102…R-163 | 21 | 19 | 22 | 12 |
| Quotes, contracts, templates, Price book | R-164…R-239 | 30 | 23 | 23 | 27 |
| Company, Settings, Finance, Reports | R-240…R-317 | 22 | 37 | 19 | 16 |
| Tools & website | R-318…R-379 | 11 | 30 | 21 | 12 |
| **All** | **379** | **114** | **137** | **128** | **90** |

## Already handled (not in the list)

**Brought back after the build:**
- Tasks' "+ New task" bar under the list (REG-3412).
- The rail, dock and More counts as red dots, with Leads landing on Not opened yet, Projects on Needs your attention, and the
  Tools count back (REG-3413 · 3414).
- /tasks' approvals line (REG-3415).
- The bell's in-row Approve · Send back (REG-3416).
- The quote editor's Create strip tiles Maison AI · Price book (REG-3417).
- Finance › Vendors' chip counts (REG-3418).
- The template editor's Default · Edited since chips (REG-3419).
- The ? panel's "You use n of N here" meter (REG-3420).
- The Leads listing's docked "Review imported leads · n" bar (REG-3421).

**Kept off on your word:**
- The ✕ on Deleted leads' band.
- The import wizard's second Import history link.
