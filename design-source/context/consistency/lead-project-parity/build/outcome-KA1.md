# Package K-A1 — the project Overview's body: outcome (2026-10-08)

Fixes P-01 · P-02 (+ Q-02, project side) · P-04 (project side) · P-05 (+ A-18 · A-19) · Q-17 · Q-03 (project cards) · P-07 (project side) ·
P-17 (record side) · P-34 (the project's Maison AI). Register rows staged in `reg-KA1.md` (REG-KA1.1 … KA1.10). `npx tsc` clean for every file
here; `npx eslint` clean on every file I touched; `npm run design:lint` — nothing new breaks a house rule (baseline untouched). No build, no
server, no DB writes, no repair needed (every value comes from records the page already had or the lead's own rows).

## Files

- New: `lib/projects/briefs.ts` (pure: `projectBriefs(facts)`, `BRIEF_ACTIONS`, `ProjectBriefFacts`).
- Mine, edited: `components/projects/project-overview.tsx` (+ `.module.css`), `components/projects/project-ghost.tsx`,
  `components/projects/schedule/schedule-card.tsx`, `components/projects/use-project-maison.ts` (now returns `{ suggestions, resolve, briefs }`
  and exports `briefFactsOf(d)`), `lib/projects/queries.ts` (`ProjectDetail.record: ProjectRecord`, the `schedule_asks` href),
  `components/leads/detail/info-column.tsx` (additive `project?: ProjectInfo` prop and an optional `testId` on its rows — the lead's rendering is
  byte-identical: same strings, same markup; `info-column.module.css` unchanged).
- `components/projects/project-frame.tsx` — my region only: the `InfoColumn` mount before the centre (Overview tab), the `ProjectOverview`
  mount's props (`onStep` · `onRunItem` · `maison`), `runItem` / `openStep` / `editRecord` (K-A2 already pointed `editRecord` at its
  `editDetails`), the `useProjectMaison` call (`d`, `doors`; `useMaisonAi(maison.suggestions, …)`), the ghost `shape` (`briefMore` ·
  `customFields`), `onSetup`'s Assign fallback (the info column's `[data-kb="assign"]` link), and the `AssignPopover` (REG-612 suggestion,
  "Members updated" — P-17 named in my brief). K-A2 merged around these without conflict.
- Not touched (K-B1 built what I needed): `ai-brief.tsx` (`briefs` + `actions`, `AiBriefGhost`), `components/shell/detail-skeleton.tsx`
  (`InfoColumnGhost({ sections })`, `QuickLinksGhost({ count })`). `my-work-card` / `files-card` / `questionnaire-card` / `card.tsx` needed no
  change — their props were already generic.

## Per fix

### P-01 — the lead's InfoColumn on the project's left
- `info-column.tsx`: `project` prop → the aside reads "Project info", the toggles "Expand/Collapse project details", the pencil "Edit details";
  **Project info** (Number · Stage · Project type · Scope · Start date · Target end; test ids `info-project-{number,stage,type,scope,start,end}`)
  takes Lead info's place on the column, in the strip (same `info` glyph) and in the phone's View Client Info sheet. Collaborators, Property
  info, Other info, Custom fields, the fold (REG-304, the same `om.detail.infoColumn` choice as the lead), the phone identity block (REG-366)
  all the lead's.
