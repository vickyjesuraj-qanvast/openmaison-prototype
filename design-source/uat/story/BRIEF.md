# UAT story — shared brief for the chapter writers

Repo: /Users/vicky/Documents/GitHub/openmaison-prototype (read CLAUDE.md first — it is the map of every module).
Output folder: /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/3d178797-9f6d-4654-9be0-22448502c3dc/scratchpad/uat/

## What we are making

A User Acceptance Test script in a Google Sheet for three **non-technical** testers (Dane the PM, Oliva, Swati). Each walks the WHOLE story, in order,
on their own laptop (`npm run dev` → http://localhost:3000, desktop browser ~1440 wide), starting from Maison AI (the ✦ button, bottom right)
› "Reset prototype to base". The story must (a) exercise every module and flow of OpenMaison 2.0, and (b) prove every 1.0 feature the parity
audits say 2.0 now has — each step lists the audit rows it covers.

## The story frame

"Demo Studio has just moved from OpenMaison 1.0 to 2.0. Its team, leads and quotes came across (that is the demo data). You are **Dane, the
studio owner**, logging in on your first day." The tester plays Dane unless a step says **View as <name>**.

**The tester's own lead (the thread through chapters 4–9):** **Sophia Wong**, phone **9765 4321**, email sophia.wong@example.com, 4-room HDB,
Tampines, budget around S$60,000. Created in chapter 4; worked in 5; quoted in 6; compared in 7; contract signed in 8; Won in 9.
Seeded demo leads (fixtures/baseline.json `leads`) are used for everything else — name them exactly (e.g. "Kenji Sato").

**The tester's own price-book item (chapter 3 → chapter 6):** "Fluted feature wall panel" (carpentry; pick the real category / unit options the
item dialog offers).

**View as (being built now, REG-667 — write steps against this spec):** the **Demo Studio** block at the bottom of the side navigation
(avatar + "Demo Studio" + the member's name) opens a menu titled **View as** (tagged *Demo only*) listing the team with roles:
Dane · Owner, **Hui Min · Admin** (new member being added), James · Manager (Sarah and Michelle report to him), Sarah · Designer,
Michelle · Designer, Germaine · Designer, Alex · Designer. Picking one makes the whole prototype behave as that person (which leads they see,
what they may do, whose bell, whose name on actions, who "You" is). The block then shows "Viewing as Sarah". On a phone the same menu is in the
More sheet. "Reset prototype to base" returns to Dane. Chapter 10 is where roles are tested; other chapters stay as Dane.

## Chapters (one writer owns each chapter; step ids are `<chapter>.<two digits>`, e.g. 5.07)

| Ch | Title (tab section) | What the studio does | ~rows |
|---|---|---|---|
| 1 | First login | Look around: side nav, Search ("/"), Tools, Company panel, the bell, Maison AI, the Leads list at a glance, a "Coming soon" affordance | 8 |
| 2 | Set up your studio | Company › Profile (details, issuing entities, bank / PayNow, socials), brand kit, Members (add, manager, open to new leads, preferences, deactivate + Undo, reactivate), Settings modules Studio (GST, Who may do what) · Lead management (sources, reasons, stage movement, who sees leads, lead capture, custom fields) · Quotes & pricing (numbering, trades + trade notes, rounding, approvals, backup approver, payment lock, prepared by) · Notifications | 30 |
| 3 | Build your library | Company › Price book (My Items add / edit / import / export / bulk edit / history, My Sections), Company › Templates (Quotes gallery: new from a house style, edit in the template editor, publish, make default; brand kit tab; Contracts, Tasks, T&Cs & Notes, Payments libraries), Company › Questionnaire bank | 30 |
| 4 | Leads arrive | Create Sophia Wong by hand (+ the duplicate warning with a seeded phone), the "C" shortcut, import a spreadsheet (CSV / XLSX) and a PDF lead sheet, review imported leads (duplicates, merge), Integrations (webhook / Gmail simulate), a Qanvast lead, the list: search, filters (+ quick filters, This month), columns, board (kanban), export, bulk assign | 22 |
| 5 | Work your lead | Sophia: open, Overview, assign (the suggested member), Move stage → Contacted (log, Auto Fill, suggested tasks), a follow-up, Notes, Tasks, Files (upload, folder, viewer, comment), Questionnaire (ask the client), → Met (meeting log), Activity | 28 |
| 6 | Quote it | Create quote for Sophia from the default template, Items (add from My Items incl. the fluted panel, sections, sub-section, Print as, highlight, optional, named discount, paste from Excel, keyboard, drag), Payment schedule, T&Cs & Notes, Files, Signature, client view, Preview, Save as template, approval, Send / Send for confirmation → open the link as the client → Confirmed, a revision + Version History, the due date → follow-up task, Tools › Quotes, Deleted quotes, line comments, Upload a quote | 35 |
| 7 | A rival quote | Quote X-Ray: compare Sophia's quote with a rival's file, read the result, correct a match, send the WhatsApp summary (do not actually send), Run again, Recent; Lost to a competitor on a SEEDED lead | 10 |
| 8 | Sign the deal | Contract from Sophia's quote (template picker), edit (Smart Text, outline), eSignatures + read-and-accept, Send for digital signature → copy the link → sign as the client (draw / type, NRIC masked) → signing record, Send together (quote + contract bundle), Mark as signed on another lead, move-back rule, Tools › Contracts, Deleted contracts | 20 |
| 9 | Win, park or lose | Sophia → Won (the Won step, payment split) + Convert to Project; On Hold with a follow-up date on a seeded lead; Lost with reason + Undo; Resume a parked lead; Return a Qanvast lead (reasons, window) + Undo; Invite to Portal; Qanvast Ops › Leads; delete a lead (warning) → Deleted leads → restore | 16 |
| 10 | A designer's day | View as Sarah: sees only her / team leads, the Assign rules, proposes a price-book item, submits a quote template for approval, a quote that needs approval, read-only Settings; View as James (Manager's team); back to Dane: approve / send back, the bell; View as Hui Min (Admin) | 14 |
| 11 | The owner's week | Tasks (rail) page: studio tasks, overdue badge, filters; the bell's feed + Settings › Notifications; Leads › Insights; Activity tab; Tools › Quotes and Contracts lists; Quote X-Ray list | 10 |
| 12 | On your phone | ~10 key tasks at phone size (open the "Network" address `npm run dev` prints on a phone on the same Wi-Fi): the lead cards, the More sheet, a lead's tabs, Move stage, the quote Items as cards, signing page, bottom sheets | 12 |

