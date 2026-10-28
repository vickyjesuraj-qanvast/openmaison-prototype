# Lane B2 — Leads end to end · outcome (the calm UI build, 2026-10-27)

Worktree `agent-a50a9591a4f10608d`, from the WIP base `5a71fe24`; nothing committed. The lane ran as four hands on disjoint files — the lane's
own (listing · lead page · info column · cards · Move stage hosts · lib/leads words) and three forks of it: **A** Tasks
(`components/leads/tasks/**`, `lib/leads/task-filters.ts`, `detail/my-work-card.tsx`), **B** Meeting Copilot · Qanvast Ops · Hangouts
(`components/{meetings,qanvast,hangouts}/**`, `app/{meetings,meeting,qanvast-ops,hangout}/**`, `lib/meetings/**`, `lib/leads/return-model.ts`),
**C** the lead's Questionnaire · Notes & logs · Activity · Files tabs, the Move stage window, the log sheet (`components/leads/{questionnaire,notes,
activity,files,log,move-stage}/**`, `detail/{questionnaire,files}-card.tsx`, `lib/leads/{enums,activity,stage-data,question-model,note-model,
file-model,contact-fill,quick-due}.ts`). One type-check, one lint and one build serve all four. Every probe is green on its last run (§5).

## 1 · Built

**62 findings: 57 built · 2 partly · 1 kept by the contract (its wording part done) · 2 not done** (2-45 demo data — repairs/baseline are off-limits;
2-22's colour — B1's house Tabs / rail). **18 touches: 15 done in my files · 3 nothing to do here** (1-34, 5-10, 1-26's B1 half).

| Finding | What was done |
|---|---|
| 1-06 (A) | /tasks: pill "All tasks · 48" with All tasks · My tasks · General tasks; Unassigned is the chip's alone (`?scope=unassigned` still lands and the pill lists it, checked); the All · Leads · Projects segment moved into the pill's menu at every width (the pill names it and wears the applied dot). The approvals banner is B1's (Request). |
| 1-07 (A) | Status hidden by default (Column settings keeps it); /tasks opens on Title · For · Members · Due; tags as plain text, an empty Tags cell blank (Add tags on hover and in the row ⋮); the grey person-plus for an unassigned row; plain due dates, red when late; no floating Edit — the ⋮'s first row; grey ⋮; the actions band 128 → 48. |
| 1-11 (A + lane) | "New task ▾" (Blank task · From a template) in the toolbar and the /tasks header; the desk table's foot "+ Add Task" gone (phone quick add kept). Leads' header "New lead ▾". Tools › Quotes / Projects / Tickets / Messages are other lanes'. |
| 1-23 (A) | Panel: "Project · …" / "Lead · …" / "For · General task"; the due once (helper gone); Mark as done · Attach files · Add tag · "Add a vendor or contractor". |
| 1-25 (A) | Counts "Label · n" (§2's T-07) on every chip and pill in the lane. |
| 1-27 (A) | Phone chips keep their words on their own line. Not done: opening the phone list on My tasks (it would switch lists after the first paint; the due order already leads with Overdue and Today). |
| 1-42 (A) | /tasks ⋮ without Delete all (select all → the bulk bar's Delete all does it); Save as a template · Templates · Export all…. The lead tab's ⋮ keeps Delete all. |
| 2-01 | One Maison AI card, one action, "Maison AI" once, no CAPS tag; every brief rewritten from the record (`lib/leads/briefs.ts` — the days where the lead is, whether anyone owns it, a Lost lead's recorded reason); every "n× more often" figure removed; no Show more — the other briefs' actions are all in the Maison AI sheet (it took the first three). A project's own briefs keep their stack (`AiBrief single` is the lead's). |
| 2-02 | The Overview's header carries no meta chips (the info column is their home; the LEAD RETURNED card the return's state); the other tabs (no info column) say the facts as one plain secondary line, the Qanvast mark and the return state stay chips. Lead info drops Stage. The record's money "S$ 70,500" (`moneyCard`) in the column, the header line and the Quotes card. The brief no longer restates source / type / budget. |
| 2-03 | The info column shows only rows with a value; each section's empties are one link — "Add district, area size…" — opening Edit details ON the first empty field (`onEditField` → the form's `focus`); NRIC / FIN and Customer ID moved to Other info; LEAD STAGES' future rows carry nothing. |
| 2-04 | The Overview's empty cards hold no filled button: Quotes "No quote yet · Make one from a template or upload your own." + one outlined "Create a quote" (the Create Quote window: Blank Quote · a template · Upload); Open tasks one outlined "Add a task" (A); Files outlined "Upload files" + a text "Create folder" (C). The Meetings first run is still filled — the house `EmptyState` has no outlined primary (Request to B1). |
| 2-05 | A lead with no member: the header's filled button is "Assign a member" — the Assign window opens under it and the move it stood for follows the save (`assignThenMove`, the phone's Assign-then-move). The locked "Convert to Project" left the header: Won in Stage ▾ carries its handle (`data-testid="convert-locked"` on the row) and its refusal at every width (`StageDropdown onLocked` → the whole path to Won with the way on as the action). A touch screen's LEAD STAGES and stage sheet say a reason the locked stages share once ("Assign a member to move Olivia on"). |
| 2-06 | Listing rows: no hover Edit (the row ⋮'s first row); the ⋮ the grey house IconButton in a 40 band of its own (116 → 40; a finger's frozen band 134 → 68), so nothing floats over a cell; "No task" grey at rest, "Add task" on hover / focus (always under a finger); one grey person-plus for assign; the kanban card the same. The ⋮ now holds Edit + Delete (+ Open project / Return), so it stays. |
| 2-08 (C) | One contact-log vocabulary at every width (How · When · How it went as chips, "Save log", "Call back by", "Call back (optional) — We’ll add a task to remind you."), display-only via `channelLabel` (stored "In person" reads "Visit", "Others" "Other"); the readers in my files use it (table, phone card, LEAD STAGES, the call-remarks answer). |
| 2-10 (B) | Lead credits / Reviews views as second-level house Tabs; Reviews one chip row; rating + order in one Sort menu. |
| 2-11 | "Label · n" across the module (pill, review sheet, meetings chips). The tab badges' red is B1's Tabs (Request). |
| 2-12 | Sentence case through the listing, the lead page, the review sheet, imports, Deleted leads, the forms and every fork's folders. |
| 2-13 | "New lead ▾" / "New task ▾" / "New file ▾" / "New note ▾" / "New meeting ▾"; the dialog "New lead" with "Add lead"; the table foot "+ Add Task" gone (A). Quotes / Contracts are B4's. |
| 2-14 | Info column "Members": one full-width list, "(you)" on the signed-in member, "· in charge" on the first when there are several, "Assign members"; the Assign window "Assign members"; Meetings "Members" (B); Hangout "By member" (B). |
| 2-15 | "Not opened yet" (was Unseen) in the pill and Filters; the phone card's NEW tag gone (the band says it); the condition "New (never lived in)" on the record (`conditionLabel`). The rail's "2 new" is B1's (Request). |
| 2-16 | The docked review bar removed; the queue is the pill's "Needs your attention › To review · n" row (`leads-review-open`), the import's snackbar keeps Review; in the sheet no PENDING tag, no verbs on the cards (the foot holds them once), the house primary "Approve 13 (no duplicates)", one date format (`whenWords`). The two address fields stay — they are two records (property / the client's own) — named apart: "Property address". |
| 2-17 | LEAD STAGES' lines wrap (no "…"); Response time in words ("Not assigned for 50 days · first reply in about a day", `aboutWords`), the Won leg only from Quote Sent. |
| 2-18 (C) | Questionnaire without Q:/A:, the row opens the answer, "Answered by the studio / by Olivia" grey, answers in house formats, one summary line ("7 of 11 answered · none by Olivia yet") on the tab and the Overview card, "Ask Olivia". |
| 2-19 (A) | As 1-07; Title takes the freed width; tags in the case typed. |
| 2-20 (B) | Status words Upcoming · Needs notes · Live · Held (· Summary not saved) · Cancelled; captions "From the Met step" · "From notes"; Deal score off by default (Column settings), in words ("Maybe · 57"); chips "Summaries to save · 3" / "Needs notes · 2" with words on a phone; grey ⋮, no Open beside it. |
| 2-21 (B) | Held page: the concerns row gone (the Concerns card keeps them with their answers), tags under "Show details", "From your notes", "Our answer", the ON THE LEAD card's Save gone (the header's opens the same dialog), sentence-case head. The FAB over the add-ons is B1's. |
| 2-22 | Not done here — the colour of a tab's count and the rail's badges are B1's (`components/om/tabs.tsx`, `app-rail.tsx`); Request. |
| 2-23 | Empty sentences: Quotes card (lane), Tasks (A), Files (C), Questionnaire (C, with the Company › Questionnaire link for Owners / Admins — the lane passes `setUpHref`), Meetings (B). |
| 2-24 | One date format: Lead returned "Thu, 10 Sep ’26 · 4:30 PM" (`displayDue`); the Move stage locked log and Files' day groups (C); Hangouts (B); the review sheet (`whenWords`). |
| 2-25 | Quotes card: the state once, as a sentence about the client ("Approved — not sent to Vivien yet" / "With Vivien since 2 Sep ’26", `quoteStateLine`), the track unlabelled (a segment a step), "Only your studio can see it" / "Vivien can see it" (`quoteVisibilityLabel`). |
| 2-26 (B) | One filled Start, the shift as a chat's head (no BOOKED ON YOUR PAGE), no tag the filter already says, "Good / Fair / Weak match", Apply outlined, sentence-case eyebrows. The Hangout ghost follows: the plan's help three lines on a phone, a waiting chat's facts one line (s27 measured it 15–31 px off). |
| 2-27 (B) | Add Lead / Insights / Request Leads into the ⋮ (C still opens New Qanvast lead), the inert sort arrows gone, an expired window "—", "All leads · 7". **Partly**: Credits kept on every row — a per-lead charge s41b5 checks; hiding it could hide a different value. |
| 2-28 (A) | "Open tasks", no date in the head. Not done: "1 is yours" (the card's tasks carry no members). |
| 2-29 · 2-30 (C) | "Put on hold" / "Mark as lost", no subtitles, verbs as buttons, "We’ll remind you on …"; "Saved to Notes & logs."; "Call back by"; "Log 1" only among several. |
| 2-31 | Deleted leads: one quiet line "Deleted leads are removed for good after 30 days." (the orange band and its ✕, and the foot note, went), "Delete all forever", "Delete forever", an unknown budget "—". |
| 2-32 | Import: "Before you import" + three bullets + "Download the template" once (the history link is the listing ⋮'s), "Your file", "CSV, Excel or a PDF lead sheet", "Found n rows"; history: "Import history", "Import leads", heads Rows · Added · Skipped · Skipped rows, "1 lead skipped" (the stored note read in words, `noteWords`), "Download skipped", "Download the template". |
| 2-33 | New lead ▾: Type in a lead · Import a file · Get leads automatically… (one row to Company › Integrations, help "Email, Zapier or Meta Lead Ads"). |
| 2-34 | "{Name} added · Open", "Changes saved", "Returned to Qanvast · Undo", "Members saved" (the task assignees' too); Qanvast's "{Name} added" (B). |
| 2-35 | "Added 2 days ago" on the phone card, "Updated 2 days ago" on the kanban (`agoWords`); the kanban's meta line skips an empty budget. |
| 2-36 | "View details" → the "Lead details" sheet; the identity block's name hidden on a phone (the bar holds it). The top bar's ⌘K glyph and the FAB are B1's (Requests). |
| 2-37 | "Team chat · Open" and "Client chat · Open" side by side in Members; the Portal row keeps the access state alone. |
| 2-38 | The Overview's return chip gone while the LEAD RETURNED card shows (other tabs keep it); the brief says the Lost reason it has; the Return wizard's (i) only on the steps whose body has no policy link. |
| 2-39 | Won: the card's action "Summarise the project" (Open project is the header's), LEAD STAGES "Took 13 days to win" and the Won row "21 Aug ’26". |
| 2-41 | "Suggested: Sarah", "Takes HDB 4-Room leads." (`lib/leads/suggest.ts`, no "(must match)"), "Assign Sarah", "Assign members", "Clear". |
| 2-42 (B) | "Credits to come back", "Won", the */^ footnotes behind one "?", "Ask for reviews" everywhere, "clients". The ranking ghost draws the head's "?" and the "About SuperTrust" link (s41b5 measured it 35 px off). |
| 2-45 | **Not done** — renaming Olivia's seeded files and her trail is `scripts/seed-files.ts` / repairs / the baseline, off-limits to this build (Request). |
| 2-46 (C) | Log rows titled channel + outcome ("Call — callback requested"), "Contact log" once, the phone composer from New note. |
| 2-47 | Insights → the ⋮'s "Reports" on Leads (B: Meetings, Qanvast Ops); "Lead settings". |
| 2-48 (B) | Consent script folded, "25 AI credits per 10 minutes — it asks before going on.", the prototype line behind "?", the checklist plain text. |
| 2-49 | "New lead" · Name · Mobile number · Email · Client address · Source · Property address (no helper) · Members · "Add lead"; duplicate "Already in your leads". |
| 2-50 (C) | "You set OM-10001’s payments: 10% deposit, then 30 / 30 / 30."; a Quotes chip (quotes · contracts · X-Ray lines). |
| 3-12 | The lead/project tab creates in my files: New task ▾ (A), New file ▾ (C), Ask {client} (C). |
| 3-14 (B) | On a project a Met log reads "From the lead, before the project began"; the earliest Met log "First meeting"; Deal score off by default. |
| 3-18 · 3-32 | As 2-14 · 2-03 on the project's column (the same component): "Members", no Owner row, only rows with a value, "Add project type, scope…" opens the project's Edit details. |
| 3-33 (C) | "Ask {client}" hidden until a question exists; "Your studio has 11 questions ready" + outlined "Add them". |
| 3-42 · 3-43 · 3-45 (C) | "From the Contacted / Met step — read only"; "Contact log"; "Date and time"; the log's own time; ownerless files in the passive, "a 5% commission". |
| 3-49 (C) | Partly — "Mid-project" shown on the Won step's table; the stored default stays (it is written into stage logs). |
| 4-04 | `QUOTE_STATUS_LABEL` / `quoteStatusLabel` and `CONTRACT_STATUS_LABEL` / `contractStatusLabel` beside their enums (lib/leads/quote-filters.ts · contract-filters.ts); the quotes' chip "With client · n"; the Move stage window's quote rows use it. B4 wires its own screens to them (Request). |
| 5-09 | `lib/leads/tat.ts`: Time to assign · Time to first contact · First contact to Won; MEDIANS_NOTE in plain words; the export's words. B5 does the Reports screens. |
| Touches | 1-16 (A: General tasks) · 1-24 (A: one date; the field's own format is B1's DateTimeField) · 1-26 (A: segment folded) · 1-30 (B + lane: title · New ▾ · ⋮) · 1-34 (nothing — the stage's mocked name "Quote Sent" stays; B1's pipeline card should read `STAGES`) · 2-07 (B: kept by the contract — "Set by OpenMaison") · 2-09 (B: behind "?") · 2-23 (done) · 2-43 (Filters' Sort only where no heads sort — the table's Filters drop it, the kanban and phone keep it) · 3-06 (Recent activity's sentence takes its own line under the date in a narrow card) · 3-13 (Team chat · Open) · 3-37 (C: "issue" in Activity) · 3-41 (the house detail card's head: bold sentence case, 14/600 on-surface, the 48 kept) · 3-51 (C: not done — the lead's On Hold date is required; "No date yet" would change the rule) · 4-15 (`quoteVisibilityLabel`; `waitingOnClient` is a rule — unchanged) · 5-10 (nothing — the card model is the lead's) · 5-21 (`lib/leads/sales.ts`: "usually n to Won") · 5-45 (B: "Meeting Copilot" everywhere). |

