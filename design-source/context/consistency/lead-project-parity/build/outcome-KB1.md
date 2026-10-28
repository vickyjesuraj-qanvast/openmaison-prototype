# Package K-B1 — the lead page: outcome (2026-10-08)

Fixes P-04 (lead side) · P-06 / Q-01 (lead side) · P-07 (lead side) · P-16 · P-33 / Q-02 (lead side) · P-36 (lead side) · P-14 (lead side), and
the orchestrator's follow-up P-29 in `lib/leads/detail.ts`. Register rows staged in `reg-KB1.md` (REG-KB1.1 … KB1.8). `npx tsc` is clean for
every file here (remaining errors are other packages' work in progress in `components/projects/*`); `npx eslint` clean on every file I
touched; `npm run design:lint` — nothing new breaks a house rule (baseline untouched). No `next build`, no server, no DB writes (two
read-only `sqlite3 -readonly` lookups of the ghost probes' lead stages).

## Files

Edited (mine): `app/leads/[id]/overview.tsx` · `lib/leads/detail.ts` · `lib/leads/stage-policy.ts` · `components/leads/detail/ai-brief.tsx`
(+ `.module.css`) · `components/leads/detail/tab-ghost-for.tsx` · `components/shell/detail-skeleton.tsx` (+ `.module.css`).
New (mine): `components/leads/detail/use-lead-maison.ts` (the lead's Maison AI, the twin of `use-project-maison.ts`) ·
`app/leads/maison-actions.ts` (its read-only server reads, the twin of `app/projects/maison-actions.ts`).
Not touched: `stages-card.tsx` (K-C changed its `daysLabel`; nothing else of mine needed there), `[tab]/page.tsx` and `(overview)/**`
(the counts and the ghost shape ride `LeadDetail` and `DetailSkeleton`; `loading.tsx` still renders `<DetailSkeleton />`).

## Per fix

### P-04 — a Won lead on its project drops MY TASKS · FILES · QUESTIONNAIRE
- `overview.tsx`: when `detail.project` (the live project, REG-1378's `liveProjectOf` rule) the three cards are not rendered; the brief
  (THE PROJECT), QUOTES, LEAD STAGES (and LEAD RETURNED), RECENT ACTIVITY stay. A lead whose project was deleted keeps every card.
- Check: Ryan D’Souza's lead `/leads/5e8b9c29-…` (1440 / 768 / 390) — brief, QUOTES left, LEAD STAGES + RECENT ACTIVITY right; Gerald Tan
  unchanged. On a phone the remaining cards keep the canvas order (REG-377).

### P-06 · Q-01 — counts on the lead's strip
- `lib/leads/detail.ts`: `LeadDetail.tabCounts` (`LeadTabCounts`): `tasks` = `lead.tasks.length` (open only), `quotes` = this lead's quotes at
  *Sent for Approval* when Quote approval is Required AND the viewer `isApprover` (the Tools badge's rule), `questionnaire` = unanswered
  questions. Zero → omitted.
- `lib/leads/stage-policy.ts`: `LeadTabCounts` type + `leadTabItems(onProject, counts)` → `{ label, slug, count }`; `leadTabs` unchanged.
- `overview.tsx`: `tabItems` carry `count` → the house `Tabs` draws the DS badge (as the project strip).
- Check: Gerald / Farah (open tasks → "Tasks n"); Olivia (unanswered questions → "Questionnaire n"); a quote at Sent for Approval with
  approval Required — Dane (Owner) sees "Quotes 1", a Designer (View as) sees none. A Won lead: only Quotes can carry one.
- The tab ghosts (both families) draw bones by label width only — no badge width (`GhostTabs` has no counts; see Needs).

### P-07 — the lead Overview's ghost on the REG-708 kit
- `components/shell/detail-skeleton.tsx` (now `'use client'`): header on `page-header-l2.module.css` (back · crumb · title · 4 chips · actions ·
  ⋮ as `titleActions` — the page's own phone rule puts ⋮ on the title's line and the primary fills the second; chips step aside at 768–1024
  now, as the page does — the old ghost kept them), with a doubled `.head` class cancelling the sticky `top: 8px` that would push it 8px down
  inside the sheet; kit `GhostTabs`; `ov.row` / `ov.centre` / `ov.grid` / `ov.column` from `overview.module.css` (phone order by `data-card`);
  `InfoColumnGhost` on `info-column.module.css` (identity block; sections as lines; ≤767 identity + View Client Info); `AiBriefGhost`
  (in `ai-brief.tsx`, on the brief's own card, "MAISON AI BRIEF" as `Words`); each card on its own stylesheet with its title as `Words`
  (my-work · quote · questionnaire · stages · files · activity); `QuickLinksGhost` = toggle · 24×1 rule · 8 glyphs (it drew 8 squares, no toggle).
  The wide fallback (an unknown tab) uses `GhostToolbar` + `GhostTable`.
- `tab-ghost-for.tsx`: `useRememberLeadShape(leadId, { onProject, locked })` (keys `om.shape.lead.<id>.project` — unchanged — and
  `.locked`), `useLeadShape(given?)`; `LeadTabBones` / `useRememberLeadStrip` removed (only detail-skeleton used them).
- A Won lead on its project: short strip, Stage ▾ + Open project (no locked Convert), Overview without the three cards.
- `detail-skeleton.module.css`: kept `.header` · `.titleCol` · `.titleRow` · `.actions` (X-Ray's ghost composes them); dropped the lead's old
  block classes.
- Check: cold load of `/leads/<Kevin Ng>` and `/leads/<Ryan>` (1440 · 768 · 390 touch): loader ≡ reveal ≡ page; the locked Convert bone at
  1440 for Farah, none at 390 (P1 probe's rule holds — the span still carries the `convertLocked` class).
- Exports for the project ghost (K-B2): `InfoColumnGhost({ sections })`, `QuickLinksGhost({ count })` from `components/shell/detail-skeleton.tsx`,
  `AiBriefGhost({ more })` from `components/leads/detail/ai-brief.tsx`.

### P-16 — Back and the crumb
- `overview.tsx`: `backLabel={backText}` — `backLabel(origin, { leadName: origin on this lead ? lead.name : null, fallback: 'Back to Leads' })`;
  Insights / Import History origins keep "Back to {section}" (lib/nav reads any `/leads/…` as a lead — see Needs). Crumbs: the origin's
  section unless it is "Leads"; then the "Leads" crumb links to the origin itself (the listing's own address, P-18's state).
- Check: `?from=/leads` → "Leads /", Back "Back to Leads"; from a project → "Project / Leads /", "Back to the project"; from `/tasks` →
  "Tasks / Leads /", "Back to Tasks"; no `from` → "Leads /", "Back to Leads".

### P-33 · Q-02 — the lead brief and the lead's Maison AI act
- `components/leads/detail/use-lead-maison.ts`: `useLeadMaison({ lead, quote, unanswered, parked, project, team, doors })` →
  `resolve(label): MaisonSuggestion` for every brief action (36 labels mapped: runs, answers, task proposals via `setFollowUp`, WhatsApp
  proposals via `waLink` opening on the press). Two labels stay words ("Attach a client review", "Add to newsletter list" — nothing on record).
- `app/leads/maison-actions.ts`: `similarProjects` · `pastQuotes` (median of quotes sent to clients, same property type) · `quoteTrims` —
  read-only, Who sees leads (`canOpenLead` on the lead, `visibleLeadIds` on every other row). "Summarise the project" uses the project's own
  `lateMilestones` + `nextStepTask`.
- `ai-brief.tsx`: new props `actions?: (label) => MaisonSuggestion | undefined` and `briefs?: Brief[]`; a press runs, or shows the FAB sheet's
  own `MaisonAnswerPanel` in the card's body (`data-testid="brief-answer"`, padded to the card's 20); Back / Not now / a done proposal return
  to the brief. Plain words fall back to `onAction` (Coming soon).
- `overview.tsx`: `maisonDoors` (follow-up dialog · Ask the client · Create Quote · the quote editor · AI Visualizer · project · Edit · Contact
  Log · tab hrefs · the task panel); `<AiBrief actions={maison} …>`; `useMaisonAi` gets the same three suggestions, resolved.
- Check (1440 and 390): New lead (Olivia) — *Draft intro WhatsApp* → proposal in the card, Open WhatsApp opens wa.me with the text;
  *Auto-schedule first meet* → Add the task → "Task added — Book the first meet with Olivia" · Open; *Build a call script* (Show more) → rows open
  the lead form / Questionnaire. Met (Gerald) — *Compare to past quotes*, *Flag scope risks*, *Share moodboard* (Visualizer). Quote Sent (Vivien)
  — *List optional trims*. Won (Ryan) — *Summarise the project*. The FAB's three suggestions do the same in the sheet. A Designer (View as)
  sees only the leads they may see in the answers' rows.

### P-36 · P-14 — Delete with Undo; one sentence per action
- Delete: "{name} deleted" · Undo (`restoreLeads([id])`, then refresh; the listing's two failure lines); the page still leaves for `/leads`.
- Edit Lead: "Details saved". On Hold: "{name} is on hold" · Undo. "Members updated" unchanged. ("Moved to Lost" unchanged — not in P-14.)
- Check: lead ⋮ › Delete (Owner) → on the listing "Gerald Tan deleted · Undo" → Undo brings him back. Revert on a scratch DB.

### P-29 (orchestrator's follow-up) — calendar days
- `lib/leads/detail.ts`: `daysBetween` = `Math.max(0, calendarDaysBetween(from, to))` — the stage rows, the parked row and "n days in pipeline".

## Probe assertions changed
None needed: no probe asserts "Successfully Updated", "Lead deleted" or "Moved to On Hold" on the lead page, the lead's Back label, the Won
lead's MY TASKS / FILES / QUESTIONNAIRE cards, or exact lead tab names. Still valid by construction: `ux-build-2026-09-30/P1` (a span with
`convertLocked` in its class inside `[aria-label="Loading lead"]`, shown at 1440, hidden at 390); `ghosts/verify-ghosts-same` (Kevin Ng, Met,
linear → the reveal's shape equals the loader's common shape; Olivia, New, same). Worth a look in the orchestrator's run: `ghosts/*` strips for
`lead-*`, `uat-dane-2026-10-01/P5a` + `P5b` (MY TASKS on Farah / Serena — not Won, unaffected).

## Needs from others
- **K-B2 (project overview / ghost):** `AiBrief` takes `briefs` (the project's own) and `actions` (`(label) => MaisonSuggestion` — e.g. a lookup
  over `useProjectMaison`'s list); answers and proposals show in the card. Ghost pieces to reuse: `AiBriefGhost`, `InfoColumnGhost({ sections })`,
  `QuickLinksGhost({ count })`. When `GhostHead2` learns the phone header, the lead's `LeadHeadGhost` (detail-skeleton.tsx) is the reference — it
  composes `page-header-l2.module.css` directly.
- **Owner of `lib/nav.ts`:** `backLabel`'s lead pattern `/^\/leads\/[^/]+(\/.*)?$/` also matches `/leads/insights` and `/leads/imports` ("Back to
  the lead"); the lead page guards it locally. A `(?!insights|imports)` would fix it for every caller.
- **Owner of `lib/maison-ai.ts` / `components/shell/maison-ai.tsx`:** the shell's `select` and the brief's `press` resolve a suggestion to a view
  the same way (~15 lines each); a shared `viewOf(suggestion)` in `lib/maison-ai.ts` would remove the second copy.
- **Owner of `components/shell/ghost-kit.tsx`:** `GhostTabs` draws no count badge width (the lead's and the project's strips now both carry counts).
- **K-A1 (info column):** the ghost's sections are drawn as lines, so renaming Collaborators → Members needs nothing here; if the identity block
  or the section row counts change, `LEAD_SECTIONS` in detail-skeleton.tsx follows them.

## Demo data / repair
None needed.
