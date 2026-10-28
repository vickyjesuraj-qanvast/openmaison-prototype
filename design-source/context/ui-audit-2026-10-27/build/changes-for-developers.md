# The calm UI build: what moved and what was renamed (for developers)

**Who this is for:** developers bringing OpenMaison 1.0 into this 2.0 prototype who weren't part of the build.

**What it was:** the calm UI build (2026-10-27 → 28) changed how 2.0 looks and reads. It did not change what 2.0 does. Use this page to find
where a control went and what a word is now called.

**Where the records are:**
- Register rows: **REG-3075…3333**. `reg-map.json` maps each lane's staged id to its number.
- Each lane's full record: `outcome-b1.md` … `outcome-b6.md`. B5's four parts are in `b5-parts/`.
- The contract the lanes worked to: `brief.md`.
- The audit itself: `../README.md`.

Lanes: **B1** shell, house pieces, your day · **B2** leads · **B3** projects, portal, issues, messages · **B4** quotes, contracts, templates,
price book · **B5** company, settings, finance, reports, plan · **B6** tools and website.

---

## 1 · What this build is, and what it isn't

**It is** display words, layout, placement and folding. An action that used to sit on the page is now usually one press away: in a row's ⋮, a
"More" fold, a drawer, a "How this works" link or a tooltip.

**It isn't** a change to what the app does. Nothing below was removed or renamed:
- routes and tab slugs;
- `?query` keys;
- stored values and enums;
- server actions;
- `data-testid` / `data-kb` handles;
- keyboard shortcuts.

No schema, migration, repair or baseline changed either. Where a screen now shows a stored value in new words, it goes through one display
map (§3). The stored value, the filters and the URLs stay as they were.

### The guard

`design-source/verify/ui-audit-build/guard.mjs` takes a static snapshot of what a person can reach and do:
- every page (`app/**/page.tsx` → its route);
- every server action a screen imports;
- every `data-testid`, `data-kb` and `testId` literal;
- every key id in `lib/keys/registry.ts`.

It then diffs two snapshots. It exits 1 if anything is gone.

```bash
node design-source/verify/ui-audit-build/guard.mjs snap . <scratch>/before.json     # before your change
# … your change …
node design-source/verify/ui-audit-build/guard.mjs snap . <scratch>/after.json
node design-source/verify/ui-audit-build/guard.mjs diff <scratch>/before.json <scratch>/after.json
```

This build's result: `main`, 2026-10-28, measured against the snapshot taken before the lanes started.

| | Before | After |
|---|---|---|
| Pages | 173 | 173 · none gone |
| Server-action call sites | 1,064 | 1,064 · none gone |
| Keyboard shortcuts (key ids) | 120 | 120 · none gone |
| Control handles (`data-testid` · `data-kb`) | 3,763 | 3,904 · none gone, **141 new** |

- **New handles by lane:** B1 6 · B2 28 · B3 27 · B4 18 · B5 41 · B6 21. Each lane's §4 names them.
- **Moved controls:** when a control moved into a menu, its handle moved onto the menu row that does the same job. The guard counts a handle
  that only changed file as kept.
- **The before-snapshot** of this build is kept at `design-source/context/ui-audit-2026-10-27/build/guard-before.json`, so you can
  re-check the build itself: `node design-source/verify/ui-audit-build/guard.mjs diff design-source/context/ui-audit-2026-10-27/build/guard-before.json <scratch>/now.json`
  after snapping main. To guard your own change, snap before and after it, as above.

### Changes that sit close to behaviour

Each of these keeps the same server action and the same rule. None loses a feature.

- **Two one-press actions now ask first.** These were the approved exceptions. Each runs the same action with the same Undo, once confirmed.
  - Confirming a client's payment asks "Confirm {client}'s payment?" from every place it can be pressed: a project's Needs your attention, the
    Payments view's row, the invoice panel, and Finance › Needs your attention (REG-3161 · REG-3285).
  - A quote's Mark as sent asks "Mark OM-… as sent?" (REG-3215).
- **Approving from the bell takes one more step.** An approval row no longer has Approve / Send back of its own (REG-3086):
  - pressing the row, or ⋮ › Review on the Dashboard, opens `/dashboard?review=<record>`;
  - ⋮ › Send back adds `&back=1`;
  - the Review pane runs the same actions.
- **New quotes open without two columns.** A quote with no stored column set opens without Discount and GST (%) (`DEFAULT_COLUMNS` in
  `lib/quotes/items-model.ts`). A line that uses either brings that column back by itself (REG-3222). Quotes with a stored set keep theirs.
- **Every Settings choice that saves as it changes now has Undo** (REG-3276).
- **Fewer people see three Client payments verbs.** Send · Confirm · Remind show only to whoever runs the books (Owners, Admins,
  Accounting). Designers used to meet a refusal there. The ⋮ still opens the project for everyone.
- **The contracts list's search matches more.** It now also matches the quote number and the status shown.
- **⌘K orders results differently.** Go to and Create rise above any record group whose best answer is no better; they used to come last.
- **The Maison AI button fades at a desk** while page content sits under its corner (§4).
- **Two text changes reach records:**
  - New handover records store "n issues waiting on the studio" (was "tickets").
  - The Letter house style (`lib/templates/presets.ts`) now says "Quotation". This applies to templates made from it from now on. The demo's
    stored Default Quote PDF still says "Sales Contract" until a repair rewrites it (§5).
- **The contract paper's punctuation is tidied on screen only.** `tightenPunctuation()` drops the space before punctuation that follows a
  filled-in field. `resolveTokens`, fingerprints and kept copies are unchanged.

---

## 2 · Where things moved

Every action a lane moved is listed below, grouped by module. **Handle** is the `data-testid` the control keeps. "new:" marks a handle this
build added. "—" means the control has no handle.

### Shell and Dashboard (B1)

