# S15 · 3-D Space Planner leftovers — outcome (2026-10-12)

Card: `held:space-planner` (recommendation *build*, effort S — "Only the elevation lines and the dead AI suggestions are worth doing now";
no questions). Carried notes taken: **S07** — a lead's layouts are the lead's until Won (untouched: the elevation reads whatever layout is open;
pm2-s07 re-run green); **S10** — the Planner hosts the shared `MaisonAiSheet` and its suggestions act ("Open the kitchen to the living room"
became "How big is each room?"); the card's last line is S10's work, checked again here; **S28** keeps the floor-plan photo → 3-D picture.
1.0 read: `src/components/floor-plan/ElevationDrawing.tsx` (the reference heights `H` — COUNTER 0.85 · UPPER_CAB_BOTTOM 1.45 · UPPER_CAB_TOP 2.25 ·
SWITCH 1.2 · SOCKET 0.3 · MIRROR 1.5 · TOWEL_BAR 1.1; it drew the counter and upper-cabinet lines on a kitchen wall — a room named kitchen or an
appliance against it — and the mirror on a bathroom's, in its accent `#5500FF`, with a datum ruler on the left; doors and windows labelled
D1 / W1 with their size, sill and head), `FloorPlanEditor.tsx` `handleElevationPreset` (*Kitchen Elevation* = the kitchen's longest wall,
*Wardrobe Elevation* = the wall with the most wardrobes), `RenderTourDialog.tsx` (several captures sent to the image model), `Scene3D.tsx`
(`hdMode` = GLB models, `sunAngle` · `sunTimeOfDay`), `src/data/floor-plan-furniture.ts` (394 definitions, each with a GLB). Register rows:
`steps/reg-S15.md` (REG-S15.1…5). Probe: `design-source/verify/pending-modules/verify-pm2-s15.cjs` (**33 / 33**); shots banked in
`design-source/verify/pending-modules/pm2-s15/`.

## Per pending line

