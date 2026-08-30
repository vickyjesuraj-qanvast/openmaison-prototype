# Lead Overview — build plan (contract for the implementation)

Mocks: `858-24770` (frames 155 New · 157 quick links expanded · 156 Lost + returned) and `858-24094` (every card state). Specs measured from Figma live in `01…05-*.txt` in this folder — **every number in the build comes from those files; nothing is guessed**. Report: claude.ai artifact 2d6cc89f (rev 2).

## Route & data

- `app/leads/[id]/page.tsx` (dynamic) + `loading.tsx` (ghost) + `overview.tsx` (client, owns the page state). `app/leads/[id]/[tab]/page.tsx` renders the other eight tabs as the same frame with a coming-soon body.
- `lib/leads/detail.ts` → `fetchLeadDetail(id)` returns `LeadDetail`:
  - `lead: LeadRow` (existing shape: tasks, assignees, onHoldFollowUp, stageData, resumeStage) + `team`, `now`, `stageMovement`
  - `timeline: StageStep[]` — one per active stage `{ stage, state: 'done'|'current'|'future', days: number|null }` + `parked: { stage: 'On Hold'|'Lost', days, till: string|null } | null`, `daysInPipeline`
  - `activity: ActivityItem[]` `{ at: Date, text }` newest first (lead created from {source} · Moved to {stage} · Updated contact log · Quote created · Lead returned)
  - `quote: Quote | null`, `files: LeadFile[]`, `questionnaire: { total, client, studio } | null`, `ret: LeadReturn | null`
- New tables (additive migration): `quotes`, `lead_files`, `lead_questionnaires`, `lead_returns` — seeded for Olivia Martinez (quote OM-10001 Draft S$70,500 Private · 13 files · 7/11 questionnaire), Muthu Vinay (return processing) and Arjun Mehta (return rejected + appeal). Baseline tables list extended; `pnpm db:baseline` re-run after seeding.

## Components (new, generic → `components/om` / `components/shell`; page-specific → `components/leads/detail`)

| Component | File | Spec |
|---|---|---|
| `PageHeaderL2` | `components/shell/page-header-l2.tsx` | 01 · 72px, back + breadcrumb + title + `MetaChip`s + actions slot |
| `MetaChip` | `components/om/meta-chip.tsx` | 01 · 20px Tag: default (icon 12 + 10/500 text, #f2f2f2/#cccccc) · green · yellow · red variants |
| `Tabs` | `components/om/tabs.tsx` | 01 · 44px row, 24 gap, ink 4px r2/2/0/0, level-1 shadow, routed links |
| `QuickLinks` | `components/leads/detail/quick-links.tsx` | 01 · collapsed 72 / expanded 140, remembered in `localStorage om.detail.quickLinks` |
| `InfoColumn` (+ `Section`, `KVList`) | `components/leads/detail/info-column.tsx` | 02 |
| `Card`, `CardHead`, `CardEmpty` | `components/leads/detail/card.tsx` | 03 head spec, 05 empty spec |
| `LeadStagesCard` | `components/leads/detail/stages-card.tsx` | 04 |
| `FilesCard` | `components/leads/detail/files-card.tsx` | 04 |
| `ActivityCard` | `components/leads/detail/activity-card.tsx` | 04 |
| `MyWorkCard` | `components/leads/detail/my-work-card.tsx` | 05 |
| `QuoteCard` | `components/leads/detail/quote-card.tsx` | 05 |
| `QuestionnaireCard` | `components/leads/detail/questionnaire-card.tsx` | 05 |
| `LeadReturnedCard` | `components/leads/detail/returned-card.tsx` | 05 |
| `AiBrief` | `components/leads/detail/ai-brief.tsx` | 03 · carousel of scripted briefs per stage |

Rules that apply to all of them: `--om-*` tokens only (colours: on-surface #1a1a1a, secondary #666666, border #cccccc, surface-variant #e5e5e5, surface-bg #f2f2f2, primary #5500ff, primary-variant #eee5ff, green #387e47 / #469e59 icon / #edf5ee / #daecde, yellow #c17e22 / #f19e2b / #fef5ea / #fcecd5, red #af2d22 / #db382a / #fbebea / #f8d7d4 — map to the closest `--om-color-*` token, fall back to the literal only where no token exists and say so in a comment); Material Symbols via `Icon` with the weight the spec says (Light = 300, Regular = 400); tooltips on every icon-only control; every inert affordance → `useComingSoon()`; no `Date.now()` in render (use `now` from the loader); CSS modules.

## Interactions (from the register — do not re-decide)

- Stage pill = `StageDropdown` anchored under the pill, driven by the same policy as the listing (`requestStageChange` semantics: ownership gate, linear next-only, no back, parked → "Resume at X?", Won → wizard). The wizard, On Hold / Lost dialogs and confirm dialogs are hosted by `overview.tsx`.
- "Convert to Project": locked until Won (lock glyph); pressing it before Won → snackbar "Win the lead first — Won creates the project"; after Won → coming soon.
- Header kebab → Dropdown: Edit · Delete · Return Lead (Qanvast only) — same items as the row menu (REG-139/153).
- Pencil / "Add ›" → `LeadFormModal` in edit mode. "Assign Member ›" / avatar kebab → `AssignPopover` (requireOne past New).
- Lead stages rows → chevron opens the Move stage window at that stage (done → read-only + Edit). Parked row chevron → On Hold / Lost dialog read-only? → opens the Move stage window at the resume stage (REG-132).
- My work: "Create New Task" → `TasksPopover` add flow anchored to the button; row chevron → coming soon (REG-43); radio → completes the task.
- Quick links: Task → tasks add flow; Call Log → wizard at Contacted; Meeting → wizard at Met; others → coming soon.
- Card `arrow_outward` → the matching tab (coming-soon frame). Questionnaire "Ask Client", Quotes empty buttons, Files empty buttons, Lead returned "View Details" / appeal → coming soon.
- Back arrow → `/leads` (the listing restores its own view).
- Name click in the listing / kanban → `/leads/[id]` and marks seen.

## Copy decisions (logged as REG-165+)

- Phone: eight unbroken digits (REG-162). Dates: `displayDate` "17 Jul ’26"; activity rows use "Tue, 25 Aug ’26" (`displayDateLong`, new); My work meta "Wed, 26 Aug" (`displayDayMonth`, new); header budget "S$ 70.5K" (`moneyCompact`, new).
- On Hold row: "till 27 Oct ’26" (mock typo "untill" fixed; listing keeps "On hold till:").
- Source tag shows the lead's real source (mock artefact: QANVAST on an Instagram lead).
- AI briefs: scripted per stage (New = the mock's copy verbatim; other stages invented, logged).
