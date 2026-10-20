# S43C · The owner's new sample rooms in the AI Visualizer — outcome (2026-10-15, lane C)

Package S43C: the pending ledger's **F1-05** (`s42/pending-ledger.md`), on his "fix all the pending things" 2026-10-15 — every call taken
as recommended. Built in lane C (port 3175). Repair **R162** (R163…R169 unused). No migration. Register rows `steps/reg-S43C.md`
(REG-S43C.1…10). Probe `design-source/verify/pending-modules/verify-pm2-s43c.cjs` (**42 / 42**, no page errors); shots, region sheets and
side-by-sides in `design-source/verify/pending-modules/pm2-s43c/`.

## Ledger — every F1 item

| # | Item | Status | Where · how |
|---|---|---|---|
| F1-01 | Auto Fill is still a scripted stand-in | **not mine** — S43B (lane B) | — |
| F1-02 | Recreate from my quote "matches" a photo by its file name | **not mine** — S43B | — |
| F1-03 | The website's pictures still show 1.0's claims | **not mine** — S43B | — |
| F1-04 | October's money: the front door opens on a loss | **not mine** — S43B | — |
| **F1-05** | **The Visualizer fronts 1.0's old sample photos, though the owner's new ones exist** | **fixed** | below |
| F1-06 | A Hangout chat's End offers nothing to a lead on hold | **not mine** — S43B | — |
| F1-07 | The server never checks a stage's fields | **not mine** — S43B | — |
| F1-08 | The studio's own addresses ride to a client's browser | **not mine** — S43B | — |
| F1-09 | LEADS checklist D-42 | **not mine** — S43B | — |
| F1-10 | The AI credits balance can be stamped ahead of now | **not mine** — S43B | — |

### F1-05, part by part
| Part (the ledger's and my prompt's list) | Status | Where · how |
|---|---|---|
| The four pictures from 1.0's `4a51f3522` | **fixed** | `public/visualizer/samples/{living-room,bedroom,kitchen}/original.jpg` + `kitchen/sketch.jpg`, byte for byte (`git show 4a51f3522:…`, sha1 checked by the probe on disk and as served). The kitchen sketch is now the owner's line drawing **of the new kitchen photo** — Render from sketch and the photo are one room. |
| Each room's traced outlines / regions / surfaces | **fixed** — re-traced to the audit's bar | `lib/visualizer/sample-rooms/{living-room,bedroom,kitchen}.ts` (one file a room; `samples.ts` keeps the types + `SAMPLE_ROOMS`; `sample-rooms/shape.ts` the helpers). Living room 7 surfaces · 14 pieces, bedroom 5 · 13, kitchen 11 · 15; every piece in front cut out of what is behind it, see-through leaves keyed (`soft`), lamps / art / TV / plants with `parts`. Traced with a band-limited GrabCut round hand outlines, then read through the engine's own `regionOf` and fixed by eye (`pm2-s43c/regions-*.jpg`). The bedroom and kitchen were traced by two helper agents under one brief, checked here against the regions sheets. |
| The rooms' light (windows, fixtures) | **fixed** | each room file's `light` (`SAMPLE_LIGHT` in `lighting.ts` now reads them): the balcony door's glass, the bedroom's two panes, the kitchen's three; the downlights and the kitchen's LED strip. |
| Remove's `plate` · pieces' `parts` · `plane` · `rebuild` | **fixed** | the living room: every piece's `plate` (its shade with it), the rug's `plane` (weave laid in perspective), the sofa's chaise face rebuilt where the coffee table hid it, the olive tree's trunk + a pot where the sofa hid its planter (the photo never shows the real one — the coffee table's vase copied, said in the file), the vase's branches as `wisps` with a new `wispTones` ('dark' / 'olive' — branches darker than the wall, yellower than the TV's shade). Bedroom and kitchen: no plate (as 1.0's), so no `plate` / `rebuild` there. `scripts/viz/remove-test.mts` rewritten for the new room — 18 cases, **9 / 9** measured checks. |
| The empty plate (`living-room/defurnished.jpg`) | **fixed** — made from the photo itself | no image model, so the plate is made by rule — `scripts/viz/plate/plate.py` (+ `lib.py`, the outlines it reads `living-room-outlines.json`; Python 3 with numpy + opencv; reproduces the committed file): each wall filled from the wall around each piece (in its own plane), the curtains carried down their own folds, the balcony railing continued at its own spacing, the stone floor's light carried under the rug with its window reflections, the sun's beam and the stone's own figure quilted in. Because it IS the photo in the photo's light, the engine lays it as it is (`SampleRoom.plateLight: 'photo'` → `paste(…, { asIs })` in `engine/recolor.ts`). |
| The sample looks · demo renders | **fixed** | the five looks a room + the bedroom's golden hour are the engine's own restyle / relight of the photo (`scripts/viz/sample-looks.mts`, new) — a 1.0 render of the new photos doesn't exist (1.0 kept its old renders on purpose, its commit says so). The demo's edit + golden hour + swatches (`demo-renders.mts`), the welcome's after (`welcome-render.mts`), the trial's two afters (`trial-cards.mts`) made again on the new labels (`DEMO_EDIT` on the three cream walls + the stone floor + the bouclé sofa; the oak swatch now from the kitchen's oak uppers). |
| The welcome's before / after (REG-819) | **fixed** | `public/visualizer/welcome/living-room-after.jpg` — the owner's living room, "Mushroom walls · walnut floor · terracotta sofa" (words unchanged, still true). |
| The trial (S36 `/site/try`) | **fixed** | the hero compare, the six tool cards (Style · Materials · Lighting · Furniture · Defurnish · Sketch) all on the new pictures; probe + `verify-pm2-s36` green (see Probes). |
| The bench (S41 `/dev/ai-bench`) | **fixed** (nothing to change) | it reads `SAMPLE_ROOMS`; `scripts/viz/spatial-test.mts` **all passed** on the new readings (each room's camera read off its walls, pieces in front of walls, layers). |
| Make a 3D picture (S28) | **not affected** | it reads floor-plan photos, never the kitchen sketch (checked: no reader of `sketch.jpg` outside the Visualizer). |
| Stored demo records that pictured the old rooms | **fixed** — repair **R162** | (a) sample rooms' stored readings → the new ones (a studio's own additions kept; a redraw / hide kept only where the id still names the same thing); (b) Kevin Ng's versions + the showroom sketch list the new surfaces and pieces (a look its picks; `demoLook` · `demoEdit` shared with R61); (c) the client links' frozen copies; (d) the two pins moved onto the walnut floor and the emerald sofa (`VIZ_PINS`); (e) the swatch materials' hexes. Idempotent (second run: "already in step"); check "sample-room version listing a surface the room no longer has". R62 re-sized the filed renders on the first run (its own rule). |
| Market Insights' and Marketplace's pictures cut from the old photos | **kept** (with reason) | `public/market-insights/*`, `public/marketplace/*` were cut once from 1.0's earlier sample photos (stools, pendants, sofas the new photos don't have); they show rooms and products, never claim to be the samples — the generators' headers now say a re-run needs new boxes. |
| The lighting presets' thumbnails | **not affected** | `public/visualizer/lighting/*` are 1.0's own preset pictures of another room, not the samples. |

### What changed in the engine to make it true (and why)
- **A sample room's look is the engine's restyle, not a swapped-in picture** (`engine/run.ts` `restylePass` · `furnishPass` · `sketchPass`, the
  shared pick rule `restylePicks` in `lib/visualizer/materials.ts`): a 1.0 finished render of the new photos doesn't exist, and a picture of
  another room (the old renders) would be untrue. So a restyle on a sample room now lists its finishes, keeps the room's outlines (pick a finish or
  take a piece out on it), and is quotable — as on any photo. The Style card's picture is that very render.
