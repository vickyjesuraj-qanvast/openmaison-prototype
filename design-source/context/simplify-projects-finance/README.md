# Projects & Finance, simplified — the study (2026-10-09)

The owner, after the Lead ↔ Project parity build: "I still feel the projects and finance looks super complex and not intuitive and with
really super high cognitive load. I want you to audit in depth for projects and finance modules across to simplify/make it best of the
layout, flows, UI, UX, and IA without losing any functionalities and features … Propose the best experience with visual report."

A proposal, not a build. Five read-only studies on a production build on a scratch copy (1440 · 390 touch), as a Designer on site, an Owner
on Monday and an Admin paying vendors:

- `P1-project-page.md` — the project page: 14 tabs, the Overview's 77 controls / 72 numbers, seven places that say "what needs you".
- `P2-project-flows.md` — the project's life end to end (15 jobs, presses per job, the seams between features, the client loop).
- `P3-project-money.md` — the Money tab: 11 sections, 57 money figures (17 distinct), one invoice across five tables, profit inside Costs.
- `F1-finance.md` — Company › Finance: 8 tabs by record type; 6 of 15 waiting items shown; Reports' numbers that disagree.
- `R-benchmark.md` — how Houzz Pro, Buildertrend, Procore, CoConstruct, JobTread, Monograph, Studio Designer, Xero, QuickBooks and others
  organise the same jobs, with sources.

**The review page:** https://claude.ai/artifact/XfuYjdho5vUxE9xnMq2fhu (source `report/projects-finance-simplified.html`; its pictures are
the studies' screenshots). Seven root causes, one idea — every page answers *What needs me → What's next → Where does it stand* — and
concept screens drawn with Benjamin Han's (P-2026-002) and Demo Studio's real records: the project Overview (1440 + 390 with the site bar),
the Mark done sheet, the Money tab, Finance › To do. **25 proposals (S-01…S-25) and 18 questions (Q-01…Q-18)**, each with her pick
(Build · Discuss · Skip, a note; questions: an option). Her picks live in that page's db (collection `picks`, one document per S-/Q- id) —
read them before building.

