# B1 — the shell, the house pieces and your day · outcome

Lane B1 of the calm UI build (2026-10-27). Worktree `agent-aad9917786ed703e2`, on the WIP base `17135077`, uncommitted. Every change is
display words, layout, or where a control sits; no server action's logic, rule, schema, migration, repair, baseline, permission or stored
value changed. Each change carries a `(the calm UI build 2026-10-27 — the audit's <id>)` comment at its place.

## 1 · Built — per finding

| id | what was done |
|---|---|
| 1-01 | **Built.** The card is "Needs your attention". It shows five rows (four on a phone) and a "See all n" text link that opens the whole list in the house **Drawer** (`needs-all`, `needs-all-list`, `wide`; a bottom sheet on a phone) instead of growing the card in place. A row you review from the drawer closes it, and it reopens when the pane closes. A project's standing to-dos (its set-up steps, Start, a schedule to share, an update to write, a contractor to book, its compliance items) fold into **one row per project**: "{project} · n things to do · {first}" with Open, and a ⋮ that lists each folded to-do and runs its own verb (up to six; the rest are on the project's Needs your attention). Decisions and people waiting stay rows of their own (`foldStanding` in `lib/dashboard/inbox.ts`; `data-folded` / `data-folded-keys` on the row). The tabs show only when there are eight rows or more (`INBOX_TABS_FROM`). |
| 1-02 | **Built in B1's area.** The heading is "Needs your attention", the chips are All · Approvals · Clients waiting · Overdue, the counts read "n need your attention", and the empty state reads "You're all caught up". The Dashboard's ⌘K row and Finance's ⌘K row also read "Needs your attention", and "To do" still finds them. Other lanes' places are under *Requests*: Finance's landing tab (B5), the project Overview card and the Projects scope pill (B3). |
| 1-03 | **Built.** Approvals have one home, the Dashboard's Approvals tab and its Review pane. The rail's Company item and the Tools item no longer carry a number, and the Tools panel's count is grey. The Tasks page's approvals line is gone. In the bell, an approval row no longer has inline Approve / Send back buttons: pressing the row, or its ⋮ › "Review on the Dashboard", opens `/dashboard?review=<record>` with the pane open on that record. ⋮ › Send back / Decline opens the same pane with the record's own note dialog (`&back=1`). The pane answers with the record's own action, sentence and Undo, as the bell did. The Company panel's "4 approvals" grey count is B5's file (see *Requests*). |
| 1-04 | **Built.** The rail, phone dock and More sheet now share one badge-look table (`BADGE_LOOK`). A **red number** marks only Notifications (unread) and Messages (unread). **Tasks** gets a red dot while something of yours is overdue. **Issues** gets a grey dot while a client waits on the studio. Projects, Leads, Company and Tools get no mark, because their rows are on the Dashboard. The counts are still read and still said in the item's name ("Tasks (3 overdue)", "Issues (1 waiting)"). An item with no mark opens its plain list. |
| 1-05 | **Built as §2 sets it.** Rows, cards and tiles use `moneyCard` ("S$ 5,530"); the Review pane, a record panel, keeps cents (T-11). A VO that takes money off now reads "S$ 545 less" (was "−S$ 545"). Pulse's Owed / To collect caption gives one count for one fact ("3 invoices · S$ 34.2K overdue"), the same count Maison AI says. |
| 1-08 | **Built.** Titles lead with the person and the thing. Examples: "Vivien's quote expired on 29 Sep (OM-10008)", "Ryan hasn't answered variation order VO-2 — 11 days", "Michelle asks for 1 more week on Carpentry fabrication", "Sarah wants "Skirting, PVC 80 mm" in the Price book", "Call Rahul Menon — new lead", "1 lead isn't assigned", "OM-10012 is waiting for your approval" and "Save the meeting notes — Kevin". Titles made in `lib/projects/*` and `lib/finance/*` are under *Requests*. |
| 1-09 | **Built.** One verb set. Approve replaces Publish, Agree, and Review on PO / invoice rows; on those rows the verb opens the pane on its Approve. Review replaces Answer on commission and credit asks. Open replaces Revise on an expired quote. The pane's filled button repeats the row's verb, and "Approve and send" appears only when the client then sees the record. |
| 1-10 | **Built in B1's area.** The rail, phone dock and More sheet say "Issues". In ⌘K, the scope and group read Issues, the Go to row is "Issues", and the Create row is "New issue"; the old words (tickets, escalations, ticket) still find them. The G then E label reads "Go to Issues" (key and id unchanged). Maison AI answers say "issues". The route `/tickets`, its testids and keys are unchanged. The tickets page, the drawer's "Flag to the Owner" and the bell templates in B3's modules are under *Requests*. |
| 1-12 | **Kept by the contract** (Quotes and Contracts stay in Tools, no tool merges, the tools keep their product names). Wording part only: Meeting Copilot's tile help is "Every meeting, with Meeting Copilot in each". |
| 1-13 | **Kept by the contract** (Qanvast Ops and its Studios tab, the rail's order). |
| 1-14 | **Kept by the contract** (the rail's and the dock's order are the mocks'). |
| 1-16 | **Built in B1's area.** The Dashboard's switch reads "Whole studio · Just me" (keys `studio` / `mine` unchanged). Tasks' "Studio Tasks" → "General tasks" (B2) and Messages' STUDIO tag (B3) are under *Requests*. |
| 1-17 | **Built.** Pulse labels are sentences in sentence case: "Won in the last 90 days", "To collect" (§2's word, was "Owed to you"), "To pay", "Profit in October", "First reply to new leads", "Coming in the next 30 days" and "Your commission to be paid". Values read "26 hours" and "30 min" (`spanWords` / `durationWords`). Captions read "Usually 26 hours · aim for 8 hours", "overdue" (was "past due") and "2 projects still missing costs". The menu label is "Key numbers". The house StatTile label is sentence case. |
| 1-18 | **Built.** The greeting's line is "Tuesday 27 October · 5 new since Saturday". The count is said once, in the card's head; the line keeps it for a screen reader (`greeting-needs`, visually hidden). Since leaves out Market Insights articles (`SINCE_ARTICLES = false`), so in Mine an article no longer fills the greeting. The Since popover's capitals are the house `DropdownLabel`'s (B2's file, see *Requests*). |
| 1-19 | **Built.** Maison AI keeps one name and one sheet. A card's ✦ Ask button moved into the card's one ⋮ as "Ask Maison AI about this" (and on Needs your attention rows' ⋮). The sheet no longer lists "Keyboard shortcuts for this page"; the ? key, ⌘K and the bell note still open the panel, and a question that names it is still answered. The sheet's helper "Answers from your records" was dropped. The dock reads "Ask Maison AI…". The credits glyph stays (see ▲). |
| 1-20 | **Built.** The bell is for what happened. The notifications lead with no group head. What is due folds into one line at the end ("Due · 14 · Show", with its late count), `notifications-due-fold`. Each row has one date: a due row's title is the task's own words and its due day is the meta line. The channels it also went by ("Also by email and WhatsApp" · "In your daily summary") moved into the time's tooltip and are kept in the row's words for a screen reader. Approval rows open the Review pane (1-03). The footer reads "Your notification settings". |
| 1-24 | **Built.** `relativeTime` spells it out: "just now", "5 min ago", "3 hours ago", "yesterday", "4 days ago", then the house date (was "5m" · "3h" · "4d"). `displayDateTime` writes "30 Jul '26 · 12:00 PM" (a dot, never a comma, before the time). The date field shows the house date (4-16). |
| 1-26 | **Built in B1's area.** The Dashboard's tabs are the house Chips drawn as text tabs, and the Studio / Mine switch stays a SegmentedButton, which is a view switch. Tasks' Leads / Projects segment (B2's toolbar) is under *Requests*. |
| 1-28 | **Built.** On a phone, Whole studio / Just me moves into the page ⋮ as its first group, "Show" (`page-scope-studio` / `page-scope-mine`, `menuitemradio`). Cards have no ⋮ of their own: you hide a card from the page ⋮, and Maison AI is the dock. A row is title + caption with its verb at the right; the row keeps its ⋮ (see ▲). |
| 1-29 | **Built.** Your profile's cards open with one line, and their longer help sits behind a tooltip: "Printed on your quotes and contracts", "What clients see about you", "For claims and commission". Notifications read "notification(s)" (`lib/notifications/personal.ts`), and the mute line is "Nothing muted". The ghost matches. |
| 1-31 | **Built in B1's area.** `lib/dashboard/health.ts` writes "Bill AF-7781 from AquaFlow Plumbing Works" (`recordFirst`). The bill titles made in `lib/projects/money-needs.ts` are under *Requests* (B3). |
| 1-32 | **Built.** The pane's title is the record on one line, "PO-2026-008 · Stone & Tile Masonry". Its heading is "Purchase order · Benjamin Han" and its byline "From Germaine · 18 Oct · margin left on this work 23.8%". The row's verb is the pane's verb, Approve. |
| 1-33 | **Built.** The card is "Team workload". Rows read "Germaine — 2 of 3 projects · 3 active leads" and "Michelle — Full (2 of 2)", with no legend. The foot reads "Contractors: 4 free this week, 1 overbooked". |
| 1-34 | **Built.** Pipeline reads the stage list's own labels (`STAGE_LABEL`), so it says "Quote Sent", as the listing does. |
| 1-35 | **Built.** Only site-update photos show; design boards are left out. The title is "Site photos from the last 7 days" because the window stays seven days, not the calendar week (see ▲). With none, the card hides. |
| 1-36 | **Built.** The switches read "Use single keys (C, F, J, K…)" — "Arrows, Enter, Esc and ⌘ shortcuts always work" — and "Show shortcut tips" — "After you do the same thing 3 times with the mouse". The "You use n of N here" meter is removed; the tick on each used row stays. |
| 1-37 | **Built.** Go to and Create keep their own order (the better answer first) and **rise together** above any record group whose best answer is no better (was: always last). Subtitles name the place ("Every quote in the studio", "Company › Finance › Costs"). A project's **Payments** row was added, found by "money", "payments" and "billing". The scope is Members (was People). On a phone the placeholder is "Search", and a touch screen lists no Keyboard shortcuts row until a real keyboard has pressed a key (`html[data-hw-keyboard]`, the list's key foot's own rule). The old names are search words: tickets / escalations → Issues, money in → Client payments, money out → Costs, payments out → Payments made, to do → Finance · Needs your attention, insights → Lead reports, open to new leads → Take new leads. Client-conversation tags in Messages are B3's (see *Requests*). |
| 1-38 | **Built.** The studio block's second line reads "Dane · Owner" (`lib/studios/model.ts`), and the phone's avatar names the member you are signed in as. |
| 1-39 | **Built.** "Take new leads" has one home: Your profile › New leads, with the switch itself (`profile-new-leads`, `#new-leads`). It uses the same `setMyAccepting` save, refusal and Undo. The helper is "New leads can be assigned to you". The switch left the studio block's menu and the phone's You sheet. Company › Members' row is unchanged. ⌘K's row opens it and is still found by "open to new leads". |
| 1-40 | **Built.** The studio block opens on Your profile · Sign out. The demo tools (View as, Studio plan, Studios) fold under one "Demo" row at the bottom (`demo-fold`, remembered per browser in `om.viewas.demo`). More › View as still opens View as alone. |
| 1-41 | **Built in B1's area.** "notification(s)" everywhere in Your profile and the bell, and the footer reads "Your notification settings". Settings › Notifications titled "Studio notifications" is B5's (see *Requests*). |
| 1-43 | **Built.** The Maison AI button **steps aside** while the page has something under its resting place. At a desk (`data-aside="fade"`): a control, a line of words or a picture — it sinks and fades out of sight and comes back as the pointer nears its corner (within 120 px). Its own 48 box still takes a press, as it always did, so nothing under it changes hands. Under a finger (`pass`): only a filled button (X-Ray's Send to client) — it fades and lets the tap through to that button; the phone's slide-away on scroll and the lists' `--fab-clearance` do the rest. It comes back while it holds keyboard focus; ⌘J always asks. A sheet, menu or snackbar over the page doesn't count. Lists ending with `--fab-clearance` are B3's files (see *Requests*). |
| 1-44 | **Built — the house piece.** `MetaChip` takes `kind="fact"` (sentence case, additive; the default `status` keeps the DS Tag's capitals). Using it on the L2 headers is the other lanes' (see *Requests*). |
| 1-45 | **Not mine** — the Tickets ghost is `components/projects/tickets/*` (B3, see *Requests*). |
| 1-46 | **Built.** Sign-in's two demo lines are one grey box: "Demo: any 6 digits work — try dane@demostudio.sg". The field's label is "Mobile number or work email". |
| 2-07 | **Kept by the contract** (Qanvast Ops and its Studios tab). |
| 2-09 | **Built — the house piece.** `components/om/demo-note.tsx` (`DemoNote`) is one quiet "Demo" chip with the sentence in its Tooltip, for the other lanes' integration and Qanvast cards (B2 · B5, see *Requests*). |
| 2-43 | **Built.** Column settings: the pin glyph shows on a row's hover or focus (a pinned row keeps it; always on touch). The help paragraph became an ⓘ tooltip on the drawer's title. The group reads "Pinned · up to 3" in sentence case. Removing Sort from the Filters modals is the listings' lanes' work (see *Requests*). |
| 2-44 | **Built.** While a snackbar shows, the first Esc dismisses it (`useDismissNewest`, additive) and only a second Esc goes Back. |
| 3-20 | **Built in `lib/format.ts`.** One time style, "· 10:00 AM", and the date field shows "5 Nov 2026" (`fieldDateWords` / `fieldDateTimeWords`, display only — the field still holds `d/m/yyyy`). Relative times are spelled out (1-24). Using them on the project pages is B3's. |
| 3-21 | **Kept as §2 sets it** (moneyCard on rows, cards and tiles; documents keep cents). Choices' "+S$457.80 incl. GST" is B3's. |
| 3-41 | **Built — the house piece** (`MetaChip kind="fact"`, sentence-case StatTile labels, the Tools and Column settings group titles in sentence case). The cards' head capitals in other modules are under *Requests*. |
| 4-05 | **Not done.** The fix is `lib/db/demo-day.ts`'s `EMBEDDED` list, a stored-value rule; the brief forbids touching stored values and repairs. Flagged for the developers / Vicky (▲). |
| 4-16 | **Built.** The house DateField shows "7 Oct 2026" (and "7 Oct 2026 · 2:00 PM"); the picker still edits it. "Sept" is 4-43. |
| 5-16 | **Built — the house piece** (`DemoNote`). Using it on Company › Integrations and Billing is B5's (see *Requests*). |
| 5-22 | **Built in B1's area** (`lib/studio-health/model.ts` words): "AI uses", "Qanvast Hangout chats", "Members" (was "Your team") and "not active in this period". Folding the tiles is the Health page's (B5, see *Requests*). |
| 5-47 | **Built.** `sampleFieldsFor` in `lib/notifications/model.ts` gives each event kind's preview its own link (plan → Company › Plan & AI credits, price book → Price book, a task → Tasks …). Settings' preview reading it is B5's. |
| 5-48 | **Built.** One empty mark, "—" (`EMPTY` in `lib/format.ts`; `fileSize`, `spanWords`, `durationWords`). |
| 5-50 | **Built** (1-43's step aside at a desk: it fades while a row's words or controls sit under it). |
| 6-06 | **Kept by the contract** (no tool merges; 1.0's locked name). The planner's doors are B6's. |
| 6-08 | **Built — the house piece** (`MetaChip kind="fact"`). Using it in the editors' top bars is B4 / B6's. |
| 6-26 | **Kept by the contract** (Marketplace's and Market Insights' homes, the tools' names). |
| 6-28 | **Built in B1's area.** On a phone the button steps aside from a filled button under it (X-Ray's Send to client), letting the tap through. X-Ray's purple ⋮ is B6's (see *Requests*). |
| 6-29 | **Built** (`lib/site/platform.ts` · `lib/site/changelog.ts`): "Finance" (was "Finance & Margins"), "AI Visualizer and 3D Space Planner, built in", "Leads" and "Client portal" as changelog areas, "Quote X-Ray: compare a quote with another studio's, line by line", and Meeting Copilot as the app names it. |

**Touches** (the other lanes' findings that reach a B1 file):

| id | what was done |
|---|---|
| 1-06 | The Tasks page's approvals line is gone, along with its ghost (`approvals-line.tsx` kept, unused; `approvals` props kept optional). The toolbar and rows are B2's (see *Requests*). |
| 1-25 | Needs your attention writes its count once, in the head; the tabs read "Approvals 4". |
| 1-29 | See 1-29 above. |
| 1-31 | See 1-31 above. |
| 1-32 | See 1-32 above. |
| 2-15 | The rail's Leads item no longer wears a "new" count (the not-opened leads are the Dashboard's and the listing's own scope). |
| 2-22 | The house `Tabs` count is a quiet grey by default; `countTone: 'late'` (additive) keeps the DS Badge's red for what is overdue and yours. The rail as in 1-04. |
| 3-03 | Pulse reads "To collect" (§2). |
| 3-06 | The house Timeline puts the time above its sentence in a card narrower than 360 px (a container query), so a line never runs 8–12 lines in a 130 px column. |
| 3-09 | The Maison AI button steps aside (1-43). |
| 3-38 | StatTile labels are sentence case. The listing's tiles are B2's / B3's. |
| 4-11 | `MetaChip kind="fact"` (see 1-44). |
| 4-43 | `savedLabel(updatedAt, now)` in `lib/format.ts` is ONE "Saved …" label with the house months ("Saved 7 Sep '26"). Using it in the editors is B4's (see *Requests*). |
| 5-09 | "26 hours", "30 min" (`spanWords` / `durationWords`). |
| 5-41 | Studio health says “Members” (was “Your team”) in its section, its table and its export; “Issues resolved” · “Issues raised”. |
| 5-49 | `relativeTime` / `displayDateTime` / the date field (1-24, 3-20). |

**Counts:** 51 findings. **42 built** — fully, or in B1's files with the rest under *Requests*; this includes the house pieces whose use belongs to other lanes. **7 kept by the contract**, with only their wording / noise part done: 1-12 · 1-13 · 1-14 · 2-07 · 3-21 · 6-06 · 6-26. **2 not done**: 4-05 (a stored-value rule, outside a visual lane) and 1-45 (B3's file — requested). All 16 touches are done in B1's files.

## 2 · The ledger — every moved action (what · was · now)

| what | was | now |
|---|---|---|
| Approve / Send back on an approval in the bell | inline buttons on the bell's row, running the record's action there | The row's press, or its ⋮ › **Review on the Dashboard** (`notification-approve`), opens `/dashboard?review=<record>` with the Review pane on that record. ⋮ › **Send back** / **Decline** (`notification-send-back`) opens the same with `&back=1`, which shows the record's own note dialog. The pane runs the same server actions with the same Undo. |
| The approvals count on Tasks | a line "n approvals wait for you on the Dashboard · Open Dashboard" at /tasks' top (`tasks-approvals`, `tasks-approvals-door`) | gone. The approvals are the Dashboard's **Approvals** tab and its Review pane, which the bell's approval rows open. `countApprovalsWaiting` and `approvals-line.tsx` are kept. |
| Maison AI on a Dashboard card | a ✦ Ask button in each card's head (`<card>-ask`) | the card's one ⋮ › **Ask Maison AI about this** (the `<card>-ask` testid wraps that menu row; `ask-<card>` kept). On a phone, cards have no ⋮: Maison AI is the dock and a card hides from the page ⋮. |
| Hide this card on a phone | the card's own ⋮ | the page ⋮ beside the greeting › Cards on your page (`page-card-<key>`, as at a desk) |
| Whole studio / Just me on a phone | a segmented switch on its own row (`scope-switch`) | the page ⋮ › Show › Whole studio · Just me (`page-scope-studio` · `page-scope-mine`, menuitemradio). Desks and tablets keep the switch. |
| Every row of Needs your attention | "Show all n" unrolled every row inside the card | "See all n" (`needs-more`) opens the house Drawer with the tabs and every row (`needs-all`, `needs-all-list`); Review from it closes it and reopens it on the pane's close; a Since chip about a row past the first five opens it |
| The inbox's tabs (All · Approvals · Clients waiting · Overdue) | always shown | shown from eight rows (`INBOX_TABS_FROM`); under that every row is on the card |
| A project's standing to-dos on the Dashboard | one row each (set-up steps, Start, a schedule to share, an update to write, a contractor to book, compliance) | one row per project, "{project} · n things to do": **Open** opens the project; its ⋮ lists each folded to-do and runs that to-do's own verb (up to six; the rest are on the project's Needs your attention) |
| Open to new leads (your own) | the studio block's menu and the phone's You sheet (`you-accepting`) | **Your profile › New leads**, the switch itself ("Take new leads", `you-accepting` on its row, `profile-new-leads`, `#new-leads`). Same `setMyAccepting`, refusal and Undo. Company › Members' row is unchanged. ⌘K's row opens it. |
| View as · Studio plan · Studios | the studio block's menu, at its top | the same menu's **Demo** fold at the bottom (`demo-fold`, remembered per browser `om.viewas.demo`); More › View as on a phone still opens it alone |
| Keyboard shortcuts from Maison AI | a suggestion row in the Maison AI sheet | the ? key, ⌘K › Go to › Keyboard shortcuts (not on touch), the bell's one-time note. A question naming it is still answered. |
| The shortcuts meter | "You use n of N here" over the ? panel's list | gone (the tick on each used row stays) |
| Column settings' help | a paragraph over the list | an ⓘ tooltip on the drawer's title |
| The bell's Due rows | a group of their own (it led when anything was late) | one fold at the end, "Due · n · Show" (`notifications-due-fold`), its late count on that line |
| A bell row's "also by email and WhatsApp" / "in your daily summary" | a line under the row | the time's tooltip (and the row's words for a screen reader) |
| Rail counts: Projects (need attention), Leads (not opened), Company (approvals), Tools (quotes to approve) | red numbers on the rail, the dock and More; Leads and Projects landed on their scopes | no mark. The counts are still read; their rows are on the Dashboard. The items open their plain lists. |
| Rail count: Tasks (overdue) | red number | red dot; its name says the number ("Tasks (3 overdue)") |
| Rail count: Issues (waiting on the studio) | red number | grey dot; its name says the number ("Issues (1 waiting)") |
| Back by Esc while a snackbar shows | Esc went back at once | the first Esc dismisses the newest snackbar; a second goes back |
| The Maison AI button over page content | always drawn over its corner | a desk: fades while words / a control / a picture sit under it, back as the pointer nears (its 48 box still takes a press); a finger: steps aside only from a filled button, the tap going through; ⌘J always |
| The Maison AI button on a project page, on a phone | showing at the page's top | tucked at the top (as a page whose first screen is the record); back on the first scroll up / at the end |
| ⌘K Keyboard shortcuts row on touch | listed | listed once a real keyboard has pressed a key (as the list's key foot); left out on a bare touch screen |

## 3 · Words

91 rows in the work list. **70 applied** in B1's files. **8 kept by the contract** (tools' names / Qanvast Ops / Quotes in Tools): W-004 · W-018 · W-152 · W-183 · W-193 · W-255 · W-258 · W-333. **13 belong to other lanes' files** (under *Requests*): W-020 (B6) · W-260 (B5) · W-378 (B2) · W-465 · W-529 · W-557 · W-601 · W-602 · W-611 (B3) · W-475 · W-485 · W-568 · W-607 (B2). Four applied rows are only partly in B1's files; the rest is requested: W-022 (B3's money-needs), W-285 (B3's project Overview), W-631 (B5's Finance tab), W-059 (B5's cards use `DemoNote`).

Where the row offered a choice, or I changed a word:
- W-015: **To collect** — §2's word for what a client owes, over "Owed to you".
- W-291: **"Site photos from the last 7 days"** — the card's window is seven days, not the calendar week.
- W-601 (B3's): keep "says they paid" — no pronoun is on record. Only "for" drops.
- W-089: the count is dropped from sight but kept for a screen reader, so the page's first sentence still says it.

## 4 · The guard

```
node design-source/verify/ui-audit-build/guard.mjs diff $RL/guard-before.json $RL/B1/guard-after.json
✓ pages: none gone
✓ server actions a screen calls: none gone
✓ control handles (data-testid · data-kb): none gone
✓ keyboard shortcuts: none gone
  new handles: 6
```
New handles (6): `needs-all`, `needs-all-list`, `demo-fold`, `page-scope-<studio|mine>`, `notifications-due-fold`, `profile-new-leads` (the moved switch's card; the switch keeps `you-accepting`). `npx tsc --noEmit` clean. `npx eslint` on B1's folders clean, except the existing `side-scrollbar.tsx` a11y warning (not mine). `npm run design:lint`: nothing new (one file now under its allowance — `raw-type` 102 → 101; baseline left as is, never raised).

## 5 · Probes

**How they ran.** Through `heavy.sh probes`, port 3411, each run on a fresh copy of `base.db`:

| run | build | probes |
|---|---|---|
| run0 | the WIP base | every id, as the baseline |
| run2 | build5 | every id |
| run3 | build6, the final tree | every id touched since run2 |
| run4 | build6 | the two that needed a second go |

Logs are in `$RL/B1/run{0,2,3,4}/lanes/<id>/probe.log`. Every restatement is marked `(the calm UI build 2026-10-27, a deliberate change)`. No functional assertion was weakened. Where an action moved, the probe now opens the place it moved to first: the Demo fold, the Due fold, the drawer, Your profile, a card's ⋮.

| id | result | restated |
|---|---|---|
| dash-d1 | 179 ✓ · 1 ✗ (run3) | Pulse's sentence-case labels; "To collect"; "Usually 26 hours · aim for 8 hours"; Germaine's "Your commission to be paid"; the greeting's count read from its screen-reader words; Since doesn't count a Market Insights article as news (1-18); the words budget reads only what the eye sees. **The one ✗ is not B1's:** "390t: every region stands where the page's does (day +0/+24 …)" fails identically on the WIP base (run0). |
| dash-d2 | **150 ✓ · 0 ✗ (run4)** | "See all n" opens the drawer (rows read there); "Approvals" · "Clients waiting" · "Overdue"; Approve for Agree / Publish; the new titles; a narrow card's caption read without its leading amount; a folded "n things to do" row's own rule. Run3's one ✗ ("what was set aside is still a press away") was a timing flake under four slots — it passed in run2 and run4 on the same code. |
| dash-d3 | 127 ✓ · 0 ✗ (run2) · 19 ✓ · 1 ✗ (run3) | One ⋮ per card head (Ask inside it); a phone's cards carry none; "Team workload" words ("2 of 3 projects", "Full (2 of 2)", "3 active leads", "4 free this week, 1 overbooked"); the pure health words ("Bill WB-12 from Woodcraft"). Run3 started at 23:42: the probe's own late-evening branch seeds its meetings on tomorrow and stopped looking for one. Your day isn't changed by B1, and the same checks passed in run2 earlier in the evening. |
| dash-d4 | 105 ✓ · 1 ✗ (run2) | **The ✗ is not B1's:** "the meeting row's ⋮ holds Prepare me for this meeting" fails identically on the WIP base (run0). |
| dash-d5 | 53 ✓ · 0 ✗ | The bell's Due fold is opened before its rows are read; one date a row (a task's title is its own words, "Due today" its meta); the rail's counts read from the item's name (dots, no number); Company wears no count; "Issues raised"; Maison AI says "issues". |
| kb-r1 | 35 ✓ · 0 ✗ | the shortcuts panel's new switch words |
| kb-r2 | 29 ✓ · 0 ✗ | the Demo fold opened before the plan rows |
| search | 27 ✓ · 0 ✗ | — |
| view-as | 23 ✓ · 0 ✗ | the Demo fold, "Dane · Owner" |
| panel-order | 0 ✓ · 0 ✗ (as on the base) | — |
| overlays | 67 ✓ · 0 ✗ | — |
| ghosts-same | 76 ✓ · 0 ✗ (run3) | — |
| ghosts-same-390 | 76 ✓ · 0 ✗ (run3) | — |
| pm2-s01 | 81 ✓ · 0 ✗ | the Demo fold, Take new leads on Your profile |
| pm2-s10 | **107 ✓ · 0 ✗ (run4)** | the sheet's box is "Ask Maison AI" (its helper went); ⌘K's group "Members" (was People). (Run3 timed out on its first page load — the server was busy.) |
| pm2-s18 | 63 ✓ · 0 ✗ | Accounting's one-line card help; the channel words kept for a screen reader |
| pm2-s22 | 110 ✓ · 0 ✗ (run3) | Needs your attention: the drawer, the fold (a folded row counts each row it holds), the greeting's hidden count, Pulse labels |
| pm2-s30 | 109 ✓ · 0 ✗ | sign-in's "Mobile number or work email"; the menu's You group (Your profile · Sign out) |
| pm2-s43a | 43 ✓ · 0 ✗ | the Demo fold |
| pm2-s46a | 118 ✓ · 0 ✗ (run3) | ⌘K: Issues · New issue · Issue categories · Client payments · Take new leads, each found by its old words; the G hint and ? panel "Go to Issues"; the pure ranking (Payments' row doesn't outrank Client payments for "invoices") |
| rwd-w1 | 59 ✓ · 0 ✗ | ⌘K's Keyboard shortcuts row on a touch tablet: listed once a real keyboard is used |
| rwd-w6 | 68 ✓ · 0 ✗ | — |
| rwd-c2 | 129 ✓ · 0 ✗ | — |

**Other lanes' probes restated in B1's files** (`design-source/verify/**`; not in B1's run list):
- pm2-s16 §5–9 (Take new leads on Your profile)
- pm2-s46b (the rail's "Issues (n waiting)")
- cr-r1 · cr-r5 · pm2-s19 · s21 · s31 · s36 · s41b2 · s41b3 · s41b4 · s42a · s42d · s46d · pm-i: the Demo fold (`openDemo`), "Dane · Owner", "Mobile number or work email"

## 6 · Measures — before → after (the audit's `measure.cjs`, the first screen, on `base.db`)

| screen | words | controls | purple actions | filled buttons | capitals | font styles | height |
|---|---|---|---|---|---|---|---|
| /dashboard 1440 | 321 → 321 | 47 → 47 | 17 → 17 | 0 → 0 | **4 → 0** | **12 → 10** | 1579 → 1579 |
| /dashboard 390 touch (final build) | 119 → 149 | 19 → 20 | 11 → 11 | 0 → 0 | **2 → 0** | 10 → 9 | **3456 → 3118** |
| /tasks 1440 | 406 → 446 | 134 → 147 | 63 → 68 | 1 → 1 | 22 → 24 | 12 → 12 | 3283 → 3207 |
| /tasks 390 touch | 80 → 78 | 22 → 25 | 14 → 13 | 1 → 1 | 0 → 0 | 10 → 10 | 10104 → 10000 |
| /profile 1440 | **177 → 114** | 10 → 11 | 4 → 5 | 1 → 1 | 0 → 0 | 9 → 10 | 1715 → 1758 |
| /profile 390 touch | **115 → 62** | 6 → 8 | 0 → 2 | 1 → 1 | 0 → 0 | 8 → 10 | 2035 → 1946 |

How to read it:

- **Dashboard 1440.** The counts hold, but what they count changed:
  - Verbs: five different ones (Publish · Review · Approve · Approve · Agree) are now one (Approve × 5).
  - Capitals 4 → 0: Pulse's labels are sentence case.
  - "Show all 51" is "See all 41": the standing to-dos are folded, and the drawer holds the rest.
- **Dashboard 390** (re-measured on the final build). Words +30: the row titles are sentences now, e.g. "Michelle asks for 1 more week on Carpentry fabrication". Height −338: the Studio / Mine row went into the page ⋮, and the ⋮ now sits on the greeting's title line. The measure's "truncated" list counts rows that wrap, not cut words.
- **Tasks.** The approvals line went, so the first screen holds two more task rows. Its toolbar, rows and the OPEN status capitals are B2's.
- **Your profile.** Each card opens with one line (1-29), and the New leads card (the moved switch) adds a card.
- **/sign-in.** It can't be measured on this demo: the standing session lands it on the Dashboard. Its change is two small-print lines → one grey box, plus the field's label. pm2-s30 covers it.

Shots: `$RL/B1/shots/*-before.png` · `*-after.png` · `*-final.png` (the final build: `dashboard-390-final`, `maison-sheet-final`, …). They cover:
- the dashboard, tasks and profile at 1440 and 390 (+ full pages);
- the studio block menu, Tools, the bell, ⌘K, the ? panel and the Maison AI sheet at 1440.

## 7 · Requests — exact changes in files B1 doesn't own

**House pieces other lanes can use now** (all additive, from B1):

- `MetaChip kind="fact"`: sentence case, for anything that is not a status.
- `Tabs` items take `countTone: 'late'` (the DS red); without it a tab's count is now a quiet grey everywhere.
- `DemoNote` (`components/om/demo-note.tsx`): one quiet "Demo" chip, its sentence in a Tooltip.
- In `lib/format.ts`:
  - `savedLabel(updatedAt, now)` and `EMPTY` ("—").
  - `fieldDateWords` / `fieldDateTimeWords`.
  - `relativeTime` is now spelled out ("3 hours ago", "yesterday", "4 days ago").
  - `displayDateTime` writes "· 10:00 AM".
- `useDismissNewest()` (snackbar).
- `sampleFieldsFor(event)` (`lib/notifications/model.ts`).
- `reviewKeyOf` / `findInboxRow` (`lib/dashboard/inbox.ts`).

**B2 — leads**
1. `components/leads/menus.module.css:46` `.label`: drop `text-transform: uppercase` (T-06 · W-568). This is every `DropdownLabel`: the Since popover ("New since Saturday · 3 new leads, all from Hangout"), the page ⋮'s "Show", and every menu's group title.
2. Tasks (`components/leads/tasks/*`):
   - "Studio Tasks" → **"General tasks"** (1-16).
   - Drop the Leads / Projects segment; the scope pill covers it (1-06 · 1-26).
   - "Attach Files" → "Attach files" (W-485).
   - The page ⋮ reads "Save as a template · Manage templates · Export…" (W-607).
   - "Add Task" → **"New task"** (§2).
3. The lead's L2 header chips: `MetaChip kind="fact"` for the property type, the source and the scope ("HDB 4-room · Instagram"), and the tab "Notes & logs" (1-44 · 3-41).
4. The Filters modals: remove Sort; the heads sort (2-43).
5. Qanvast Ops' account / credits cards: "Simulated on this prototype — …" → `<DemoNote>` (W-378 · 2-09).
6. "Add Lead" → **"New lead"** (W-475).

**B3 — projects, portal, issues, messages**
1. `lib/projects/money-needs.ts`:
   - `` `${p.source === 'client' ? client.firstName : p.by} says they paid for ${…}` `` → "… says they paid INV-2026-002" (drop "for"; keep "they" — no pronoun is on record) (W-601).
   - `` `${money2(due)} to refund on ${c.number}` `` → `` `Refund ${money2(due)} to ${client.firstName} (${c.number})` `` with the verb "Record" (W-602).
   - Every "{company}'s bill {no}" → "Bill {no} from {company}" (1-31 · W-022).
2. `lib/projects/needs-you.ts`:
   - `'Move the schedule'` → **'Update schedule'** (W-557, lines ~272 · 362).
   - `` `${plural(n,'schedule change')} ${f.client} hasn't seen` `` → `` `Share ${plural(n,'schedule change')} with ${f.client}` `` (W-465).
   - "Nothing waits on you" → **"You're all caught up"** (W-285).
   - The project Overview card's head → **"Needs your attention"** (1-02).
   - The Projects scope pill "Needs attention" → "Needs your attention" (§2).
3. Issues:
   - The page title "Issues", "New issue", Escalate → **"Flag to the Owner"** (1-10).
   - INTERNAL NOTE → "Note · team only" (W-529).
   - The bell / Activity templates that say "ticket" → "issue".
   - The Issues ghost: the chips' own radius and the remembered row count (1-45).
4. Messages:
   - Drop the STUDIO tag (1-16).
   - Tag a client conversation "Client" (1-37).
   - "Search people, words…" → "Search messages" (W-611).
   - Lists end with `padding-bottom: var(--fab-clearance)` (1-43).
5. The project frame's chips: `MetaChip kind="fact"`. Tab counts that are overdue and yours: `countTone: 'late'` (2-22 · 3-41).
6. Choices show the same figure to both sides ("+S$457.80 incl. GST") (3-21).
7. Project pages' dates go through `relativeTime` / `displayDateTime` / `displayDate` (3-20).

**B4 — quotes, contracts, templates**
1. Use `savedLabel(updatedAt, now)` from `lib/format.ts` for every editor's "Saved …" (4-43; "7 Sep" not "7 Sept").
2. Editors' header identity / date chips: `MetaChip kind="fact"`, or plain meta (4-11 · 6-08).
3. `lib/templates/ago.ts` still writes "3h ago" / "2d ago". To match `relativeTime` (1-24), spell them out ("3 hours ago", "2 days ago"). This touches rc-c1/c4 · rq-k1 · ux-p5.

**B5 — company, settings, finance, reports**
1. `components/company/company-popover.tsx`: the approvals pill reads **"n approvals"** in grey; red only for what is overdue and yours (1-03 · T-07).
2. Finance's landing tab "To do" → **"Needs your attention"** (W-631 · 1-02); the ⌘K row already reads so, and "to do" still finds it.
3. Settings › Notifications: title **"Studio notifications"** (1-41). Its preview reads `sampleFieldsFor(event)` so a plan / price-book / task event links to its own place (5-47).
4. `lib/company/member-words.ts`: "…gets WhatsApp notices…" → "…gets WhatsApp notifications…" (1-41).
5. Company › Integrations and Billing:
   - "Simulated on this prototype — …" → `<DemoNote>` (5-16 · W-059).
   - Billing reads "Visa ending 4242 · expires 08/28" with "Update card", and drops the Dodo sentence (5-16).
6. Reports › Health: four tiles (Active members · Leads added · Quotes sent · Portal sign-ins), the rest behind "Show all figures" (5-22). The words are already in `lib/studio-health/model.ts`.
7. `lib/finance/todo.ts:218`: `` `${first(a.memberId)} asks for ${ruleWords(a)}` `` → "Michelle asks for 5% commission on Executive Condo" (W-260).
8. Reports' tiles "Owed to you" → **"To collect"**, "First response" → **"First reply to new leads"** (§2 · 1-17). The Dashboard probes accept either name.

**B6 — tools and website**
1. X-Ray's card ⋮ in the house grey (6-28).
2. The planner's "Make a 3D picture" as a door to Floorplan to 3D Isometric (W-020; the tools' names are kept by the contract).
3. `MetaChip kind="fact"` in the tools' top bars (6-08).

**For the coordinator — other lanes' probes that B1's changes touch.** I restated the two below; restate or re-run the rest:
- **pm2-s16** (§5–9, Open to new leads in the studio block / You sheet): **restated by B1**. The same functional checks — the record, nobody else's row, Undo, Space, Members' row, the roles, the widths — now run on Your profile › New leads (not run in B1's list).
- **pm2-s46b** (the rail's Tickets count): **restated by B1**. The rail says "Issues (n waiting)", with a grey dot. Its page words (New ticket, "Tickets" title) are B3's to restate with their words.
- **pm2-s46c**:
  - M3 (the Tasks approvals line) is gone by 1-03: assert its absence and the Dashboard's Approvals count instead.
  - H2 (the rail's "Leads (n new)" landing on `?scope=unseen`) is gone by 1-04: the rail's Leads is a plain link. The not-opened count is the listing's own scope (B2's "Not opened yet").
- **pj-gap-c**, **r2e**: they press `notification-approve` / `notification-send-back` expecting an in-row approval. Now these are the bell row's ⋮ rows, opening the Dashboard's Review pane (`?review=`, `&back=1`), where the pane's **Approve** / **Send back** run the same actions.
- **pj-r1** (the rail's Projects count): no mark now; the count is the Dashboard's / the Projects scope.
- **pm2-s05**, **pm2-s43b**: the DateField shows "7 Oct 2026" (it still holds `d/m/yyyy`).
- Any probe that clicks the **Maison AI button** where page content sits under its corner: Playwright's click moves the pointer there, which brings it back. One retry is normal; `document.body.dataset.omNoFabAside` turns stepping aside off.
- Rail badge counts read as text from `[class*="__badge"]` (Tasks, Issues, Leads, Projects): read the item's `aria-label` ("Tasks (3 overdue)") instead.

**B3's requests to B1 (B3/outcome.md §7) — all applied:**
- The rail's and ⌘K's Issues: "Issues (n waiting)"; New issue; the scope, group and Go to rows; **"Issue categories"** (was Ticket categories, now the card's own title). The old words still find them: "tickets", "escalations", "ticket categories", "new ticket" and "money". pm2-s46a and pm2-s46b are restated.
- The Maison AI button on a project page starts tucked on a phone (`quietTop` for `/projects/…`). Under a finger it steps aside over an open conversation (`[data-testid="project-conversation"]`).
- `EmptyState`'s `help` is optional (no empty paragraph), so B3 can drop `help={null}` in `chat-inbox.tsx` and the `p:empty` rule in `messages.module.css`.
- Already done in B1's own pass:
  - `relativeTime` "7 days ago"
  - the date field's "27 Sep 2026"
  - the Dashboard's bill line
  - Pulse's "To collect" / "To pay"
  - the Review pane's title and byline
  - "You're all caught up"
- B3's FYI: once B3's Needs words land, dash-d2's DOORS list may need "Write". That is a restatement for the landing run; B3's words are not in this tree.

## 8 · ▲ For Vicky

1. **Approving from the bell takes one more step.** It reverses simplify round 2's in-row Approve (P2 §6.7). An approval row in the bell opens the Dashboard's Review pane on that record, where Approve and Send back do exactly what they did. The bell no longer acts on its own (1-03 · 1-20: one home for approvals).
2. **Two S46C doors go (your findability round, 2026-10-19).** The audit's 1-03 and 1-04 overrule them:
   - The rail's Leads no longer wears "n new" or lands on Not opened.
   - The Tasks page's "n approvals wait for you on the Dashboard" line is gone.

   Both counts still exist: the listing's Not opened scope, and the Dashboard's Approvals tab.
3. **The Maison AI button now steps aside at a desk too.** It fades while words or a control sit under its corner (the audit's 5-50, option 2; option 1 would add right-side clearance to each list, in other lanes' files). On a dense table it is out of sight at rest. It fades back as the pointer comes toward its corner, still takes a press in its own box, shows when focused, and ⌘J always opens it. On a phone it steps aside only from a filled button (6-28). If you'd rather keep it always in sight at a desk, the change is one line (`fade` → nothing).
   - the pointer comes near its corner,
   - it is focused,
   - or you reach the page's end.

   ⌘J always opens it. If you'd rather keep it in sight, the fix is option 1.
4. **The AI credits glyph is unchanged.** 1-19 asked that the spark not also mean credits, but the ring-round-the-spark is your pick (REG-706 · REG-710).
5. **The tab counts across the app turn grey.** That is the house `Tabs`' default now (2-22). A lane opts into the red with `countTone: 'late'` only where a count is overdue and yours.
6. **On a phone, Needs your attention rows keep their ⋮.** It holds Not today, Ask Maison AI and the second verb. The proposal's long-press has no house piece and nobody would find it. The cards' own ⋮ did go (1-28).
7. **Needs your attention folds each project's standing to-dos into one "n things to do" row.** Its ⋮ runs each one (up to six). The tabs show only from eight rows (1-01). Decisions and people waiting are never folded.
8. **"Take new leads" (was Open to new leads) lives only on Your profile now**, plus the Owner's per-member switch in Members. It left the studio block's menu, reversing S16's placement (1-39).
9. **The On site card is titled "Site photos from the last 7 days", not "this week".** The window is seven rolling days.
10. **Two word picks:**
    - "To collect" on the Pulse card (§2's word; the audit's list also offered "Owed to you").
    - "says they paid" kept, since a client's pronoun isn't on record (W-601 asked for "he").
11. **4-05 is not done.** The signed contracts' date is 13 days off because `lib/db/demo-day.ts` `EMBEDDED` doesn't shift the date inside the signed body. That is a stored-value rule, outside a visual lane. A developer adds `date.contract` to `EMBEDDED`, or re-runs the snapshot after a restore.
12. **The date field shows "7 Oct 2026"** (was "7/10/2026", which many read as July 10). It still holds and hands on d/m/yyyy, and the picker is unchanged.
13. **⌘K's Go to and Create no longer always close the list.** They rise together above any record group whose best answer is no better (1-37), so "payments" finds the Payments places before a folder called so, and "upload a quote" leads with Create. On a touch screen the Keyboard shortcuts row appears only once a real keyboard has been used.
14. **Two dashboard failures were already on the WIP base and are not B1's:**
    - dash-d4: the meeting row's ⋮ holds Prepare me.
    - dash-d1: 390t, the ghost's Your day is 24 px taller than the page.

    Both fail identically in run0. Your day is outside this lane's changes.


**Register:** Numbered REG-3075…3111 (see build/reg-map.json).
