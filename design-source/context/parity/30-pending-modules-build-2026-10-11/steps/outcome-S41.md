# S41 · The AI sandboxes — outcome (2026-10-13, lane B)

Card: `studio:ai-sandboxes` ("AI model sandboxes (7 pages)", recommendation **skip** — "Developer test benches, not features a studio uses";
pending line "Outpaint, Reangle, Orbit video and Depth — experiments that only ever lived here"). Built in its right form, as the step's brief
set it: the seven benches are **accounted for, not ported** — each mapped to where 2.0 already does its job — and the four experiments that only
lived there are **built by rule on a developers' bench** (`/dev/ai-bench`, off in production unless `OPENMAISON_DEV_PREVIEWS=1`, linked from no
studio menu) with their **model seams in S34's registry**. Nothing a studio sees changes; two rule-based pieces that would help studios are
**proposed** below, not added to a studio page. **No model is called anywhere.**

1.0 read in full: `src/app/(main)/tools/{auto-furnish,detect,floorplan-3d,quote-template,relight,style-transfer,visualizer}-sandbox/page.tsx`,
`src/components/tools/{spatial-view-experiment,depth-parallax-viewer,frame-orbit-viewer,orbit-video-viewer}.tsx`, `src/lib/spatial/
pad-for-outpaint.ts`, `src/app/api/render/{outpaint,reangle,orbit-video,depth,detect-sandbox,floorplan-3d-sandbox}/route.ts`,
`src/lib/render/floorplan-scaffold.ts` (and the pipeline / inventory around it), the AI Visualizer inventory rows C-109…C-123 and the audit's
VO-07 · VO-08 · VT-04. Register rows: `steps/reg-S41.md` (REG-S41.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s41.cjs`
(**120 / 120** on the open bench, **11 / 11** on a plain production build — the tallies below); harness `scripts/viz/spatial-test.mts`
(**all passed**); shots in `design-source/verify/pending-modules/pm2-s41/` (18).

## Pending lines ledger

| Line (the card's, word for word — then each of the seven pages and the four experiments) | Status | Where |
| --- | --- | --- |
| "Outpaint, Reangle, Orbit video and Depth — experiments that only ever lived here" | **built — by rule, on the developers' bench** (each a view of `/dev/ai-bench`, each with its seam) · **stand-in** for the model half of each (what only a model can do is said beside it, never faked) | the four rows below |
| Experiment · **Depth** (1.0: an image model painted a grey map, near white) | **built by rule** — `depthOf` reads every pixel's distance from the engine's camera and reading (floor / worktop / ceiling planes, uprights where they meet the floor, pieces where their foot does, the "pop-up" rule for what nobody read); Depth view: compare slider (photo · grey map), *What it read*, tiles, layers, Download PNG, any photo of your own. **Seam** `depth` | `lib/visualizer/spatial/depth.ts`, `components/dev/ai-bench/depth-section.tsx` |
| Experiment · **Reangle** (1.0: an image model redrew the room from six moves, or one montage) | **built by rule** — 1.0's six moves drawn from the photo's own pixels lifted to their depth (three.js), each against the photo under the compare slider; the live *Look around* (1.0's Drag mesh) with keys, Room depth, Trim edges, Fill the edges, Download this view (1.0's custom move by hand). **Stand-in:** what the photo never saw is stretched or cut — only a model invents it. **Seam** `reangle` | `lib/visualizer/spatial/moves.ts`, `components/dev/ai-bench/{look-section,depth-view}.tsx` |
| Experiment · **Orbit video** (1.0: fal.ai's Kling image-to-video, or six re-angled frames played back and forth) | **built by rule** — real clips recorded in the browser (MediaRecorder): the photo's room swinging ±8° in 6 s, a 3D layout's 12-second turn (the planner's own view, `spin`); play in place, Download. **Stand-in:** no invented far side of a photographed room. **Seam** `orbit-video` | `lib/visualizer/spatial/clip.ts`, `components/dev/ai-bench/clip-section.tsx`, `components/planner/scene/three-view.tsx` (`spin`) |
| Experiment · **Outpaint** (1.0: a padded canvas, a model painting more room into it) | **built by rule** — Mirror the edges, or 1.0's padded canvas itself, at 1.2 · 1.4 · 1.6×, the photo's edge marked, Download; Look around stands on it. **Stand-in:** nothing new is painted. **Seam** `outpaint` | `lib/visualizer/spatial/extend.ts`, `components/dev/ai-bench/extend-section.tsx` |
| Page · `/tools/auto-furnish-sandbox` | **mapped** — AI Visualizer › Furniture › Furnish the room (program, density, Leave out, direction, style; S20's drift guard) and the planner's *Start with furniture placed* / Arrange; harness `render-test` · `drift-test`; seam `image-model` (its note now names 1.0's pinned **catalogue picks**). **Kept:** the model bake-off, pinning products (a model's to draw), the "is it empty?" scan | bench map; `lib/services/registry.ts` |
| Page · `/tools/detect-sandbox` | **mapped** — the Visualizer's reading (curated sample readings, Walls · Floor · Ceiling by rule, Add / Draw a surface); on the bench: *Depth › What it read* draws a reading over its photo; harness `regions.mts` · `fallback-test.mts`; **new seam** `room-reading`. **Kept:** the four-model, centre-point vs bounding-box comparison | bench map; registry |
| Page · `/tools/floorplan-3d-sandbox` (the calibration bench) | **mapped** — S28's Make a 3D picture; harness `straighten-test` · `spatial-test`; seam `floor-plan-rooms`. **Built (found in 1.0):** its corner editor as *Plan corners* (four corners → one homography; proposed for Make a 3D picture). **Kept:** the AI redraw, prompts and prompt gym, style reference, soft scan, vectorize + scaffold (built natively by the planner) | `lib/planner/corners.ts`, `components/dev/ai-bench/corners-section.tsx` |
| Page · `/tools/quote-template-sandbox` (Owners only) | **mapped** — Company › Templates › Quotes (the template editor), the quote's Preview, every Download PDF through `printPaper()` / S34's `pdf` seam; probe `verify-tpl-parity.cjs`. **Kept:** BlockNote / Paged.js (2.0's own editor and renderer), its Owner-only gate (the editor's own rules) | bench map |
| Page · `/tools/relight-sandbox` | **mapped** — Visualizer › Lighting (1.0's production presets, knobs, fixtures, free preview, relight by rule); harness `render-test`; seam `image-model`. **Kept:** its four older presets (1.0's production list replaced them) | bench map |
| Page · `/tools/style-transfer-sandbox` | **mapped** — Visualizer › Style › Style transfer (roles, How far, What carries over, The room's shape, Keep unchanged; palettes by role, VT-04); seam `image-model`. **Kept:** the editable brief and the room survey (a model's readings), the A/B and the bake-off | bench map |
| Page · `/tools/visualizer-sandbox` (v2) | **mapped** — the AI Visualizer itself (REG-671…698); its Spatial View's four experiments are the bench's Depth · Look around · Orbit clip · Extend; seams `image-model` · `depth` · `reangle` · `outpaint` · `orbit-video`. **Kept:** its model picker and cost line | bench map |

## Found in 1.0, not on a card
- **The calibration bench's corner editor** ("Adjust paper corners", scanic's `createCornerEditor` + `extractDocument`) — **built** as *Plan corners*
  (REG-S41.7); S28 had recorded that a slanted photo keeps its perspective. **Proposed** for Make a 3D picture.
- **The spatial experiment's custom move** ("Or describe a custom move: e.g. orbit 30° right, lower camera") — **built** as Look around's
  *Download this view* (the move made by hand, kept as a still); words → a move would be a model's (or a rule list — not worth it for a bench).
- **1.0's "Invert depth" toggle** — not needed: 2.0's map is never inverted (it is computed, not painted).
- **For S41b:** 1.0's quote canvas **overridability** (`src/lib/quote-canva/resolve-props.ts`, the PropertyPanel's 🔒 per template knob: which
  properties a quote may override) — production 1.0 (the quote designer the Quote Template sandbox rehearsed); check it against 2.0's template ↔
  quote rules (REG-485…493 · 578…583) — not this card's module.
- **For S41b:** the sandbox routes' own APIs (`detect-sandbox`, `floorplan-3d-sandbox`'s `manifest` · `vectorize` · `improve-prompt` actions,
  `outpaint` · `reangle` · `orbit-video` · `depth`) — all model calls; each is accounted for by its seam above (no route ported: 2.0 calls no model).

## Decisions (as recommended — her "build all of them" 2026-10-11; the step's brief for the form)
1. **The form:** developer benches stay developers'. One page, `/dev/ai-bench`, in the shell; no rail item, Tools tile, Company section, ⌘K page,
   key or phone More row links it; a production build answers a real 404 unless `OPENMAISON_DEV_PREVIEWS=1` (S34's pattern, now one helper for
   both — `lib/services/dev-previews.ts`); never indexed; while shut its 404 carries no word of it (the gate is in the layout, the metadata says
   nothing).
2. **Each experiment decided by 1.0's code:** all four have an honest rule-based half — Depth (1.0's own route called its model map "approximate";
   the room's geometry gives a real one), Reangle and Orbit (1.0's own preferred faithful path was the depth mesh: "content is pixel-identical,
   only the viewpoint moves"), Outpaint (1.0's own padded canvas, filled by mirroring). What only a model can do — invent the hidden room, paint
   more of it — is a seam with its contract, and said on the page; no fake output.
3. **Nothing on a studio screen.** Two rule-based pieces are genuinely useful to studios and are **proposed for Vicky** (below), not added.
4. **1.0's sizes kept** for the six moves (15° · 1 m · 0.3 m + 4°) so a developer compares like with like; the clip's swing is 1.0's frames' arc
   (±8°, as their ±9…27° spread played in a ping-pong).
5. **No credits, no records:** nothing is charged (no model, and 1.0 charged nothing for the sandboxes); the bench saves nothing (probed: every
   table as found).

## Proposed for Vicky (not built on a studio page)
- **The planner's 3D picture → "Download a turning clip"** — the layout on a turntable, recorded in the browser (the bench's Orbit clip › A 3D layout;
  `ThreeView spin` + `recordCanvas` are ready). A short video a studio can send a client on WhatsApp.
- **Make a 3D picture → "Square it by its corners"** — the bench's Plan corners as an optional step after the straightening, for a plan photo
  taken at a slant (S28 takes out a turn only).

## What to check in the browser
- **Developers (`next dev`, or `OPENMAISON_DEV_PREVIEWS=1 next start`):** `/dev/ai-bench` — *1.0's seven*: the four experiment cards (Open it opens
  each), the seven sandboxes with their doors (each opens its 2.0 page with Back to the bench). *Depth*: Living room → the compare slider, *What it
  read*, Download; Kitchen; *Your photo* (`public/uat-files/sophia-living-room.jpg` → "the camera taken as the default"). *Look around*: drag, the
  arrow keys, 0, Back to the photo, Trim edges, Fill the edges, Room depth, Download this view, *Draw the six moves*, pick Step back. *Orbit clip*:
  Turn it, Record a 6-second clip, play it, Download; A 3D layout → Isometric → Record one turn. *Extend*: both ways, 1.6×, Download. *Plan
  corners*: drag a corner, arrow keys, cross two corners (refused), Start again, Square it, Clean it, Download. *Seams*. At 1440 and 390 (the 3D
  views drag with a finger; the page never scrolls sideways at 390 / 320).
- **Studio people (every role — View as):** nothing changes. A plain production build: `/dev/ai-bench` is a 404.

## Probes run (lane B, port 3170, `next start` on fresh scratch copies of base.db migrated + repaired; tsc · eslint (0 errors) · design:lint hold)
- `pending-modules/verify-pm2-s41.cjs` — **120 / 120** with `OPENMAISON_DEV_PREVIEWS=1` (`BENCH=on`); **11 / 11** on a plain build (`BENCH=off`:
  404s that name nothing, the email preview shut by the same gate, no menu links, the DB as found). Ghosts land where the pages do on all seven
  views at 1440 and 390 touch; no sideways scroll at 390 · 320 · 768 touch; no page errors.
- `scripts/viz/spatial-test.mts` — all passed (depth on the three sample rooms and a photo nobody traced, the mesh, the moves, the extended canvas,
  the corners on the demo plan photo); `scripts/viz/render-test.mts` — all checks passed (the engine export).
- Touched probes, each on a fresh copy with a plain server: `pm2-s34` **162 / 162** (incl. its in-process seams half: every registry seam in its
  file, `services.md` names every key, the slots still eleven), `pm2-s20` **58 / 58**, `pm2-s28` **98 / 98**, `pm2-s15` **33 / 33**.

## Migration · repair
- **No migration, no repair** (R146 still free in lane B): the bench reads the Visualizer's sample rooms and the planner's examples (code), keeps
  nothing.

## Shared pieces changed
- `components/planner/scene/three-view.tsx` — optional `spin` (seconds per turn; unset in every studio view, so nothing changes there).
- `lib/visualizer/engine/texture.ts` — `squareToQuad` · `invert3` exported (no behaviour change).
- `app/api/dev/email-preview/route.ts` — reads `devPreviewsOpen()` (same rule as before); `.env.example` — the flag's comment names the bench.
- `lib/services/registry.ts` + `design-source/context/parity/30-…/services.md` — five seams, image-model's note, the bench's address row.
- No `components/om/*`, shell layout or `app/globals.css` change; `design:lint` holds (no baseline raised).

## For the next steps
- **S41b:** the two *Found in 1.0* items above (quote canvas overridability; the sandbox routes, accounted for by their seams).
- **The orchestrator / CLAUDE.md's Map:** *The AI sandboxes (pending modules S41)* — `/dev/ai-bench` (`app/dev/ai-bench/*`,
  `components/dev/ai-bench/*`, `lib/dev/ai-benches.ts`), `lib/visualizer/spatial/{depth,moves,extend,clip}.ts`, `lib/planner/corners.ts`,
  `lib/services/dev-previews.ts`, harness `scripts/viz/spatial-test.mts`; the gate `OPENMAISON_DEV_PREVIEWS=1`. **Never link the bench from a
  studio menu** (the probe scans for it).
- **S42:** the two proposals above wait for Vicky; nothing else.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock; a developers' page only, logged as invented UI and copy (REG-S41.2…7); nothing a
   studio sees changes; the two studio-facing ideas are proposals for Vicky, not built.
2. **One system, no one-offs** — the shell, the L1 header, house Chips / ChipRail / StatTiles / CompareSlider / DS Button and Switch, Settings'
   cards and switch rows, the read-only note's tint, the Visualizer's slider, the house categorical palette, the planner's own `ThreeView`, the
   engine's own camera, reading and homography, S28's paper finder and cleaning, S34's registry; tokens only; page and ghost read the same words
   (`VIEW_COPY`).
3. **Plain words** — "Depth", "Look around", "Draw the six moves", "Square it", "Nothing new is painted"; the code names stay on the Seams view and
   in services.md, where developers read them.
4. **Nothing is lost** — every 1.0 sandbox and every experiment is accounted for (built, mapped, or kept with its reason); the bench writes nothing,
   so there is nothing to undo; Start the corners again and Back to the photo put things back.
5. **Say why** — refused files ("Pick a JPG, PNG or WebP photo."), a crossed quad, a browser that can't record, the default camera, the gaps a
   big move opens — each said in place; a disabled press has its reason beside it.
6. **Back returns where you came from** — every door to a 2.0 page carries `?from=/dev/ai-bench`; the open view lives in the address.
7. **Every screen is whole** — the shell, its own ghost (loading.tsx and PageReveal draw the same one, probed on all seven views at 1440 and 390),
   an error page (RouteError), a wait line while a room is read, nothing empty without words.
8. **Every width is designed** — the views' chips rail, rows that wrap, the facts and terms stacking at ≤767, the 3D views and pictures keeping the
   photo's shape; no sideways scroll at 390 · 320 · 768 (probed against `screen.width`).
9. **Tables follow the leads listing** — no table (the layers are a list of rows; the seams a definition list).
10. **Motion with purpose** — the only motion is the content (a turning view, a recorded clip), started by a press; the spinner honours reduced
    motion (the Visualizer's own class).
11. **Honest data** — no model, no fake output: every picture is computed from the photo by a rule the page names; the demo's records untouched.
12. **Reach for everyone** — the 3D view is a named, focusable image with keys (arrows, + / −, 0) and its keys said under it; corners are named
    buttons moved by the arrow keys; compare sliders and chips are the house's keyboard pieces; every icon button has a label.
- **How to add a missing thing** — one home (one developers' page; the studio's own homes mapped, not copied); shown only when it applies (not at
  all to a studio; only with the flag in production); one filled button per card (Draw the six moves · Record · Square it); defaults that need no
  set-up (the living room, read on arrival; the flag off by default).