The headline numbers: project tabs 14 → 7 (Overview · Tasks · Schedule · Client · Design · Money · Files & notes); "what needs you" 7
places → 1 ranked list (the header's button = its top row); Benjamin's Money tab 8.6 phone screens → ~2; Finance 8 tabs → 5 (To do ·
Money out · Vendors · Commission · Xero); closing a stage ~16 presses and 3 WhatsApp drafts → 3; the five most-used project flows ~63 → ~30.

Several proposals revise earlier decisions and say so on the page: P-04 (8 Oct, Files and Questionnaire cards on the project Overview),
REG-917 (the header's registry order, the Start dialog), REG-1182 / REG-1400 (tab counts), REG-914 (red rows), Q-24 (the handover
checklist), H-Q18 (studio replies not emailed), mock 780:92744 / REG-149 (the Won step's split for a system quote).

Things the studies found that look like bugs (S-25 on the page, plus Q-14 · Q-17 · Q-18): the studio's client preview says "Under way"
where the portal says "Paused"; the Contract dialog names "Files › Contract" but the folder is "Contract & VOs"; Delete forever skips
projects with money recorded without saying so; phone schedule rows have no Mark done; escalated tickets drop out of attention during a
hold; the Won step's split is editable but ignored for a system quote; "Ask for more time" restrains nothing while a Designer can drag.

Side effects on the scratch copy only (never local.db): opening Benjamin's Messages tab marked his message read; the portal preview wrote
its own session row. Screenshots and measures: the session scratchpad `simplify/shots/{P1,P2,P3,F1}/`, `simplify/p1…p3/`.

The build plan on the page: four rounds — ① one list of what needs you (+ Finance › To do, honest profit, the bug fixes) ② fewer places
(tabs, the Money regions, Money out, Commission, one Settings home) ③ one sheet per moment (Start · Mark done · Hand over) ④ the phone and
the numbers.

## Built (2026-10-09)

Her answer to the page: **"Go ahead and build everything as you found and what's best and your recommendation without losing anything."** No
picks were saved on the page, so every proposal was built (S-01…S-25) on the recommended answer to every question (Q-01…Q-18); Q-11 (hide
modules a studio doesn't use) was recommended *Later* and is not built.

Seven packages in the main tree, one contract between them (the shared brief, kept in the session scratchpad `sbuild/shared-brief.md`; its
contracts A–F are restated in each outcome): **K-N** Needs you + the Overview · **K-F** the frame, the 7 tab groups, the phone's Create group and
site bar, Design › Designs · **K-M** Money on a project · **K-R** Finance + Reports › Finance · **K-T** the Start / Mark done / Hand over sheets,
pause, New project, the Won step · **K-C** the client loop · **K-S** Settings + the listing's review scope. Each package's outcome (files, what to
check, probes changed, what it could not finish) is `build/outcome-K-*.md`; its register rows `build/reg-K-*.md` (numbered REG-1445…1524); the
merge is REG-1525, the verification round REG-1526. A helper then updated the UAT story (95 of 444 steps, chapters 1–21; `design-source/uat/`).

**The merge:** migration `0083_done_ask_ticks` (`project_milestones.done_ask_json`); repairs R93 (signed quote lines name their trade's vendor,
for Order from the quote) and R94 (approvers' PO / expense bell rows open Finance › To do), then the baseline; the listing's *invoice ready*
reason from day one; Won (listing and lead page) opens the new project, which says "Project P-… created" (`?created=1`); the hold dialogs carry
the project's id (the Tell tick everywhere); the approval switches shown once on Settings › Projects; "Commission" and the bill-due email's
words; *Reset prototype to base* forgets Reports' remembered tab. Fixed while verifying: the To collect tile's hover counted a one-off as
"invoiced"; Messages `?compose=1` and Choices `?open=` cleared their own timers before the caret / the pulse landed (the second predates this
build); the money row's reminder line lower-cased the month.

**Left for Vicky / the developers after round 1** (each outcome file has the detail) — **all closed by round 2 below**, except the calls it names:
- A client's priced pick drafts its VO as the signed-in studio member (the prototype's "you"); with real sign-in it needs a system path
  (a server-only draft taking the project's own member) — K-M outcome, Needs 3.
- "Send VO-n" opens the VO in the quote editor (Send ▾ one press away); a deep link straight to *Send for confirmation* is the quote editor's
  (unowned) call.
- An Undo after an automatic client email (share, invoice, hold, handover) takes the records back but can't unsend the email (as every client
  email today).
- "Draft it" (the weekly update) saves the draft and lands on its card in Updates, not inside the composer; Send back / Decline in Needs you open
  the record where the note dialog lives.
- The Hand over checklist now asks for the mandatory compliance Handover item on every HDB / condo / landed project (deferrable as before).
- The Compliance view (now Tasks › Compliance) draws its item lists with the card table's rows and no head row; `design:anatomy` (which now
  measures Finance's five tabs, the Designs · Questionnaire · Floor plan · Notes views and Settings › Finance — 71 pages) leaves it out with a
  note rather than restyle gaps build I's approved page. Vicky's call whether its lists take a head.
- More fixes from the visual pass (all 1440 / 768 / 390 on the production build): the Overview's Money card no longer repeats Needs you's
  money row and its captions fit the glance column; With {client} says a choice-held milestone wait once; fold rows (Show n more · Payment
  stages · Paused while on hold) carry one chevron; the Hand over checklist's fix buttons wrap under each other; the invoice panel's amounts
  read "Amount · incl. GST"; Billing's columns give the sub-lines room; Finance's tile grids (Commission, Xero, Reports — they composed the
  Money tab's removed `.tiles`) are the house tiles; "Pay yourself" on your own commission; the phone Schedule keeps its own dock (no site bar).
- Not built from the studies' extra options: the member PayNow field (new data), dropping a bill PDF anywhere on Money, a due-day reminder
  email, a planned margin from the quote's costs, the bell's in-row Approve on a phone, fee-first in the split dialog.

## Round 2 — every pending item closed (2026-10-09)

Her ask: **"Can you please check and fix all the pending things."** Six packages (brief: session scratchpad `sbuild/round2-brief.md`; outcomes
`build/outcome-R2-{A…F}.md`, rows REG-1527…1554, the merge REG-1555), on one migration written first (`0084_simplify_round2`: `members.paynow` ·
`notification_outbox.send_after` + `held` · the asks' `task_id` / `variation_id` on messages and tickets) and two repairs (R95 · R96).
- **R2-A Money & the VO** — a client's priced pick drafts its VO on a system path (`lib/projects/draft-variation.ts`, the project's own member;
  Activity names the pick); *Send VO-n* opens *Send for confirmation* at once (`/quotes/<id>?send=confirm`); the tiles press to their lists
  (`StatTile press`); the invoice page's ghost draws Record a payment; Money at 390 (To collect full width); drop a bill's PDF anywhere on Money
  (the dialog reads it — `newBill(file)`); fee-first always shown in the split dialog (disabled with its reason); `&do=sendback`.
- **R2-B The Overview's doors** — *Draft it* opens the draft in the composer (`?draft=<id>` · `?draft=week`); Send back / Decline answered in
  place on the Overview (the tabs' own dialogs, sentences and Undo); a Done approved from the row takes the tab's full Undo; Designs says when
  the client can't see it; the phone Overview shorter (Needs you 4 rows, Coming up 3 — about 3,200px; folding Progress / My tasks / Money on a
  phone to reach ~2,900 is her call).
- **R2-C Moments & held emails** — an Undo also takes back the client's email: hold / resume / handover / the Start and Mark done sheets hold their
  client mail for the Undo's window (10 s; a handover 10 min) and release it after (`lib/notifications/held.ts`, `holdClientMail` ·
  `releaseHeldMessages` in `delivery.ts`; Sent messages shows *Held — goes at … unless undone*); an approval's photos post as the one who asked
  (`lib/projects/acting-author.ts`); one reminder line on the Hand over sheet.
- **R2-D The client loop's records** — an ask's task / order on its message or ticket (columns, R95 backfill); Activity's ask sentences; the
  client email *A payment is due today* (`lib/portal/payment-due.ts`, off by default; it reaches whoever the invoice email reaches).
- **R2-E Finance, the bell, ⌘K** — a member's PayNow (Company › Members; shown with Copy in every pay dialog; R96 fills the demo's); the bell's
  approval rows act in the row (Approve · Send back / Decline; PO and invoice open their send); ⌘K finds Document numbers and What waits for an
  Owner or an Admin; the Profit tile presses to Costs; dead actions removed.
- **R2-F Compliance & the checks** — the Compliance view's lists (and, at the merge, the Navigator's rule lists) are card tables with their head;
  `design:anatomy` measures both; probes made sturdy (gap-e's Sent messages event; Needs you's *Show n more* unfolded before folded rows).

**Round 2's checks** (REG-1556): the snackbar now sits above menus and the bell's panel and its host carries `data-om-snackbar`, so Approve in
the bell answers with an Undo you can press and the bell stays open (the client's bell had the same latent gap); the phone Money tiles' row fixed
(a stray JSX text node counted as a fourth tile). All 26 Projects probes, `verify-ks` (29) and `verify-r2e` (25) green.

**The three open calls, decided (2026-10-10, her "you decide the best as per the best UX and 2.0 POV")** — REG-1557…1559: the payment-due
email stays with clients on the portal, and a client who won't hear by themselves becomes the studio's Needs you row on the due day ("due today",
Remind on WhatsApp · Record a payment); the phone Overview folds Progress's stage rows (the header's Stage ▾ says and runs them) and Recent
activity to one Show / Hide row; under Activity › All a task or VO made from a client's ask is said once, by the ask's line (its own line keeps
its chip). **Round 3's checks:** all 26 Projects probes green on a baseline copy (gap-h now asserts REG-1559 in § 11; gap-f1 puts bill WC-2391
two days out for its bell read, since "coming due" is a window on the real clock), the new `design-source/verify/simplify-projects-finance/verify-r3.cjs`
(13: the due-today row, its absence when the client hears by themselves, gone once reminded; the phone folds; Setting up keeps its rows; the
desk unchanged), shots in `verify/simplify-projects-finance/r3/`. **For the developers:** run `releaseHeldMessages()` and the due-day sweep from the
production scheduler (the prototype runs them when the bell or Sent messages is read).