- **The edited-version hint** (`style-panel.tsx`) now says what the engine does (REG-S43C.4 — it was already untrue for uploaded photos).
- **Kinds with accents** (`furniture.ts` `pieceKind` / `typeOf`): "Bouclé sofa" was read as "Boucl sofa" (an ASCII strip); accents are folded
  first. Also "pothos" / "canvas" keep their s, and stainless · steel · cast · iron · undermount are finish words — so the kitchen's captions
  read "Fridge", "Pothos plant", "Casserole", "Sink".

## Calls taken as recommended (his "fix all the pending things" 2026-10-15)
- **No 1.0 renders exist for the new photos → the engine makes the looks, the relit picture and the plate** (never the old renders over the new
  photos, never a model). Recorded in REG-S43C.3 / .5.
- **The drift guard's repair is no longer seen in the demo** — no sample look moves the camera now. Not staged with a look moved on purpose
  (that would be a fake fault); the repair is checked at engine level (`drift-test.mts` §4, on a look moved on purpose) and stays live for an
  image model (the seam). REG-S43C.8 — **for Vicky**: say if you want a demo moment for it.
- **The old room's names in probes / UAT** are updated as deliberate changes (below).

## Probes run (lane C, production build, :3175, scratch copies of `pbuild/base.db` migrated + repaired)
- `verify-pm2-s43c.cjs` **42 / 42**, no page errors (1440 · 390 touch · 320).
- Regression ids (`design-source/verify/regression/run.cjs`, RUN_DIR from `pbuild/base.db` + R162): `viz-client` 30/30 · `viz-sheets` 14/14 ·
  `rooms-menu` 10/10 · `cr-r3` 40/40 · `cr-r5` 16/16 · `ux-p7` 89/89 · `first-run-empty` 89/89 · `first-run-noleads` 5/5 · `first-run-full` 6/6 ·
  `viz-studio` 36/37 on the first build — it caught a real bug ("V5 · Boucl sofa taken out": `pieceKind` cut the word at the accent), fixed
  (`furniture.ts`) → **37/37** on the rebuild.
