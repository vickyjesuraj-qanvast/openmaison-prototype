# Lane B3 — the calm UI build (2026-10-27): Projects, the client portal, Issues, Messages

Worktree `.claude/worktrees/agent-aefeee72b54c71b5c`, WIP base `9db98dc3`, nothing committed after it. Built by the lane and three forks of it
(Messages + Issues · the client portal · the project's working tabs and moments), each on the brief's §1–§3, then checked together: one type
check, one lint, one design lint, one guard, one production build, the lane's probes.

## 1 · Built

| Finding | What was done |
|---|---|
| 1-21 | Messages: internal conversations wear one "Team" tag (STUDIO · DIRECT · GROUP · CLIENT gone); a client's conversation is titled "{Name} · client"; the readers line is said once, under the composer ("Benjamin and Mei Ling see this"); the empty pane is "Pick a conversation" alone; New message ▾ outlined at a desk (Send is the one filled); ⌘K tags a client's message "Client". |
| 1-22 | Issues: the card leads with the subject, then "{project} · {category} · 18 Oct · T-…"; "Your turn" / "Benjamin's turn" with the avatar's tooltip "Handled by …"; no "Open" status on the Open list; chips "Open · 3 · Closed · 1 · All · 4"; the drawer's category is a fact row, "Reported by Mei Ling Han on 18 Oct", Mark resolved outlined, "Note · team only". |
| 1-30 | Projects header = title · New project · ⋮ — the outlined Insights became the ⋮'s first row "Reports" (same gate, same handle); the five tiles one look (next row). Tools › Quotes and Meetings are B4's / B2's. |
| 1-31 | "Bill AF-7781 from AquaFlow Plumbing Works" on the project's rows (lib/projects/money-needs.ts); the Dashboard's health line is B1's (request). |
| 1-32 | The row's verb is "Approve" (its send dialog still says Approve and send), its meta "margin left on this work: 23.8%"; the Review pane's title and byline are B1's (request). |
| 2-40 · 3-25 | The panel is "Client portal" (title, its loading label and snackbars; the project ⋮ row "Client portal"); one state per person — the chip names it, the line says when and who; "1 turned down"; "10 files, none shared yet". |
| 3-01 | One door per step: the brief no longer repeats the header's button at a desk (it offers the other help); the Schedule's ask band is gone (the ask is said on its row, opened from the row's ⋮; Approve · Decline in the panel); a milestone with an ask for more time and a late Mark done is one Needs row ("… asks for 1 week more on Carpentry fabrication · 6 days late — to end it Wed 28 Oct · Approve", Mark done in its ⋮); a late start with no contractor booked is one row too (Add a contractor, Start in its ⋮). |
| 3-02 | The tab reads "Payments" (strip, page title, Overview card, paper pages' crumb and Back, the Start sheet's region, the books' two-tab strip); inside: "Client payments" (was Billing) · "Costs" · "Variation orders" (was Changes to the contract). The slug, `?open=` and every address stay `money`. Portal's tab "Payments" (route `money`). Finance's Money in / Money out are B5's (request). |
| 3-03 | "To collect" on the Overview card (was Outstanding) and in the invoice panel's totals (was To pay); the receipt says "Balance due" (was Still owed); the tiles' empty lines "Nothing to collect / to pay right now"; "22% · 29% of the work done". The Dashboard Pulse and Profit's "Cash so far" are B1's / B5's (requests). |
| 3-04 | "Payments · 4" on the Overview card; Client payments' first column "Payment" (was Stage); the portal says milestones ("2 of 7 milestones done", "The milestones ahead…"). |
| 3-05 | The Payments tab's Needs rows are the Overview's row (one text verb, every other step in the row's ⋮, no filled button — the page keeps the header's one); no "Open" beside a ⋮ in Client payments or Variation orders (the name and the row open the record; the old step's handle rides on the name). The phone card's "Next step ·" label is CreditsTable's (B5, request). |
| 3-06 | A Needs row's title takes the room first (basis 60%); one verb and its ⋮ wrap together under the caption when they don't fit. Recent activity's narrow card is B2's ActivityCard on B1's timeline (request). |
| 3-07 | "Needs your attention · n" on the Overview and the Payments tab; the approvals' group "Approvals · n"; three rows before "Show n more" at every width; red on the one worst late row only; one milestone, one row (3-01); "You're all caught up". "See all n" stays an in-place unfold (T-14 allows it; the Dashboard's pane is B1's). |
| 3-08 | A grouped tab's views are the DS SegmentedButton (was chips) — same addresses, counts, radio semantics; the Payments tab's phone switch (Client payments · Costs), Client payments' four views, Workload's Members · Contractors and Contractors' By contractor · By site too; Choices / Floor plan / Compliance filters are one scope pill each (fork). Issues keep the house Chips (▲ 2). Activity's 14 type chips are B2's LeadActivity (request). |
| 3-09 | On a phone's Overview the header draws no filled button — the brief (the first card there) leads with the step; on the other tabs the button's words wrap to two lines, never cut. The brief's fold to one sentence is B2's AiBrief; the FAB starting hidden is B1's (requests). |
| 3-10 | Portal home: "Electrical is paused — resuming around 27 Oct. Handover is planned for Fri 13 Nov." |
| 3-11 | Phone listing: the tiles fold into one line of doors under the pill ("3 need your attention · 3 wait on the client · 3 in progress · S$ 261.9K open", same handles); a card says its top reason in red and "+n more" (pressed, all of them in place); the corner reads "Added …". |
| 3-13 | Client › Messages is the client's conversation; the Team conversation is a quiet "Team chat" link in its head (and back); no "Client" tag on lines in a client-only thread (kept in /chat). |
| 3-15 | Workload / Contractors: "Each person runs up to 4 projects" + Set capacity; loads "Full" / "n free slots" (one map, also in Reports); the row's Insights reads "Reports"; "Assign to a project" only on rows where work waits, else in the row's ⋮; Add a contractor outlined; codes off the rows; names wrap; "Checked by"; the project tiles hidden on these views. |
| 3-16 | Brief tag "Completed · 50 days on site"; the handover's margin line "Margin 79% — the quote planned 24%", warning only below a plan above 0; the closing summary's captions wrap. |
| 3-17 | Handover sheet: each row its state + ONE verb, the rest in its ⋮; "Defer" → a quiet "Leave for after handover" tick (same reason field); compliance marks collapse to "n items left · Open Compliance" (each still in the ⋮); one-line intro; "Hand over anyway". |
| 3-19 | One Mark done look — the outlined "Mark done", on running milestones only (desk, phone, Compliance); a not-running milestone still reaches it from its panel / ⋮. |
| 3-22 | One Needs row component for the Overview and the Payments tab (the Payments tab's is that row filtered to money, keeping each band's handle). |
| 3-23 | Schedule summary: paragraph folded into the headline; "+3 days from changes" and who sees it as one line; legend behind a "?" tooltip; pills "30% · 21 Aug"; status lines wrap; Next payment "S$ 13,370 to confirm" — the sum that waits (Money's own to-confirm figure; the fork's first cut printed the invoice's S$ 23,370). |
| 3-24 | Scope menu: "Needs your attention — Late, stuck or quiet", "Waiting on client — Something for them to answer", "Approvals — Waiting for your approval" (each full list in the row's tooltip). The groups' capitals are B2's DropdownLabel (request). |
| 3-26 | Payments › New ▾ = Variation order · Invoice · Purchase order · Supplier bill · Expense, no helpers; a kind made more than one way opens its ways in place with a way back. |
| 3-27 | Choices card: room / milestone / needed-by as words; one status tag; option names wrap; Share again outlined; Choose with {client} in the card's ⋮; "Group: By room ▾" pill. |
| 3-28 | Floor plan: Select · Pin · Pen · Text on the row, the other nine under "More tools ▾"; one "Show: Both · All trades ▾" pill; no Main plan tag with one plan. |
| 3-29 | Compliance: the phase as one pill; "4 of 6 items done · 4 required left"; the record's property type; plain headed lists, no ITEM head; the title opens the item; "Required" as words. |
| 3-30 | The brief says a late milestone is late: "Carpentry fabrication is 6 days late — Michelle asks to finish 28 Oct ’26." — and never names the same milestone twice. The yellow "This week" tag is B2's AiBrief (request). |
| 3-31 | Header chips (number, project type, property type) gone — Project info / Property info say them; the hold's day and reason are said once (its Needs row; Progress shows how long and who reads why; the brief says when it resumes); Before work starts drops "Setting up for n days". |
| 3-34 | Start / Rebuild the schedule: only the ways that work today, one line each; the rest one grey line "Make a quote first to build from it"; "Build the schedule from"; the template's helper only when a Settings rule picked it (where to change it), the ready-made-for-this-home sentence gone. |
| 3-35 | Portal bell rows say the outcome once acted on ("VO-1 approved", "VO-2 declined"). |
| 3-36 | Portal desk bar = Home · Schedule · Updates · Payments · More ▾ (the same sections, with counts). Hiding an empty section is a server rule — not done (▲ 6). |
| 3-37 | "Issues" on screen across the studio (page, view, New issue, dialogs, drawer, ghosts, Issue categories, the attention reason "Issue flagged to the Owner"); "In progress" reads "Being fixed" (one map); Escalate → "Flag to the Owner"; portal Updates gets a page glyph. Routes, slugs, testids, ⌘K words stay. The rail's "Tickets" is B1's (request). |
| 3-38 | The listing's five tiles are the Dashboard's white card (`look="card"`), each boxed by a hairline, the value tile boxed too; shown only where they count (not on Workload / Contractors / Completed). |
| 3-39 | "Open projects · 4", "Needs your attention · 4", issue / portal chips "Label · n", no zero counts. |
| 3-40 | "Deleted projects", "Project settings", "Copy link", "Delete forever", "Delete all forever". The lead-mock words (Contact Log, Add Task, New File, New Meeting, Ask Client, View Client Info) and Filters' "Clear All" are B2's / the house modal's (request). |
| 3-44 | Invoice panel: "Copy the client's link"; "No credit notes. Issue one to take money off this invoice."; totals "To collect". |
| 3-46 | Milestone panel: Bar colour under "More options"; the ask band's Approve outlined. Its dates as "27 Sep 2026" are the house DateField's (B1, request). |
| 3-47 | Deleted projects: one line under the title, no banner / foot note; no Client column (the client rides on the number's line when the name doesn't say it); Restore the row's verb, Delete forever in its ⋮. |
| 3-48 | Portal Choices: "Your designer is finding other options for the bathroom tiles."; no state tag under a heading that says it. |
| 3-50 | Portal Files: the whole row opens (chevron); sentence-case heads; "Contract" (was Agreements). |
| 3-51 | **Not done — kept by the contract.** The lead's On Hold needs a follow-up day by its rule (adding "No date yet" there is a rule change, B2's); dropping it here would make "Custom left empty" mean no date — the same capability, harder to find. ▲ 3. |
| 3-52 | Portal schedule: "You are here" sentence case on the milestone under way; invoices under Payments when the chips show; "· n" counts. |
| 3-53 | Stage ▾: no Active / Inactive heads on four rows; "Done 21 Aug ’26" on Setting up, "since 21 Aug ’26" on In progress. |
| 5-13 | The project's PO / invoice approval row: one verb "Approve" + ⋮ (Send back · Open). Finance › To do is B5's. |
| 5-42 | Company › Client portal › Clients: the access chip says the state only (Opened · Invited · Not invited · Withdrawn); the date stays in Last opened. |

**Touches (another lane's finding, my files):** 1-01 / 1-08 / 1-09 (row words + one milestone one row, in lib/projects/needs-you.ts · money-needs.ts) · 1-02 (scopes.ts) · 1-10 · 1-11 · 1-16 · 1-24 · 1-25 · 1-26 · 1-37 (Messages / Issues) · 1-43 (lists end with the FAB's clearance; hiding the FAB in an open conversation is B1's) · 3-12 (New milestone · New update · New choice · New plan · New issue, outlined) · 3-20 (listing dates kept: "On hold till: Sun, 29 Nov ’26" mirrors the Leads listing's words, Dane UAT 5.13 — changes with B2's) · 3-21 (the listing's money columns as cards "S$ 48,600"; the Overview card already was) · 3-49 (the source fix is B2's stage-data, request) · 4-04 (VO "With client"; invoices already "Waiting for approval") · 5-06 (Client payments; tiles' words) · 5-09 (Reports › Projects: "Project length", "Days to get paid", "Usually" + the average in a tooltip) · 5-18 (one "Save" label on the two invoice cards) · 5-33 ("Handover needs approval", the pointer a link) · 5-34 ("Count a client's proof of payment before you check it").

**The approved confirm step** — confirming a client's payment now asks once: "Confirm {client}'s payment?" with the sum, the invoice, the day it was paid and what follows ("It counts as collected and {client} gets the receipt."), Confirm payment / Cancel. Every Confirm goes through it — Needs your attention's (Overview → Payments `&do=confirm`, and the Payments tab's row), the Payments view's row, the invoice panel's — then the same action, sentence and Undo as before.

## 2 · The ledger — every moved action (what · was · now)

**Projects listing**
- Reports (Company › Reports › Projects) · the header's outlined "Insights" button (`open-insights`) · the header ⋮'s first row "Reports" (same handle, same gate).
- The five tiles on a phone · two rows of grey tiles · one line of doors under the pill (`tile-attention` · `tile-waiting` · `tile-month` · `tile-in_progress` · `tile-value`, the same presses).
- The five tiles on Workload / Contractors / Completed · drawn (counting open projects) · not drawn there; every other scope keeps them.
- A phone card's every attention reason · all in red on the card · the top reason + "+n more" (`card-attention-more`), pressed shows them all.
- Scope help paragraphs · under each scope row · one line under the row, the full list in the row's tooltip.

**A project's page**
- Number · project type · property type · header chips · Project info's Number / Project type and Property info's Type rows (the Overview's info column; View client info on a phone).
- The next step on a phone's Overview · the header's filled button (`project-primary`, still in the DOM, hidden ≤767 there) · the brief's first button (the same action) and the Needs row.
- The views of Tasks · Client · Design · Files & notes · chips (`project-view-chips`) · a segmented control (same handle, radios, counts, addresses).
- Stage ▾'s Active / Inactive heads · group labels · gone; the divider keeps On hold apart.
- The project ⋮'s "Invite to Portal" · row · the same row, "Client portal".

**Overview**
- Send back / Decline (`need-send-back`) · Change · Remind · Call (`need-secondary`) · second text button on a Needs row · the row's ⋮ (`need-more`), the same testids on the menu rows.
- A late milestone's Mark done when an ask for more time waits on it · its own row · the ask's row ⋮ (`need-also`); a late start's Start when no contractor is booked · its own row · the "should have started" row's ⋮.
- The hold's reason · the brief + Progress's note + the Needs row · the Needs row (Progress: how long, and who reads why).
- "Setting up for n days" · Before work starts' head · the brief's sentence ("…has been setting up for n days").

**Payments tab**
- Each Needs row's second step — See the bank's confirmation (`payment-proof-link`), Not received (`payment-not-received`), Remind on WhatsApp (`invoice-remind`), Call {client} (`invoice-call`), Send back, Open, Record a payment, Change the amount, Record the refund (`money-credit-refund`, when Use is the row's verb), Message {vendor} (`po-late-message`) · text buttons beside a filled one · the row's ⋮ (`<band>-more`, e.g. `invoice-overdue-more`), the same testids on the menu rows.
- Approve and send (`banner-approve` · `costs-approve-po`) · a filled button · the row's one text verb "Approve" (same handle, same send dialog).
- An invoice's "Open" (`invoice-open`) · Next step column · the row and its name (the handle rides on the name); a VO's "Open" (`vo-open`) · Next step · its number link (the handle rides on it).
- New ▾'s variants — From a contractor's quote · Record an invoice made elsewhere · Order from the quote · Record a PO made elsewhere · top-level rows with helper lines · one level in, under Variation order · Invoice · Purchase order (with a way back); the helper lines are gone (each dialog says what it does).
- Billing's and Changes to the contract's help lines · a line under each table's title · "How client payments work" / "How variation orders work" tooltips in the same place (`money-billing-how` · `money-variations-how`).
- Client payments' four views (`money-billing-view`) and the phone's list switch (`money-list-switch`) · chips · segmented controls (same handles, radios).
- Workload's Members · Contractors (`workload-of`) and Contractors' By contractor · By site (`contractors-by`) · chips · segmented controls (same handles, radios).
- Confirm a client's payment · one press · a press, then "Confirm payment" in its ask.

**Deleted projects**
- The retention banner (`deleted-projects-banner`) and the foot note · a dismissible banner + a paragraph · one line under the title (the handle on it).
- Client column · its own column · the number's line, when the project's name doesn't already say it.
- Delete Forever (`deleted-project-forever`) · a red text link on the row · the row's ⋮ (`deleted-project-more`), "Delete forever".
- Empty Trash · head button · "Delete all forever" (same place).

**New project** — the split field's helper ("From Company › Templates › Payment schedules…") · under the field · removed (W-524).

**Schedule, Compliance, Choices, Floor plan, Handover, Workload (fork)**
- Ask band and Open it · above the list · the asking row's line (`schedule-asks`) + the row ⋮ "Open the ask" (`asks-open`); Approve / Decline stay in the panel.
- "+n days from changes" · toolbar · summary line. Who-sees toggle (`client-sees`) · toolbar · summary line (desk; the phone bar unchanged).
- Legend paragraph · under the chart · "?" tooltip (`schedule-legend`).
- Phone Done · every unfinished row · running rows only; others via the panel's Status / the desk ⋮.
- Bar colour · open in the panel · "More options" (`panel-more-options`).
- Start / Rebuild's unusable ways · disabled cards · one grey line (`source-not-yet`); the template helper · under the select · kept only when a Settings rule picked the template ("Settings › Projects starts every partial renovation here" — where to change it); the ready-made-for-this-home sentence removed (the select names it, the preview shows it).
- Compliance phase chips · a row · a pill (`compliance-phases`) + menu rows (`compliance-phase-<key>`); "Details ▾" · each row · the title; the "ITEM" head · each section · removed.
- Choices grouping chips · a row · a pill (`choices-group`); Choose with {client} (`choice-choose`) · the band · the card's ⋮; room / milestone / needed-by tags · card head · a words line.
- Floor plan's nine tools · a chip row · More tools (`plan-more-tools`); whose marks, Show resolved and trade chips · the rail · the Show pill's menu (`plan-show` → `plan-who`, `plan-layers`, `plan-resolved`); the Main plan tag · toolbar · removed; a single plan's chip · under the views · a name line (`plan-name`).
- Handover sheet's extra verbs · a row · the row ⋮ (`check-<key>-more`, keeping `check-<key>-fix` / `-go`); Defer · text button · a "Leave for after handover" tick (`check-<key>-defer`).
- Workload's count line · caption · tooltip + `data-counted`; "studio default" · row · `data-default`; Put on a site · every free row · a verb only where work waits, else the row ⋮ (`contractor-menu`, + "Open in Finance › Vendors"); the contractor code · row · the vendor record (search still matches it).
- Settings › Projects' handover pointer sentence · settings · one link (`handover-review-pointer`).

**Messages and Issues (fork)**
- Client / Team switch · chips in the conversation head · text links (`conversation-channel-team` · `conversation-channel-client`) in the same `conversation-channel` span (`?channel=team` unchanged).
- Issue number · the card's start · the end of its second line; project number · card · the drawer's Project row; reporter · card · the drawer ("Reported by … on …"); "Open" status chip on the Open list · every card · the drawer and the All / Closed lists; category tag · drawer head · its Category row.
- /chat head's readers line · the head and under the composer · under the composer only; its Direct / Group / Studio / Client tags · the head · gone (one Team tag on internal rows); the empty pane's help line · under "Pick a conversation" · removed.
- New message ▾ (`chat-new`) · filled · outlined at a desk (Send is the one filled); Mark resolved (`ticket-resolve`) · filled · outlined; the project's New issue (`new-ticket`) · filled · outlined.

**Client portal (fork)**
- Choices · Designs · Floor plan · Messages · Issues · About · Files on a desk · links in the bar · rows of the bar's More ▾ (`portal-nav-more` → `portal-nav-more-row[data-key]`); the phone dock unchanged.
- Files › Documents' "Open" · a link at the row's end · the whole row (`portal-document`).
- The choice card's state tag on the client's page · under a heading that says it · removed (the studio's preview keeps it).
- The access chip's "when" · on the chip · the person's line (panel, household) and Company › Clients' Last opened column; "Not invited yet" · a caption · the chip says it.
- The schedule's invoices under All (when the chips show) · among the milestones · under the Payments chip (each milestone's own payment line stays).

## 3 · Words

108 rows in the work list. **Applied: 102** (4 of them in part — the other half is another lane's file: W-042 the rail, W-054 Members, W-101 the scope menu's heads, W-236 permissions). Mine 49 (W-001 · 005 · 014 · 017 · 022 · 026 · 037 · 042 (tab) · 048 · 064 · 101 (Stage ▾) · 122 · 134 · 145 · 151 · 155 · 170 · 194 · 203 · 217 · 218 (⋮ row) · 239 · 271 · 278 · 300 · 308 · 381 · 385 · 398 · 414 · 426 · 441 · 490 · 497 · 505 · 511 · 524 · 525 · 537 · 559 · 560 · 561 · 573 · 581 · 591 · 615 · 622 · 638 · 642), the portal fork 14, the tabs fork 27, the Messages + Issues fork 14.
Adapted (as §2 says, or the facts did): W-014 "Approvals" (§2), W-048 "asks for 1 week more on …" (the bell's own words for the same ask), W-155 "The signed contract · Link it, or upload the signed copy · Add" (the row's verb stays its button), W-271 / W-560 "Approvals — Waiting for your approval" (§2 over the row's "Needs my review"), W-559 "Needs your attention — Late, stuck or quiet" (§2), W-615 "Done 21 Aug ’26" / "since 21 Aug ’26" (the house date), W-398 / W-622 "Write" (one verb on both rows), W-468 / W-469 (fork: the window can be 2 weeks or 30 days), W-580 "Closed" (§2 over "Resolved"), W-093 "VO-1 approved" (a household answers, not only "you").
**Not applied (6):** W-123 (superseded — §2 names the region "Client payments"), W-328 (3-51, ▲ 3), W-629 (B2's AiBrief draws the tag — request), W-477 · W-550 · W-566 (Questionnaire's empty state, the commission Activity line, Meetings' toolbar — no file of mine; requests).


## 4 · The guard

```
✓ pages: none gone
✓ server actions a screen calls: none gone
✓ control handles (data-testid · data-kb): none gone
✓ keyboard shortcuts: none gone
  new handles: 27
```

## 5 · Probes

**All 17 green.** First run on build 1 (all 17 ids, port 3431), then a re-run of nine on the final build (the ones that failed or that the later edits touch). Logs: `$RL/B3/run/lanes/<id>/probe.log`.

| Probe | Final | What I restated (each marked `(the calm UI build 2026-10-27, a deliberate change)`) |
|---|---|---|
| pj-r1 | 98/98 ✓ (re-run) | the tile's "Needs your attention"; the reports' door is ⋮ › Reports (`open-insights` on the menu row); the scope menu's "Needs your attention" · "Approvals" order; ⋮ row "Client portal"; the stage menu's "since …" (pj-gap-a) |
| pj-r2 | 87/87 ✓ | (fork) the phone's Mark done on running rows; "New milestone" |
| pj-r5 | 91/91 ✓ (re-run) | the listing's money "S$ 81,355"; the tab "Payments"; New ▾ › Variation order › New variation order; the VO pill "With client"; the crumb "Payments" |
| pj-r6 | 82/82 ✓ (re-run; build 1 had printed the Money rows whole-dollar) | Remind / bank's confirmation / Not received through the row's ⋮; the confirm step's "Confirm payment"; "says they paid"; the trust switch's new words |
| pj-gap-b | 72/72 ✓ | New ▾'s kinds and ways (Invoice › One-off invoice / Record one made elsewhere, Variation order › From a contractor's quote) |
| pj-gap-c | 105/105 ✓ (re-run; the Settings-rule helper put back) | (fork) the ask on its row, the Start card's grey line, More options; (me) "asks for 1 week more on …", Decline through the row's ⋮ |
| pj-gap-d | 65/65 ✓ | — |
| pj-gap-f2 | 84/84 ✓ (re-run) | "Refund S$1,090.00 to …" |
| pm-a | 46/46 ✓ (both runs) | New ▾ › Invoice › One-off invoice; Remind / Call through the overdue row's ⋮ |
| pm-e | ✓ | "VO-1 adds 3 days — update the schedule?" (+ the fork's message wording) |
| pm-f | ✓ | (fork) portal chips "· n", invoices under Payments |
| pm-g | ✓ | (fork) "Team chat", "Benjamin Han · client", the "New issue" dialog |
| pm-h | 50/50 ✓ (re-run) | a harness path, not a page: `path.join(__dirname,'..','..','..','public',…)` isn't patched by run.cjs, so the lane copy looked for the picture three folders above the lane (28 checks had passed); the picture is put where it looks for the re-run |
| pm2-s26 | ✓ | — |
| pm2-s45b | 72/72 ✓ (both runs) | (fork) "n free slots"; (me) "No contractor booked" |
| pm2-s46b | 80/80 ✓ | (fork) "Issues", "New issue", "Which project is this issue for?"; (me) See it as Ryan after "Client portal" |
| rwd-w3 | 57/57 ✓ (re-run) | the Money list's rows are the Overview's Needs row — the words' width is read from the row's label (was the banner's text) |

Also restated where other lanes' probes read my words: pj-r3 (Approvals, "Send Ryan this week's update", Send back through ⋮, "Last update to"), pj-r4a · pj-r4b · pj-r8 · pj-r9 · pm2-s05 · uat P6 (the "Client portal" row and panel, both words accepted), pj-r7 (Deleted projects, Delete forever through ⋮, "Hand over anyway"), pj-fix-E (Deleted projects, both cases), pj-gap-a (the hold's reason on its row), pj-gap-h (Issue flagged to the Owner), pj-gap-i (Project length), pm-b (New ▾ › Purchase order, Message {vendor} through ⋮), pm-i · rwd-c2 (the tab "Payments"), pm2-s06 · s07 · s12 · s19 · s41b1 · s41b4 · s42d (New ▾'s ways; the credit's refund through ⋮; the confirm step), verify-reports (Project length), and the forks' own (see their notes in §5 of the ledger above).

## 6 · Measures — the audit's measure, first screen, before (the audit's lane-3 table) → after

Shots: `$RL/B3/shots/before-<finding>.jpg` (the audit's) and `after-<screen>.png` (1440 · 390 touch), plus `after-<screen>-<width>[t].png` at 1280 · 1024 touch · 768 touch · 390 touch · 320 (no sideways scroll anywhere).

| Screen | Words | Controls | Purple actions | Filled | Capitals | Cut |
|---|---|---|---|---|---|---|
| projects-1440 (`/projects`) | 216 → 223 | 37 → 36 | 4 → 4 | 1 → 1 | 21 → 21 | 7 → 7 |
| projects-390 (`/projects`) | 109 → 123 | 18 → 21 | 3 → 5 | 1 → 1 | 6 → 2 | 9 → 10 |
| workload-1440 (`/projects`) | 169 → 122 | 21 → 16 | 4 → 4 | 1 → 1 | 11 → 0 | 0 → 0 |
| contractors-1440 (`/projects`) | 218 → 222 | 30 → 36 | 11 → 11 | 2 → 1 | 14 → 4 | 2 → 0 |
| completed-1440 (`/projects`) | 98 → 79 | 29 → 24 | 2 → 2 | 1 → 1 | 18 → 13 | 1 → 1 |
| ryan-overview-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 397 → 366 | 58 → 60 | 27 → 25 | 1 → 1 | 10 → 10 | 0 → 1 |
| ryan-overview-390 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 132 → 123 | 25 → 25 | 10 → 10 | 1 → 0 | 3 → 3 | 2 → 1 |
| marcus-overview-1440 (`/projects/9ede8f84-c88f-497e-a172-8f9267`) | 317 → 308 | 50 → 50 | 18 → 18 | 1 → 1 | 11 → 9 | 0 → 0 |
| aisha-overview-1440 (`/projects/33c09261-bf04-4027-ad89-cae12a`) | 406 → 376 | 55 → 55 | 20 → 19 | 1 → 1 | 10 → 8 | 0 → 1 |
| shalini-overview-1440 (`/projects/9e7a3ddd-eb39-4fb1-aaf6-7e019b`) | 297 → 269 | 42 → 42 | 8 → 8 | 0 → 0 | 7 → 5 | 3 → 0 |
| ryan-money-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 290 → 260 | 48 → 45 | 14 → 12 | 4 → 1 | 18 → 17 | 2 → 2 |
| ryan-money-390 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 110 → 115 | 23 → 22 | 5 → 4 | 3 → 1 | 1 → 2 | 2 → 1 |
| ryan-schedule-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 344 → 290 | 54 → 54 | 9 → 9 | 1 → 1 | 6 → 1 | 3 → 0 |
| ryan-schedule-390 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 173 → 175 | 24 → 22 | 5 → 4 | 1 → 1 | 0 → 0 | 5 → 1 |
| ryan-compliance-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 227 → 245 | 38 → 40 | 11 → 2 | 1 → 1 | 13 → 9 | 0 → 0 |
| ryan-messages-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 136 → 127 | 39 → 38 | 1 → 3 | 2 → 2 | 4 → 0 | 0 → 0 |
| ryan-tickets-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 115 → 105 | 32 → 32 | 1 → 1 | 2 → 1 | 3 → 1 | 0 → 0 |
| ryan-choices-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 177 → 165 | 34 → 32 | 5 → 6 | 2 → 1 | 6 → 2 | 2 → 0 |
| ryan-floorplan-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 215 → 201 | 62 → 46 | 6 → 7 | 1 → 1 | 4 → 1 | 0 → 0 |
| ryan-activity-1440 (`/projects/e920e218-7c5b-4ff9-a27b-e62d73`) | 341 → 337 | 51 → 51 | 1 → 1 | 1 → 1 | 2 → 0 | 0 → 0 |
| ben-money-1440 (`/projects/a3f655a3-c603-42b0-af12-2767a0`) | — → 285 | — → 46 | — → 16 | — → 1 | — → 18 | — → 2 |
| tickets-1440 (`/tickets`) | — → 170 | — → 9 | — → 0 | — → 1 | — → 3 | — → 0 |
| tickets-390 (`/tickets`) | — → 168 | — → 9 | — → 0 | — → 1 | — → 3 | — → 3 |
| chat-1440 (`/chat`) | — → 172 | — → 14 | — → 0 | — → 0 | — → 5 | — → 6 |
| chat-390 (`/chat`) | — → 166 | — → 14 | — → 1 | — → 0 | — → 5 | — → 6 |
| portal-home-1440 (`/my/demo-studio`) | 158 → 162 | 4 → 4 | 5 → 5 | 0 → 0 | 0 → 0 | 0 → 0 |
| portal-home-390 (`/my/demo-studio`) | 105 → 109 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | 0 → 0 |
| portal-schedule-390 (`/my/demo-studio/schedule`) | 144 → 137 | 10 → 6 | 3 → 3 | 0 → 0 | 1 → 0 | 0 → 0 |
| portal-money-1440 (`/my/demo-studio/money`) | 150 → 150 | 12 → 12 | 6 → 6 | 1 → 1 | 1 → 1 | 0 → 0 |
| portal-files-390 (`/my/demo-studio/files`) | 81 → 88 | 6 → 7 | 6 → 0 | 0 → 0 | 5 → 0 | 0 → 0 |
| portal-choices-390 (`/my/demo-studio/choices`) | 47 → 49 | 2 → 2 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 |


Read: the filled buttons on the Payments tab 4 → 1 (the header's alone) and 3 → 1 on a phone; on a phone's Overview 1 → 0 (the brief leads with the step, never cut); the listing's capitals 21 stay at a desk (the cards' captions and the table heads are the house's uppercase) but 6 → 2 on a phone; Workload 11 → 0 capitals and 169 → 122 words; the Overview's words 397 → 366 (Ryan), its purple verbs 27 → 25 (the Needs card shows three rows, each one verb). A phone's listing shows more words on its first screen because the cards now reach it (the tiles were a quarter of it).

## 7 · Requests — exact changes in files I don't own

**B1**
- `components/shell/app-rail.tsx`: the rail's "Tickets" → "Issues", aria "Issues (n waiting)"; then restate pm2-s46b:100's regex.
- `lib/global-search/model.ts`: rows Tickets → "Issues", New ticket → "New issue", Ticket categories → "Issue categories", the "ticket" group → "Issues"; keep "tickets", "escalations", "ticket categories", "new ticket", "money" as search words (a project's Payments tab is found by "money" too); then restate pm2-s46a:110 · 112 · 126.
- `components/shell/maison-fab.tsx`: on a project page ≤767 start the FAB hidden (as on /dashboard) and keep it tucked while an open conversation (`[data-testid="project-conversation"]`) is on screen (3-09 · 1-43).
- `components/om/empty-state.tsx`: `help` optional (no empty paragraph); then drop `help={null}` in `chat-inbox.tsx` and the `p:empty` rule at the end of `messages.module.css`.
- `lib/format.ts` `relativeTime`: "7 days ago" not "7d ago" (1-24 · T-11).
- `components/om/date-field.tsx`: show the value as "27 Sep 2026" (3-46 · 3-20).
- `lib/dashboard/health.ts:60`: "Bill AF-7781 from AquaFlow Plumbing Works" (1-31); `lib/dashboard/pulse.ts:79`: "To collect" / "To pay" (3-03); the Review pane (`components/dashboard/inbox/review-pane.tsx`): title "PO-2026-008 · Stone & Tile Masonry", byline "From Germaine · 18 Oct · margin left on this work 23.8%" (1-32). The Dashboard's "Nothing waits on you" (pm2-s22:103) — "You're all caught up" if B1 adopts it.
- FYI (no change needed unless B1 wants one): the Dashboard's inbox reads the same project Needs rows (`fetchProjectDetail` → `needsOf`), so their new words and the merged milestone rows (one milestone, one row) show there too, and the Team card's loads read "n free slots" (`lib/projects/workload.ts`); dash-d2:412's DOORS list may add "Write" (the weekly update's verb, was "Draft it").

**B2**
- `components/leads/detail/ai-brief.tsx`: draw no Tag when `brief.tag` is '' (or the tag as a grey sentence-case caption), then I set the project's in-progress brief tag to '' (3-30 · W-629); fold the brief to its first sentence ≤767 (3-09).
- `components/leads/dropdown.tsx` `DropdownLabel`: sentence case, no capitals (W-101 · 3-24 · T-06).
- `components/leads/activity/lead-activity.tsx`: the 14 type chips → one "Show: All ▾" scope pill (3-08).
- `components/leads/detail/activity-card.tsx` (+ B1's `components/om/timeline.tsx`): in a narrow card the date as a caption above the sentence, the sentence full width, long quotes clamped to two lines (3-06).
- `lib/leads/stage-data.ts:79`: payment names in sentence case at the source ("Mid-project") (3-49).
- The lead ⋮'s "Invite to Portal" → "Client portal" (pm2-s05 and uat P6 are already restated to accept both); the lead-mock words "Contact Log", "Add Task", "New File", "New Meeting" (W-566), "Ask Client", "View Client Info", Questionnaire's "Add the studio's questions" → "Add them" (W-477) (3-40, his call to change them together).
- `app/leads/[id]/overview.tsx:949` · `app/leads/workspace.tsx:246-247` · `components/leads/deleted-sheet.tsx:163`: "Deleted projects" (sentence case; the probes now accept both).
- 3-51: one hold chip set for the lead and the project needs the lead's rule to allow no follow-up day — a decision for Vicky first.

**B4** — the quote editor's VO pill reads `variationLabel` (lib/projects/money.ts) — now "With client"; nothing to do unless its own status words differ.

**B5**
- `lib/finance/sections.ts:27/29` + Finance's tabs: "Money in" / "Money out" → "Client payments" / "Costs"; Costs' "Paid" → "Payments made" (3-02 · §2).
- `components/finance/books/project-profit.tsx:29`: "Cash so far" → "Cash in hand (collected − paid out)" with the sum in its tooltip (3-03).
- `components/company/plan/credits-table.tsx`: on a phone draw the `next` column with no label (the card's foot), so a card no longer reads "Next step · Open ⋮" (3-05).
- `components/finance/todo/todo-workspace.tsx`: the PO approval row "Approve" + ⋮ (Approve and send · Send back · Open) (5-13).
- `components/company/members-view.tsx:412` "Projects at once" → "Max projects" (W-054); `lib/settings/permissions.ts:375` "Leader checked by" → "Checked by" (W-236); `lib/finance/profit.ts:215` the margin warning in the plan's words, none when the expected margin is ≤ 0, the warning tone only below plan (3-16); `app/settings/document-numbers.tsx` / `lib/settings/document-numbers.ts` "Tickets" → "Issues"; Settings' "What waits for an Owner or an Admin" card per 5-33 (B5's half).
- The setup view's Clients card shows the state only now — add `agoText` as its caption if the time is wanted there.
- `lib/finance/todo.ts` / `use-costs.tsx:338`: "Bill EL-2207 from Bright Spark Electrical" to match the project's rows (pm2-s44r:96/118 read the old words).

**B6** — the Compliance Navigator shares `ItemRow`, so its items open from the title and say "Required / Recommended"; its own "Rule" head stays.

## 8 · ▲ For Vicky
1. **The Payments tab keeps its cents** (S$14,018.04 on tiles, rows and tables) while the Overview, the listing and every card read "S$ 14,018" — T-11 says rows and tiles go whole-dollar, but on the money page itself the cents are the fact a studio reconciles (T-12). Say the word and the tab's rows follow the cards.
2. **Issues keep the house Chips** for Open · Closed · All (1-26's rule for filters inside a list) rather than 3-08's "Open ▾" pill; now that the views above are a segmented control the two rows no longer look alike.
3. **3-51 is not built**: the lead's On Hold requires a follow-up day (a rule), so the one shared chip set needs your call — add "No date yet" to the lead's, or keep the project's.
4. **Needs your attention unfolds in place** ("Show n more") rather than opening a Review list (3-07's "See all n"): T-14 allows the fold and it keeps every row's own button and ⋮; the Dashboard's Review pane is B1's.
5. **One milestone, one row** (3-01 / 3-07): Ryan's Needs count goes 12 → 10 — the merged rows' other step sits in the row's ⋮, and the milestone's own panel still has both.
6. **The portal hides no empty section** (3-36's second half): what the client may open is the server's rule (`fetchPortalLook`), not a word.
7. **"Payments" now names three things a step apart** — the project's tab, Client payments' "Payments" view (receipts), and "Payments · 4" (the schedule's parts) — as §2 set them; a fourth word may read better for the view ("Receipts").
8. **The brief's yellow "This week" tag stays** until B2's AiBrief can draw no tag (request) — W-629.
9. **New ▾ is two presses for a variant** (e.g. Purchase order › Order from the quote) — the five kinds read at once, the variants one level in, so nothing is lost; the dialogs themselves are B5's (POs, bills, expenses), so a "first choice inside the dialog" wasn't open to me.
10. **The fork's calls** (in its own words, each kept): the client's /chat row drops the project name (the open pane and search have it); the Team tag stays a caps chip (it is 1-21's safety marker); "Being fixed" also shows on the portal's Issues (one status map); issue aria-labels keep "Ticket" where probes read them; tasks made from an issue keep their stored "…ticket T-…" words; New message ▾ is outlined only at a desk; the portal bell says "VO-1 approved" (a household answers); "You are here" shows on no row when two run; "Contract" changed only on the Files head (the signing pages still say "agreement" — one word still to pick); the floor-plan tools stay words (G-Q4, an elderly owner); Defer is a visible tick; the margin strip shows only below plan; the row's Insights stays as "Reports" to keep its handle; "Mandatory" → "Required" reaches the Compliance Navigator too; new handover records store "n issues waiting on the studio".

**Register:** Numbered REG-3153…3200 (see build/reg-map.json).