| What | Was | Now | Handle |
|---|---|---|---|
| Approve / Send back on a bell approval | inline buttons on the bell's row | the row's press, or ⋮ › Review on the Dashboard → `/dashboard?review=<record>`; ⋮ › Send back / Decline → `&back=1` | `notification-approve` · `notification-send-back` (now ⋮ rows) |
| The approvals count on /tasks | a line at the top of /tasks | gone from /tasks; the Dashboard's Approvals tab and its Review pane hold the approvals (`countApprovalsWaiting` kept) | `tasks-approvals*` (kept in the unmounted `approvals-line.tsx`) |
| Ask Maison AI on a Dashboard card | a ✦ button in each card's head | the card's ⋮ › Ask Maison AI about this; on a phone, the dock | `<card>-ask` on the menu row · `ask-<card>` |
| Hide a card (phone) | the card's own ⋮ | the page ⋮ › Cards on your page | `page-card-<key>` |
| Whole studio / Just me (phone) | a segmented switch on its own row | the page ⋮ › Show | new: `page-scope-studio` · `page-scope-mine`; desks keep `scope-switch` |
| Every row of Needs your attention | "Show all n" unrolled the card | "See all n" opens the house Drawer | `needs-more`; new: `needs-all` · `needs-all-list` |
| The inbox's tabs | always shown | shown from eight rows (`INBOX_TABS_FROM`) | — |
| A project's standing to-dos | one row each | one row per project, "{project} · n things to do"; its ⋮ runs each (up to six) | `data-folded` · `data-folded-keys` |
| Your own "Open to new leads" (now "Take new leads") | the studio block's menu, the phone's You sheet | Your profile › New leads (`/profile#new-leads`); same `setMyAccepting` | `you-accepting`; new: `profile-new-leads` |
| View as · Studio plan · Studios | the top of the studio block's menu | that menu's Demo fold at the bottom (remembered in `om.viewas.demo`); More › View as on a phone is unchanged | new: `demo-fold` |
| Keyboard shortcuts from Maison AI | a suggestion in the Maison AI sheet | the ? key, ⌘K › Go to › Keyboard shortcuts, the bell's one-time note | — |
| "You use n of N here" | a meter over the ? panel's list | gone; the tick on each used row stays | — |
| Column settings' help | a paragraph over the list | an ⓘ tooltip on the drawer's title | — |
| The bell's Due rows | a group of their own | one fold at the end, "Due · n · Show" | new: `notifications-due-fold` |
| A bell row's other channels | a line under the row | the time's tooltip, and the row's words for a screen reader | — |
| Rail counts for Projects, Leads, Company, Tools | red numbers on the rail, dock and More | no mark (their rows are the Dashboard's); each opens its plain list (Leads no longer lands on `?scope=unseen`) | `BADGE_LOOK` |
| Rail count for Tasks | a red number | a red dot; the item's name says "Tasks (3 overdue)" | read the `aria-label` |
| Rail count for Issues | a red number | a grey dot; "Issues (1 waiting)" | read the `aria-label` |
| Esc while a snackbar shows | went Back at once | the first Esc dismisses the newest snackbar; a second goes Back | — |
| The Maison AI button over page content | always drawn | steps aside (§4) | `data-aside` |
| The Maison AI button on a project page (phone) | showing at the top | tucked at the top; back on the first scroll up and at the end | — |
| ⌘K's Keyboard shortcuts row on touch | always listed | listed once a real keyboard has pressed a key (`html[data-hw-keyboard]`) | — |

### Leads (B2): the listing, a lead's page and tabs, Tasks, Meetings, Qanvast Ops, Hangouts

**The listing**

| What | Was | Now | Handle |
|---|---|---|---|
| Reports (was Insights) | a header button (a square on a phone) | the listing ⋮'s first row, "Reports" | new: `leads-reports` |
| Link to Email · Link to Zapier · Connect to Ads | three rows of Add Lead ▾ | New lead ▾ › Get leads automatically… → Company › Integrations | — |
| Create New Lead | Add Lead ▾ | New lead ▾ › Type in a lead | `shortcut="create"` (C) |
| Import from File | Add Lead ▾ | New lead ▾ › Import a file | — |
| Lead Import History | the listing ⋮ and the import wizard's left panel | the listing ⋮ › Import history (the wizard's duplicate link dropped) | — |
| Review imported leads | a docked bar at the listing's foot | the scope pill › Needs your attention › To review · n; the import's snackbar keeps Review | new: `leads-review-open` (`review-banner.tsx` unmounted) |
| Edit a row | a hover pill over the cells | the row ⋮'s first row | new: `lead-row-edit` |
| Add task (empty task cell) | a purple link at rest | on hover / focus ("No task" at rest); always under a finger | — |
| Assign | purple text / icon | a grey person-plus | — |
| Return Lead | the row / kanban ⋮ | the same row, "Return to Qanvast" | — |
| Invite to Portal | the lead's ⋮ | the same row, "Client portal" | — |
| Sort | the Filters modal's first tab | the table's column heads; Filters keeps Sort for the kanban and the phone (`withSort`) | — |
| Approve / Reject on a review card | every card | the detail pane's foot | new: `review-approve-clean` |
| View & Merge (duplicate card) | a button on the card | the card's press | — |
| Dismiss ✕ on Deleted leads' band | the orange band | gone with the band; the 30-day rule is a plain line | new: `deleted-rule` |

**A lead's page** (the info column and the Overview cards are shared with a project's page)

| What | Was | Now | Handle |
|---|---|---|---|
| Convert to Project, locked | the header, beside the primary | Stage ▾ › Won row, with the same refusal (`onLocked`) | `convert-locked` |
| Move to {next} on a lead with no member | the filled primary, which refused | the primary reads "Assign a member"; the move follows the save | — |
| Phone, email, budget, type and source chips | the header on every tab | Overview: the info column; other tabs: one plain line in the header | new: `lead-head-facts` |
| The return-state chip (Overview) | the header | the LEAD RETURNED card (other tabs keep the chip) | — |
| The Stage row | Lead info | Stage ▾ and the LEAD STAGES card | — |
| NRIC / FIN · Customer ID | Lead info | Other info | — |
| Empty rows ("--") | each section | one "Add district, area size…" link, which opens Edit details on the first empty field (`onEditField`) | — |
| The Owner row | the info column | the Members list ("(you)", "· in charge" on the first member) | new: `info-members` |
| The Portal row's Client messages | the Portal row | Members › Client chat · Open | `lead-portal-messages` |
| Team chat's Messages | the Team chat row | the same row, Open | `info-team-chat` |
| The brief's second action and the other briefs | the brief card's Show more | the Maison AI sheet, which lists every brief action | — |
| From Scratch / From Template (empty Quotes card) | two buttons | one outlined "Create a quote" → the Create Quote window | — |
| The Return wizard's (i) | the head of every step | only on steps whose body has no policy link | — |

**Tasks** (the lead's tab and `/tasks`)

| What | Was | Now | Handle |
|---|---|---|---|
| The Leads · Projects segment (/tasks) | the toolbar | the scope pill's menu | `task-source` |
| The Unassigned scope | the pill | the Unassigned chip (`?scope=unassigned` still lands) | — |
| Edit a task | a pill on the row | the row ⋮'s first row | new: `task-row-edit` |
| + Add Tags | the row | the row ⋮ › Add tags / Edit tags; the hover hint; the panel | new: `task-row-tags` |
| + Add Task (desk table foot) | a bar under the table | New task ▾ › Blank task | — |
| Delete all (/tasks ⋮) | the page ⋮ | select all → the bulk bar's Delete all (the lead's tab keeps it in its ⋮) | — |
| Status · Creator · Tags columns | on by default | Column settings | — |
| Assign | a link | a grey person-plus | new: `task-row-assign` |

**Meetings, Qanvast Ops, Hangouts**

| What | Was | Now | Handle |
|---|---|---|---|
| /meetings Insights | a button | the toolbar ⋮ › Reports | `open-insights` |
| Qanvast Ops' Add Lead · Insights · Request Leads | the header | the header ⋮ › New Qanvast lead · Reports · Request leads (C still opens New Qanvast lead) | new: `qanvast-new-lead` · `qanvast-reports` · `qanvast-request-leads` |
| The Qanvast table's sort arrows | inert arrows | gone (Filters › Sort sorts) | — |
| A meeting row's Open | a floating button | the ⋮'s first row, and the name | — |
| ON THE LEAD's Save | the card | the header's (a phone's foot) Save to the lead | — |
| Reviews' Rating ▾ + Sort ▾ | two menus | one Sort menu | — |
| The prototype lines (listening, Hangouts sample, the Sample chip, the Qanvast account stand-in) | lines on the page | "?" tooltips | new: `room-stand-in` · `hangouts-sample` · `hangout-sample` · `qanvast-account-sample` |
| SuperTrust's footnotes | under the table | the section's "?" | new: `ranking-how` |
| The consent script | always open | the "What to tell {first}" fold | — |
| A held meeting's tags | always open | "Show details" | new: `heard-tags-toggle` |

**The lead's other tabs and the Move stage window**

| What | Was | Now | Handle |
|---|---|---|---|
| Questionnaire's Answer, per row | a button | the row's press | new: `question-answer` |
| Ask Client | always shown (disabled when empty) | hidden until a question exists ("Add them" is the way in) | new: `ask-client` |
| The Overview's Files card | filled Upload, outlined Create Folder | outlined Upload files, text Create folder | — |
| Move stage's Outcome | a select | How it went chips (same values) | — |
| The phone's note composer | docked at rest | New note › Note | — |
| On Hold / Lost subtitles | under the title | gone (they repeated it) | — |
| Deleted files' Empty Trash | a button | "Delete all forever" (same action) | — |
| A file's empty Owner row | shown | left out | — |

### Projects, the client portal, Issues and Messages (B3)

**The Projects listing**

| What | Was | Now | Handle |
|---|---|---|---|
| Reports | the header's outlined Insights | the header ⋮'s first row, "Reports" | `open-insights` |
| The five tiles on a phone | two rows of tiles | one line of doors under the pill | `tile-attention` · `tile-waiting` · `tile-month` · `tile-in_progress` · `tile-value` |
| The tiles on Workload, Contractors, Completed | drawn | not drawn there | — |
| A phone card's attention reasons | all, in red | the top one + "+n more" | new: `card-attention-more` |
| Scope help paragraphs | under each scope row | one line; the full list in the row's tooltip | — |

**A project's page**

| What | Was | Now | Handle |
|---|---|---|---|
| Number · project type · property type | header chips | Project info / Property info rows | — |
| The next step on a phone's Overview | the header's filled button | the brief's first button and the Needs row (the header button stays in the DOM, hidden ≤767) | `project-primary` |
| The views of Tasks · Client · Design · Files & notes | chips | a segmented control (same radios, counts and addresses) | `project-view-chips` |
| Stage ▾'s Active / Inactive heads | group labels | gone | — |
| Invite to Portal | the project ⋮ | the same row, "Client portal" | — |
| Send back / Decline · Change · Remind · Call on a Needs row | a second text button | the row's ⋮ | `need-send-back` · `need-secondary` (on the menu rows) · `need-more` |
| Mark done on a late milestone with an ask waiting | its own row | the ask row's ⋮ | `need-also` |
| Start on a late start with no contractor | its own row | the "should have started" row's ⋮ | — |
| The hold's reason | the brief, Progress and the Needs row | the Needs row | — |
| "Setting up for n days" | Before work starts' head | the brief's sentence | — |

**The Payments tab** (slug still `money`)

| What | Was | Now | Handle |
|---|---|---|---|
| A Needs row's second step (the bank's confirmation · Not received · Remind on WhatsApp · Call · Send back · Open · Record a payment · Change the amount · Record the refund · Message {vendor}) | text buttons beside a filled one | the row's ⋮ (`<band>-more`) | `payment-proof-link` · `payment-not-received` · `invoice-remind` · `invoice-call` · `money-credit-refund` · `po-late-message` |
| Approve and send | a filled button | the row's text verb "Approve" (same send dialog) | `banner-approve` · `costs-approve-po` |
| An invoice's Open | the Next step column | the row and its name | `invoice-open` (on the name) |
| A VO's Open | the Next step column | its number link | `vo-open` |
| New ▾'s variants (from a contractor's quote · an invoice made elsewhere · order from the quote · a PO made elsewhere) | top-level rows with helper lines | one level in, under Variation order · Invoice · Purchase order | — |
| Billing's and Changes to the contract's help | a line under each title | "How client payments work" / "How variation orders work" tooltips | `money-billing-how` · `money-variations-how` |
| Client payments' four views; the phone's list switch | chips | segmented controls | `money-billing-view` · `money-list-switch` |
| Confirm a client's payment | one press | a press, then "Confirm payment" | — |

