# S28 · Floor-plan photo to a 3D picture — outcome (2026-10-13, lane A)

Card: `studio:floorplan-isometric-ai` ("Floor-plan photo to a 3D picture", recommendation "needs her mocks / decision"; question "Is the
planner's isometric view enough, or should a photo also make an AI picture, priced in credits?"). Built on her "build all of them"
(2026-10-11) as the prompt set it: **nothing calls an image model** — the photo is straightened by 1.0's own zero-AI maths, its rooms are
placed on it by the studio in the 3-D Space Planner, and the planner draws the picture (1.0's Dollhouse and Top-down) from them. The
question is answered **both, and no credits**: the planner's isometric view stays the home, and a photo now makes the picture through it;
1.0's tool charged nothing, so nothing is charged here — a photographic look is the AI Visualizer's, at its own price (REG-1658's door).
Carried notes taken: **S15** (*Render in AI Visualizer* reused from the picture, `?view=iso` kept and extended with `photo=1`), **S20**
(`lib/heic.ts` `normalizePicture` reads an iPhone's HEIC plan; `render_photorealistic` 15 — see Decisions), **S07** (a lead's photo and its
layouts are the lead's until Won, then the project's), **S19** (`requirePlan` / `chargeAI` not needed — no charge), **gaps build G** (the
project's Floor plan is the floor plan's one home: a photo picked there, in Files or in the planner is the same record).

1.0 read: `src/app/(main)/tools/floorplan-3d-isometric/page.tsx` (the tool: upload → straighten → inventory chips → look → generate →
download; Beta; no credits), `src/lib/render/floorplan-pipeline.ts` (`prepareScan`: scanic's paper finder → deskew → bake → crop),
`floorplan-deskew.ts` (the two-pass Sobel histogram, `flattenPlanBackground`, `cleanPlanImageData`, `cropToContent`), `floorplan-inventory.ts`
(`MANIFEST_PROMPT`, the chip groups), `floorplan-scaffold.ts` (option B — a drawn scaffold for the model), `src/app/api/render/floorplan-3d-sandbox`
(+ the `/tools/floorplan-3d-sandbox` page: prompt gym, model bake-off, improve-prompt, vectorize spike, the fidelity gate and retry),
`public/floorplan-3d/style-{dollhouse,topdown}.jpg`; and around it `src/lib/cv-preprocess.ts`, `src/app/api/floor-plans/generate{,-v2,-v3}`,
`src/components/floor-plan/FloorPlanUploadDialog.tsx` (the planner's AI plan reading — TD-078), 1.0's credits schedule
(`render_photorealistic` 15 is the planner's photo render, not this tool's).
Register rows: `steps/reg-S28.md` (REG-S28.1…11). Probe: `design-source/verify/pending-modules/verify-pm2-s28.cjs` — tally below.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Upload a floor-plan photo and get a furnished 3D picture" | **built** — *Make a 3D picture* (two steps, then the planner): the photo dropped or picked (JPG · PNG · WebP · HEIC · a PDF's first page), straightened and cleaned in the browser by 1.0's deskew with a paper finder by rule; it lies under a new layout at its size; each rectangle drawn on it is the next listed room; *Make the 3D picture* furnishes every bare room by the planner's rule (said, with Undo) and opens the picture. **Stand-in** for the image model's skin: the picture is the planner's live 3D drawing of the placed rooms, so it matches the plan by construction; a photographic look goes through *Render in AI Visualizer* | REG-S28.1 · .2 · .5 · .6 · .7 · .11; `components/planner/photo/*`, `lib/planner/{straighten,straighten-run,photo}.ts`, `app/planner/photo-actions.ts`, `components/planner/editor/planner-editor.tsx` (the guide), `components/planner/editor/panels.tsx` (*To place on the plan*) |
| "The room list read from the plan, editable before drawing" | **built — read by rule, editable** (stand-in for the model's reading): the list starts from the flat type on record through the planner's own Singapore flats (an HDB 4-Room's eleven rooms), shown as 1.0's chips; *Change the rooms* takes any off and adds the planner's presets, named on; every room is still placeable or *Not on this plan* while drawing. The seam for a model is `roomsForType` (and `startFromFloorPlan`'s `rooms`) | REG-S28.3 · .6; `lib/planner/photo.ts` (`roomsForType` · `addedRoom` · `roomSummary`), `components/planner/photo/photo-dialog.tsx` |
| "Two looks, Dollhouse and Top-down, and a download" | **built** — *3D picture*: **Dollhouse** (1.0's angled cutaway: from the front, 45° down, outer walls square to the frame, walls cut low; turnable) and **Top-down** (straight down, north up; zoom and move only); **Download** a PNG named for the look (1.0's one way out), plus **Save to Files** (Files › Renders, the house's place for pictures) and **Render in AI Visualizer** | REG-S28.7; `components/planner/picture/picture-dialog.tsx`, `components/planner/scene/three-view.tsx` (`look`) |
| Question: "Is the planner's isometric view enough, or should a photo also make an AI picture, priced in credits?" | **answered as recommended** — both: the planner's isometric view stays the home and a photo now makes the picture through it; **no credits** (1.0's tool charged none; the picture costs nothing to draw). Flagged for Vicky | Decisions below |

### Found in 1.0, not on a card
- **The calibration workbench** `/tools/floorplan-3d-sandbox` (+ `/api/render/floorplan-3d-sandbox`: prompt gym, model bake-off, *improve
  prompt*, the vectorize spike) — one of 1.0's AI sandboxes; **for S35–S41**.
- **1.0's fidelity gate and its silent retry** (the model's picture checked against the room list, redrawn once) — no model, so no gate: the
  planner draws exactly the placed rooms; the gate's purpose becomes the guide's count (*n placed · m to go*) and *Every room is on the plan*.
- **Regenerate** — the picture is live (a turn, a zoom, a look change redraws it at once), so there is nothing to regenerate.
- **`floorplan-scaffold.ts` (option B — a drawn scaffold handed to the model)** — what the scaffold drew is what the planner now builds
  natively from the placed rooms.
- **scanic's ML paper finder** — stands in by rule (`findPaper`, REG-S28.2). It can't take out a slanted photo's perspective (a turn is all a
  rule can take out); the line under the picture says what was done.
- **1.0's example tiles** (`public/floorplan-3d/style-{dollhouse,topdown}.jpg`) — not ported: 2.0 shows the picture itself, live, beside the
  look's own line.
- **The *Beta* tag** — dropped (2.0 marks nothing Beta; the stand-in's honest line says what the prototype does).
- **The planner's AI plan reading** (`src/lib/cv-preprocess.ts`, `/api/floor-plans/generate{,-v2,-v3}`, `FloorPlanUploadDialog`'s reading
  steps) — TD-078, the developers' (S34 / the S41b list). Its *Calibrate Scale (Optional)* step is built here as *A length on the plan*.
- **1.0's spec "Share to portal"** for the picture — 2.0's ways: *Save to Files* (then Files' own *Show to client*) or the planner's *Share
  with client*; no new portal path.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **The planner is the home; no new page, no rail item.** Tools › Floorplan to 3D Isometric opens the planner's isometric gallery *on* Make a
  3D picture (`/planner?view=iso&photo=1`) — 1.0's tool started on its upload. A deliberate change of REG-1656 (it only opened the gallery);
  `verify-pm-j.cjs` changed with a comment saying so.
- **No credits.** 1.0's tool charged none; 1.0's `render_photorealistic` (15) priced the planner's *photo* render. 2.0 reaches a photographic
  look through *Render in AI Visualizer*, where the Visualizer's own render price applies — so `render_photorealistic` stays unused in the
  schedule (it was before). **Flag for Vicky:** if she wants a priced one-press photographic picture here, it is the Visualizer's pass
  behind one press at 15.
- **One record for the photo** (REG-S28.5): on a project, a plan of its Floor plan tab (G's own writer); on a lead, its Files › Floor plans
  original + `floor_plan_photos` (the straightened picture); carried at Won with the same id and the same address
  (`/planner/plan-picture/<id>`), the newest try of each original live, earlier tries put away; personal → kept with the layout only.
- **Who may:** whoever may add a layout to that lead or project (S07's rules); Accounting never (a floor plan is the design — the server
  refuses, the route 404s); a Designer not on a lead doesn't see it in *For*.
- **Size by floor area first** (needs no set-up: the lead's own sq ft, else the planner's flat for the type), **or one length** (the Floor
  plan tab's own *Set the scale*). A project plan that has a scale keeps it. *Change its size…* later rescales the plan, rooms and the pieces'
  places together (one Undo).
- **The room list by rule from the flat type** — the record already says what the home is; a plan that differs is fixed in *Change the
  rooms* or *Not on this plan*.
- **Make the 3D picture furnishes only bare rooms**, by the planner's own Arrange, and says so inside the picture with Undo.
- **Dollhouse's camera is 1.0's**, from the front (walls square to the frame), not the planner's 45°-from-the-corner isometric — 1.0's prompt
  asked for that framing. **Flag for Vicky:** the planner's own iso view is unchanged.
- **Personal is the first *For* in Tools** — 1.0's tool belonged to nobody; the leads and projects follow. From a lead, a project, Files or
  the Floor plan tab, *For* isn't asked.

## What to check in the browser (1440 and 390)
- **Dane (Owner):** Tools › **Floorplan to 3D Isometric** — Make a 3D picture opens over the isometric gallery; pick **Farah Ahmad**, drop
  `public/planner/demo/floor-plan-photo-waterway-sunrise.jpg` — *Straightened by 7.0° and cleaned*; *Turn a quarter*; switch *Straighten and
  clean it* off (*As it was taken*) and on; **Next** — the chips (*3 bedrooms · 2 bathrooms · … · 11 rooms in all*), *Started from HDB
  4-Room*; *Change the rooms* — take *Storeroom 2* off, *Add a room ▾ › Study*; *How big it is* — 93 m², *The plan reads as about …*; try *A
  length on the plan*; **Place the rooms** — the planner opens on the photo, the guide says *Drag over the Living / dining on the plan*; drag
  three rooms (they snap edge to edge), *Not on this plan* on one (Undo), Esc (*Next: the Kitchen* · *Place it*); place the rest — *Every
  room is on the plan* · **Make the 3D picture** — Dollhouse (drag to turn), Top-down, the furnished note's Undo, **Download**, **Save to
  Files** (Open), **Render in AI Visualizer**. Farah's Activity names the photo.
- **Farah's Files** (`/leads/c9691890-3132-4902-9c2a-d251f6bfda9a/files`) › Floor plans › *Floor plan — Waterway Sunrise.jpg* › ⋮ *Make a 3D
  picture* (also in the file viewer's ⋮); a non-plan photo has no such item.
- **Benjamin's project (P-2026-002) › Design › Floor plan** › ⋮ *Make a 3D picture* — no size asked (its scale is kept), *As it is on the
  Floor plan tab*.
- **Vivien Lee** (lead) › Plan the space in 3D › Start a new layout › *A floor-plan photo* — make one, then move her to **Won**: the
  project's Floor plan shows the photo, its 3D layout keeps it underneath; a second try of the same file comes put away.
- The planner's **⋮ › 3D picture…** on any layout with rooms; the floor-plan card's **Change its size…**; **⌘K › Create › Make a 3D picture**;
  Maison AI on the planner's home.
- **Hui Min (Admin):** the same. **Germaine / Michelle (Designers):** only their leads and projects in *For*; a lead they aren't on refuses
  in words. **Priya (Accounting):** no Make a 3D picture anywhere; `/planner/plan-picture/<id>` is 404.
- 390 (touch): the dialog is a bottom sheet, step 2 scrolls inside it; the guide sits full width under the bar and wraps; 768 touch: the
  planner's bar fits (View is its icon, Share reads *Share*).

## Probes run (lane A, production build on :3160, fresh copies of `pbuild/base.db` migrated + repaired)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s28.cjs`** (this step: doors · Farah from Files · placing · the picture · who may · Benjamin's plan · personal · Vivien carried at Won · 390 / 768 touch / 320) | **98 / 98**, the banked run; a full-table hash of the database before and after is identical (everything the probe made is put back); server log clean; shots in `design-source/verify/pending-modules/pm2-s28/` (01–10 at 1440, 11–13 at 320 / 390 / 768) |
| `projects/verify-pj-gap-g.cjs` (the Floor plan tab, G) | 67 / 67 |
| `projects/verify-pj-gap-j.cjs` (the 3-D Space Planner) | 55 / 55 |
| `parity-map-build/verify-pm-j.cjs` (planner View ▾, levels, the Tools tile — its tile step changed on purpose, commented) | 53 / 53 |
| `pending-modules/verify-pm2-s07.cjs` (a lead's layouts) · `verify-pm2-s15.cjs` (Render in AI Visualizer) · `verify-pm2-s19.cjs` (credits) · `verify-pm2-s20.cjs` (Visualizer, HEIC) · `verify-pm2-s10.cjs` §1 (Maison AI) | 89 / 89 · 33 / 33 · 116 / 116 · 58 / 58 · 41 / 41 |
| `ai-visualizer/verify-viz-studio.cjs` · `global-search/verify-search.cjs` · `folders/verify-folders-files.cjs` | 37 / 37 · 27 / 27 · 16 / 16 |
| `ux-build-2026-09-30/P3/verify-p3.cjs` (Files upload paths) | 91 / 91 (one earlier run hit the probe's own `database is locked` — its sqlite3 call has no wait; older than this step — rerun clean) |
| `ghosts/verify-ghosts-same.cjs` (1440) · the same at 390 touch | 54 / 54 · 54 / 54; the isometric line's ghost measured Δ 0 at 1440 / 768 / 390 |
| harness `scripts/planner/straighten-test.mts` (Node, `@napi-rs/canvas`, the browser's own pipeline) | pass — the demo photo: sheet found, tilt read 7.00° (drawn at 7°), outline read, 8.71 mm/px against the drawing's 9.21 (within 6 %); a scan on white: no sheet, 3° read as 3.0°; a quarter turn swaps the sides and keeps the crop |

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (16 warnings, all older) · `npm run design:lint` holds (no count
raised) · `npm run design:anatomy` holds (1699) · `DATABASE_URL=file:<scratch> npx next build` exit 0 under the lanes' build lock. The lane's
`local.db` was never written.

## Migration and repair
- **Migration 0101** `drizzle/0101_floor_plan_photos_s28.sql` (+ `meta/0101_snapshot.json`, journal): `CREATE TABLE floor_plan_photos`
  (`id` · `lead_id` → leads, cascade · `file_id` · `name` · `width` · `height` · `scale_mm_per_px` · `picture` · `created_by` · `created_at`)
  + its index. Additive, schema only. **If the number is taken in main, regenerate it there** (`npm run db:generate`) — the schema is in
  `lib/db/schema.ts` (`floorPlanPhotos`); `floor_plan_photos` is in `lib/db/baseline.ts` and `scripts/snapshot-baseline.ts` after
  `space_layout_versions`.
- **Repair R119** (R120 is the next free): Farah Ahmad's floor-plan photo in her Files › Floor plans (folder found or made; bytes from
  `public/planner/demo/floor-plan-photo-waterway-sunrise.jpg`, Sarah's, 15 minutes after her Contacted log); and in step, any won lead's photos
  carried to the project as the project writer carries them. Four checks. Idempotent (a second run adds nothing). Run `npm run db:baseline`
  in main after the orchestrator's repair run.

## Shared pieces changed
- `components/planner/scene/three-view.tsx` — `look?: 'front' | 'top' | null` (an orthographic camera from the front or straight down; `low`
  fits the walls' cut height); the planner's own iso look unchanged.
- `components/planner/editor/top-view.tsx` — Draw a room's first corner snaps to a room's edge (as the second did).
- `components/planner/editor/planner-topbar.tsx` — `tight` (≤1024: Share reads *Share* / *Shared*); `ViewMenuButton compact` ≤1024.
- `lib/planner/model.ts` — `PlanDoc.toPlace`, the underlay check accepts `/planner/plan-picture/<id>`, `forClient` drops `toPlace`.
- `app/planner/actions.ts` — `createLayout` takes `photo`.
- `lib/projects/create.ts` — `carryLeadFloorPlans` (Won and a project brought back, `app/projects/ending-actions.ts`).
- `components/projects/floor-plan/plan-canvas.tsx` — optional `maxHeight`; `project-floor-plan.tsx` — the kebab's *Make a 3D picture*.
- Files: `files-grid.tsx` · `files-table.tsx` · `lead-files.tsx` · `file-viewer.tsx` — the `picture3d` menu item on a floor plan.
- `components/shell/tools-popover.tsx` (the tile's address), `lib/global-search/model.ts` (*Create › Make a 3D picture*),
  `lib/leads/activity.ts` (two lines), `components/planner/{new-layout-dialog,project-layouts-dialog,planner-ghosts}.tsx`,
  `components/planner/home/planner-home.tsx`.
- New asset `public/planner/demo/floor-plan-photo-waterway-sunrise.jpg` (drawn by `scripts/planner/floor-plan-photo.mts`).
- Nothing in `components/om/*`, the shell's frame or `app/globals.css`. No new dependency.

### Files (the lane isn't a git tree — every file this step touched)
New: `lib/planner/{straighten,straighten-run,photo,copy}.ts`, `components/planner/photo/{straighten-photo.ts,photo-dialog.tsx,
photo-dialog.module.css,size-fields.tsx,size-dialog.tsx}`, `components/planner/picture/{picture-dialog.tsx,picture-dialog.module.css}`,
`app/planner/photo-actions.ts`, `app/planner/plan-picture/[planId]/route.ts`, `drizzle/0101_floor_plan_photos_s28.sql`,
`drizzle/meta/0101_snapshot.json`, `scripts/planner/{floor-plan-photo,straighten-test}.mts`, `public/planner/demo/floor-plan-photo-waterway-sunrise.jpg`,
`design-source/verify/pending-modules/verify-pm2-s28.cjs` + `pm2-s28/*.png`, `steps/reg-S28.md`, this file.
Changed: `drizzle/meta/_journal.json`, `lib/db/schema.ts`, `lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `lib/planner/model.ts`,
`app/planner/actions.ts`, `lib/projects/create.ts`, `app/projects/ending-actions.ts`, `lib/leads/activity.ts`,
`components/planner/scene/three-view.tsx`, `components/planner/editor/{top-view,planner-editor,planner-topbar,panels}.tsx`,
`components/planner/editor/{panels,editor}.module.css`, `components/planner/{new-layout-dialog,project-layouts-dialog,planner-ghosts}.tsx`,
`components/planner/planner-ghosts.module.css`, `components/planner/home/planner-home.tsx`, `components/projects/floor-plan/{project-floor-plan,plan-canvas}.tsx`,
`components/leads/files/{files-grid,files-table,lead-files,file-viewer}.tsx`, `components/shell/tools-popover.tsx`,
`lib/global-search/model.ts`, `scripts/repair-demo-data.ts` (R119), `design-source/verify/parity-map-build/verify-pm-j.cjs`.

## For the next steps
- **S34 (real services):** an image model plugs in at two seams — the room reading (`roomsForType` / `startFromFloorPlan`'s `rooms`, which
  could also carry each room's place so `toPlace` arrives placed) and the photographic look (the Visualizer's `runPass` on the frame
  *Render in AI Visualizer* hands over; a one-press priced version would charge `render_photorealistic`, 15). A model paper finder with
  perspective correction replaces `findPaper` in `straighten-run.ts` step 1 (same contract: four corners in, the sheet out).
- **S35–S41 (AI sandboxes):** 1.0's `/tools/floorplan-3d-sandbox` and its route.
- **S41b / developers' list:** the planner's AI plan reading (TD-078).
- **The orchestrator:** a UAT step could follow Farah — Files › Floor plans › Make a 3D picture → place → Dollhouse → Save to Files; and
  the 1.0 → 2.0 map's row for Tools › Floorplan to 3D Isometric moves from *partial* to *built (picture by the planner)*.

## Flags for Vicky
- No mock: the dialog, the guide, the To place card and the picture dialog are on the house's pieces; every new word is *(invented copy)* in
  `reg-S28.md`.
- No credits here, and `render_photorealistic` (15) left unused (Decisions).
- Dollhouse framed from the front (1.0's), not the planner's corner iso.
- Personal first in *For* when opened from Tools.
- The planner's bar at ≤1024 (View as its icon, *Share*) — a fix of an overlap older than this step.
- One live plan per original at Won (earlier tries come put away).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock: the job is 1.0's tool (its steps, its two looks, its download, no charge);
   every new word flagged *(invented copy)* in `reg-S28.md`; the calls that change her earlier decisions (REG-1656's tile, the 768 bar) and the
   credits answer are flagged.
2. **One system, no one-offs** — the house Dialog (sheet on a phone), Dropzone, TextField, Chips, MetaChip, Switch `sm`, PortalMenu +
   DropdownItem, the snackbar with Undo, G's `PlanCanvas` scale tool, Files' own upload, the planner's ThreeView / presets / Arrange; no new
   token; the iso line's ghost drawn on the page's own classes.
3. **Plain words for studio people** — "Make a 3D picture", "Straightened by 7.0° and cleaned", "Drag over the Kitchen on the plan", "Not on
   this plan", "How big it is", "Dollhouse", "Top-down"; never "deskew", "underlay", "mm per pixel", "model" or "inventory" on screen.
4. **Nothing is lost** — the original photo is kept in Files with its bytes; one record from lead to project (same id, same address); a room
   taken off, a resize, the furnishing — each one Undo; earlier tries come put away, never deleted; a save that fails keeps the dialog open.
5. **Say why** — a refusal names the rule (Accounting, a lead you aren't on, a done project); the line under the picture says what the
   straightening did; the size line says what the plan then measures and when the outline didn't read; the picture says which rooms were
   furnished and why the photographic look lives elsewhere.
6. **Back returns where you came from** — every door opens the planner with `?from=` (Files, the viewer, the Floor plan tab, a lead, a
   project, Tools); *Save to Files › Open* carries it too.
7. **Every screen is whole** — no new page; the dialog shows its work ("Straightening the plan…"); the planner's empty state stays away while
   there is a list; the gallery's ghost now matches its isometric line (Δ 0); the ghost probes are green at 1440 and 390.
8. **Every width is designed** — checked at 1440, 768 touch, 390 touch and 320 (no sideways scroll): the dialog as a sheet, the scale canvas
   capped, the guide wrapping on a phone, the 768 bar fitting.
9. **Tables follow the leads listing** — no new table on screen; Files' grid and table take one menu item through their own model.
10. **Motion with purpose** — none added; the progress line is the real work, and the picture turns only under the studio's drag.
11. **Honest data** — the demo photo is backed by its file, folder, owner and time beside Farah's open task (R119, checks); nothing claims
    an AI read the plan ("Started from HDB 4-Room — the flat type on record") or drew the picture ("drawn from the layout"); no charge is
    claimed; a won lead's photo is carried by the writer and the repair alike.
12. **Reach for everyone** — every press a labelled button or menu item, keyboard reachable (Esc stops drawing; Place it, Not on this plan,
    Make the 3D picture are buttons); the ThreeView stage carries its label; the furnished note is a live region; the snackbars are the house's.

**How to add a missing thing:** one home (the 3-D Space Planner — its New ▾, its New layout card, its ⋮, its floor-plan card) and doors where
people already are (Tools' tile, Files' ⋮ on a floor plan, the Floor plan tab's ⋮, ⌘K Create, Maison AI) — no new page, no rail item; shown
only when it applies (the Files item only on a floor plan, *For* only when the door didn't say, the guide only while there is a list, *Save to
Files* only with a client); **one filled button** at a time (Next · Place the rooms · Place it / Make the 3D picture · Download); defaults
need no set-up (the flat type and the lead's area give the rooms and the size); AI honest (nothing calls a model; the stand-ins say what
they are).
