# S20 · AI Visualizer — outcome (2026-10-12, lane A)

Card: `held:ai-visualizer` ("Left in the AI Visualizer", recommendation "developers' lane"; questions "Accept recolour as Replace (Q-21
changed during the build)?" · "Port the drift guard, and is its repair free or refunded?"). Built on her "build all of them" (2026-10-11) as
the prompt set it: HEIC photos, Replace as she answered, the drift guard, the Maison AI suggestions, every other line as the card
recommended. The image model stays the developers' — the curated engine (`lib/visualizer/engine/*`) renders; nothing calls a model.
Carried notes taken: **S10** (the editor's "Suggest {style} finishes" now applies its picks behind the editor's Undo — REG-S20.6), **S19**
(the render drift repair is built as its own `render_repair` charge — REG-S20.4 · .5; no new Visualizer table, so `PAID_WORK_TIMES` needs no
line; the Visualizer isn't one of the seven Pro features and no Pro surface was added), **S15** (the planner's *Render in AI Visualizer*
door is untouched — `verify-pm2-s15` green), **S28** (floor-plan photo → 3D picture) left to S28.

1.0 read: `src/lib/normalize-image.ts` (+ its three callers in `src/components/projects/visualizer.tsx` — the room photo, a material swatch,
the Replace reference — and the trial / landing demo), `src/lib/visualizer/drift-guard.ts`, `src/lib/render-drift.ts`,
`src/app/api/render/{drift-check,drift-fix}/route.ts`, `runDriftGuard` / `recordDrift` in `visualizer.tsx`; and, for the price, 1.0's credits
line (branch `origin/company/port`): `src/__tests__/credit-drift-repair-pricing.test.ts` (a repair charges `render_repair`, 2, refunded when no
image comes; `maxRepairAttempts = 1`), `src/lib/om/visualizer/server/runs.ts` (`REPAIR_ACTION` · `repairRefId` — one debit per variant under
its own ref), `src/lib/nudges/catalogue.ts` (a repair is never a new success), `docs/features/ai-visualizer-2/spec.md` (Q6 · R3 · V17: the
button's price is the render's). The audit `16-ai-visualizer-…` (VF-02 / Q-21 / VO-06 / Q-23) and the pixel audit `18-…`.
Register rows: `steps/reg-S20.md` (REG-S20.1…7). Probe: `design-source/verify/pending-modules/verify-pm2-s20.cjs` — tally below.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "A real image model for every pass (render, detect any photo, lasso re-detect, empty, remove, furnish, sketch to photo, restyle in 25 looks, relight, style transfer, the finishing note, Fast vs High) — stand-ins · as recommended (audit 16) · developers' lane" | **stand-in** (the developers') — the curated engine renders every pass in the browser, as before; this step adds two more seams for the model: the drift guard's report (`coerceDriftReport`, 1.0's reader for the model's JSON) and its repair (`guardRender`) | `lib/visualizer/engine/run.ts` (`runPass` · `guardRender`), `lib/visualizer/drift.ts`, `lib/visualizer/note.ts` (`readNote`) |
| "Replace a piece with a new one — the build changed her answer from 'say it can't' to recolour (Q-21) and never put it back to her · tell her" | **built — as she answered** (Q-21 / VF-02: "the engine answers Replace honestly"): the picker stays; the panel and the Generate bar say the prototype can't draw a new piece in; **Recolour it to match** turns the pick into a Customize in one step with Undo; no version says "Swapped for" any more. **Told her** (flag below) | REG-S20.3; `lib/visualizer/model.ts` (`replaceHeld` · `replaceHeldLead` · `recolourPick` · `nearestColourChip`; `changeList`'s needs), `components/visualizer/editor/panels/furniture-panel.tsx`, `components/visualizer/editor/visualizer-editor.tsx` (`recolourToMatch`, the reason link), `lib/visualizer/engine/run.ts` (the backstop; the recolour-as-swap code gone) |
| "Drift guard (check and repair; Drift repair priced at 2 credits) — held as recommended ('not needed') · revisit for production: a real model drifts" | **built** — checked after every edit, restyle, transfer, Auto furnish and note; the camera's framing read by rule and lined up again by one corrective pass, kept only when better; charged as its own Render repair (2 AI credits a version, 1.0's price and refs), said before the press and after; non-fatal; Stop gives every charge back. The other five kinds of fault are the model's (types, words and reader ported) | REG-S20.4 · .5; `lib/visualizer/drift.ts`, `lib/visualizer/engine/drift.ts`, `lib/visualizer/engine/run.ts` `guardRender`, `components/visualizer/editor/{visualizer-editor,rail}.tsx`, `components/visualizer/editor/dialogs/present-dialog.tsx`, `app/visualizer/actions.ts` (`keepRender` stamps the ledger's cost), `components/credits/credits-client.ts` (`chargeAIQuietly`), `app/credits/actions.ts` (REF), `lib/credits/{schedule,queries,model}.ts`; harness `scripts/viz/drift-test.mts` |
| "HEIC photos — partial (only where the browser opens them) · revisit: the iPhone default; a small converter (1.0: normalize-image.ts)" | **built** — every browser: 1.0's converter (`heic-to` 1.5.2, pinned, loaded only when a HEIC lands) after the platform's own decode; every Visualizer picture pick, Company › Materials' swatch, and a HEIC kept in a lead's Files now wears a drawn picture (so it shows and opens in the Visualizer); an honest refusal where neither can | REG-S20.1 · .2; `lib/heic.ts`, `components/visualizer/editor/{visualizer-editor,editor-model}.tsx`, `components/visualizer/editor/dialogs/add-room.tsx`, `components/company/materials/material-dialog.tsx`, `components/leads/files/upload-picture.ts`, `package.json` + `package-lock.json` |
| "Maison AI on the Visualizer home and in the editor — every suggestion answers Coming soon · as recommended · revisit: Maison AI acts elsewhere since gaps build I" | **built** — S10 made every suggestion act; the one S10 left half-done (Suggest {style} finishes only opened Surfaces) now proposes its picks and applies them as one step with Undo | REG-S20.6; `components/visualizer/editor/visualizer-editor.tsx` (`aiSuggestions`) |
| "1.0's 900 px sample rooms (one at an off angle) still front the welcome — package call · revisit: new photography" | **kept** — new photography is an asset to commission (Vicky's); nothing to build without it. The welcome's before / after is already the living room painted by the engine (REG-819) | — |
| "Pictures in object storage; picture routes behind sign-in with rate limits — stand-ins · developers' lane" | **stand-in** (the developers') — pictures stay in the database tables behind the routes that only serve who may see them (REG-687); sign-in arrives with S30 (this lane), storage and rate limits with the developers' port | `app/visualizer/img/[...key]`, `app/files/img/[fileId]` (unchanged) |
| "Co-Pilot moodboards and renders filed into a project — held (REG-552)" | **built (S23)** — REG-552's hold was lifted by S23: the meeting's *Mood board* is kept with the meeting and *Render a room* opens the lead's design, both listed on the meeting's *From this meeting*, which sits on the project's Client › Meetings; the lead's design is the project's. **Kept from 1.0:** nothing is filed into Files on its own — a render goes to Files › Renders by its *Save to Files* (Q-13, one home for pictures) | S23's `components/meetings/room/meeting-room.tsx`, `lib/meetings/queries.ts` |
| "Materials: no vendor or price per material (1.0 Material Catalog) — package call · keep: the price lives in the Price book" | **kept** (the card's keep) — a material links to its Price book item, which carries the vendor and the price; *Add to a quote* prices from it | Company › Materials (unchanged) |

### Found in 1.0, not on a card
- **The AI sandboxes** (`src/app/(main)/tools/{visualizer-sandbox,auto-furnish-sandbox,detect-sandbox,relight-sandbox,style-transfer-sandbox,floorplan-3d-sandbox}`, `src/components/tools/{spatial-view-experiment,depth-parallax-viewer}.tsx` with `/api/render/{outpaint,reangle,orbit-video,depth,detect-sandbox}`) — 1.0's experiments; audit 16 Q-23 left outpaint, reangle, orbit and depth unbuilt. **For S35–S41** ("the AI sandboxes").
- **`src/lib/visualizer/mask-composite.ts` + `/api/render/segment`** — compositing a model's segmentation masks; the developers' (it needs the model). Noted for the map.
- **`/api/render/room-scan`** (Auto furnish's pre-flight "Room reads as empty / …empty it first") — 2.0's Furnish reasons say the same by rule (`toolAvailability`); nothing to add.
- **`/api/render/photorealistic`** (15 credits, `render_photorealistic`) — 1.0 uses it for the floor plan's photo render and Render Tour; **for S28** (floor-plan photo → 3D picture).
- **1.0's port spec V17** ("A drift repair can add 2 credits after a Generate. The button's price is the render's") — built as stated, with the repair's price said under Generate's *Change* line (REG-S20.4).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Replace: her answer back** (Q-21 as she answered on 2026-09-25: the engine answers honestly) — the recolour the build made silent is one
  named press, never a claimed swap. **Flag for Vicky:** if she'd rather keep the build's recolour-as-Replace, it's one rule to put back.
- **The drift repair is charged, 2 AI credits a version** — 1.0's credits line does exactly that (its own debit, refunded when no picture
  comes, one attempt); the card's "free or refunded?" is answered by 1.0: charged, refunded on failure and on Stop. A repair never counts as a
  render. Said before the press (Change) and after (the ready line, Present, Usage).
- **What the rule checks: the camera.** A rule can't see a blocked door; it can see the room's lines move. Thresholds were set on 1.0's own
  finished looks (one of fifteen drifted) and checked on the demo's edits and on photos moved on purpose (`scripts/viz/drift-test.mts`).
- **Which passes are checked**: 1.0's three (restyle, transfer, furnish) + its port's edit + a note (it can restyle); relight, Empty the room
  and Render from sketch aren't (a grade, the room's own plate, a sketch made into a new picture on purpose).
- **HEIC: 1.0's converter, pinned, lazy** — not a CDN script: the house self-hosts what it runs (fonts, the pdfjs worker); the 3 MB loads
  only when a HEIC lands, after the platform's own decode.
- **A HEIC in Files keeps its bytes** (gaps build E's rule) and gains a drawn picture — no conversion of the file itself.

## What to check in the browser (Dane, Owner · 1440 and 390)
- `/visualizer/b46000d1-1638-4c7c-af20-bebbcc3b9744` (Kevin Ng's design) › **Add room** › upload an iPhone HEIC photo (Chrome) — a room
  from it; a HEIC swatch (Surfaces › a group › Upload a swatch) opens the swatch dialog.
- Living room › Original › Furniture › Grey Fabric Sofa › **Replace** — the line under the picker; pick a Quick pick — Generate waits with
  the same words; **Recolour it to match** (or the link) — Customize, Undo.
- Kitchen › Original › Style › **Scandinavian** › Change (the repair's price) › Restyle — *Checking the room’s shape*, then *V… is ready ·
  lined up with your photo*; Present says it with *2 AI credits*; Company › Plan & AI credits › Usage lists *Render repair · Kevin Ng ·
  Kitchen*. Compare V1 (the demo's older, unrepaired look) with the new version — the window and cabinets line up.
- Maison AI › *Suggest … finishes for the living room* › *Pick these 3 finishes* › Undo.
- Company › Materials › New material › Upload a photo › a HEIC.
- Hui Min (Admin), Germaine / Michelle (Designers): the same (every member uses the AI Visualizer; nothing here is role-gated). A Designer's
  repair counts against their own monthly amount, as their render does.

## Probes run (lane A, production build on :3160, fresh copies of `pbuild/base.db` migrated + repaired)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s20.cjs`** (this step) | **58 / 58**, twice back to back on one server — a full `.dump` of the database before the first run, after it and after the second is identical; server log clean; shots in `design-source/verify/pending-modules/pm2-s20/` (1440 · 390 touch · 768 touch · 844×390 sideways · 320); HEIC fixtures in `pm2-s20/fixtures/` (made with macOS `sips`, HEVC like an iPhone's) |
| `ai-visualizer/verify-viz-studio.cjs` · `verify-viz-client.cjs` · `verify-viz-sheets.cjs` (regression runner) | 37 / 37 (again after the last build: 37 / 37) · 30 / 30 · 14 / 14 |
| `ai-visualizer/rooms-menu/verify-rooms-menu.cjs` | 10 / 10 |
| `ai-credits/verify-cr-r1.cjs` · `verify-cr-r4.cjs` | 59 / 59 · 41 / 41 |
| `pending-modules/verify-pm2-s10.cjs` (Maison AI everywhere, the editors' suggestions) | 107 / 107 |
| `pending-modules/verify-pm2-s15.cjs` (the planner's Render in AI Visualizer) | 33 / 33 |
| `pending-modules/verify-pm2-s19.cjs` (credits, plan locks) | 116 / 116 |
| `projects/verify-pj-r9.cjs` (the portal's Designs) | 66 / 66 |
| `ghosts/verify-ghosts-same.cjs` (1440) · the same at 390 touch | 51 / 51 · 51 / 51 |
| the upload path's probes after the Files change: `ux-build-2026-09-30/P3/verify-p3.cjs` · `folders/verify-folders-files.cjs` · `projects/verify-pj-gap-e.cjs` · `pending-modules/verify-pm2-s05.cjs` | 91 / 91 · 16 / 16 · 55 / 55 · 113 / 113 |
| engine harnesses: `scripts/viz/drift-test.mts` (new) · `render-test.mts` · `remove-test.mts` | all pass (fifteen 1.0 looks: the kitchen's Scandinavian read as moved and lined up, the other fourteen and the demo's edits keep their camera; three photos moved on purpose read and lined up; the guard as Generate runs it) · all pass · all pass (its Replace case now the Customize *Recolour it to match* makes — commented as a deliberate change) |

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (16 warnings, all older) · `npm run design:lint` holds (no count
raised) · `DATABASE_URL=file:<scratch> npx next build` exit 0 (twice, under the lanes' build lock). The lane's `local.db` was never written (an
empty one the first build made was removed; every later build ran on a scratch copy).

## Migration and repair
No migration (the repair's record rides in `render_jobs.variants_json` — `applied.repair` — and the ledger's own row). No repair (R119 stays
free): the demo needs no new records — the guard runs on new renders; Kevin Ng's kitchen V1 (1.0's drifted Scandinavian look, made before the
guard) is kept as it was made.

## Shared pieces changed
- `package.json` + `package-lock.json`: one dependency, **`heic-to` 1.5.2** (exact; LGPL-3.0, loaded as its own lazy chunk). If the lockfile
  doesn't merge cleanly in main, run `npm install heic-to@1.5.2 --save-exact` there; main's `node_modules` needs the install before its build.
- `components/credits/credits-client.ts` — `chargeAIQuietly` (a charge with no moment on a refusal).
- `lib/credits/schedule.ts` — `render_repair`'s 2.0 label *Render repair*; `makesRenders`. `lib/credits/{queries,model}.ts` count with it.
- `app/credits/actions.ts` — the REF pattern takes `repair:<job>:<1–3>`.
- `components/leads/files/upload-picture.ts` — a HEIC's drawn picture (every lead-file upload path).
- Nothing in `components/om/*`, the shell or `app/globals.css`.

## For the next steps
- **S28 (floor-plan photo → 3D picture, this lane):** `lib/heic.ts` `normalizePicture` reads an iPhone's HEIC floor-plan photo; 1.0's
  `render_photorealistic` (15) is the floor plan's photo render price; the planner's *Render in AI Visualizer* door (REG-1658) is unchanged.
- **S30 (sign-in):** the picture routes go behind the session there (this card's stand-in line).
- **S34 (real services):** an image model plugs into `runPass` and reports faults through `coerceDriftReport`; its corrective pass replaces
  `reframe` in `guardRender` (same contract: a report in, a picture out, kept only when it scores better); the charge is already there.
- **S35–S41:** 1.0's AI sandboxes listed above.
- **The orchestrator:** UAT 13.07 ("Oak Coffee Table › Replace, pick any Quick pick … new table") now meets the honest line — add "then
  *Recolour it to match*" and expect "Customize · …" for the table; a new step could restyle the kitchen as Scandinavian (the repair).

## Principles check (DESIGN-1. **The mock wins, every exception written down** — no mock: the jobs are 1.0's (normalize-image, the drift guard and its price) and her
   own answer (Q-21); every new word is flagged *(invented copy)* in `reg-S20.md`; the Replace answer and the repair's price are flagged for her.
2. **One system, no one-offs** — no new component, stylesheet or token: the panel's own hint line and outlined DS Button, the rail's reason
   link and options line, Present's hint line, the house snackbar with Undo, the Maison AI proposal, the credits ledger and Usage table;
   one HEIC helper for every picker (`lib/heic.ts`), one quiet charge beside `chargeAI`.
3. **Plain words for studio people** — "This is the prototype, so a new sofa can’t be drawn into the photo", "Recolour it to match",
   "Checking the room’s shape", "lined up with your photo", "Render repair"; never "drift", "HEIC conversion", "model" or "NCC" on screen.
4. **Nothing is lost** — a HEIC in Files keeps its own bytes; a Replace pick stays until the studio converts it (one step, Undo, ⌘Z); a repair
   is kept only when it reads better; a repair that can't be paid for keeps the render as it came; Stop and a failed save give back every
   charge; Suggest finishes is one step with Undo.
5. **Say why** — Replace says why it waits and the way on; an unpaid or unhelpful repair says so on the version; a HEIC that can't be opened,
   or a file with no type that isn't a picture, says so in the house's words.
6. **Back returns where you came from** — no navigation changed; *Open in AI Visualizer* from a HEIC in Files carries `?from=` as before.
7. **Every screen is whole** — no new screen; the editor's ghost and the Materials and Files ghosts are unchanged and the ghost probes are
   green at 1440 and 390 touch; the progress card names its new step; nothing appears empty.
8. **Every width is designed** — the panel's line and button, the Generate reason and the options line checked at 1440, 768 touch, 390 touch,
   a phone on its side and 320 (no sideways scroll against `screen.width`); the ready line wraps inside the house snackbar.
9. **Tables follow the leads listing** — the Usage table shows the repair through its own model; no new table.
10. **Motion with purpose** — none added; the progress card's step is the only moving word, and it is the real work.
11. **Honest data** — no demo row invented (no repair): the guard runs on new renders; the version's repair cost is written by the server
    from the ledger, never the browser's claim; the balance stays the ledger's sum (asserted); nothing claims a swap it didn't make; the
    prototype says it is one where it can't do the job (Replace, the image model).
12. **Reach for everyone** — every new press is a labelled button (the outlined Recolour, the reason link), keyboard reachable, ⌘Z covers
    the conversion and the picks; the snackbars are the house's live region; the repair's price is said in words, not only in a chip.

**How to add a missing thing:** one home each (the Furniture panel's Replace, Generate's own progress and price lines, Present, Usage, the
existing pickers) — no page, no rail item; shown only when it applies (the Replace line only on Replace, the repair line only for checked
passes and only once a repair happened, the HEIC note only after half a second); **one filled button** (Generate stays the only one; Recolour
is outlined); defaults need no set-up (nothing to switch on); AI honest (nothing calls a model; the stand-in says so)..md)
1. **The mock wins, every exception written down** — no mock: the jobs are 1.0's (normalize-image, the drift guard and its price) and her
   own answer (Q-21); every new word is flagged *(invented copy)* in `reg-S20.md`; the Replace answer and the repair's price are flagged for her.
2. **One system, no one-offs** — no new component, stylesheet or token: the panel's own hint line and outlined DS Button, the rail's reason
   link and options line, Present's hint line, the house snackbar with Undo, the Maison AI proposal, the credits ledger and Usage table;
   one HEIC helper for every picker (`lib/heic.ts`), one quiet charge beside `chargeAI`.
3. **Plain words for studio people** — "This is the prototype, so a new sofa can’t be drawn into the photo", "Recolour it to match",
   "Checking the room’s shape", "lined up with your photo", "Render repair"; never "drift", "HEIC conversion", "model" or "NCC" on screen.
4. **Nothing is lost** — a HEIC in Files keeps its own bytes; a Replace pick stays until the studio converts it (one step, Undo, ⌘Z); a repair
   is kept only when it reads better; a repair that can't be paid for keeps the render as it came; Stop and a failed save give back every
   charge; Suggest finishes is one step with Undo.
5. **Say why** — Replace says why it waits and the way on; an unpaid or unhelpful repair says so on the version; a HEIC that can't be opened,
   or a file with no type that isn't a picture, says so in the house's words.
6. **Back returns where you came from** — no navigation changed; *Open in AI Visualizer* from a HEIC in Files carries `?from=` as before.
7. **Every screen is whole** — no new screen; the editor's ghost and the Materials and Files ghosts are unchanged and the ghost probes are
   green at 1440 and 390 touch; the progress card names its new step; nothing appears empty.
8. **Every width is designed** — the panel's line and button, the Generate reason and the options line checked at 1440, 768 touch, 390 touch,
   a phone on its side and 320 (no sideways scroll against `screen.width`); the ready line wraps inside the house snackbar.
9. **Tables follow the leads listing** — the Usage table shows the repair through its own model; no new table.
10. **Motion with purpose** — none added; the progress card's step is the only moving word, and it is the real work.
11. **Honest data** — no demo row invented (no repair): the guard runs on new renders; the version's repair cost is written by the server
    from the ledger, never the browser's claim; the balance stays the ledger's sum (asserted); nothing claims a swap it didn't make; the
    prototype says it is one where it can't do the job (Replace, the image model).
12. **Reach for everyone** — every new press is a labelled button (the outlined Recolour, the reason link), keyboard reachable, ⌘Z covers
    the conversion and the picks; the snackbars are the house's live region; the repair's price is said in words, not only in a chip.

**How to add a missing thing:** one home each (the Furniture panel's Replace, Generate's own progress and price lines, Present, Usage, the
existing pickers) — no page, no rail item; shown only when it applies (the Replace line only on Replace, the repair line only for checked
passes and only once a repair happened, the HEIC note only after half a second); **one filled button** (Generate stays the only one; Recolour
is outlined); defaults need no set-up (nothing to switch on); AI honest (nothing calls a model; the stand-in says so).
