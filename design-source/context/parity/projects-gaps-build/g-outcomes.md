# Package G — floor-plan mark-up with the client · outcomes (gaps build, Phase B, 2026-10-07)

Brief: `scratchpad/build2/brief-g.md` · the short read `g-read.md` (calls G-Q1…G-Q18) · port 3128 · repair R85 · probe
`design-source/verify/projects/verify-pj-gap-g.cjs` · register rows `reg-g.md` (REG-g.n).

Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

| # | Item (brief) | Outcome | What / where |
|---|---|---|---|
| 1 | Floor plan tab on a project | Built (code) | `PROJECT_TABS` (after Choices), `app/projects/[id]/[tab]/page.tsx` branch, `components/projects/floor-plan/project-floor-plan.tsx` (toolbar · chips · banner · canvas · rail), ghost `floor-plan-ghost.tsx` via `project-ghost.tsx`, the tab count (`floorPlanToAnswer` in `lib/projects/queries.ts` tabCounts), first-run `EmptyState` |
| 2 | Portal section with its own switch | Built (code) | `SectionKey` `floor-plan` + `PORTAL_SECTIONS` row + `ALL_ON` (lib/portal/sections.ts), `PORTAL_TABS` entry, `app/my/[slug]/floor-plan` (page + loading), `components/portal/floor-plan/*`, picture route `app/my/[slug]/floor-plan/picture/[planId]`, `PORTAL_FILE_RULES` `inSection('floor-plan', isClientFloorPlanFile)`, `app/portal/floor-plan-actions.ts` (every request `portalActor({ write, section })`), the Client access row (`ACCESS_SECTIONS` + `ACCESS_ORDER`, `floorPlanAccessOf`) |
| 3 | Upload plans (PDF first page / image; several, one main) | Built (code) | `add-plan-dialog.tsx` (upload or From Files, name, *Make it the main plan*), `plan-picture.ts` (pdf.js first page / shrink to 2400), `addFloorPlan` · `undoAddFloorPlan` · `renameFloorPlan` · `setMainFloorPlan` · `putAwayFloorPlan` · `restoreFloorPlan` · `floorPlanFolder` (Files › Floor plans), the original through E's `uploadPicked`; the client's *Send the plan* (`clientAddFloorPlan`) |
| 4 | Mark-up canvas | Built (code) | `plan-canvas.tsx` (SVG over the picture, zoom 100–800 %, wheel / pinch / bar / double-tap, pan, draw on lift, select-move, erase, text / pin card, keys `FLOOR_PLAN_KEYS`), `mark-shapes.tsx` (every tool + stamps + hatches + cloud + callout + dimension), `plan-toolbar.tsx` (house Chips, Zone / Stamp rows, colour · thickness · dashed menu, Layer menu, Undo, Scale); undo stack per session |
| 5 | Scale from one known length, measure in mm | Built (code) | the scale panel in the canvas, `setFloorPlanScale` · `undoFloorPlanScale`, `parseLengthMm` · `scaleFrom` · `measureMm` · `formatMm` (1.0's maths) |
| 6 | Trade layers, Studio only stripped on the server | Built (code) | `LAYERS` (1.0's eight), the drawing layer menu, `setFloorPlanMarkLayer`, rail layer chips; `fetchPortalFloorPlan` strips Studio only, the client's actions answer a Studio only mark as not there, the file rule and the bell skip it |
| 7 | A thread on each mark | Built (code) | `mark-card.tsx`, `commentOnFloorPlanMark` / `clientCommentOnFloorPlanMark` (photos into Files › Floor plans), resolve / reopen both sides with Undo, own-only move / delete (soft, Undo) |
| 8 | Mark → task, mark → variation order | Built (code) | `floorPlanMarkToTask` (`createTask`, assigned to the presser, linked), `floorPlanMarkToVariation` (B's `createVariationOrder`, linked, the editor opens) |
| 9 | The client confirms the layout | Built (code) | `confirmFloorPlanLayout` (append-only `floor_plan_confirmations`), the portal band + dialog, the studio banner (confirmed · another plan · changed since · waiting · invite) |
| 10 | Export the marked plan + legend as a PDF | Built (code) | `app/(editor)/projects/[id]/floor-plan/[planId]` (+ loading), `plan-print.tsx` (two A4 landscape papers, the legend, the points, *Include Studio only*), `plan-print-ghost.tsx`; Download PDF = the browser's print |
| 11 | The bell both ways | Built (code) | studio events `floor_plan_client` (15-minute quiet window per plan) · `floor_plan_confirmed` (EVENTS, defaults, email / WhatsApp templates, `{plan}` field); client bell kinds `floor_plan_shared` · `floor_plan_reply` (`BELL_PRODUCERS`, `floorPlanBellFacts`, read by `floor_plan_seen`) |

## Progress log
- Sync done; base tree `pkg-g/base-tree.txt` = 085a3fb2fe55e55496fec7626aec017504213d67. node_modules cloned; scratch DB `pkg-g/test.db` from base.db.
- Short read written (`g-read.md`).
- Schema (6 tables: project_floor_plans · floor_plan_pictures · floor_plan_marks · floor_plan_comments · floor_plan_confirmations · floor_plan_seen; both
  baseline lists), migration generated locally as `drizzle/0076_lively_swarm.sql` (renumber at the merge), applied to pkg-g/test.db.
- Written (tsc clean): `lib/projects/floor-plan-model.ts` (pure) · `lib/projects/floor-plan.ts` (reads, both sides; Studio only stripped) ·
  `app/projects/floor-plan-actions.ts` · `app/portal/floor-plan-actions.ts` · picture routes · the portal file rule · the section key `floor-plan` ·
  events (both unions + the repair's kind check) · bell events + templates · Activity branch + chip · keys `FLOOR_PLAN_KEYS` · the tab (tabs.ts,
  [tab]/page.tsx, ghost) · `components/projects/floor-plan/*` (canvas, shapes, toolbar, mark card, side cards, add dialog, orchestrator, ghost,
  print page + ghost) · the print route `app/(editor)/projects/[id]/floor-plan/[planId]`.
- Next: the portal page, the portal bell producer, R85, the probe.
- Points + Site diary (`plan-cards.tsx`), Activity branch + *Floor plan* chip, *Who may do what* row, R85 (idempotent: 64 → 0 records, six checks
  pass on a fresh base copy), demo pictures `public/projects/demo/floor-plan-*.png` from `scripts/demo-floor-plans.mjs`.
- First build green; looked at the shots (studio 1440 / 390, the export, a first run): the zones lightened, the callout's tag widened, the legend
  sorted pins · callouts · Studio only. Probe `verify-pj-gap-g.cjs` written; second build running.
- Probe run 1: 25/26 (arriving with `?mark=` already opens that thread — the probe pressed it shut; the probe now asserts it). Run 2: 35/36 — the
  scale's steps sat over the plan's top left and swallowed the first end's click: **moved above the plan** (a card, never on it). Run 3: **67/67**.
- Regression on the first repaired DB: r1 83/83 · r4b 75/75 · gap-a 66/66 · gap-d 64/64; r9 · r4a · fix-F failed where they look Benjamin's floor
  plan up by `name like 'Floor plan%'` — R85's picture files began with those words: **renamed** ("Proposed layout — SkyOasis @ Dawson.png", …), no
  probe touched for it. r9's "6 of 6 on" → **"7 of 7 on"** (my change: the Floor plan is the seventh switch — REG-g.12). gap-e's one failure was the
  server's missing AUTH_SECRET (set now, as package E served).
- 23:34 the orchestrator refreshed base.db with F1 merged: F1's migration is newer than my 0076, so drizzle skips mine on that base (package E's case).
  My probes run on `pkg-g/old-repaired.db` (the A…E base, my migration, R85); the F1 base is checked by `prep-dbs.sh` (0076 applied by hand): R85
  64 → 0, its six checks pass; only REG-613's unknown-kind check fails there, on F1's own kinds (`project_po_*`, `project_expense_*`,
  `project_payout_*`) which my tree does not list — the merge brings both lists together.

## Not built, and why
- **An "Ask {client} for the plan" message** (1.0 F-188's email): the client's portal offers *Send the plan* on an empty Floor plan, and the studio's
  first run offers *Invite {client} to the portal* — a WhatsApp ask would be a second door to the same place; messages to the client wait for the
  delivery layer's client half (Phase B).
- **A "Needs attention" reason** for the client's unanswered marks: the tab's count and the team's bell carry it; adding an `ATTENTION_REASONS`
  entry means filling a fact in both project loaders (`lib/projects/queries.ts`, shared) — left for the owner's call rather than churned in.
- **A search kind of its own**: a plan's original is a file of the project, so the studio search finds it under Files by its name ("Proposed
  layout — SkyOasis @ Dawson.png"); the plan itself opens from the project's tab.
- **A live push / 8-second poll** (1.0 F-221): the page refreshes after each write and on a fresh load (G-Q17).

## For the map (CLAUDE.md) and the other packages
- Model `lib/projects/floor-plan-model.ts` (pure: tools, `LAYERS` · `SYMBOLS` · `HATCHES` keys STABLE as 1.0's, `cleanShape` — the server's shape
  check, scale maths, `numberMarks` (S-numbers on Studio only), `pointSchedule` · `siteDiary` · `filterMarks`); reads `lib/projects/floor-plan.ts`
  (`fetchFloorPlanData` · `fetchPortalFloorPlan` — Studio only stripped here · `isClientFloorPlanFile` · `floorPlanBellFacts` · `floorPlanToAnswer` ·
  `floorPlanAccessOf` · `marksChangedAt`); actions `app/projects/floor-plan-actions.ts` (studio) · `app/portal/floor-plan-actions.ts` (client).
- Tables `project_floor_plans` · `floor_plan_pictures` · `floor_plan_marks` · `floor_plan_comments` · `floor_plan_confirmations` · `floor_plan_seen`
  (timestamps in ms); migration generated locally as `drizzle/0076_lively_swarm.sql`.
- Routes: tab `/projects/<id>/floor-plan` (`?plan=` · `?mark=` · `?add=1`), picture `/projects/<id>/plan-picture/<planId>`, export
  `/projects/<id>/floor-plan/<planId>` (editor group), portal `/my/<slug>/floor-plan` (+ `floor-plan/picture/<planId>`).
- Shared files appended (minimal): `lib/db/schema.ts` · `lib/db/baseline.ts` · `scripts/snapshot-baseline.ts` (six tables) · `lib/projects/tabs.ts`
  (tab + Activity chip) · `lib/projects/events.ts` · `lib/leads/events.ts` (eleven kinds) · `lib/leads/activity.ts` (branch + `floorplan` group) ·
  `lib/notifications/model.ts` (two events, defaults, `{plan}`, templates; one line edited: `SAMPLE_FIELDS` gains `{plan}`) · `lib/keys/registry.ts`
  (area + three keys) · `lib/portal/sections.ts` (key, row, `ALL_ON`) · `lib/portal/model.ts` (`PORTAL_TABS`) · `lib/portal/needs.ts` (access row;
  `ACCESS_ORDER` gains `floor-plan` before `files`) · `lib/portal/access.ts` (one argument) · `lib/portal/files.ts` (a rule) ·
  `lib/portal/notifications-model.ts` + `notifications.ts` (kinds, `BellHome.floorPlan`, a producer, one fill line) · `lib/projects/queries.ts`
  (one tab-count line + import) · `components/projects/project-ghost.tsx` (one branch) · `app/projects/[id]/[tab]/page.tsx` (one branch) ·
  `lib/settings/permissions.ts` (one row) · `scripts/repair-demo-data.ts` (R85 + six checks; REG-613's kind list gains eleven).
- Probe changed on purpose: `verify-pj-r9.cjs` "7 of 7 on" (REG-g.12).