Continuity: a step may rely only on the demo baseline + earlier chapters. If a chapter changes a studio rule (e.g. stage movement Flexible,
Who sees leads, approvals), a later step in the SAME chapter switches it back. Never leave the studio in a state that breaks a later chapter.

## Row format — write a JSON array to `ch<N>.json` (one file per chapter)

```json
{ "step": "5.07", "chapter": 5, "scene": "Log the first call",          // scene = a short sub-heading grouping 2–6 steps
  "module": "Leads",                                                      // one of: Shell · Company · Settings · Price book · Templates · Leads · Lead details · Tasks · Quotes · Quote X-Ray · Contracts · Notifications · Insights · Phone
  "try": "Log your first call with Sophia",                               // ≤ 12 words, a task in a studio person's words
  "how": "1. Open Sophia Wong\n2. Click \"Move stage\"\n3. ...",          // ≤ 4 short numbered steps; exact on-screen labels in double quotes
  "expect": "The lead shows Contacted and the call appears under Notes",  // ≤ 25 words, what they should see
  "in10": "Same as 1.0",                                                  // "Same as 1.0" · "Different from 1.0: <≤10 words>" · "New in 2.0"
  "as": "Dane",                                                           // who the tester is for this step (Dane unless View as)
  "covers": ["LEADS:D-12", "LEADS:DEF-05"],                               // audit row ids this step proves (prefix = audit key below)
  "files": []                                                             // sample files the step needs, if any (see below)
}
```

Audit keys: LEADS = 01-leads…, QTPL = 03-quote-templates…, QED = 05-quote-editor…, CTR = 07-contracts…, XRAY = 09-quote-x-ray…,
SET = 11-accounts-setup…, PB = 13-price-book… (all in design-source/context/parity/). A row id is the first column of the audit's §1 / §2 / §3
tables (DEF-nn, MM-nn, L-nn, D-nn …).

## Writing rules (the testers are not technical)

- Plain words. No code words (no "modal", "toggle", "server", "REG", "state", "flag", "URL" → "link", "kebab" → "the ⋮ menu").
- Every on-screen label you quote MUST be read from the code (component files, `lib/leads/enums.ts`, `lib/forms.ts`, etc.). Never guess a
  label. Buttons / menu items / tabs in double quotes exactly as rendered (mind the case).
- One step = one thing to check. The "expect" is observable on screen. Prefer checks a tester can judge in seconds.
- Where 1.0 did it differently, say how in ≤10 words in `in10` so the tester knows what changed on purpose.
- Anything that needs outside systems (real WhatsApp send, real email, real Gmail, a real portal client) → the step uses the prototype's
  stand-in (copy the link and open it in a new tab; "Simulate"…) and says so. WhatsApp: "a WhatsApp tab opens — close it, do not send".
- Sample files: if a step needs a file the tester would not have (lead spreadsheet, PDF lead sheet, a rival quote, an Excel block of items to
  paste, an image), name it in `files` as `uat-files/<name>` with a one-line description of its content in `ch<N>-files.json`
  (`[{ "name": "...", "purpose": "...", "content": "exact rows / text to put in it" }]`). They will be served from the app at
  http://localhost:3000/uat-files/<name>. Check what the importer / X-Ray reader actually accepts before specifying the content.
- Keep to the row budget ±30%. Group steps under scenes that read like a story.

## Also, for the audit(s) you own — `checklist-<KEY>.json`

Every row of the audit's §1 Definitions, §2 Mismatches and §3 Feature matrix:
`{ "key": "LEADS", "id": "L-07", "area": "<the §3.x heading, short>", "feature": "<the 1.0 feature, ≤12 plain words>",
   "now": "<Built | Built in parity round n | Not built — by design | Excluded | Later | Platform | Dead | 2.0 only | Open question>",
   "why": "<≤15 words when not Built — from the audit's proposal, §9 answers or §10 build log>" }`
Decide `now` from the matrix status PLUS the audit's §9 answers and §10 build log (rows the rounds closed are "Built in parity round n";
rows the build log lists as "Not built, by design" are that). Do not map steps here — the steps' `covers` are joined later.

## Hard rules

- Read-only on the repo: do not edit, create or delete anything under the repo. Do not run the dev server, a build, migrations or seeds, and do
  not open or write local.db. For demo data read `fixtures/baseline.json` (it is what "Reset prototype to base" restores).
- Write only into the output folder above.
- Finish with a short report: files written, row counts, any flow you could not find in the code, any label you were unsure of.