- Step probes on fresh copies, the rebuilt app: `verify-pm2-s43c` **42/42** · `verify-pm2-s20` **54/54** · `verify-pm2-s36` **109/109** ·
  `verify-pm2-s41` (bench, `OPENMAISON_DEV_PREVIEWS=1 BENCH=on`) **120/120** — no page errors in any.
- Harnesses: `remove-test.mts` 9/9 · `render-test.mts` 13/13 (rewritten for the new room) · `drift-test.mts` all passed · `spatial-test.mts`
  all passed · `wallpaper-test.mts` · `fallback-test.mts` · `regions.mts` (sheets banked).
- tsc clean · eslint 0 errors (16 warnings, none in my files) · `design:lint` holds.

Probes changed as deliberate changes (each commented "(pending modules S43C, a deliberate change …)"): `verify-cr-r3` · `verify-cr-r5` ·
`verify-viz-sheets` · `verify-viz-studio` (+ its scope count 3 → 4: the room has three walls) · `verify-pm2-s20` (labels; §3 the drift guard —
a restyle is checked and charges only the render; the last-10-credits case) · `verify-pm2-s36` · `ux-build P7` — "White Painted Back Wall" →
"Cream Painted Side Wall", "Grey Fabric Sofa" → "Cream Bouclé Sofa".

## Shared pieces changed
- `lib/visualizer/samples.ts` (types; the rooms moved to `lib/visualizer/sample-rooms/*`), `lib/visualizer/lighting.ts` (`SAMPLE_LIGHT` reads the
  room files), `lib/visualizer/engine/run.ts` (restyle · furnish · sketch passes; `strands` tones; the plate's light), `engine/recolor.ts`
  (`paste` `asIs`), `lib/visualizer/materials.ts` (`restylePicks`), `lib/visualizer/furniture.ts` (kind words), `lib/visualizer/demo.ts`,
  `components/visualizer/editor/panels/style-panel.tsx` (one hint), `scripts/repair-demo-data.ts` (R61 on the shared helpers; R162).
  No house piece (`components/om/*`), shell or globals touched.

## For the orchestrator / other packages
- **after-step**: base.db + local.db need `db:repair` (R162) and the baseline; the fixture's Visualizer rows change (readings, versions, link
  copies, pins, two hexes).
- **CLAUDE.md Map**: the sample rooms live in `lib/visualizer/sample-rooms/*` (one file a room); the looks and the relit picture are made by
  `scripts/viz/sample-looks.mts`, the living room's empty plate by `scripts/viz/plate/plate.py`; `SampleRoom.plateLight`, `wispTones`,
  `restylePicks`.
- **UAT**: `design-source/uat/story/ch13.json` updated (13 pieces, the new names) — rebuild the workbook's tab.
- **S43B / lane B**: nothing shared.

## What to check in the browser (Dane, 1440 and 390)
Tools › AI Visualizer › Kevin Ng: the living room (Surfaces › Walls lists three walls; Furniture 13 rows; Style cards are the room's own looks;
Generate a style — it lists its finishes; take the coffee table or the sofa out); the bedroom's Golden Hour; Showroom — kitchen concept (the
sketch, V1 the kitchen in Japandi); Add room's sample tiles; Kevin's link `/renders/<token>`; `/site/try` and its tool pages; the welcome on a
fresh studio.

## Principles check
1. **The mock wins, every exception written down** — no mock for the sample rooms; the owner's own photos are the source; every visible change is a register row (REG-S43C.1…10), invented names flagged.
2. **One system, no one-offs** — the rooms are readings on the existing model; the looks / relit / plate are made by the engine's own passes; one pick rule (`restylePicks`) for the engine and the demo records; no new UI.
3. **Plain words** — piece and surface names are the words a studio uses ("Cream bouclé sofa", "Oak veneer TV cabinet"); captions read the kind ("Sofa taken out"); the one changed hint says what happens.
4. **Nothing is lost** — a studio's own additions, redraws and hidden pieces on a sample room are kept wherever they still name the same thing (R162); Remove keeps Undo as before.
5. **Say why** — the bedroom / kitchen still say why Remove is off; the curtains say "This photo can't take it out — Customize it instead".
6. **Back returns where you came from** — not applicable (no navigation changed).
7. **Every screen is whole** — no page changed shape; the editor, the client link, the trial and the welcome checked with no page errors.
8. **Every width is designed** — 1440 · 390 touch · 320 checked (no sideways scroll on the editor, the Visualizer, the client link, `/site/try`); shots banked.
9. **Tables follow the leads listing** — not applicable.
10. **Motion with purpose** — not applicable (no motion changed).
11. **Honest data** — the reason for the package: no picture or record describes a room that isn't there; the demo's versions list what their pictures show (R162), the looks are what Generate makes, nothing pretends a 1.0 render; the drift guard's repair is not staged.
12. **Reach for everyone** — names and labels on every piece / square unchanged in kind (the squares keep their aria-labels, now the new names); keyboard paths unchanged.