## 2 · The ledger — every moved action (what · was · now)

**Leads listing**
- Insights (desk button, phone square) · the header · the listing ⋮'s first row **Reports** (`data-testid="leads-reports"`; same `openInsights`, same gate)
- Link to Email · Link to Zapier · Connect to Ads · three rows of Add Lead ▾ · one row **Get leads automatically…** → Company › Integrations, whose Email · Webhooks (Zapier) · Meta Lead Ads cards they each opened
- Create New Lead · Add Lead ▾ · **New lead ▾ › Type in a lead** (keeps `shortcut="create"`, C)
- Import from File · Add Lead ▾ · **New lead ▾ › Import a file**
- Lead Import History · the listing ⋮ and the import wizard's left panel · the listing ⋮ **Import history** (the wizard's duplicate link dropped — same screen behind it)
- Review imported leads (docked bar, every visit) · the listing's foot · the scope pill's **Needs your attention › To review · n** (`leads-review-open`) and the import's snackbar's Review
- Edit (hover pill on every row) · floating over the row's cells · the row ⋮'s first row **Edit** (`lead-row-edit`); the lead's own ⋮ keeps Edit (E)
- Add task (purple link on a task-less row) · always shown · on the row's hover / the button's focus ("No task" at rest); always under a finger
- Assign (purple text on an unowned row; purple icon beside avatars) · always shown · the grey person-plus — at rest on an unowned row, on hover / focus beside avatars; always under a finger
- Return Lead · row / kanban ⋮ · the same rows, named **Return to Qanvast**
- Invite to Portal · the lead's ⋮ · the same row, named **Client portal** — the project's ⋮ word (B3's request)
- Sort (Filters' first tab) · the Filters modal at every view · the table's column heads; the Filters tab stays for the kanban and the phone (`withSort`)
- Approve / Reject (per review card) · every card · the detail pane's foot (press the card, then Approve / Reject / Merge)
- View & Merge (duplicate card) · the card · the card's press opens the same comparison ("Compare to merge" says so)
- Dismiss ✕ (Deleted leads' orange band) · the band · gone with the band — the 30-day rule is a plain line that needs no dismissing

**A lead's page**
- Convert to Project (outlined, locked) · the header beside the primary · **Stage ▾ › Won** row (`data-testid="convert-locked"` rides on it while Won is out of reach); its press answers with the same refusal and way on (`onLocked`)
- Move to {next} on a lead with no member · the filled primary (it refused) · the primary reads **Assign a member**; the move follows the save; Stage ▾ still offers every move
- Phone · email · budget · type · source chips · the header on every tab · the Overview: the info column (contact, Lead info, Property info); other tabs: one plain line in the header
- Return-state chip (Overview) · the header · the LEAD RETURNED card on the Overview (other tabs keep the chip)
- Stage row · Lead info · the Stage ▾ pill and the LEAD STAGES card
- NRIC / FIN · Customer ID · Lead info · **Other info**
- Empty rows ("--") · each section · one "Add district, area size…" link at the section's foot (opens Edit details on the first empty field)
- Owner row · the column's Collaborators · the Members list ("· in charge" on the first member when there are several)
- Portal's "Client messages" link · the Portal row · Members' **Client chat · Open** (`lead-portal-messages`); the Portal row keeps the access state
- Team chat's "Messages" · the Team chat row · the same row, **Open** (`info-team-chat`)
- The brief's second action and the other briefs (Show more) · the brief card · the **Maison AI sheet** (the FAB's suggestions now list every brief action — they listed the first three)
- From Scratch / From Template (QUOTES' empty card) · two buttons · **Create a quote** → the Create Quote window (Blank Quote · a template · Upload a quote)
- The Return wizard's (i) policy · the head on every step · the head only on steps whose body has no policy link (the first two say it in their text)

**Tasks (A)** · Leads · Projects segment → the scope pill's menu (`task-source` moved) · Unassigned scope → the Unassigned chip · Edit pill → the row ⋮ (`task-row-edit`) · "+ Add Tags" → the row ⋮ "Add tags / Edit tags" (`task-row-tags`), the hover hint, the panel · the desk table foot "+ Add Task" → New task ▾ › Blank task · /tasks ⋮ Delete all → select all + the bulk bar's Delete all (the lead tab's ⋮ keeps it) · Status / Creator / Tags (/tasks) and Status (lead tab) → Column settings · Assign link → the grey person-plus (`task-row-assign`).

**Meetings · Qanvast Ops · Hangouts (B)** · /meetings Insights → the toolbar ⋮ "Reports" (`open-insights`) · Qanvast Ops Add Lead / Insights / Request Leads → the ⋮ ("New Qanvast lead", C still opens it · "Reports" · "Request leads") · the Qanvast table's inert sort arrows → gone (Filters › Sort sorts) · a meeting row's floating Open → the ⋮'s first row and the name · ON THE LEAD's Save → the header's (phone foot's) Save to the lead · Reviews' Rating ▾ + Sort ▾ → one Sort menu · the prototype lines (listening · Hangouts sample · Sample chip · the Qanvast account stand-in) → behind "?" tooltips (`room-stand-in` · `hangouts-sample` · `hangout-sample` · `qanvast-account-sample`) · SuperTrust footnotes → the section's "?" (`ranking-how`) · the consent script → "What to tell {first}" fold · the held page's tags → "Show details".

**The lead's tabs (C)** · the Questionnaire's per-row Answer → the row's press (`question-answer`) · Ask Client (disabled when empty) → hidden until a question exists ("Add them" is the way in) · the Overview Files card's filled Upload / outlined Create Folder → outlined Upload files + a text Create folder · the Move stage Outcome select → How it went chips (same values) · the phone note composer (docked) → New note › Note · On Hold / Lost subtitles → gone (they repeated the title) · Deleted files' Empty Trash → "Delete all forever" (same action) · the file info's empty Owner row → left out.

## 3 · Words

**136 word rows in the lane's list: 128 applied · 4 partly · 4 not applied.** W-530 "Invite to Portal" reads **"Client portal"**, the project's ⋮ word (B3's request), not the row's "Invite to the client portal".

- Applied as proposed, or as the vocabulary table (§2) words it where the row offered two: every row not named below. Where the
  table and the row differ the table won (e.g. W-033 / W-176 / W-301 "All tasks · 48" · "Today · 6" · "Overdue · 6" — the "Label · n"
  rule T-07; W-053 "Only your studio can see it"; W-624 "25 AI credits per 10 minutes — it asks before going on.").
- **Partly**
  - W-165 "Date & Time" → "Date and time" where a log's time is typed (the desk editor, the read-only Met log); the contact log's own
    field is "When" (W-501's set), so "Date and time" stays only for the call back's date.
  - W-261 "Mid-Project" → "Mid-project" is shown (the Won step's table, through the portal's `clientStageName`); the stored default
    stays — it is written into stage logs.
  - W-330 the questionnaire's empty line: "No questions yet." + the Company › Questionnaire link for Owners / Admins only (a Designer
    can't open it, so the sentence names no place they can't go).
  - W-483 "Assign a member first" (×4 on a phone's stage rows) → said ONCE for a finger ("Assign a member to move Olivia on", the stage
    sheet and LEAD STAGES); the per-row reason string in `stage-policy.ts` stays — it is also the snackbar a desk press reads and the
    probes' refusal.
- **Not applied**
  - W-004 "Qanvast Ops" → kept by the contract (§2: the name and its Studios tab stay).
  - W-040 "Deal score · Cool / Warm / Hot" → "Chance": the tiers are in words ("Very likely · Likely · Maybe · Unlikely", four, so
    Reports' groups stay apart) but the measure keeps its name "Deal score" — Settings › Meetings and Reports use it (B5's files).
  - W-328 Projects' "Put on hold · No date yet …" vs the lead's set: not unified — the lead's On Hold date is required (a rule, REG-453);
    "No date yet" on a lead would change it. For Vicky (▲).
  - W-563 "New Contract ▾" on the lead's Contracts tab — `components/leads/contracts/*` is B4's (Request).

## 4 · Guard

`node design-source/verify/ui-audit-build/guard.mjs diff $RL/B2/guard-before.json $RL/B2/guard-after.json`:

```
✓ pages: none gone                                   (173)
✓ server actions a screen calls: none gone           (1064)
✓ control handles (data-testid · data-kb): none gone (3791)
✓ keyboard shortcuts: none gone                      (120)
  new handles: 28
```

The 28 new handles: `lead-head-facts` · `leads-reports` · `leads-review-open` · `lead-row-edit` · `review-approve-clean` · `deleted-rule` ·
`import-template` · `info-members` · `quote-card-state` · `stage-shared-why` · `stages-shared-why` · `ask-client` · `question-answer` ·
`questionnaire-line` · `questionnaire-set-up` · `questionnaire-card-set-up` · `task-row-assign` · `task-row-edit` · `task-row-tags` ·
`room-head-meta` · `room-stand-in` · `room-disclosure-toggle` · `heard-tags-toggle` · `ranking-how` · `hangout-sample` · `qanvast-new-lead` ·
`qanvast-request-leads` · `qanvast-reports`.

Moved handles, which the guard sees as kept:
- `convert-locked` rides on the Stage ▾ menu's Won row while Won is out of reach (it was the header's outlined button).
- `info-team-chat` and `lead-portal-messages` are the Members section's two "Open" links.
- `task-source` is a row in the /tasks scope pill's menu.
- `open-insights` is the /meetings toolbar ⋮'s "Reports" row.
- `components/leads/review-banner.tsx` (no handle) is no longer mounted. Its press is the pill's `leads-review-open`.

## 5 · Probes

**21 of 21 green on their last run.** The probes ran in five rounds. The last two ran on the final builds, through `heavy.sh probes`, on 3421.
- **Round 4** ran every id on build 4.
- **Round 5** ran on build 5, which differs from build 4 only in the /tasks ghost's two bone widths. It reran `ux-p3` and `pm2-s05`, plus the
  four probes that hit the clock: round 4 crossed midnight into 28 Oct, so the 27 Oct base's "today" Hangout and its planned meeting had
  passed.
  - Those four ran on a copy of the base restored to today: `npx tsx scripts/restore-baseline.ts` with `DATABASE_URL` on the command, into
    `$RL/B2/run-today/base.db`.
  - That restore moves every demo moment with the day (S42's `demo-day.ts`).

Every text assertion the calm build changed is restated in place and marked `(the calm UI build 2026-10-27, a deliberate change)`. No
functional assertion was weakened: each still checks its rule, through the new words or the new place. Two probes gained a wait or an exact
match where the new words collide with old ones:
- `ux-p3` waits for the scope pill before counting it.
- `ux-p1` matches "Call" exactly, because "Callback requested" is now a chip.

Each Result cell reads ok · fail · exit, then the run it comes from.

| id | Result | Restated |
|---|---|---|
| ux-p1 | 82 · 0 · exit 0 — round 4 | L6: the locked Convert is the Stage ▾ menu's Won row (`convert-locked` there, its refusal on the press), no locked bone in the ghost, a parked lead's header has no Convert; the contact log in the log sheet's words (Visit, the shorter Add … attach rows, How it went chips, Save log); a log row told by its call-log glyph (its title is channel + outcome); "From the Met step — read only"; Lost / On Hold by their verbs; L7 the Members list's first member "in charge" (no Owner row), nobody → "Assign members"; L8 an unknown budget is no row, the section's Add … link offers it |
| ux-p2 | 73 · 0 · exit 0 — round 4 | "Needs your attention" (was To do) with "Not opened yet" (was Unseen); "Label · n" in the pill; "All leads"; New lead ▾ › Import a file; "Import leads"; "Assign members"; an unknown budget "—" |
| ux-p3 | 91 · 0 · exit 0 — round 5, base restored to today — on the 27 Oct base after midnight: 88 · 3, the overdue counts and the chip widths that follow them moved with the clock | "My tasks"; "Today · n"; an unassigned row's grey person-plus (`task-row-assign`); "Mark as done"; "Assign members"; Activity's Quotes chip; the panel's "Attach files" button (`.last()` — its head glyph has the same name); "All files"; Ask {client} by its handle; the add row's person-plus |
| rl-fixes | 20 · 0 · exit 0 — round 4 | an unowned lead's primary is "Assign a member" and opens Assign members — B-01's guarantee (no log typed and lost) kept; "Auto fill" |
| rl-l2 | 84 · 0 · exit 0 — round 4 | "Visit" for the visit channel (and in `rl-l2-pure.mts`); "Auto fill" |
| rl-l3 | 102 · 0 · exit 0 — round 4 | no NEW tag (the band says it); "To call today · n"; the locked rows' shared reason said once (`stage-shared-why`); New lead ▾ › Type in a lead / Import a file; the "New lead" form with "Add lead"; the review queue through the pill's To review row; the duplicate card's press opens the comparison; "Delete all forever"; "Add task"; "Return to Qanvast" |
| rl-l4 | 97 · 0 · exit 0 — round 4 | New task ▾ › Blank task; "Save as a template"; "Deleted files"; Ask {client} by its handle; Status rests in Column settings (1440 and the tablets); the quick add's pill "General"; the note composer opened by New note (`?new=note`); "New task" stays |
| ke | 31 · 0 · exit 0 — round 4 | the Deleted leads dialog's label |
| pm2-s05 | 114 · 0 · exit 0 — round 5 (final build) | "All leads"; "Manage stages"; the contact log's chips and "Call back"; "Edit lead"; "Invite to the client portal"; "Export all…"; the New lead form's required labels ("Name*", "Mobile number*"); "Attach 1 file"; Files' New file ▾ rows; "File type" |
| pm2-s23 | 148 · 0 · exit 0 — round 4 | "Notes & logs"; "From notes" · "Summary not saved" · "Summaries to save · n"; the deal score off the row by default (a hidden column's cell); "No meetings yet"; "Date and time"; Meeting Copilot's price, check-in and receipt in its one spelling; "Summary made …"; the desk contact log in the log sheet's words (How it went chips, When, Call back by · Visit, Save log) |
| pm2-s27 | 155 · 0 · exit 0 — round 5, base restored to today — round 4 (after midnight) stopped at a chat's Start: the 27 Oct Hangout was no longer today | the chat's head is its shift ("With Germaine · Table 7" in the facts); "Good / Fair / Weak match"; "Visit · Meeting held"; "Which member converted most here?" |
| pm2-s41b5 | 176 · 0 · exit 0 — round 4 | the stand-in behind its "?" (`qanvast-account-sample`, read from the tooltip); "Ask for reviews"; "clients" |
| pm2-s42e | 65 · 0 · exit 0 — round 5, base restored to today — round 4 stopped on the same Hangout clock | "Ask for reviews"; "Mark as lost"; the Contacted log's checked How = Visit and How it went = Connected; the brief without its CAPS tag (the record's fact and its one action) |
| pm2-s42g | 40 · 0 · exit 0 — round 4 | "Summary made …"; the window's How = Visit · How it went = Connected; the brief without its tag |
| pm2-s43b | 70 · 0 · exit 0 — round 5, base restored to today — round 4 stopped on the same Hangout clock | the log's words (How · When · How it went · Call back by · Contact log · "Log 1's How"); the outcome as chips; "When*" (required) read by its label; "Auto fill" |
| pm2-s46c | 96 · 0 · exit 0 — round 4 | "Deleted leads" · "removed for good"; "My tasks"; beside an open rail the three to-do chips now fit WITH their words (the Leads · Projects switch went into the pill) — the row never runs under the search either way |
| first-run-empty | 89 · 0 · exit 0 — round 4 | "New task" · "New file" · "New lead" |
| first-run-noleads | 5 · 0 · exit 0 — round 4 | "New lead" |
| first-run-full | 6 · 0 · exit 0 — round 4 | "New lead" in the header |
| folders-files | 16 · 0 · exit 0 — round 4 | "New folder" · "All files" |
| rwd-w2 | 78 · 0 · exit 0 — round 5, base restored to today — on the 27 Oct base its one ✗ is "the client’s meeting link: the place is 44 tall (0)": the earliest planned meeting had passed, so the link reads Thank you and has no place; `components/meetings/client/*` and `lib/meetings/client.ts` are untouched by this lane | the /tasks pill's sentence case and "General tasks"; "Deleted files" / "Deleted leads"; "Assign members"; an unassigned task's person-plus (`task-row-assign`) |

## 6 · Measures — before → after

The audit's `measure.cjs` evaluate, run on the lane's final build over a base copy. Each cell reads words · controls · purple actions ·
filled buttons · capitals · cut. "Before" is the audit's lane-2 pages.

| Screen | Before | After |
|---|---|---|
| /leads table 1440 | 294 · 67 · 24 · 1 · 11 · 2 | 266 · 53 · 0 · 1 · 10 · 2 |
| /leads kanban 1440 | 652 · 84 · 39 · 1 · 12 | 614 · 59 · 0 · 1 · 11 · 0 |
| /leads 390 | 91 · 26 · 14 · 1 · 2 · 6 | 88 · 24 · 11 · 1 · 0 · 6 |
| /leads/imports | 71 · 7 · 2 · 1 · 6 | 58 · 7 · 2 · 1 · 6 |
| Lead Overview — New (Olivia) | 308 · 58 · 16 · 1 · 14 · 2 | 253 · 58 · 16 · 1 · 0 · 0 |
| Lead Overview — 390 | 97 · 25 · 7 · 1 · 3 | 94 · 27 · 7 · 1 · 0 |
| Lead Overview — Met | 284 · 54 · 11 · 2 · 12 · 2 | 222 · 53 · 12 · 1 · 0 · 0 |
| Lead Overview — Quote Sent | 300 · 52 · 12 · 1 · 13 · 3 | 265 · 54 · 13 · 1 · 0 · 0 |
| Lead Overview — On Hold | 275 · 52 · 9 · 2 · 11 · 1 | 224 · 52 · 12 · 1 · 0 · 0 |
| Lead Overview — Lost | 310 · 58 · 11 · 2 · 13 | 279 · 58 · 13 · 1 · 1 |
| Lead Overview — Won | 283 · 45 · 11 · 1 · 11 · 1 | 266 · 44 · 9 · 1 · 0 · 0 |
| Lead › Tasks 1440 | 183 · 64 · 17 · 1 · 24 · 5 | 156 · 61 · 3 · 1 · 5 · 2 |
| Lead › Tasks 390 | 111 · 36 · 7 · 1 · 0 | 111 · 36 · 7 · 1 · 0 |
| Lead › Quotes | 103 · 43 · 3 · 1 · 14 | 98 · 42 · 3 · 1 · 10 (B4's table) |
| Lead › Files | 97 · 53 · 3 · 1 · 4 | 92 · 52 · 3 · 1 · 0 |
| Lead › Notes & logs 1440 | 132 · 38 · 4 · 1 · 4 | 147 · 37 · 4 · 1 · 0 (log titles say channel + outcome) |
| Lead › Notes & logs 390 | 74 · 29 · 2 · 2 | 85 · 24 · 2 · 1 · 0 · 1 |
| Lead › Meetings | 107 · 29 · 5 · 2 · 4 | 74 · 28 · 5 · 2 · 0 (the first run's Plan is the house EmptyState's filled button — B1) |
| Lead › Questionnaire | 141 · 29 · 6 · 1 · 5 | 130 · 32 · 2 · 1 · 0 |
| Lead › Activity | 220 · 42 · 1 · 1 · 4 | 215 · 42 · 1 · 1 · 0 |
| /tasks 1440 | (the audit's lane 1) | 291 · 112 · 7 · 1 · 4 · 4 |
| /meetings 1440 | 315 · 31 · 16 · 1 · 7 · 8 | 281 · 30 · 16 · 1 · 6 · 6 |
| /meetings 390 | 89 · 18 · 13 · 0 | 65 · 17 · 9 · 0 |
| A held meeting | 414 · 13 · 6 · 1 · 10 | 396 · 13 · 5 · 1 · 1 |
| A planned meeting | 270 · 24 · 0 · 1 · 7 | 215 · 17 · 0 · 1 · 1 |
| Qanvast Ops › Leads | 149 · 17 · 1 · 1 · 15 | 125 · 10 · 1 · 0 · 15 (the table's own heads) |
| Qanvast Ops › Lead credits | 134 · 15 · 3 · 0 · 8 | 129 · 15 · 3 · 0 · 8 |
| Qanvast Ops › Reviews | 313 · 27 · 9 · 1 · 1 | 269 · 26 · 9 · 1 · 0 |
| Qanvast Ops › Hangouts | 228 · 18 · 8 · 2 · 15 | 212 · 19 · 9 · 1 · 3 |

- Purple actions on the listing went from 24 to 0 (table) and from 39 to 0 (kanban).
- Capitals on every lead page went to 0, or 1 where a stored value shows.
- Shots: `$RL/B2/shots/after-*.png` (1440 and 390, the final build) and the audit's before shot for each finding,
  copied to `$RL/B2/shots/before/<id>.jpg`.

## 7 · Requests for other lanes

**B1 (shell · house)**
- `components/om/tabs.tsx` + `components/shell/app-rail.tsx`: a tab's count neutral, red only for something late; the rail's Leads "2 new" →
  "Not opened" words / the same neutral count (2-22 · 2-11 · 2-15).
- `components/om/empty-state.tsx`: an outlined primary (`tone="outlined"`) so the Meetings first run can drop its filled button on a record
  page (2-04 — Meetings was the only one left).
- `components/tasks/tasks-workspace.tsx`: the approvals banner on /tasks (1-06's last part).
- `components/om/date-field.tsx` (`DateTimeField`): a display prop for the house date (1-24).
- `components/shell/list-ghosts.tsx` (/tasks): no Status / Creator / Tags columns, "New task", the pill "All tasks" (A's ghost words).
- `components/shell/detail-skeleton.tsx`: the lead Overview's ghost without meta chips, the other tabs' plain facts line, "Members", the cards'
  sentence-case heads (2-02 · 3-41).
- `lib/nav.ts` `fromLabel`: 'Import History' → 'Import history', 'Insights' → 'Reports'.
- `lib/format.ts` `relativeTime`: "1d ago" → "1 day ago" (2-35; the lane uses its own `agoWords` meanwhile).
- The phone top bar's ⌘K glyph and the Maison AI FAB covering LEAD STAGES and a held meeting's add-ons (2-36 · 2-21).
- The Dashboard's pipeline card should read `STAGES` for its stage names (1-34).
- `components/leads/meta-chip` users outside the lane — no caps on MetaChip (the lane dropped the chips it owned).
- `components/shell/qanvast-skeleton`/ghost for Qanvast Ops' header (title + ⋮ only now).

**B3 (projects)**
- `components/projects/overview/overview-ghost.tsx`: `AiBriefGhost single={false}` (a project keeps its stack of briefs).
- `components/projects/project-frame.tsx` (or wherever the project's `InfoColumn` is mounted): pass `onEditField` so "Add project type,
  scope…" opens the project's Edit details on that field (the link is drawn only when it is passed).
- `lib/projects/tabs.ts`: "Notes & Logs" → "Notes & logs" (the lead's tab says it so now).
- `PROJECT_ACTIVITY_CHIPS`: add the Quotes chip (C added it to the lead's: quotes · contracts · X-Ray lines).
- The project's Questionnaire: pass `setUpHref` (Owners / Admins) as the lead does.

**B4 (quotes · contracts)**
- Use `quoteStatusLabel` / `contractStatusLabel` / `quoteVisibilityLabel` (lib/leads/quote-filters.ts · contract-filters.ts) on every quote and
  contract screen; "Copy Link" → "Copy link" in `components/leads/quotes/quotes-table.tsx` and `contracts/contracts-table.tsx`; "All quotes" /
  "All contracts"; W-563 "New contract ▾" (Studio agreement · From a template · Upload a contract) on the lead's Contracts tab; the probes that
  assert "Waiting on client" / "Sent to Client" now read "With client".
- `components/leads/tasks/attach-files-modal.tsx` is A's — done; "Add Image" in the quote's attach is B4's.

**B5 (company · settings · reports)**
- Settings › Meetings "Objection answers" → "Answers to concerns" (W-578; the meeting page already says it).
- Reports › Meetings: the new tier words (Very likely · Likely · Maybe · Unlikely) and "Won after" in its screen.
- Reports › Leads: `MEDIANS_NOTE` behind a HelpLink "How these are counted" (W-257); the LEGS words are already in `lib/leads/tat.ts`.
- Reports › Health: "Tickets raised" → "Issues raised".

**Whoever owns the demo data (scripts/repair · baseline)**
- 2-45: Olivia's seeded files and trail names ("IMG_2041.jpg", the upload lines) — not done here.

**B3's requests for B2's files** (from `$RL/B3/outcome.md` §7, received after B3 landed)

Done:
- **The AiBrief draws nothing for an empty tag.** The tag is a grey caption, never a Tag, so B3 can now set the project's in-progress tag to
  ''.
- **`DropdownLabel` uses sentence case** at the house caption (12), with no 10px capitals. This applies to every menu's group titles, app-wide.
- **The lead's ⋮ says "Client portal"**, the project's word. `pm2-s05` accepts that, the old row and B3's.
- **The lead-mock words were already changed in this lane:** "Contact log", New task ▾ / "Add task", "New file ▾", "New meeting ▾",
  "Ask {client}", "View details" and "Add them".
- **"Deleted projects"** at `overview.tsx` (the tooltip and the remake notice), `workspace.tsx` (the delete snackbar and its action) and
  `deleted-sheet.tsx`.

Not done:
- **The brief folding to its first sentence on a phone (3-09).** The lead's single brief carries its guidance in the second, bold sentence
  ("Once someone is on it, call or WhatsApp the same day."), so folding it would drop the point. If the project wants to fold, the way is
  a prop that only the project passes, built and probed by whoever takes it.
- **Activity's type chips becoming one "Show: All ▾" scope pill (3-08).** This changes a control on both the lead's and the project's Activity,
  and `ux-p3` asserts the lead's six chips. It needs its own pass and probe, so it is left for Vicky's call.
- **The narrow Recent activity card (3-06): only partly done.** In a narrow card the sentence already takes its own line under the date
  (`activity-card.module.css` wraps at every width). Clamping long quotes to two lines is B1's `timeline.tsx`.
- **Payment names in sentence case at the source (`lib/leads/stage-data.ts:79`).** "Mid-Project" is written into stage logs. It is shown
  as "Mid-project" through `clientStageName`, and changing the stored default is a data change for a repair.

**For the landing's regression — probes outside B2's list that read words or places B2 changed** (a static sweep, not run here; many
match case-insensitively and will pass, the ones below hold an exact, regex or attribute match that the new words break)
- *The lead form and New lead ▾* ("Create New Lead" → menu row "Type in a lead", dialog "New lead", button "Add lead"; labels "Lead name" →
  "Name*", "Lead phone number" → "Mobile number*"; header "Add Lead" → "New lead"): `responsive-all/verify-rwd-w6.cjs` · `verify-rwd-c1.cjs`,
  `pending-modules/verify-pm2-s41b3.cjs` · `s41b4` · `s42f`, `consistency/verify-overlays.cjs`, `uat-dane-2026-10-01/P6/verify-p6.cjs` ·
  `P5a`, `ux-build-2026-09-30/P7/verify-p7.cjs` (`/New Lead|Create New Lead|Add Lead/` is case-sensitive), `keyboard/verify-kb-r1.cjs` (the ?
  panel's words for C now read "New lead"), `projects/verify-pj-gap-a.cjs` (the project's Edit details uses the same form: "Lead phone number").
- *Assign* (`[aria-label="Assign Member"]` → "Assign members"): `parity-map-build/verify-pm-i.cjs`, `responsive-all/verify-rwd-w4.cjs`,
  `view-as/verify-view-as.cjs`, `settings-parity/verify-st-r2.cjs`, `keyboard/verify-kb-r1.cjs`, `uat-dane…/P6`.
- *The info column* ("Collaborators" → "Members", no Owner row, empty rows → one "Add …" link): `projects/verify-pj-gap-a.cjs` · `verify-pj-r1.cjs`,
  `pending-modules/verify-pm2-s26.cjs`.
- *The lead's ⋮* ("Invite to Portal" → "Client portal", "Return Lead" → "Return to Qanvast", "Copy Link" → "Copy link"):
  `pending-modules/verify-pm2-s02.cjs` · `s46b` · `s26`, `responsive-all/verify-rwd-c1.cjs`, `uat-dane…/P6`; the projects probes `pj-r4a/r4b/r7/r8/r9`
  only if they open the LEAD's ⋮ (the project's ⋮ is B3's).
- *The listing* (the docked "Review imported leads" bar → the pill's To review row; "Approve All Clean (13)" → "Approve 13 (no duplicates)";
  "Unseen" → "Not opened yet"; "All Leads (n)" → "All leads · n"; "Insights" → ⋮ › Reports; "Import from File" → "Import a file"; "Deleted
  Leads" → "Deleted leads"): `responsive-all/verify-rwd-c1.cjs`, `pending-modules/verify-pm2-s34.cjs` · `s14` · `s03` · `s17` · `s46a` (+ `pm2-s46c-pure.mts`),
  `responsive-contracts/verify-rc-c4.cjs`, `dashboard-2026-10-26/verify-dash-d5.cjs`, `ux-build-2026-09-30/P6/verify-p6.cjs`, `uat-dane…/P5a`,
  `projects/verify-pj-fix-E.cjs`, `x-ray-parity/verify-xr-r4.cjs`, `consistency/verify-overlays.cjs`.
- *The lead's header* (the locked Convert → Stage ▾'s Won row; "Save & Move" / "Moving to Lost" → "Mark as lost" / "Put on hold"): `uat-dane…/P5a`.
- *The Overview's cards* ("MAISON AI BRIEF" → "Maison AI"; "MY TASKS" → "Open tasks"; heads in sentence case, not capitals):
  `pending-modules/verify-pm2-s22.cjs` · `s43a` · `s42a`, `projects/verify-pj-r1.cjs`, `dashboard…/verify-dash-d5.cjs`, `regression/probes.cjs`.
- *Tasks* ("Create New Task" / "Add Task" → New task ▾ › Blank task; "All Tasks" / "My Tasks" → sentence case; "Due today · n" → "Today · n"):
  `parity-map-build/verify-pm-e.cjs` · `pm-h`, `projects/verify-pj-gap-c.cjs`, `pending-modules/verify-pm2-s10.cjs` · `s42a`,
  `simplify-projects-finance/verify-r3.cjs`, `uat-dane…/P5b`, `folders/verify-folders-pickers.cjs`, `keyboard/verify-kb-r2.cjs`, `consistency/verify-overlays.cjs`.
- *Notes, the log, Files, Questionnaire* ("Notes & Logs", "Contact Log", "Site visit", "Ask Client", "New File", "Deleted Files"):
  `global-search/verify-search.cjs`, `projects/verify-pj-gap-a.cjs` · `pj-r1` · `pj-gap-d`, `parity-map-build/verify-pm-f.cjs`,
  `pending-modules/verify-pm2-s06.cjs`, `consistency/verify-overlays.cjs`.
- *Meeting Copilot* ("co-pilot", "Briefs to save" → "Meeting Copilot", "Summaries to save"): `pending-modules/verify-pm2-s41b2.cjs` · `s41b4` ·
  `s35` · `s42c`, `uat-dane…/P2b`.
- *Qanvast Ops* ("Request Leads" / "Request reviews" → the ⋮'s "Request leads" / "Ask for reviews"): `responsive-all/verify-rwd-c1.cjs`,
  `uat-dane…/P6`.
- And `responsive-all/verify-rwd-w2.cjs`' "the client's meeting link: the place is 44 tall" fails here for the clock (see §5).

## 8 · ▲ For Vicky — calls he might not expect

**The lead's page**
- An unowned lead's filled button reads **"Assign a member"** (it read "Move to Contacted" and refused). It opens the Assign window, and the
  move it stood for runs once a member is saved. Stage ▾ still offers every move.
- **The locked "Convert to Project" left the header.** Won in Stage ▾ carries its handle and its refusal (the whole path to Won, with the way
  on) at every width. A lead that may reach Won still converts from the primary, as before.
- **The Overview's header has no meta chips.** Phone, email, budget, type and source live in the info column. The other tabs (which have no
  column) say them as one plain grey line. The Qanvast mark and the return state stay chips on those tabs.
- **The info column shows only filled rows.** Each section's empty fields become one link, such as "Add district, area size…", which opens
  Edit details on the first empty field. NRIC / FIN and Customer ID moved to Other info. The **Owner row is gone**: the Members list marks
  "(you)" and, when there are several members, "· in charge" on the first. The same component is the project's left column.
- **The Maison AI card shows one action and no Show more.** Every brief action is in the Maison AI sheet, which used to list three.
  - I rewrote the briefs from the record (days in the stage, whether anyone owns the lead, a Lost lead's own reason).
  - I removed every "n× more often" figure, because the prototype has no source for them.
  - Two actions are renamed: "Book the first meeting" (was Auto-schedule first meet) and "Remind me in 6 months" (was Set a 6-month
    revisit). The old labels still resolve.
  - A project keeps its stack of briefs.
- **The QUOTES card says the state once, as a sentence about the client** ("Approved — not sent to Vivien yet"). Its track has no step
  labels. Its empty state is one outlined "Create a quote", which opens the Create Quote window (it had From Scratch / From Template).
- **LEAD STAGES:**
  - Future rows show nothing.
  - The head reads "In New for 50 days" / "Took 13 days to win".
  - Response time is in words, e.g. "Not assigned for 50 days · first reply in about a day". The Won leg shows only from Quote Sent on.
  - "Next follow-up · None — add one".
- **Every house detail card's head is bold sentence case** (it was 12/600 grey capitals). This changes the look of every Overview card on a
  lead and on a project.

**The listing**
- **The docked "Review imported leads" bar is gone.** The queue is a row in the scope pill: "Needs your attention › To review · n". The
  import's snackbar still offers Review.
- **"Insights" left the header** and is now the ⋮'s first row, named for the place it opens: "Reports".
- **Add Lead ▾ had five rows; New lead ▾ has three:** Type in a lead · Import a file · Get leads automatically…. The last opens Company ›
  Integrations, which holds Email, Zapier and Meta Lead Ads (they were three rows).
- **Rows lost their hover Edit pill.** Edit is the first row of the ⋮, and the ⋮ is grey.
  - An empty task cell reads "No task" in grey and shows "Add task" on hover.
  - Assign is a grey person-plus.
  - The listing has no purple at rest.
- **The table's Filters drop the Sort tab** because its heads sort. The kanban and the phone keep it.
- **On a review card, the per-card Approve / Reject verbs are gone.** The pane's foot holds them once. "Approve All Clean (13)" is the
  house primary "Approve 13 (no duplicates)", no longer green.
- **Deleted leads' orange band, with its ✕, is now a quiet line:** "Deleted leads are removed for good after 30 days."
- **"Unseen" is "Not opened yet"**, and the phone card's NEW tag is gone because the band says it.
- **"Return Lead" is "Return to Qanvast"** everywhere in the lane.

**House (B3's requests, applied here)**
- **Every menu's group titles are now sentence case at 12px.** They were 10px grey capitals (`DropdownLabel`, REG-728's recipe), and the
  change reaches every menu in the app.
- **The lead's ⋮ says "Client portal"**, as the project's does (was Invite to Portal).

**Wording that reverses a mock or an earlier call**
- "Visit" for "In person" / "Site visit" (display only).
- "How · When · How it went" chips on the desk contact log (the desk had a select).
- "Contact log" and "Notes & logs" (sentence case).
- A log's list title is channel + outcome.
- The phone note composer is closed at rest, which reverses REG-381 / REG-402.
- Empty states on a record page are outlined, which follows the audit's T-03 over page-checklist ② (REG-735).

**The forks' calls**
- **Tasks:**
  - "Studio tasks" is "General tasks" everywhere a task on no record is named.
  - /tasks opens without Creator and Tags (Column settings brings them back).
  - /tasks' ⋮ lost Delete all. To delete everything, select all and use the bulk bar.
- **Meetings:**
  - The tiers are "Very likely · Likely · Maybe · Unlikely", but the measure keeps the name "Deal score" (W-040 "Chance" not used).
  - "Good / Fair / Weak match" splits at 70 / 40, which is new copy.
  - "summary" replaces "brief" everywhere.
  - "Won after" sits beside "Not going ahead".
- **Qanvast Ops:** the header is title + ⋮ only (New Qanvast lead · Request leads · Reports · Export). Its name and the Studios tab are kept,
  as the contract says.
- **Not unified:** On Hold has no "No date yet", because the lead's date is required (REG-453). The project's set differs. Decide once.

**Register:** Numbered REG-3112…3152 (see build/reg-map.json) — the lane 3112–3128 · Tasks (A) 3129–3135 · Meetings, Qanvast Ops, Hangouts (B) 3136–3145 · the lead's tabs, Move stage, the log sheet (C) 3146–3152.