**Deleted projects, New project**

| What | Was | Now | Handle |
|---|---|---|---|
| The retention banner and foot note | a banner and a paragraph | one line under the title | `deleted-projects-banner` |
| The Client column | its own column | the number's line | — |
| Delete Forever | a red link on the row | the row's ⋮ › Delete forever | `deleted-project-forever`; new: `deleted-project-more` |
| Empty Trash | a head button | "Delete all forever" | — |
| New project's split helper | under the field | removed (the field names itself) | — |

**Schedule, Compliance, Choices, Floor plan, Handover, Workload**

| What | Was | Now | Handle |
|---|---|---|---|
| The ask band and Open it | above the list | the asking row's line, and its ⋮ › Open the ask (Approve · Decline stay in the panel) | `schedule-asks` · `asks-open` |
| "+n days from changes", who sees it | the toolbar | the summary line (desk; the phone bar is unchanged) | `client-sees` |
| The legend | under the chart | a "?" tooltip | `schedule-legend` |
| The phone's Done | every unfinished row | running rows only; others through the panel / the desk ⋮ | — |
| Bar colour | open in the panel | the panel's More options | `panel-more-options` |
| Start / Rebuild's unusable ways | disabled cards | one grey line | `source-not-yet` |
| Compliance's phase chips | a row of chips | a pill and its menu | `compliance-phases` · `compliance-phase-<key>` |
| Compliance's "Details ▾" | each row | the title | — |
| Choices' grouping chips | a row of chips | a pill | `choices-group` |
| Choose with {client} | the band | the card's ⋮ | `choice-choose` |
| Floor plan's nine extra tools | a chip row | More tools | `plan-more-tools` |
| Whose marks · Show resolved · trade chips | the rail | the Show pill's menu | `plan-show` → `plan-who` · `plan-layers` · `plan-resolved` |
| The Main plan tag; one plan's chip | toolbar; under the views | removed; a name line | `plan-name` |
| The handover sheet's other verbs | on the row | the row's ⋮ | `check-<key>-more` (keeps `check-<key>-fix` · `-go`) |
| Defer | a text button | a "Leave for after handover" tick | `check-<key>-defer` |
| Workload's count line; "studio default" | a caption; on the row | a tooltip + `data-counted`; `data-default` | — |
| Put on a site | every free row | a verb only where work waits, else the row's ⋮ (+ Open in Finance › Vendors) | `contractor-menu` |
| A contractor's code | the row | the vendor record (search still matches it) | — |
| Settings › Projects' handover pointer | a sentence | one link | `handover-review-pointer` |

**Messages and Issues**

| What | Was | Now | Handle |
|---|---|---|---|
| The Client / Team switch | chips in the conversation head | text links (`?channel=team` unchanged) | `conversation-channel` · `conversation-channel-team` · `conversation-channel-client` |
| An issue's number | the card's start | the end of its second line | — |
| The project number · the reporter · the category tag | the card / the drawer's head | the drawer's Project row · "Reported by … on …" · its Category row | — |
| "Open" on the Open list | every card | the drawer and the All / Closed lists | — |
| /chat's readers line | the head and under the composer | under the composer | — |
| Direct · Group · Studio · Client tags | the head | gone; one Team tag on internal rows | — |
| New message ▾ · Mark resolved · a project's New issue | filled | outlined (desk) | `chat-new` · `ticket-resolve` · `new-ticket` |

**The client portal**

| What | Was | Now | Handle |
|---|---|---|---|
| Choices · Designs · Floor plan · Messages · Issues · About · Files (desk) | links in the bar | the bar's More ▾ (the phone dock is unchanged) | `portal-nav-more` · `portal-nav-more-row[data-key]` |
| Files › Documents' Open | a link at the row's end | the whole row | `portal-document` |
| A choice's state tag (client page) | under a heading that says it | removed (the studio's preview keeps it) | — |
| The access chip's "when" | on the chip | the person's line, and Company › Client portal › Clients' Last opened | — |
| The schedule's invoices under All | among the milestones | under the Payments chip | — |

### Quotes, contracts, templates and the Price book (B4)

**The quote editor**