| Card line | Result | Where |
| --- | --- | --- |
| **Elevations' reference lines (counter, cabinets, sockets)** — partial · revisit: cheap and useful for briefing carpenters | **Built.** 1.0's heights as dashed lines across a standing wall in the primary colour, under the doors, windows and pieces, the upper cabinets as a band, each with its short words right of the wall ("Counter 85", "Cabinets 145–225", "Switches 120", "Sockets 30", "Mirror 150"), nudged apart so none overlaps. A kitchen wall: counter + upper cabinets + switches + sockets; a bathroom wall: the mirror alone; every other standing wall: switches + sockets; an open side: none. **Show the usual heights** (sm switch, on) takes them away and gives the drawing its width back; the PNG carries what is on screen; a line under the drawing names them ("… Check them on site."). With it, 1.0's *Kitchen / Wardrobe Elevation* presets as the panel's first wall (the built-ins' wall, else the most furniture's, else the longest — REG-1654's rule changed on purpose), and the list walks the wall left to right with its doors and windows ("Window · 120 wide · 120 high · 90 off the floor"). A second Download replaces its snackbar in place | `lib/planner/elevation.ts` (`REFERENCE_HEIGHTS` · `referenceLinesOf` · `referenceText` · `firstWallOf`, pure), `components/planner/editor/elevation-panel.tsx` (+ `.module.css`: `.switchRow` composes the planner panels', `.band` · `.ref` · `.refWords` · `.refText`) |
| Start a layout from a room photo — held (J-Q20) · keep | **Kept** — the AI Visualizer works on photos; the planner hands its 3D view to it (REG-1658); a floor-plan photo → 3-D picture is S28's | — |
| AI furniture from a photo or catalogue page, AI auto-arrange, the isometric as an AI picture — stand-ins · keep | **Kept** — the rule-built stand-ins stay (Describe a piece's word table REG-1657, Arrange's furnishing rule REG-1653, the true isometric REG-1656); a 3D model or an image from a picture is the developers' (a model) | — |
| Render Tour; Present's HD mode, sun angle and time of day — not built (P-J) · keep | **Kept not built** — a tour is several image-model renders (the Visualizer's Generate renders one at a time, priced); HD was 1.0's GLB models, which 2.0 doesn't load; Present's low walls stand in for the light | — |
| Storeys stacked in 3D — partial · keep | **Kept** — one level at a time with the level switch (REG-1649), as 1.0's floor tabs | — |
| 1.0's ~390 furniture models (2.0 has 42 sized pieces) — later content work (J-Q7) | **Kept** for the content port — 1.0's 394 definitions (`src/data/floor-plan-furniture.ts`) each lean on a GLB model; 2.0's catalogue is 42 parametric pieces (`lib/planner/catalogue.ts`), where a port would add keys with a shape, a size and words | — |
| The editor's Maison AI suggestions answer Coming soon · revisit | **Built in S10** (REG-1786), **checked here**: three suggestions, none answers Coming soon; *How big is each room?* lists every room with its size and a row picks it; *Which pieces overlap?* answers from the plan; *Furnish the {room}* is shown first with one button, Arrange it changes the plan, the editor's Undo puts back exactly what was there | — |
| (found) every DS Switch in a labelled row, and every row wrapping a DS control in its own label, was misplaced on a phone or a touch tablet | **Fixed at the root** (REG-S15.4) — the house touch rule now takes the control's own label only, and a switch's 44 target gives back what its 40 × 20 track doesn't fill; desktop unchanged (a mouse never sees the rule). Measured on the editor's elevation, Your profile, Settings › Notifications (40 switches), Company › Questionnaire (22), the quote editor (3), New layout: every track inside the screen and clear of its words. With it, the ghost kit's switch bone takes the track's true 40 × 20 (it was 32 wide), so a ghost's words beside a switch wrap as the page's — Your profile's consent row at 390 had become one line taller than its ghost (pm2-s01's ghost check caught it; green again) | `app/globals.css`, `components/shell/ghost-kit.module.css` |

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **The card's own line**: build the elevation lines and re-check the AI suggestions; keep the rest as each line says.
- **1.0's numbers, no new ones**: counter 85, upper cabinets 145–225, switches 120, sockets 30, mirror 150 (1.0's `H`). The catalogue's counter
  stands 90 high (1.0's counter was 0.9 too) — the line is the usual height to work to, the piece is what is drawn; the list says each.
- **Which wall gets which**: 1.0's two rules (a kitchen by its name or an appliance; a bathroom by its name) read through 2.0's room kinds and
  pieces; switches and sockets — which 1.0 named but only showed on its datum ruler — on every other standing wall (the card's "sockets"); none
  in a bathroom (they sit outside a Singapore bathroom).
- **A switch, on by default** — the lines help most when briefing; a clean picture for a client is one press away. Not remembered across visits.
- **The first wall follows the built-ins** (1.0's two presets as one rule) — a deliberate change of REG-1654's "the longest standing wall first",
  which stays the last resort.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Tools › 3-D Space Planner › *Showroom — HDB 4-Room* › Rooms › Kitchen › ⋮ › Wall elevations… → the Top wall (the
  counter's), dashed lines at 30 · 85 · 120 and the cabinets' band 145–225 with their words right of the wall, the legend under it, the list
  "Kitchen counter · Window · Fridge"; Show the usual heights off → the drawing alone, wider; Download PNG both ways. Left wall → the same
  heights. Bathroom → its vanity's wall, "Mirror 150" alone. Master bedroom → its wardrobe's wall (Left), switches and sockets. Store → its
  longest wall, empty. Living / Dining › Bottom (open) → no lines, no switch. Maison AI ✦ → How big is each room? · Which pieces overlap? ·
  Furnish the master bedroom (Arrange it, then Undo).
- **Alex or Germaine (Designer) on Dane's layout:** read-only — the elevation, its heights and Download PNG are theirs too.
- **390 / 320:** dock › Rooms › Kitchen › Details › ⋮ › Wall elevations… → the sheet, the switch left-aligned with its words clear, the drawing
  and its words inside the screen; Settings › Notifications and New layout's *Start with furniture placed* — the switches sit inside their rows.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair, no new migration or repair) with `next start -p 3160`;
:3160 stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 16 warnings are older files') ·
`npm run design:lint` nothing new · `npx next build` green · `npm run design:anatomy` (on the scratch `next start`, :3160): all 1578 measures hold.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s15.cjs`** (this step, 6 sections) | **33 / 33** — twice; the page error log empty; a full `.dump` of the scratch DB before and after a run is identical |
| `projects/verify-pj-gap-j.cjs` (the planner as built) | 55 / 55 |
| `parity-map-build/verify-pm-j.cjs` (View ▾, levels, versions, templates, examples, Arrange, the elevation's PNG) | 53 / 53 (twice — before and after the snackbar key) |
| `pending-modules/verify-pm2-s07.cjs` (a lead's layouts) · `verify-pm2-s10.cjs` (Maison AI everywhere, the planner's sheet) · `verify-pm2-s13.cjs` (the portal's Designs) | 89 / 89 · 107 / 107 · 65 / 65 |
| `pending-modules/verify-pm2-s01.cjs` (Your profile's ghost at 390 — the touch fix) · `verify-pm2-s03.cjs` (the consent switch) · `verify-pm2-s14.cjs` | 79 / 79 (78 / 79 before the ghost bone's width was fixed) · 79 / 79 · 69 / 69 |
| `global-search/verify-search` · `consistency/verify-overlays` · `settings-parity/verify-st-r1` (through `regression/run.cjs` on :3160) | 27 / 27 · 67 / 67 · 57 / 57 |
| `ghosts/verify-ghosts-same` 1440 · 390 touch · `verify-ghosts-measure` (Members) | 51 / 51 · 51 / 51 · Δ 0 on every row |

No existing assertion was changed.

## Migration and repair
None — no new table or column; repair R116 is still the last R number used (R117 free).

## For the next steps
- **S17 (consistency):** measured on the way (both before and after this step's touch fix, so not this step's): at 390 touch the ghosts of
  Settings › Notifications (the channel switches sit at 58 in the ghost, 88–117 on the page, after their words), Company › Members (the cards
  drift 50–570px down the page), Company › Profile (~70–170px) and Settings › Lead management (~30–110px) don't follow their pages' phone
  layout; at 1440 they hold. `ghosts-same` compares loader with reveal only, so it can't see it.
- **S16 / S17:** the house touch rule (`app/globals.css`, REG-273) now matches a control's own label only; S14's local `.consentRow.consentRow`
  override in `components/profile/your-profile.module.css` is now redundant (harmless — left in place). Any new row that wraps a DS Switch or
  Checkbox in a `<label>` needs nothing of its own on touch.
- **S28 (floor-plan photo → a 3D picture):** the planner's Render in AI Visualizer path (REG-1658) and `?view=iso` are the doors to reuse.
- **The developers (furniture content):** a 1.0 piece joins `CATALOGUE` in `lib/planner/catalogue.ts` as a key, a parametric `shape`, its
  W × D × H in cm and its search words — `referenceLinesOf` reads the shape (counter / island / tall / fridge make a wall a kitchen's; a vanity a
  bathroom's) and `firstWallOf` the built-in shapes (wardrobe · counter · tall · fridge · vanity · shelf · tv · washer).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the elevation (REG-1654 was built without one); the lines are 1.0's, drawn on
   2.0's drawing; every invented word in REG-S15.1…3.
2. **One system, no one-offs** — the house Drawer (a sheet on a phone), Chips, the DS sm Switch in the planner panels' switch row (composed,
   not copied), the house snackbar (`key` replaces in place), tokens only (primary, its variant, the caption type); `design:lint` holds. The
   touch fix is made once, in the house rule, for every row.
3. **Plain words** — "Show the usual heights", "Counter 85", "Cabinets 145–225", "Switches 120", "Sockets 30", "Mirror 150", "Dashed: the
   usual heights to work to — … Check them on site.", "Window · 120 wide · 120 high · 90 off the floor".
4. **Nothing is lost** — read-only drawing; the switch only hides lines; every 1.0 height that drew is drawn; the kept lines are written down
   with where each lives.
5. **Say why** — an open side shows no switch (nothing to mark); the legend says the heights are the usual ones to check on site.
6. **Back returns where you came from** — no new page; the panel closes back to the room picked.
7. **Every screen is whole** — no new page or ghost; the panel's empty line stays ("Nothing stands against this wall yet …"); the ghost kit's
   switch bone now has the switch's true width, so ghosts beside a switch wrap as their page (Your profile at 390 green again).
8. **Every width is designed** — 1440 · 1024 · 768 touch · 390 · 320 shot and measured (the drawing and its words inside the screen, no sideways
   scroll against `screen.width`); the touch rule fixed for touch tablets too.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — none added.
11. **Honest data** — every line is a rule over the room's kind and the pieces on record; no new state to back (no repair needed); the PNG is
    what is on screen.
12. **Reach for everyone** — the switch is labelled; the drawing's accessible name lists the heights it shows; the list names doors, windows
    and pieces in order; contrast from the tokens (primary on the wall's surface).
- **How to add a missing thing** — one home (the wall's own elevation panel, no new page or menu row); shown only when it applies (heights on a
  standing wall only, the switch only with them); no filled button added; defaults need no set-up (on, by rule).