- `project-frame.tsx`: mounted on the Overview only (the lead's other tabs are wide), `lead={{ ...d.record.lead, name: lead.name }}` (the
  title-cased name, the stored row otherwise — K-A2's form reads the stored row), the lead page's own Copy / WhatsApp / Directions handlers.
- `project-overview.tsx`: the "Client and property" and "Team" cards are gone (and with them `onEditDetails`, `onAssign`, `onOpenLead`,
  `visualizerBusy` props).
- `lib/projects/queries.ts`: `record` = `fetchLeadRow` + the lead's files (not trashed) + its questionnaire summary and unanswered questions +
  `fetchPortalLink` + custom fields / values + member stats + live sources — loaded on every project page (the Assign suggestion and K-A2's
  form need it on every tab).
- **Check** (Dane, Owner): Benjamin `/projects/a3f655a3-c603-42b0-af12-2767a0500138`, Ryan `/projects/e920e218-7c5b-4ff9-a27b-e62d73c99367`,
  Marcus (direct) `/projects/9ede8f84-…`, Shalini (completed) `/projects/9e7a3ddd-…` at **1440** (column 360, cards at the lead's width, the
  fold to the strip and back, a strip glyph opening its section), **768** (column 300, one card column), **390** (identity block above the
  cards — the client's name no longer lost in the cut title; View Client Info sheet with Project info). Ryan's long scope wraps (A-17).
  Collaborators' Add / Assign Member / a member's ⋮ open the Assign popover; with nobody on it the popover suggests someone (REG-612); its
  save reads "Members updated". The pencil opens K-A2's Edit details.

### P-02 · Q-02 — the brief, run through the project's Maison AI
- `lib/projects/briefs.ts` per stage (Setting up / In progress: top attention reason, else On track / On hold / Completed) + Show more
  (waiting on the client, the schedule). Copy is invented (listed in REG-KA1.2) and stays within the card's two-line clamp at 1440.
- `use-project-maison.ts`: new answers **What is still to set up?** · **What needs attention?** · **Summarise the project**; the pool resolves
  every brief button; the FAB lists the primary brief's two first. `project-overview.tsx` renders `<AiBrief briefs actions>` above the grid
  (its `stage` key is `stage[:hold]` so the stack re-collapses on a move).
- **Check**: each demo project's brief + its two buttons (answers in the card, rows open where fixed; Add a task / Draft an update propose and
  run); the FAB's list starts with the brief's two; Alex (not on the team) gets the rule, nothing to press.

### P-04 — MY TASKS · FILES · QUESTIONNAIRE on the project
- Right stack: MY TASKS · Latest updates · FILES · QUESTIONNAIRE · Recent activity. Phone order: my-work 2 after the stages (CSS).
- **Check**: complete a task from the card (radio) — it leaves, the Tasks tab count drops; › opens it on the Tasks tab; FILES tiles open the
  folder / file viewer on the project; QUESTIONNAIRE › Ask Client sends (the lead's sentences).

### P-05 · A-18 · A-19 — one card grammar
- "Status" → **Project stages** (test id and `data-card="status"` kept); ↗ + rows → `onStep` (start · handover · reopen · resume; gated by
  `mayChange` / `ending.mayHandover` / `ending.runs`); "Change the hold" = the head link; Latest updates: "Post an update" head link,
  `CardEmpty` when empty (`card-post-update` test id on its button); Key documents' AI Visualizer foot removed (the Create strip has it).
- `queries.ts`: `schedule_asks` → `/schedule?open=<milestone>` (more time: the first pending extension on a live milestone; a Done to approve:
  that milestone; a share: `?share=1`).
- `schedule-card.tsx`: no rule / empty group when no next milestone; "starts in n days" via `dayWords`.
- **Check**: Ryan's "More time asked on Carpentry fabrication" opens its panel; Shalini's Schedule card ends at the bar; Marcus' Latest
  updates empty card; Aisha's "Change the hold" in the head.

### Q-17 — the head is the record's age
- "n days since Won" / "n days since added" (calendar days, `calendarDaysBetween` + `dayWords`); completed "Took n days" unchanged.

### Q-03 — card sums
- Money card + Getting started's value via `moneyCard` ("S$ 81,355"); signed VO "+S$ 3,455"; a loss "−S$ …".

### P-07 — the project ghost
- `project-ghost.tsx`: header on `page-header-l2.module.css` classes (chips without the stage, Stage ▾ 176, primary filling on a phone, ⋮
  last / on the title line), `InfoColumnGhost` with the project's sections, `AiBriefGhost`, the new cards in their words (FILES tiles and
  QUESTIONNAIRE bar on their own stylesheets), `QuickLinksGhost count={7}` on every tab.
- **Check** the loader → reveal hand-off at 1440 / 768 / 390 on the Overview and on Schedule / Tasks.

### P-17 (record side) · P-34
- AssignPopover: suggestion + "Members updated" / "Couldn’t update the members". Maison: "the project’s members"; "What is overdue on this
  project?", "n milestones overdue", "Nothing is overdue".

## Probe assertions changed (each with "(parity P-xx, a deliberate change of this rule)")
- `verify-pj-gap-a.cjs`: Change the hold via the card's head link (P-05); the Client and property block → the info column (no client / team
  card; Collaborators · Project info · Property info; the pencil "Edit details" opens K-A2's form with `project-details-section`; the scope
  read from `info-project-scope`; Marcus' floor area / style / scope from the column).
- `verify-pj-r1.cjs:154`, `verify-pj-r5.cjs:86`, `verify-pj-r6.cjs:263`: card sums "S$ 48,600" · "S$ 81,355" / "+S$ 3,455" · "S$ 48,498" (Q-03).
- `verify-pj-gap-i.cjs:305`: "Only the project’s members" (P-17).
- `verify-pj-gap-c.cjs`: added — pressing "More time asked on …" lands on `/schedule?open=<Carpentry>` (A-18).

## Needs from others
1. **K-A2** — the gap-a Client and property block's *dialog* lines are your form's: the Won project's Study chip + `details-save` I kept;
   Marcus' phone lines still use the old dialog's label "Client’s phone number" and the old "Client name" text — update to the lead form's
   labels. Your `editDetails` comment says "the Overview's Project info rows open it": the column's rows stay inert, as the lead's column's
   (858:24857) — the pencil is the one door. `project-frame.module.css`'s header comment ("no info column and no Create strip in round 1") is
   stale.
2. **Owner of `lib/projects/getting-started.ts`** — the setup row "Team" / "Who runs the project" should read "Members" (Q-05).
3. **Owner of `lib/projects/handover-model.ts`** — `closingLines` writes `money2` (cents) on the Closing summary *card*; Q-03 wants `moneyCard`
   there (the Money tab keeps cents). gap-a's closing assertions read /All of it/ and days only — unaffected.
4. **K-B1** — `AiBrief`'s `lead` is required even with `briefs`; I pass a minimal `BriefLead` from the lead's row. Optional would be cleaner.
5. **The listing package** — `verify-pj-gap-i.cjs:281` (/running late|Nothing is late/) is the listing's own "Find late milestones" (P-34).

## Repair text
None.
