# K-N — Needs you + the Overview: outcome (2026-10-09)

Her "build everything" on the simplify proposal. This package: **S-01 · S-02 (engine) · S-04 (the counts) · S-05 · S-09 (the Overview's Money
card) · S-20 (Needs your OK, approve in the row) · Q-03 · Q-08 (Overview) · Q-09 · Q-12 (the Overview's words) · Q-14**. Staged register rows:
`reg-K-N.md` (REG-K-N.1 … 15). `npx tsc --noEmit -p .` clean; `npx eslint` clean on every file below; `npm run design:lint` — nothing new.
No build, no server, no browser, nothing written to `local.db`.

## Files

**New**
- `lib/projects/needs-you.ts` — contract B's types (exactly as fixed), `NeedFacts`, the registry `NEED_PRODUCERS`, `needsOf(facts, moneyRows)`
  (Q-03's rank: hold/Start → ok → money → Complete handover → client → late → tell → setup; completed keeps ok · money · messages · tickets),
  `holdSplit`, `primaryOf` + `headerLabel` (a header word per kind, K-M's money kinds included), `tabCountsOf` (S-04), `SHEET_ITEMS`,
  `WEEK_UPDATE_DAYS` (6), `NEEDS_SHOWN` (6). Pure, client-safe.
- `components/projects/overview/` — `row.tsx` (the Overview's LEAD STAGES row, moved out of project-overview.tsx; + `two` lines, several buttons,
  a split row whose words link and whose buttons act), `needs-card.tsx` (`NeedsCard` · `NeedRowView`), `use-need-actions.ts` (a row's button:
  its address with `?from=`, the frame's door `useProjectContext().run` for runs, the inline approvals, Draft it), `with-client-card.tsx`,
  `coming-up-card.tsx`, `progress-card.tsx`, `money-card.tsx`, `documents.ts` (`projectInfoDocuments` for the info column), `shape.ts`
  (`overviewShapeOf` for the ghost), `overview-ghost.tsx` (`OverviewGhost`, `CardGhost`).

**Edited (my regions)**
- `lib/projects/queries.ts` — the ProjectDetail region only: a mid-file import block right before `export type ProjectDetail` (so the listing's
  top block stays K-S's; the two top imports only my region used — `fetchInvoiceRules`, `sendsAtOnce` — were dropped from it), types
  `WithClient` · `ComingUpItem`, `ProjectDetail.needs · withClient · comingUp`, `schedule.running` (K-F's ask), the facts for the registry (in-review
  updates with held changes, Done asks, more time, share asks, unread client messages with the newest's words, tickets with their turn, the first
  unanswered mark, concerns, declined choices, milestones, the schedule rules, `fetchClientAccess` for With {client}), `fetchMoneyNeeds` (K-M) for
  money rows when the viewer sees money, `primary` = `primaryOf(needs) ?? primaryAction(…)` (readyInvoice null, share zeroed while a Designer's
  share ask waits), `tabCounts` = `tabCountsOf(…)` (the dynamic compliance count call is gone). Every existing field kept (`updates`, `renders`,
  `attentionItems`, `waitingItems`, `documents`, `quoteFile`, `contractFile`, `setup`, `attention`, `waitingOn` …) — `updates` and `renders` have no
  reader any more (removable later; kept in case another package reads them).
- `lib/projects/next-step.ts` — `PrimaryRun` + invite · assign · contract · value · dates:start · dates:end; `PrimaryAction.run` optional, `href`;
  the registry documented as the fallback.
- `lib/projects/attention.ts` — Q-14: `HOLD_KEEPS` + `ticket_escalated` · `ticket_waiting`.
- `lib/projects/getting-started.ts` — doc note only (its rows are Needs you's now).
- `lib/projects/briefs.ts` — one brief per state; In progress "This week" (`weekBrief`); first button = the top row; `ProjectBriefFacts` + `top` ·
  `running` · `wait`; the Schedule / Waiting extra briefs removed.
- `components/projects/use-project-maison.ts` — `briefFactsOf` + top / running / wait; the top row as a suggestion; "What needs attention?" answers
  from `d.needs` (listed on other tabs only); `draftWeek()` on `ProjectMaison`; optional door `onNeed`.
- `components/projects/project-overview.tsx` (+ `.module.css`) — the orchestrator: brief · act column · glance column; props unchanged.
- `components/leads/detail/info-column.tsx` — the `project` prop only: `ProjectInfo.documents?: ProjectInfoDocument[]` drawn as Project info rows
  (house text link + ↗). The lead page is untouched (no `project` prop there).
- `components/projects/project-ghost.tsx` — the Overview body region only: `{body ?? <OverviewGhost shape={s} />}`; the three Overview-only card
  ghosts and their imports (`AiBriefGhost`, files / questionnaire / card / overview stylesheets, `Words`) left.

## Per id — what changed, what to check

- **S-01** Overview = Needs you · MY TASKS · With {client} · Coming up | Progress · Money · Recent activity (3). Key documents → the info column's
  Project info rows (needs K-F, below); Files and Questionnaire cards gone (Files & notes; Client › Questionnaire + "n questions unanswered · Ask");
  Schedule card → Progress bar + Coming up; Latest updates → With {client} + Needs you. **Check** Benjamin as Dane at 1440: Needs you "Needs your
  OK · n" (Feature wall panels · PO-2026-008 · Germaine's Grab claim), then the Mid-Project invoice (neutral, Record a payment · Remind), the
  AquaFlow bill (red, Pay), the unread message (Reply → Messages `?compose=1`), the floor-plan mark, "4 schedule changes Benjamin hasn’t seen"
  (Share); With Benjamin (Painting waits on Benjamin · Remind; Electrical & plumbing to confirm · Remind; Last told …); Coming up; Progress
  "3 of 7 milestones"; Money with Profit "--" Early estimate (or graded); 768 one column; 390 order brief → Needs you → MY TASKS → With → Coming
  up → Progress → Money → Recent activity, no sideways scroll. Ryan (6 red rows today): late milestones red, the client's lateness in With Ryan,
  the payment he says he paid as a Needs you row (Confirm). Marcus (Setting up): "Before work starts" (Members / Contract when open, Start the
  project), head "Setting up for n days", With Marcus "Not invited · Invite", no Coming up, Money without Profit. Aisha (On hold): the hold row
  first (Resume · Change), "Invite the client", the rest under "Paused while on hold · n". Shalini (Completed): "Nothing waits on you" (or her
  money rows), Closing summary in Money's place, MY TASKS only with open tasks.
- **S-02** `primaryOf`: the header = the top row (K-F's `runAction` handles every run and href). Check: Benjamin → "Review the update"; Aisha →
  "Resume"; Marcus → "Start the project"; a project with nothing waiting → "Post an update" (fallback).
- **S-04** `tabCountsOf` per view; K-F sums groups. Check Benjamin's strip: Tasks 1 · Schedule (approver asks + 1 if changes to share) · Client
  (unread + tickets + reviews) · Design (marks + "no"s) · Money (rows for Dane).
- **S-05** tone 'late' only for ours and past its day (see REG-K-N.4). Check Ryan: the client's lateness neutral in With Ryan.
- **S-09 · Q-08** Money card Profit via `profitGrade` (K-M, contract E): "--" + Early estimate / No costs yet; Designer sees no Profit (F2-Q1).
- **S-20** Needs your OK + approve in the row (update · Done · more time · expense in place; PO / invoice open their send on Money; handover its
  review). Check as Dane: Approve on Germaine's Grab claim → "Expense approved" + Undo → it waits again; as Germaine (Designer): no ok rows.
- **Q-03** the rank in `needsOf` (rankOf). **Q-09** "Tell {client} about this week · Draft it" (Ryan quiet 2+ weeks → red); Draft it saves a draft
  and lands on Updates `?open=`. **Q-12** words in reg-K-N. **Q-14** HOLD_KEEPS + tickets; on the Overview, tickets stay unfolded on hold.

## Probe assertions changed (not run) — each with "(simplify S-xx, a deliberate change of this rule)"
- `projects/verify-pj-r1.cjs` — Before work starts (`need-start`, no `need-setup-end`); cards `needs · with-client · status · money ·
  recent-activity`; Payment stages unfold (`payment-stages-toggle`) before counting; after Start the header is the top row and
  `need-setup-schedule` offers Set up; Benjamin: MY TASKS names the overdue task, Needs you has rows; `doc-quote` / `doc-contract` (Project info).
- `projects/verify-pj-gap-a.cjs` — Aisha: Needs you leads with `need-hold`; Change from the hold row; Marcus's contract from `need-setup-contract`,
  then gone from Needs you with `doc-contract-file` in Project info.
- `projects/verify-pj-r2.cjs` — Benjamin's header = the top row; Share opens from `schedule?share=1`; Progress "3 of 7 milestones" + Coming up rows;
  "… waits on Benjamin … n days so far" in With Benjamin; Marcus: `need-start`, no `need-setup-schedule`.
- `projects/verify-pj-r3.cjs` — `with-last-told` (and its link lands on the update); `need-review-update` under Needs your OK; Benjamin's header
  "Review the update" with `need-share`; Ryan's Post an update from `with-post`; Ryan's `need-week-update` ("Tell Ryan about this week · … days
  ago"); the phone shot takes With Benjamin.
- `projects/verify-pj-r4a.cjs` — Aisha's `need-setup-portal` "Invite the client".
- `projects/verify-pj-r4b.cjs` — Share from `schedule?share=1`.
- `projects/verify-pj-r5.cjs` — the Money glance's contract value only (VOs inside it); With Benjamin / With Aisha for the VO waiting.
- `projects/verify-pj-r6.cjs` — Ryan's payment to confirm is `need-money-confirm` (K-M's kind).
- `projects/verify-pj-r7.cjs` — a completed project's header exists only when Needs you has a row.
- `projects/verify-pj-r8.cjs` — the overdue choice in With Benjamin with Remind.
- `projects/verify-pj-gap-c.cjs` — `need-approve-more-time` "More time on Carpentry fabrication" · Approve; its link opens the milestone.
- `projects/verify-pj-fix-B.cjs` — "Aisha hasn’t seen the schedule yet" on `need-share`; Share from `schedule?share=1`.
- `projects/verify-pj-fix-D.cjs` — the agreed value changes from the Money card's "Change the value".
- Unchanged and expected to hold: gap-b §5 (Aisha's "Send the Commencement invoice" header — if an approval waits for Dane on Aisha it leads),
  gap-f2 (money-profit row for the Owner, none for a Designer), fix-E (Review the handover; Progress "Took n days"), r6 money-collected.

## Needs from others
1. **K-F (`components/projects/project-frame.tsx`)**
   - Pass the documents to the info column: `project={{ …today’s fields, documents: projectInfoDocuments(d, { from: href(''), fileHref: (id) =>
     href(`files/${id}`) }) }}` (`import { projectInfoDocuments } from './overview/documents'`). Without it the signed quote / contract rows are
     missing (Key documents left the Overview) — and r1 / gap-a's `doc-quote` · `doc-contract` · `doc-contract-file` assertions fail.
   - The ghost's shape: `const shape = { ...overviewShapeOf(d), typeChip: !!p.projectType, customFields: d.record.customFields.length > 0 }`
     (`import { overviewShapeOf } from './overview/shape'`) — today `setup` is "anything open", which makes the ghost say *Before work starts* on a
     running project with a leftover, and `schedule`/`briefMore` no longer match the page.
   - `runItem('setup')` scrolls to `[data-card="getting-started"]` — that card is gone; scroll to `[data-card="needs"]`.
   - B-16: on the Schedule's Start card (no milestones) keep the header's filled button off whatever its run — the top row can now be a money
     row (Q-03 puts the client's money before set-up leftovers); fix-B line ~199 expects no header button there.
   - Optional: `useProjectMaison(…, doors: { onSetup, onRunItem: runItem, onNeed: (r) => runAction(r.action) })` — the FAB's rows with no address
     then run the frame's flow (today they open the Overview, or press the header when it is the top row).
2. **K-M** — nothing. The Overview approves `approve-expense` in place with `answerExpense(row.ref)`; `approve-po` / `approve-invoice` open the
   row's `action.href` (`&do=approve` / `&send=1`). Header words for every `MONEY_NEED_KINDS` kind are in `needs-you.ts` `HEADER`; a new kind falls
   back to its button when it reads alone, else "{button} — {title}".
3. **K-T** — the Overview's late-milestone rows link `schedule?done=<id>` (Mark done) and `schedule?open=<id>` (Start); the set-up row
   "Set up the schedule" runs `schedule`. The Start sheet is assumed to ask the date, the schedule (and its end) and the invite: those leave
   Before work starts while Setting up (`SHEET_ITEMS`).

## Repair text
None — no records move.

## Not finished / to know
- The weekly update's *Draft it* lands on the draft's card in Updates (`?open=<id>`), not inside the composer: contract C has no deep link that
  opens a draft in the composer. The header's run for that row (`update`) opens a blank composer.
- A Done approval in the row does not run the Mark done sheet's ticks (S-18's "ticks travel with the ask" — K-T's); it approves as the panel does.
- *Send back* / *Decline* on an approval row open the record (Updates · Schedule) where today's note dialog lives — not the dialog itself.
