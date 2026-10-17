# S10 · The mAIson assistant — outcome (2026-10-11)

Cards: `studio:maison-assistant` (mAIson assistant, AI chat) · `api:maison-bot-assistant` (mAIson Bot) · `held:maison-ai` (Maison AI, the
assistant) + the steps' notes addressed to S10 (after S04 · S05 · S06 · S07 · S08 · S09). 1.0 read: `src/components/layout/id-buddy-panel.tsx`
(the panel: CHIP_PROMPTS — Optimize Quote · Draft Follow-up · Analyze Lead · Generate Moodboard · Site Update — WELCOME_CARDS, the "New chat"
confirm, the transfer from the Dashboard's chat-first home), `src/lib/hooks/use-maison-stream.ts` (the conversation kept in one tab's
sessionStorage), `src/lib/agents/{tools,page-tool-map,system-prompt,loop,executors}.ts` (66 tools; writes — create_lead · update_lead ·
create_task · update_task · create_invoice · create_expense · create_purchase_order · create_variation_order · record_invoice_payment … —
made at once, no confirm step; "don't batch without user confirmation" only for approvals), `src/app/api/buddy/chat/route.ts` (Gemini through
OpenRouter; no credits spent). Register rows: `steps/reg-S10.md` (REG-S10.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s10.cjs` (**107 / 107** on a fresh copy of the repaired base; a full `.dump` before and after a run differs by nothing once the probe puts Company › Client portal’s test-client look back); shots banked in `design-source/verify/pending-modules/pm2-s10/`.

**The shape:** one Maison AI — the FAB's sheet, everywhere (no second assistant, no rail item, no page). Every suggestion acts or is asked;
the Ask box answers by rule from the records; a change is shown first with one button and done by the house action (or lands in the house form
filled in); the member's questions are a record (Recent). Nothing calls a model; nothing is metered (1.0 charged nothing for chat). **The seam
for the developers' model is one function**: `readQuestion(question, ctx)` in `lib/maison-ai/answer.ts` — today the intent table
(`matchQuestion`), later a model that returns the same `Match` (an intent = a tool, its params = the tool's arguments); every answer, Who sees
leads, the books' rule and the confirm before any change stay where they are.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| maison-assistant · Free questions on any topic — the Ask box understood five | **Built by rule (stand-in for the model)** — about 45 intents (tasks, leads, a client by name, quotes, the team, approvals, the studio today, the books' reports, repeats, credits held, AI credits and the plan, set-up, the clients' side of the tools, money and task changes, drafts, files, help) + the page's own suggestions in other words (`matchSuggestion`) + a bare name (its client, else its member); what it can't read: "I can’t answer that yet" with the questions it can. A model replaces `readQuestion` | `lib/maison-ai/intents.ts`, `lib/maison-ai/answer.ts`, `lib/maison-ai/answers/{common,work,money,clients,setup}.ts` |
| maison-assistant · Leads, tasks, quotes and team questions | **Built** — my tasks (overdue · today · tomorrow · this week, the member's own, Who sees leads), the leads that need attention (the listing's own overdue rule, today's, New with no contact, no member) and this week's new ones, a client's card, quotes (waiting for approval · running out · waiting on the client with their opens · drafts), a named client's latest quote read as the editor's hints, the team and one member (leads · running projects against capacity · open / overdue tasks — each opening their row on Members) | `answers/work.ts` |
| maison-assistant · Money questions as reports: P&L, GST, AR and AP ageing, cash-flow forecast, commission | **Built** — P&L, GST (P-H's), owed and owed by how late (AR buckets), what the studio owes (AP, P-H's), cash flow (the next 90 days), commission (P-H's), expenses by category, a client's statement — all through Reports › Finance's `buildReport`, with the button to the report; the books for Owners, Admins and **Accounting** (fixed — P-H gated them on Owners and Admins only) | `answers/common.ts` (`reportAnswer`), `answers/money.ts` |
| maison-assistant · Charts drawn inside the answer | **Built, small** — a report's rows carry a bar of their share of the largest figure (`MaisonRow.share`, drawn under the row; the figure is in the words): cash flow, P&L costs, expenses, ageing, credits by member, the schedule template's durations, the payment split. The full charts stay on Reports (one home), a press away | `components/shell/maison-answer.tsx` (+ css) |
| maison-assistant · Changes by chat: leads, tasks, projects, invoices, expenses, POs, VOs; record payments | **Built — shown first, always** (the cards' question taken as recommended: only propose). A proposal with Not now and one button, run by the house action: a reminder / a lead's follow-up, a task done (Undo), a repeat stopped (Undo), a Draft variation order (opens in its editor). The house form opens filled in for the rest: a lead added / moved / changed (S05), a project started (P-H), Record a payment with the amount, a one-off invoice · PO · expense · supplier bill on the project (`?new=`), a studio expense (Finance), the next stage invoice to send, a member's role (their row), a site update (the composer). **Not built:** a project's stage, hold or dates by chat (the project's own Stage menu and sheets hold those rules), approving from the box (it lists what waits and opens where it is approved — 1.0 too said "don't batch without user confirmation"), invoice / PO lines read from the words | `components/shell/maison-plans.ts`, `lib/maison-ai.ts` (`MaisonPlan`), `answers/{work,money}.ts`, `components/projects/money/{project-money,payments-section,payments-dialogs}.tsx` |
| maison-assistant · Drafts: a WhatsApp follow-up or a client message for a picked lead | **Built** — for the lead's stage (intro · follow-up · meeting recap · quote check-in · on-hold check-in · kickoff · works check-in · thank-you), one copy of the words for the lead page, the listing, Qanvast Ops and the box (`lib/maison-ai/drafts.ts`); opens in WhatsApp on the press | `lib/maison-ai/drafts.ts`, `answers/work.ts` (`draftAnswer`), `components/leads/detail/use-lead-maison.ts`, `components/leads/use-listing-maison.ts` |
| maison-assistant · Attach a file: read a quote, find surfaces, render, floor plan to 3D | **Stand-in, honest** — the box takes no files; it says so and opens the tools that read them (Quote X-Ray, Upload a quote, the AI Visualizer, the Space Planner), each pricing its own read. A model with file reading plugs in behind `readQuestion` | `answers/work.ts` (`attachAnswer`) |
| maison-assistant · Voice input | **Not built** — a speech service is a real provider (the developers'); the phone's own keyboard dictation types into the box today | — |
| maison-assistant · A conversation that carries from the home's chat box into the panel | **Built as a record** — `maison_questions` (migration 0094): Recent on every page and device, tomorrow too; the Dashboard's box (S22) writes the same rows. A short Recent, not a thread (320 wide, for elderly owners) | `lib/maison-ai/history{,-store}.ts`, `components/shell/maison-ai.tsx` |
| maison-bot · Free questions by a language model | **Stand-in kept** — by rule, the seam above; the model is the developers' | `lib/maison-ai/answer.ts` |
| maison-bot · Getting things done by chat; generate the milestone invoices | **Built** as above — "generate the milestone invoices" lists each running project's next stage invoice, ready or not and why, each opening it (with Send when it is ready) | `answers/money.ts` (`moneyNewAnswer`) |
| maison-bot · Draft a client WhatsApp or follow-up | **Built** (above) | — |
| maison-bot · Charts; cash-flow forecast; owed by age (to and by the studio); statement of account | **Built** (above) | — |
| maison-bot · Attachments in the chat | **Stand-in** (above) | — |
| maison-bot · One-tap prompts: Optimize Quote · Draft Follow-up · Analyze Lead · Generate Moodboard · Site Update | **Built where 2.0 has the record** — on the lead page the brief's buttons are these (Compare to past quotes · List optional trims · the quote editor's hints = Optimize Quote; the stage drafts = Draft Follow-up; Build a call script · Flag scope risks = Analyze Lead; Share moodboard = the Visualizer; the project's Draft an update about this week = Site Update); in the box: "optimize the quote for Olivia" (her latest quote's hints), "tell me about Olivia", "site update for Benjamin" (the composer) | `answers/work.ts` |
| maison-bot · Lead scoring, quote benchmarking, a render from the chat | **Kept, honest** — no score (2.0 dropped temperature, Q-10; the client's card shows the facts instead); benchmarking = Compare to past quotes + Quote X-Ray; a render = the AI Visualizer, metered there | — |
| maison-bot · The chat-first Home | **Kept for S22** (the Dashboard) — its box writes Recent's rows | — |
| held:maison-ai · A model-backed assistant | **Stand-in** — the seam (`readQuestion`) | — |
| held:maison-ai · Words-only suggestions (Leads listing, Visualizer / Planner homes and editors, Client portal set-up, Plan & AI credits, the AI brief's two) | **Built — each acts** (no "Coming soon" anywhere in Maison AI): listing (S05's three, now shared with Qanvast Ops › Leads), Visualizer home · Planner home · Client portal · Usage · Plan & billing · Qanvast Ops › Studios (asked and answered by rule, two proposed first), the Visualizer and Planner editors (on the page's own state), the brief's "Attach a client review" (says 2.0 keeps no reviews; offers the studio's own finished homes of the type) and "Add to newsletter list" → "Remind me in a year" (2.0 keeps no list); a plain string left anywhere is asked | `components/visualizer/{home/visualizer-home,editor/visualizer-editor}.tsx`, `components/planner/{home/planner-home,editor/planner-editor}.tsx`, `components/company/portal/portal-setup-view.tsx`, `components/company/plan/{usage,billing}-view.tsx`, `components/qanvast/qanvast-{studios,leads}.tsx`, `lib/leads/briefs.ts`, `components/leads/detail/use-lead-maison.ts` |
| held:maison-ai · Eight editors open an empty sheet | **Built** — EDITOR_LIST (below) | each editor's file |
| held:maison-ai · The lead brief's copy never signed off (REG-169) | **Kept for her** — two button words changed (flagged invented copy) | — |
| note after S04 · the quote editor's Ask box | **Built** — the shared sheet (its Ask box understands its hints in other words) | `components/quotes/editor/{use-quote-maison,quote-editor}.tsx` |
| note after S05 · the Overview's AI brief suggestions still words-only | **Built** (above) | — |
| note after S06 · "what repeats" / "stop the rent" | **Built** — the repeating expenses (with about what they cost a month) and Stop repeating proposed first, Undo; a word that names none ("rent" on the demo) lists the ones that do | `answers/money.ts` |
| note after S07 · "use the credit on the next invoice" | **Built** — held credits (the money model's own `held`), each opening Money with `&do=use` (S07's landing: on the oldest invoice that owes, with Undo) | `answers/money.ts` (`creditNotesAnswer`) |
| note after S08 · "What's left to set up?" | **Built** — `setupRows(fetchSetupFacts())`, Owners and Admins | `answers/setup.ts` |
| note after S09 · ⌘K People → `/company/members?open=<id>` | **Built** | `lib/global-search/queries.ts` |
| (found) a long answer's rows ran over each other | **Fixed** — `.row { flex-shrink: 0 }`; the sheet's middle scrolls under a short window | `components/shell/maison-answer.module.css`, `components/leads/ai-sheet.module.css` |
| (found) Accounting told "Owners and Admins only" for GST; their "who owes" read only some projects | **Fixed** — the books' rule (`seesBooks`) | `lib/maison-ai/answer.ts` |

**The ten editor sheets** (EDITOR_LIST):

| Editor | What its Maison AI offers now (all by rule from the page) |
| --- | --- |
| Quote editor | lines below cost · under a 10% margin · with no price (each to its line) · one markup across them (Set a value) — S04's, on the shared sheet + its Ask box |
| Contract editor | Is it ready to send? (Send's own checks, each with its fix) · Draft the WhatsApp to {client} (the Send dialog; blocked → says why) · What's in this contract? (its outline, a press away) · signed: Who signed it, and when? (+ the signed copy) |
| Contract template editor | Can contracts start from it? · Which fields does it fill in? (and where from) · What's in it? · a standard PDF: What does the client do with it? |
| Quote template editor | Can new quotes start from it? (Publish / Submit a press away) · Which quotes print with it? · What does a new quote start with? (New quotes a press away) |
| T&Cs & Notes | Which fields fill in here? · Is anything left unfinished? (blanks, TBC, brackets that fill nothing) · Where is it a default? |
| Payment split | Does the split add up? (when not: the fix proposed, Undo) · What a S$100,000 quote asks at each step (bars) · Where is it used? |
| Task checklist | What will it add to a lead? · Is anything missing? · Add it to a lead (the kebab's dialog) |
| Schedule template | How long does it run? (calendar days, bars) · Which milestones overlap? · Which ones ask the client to confirm? |
| AI Visualizer editor | Describe V{n} for the client (words to copy) · What would suit the {room}? / Suggest {style} finishes (each surface group opens Surfaces) · Draft the WhatsApp note (the Share dialog) · no room: how to photograph a room · the lead's style · deleted: what's in it · the client's favourite |
| Space Planner editor | Furnish the {bedroom} (Arrange by rule, proposed first, Undo) · Which pieces overlap? · How big is each room? |

## Files
New: `lib/maison-ai/{when,drafts,history,history-store}.ts`, `lib/maison-ai/answers/{common,work,money,clients,setup}.ts`,
`components/shell/maison-plans.ts`, `components/leads/use-listing-maison.ts`, `drizzle/0094_maison_s10.sql` (+ meta), the probe and `pm2-s10/`.
Changed: `lib/maison-ai.ts` (`MaisonPlan` · `MaisonRow.ask` · `share` · `MaisonAction.ask` · `useMaisonList`), `lib/maison-ai/{intents,answer}.ts`,
`components/shell/{maison-ai,maison-answer}.tsx` (+ css), `components/leads/ai-sheet.tsx` (+ css: the `recent` slot, the scrolling middle),
every editor above, the tool homes and Company pages above, `app/leads/workspace.tsx`, `lib/leads/briefs.ts`,
`components/leads/detail/use-lead-maison.ts`, `components/projects/money/{project-money,payments-section,payments-dialogs}.tsx`,
`lib/visualizer/queries.ts` (the home's leads carry `createdAt`), `lib/global-search/queries.ts`, `lib/db/{schema,baseline}.ts`,
`scripts/{snapshot-baseline,repair-demo-data}.ts`. For CLAUDE.md's Map (the orchestrator's): Maison AI = `components/shell/maison-ai.tsx`
(`MaisonAiSheet` — every editor's too · `MaisonAi` the shell's) + `lib/maison-ai.ts` + `lib/maison-ai/` (intents · answer + `answers/*` · when ·
drafts · history) + `components/shell/maison-plans.ts`; table `maison_questions`.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Answers by rule now; the model is the developers'** — one seam (`readQuestion`). Free (1.0 never charged a chat question; AI credits Q-30).
- **Only propose; the member confirms** — 1.0's mAIson wrote at once; 2.0 shows the change with one button, or opens the house form filled in.
  Where the house makes a record the moment its button is pressed (a variation order's Draft), Maison AI proposes it first.
- **Convert every words-only suggestion**; change the words only where nothing on record could stand behind them (two: the Planner's
  "Open the kitchen to the living room", the brief's "Add to newsletter list").
- **A short Recent, not a chat thread** — the member's questions as a record; the answer re-read each time; Clear with Undo; 20 kept.
- **A question it couldn't read stays out of Recent**; a page's own words pressed are not kept.
- **No lead score** — the client's card states the facts (stage and days in it, the next task, the quote, the last contact).

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** any page › Maison AI: the Ask box, "Answers from your records". Ask "my overdue tasks", "Which leads need attention?",
  "which quotes expire soon", "who is on the team", "studio overview" (each line asks again), "Cash flow" (bars under the rows, Open Cash flow),
  "Olivia Martinez", "hello there" (I can’t answer that yet + chips), "read a competitor quote". Close and open on another page: Recent
  holds them; a row asks again; Clear → Undo.
- **Changes:** "Remind me to call Olivia tomorrow at 3pm" → the proposal (For You · Due Mon … 3:00 PM · On Olivia Martinez’s lead) → Not now,
  then Add the task → "Task added — Call Olivia · Open". "Mark the task “Call Olivia” done" → Mark it done → Undo. "Stop repeating Design
  software subscription" → Stop repeating → Undo. "Draft a follow-up for Olivia" → Open WhatsApp. "Benjamin paid 5,000" → the row → Record a
  payment with 5,000.00 → Cancel. "Record an expense for Benjamin" → Log an expense on his project. "Raise a variation order for Benjamin" →
  Start the variation order → its Draft opens in the quote editor (delete it there).
- **Editors:** open each (OM-10001, a contract, a contract template, the default quote template, a T&Cs template, 20/40/40, a task checklist,
  a schedule template, Kevin Ng's design, a layout) › Maison AI: three suggestions each, each answering or opening its own dialog. On 20/40/40
  set Deposit to 25% → Does the split add up? → Make it 35% → Undo. On OM-10001 type "check the margins please".
- **Lead brief:** Serena Koh › Show more › Attach a client review; Muthu Vinay › Show more › Remind me in a year.
- **Germaine (Designer):** "GST this quarter" → Owners, Admins and Accounting only; "Benjamin paid 5,000" works (she is on his project).
  **Priya (Accounting):** Company › Finance › Maison AI: "Who owes the studio money?" (the report's figures), "What is overdue?" → Not for
  Accounting; the chips are the books'.
- **⌘K** "Germaine" › People → Members on her row. **390 / 320:** the sheet inside the screen, the middle scrolls, no sideways scroll.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0094 + repair R113) with `next start -p 3160`; :3160 stopped
after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files') · `npm run design:lint`
nothing new · `npm run design:anatomy` (on the scratch `next start`) all 1578 measures hold · `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s10.cjs`** (this step, 9 sections: the ten editors' and ten pages' sheets, the Ask box, Recent, the proposals, the money doors, the brief and the editors' own words, roles, ⌘K People, 1440 · 1024 · 768 touch · 390 · 320) | **107 / 107** — the page error log empty; a full `.dump` before and after: no difference |
| `parity-map-build/verify-pm-h.cjs` (P-H's Ask box) | 50 / 50 (first 44 + 2 failed: the deliberate change below, and "Start a new project for Mr Lim" taken by the page's own "Start a project" — a bug of this step, fixed: a page's suggestion is matched only when it is half the question at least) |
| `parity-map-build/verify-pm-i.cjs` · `verify-pm-e.cjs` (the milestone's Ask) · `verify-pm-a.cjs` (money in) · `verify-pm-j.cjs` (the planner) | 54 / 54 · 58 / 58 · 47 / 47 · 53 / 53 |
| `projects/verify-pj-gap-i.cjs` (Maison AI acting on a project) · `verify-pj-gap-e.cjs` · `verify-pj-gap-j.cjs` | 81 / 81 · 55 / 55 · 55 / 55 |
| `projects/verify-pj-gap-a.cjs` · `verify-pj-gap-b.cjs` | 71 / 72 · 71 / 72 on the base as it stands — **the clock, not this step**: the run crossed midnight into 12 Oct, past base.db's demo day (11 Oct), so Aisha's task due 11 Oct 10:00 turned overdue and her row's reason became "1 task overdue"; with the open tasks moved one day (what a restore does) **72 / 72 · 72 / 72** |
| `pending-modules/verify-pm2-s03.cjs` · `s04` · `s05` · `s07` · `s08` · `s09` | 79 / 79 · 82 / 82 · 113 / 113 · 89 / 89 · 70 / 70 · 79 / 79 |
| `lead-project-parity/KE/verify-ke.cjs` | **31 / 31** — it had never run since S05 (its own `sqlite3` quoting broke on the JSON's double quotes before any page): fixed in the probe; then two stale assertions corrected (below) |
| `reports-in-company-2026-10-08/verify-reports.cjs` | 41 / 41 |
| regression lane (`design-source/verify/regression/run.cjs`, on the base with the open tasks moved to today): `kb-r2` · `sw-r2` · `view-as` · `ghosts-same` · `ghosts-same-390` · `ux-p7` · `ux-p1` · `dane-p1` · `dane-p6` · `overlays` · `search` · `viz-studio` · `viz-sheets` · `rooms-menu` · `tpl-parity` · `ct-r1` · `ct-r3` · `qe-r1` · `first-run-full` · `first-run-empty` | 29/29 · 27/27 · 23/23 · 51/51 · 51/51 · 94/94 · 81/81 · 47/47 · 41/41 · 67/67 · 27/27 · 37/37 · 14/14 · 10/10 · 20/20 · 36/36 · 28/28 · 34/34 · 6/6 · 89/89 |

**Assertions changed** (each commented in the probe): `parity-map-build/verify-pm-h.cjs` — a Designer is told the books are for "Owners, Admins
and Accounting" (*a deliberate change of this rule*: P-I made the books Accounting's too; the box had kept "Owners and Admins"); `KE/verify-ke.cjs`
— its `sql` helper escapes the shell's double quotes (*a probe fix*), an unstamped member who is the viewer reads "You were added to the lead."
(activity.ts's own words — *a probe fix*), and "never ‘team’" no longer catches P-G's "A teammate writes in a project’s team chat" (a
conversation's name — *a deliberate change of this rule*).

## Migration and repair
- **Migration 0094 `maison_s10`** (additive): table `maison_questions` (id · member_id · question · title · path · project_id · milestone_id ·
  asked_at · cleared_at; index on member + asked_at) — added to `BASELINE_TABLES` and the snapshot's `TABLES`.
- **Repair R113** — nothing seeded (a made-up Recent would claim questions nobody asked); a question of a member no longer there goes; a member
  keeps their newest 20. Three checks in the closing list. On the demo: "no questions yet — Recent fills as the studio asks"; full repair:
  all checks pass. R113 is the last R used.

## For the next steps
- **S22 (Dashboard):** its chat box is `MaisonAiSheet`'s Ask box in another place — call `answerQuestion` and the rows land in Recent
  (`maison_questions`), so the conversation carries into the sheet. Recent's three rows are `fetchAskHistory()`.
- **S20 (AI Visualizer):** the editor's suggestions are on the page's state (`aiSuggestions` in `visualizer-editor.tsx`); "Suggest {style}
  finishes" opens Surfaces per group — applying a pick from the sheet would be the next step, behind the editor's own Undo.
- **S29 (AI writing help):** the box writes no text; drafts are `lib/maison-ai/drafts.ts` (rule-built words) — a model would sit behind them.
- **S30 (sign-in):** Recent is per member (`fetchViewer()`); nothing else to move.
- **The orchestrator:** `pbuild/base.db`'s demo day is 11 Oct — from 12 Oct its open tasks read a day late (pj-gap-a / pj-gap-b's
  on-hold row "raises nothing" turns "1 task overdue"); re-take the base (or move its open tasks to the day) before the next steps' probes.
  The KE probe runs again (its quoting fixed) — 31 / 31.
- **Developers:** a model replaces `readQuestion` (same input, a `Match` out); a speech service for voice; file reading in the box; every
  proposal runs a house server action that re-checks its own rule, so a model can only ever propose.

## Principles check (DESIGN-1. **The mock wins, every exception written down** — no mock for a chat; built on the sheet she approved (A4, REG-507) and its answer panel
   (I-Q18): no new surface. Every new word is flagged invented copy in `reg-S10.md`; two brief buttons' words changed and are flagged for her
   (REG-169's sign-off is still hers).
2. **One system, no one-offs** — ONE sheet (`MaisonAiSheet`) for the shell and all ten editors; the house field, chips, buttons, rows,
   snackbar-with-Undo; the bars are the answer row's own; the drafts are one copy for every place that drafts; every change runs a house
   action, never a new write path.
3. **Plain words for studio people** — "Task added — Call Olivia", "I can’t answer that yet", "Owners, Admins and Accounting only", "Due
   Mon, 12 Oct ’26 · 3:00 PM", calendar days, never "intent", "model" or "AI-generated".
4. **Nothing is lost** — every 1.0 mAIson job is mapped line by line above; what isn't built says why (voice, files in the box, a score,
   changing a project's stage by chat); Recent's Clear has Undo; a question is kept 20 deep.
5. **Say why** — a refusal answers with its rule in the answer (the books' rule, Accounting's, roles, set-up, "That isn’t yours to start on
   this project …", "Set up the payment schedule first …"); a proposal says what will happen, for whom, when and where before its button.
6. **Back returns where you came from** — every answer row and link carries `?from=` (`go`); the Money landings strip their marks; the editors'
   rows act in place.
7. **Every screen is whole** — the sheet's loading line, the honest fallback, "Couldn’t look that up — please try again", Recent shown only
   when there is one; no new page, so no new ghost (the brief's ghost is generic bars — unchanged).
8. **Every width is designed** — 1440 · 1024 · 768 touch · 390 · 320 checked by the probe against `screen.width`; the sheet never grows past
   the window (its middle scrolls); the rows no longer overlap (fixed).
9. **Tables follow the leads listing** — no table added (the answers are the house rows).
10. **Motion with purpose** — none added: the sheet's own spring, the snackbar's.
11. **Honest data** — every answer reads the records when asked (Recent keeps questions only); R113 seeds nothing; the stand-ins are said
    (the box reads no files; the portal's six digits; no model); never a guessed figure — the books' answers are Reports › Finance's own.
12. **Reach for everyone** — the Ask box is a form (Enter asks); Recent is a labelled list of buttons with a 36-tall Clear; proposals use the
    DS buttons; bars are `aria-hidden` (the figure is in the words); Escape closes; the editors' FABs toggle (REG-153).
- **How to add a missing thing** — one home (the FAB's sheet, on every page; no rail item, no page); shown only when it applies (Recent,
  a proposal only for whoever may make the change, Accounting's own chips); one filled button (the proposal's); nothing to set up..md)
1. **The mock wins, every exception written down** — no mock for a chat; built on the sheet she approved (A4, REG-507) and its answer panel
   (I-Q18): no new surface. Every new word is flagged invented copy in `reg-S10.md`; two brief buttons' words changed and are flagged for her
   (REG-169's sign-off is still hers).
2. **One system, no one-offs** — ONE sheet (`MaisonAiSheet`) for the shell and all ten editors; the house field, chips, buttons, rows,
   snackbar-with-Undo; the bars are the answer row's own; the drafts are one copy for every place that drafts; every change runs a house
   action, never a new write path.
3. **Plain words for studio people** — "Task added — Call Olivia", "I can’t answer that yet", "Owners, Admins and Accounting only", "Due
   Mon, 12 Oct ’26 · 3:00 PM", calendar days, never "intent", "model" or "AI-generated".
4. **Nothing is lost** — every 1.0 mAIson job is mapped line by line above; what isn't built says why (voice, files in the box, a score,
   changing a project's stage by chat); Recent's Clear has Undo; a question is kept 20 deep.
5. **Say why** — a refusal answers with its rule in the answer (the books' rule, Accounting's, roles, set-up, "That isn’t yours to start on
   this project …", "Set up the payment schedule first …"); a proposal says what will happen, for whom, when and where before its button.
6. **Back returns where you came from** — every answer row and link carries `?from=` (`go`); the Money landings strip their marks; the editors'
   rows act in place.
7. **Every screen is whole** — the sheet's loading line, the honest fallback, "Couldn’t look that up — please try again", Recent shown only
   when there is one; no new page, so no new ghost (the brief's ghost is generic bars — unchanged).
8. **Every width is designed** — 1440 · 1024 · 768 touch · 390 · 320 checked by the probe against `screen.width`; the sheet never grows past
   the window (its middle scrolls); the rows no longer overlap (fixed).
9. **Tables follow the leads listing** — no table added (the answers are the house rows).
10. **Motion with purpose** — none added: the sheet's own spring, the snackbar's.
11. **Honest data** — every answer reads the records when asked (Recent keeps questions only); R113 seeds nothing; the stand-ins are said
    (the box reads no files; the portal's six digits; no model); never a guessed figure — the books' answers are Reports › Finance's own.
12. **Reach for everyone** — the Ask box is a form (Enter asks); Recent is a labelled list of buttons with a 36-tall Clear; proposals use the
    DS buttons; bars are `aria-hidden` (the figure is in the words); Escape closes; the editors' FABs toggle (REG-153).
- **How to add a missing thing** — one home (the FAB's sheet, on every page; no rail item, no page); shown only when it applies (Recent,
  a proposal only for whoever may make the change, Accounting's own chips); one filled button (the proposal's); nothing to set up.