| What | Was | Now | Handle |
|---|---|---|---|
| Client view (the live pane) | the header's eye (desk) | the header ⋮'s first row, Client view / Hide client view | — |
| Comments | the header's comment icon | the header ⋮ › Comments | — |
| Edit template | the Template card | the header ⋮ | — |
| Save as template | the Template card and the ⋮ | the header ⋮ (once) | — |
| Undo / Redo | two Items toolbar icons | the Items ⋮'s first rows (⌘Z / ⇧⌘Z unchanged) | new: `items-more` |
| Column settings | the Items toolbar's tune icon | the Items ⋮ | — |
| Row density | a toolbar icon and menu | the Items ⋮ › Row density › | — |
| View by | the toolbar's "View by: None ▾" | the Items ⋮ › View by › (Print group listed once a line carries one) | — |
| Expand all / Collapse all | an outlined toolbar button | an Items ⋮ row | `toolbar-fold` |
| Full screen | the toolbar's last icon | the Items ⋮ › Full screen (a Collapse icon stays while full screen) | new: `items-full-screen` |
| Round prices | a link beside Total | the Items ⋮ › Round prices… (desk); the touch Adjust sheet keeps its link | new: `items-round` |
| Maison AI (Items) | a toolbar button and a Create strip tile | the page's Maison AI button (same sheet); a touch tablet's Items row keeps its glyph | — |
| The Price book modal | a Create strip tile and a link under the table | Create ▾ › From Price book; each section's foot; Add item › Add from Price book… | — |
| The print note ("prints lines by trade") | above the Items table | the Template card's line (desk); the Items screen on the move keeps it | — |
| Discount (the lines' total) | always in the totals | only when a line carries one | — |
| Additional discount | always | while it holds a value; "+ Add a discount" otherwise | — |
| Copy name · Show full content · Highlight › · No number · Words on this line… · Section note… · Add section / sub-section · Add item › · Move item › | the row ⋮'s top level | the row ⋮ › More › | — |
| Print as one line · Label the sub-total… · Remove the sub-total label · Price after the contract | the section ⋮'s top level | the section ⋮ › Print as › | — |
| Save to My Items · Update the item · Save as a new item | the row ⋮'s top level | the row ⋮ › Price book › | — |
| Mark as sent | one press | the same row, then a confirm | — |
| Move to Quote Sent after Mark as sent | the snackbar's action | the editor's sent banner (and the lead's stage pill); the snackbar keeps Undo | — |
| The template's defaults line ("By trade › room · 10/30/30/30 …") | the Template card | the template's Quote settings tab; the applied values on the quote's sections | — |
| "My Templates" (Terms / Notes) | — | "Templates" (same modal) | — |
| A VO's contract-today figure and omission rule | the VO banner | an info tooltip at the bar's end | new: `variation-how` |
| The upload tile's tag | a MetaChip "XLSX · CSV · PDF · 5 AI CREDITS" | words, "Spreadsheet or PDF · 5 credits" | — |
| Discount and GST (%) columns (no stored set) | on | Column settings; each comes back while a line uses it | — |
| The section's SECTION tag | every section row | its band, fold and item count | — |
| A child line's eye (fully shown) | at rest | on hover / focus (always under a finger) | — |

**The quotes lists**

| What | Was | Now | Handle |
|---|---|---|---|
| A row's View | a hover button | the title (⋮ › Open under a finger); the same on Contracts | — |
| New quote (Tools › Quotes) | the toolbar's "Create Quote" | the page header's "New quote" (desk, tablet); the toolbar's glyph on a phone | — |
| Shared / Private | a word under every number | a lock with a tooltip on a private quote; nothing on a shared one | new: `quote-private` |
| The follow-up add (empty cell) | a purple icon on every row | on hover / focus; none on Confirmed / Signed | — |

**Contracts and the signing pages**

| What | Was | Now | Handle |
|---|---|---|---|
| Rename a contract | an inline title input on the meta row | the header ⋮ › Rename… (dialog "Contract title"; refused when signed) | — |
| Rename a contract template | the template editor's meta-row input | ⋮ › Rename… (every width) | — |
| Reminders (was Automation) | the header's bell | the header ⋮ › Reminders… (same dialog) | — |
| Copy signing link | the header's link icon | the header ⋮ › Copy signing link; the Send dialog's Copy link is unchanged | — |
| The Preview's Copy link / Download PDF | icon buttons | labelled outlined buttons | new: `preview-copy-link` · `preview-download-desk` |
| The Preview's Back to edit | an outlined button | the ← IconButton named "Back to edit" | new: `preview-back-desk` |
| Start from the studio agreement | the picker's foot button / a phone row | a choice card / row + Continue | `contract-starter-row` |
| Use template | the picker's foot button | Continue | `contract-template-use` |
| The Signed copy column | on by default | Column settings + the row ⋮ › Signed copy | — |
| From template · signed date · Used by · Template tags | header chips | the banner (signed date), the Activity fold ("Created from a template"), the gallery card (usage) | new: `contract-head-words` |
| The Code +65 box | a select beside the phone field | a "+65" prefix inside the field | — |
| The Send dialog's link row | always | only when the message lacks the link | — |
| The Send dialog's demo note and link window | the dialog's head | "How signing works" (a tooltip at a desk, a fold on touch) | — |
| Formatting tools on a signed contract | greyed out | hidden; the Outline toggle stays | — |

**Company › Templates, the template editor, the Price book**

| What | Was | Now | Handle |
|---|---|---|---|
| A column's alignment · move left / right · heading · width · colour | always on the Items column card | inside the card's chevron | new: `column-card-open` |
| The Price book's Status column | on by default | Column settings; a waiting item wears a chip in its name cell | — |
| "edited … by …" on library cards | the card's foot | the list view's Updated · Updated by | — |
| Unused-usage words | the card's foot | the list's Used by / Default on, the Deleted sheet | — |
| The item dialog's helpers; its old subtitle | under each field; the subtitle | the "How the Price book works" fold | `price-book-how` |
| The import dialog's long subtitle, export line, vendor helper | the dialog | the same fold | new: `import-how` |
| The Quote settings pane's clauses | the intro | "How this works" | new: `defaults-how` |
| The template editor's first-visit banner | under the top bar | the inspector's empty state | `editor-hint` (on the empty state) |
| The top bar's "Default" and "Edited since vN" | top-bar chips | the gallery card's chip / ribbon; the Publish changes button | new: `template-head-words` |
| The payment, schedule, task and text editors' chips | the header | the name row, the gallery card's usage line, the list's columns | — |
| T&Cs' kind tag · Tasks' Due dates tag · "· A4" · a contract's first words · Ready-made | on the card | the card's meta line (in words); the list's columns | — |
| The brand kit's card helpers | under each card head | removed as repeats ("PNG, JPG or SVG." and "Sizes are in points, as on paper." kept) | — |
| Price book › Sections' default view | grid | list (a member's own pick, `om.price-book-sections.list`, still wins) | — |

### Company, Settings, Finance, Reports, Plan (B5)

**Company** (Members · Profile · Integrations · Questionnaire · Client portal · the Company panel)

| What | Was | Now | Handle |
|---|---|---|---|
| Members' Edit details | the pencil beside a name | the row's ⋮ › Edit details; the member's drawer › Details | `member-edit`; new: `member-more` |
| Edit your own details | the pencil on your row | your row's ⋮ › Edit your details; the drawer | `member-your-profile` |
| Reports to · a Manager's team | the row | the member's drawer › Leads (the Add member snackbar's "Set who they report to" opens it there) | `data-reports-to`; new: `member-open` · `member-drawer` |
| Open to new leads (another member) | the row's second line | the drawer › Leads; the row says "Not taking new leads" when off | `member-closed` |
| Projects at once (now Max projects) | the row's second line | the drawer › Leads › Max projects | `member-capacity` |
| Lead preferences | the row's summary and button | the drawer › Leads › Lead preferences + Change (`?prefs=<id>` still opens the dialog) | `member-prefs` · `member-prefs-edit` |
| PayNow | the row's second line | the drawer › Pay | `member-paynow` · `member-paynow-edit` |
| Public profile | a text button | the row's ⋮; the drawer › Public profile | `member-about` |
| A signature not set | a line on the row | the drawer › Details; your own row says "Add your signature" | `member-signature` |
| Copy invitation link · Cancel invitation · Deactivate | on the row | the row's ⋮ (a refusal stays disabled, with its rule) | `member-invite-copy` · `member-invite-cancel` |
| The roles paragraph and its Settings link | the card head | the list's foot: What can each role do? · Who sees which leads | `members-visibility-link` |
| The Company panel's help lines | under each row | each row's tooltip and ⌘K's sub-line | — |
| Profile's six cards | one page | four tabs, Details · Bank & entities · Registrations · About page (`?tab=`; old `#card` addresses open their tab) | — |
| The Brand kit door | a card at the page's foot | a link in Company details' help line | `brand-kit-link` |
| The About page's Discard · Save | the card's foot | the page header, on the About page tab | `about-save` |
| "Simulated on this prototype …" | a line under a card's help | a Demo chip in the title row; the sentence is its tooltip and accessible name | `int-simulated-*` · `qanvast-simulated` |
| Webhook steps and the JSON field list | on the card | For your developer (a fold) | `webhooks-developer` |
| A link's Simulate a POST · Regenerate · Revoke | text buttons | the link's ⋮ › Try it · Regenerate · Revoke (Copy link stays on the row) | — |
| Questionnaire's Add question | the card head (filled) | the page header (filled), "New question" | — |
| Questionnaire's long help | the card head | How this works (a fold) | `bank-how` |
| Lead preferences' "n of 4 configured" | visible | for a screen reader only | `pref-count` |
| Client portal's See it as {client} | filled | outlined (same place) | `portal-test` |
| Invoice paper · PO paper cards | under Money in · Money out | Settings › Finance › Printed papers, by chip (both kept mounted) | — |

**Settings**

| What | Was | Now | Handle |
|---|---|---|---|
| Who may do what (≈120 rows × 6 roles) | open on Roles & access | What each role can do › See the list → a drawer; one role per chip, All roles = the old matrix; `#studio-roles` opens it | `may-*` · `may-link-*` · `may-group-*`; new: `studio-roles-open` |
| Each event's WhatsApp / Email wording | the Message wording card | the event's row › Edit wording → a drawer → Edit (the same dialog) | `message-<event>-<channel>`; new: `wording-<event>` |
| "Kept in Company:" links | under each module's title | the module's last line, Related: (same targets, same `?from=`) | `module-links` |
| Your profile | under each module's title | the Related line's last link (its sentence is the tooltip) | `module-yours` |
| Lead management's Who sees leads pointer | a sentence under the head | the Related line's Who sees leads | `leads-visibility-pointer` · `leads-visibility-link` |
| Projects' two pointers | two sentences | Related: Who sees leads · Invoices and payments | `projects-visibility-*` · `projects-money-*` |
| Finance's "How a client pays …" | a sentence under the head | the tooltip of the Related line's Profile door | `finance-profile-pointer` |
| Document numbers' rules | the card's help paragraph | How numbers work (a fold) | — |
| Sent messages | the module's last card | also a door in the Notifications head | new: `notifications-sent-link` |

**Company › Finance**

| What | Was | Now | Handle |
|---|---|---|---|
| To do's five tables (now Needs your attention) | a CreditsTable per group, each with Column settings | one list of rows per group; every column's fact on the row's line; the old `om.columns.finance-todo-*` prefs go unused | `[data-todo]` |
| To do's chip counts | "All · 18", "To approve · 4" … | the section heads ("4 waiting for your approval · S$ 11,672") and the tab's count | — |
| To do's verbs | Review on Money · Remind on WhatsApp · Pay {first} · Approve and send | Review · Remind · Pay · Approve (same presses) | same testids |
| Confirm / Check a client's payment | one press | the same press, after a ConfirmDialog | — |
| Client payments' Open | a text button in Next step | the row's ⋮ › Open on the project's Money; the record number still opens it | `money-in-open` |
| Client payments' View receipt | a text button | the row's ⋮ › View receipt; the receipt number still opens it | `money-in-view-receipt` |
| Commission: a project's Pay | a text button | the row's ⋮ › Pay this project | `commission-pay` |
| Commission: a rate request's Decline · Approve | text buttons | ⋮ › Decline; the verb reads "Answer" (same dialog) | `commission-decline` · `commission-approve` |
| Commission: Pay {name} S$x | "Pay Germaine S$667.41" | "Pay S$667.41" | `commission-pay-member` |
| Vendors' Status column; Inactive / All chips | always | only while a vendor is inactive | — |
| A vendor's code and "works on site" | the row's caption | the vendor's panel ("On site") | — |
| Money in's rule, Commission's rate order, Costs' PO rule | help paragraphs | How this works (a tooltip on the same line) | — |
| Finance lists on a phone | CreditsTable cards | Finance cards (`components/finance/finance-cards.tsx`), keeping each row's `data-*` and the cells' testids | `data-card` |

**Company › Reports, Plan & AI credits**

| What | Was | Now | Handle |
|---|---|---|---|
| Pick a Leads report (Response time · Sales) | a chips row | a "Report: … ▾" pill (`menuitemradio` rows) | `leads-report-chips` (on the pill's wrapper) |
| Pick a period (Leads · Meetings · Studio health) | range chips | a "Period: … ▾" pill | `insights-range-chips` · `meeting-report-range` · `health-range` |
| "Filtering on … · n in range" | a caption beside Export | the Period pill's tooltip (`data-tip`) | `insights-range` · `meeting-report-caption` · `health-caption` |
| Pick a Finance report; its period | ten chips (a select on a phone); a labelled select | "Report: … ▾" and "Period: … ▾" pills at every width | `report-chips` · `report-period` |
| Each report's foot note | a paragraph | "How these are counted" | `insights-foot` · `sales-foot` · `meeting-report-foot` · `health-foot` |
| Sales › By source rows with no win | in the table | "Show n more sources with no wins yet" | `sales-sources-more` |
| Sales › Over time's table | under the chart | "Show the table" | `sales-flow-more` |
| Sales › Going quiet, by member | its own section | the Going quiet section's By member view | `sales-quiet-members` · `sales-quiet-view` |
| Studio health's other 11 tiles | four groups on the page | "Show all figures" (each tile once, testids unchanged) | `health-all` |
| A member's monthly limit | a select in the cell | the cell's ⋮ (same picks); the value as text | `member-amount`; `member-limit` |
| Members with no AI use and no limit | rows of By member | "n members haven't used AI this month" | `usage-members-more` |
| By member's Status column | always | only while someone has asked, is at or near their limit | — |
| How Update card works (Dodo Payments) | a line under the card | Update card's tooltip | — |
| Profitability's "--" rule and the margin's weighting | the tiles' help lines | the values' tooltips (`ReportTile.how`) | — |
| Leads tiles' average ("avg 52m") | the tile's help line | the figure's tooltip | — |
| Reports › Finance's ghost | the books ghost's Reports branch | its own `FinanceReportsGhost` (`reports-ghost.tsx`) | — |

### Tools and the website (B6)

| What | Was | Now | Handle |
|---|---|---|---|
| **Marketplace** · Brands / Deals | chips with counts in the toolbar | the house Tabs under the header (`?view=` unchanged) | `market-views` |
| Marketplace's categories | a chip rail with counts | one "Category: All ▾" scope pill | `market-categories` |
| A brand's Featured | a badge on its card | the brand page's header chip (featured still sorts first) | `brand-featured` |
| A brand's first deal | a ribbon on its card | the "n deals" badge (one deal opens it, several open the brand page) | `brand-deal` |
| A brand's review count | the card's foot | the brand page's About | — |
| The feed's source lines | lines under the lists | the header's info glyph (tooltip, snackbar on a press) | `market-source` · `insights-source` |
| Market Insights' categories | chips with counts | one scope pill | `insights-categories` |
| "Not in your vendors yet" | the brand page's About | said by Add to my vendors | `brand-not-vendor` |
| "A demo address — …" | on every demo link | once under Web links | `brand-links-demo` |
| A deal's end-date chip | the dialog's head | the "Runs …" line; the chip only in a deal's last week | — |
| Add to Price book (product rows) | an outlined button | a text "+ Add", named "Add {product} to the Price book" | `product-add` |
| **AI Visualizer** · Versions & Quality ("Change") | a link under Generate | a tune button beside Generate | `viz-options-toggle` · `viz-options` |
| "Makes … · n AI credits · n left after" | a line at rest | the tune button's tooltip and the head of its switches | — |
| "Missed one? …" | the Surfaces panel's foot | the + and pencil tooltips | — |
| The home's how-it-works steps | a card above the gallery | "How it works" → a Drawer | `viz-how` · `viz-how-steps` |
| Download / Share in the on-screen version's ⋮ | the ⋮ | the canvas bar's download and the top bar's Share (other versions' ⋮ unchanged) | `viz-share` |
| A design card's lead stage / project number | the card | the list view's Kind column | — |
| The editor's kind chip | beside the design's name | the name's tooltip | — |
| Present's "Everything in V3" | a second list | one "In V3" list, changes marked New | — |
| A phone thumb's ⋮ (touch) | on every thumb | on the version on screen | — |
| **Quote X-Ray** · a Recent row's Delete | a trash icon | the row's ⋮ › Delete (refused: its rule as help; same ConfirmDialog) | — |
| A Recent row's Open the quote | — | a new row in that ⋮ (the row still opens the comparison) | — |
| Say it as a question | a button under each point | one toggle in the card head | — |
| A point's evidence; a brand's sources | always shown | behind "Why"; behind "Sources" | `xray-why` · `xray-sources` |
| The summary's footnote | always shown | behind "How we counted" | `xray-counted` · `xray-counted-words` |
| The setup's intro box | shown until dismissed | first run only; then "How it works" → a Drawer | `xray-how` · `xray-how-drawer` |
| "Always check the numbers…" | the intro box | beside Compare, and in the drawer | — |
| The eyebrow (studio · quote · job · vs …) | above the headline | the lead in the crumb; the quote's number and link in the Yours tile's help | — |
| Header chips (date · items compared · sent) | three capitals chips | one plain meta line; the count in Item by item's head | — |
| The legend and the row's status bar | on the table | dropped; the Status chip names the side | — |
| **Compliance Navigator** · Record in Company › Profile | a button on each card | the card's ⋮ › Record as done ("Open the record" once done) | `navigator-record` · `navigator-menu` |
| Add a note | a link on each card | the card's ⋮ › Add a note (a note's own Edit stays) | `navigator-note-add` |
| Show / Hide the steps | a link | the card's whole head | `navigator-steps-toggle` |
| The agency tag | the card's head | gone (the title names the agency) | — |
| Rules by home's head and search | a toolbar above the chips | the chip names the home; the search sits on the chip row | — |
| **3D Space Planner** · From an example… · From a template or a flat… | New ▾ rows | New ▾ › From a ready-made flat… with tabs Flats · Furnished examples · My templates | `planner-new-tabs` · `planner-my-templates` |
| From a floor-plan photo… | a New ▾ row | the same row, "Trace a floor-plan photo…" (also the Flats tab's card) | — |
| A layout card's project number · pieces · "by {member}" | the card | the list's new Project no. column; Furniture and Updated by columns | — |
| Remove the floor plan underneath | a text link in the Rooms card | the card's ⋮ › Remove floor plan | `planner-underlay-menu` · `planner-underlay-remove` |
| Whose the layout is | a chip beside the title | the title's tooltip (a template keeps its chip) | — |
| The Finishes' room chips (3D · Walk) | the Finishes panel | the stage's room strip, which now picks the panel's room | `planner-room-chips` |
| Material categories (planner + Visualizer) | ten chips | "Category: All ▾" | — |
| **Floorplan to 3D Isometric** · the prototype's note | a line under the drop box | the header's info glyph beside Beta (same words) | `fp3d-prototype-hint` |
| Regenerate | the filled button | "Try another take", outlined (Download is the filled one) | `fp3d-regenerate` |
| **Website trial X-Ray** · "THEIR QUOTE" | a caption over the box | the box's own title | — |

---

## 3 · Words: the display vocabulary

These are screen words only. The **Stored / keys** column says what stays as it was.

### The vocabulary

| Concept | Old word(s) | Now | Stored / keys |
|---|---|---|---|
| What needs the member | Needs you · To do · Needs my review · Waiting on you · Needs attention | **Needs your attention**; "n need your attention" in a sentence | Finance tab key `todo`, address `/company/finance/todo`; Projects scope `attention` |
| Approvals | To approve · Your OK · Needs your OK · awaiting · proposed · Sent for approval · Awaiting approval | **Approvals** (group, tab, chip, badge: "4 approvals"); a row's state **Waiting for your approval**; a quote, template or item **Waiting for approval** | Projects scope `review`; stored `Sent for Approval`; price book proposal status unchanged |
| A project's money tab | Money · Billing · Changes to the contract | **Payments**; regions **Client payments** · **Costs** · **Variation orders** | slug and portal route `money`; `?open=`; portal section key `money` |
| Finance's money lists | Money in · Money out · Paid / Payments out · Bills · Payments (a kind) | **Client payments** · **Costs** · **Payments made** · **Supplier bills** · **Client payments** | `/company/finance/money-in` · `/money-out`; `?kind=purchase-orders · bills · expenses · paid` and `invoices · payments · variations · credits` |
| Money a client owes | Outstanding · Owed to you · Owed · Still owed · Balance | **To collect** (client papers keep *Balance due*, *Paid so far*) | — |
| Money the studio owes | You owe · Owed | **To pay** (a member's own commission keeps "Owed") | — |
| Money received | Received · Money in (figures) · Cash so far | **Collected** · Cash flow's **Paid out** · **Cash in hand** | Reports' tile keys unchanged |
| Tickets | Tickets · Escalations · New ticket · Ticket categories · Escalate · In progress · INTERNAL NOTE | **Issues** · **New issue** · **Issue categories** · **Flag to the Owner** · **Being fixed** · **Note · team only** | route `/tickets`, slug `tickets`, status `in_progress`, testids; some aria-labels and stored task words keep "ticket" |
| The studio's people | Team · People · Collaborators · team member · Your team · Team Members · By team member | **Members** · **By member** ("Owner" only for the role) | — |
| The customer | Homeowner | **Client** | — |
| A line's grouping | Category (quotes, price book) · Kind (price book) · Section label · Vendor/Sub | **Trade** · **Type** · **Print group** · **Vendor** | stored `category`; export headers keep "Category", "Kind", "Proposed / Approved" (the import reads them by name) |
| Payment parts | Payment stages · stages (portal) · Milestones (a payment schedule) · On approval | **Payments** ("Payments · 4") · **milestones** (portal) · **Payments** · **On signing**; P&L **Scheduled payments** | — |
| Quote status | Sent for Approval · Sent to Client · Waiting on client | **Waiting for approval** · **With client** (Draft · Approved · Confirmed · Signed as before) | stored `QUOTE_STATUSES` unchanged |
| Contract status | Sent to Client | **Waiting for signature** | stored `CONTRACT_STATUSES` unchanged |
| Validity | Valid till · Expiry · Quote Valid Until · Valid 30 days | **Valid until** · **Valid for 30 days** | — |
| A quote's lines | lines · Lines | **items** ("16 items") | — |
| Visualizer pictures | renders | **Versions** | Files folder "Renders", list column key `renders`, the website's marketing words kept |
| A lead nobody opened | Unseen · NEW tag | **Not opened yet** | scope key `unseen` |
| The reports button | Insights | **Reports** | `open-insights`, `/leads/insights` redirect |
| Meeting Copilot | co-pilot · Co-Pilot · brief (a meeting's) | **Meeting Copilot** · **summary** | — |
| Templates' schedules | Schedules · My Items · My Sections | **Project schedules** · Price book tabs **Items** · **Sections** | addresses unchanged |
| Create | Add Lead · Create Quote · Create New Task · Add Task · Add question · Create Folder · Start a quote (modal title) | **New lead** · **New quote** · **New task** · **New question** · **New folder** · **New quote** | `shortcut="create"` / C unchanged |
| The portal door | Invite to Portal | **Client portal** (the ⋮ row and the panel's title) | — |
| A Qanvast lead going back | Return Lead | **Return to Qanvast** | — |
| Bins | Empty Trash · Delete Forever | **Delete all forever** · **Delete forever** | — |
| Contract words | Automation · eSignatures · Fillable fields · Secure signing / PRIVATE LINK / VIEW ONLY · Save a copy | **Reminders** · **Signatures** · **Signature boxes** · **Private link** · **Download a copy** | — |
| Sending | Send for confirmation · Sent it another way · Send via WhatsApp | **Ask to confirm** · **Mark as sent** · **Send on WhatsApp** (a VO: **Ask to approve**) | — |
| Quotes' follow-up | Due (the lists' column, its Filters tab) | **Follow up** (payments keep "Due") | — |
| The issuing entity | Issuing Entity | **Issued by** | — |
| Lists in Settings | Retire (sources, reasons) | **Stop offering** (Profile's entities still say Retire) | — |
| Taking leads | Open to new leads · Closed to new leads · Projects at once | **Take new leads** (your own) · **Not taking new leads** · **Max projects** | — |
| AI limits | Monthly amount | **Monthly limit** | — |
| Settings cards | Who may do what · What waits for an Owner or an Admin · Message wording · Leads now | **What each role can do** · **Approvals** · **Edit wording** (per event) · **Leads** | `#studio-roles` |
| The template editor's tab | New quotes | **Quote settings** | — |
| Tasks with no record | Studio Tasks | **General tasks** | scope key `studio` |
| The Dashboard's switch | Studio · Mine | **Whole studio · Just me** | keys `studio` / `mine` |
| No client | Personal (designs, layouts) | **Studio's own** | kind and pill key `personal` |
| A stand-in | "Simulated on this prototype — …" | a **Demo** chip, its sentence in the tooltip | — |
| The contact log | In person / Site visit · Others · Outcome · Contact Log · Notes & Logs | **Visit** · **Other** · **How it went** · **Contact log** · **Notes & logs** | stored channel values unchanged |
| Floor plans to 3D | Regenerate · Isometric · Make a 3D picture | **Try another take** · **3D at an angle** · **Trace a floor-plan photo** / **3D floor plan** | `?view=iso`; the tool keeps 1.0's name *Floorplan to 3D Isometric* |
| Visualizer words | Tools (tab) · Compare | **Whole room** · **Before and after** | tab key, testid and address unchanged |
| Profitability | Profit · Margin | **Expected profit** · **Expected margin** (named apart from Profit and loss's Profit) | the maths unchanged |
| A payment's name | Mid-Project | **Mid-project** (shown) | the stored default `Mid-Project` |
| Dashboard cards | Team load · On site · Pulse | **Team workload** · **Site photos from the last 7 days** · **Key numbers** (the menu) | — |

**Kept as they were:**
- the name "Qanvast Ops" and its Studios tab (REG-77);
- Quotes and Contracts inside Tools (REG-422);
- the rail's and the dock's order;
- the tools' product names (Quote X-Ray, AI Visualizer, Floorplan to 3D Isometric, 3D Space Planner, Market Insights, Compliance Navigator,
  Meeting Copilot);
- "Deal score" as the measure's name. Its tiers are now in words: Very likely · Likely · Maybe · Unlikely.

### The display maps: use these when you add UI

Never print a stored status, kind or channel straight to the screen. Pass it through its map:

| What you show | Helper | File |
|---|---|---|
| A quote's status | `quoteStatusLabel(s)` · `QUOTE_STATUS_LABEL` | `lib/quotes/status-words.ts` (an identical copy sits beside the enum in `lib/leads/quote-filters.ts`) |
| The quotes lists' to-do chips | `QUOTE_TODO_LABEL` | `lib/quotes/status-words.ts` |
| A quote's visibility (`Private` · `Shared`) | `quoteVisibilityLabel(v, clientFirst)` | `lib/leads/quote-filters.ts` |
| A contract's status | `contractStatusLabel(s)` · `CONTRACT_STATUS_LABEL` | `lib/contracts/status-words.ts` (identical copy in `lib/leads/contract-filters.ts`) |
| A variation order's status | `variationLabel(v)` | `lib/projects/money.ts` |
| A contact channel | `channelLabel(c)` | `lib/leads/enums.ts` |
| A property's condition | `conditionLabel(c)` | `lib/leads/enums.ts` |
| A stored payment name | `clientStageName(name)` | `lib/portal/model.ts` |
| A payment schedule's name (the seeded default shows "10/30/30/30") | `paymentScheduleName(id, name)` | `lib/templates/payment-name.ts` |
| An issue's status | `STATUS_WORDS` | `lib/projects/tickets-model.ts` |
| A design's or layout's kind | `designKindLabel` · `designCardKind` · `STUDIO_OWN` | `components/visualizer/home/kind-label.ts` |
| A task scope | `TASK_SCOPE_LABEL` | `lib/leads/task-filters.ts` |
| Finance's tabs and kinds | `FINANCE_TABS` · `MONEY_OUT_KINDS` · `MONEY_IN_KINDS` (labels; keys unchanged) | `lib/finance/sections.ts` |
| Who may do what's groups | `AREA_LABEL` | `lib/settings/permissions.ts` |
| A project's tabs and views | `PROJECT_TABS` · `PROJECT_TAB_GROUPS` (slug `money` reads "Payments") | `lib/projects/tabs.ts` |
| Company's sections (Project schedules · Items · Sections) | `lib/company/sections.ts` | — |
| A portal client's access state | `accessChip` | `lib/portal/model.ts` |

**Don't key logic on display words.** This build found three places that did:
- `lib/maison-ai/answers/dock.ts` found a Reports tile by its label, "Money in";
- `lib/maison-ai/answers/work.ts` did the same with "Owed to you";
- `components/projects/money/project-money.tsx` matched `&do=approve` on "Approve and send".

They now accept both the old and the new words, or key on the testid. Key on a stored value, a key or a testid instead.

**Formats.** Use the house helpers in `lib/format.ts` (§4):
- `displayDate`, and `relativeTime` (now spelled out);
- `displayDateTime` ("30 Jul ’26 · 12:00 PM");
- `moneyCard` ("S$ 13,370") on cards, rows and tiles. Documents keep cents.
- `EMPTY` ("—") for a table cell with no value. Elsewhere an empty value shows nothing.

### ⌘K still finds the old words

`lib/global-search/model.ts` keeps the old names as search words, so someone who knows 1.0's or yesterday's word still lands. These are
checked:
- tickets · escalations · ticket categories · new ticket
- money · money in · money out · payments out
- to do · to approve · stuck · insights
- open to new leads · create quote · sent to client · my items
- who may do what · schedules · make a 3d picture
- monthly amount · owed to you · category · version

If you rename something on screen, add its old name to the row's words the same way.

---

## 4 · House pieces whose defaults changed

These pieces now behave differently by default, or have something new. You will feel these when you add UI.

| Piece | What changed | How to use it |
|---|---|---|
| `Tabs` (`components/om/tabs.tsx`) | A tab's count is a **quiet grey** badge by default (was the DS red) | Pass `countTone: 'late'` on the item only when the count is overdue and the member's own |
| `MetaChip` (`components/om/meta-chip.tsx`) | New `kind="fact"`, in sentence case; the default `kind="status"` keeps the DS capitals | Capitals are for a status only. A date, type, count, name or topic is `kind="fact"`, or plain secondary text |
| `DropdownLabel` (`components/leads/dropdown.tsx`, `.label` in `components/leads/menus.module.css`) | Every menu's group title is sentence case at the house caption (12), not 10px capitals. This applies app-wide | Write group titles as topics in sentence case |
| `DateField` / `DateTimeField` (`components/om/date-field.tsx`) | The box **shows** "7 Oct 2026" / "7 Oct 2026 · 2:00 PM" (`fieldDateWords` / `fieldDateTimeWords`). It **still holds and hands on** `d/m/yyyy` (`d/m/yyyy, h:mm AM`) | Your `value` / `onChange` are unchanged. A test reading the box's text now reads the words |
| `lib/format.ts` | `relativeTime` is spelled out ("5 min ago", "3 hours ago", "yesterday", "4 days ago", then the house date). `displayDateTime` uses "· 10:00 AM", never a comma. `spanWords` / `durationWords` read "26 hours", "30 min". New: `EMPTY` ("—"), `savedLabel(updatedAt, now)` | Use `savedLabel` for any editor's "Saved …" ("Sep", never "Sept") |
| The Maison AI button (`components/shell/maison-fab.tsx`) | It **steps aside** while page content sits under its resting place. At a desk (`data-aside="fade"`) it fades; it comes back when the pointer is within 120px, and its 48px box still takes a press. Under a finger (`data-aside="pass"`) it steps aside only from a filled button, letting the tap through. It starts tucked on a project page on a phone. ⌘J always opens it | Turn it off with `data-om-no-fab-aside` on `<body>`. Lists can still end with `--fab-clearance`. A probe that clicks near the corner brings it back, so one retry is normal |
| The detail card head (`components/leads/detail/card.module.css`) | Bold sentence case, 14/600, on-surface; the 48px head is kept (was 12/600 grey capitals) | Every Overview card on a lead and a project. Write card titles in sentence case |
| `EmptyState` (`components/om/empty-state.tsx`) | `help` is optional (no empty paragraph). New `primaryLook: 'filled' \| 'outlined'` (default `filled`) | Meant for record pages (a lead's, a project's), so the page header keeps the one filled button. Nothing passes it yet: the lead's Meetings first run is still filled (B2's 2-04) |
| Snackbar (`components/om/snackbar.tsx`) | New `useDismissNewest()`: while a snackbar shows, the first Esc dismisses it and a second goes Back | — |
| New: `DemoNote` (`components/om/demo-note.tsx`) | One quiet "Demo" chip, its sentence in a Tooltip | Use it for any stand-in card instead of a "Simulated on this prototype — …" line |
| New: `InfoTip` (`components/om/info-tip.tsx`) | An info glyph: a tooltip, plus the snackbar on a press (a finger has no hover) | For "where these records come from" and prototype notes beside a title |
| `PageHeader` / `PageHeaderL2` (`components/shell/`) | `PageHeader` takes `after` (drawn right after the h1, e.g. Beta and an InfoTip). `PageHeaderL2`'s `title` is optional (a crumb-only header) | — |
| `StatTile` (`components/om/stat-tile.tsx`) | Labels are sentence case; `look="card"` | — |
| `Timeline` (`components/om/timeline.tsx`) | In a container under 360px the time goes above its sentence | — |
| Column settings (`components/om/column-settings.tsx`) | The pin shows on a row's hover / focus; the help is an ⓘ tooltip; "Pinned · up to 3" | — |
| `FolderGroup` (`components/om/folders/folder-card.tsx`) | New `head?: boolean` hides the "Folders" heading | — |
| `LibraryGallery` (`components/company/templates/library-gallery.tsx`) | The scope pill's default noun is "Status" (was "Show"); a phone keeps the noun ("Kind: All") | Name the pill by what it filters |
| `AiBrief` (`components/leads/detail/ai-brief.tsx`) | `single` draws the lead's one-action card; an empty `tag` draws nothing | A project keeps its stack of briefs |
| `InfoColumn` (`components/leads/detail/info-column.tsx`) | Shows only rows with a value. Pass `onEditField` to draw the "Add …" link that opens Edit details on that field; the link is drawn only when it is passed | — |
| Rail badges (`BADGE_LOOK` in `components/shell/app-rail.tsx`) | Each item's mark is `count` · `dot` · `quiet` · `none`; the count is in the item's `aria-label` | A test reads the `aria-label`, not the badge |
| Report pickers (`components/company/reports/report-pill.tsx`) | New `PickPill` ("Report: … ▾" / "Period: … ▾"), `HowCounted`, `FoldButton` | Every report bar uses them |
| Folds | `HowItWorks` in `app/settings/how-it-works.tsx` (Settings) and a different `HowItWorks` in `components/company/price-book/how-it-works.tsx` (the Price book's dialogs) | Two pieces share one name: import the right one |
| `PrivateLinkBadge` (`components/quotes/confirm/private-link-badge.tsx`) | One "Private link" badge on every client link page | — |
| `FinanceCards` (`components/finance/finance-cards.tsx`) | Finance lists on a phone, on the Leads card model | — |
| The quote's `DEFAULT_COLUMNS` (`lib/quotes/items-model.ts`) | Discount and GST (%) are off for a quote with no stored set; a line that uses either turns its column back on | — |

---

## 5 · What this build did not change, and why some findings were left

**Kept by the contract.** These are the owner's earlier calls or 1.0's names. Only their wording or noise part was done:
- Qanvast Ops and its Studios tab (REG-77): 1-13, 2-07.
- Quotes and Contracts in Tools (REG-422); no tool merges; the tools keep their names: 1-12, 6-06, 6-26, W-018.
- The rail's and the dock's order: 1-14.
- Settings and Company stay two places: 5-52.
- Rows, cards and tiles in `moneyCard`, documents keep cents: 3-21.
- Floorplan to 3D's landing was kept as the 1.0 audit of 2026-10-27 left it (REG-3070…3074): 6-10, for that tool.

**Left because it would change data, a rule or a figure:**
- **4-05.** The signed contracts' date is 13 days off. `lib/db/demo-day.ts` `EMBEDDED` doesn't shift the date inside the signed body. Fix: add
  `date.contract` to `EMBEDDED`, or re-run the snapshot after a restore.
- **2-45.** Olivia's seeded file names ("IMG_2041.jpg") and her trail are seed / repair / baseline data.
- **3-49 (partly).** The stored default "Mid-Project" is written into stage logs. It shows as "Mid-project" only.
- **3-51 · W-328.** The lead's On Hold needs a follow-up day by its rule (REG-453). One chip set shared with the project's needs a rule change.
- **5-44.** Units are the studio's stored words. Settings › Units owns them; spelling them one way is a data change.
- **4-33.** The demo's stored Default Quote PDF (`quote_templates.design_json` / `draft_json` and its `quote_template_versions` rows) still
  holds "Sales Contract", "Gst {gst_rate}:" and "Fax:". A repair needs to rewrite them; the preset (a seed) already says "Quotation".
- **5-07.** One basis for profit. Profitability is named apart instead. Moving it before GST would change the project Payments tab's own figure.
- **5-19.** One period list for every report. Each report keeps its own options. Leads, Meetings and Studio health count rolling ranges;
  Finance counts calendar periods.
- **6-09 · W-456.** A soft delete for X-Ray comparisons needs all of these:
  - `quote_comparisons.deleted_at`;
  - restore and delete-forever actions;
  - a read filter;
  - an Activity rule.

  Today's delete is unchanged; it now sits in the row's ⋮.
- **3-36 (second half).** Hiding an empty portal section is the server's rule (`fetchPortalLook`).
- **2-27 (partly).** Qanvast Ops keeps Credits on every row. It is a per-lead charge, and hiding it could hide a different value.
- **4-25 (partly).** The quote's Markup cell keeps its figure. It is an editable number the line computes with; the Price book list shows the
  short "S$60 (32%)".

**Left for another reason** (no house piece for it, or the owner's call first):
- **1-27.** Opening the phone's /tasks on My tasks would switch lists after the first paint.
- **2-28.** Open tasks' "1 is yours": the card's tasks carry no members.
- **3-09.** Folding the lead's brief to one sentence on a phone would drop its point.
- **3-08 (Activity).** The 14 type chips → one scope pill. This changes the lead's and the project's Activity and `ux-p3`'s assertions, so it
  is left for the owner.
- **3-06 (partly).** Clamping long quotes to two lines in Recent activity.
- **3-07.** Needs your attention unfolds in place ("Show n more") on a project, not in a review list. Only the Dashboard opens a drawer.
- **Issues keep the house Chips** for Open · Closed · All. 3-08's pill was not used.
- **4-02 (partly).** The phone's reading cards follow the print, not the quote's sections.
- **4-03 (partly).** One-line summaries for the editor's folded sections at a desk were not built.
- **4-09 (partly).** The view-only page's phone bar keeps "Download". "Download a copy" pushed Message {designer} off a 390px screen.
- **4-17 (partly).** Naming a library editor once, in its header, needs an editable title in `contract-header.tsx`.
- **4-35 (partly).** Brand kit autosave. It would remove Discard and the leave guard, so Discard · Save changes stay.
- **4-36 (a phone).** A contract template's gallery card says "n clauses" at a desk, but its phone row still says "n headings"
  (`galleryFacts` in `components/contracts/template-screen/template-words.ts`).
- **W-157.** Copy name and Show full content were moved under More ›, not dropped.
- **5-10 (Commission).** Its grouped rows keep the house CreditsTable cards on a phone; a card design wasn't drawn.
- **5-26 (partly).** Reports › Profitability's single-string Project cell stays, because it is also Export's column.
- **5-37.** Client portal › Set up keeps its Clients card; another probe reads its handles.
- **5-05 (follow-on).** Notifications' ~105 event rows are not folded by area yet.
- **6-10.** Floorplan to 3D's landing (above).
- **6-31.** The planner's "Your studio" materials head stays; a mark on each swatch would be new UI.
- **W-466.** The planner gallery's "5 layouts" title is `LibraryGallery`'s.

---

## 6 · Probes

- **How changed assertions are marked.** Every text assertion the new words broke was restated in place and marked
  `(the calm UI build 2026-10-27, a deliberate change)`.
- **How many.** Across `design-source/verify/`, **812 lines in 171 probe files** carry that phrase. 708 of them use the exact bracketed form;
  the rest carry it inline or across a wrapped comment. Counted 2026-10-28.
- **No functional assertion was weakened.** Where a control moved, the probe now opens the ⋮, the fold or the drawer first, then asserts the
  same rule.

**Each lane's last run** (`design-source/verify/regression/run.cjs`, a fresh base copy per probe):

| Lane | Result | Failures that aren't this build's |
|---|---|---|
| B1 | green on its ids | `dash-d1` (390, the ghost's Your day 24px taller) and `dash-d4` (the meeting row's ⋮ › Prepare me) fail the same way on the base before the build. `dash-d3` has a late-evening clock branch |
| B2 | 21 / 21 | — |
| B3 | 17 / 17 | — |
| B4 | 44 / 44 (2,811 checks) | — |
| B5 | 16 / 19 | `pm2-s09`: `homeOfRole` has sent Accounting to `/dashboard` since the Dashboard redesign. `pm2-s31`: two View as studio-switch checks |
| B6 | 12 / 12, plus the extras it reaches | `pm-h`'s harness path breaks under `RUN_DIR`; it gives 50 / 50 run from the repo |

**When you run them:**
- **Clock-dependent probes** (`ux-p3`, `pm2-s27`, `pm2-s42e`, `pm2-s43b`, `rwd-w2`, `dash-d3`) need a base restored to today:
  `DATABASE_URL=file:<scratch>/base.db npx tsx scripts/restore-baseline.ts`.
- **If a probe outside the regression set fails on an old word,** restate it to the new word with the same mark. Every lane listed the ones
  it found (B2 §7, B4 §7, B5 §7, B6 §5).
- **If it pressed a moved control,** open the place the control moved to first (§2). Don't drop the check.
- **Common snags:**
  - Rail counts: read the item's `aria-label`.
  - A date field: its box shows "7 Oct 2026".
  - The Maison AI button: may need one retry near its corner.
