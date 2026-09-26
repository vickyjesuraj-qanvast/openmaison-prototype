# OpenMaison 1.0 — AI Visualizer inventory · Slice D: the phone shell, the engine's rules and the routes

1.0 repo `qanvast-id-tool` · branch `integ/security-non-qanvast` · commit `67f42e469` · read 2026-09-25 (read-only; nothing run) · reader D. All paths are under `/Users/vicky/Documents/GitHub/qanvast-id-tool`. Rows cite `path:line`. Words the screen or the model is given are quoted verbatim in *italics*; `…` inside a string is the code's own ellipsis.

## Abbreviations

| Code | File |
|---|---|
| MSH | `src/components/projects/visualizer-mobile-shell.tsx` (579 lines, read whole) |
| MS | `src/components/projects/visualizer-material-sheet.tsx` (326, whole) — MaterialBrowser · MaterialPickerSheet · AddItemDialog |
| VZ | `src/components/projects/visualizer.tsx` (the editor; B and C own it — opened here only where the phone shell is wired) |
| MQ | `src/hooks/use-media-query.ts` |
| T-msh · T-touch · T-ms | `src/__tests__/visualizer-mobile-shell.test.tsx` · `visualizer-touch-affordance-guard.test.ts` · `visualizer-material-sheet.test.tsx` |
| RP | `src/lib/render/restyle-prompt.ts` |
| AFP | `src/lib/auto-furnish-prompt.ts` |
| STP | `src/lib/style-transfer-prompt.ts` |
| DET · SEG · DEC · PHO · GEN · CT | `src/lib/render/core/{detect,segment,declutter,photorealistic,generate}-core.ts` · `core/types.ts` |
| DG · RD | `src/lib/visualizer/drift-guard.ts` · `src/lib/render-drift.ts` |
| RC | `src/components/projects/relight-controls.tsx` |
| NI · CB · CI · MARK | `src/lib/normalize-image.ts` · `src/lib/crop-to-bucket-aspect.ts` · `src/lib/compress-image.ts` · `src/lib/render/openmaison-mark.ts` |
| API/… | `src/app/api/…/route.ts` (e.g. `API/render/detect` = `src/app/api/render/detect/route.ts`; `API/render` = the surgical route `src/app/api/render/route.ts`) |
| SMQ · CMD | `src/lib/queries/studio-materials.ts` · `src/components/projects/custom-material-upload-dialog.tsx` |
| SBX/… | `src/app/(main)/tools/…-sandbox/page.tsx` |

## Vocabulary (this slice; words B and C define are used as they define them)

- **Phone shell** — the ≤ 1023 px layout of the editor: top bar · canvas · tray · dock · Generate bar (MSH:15-27). Live when `(max-width: 1023.98px)` (MQ:24); CSS decides the layout, JS only side effects.
- **Mode / dock** — `MobileMode = surfaces | furniture | style | lighting | tools` (MSH:29); the dock is the five-tab switcher; the mode is DERIVED from the desktop's open tile (anything not one of the four tiles = *Tools*) (VZ:4680-4681).
- **Tray** — the active mode's primary picker, always on screen above the dock (Surfaces · Furniture · Style · Lighting · Tools trays, MSH:131-363).
- **Level two / More** — the bottom *Controls* sheet holding the desktop panel bodies, opened by a tray's more chip (*All materials* · *Describe* · *Finish & colour* · *More* · *Style transfer* · *Fine-tune*) (VZ:4773, B-113).
- **Surface chip (phone)** — one chip per EXACT surface label, *×N* for repeats (VZ:4691-4708) — not the desktop's structural groups.
- **Swatch row** — the tray's ≤ 12 quick materials for the selected label, between *None* and *All materials* (VZ:4709-4729).
- **Pending change count** — style + style reference + materials assigned + furniture groups changed + lighting + finishing note; the phone Generate label counts it (VZ:4687-4689).
- **Recolour** — the phone word for the furniture *customize* action (MSH:263); the engine calls it *RECOLOR/REMATERIAL* (GEN:213).
- **As shot** — the phone Lighting tray's "no lighting change" tile (MSH:322).
- **Versions pill / Versions sheet / Rooms sheet** — the phone's way to the gallery (*V{n} · {count}*) and to room switching (MSH:117-125, 457-579).
- **Material picker (phone) / Your library / This session** — the 92 % sheet over `MaterialBrowser` (MS:237-279); *Your library* = session uploads (*This session*) + the studio swatch library; brand catalogues = *Gush Paints*, *Gush Enamel* (VZ:4781-4784).
- **Core / `CoreResult`** — a framework-free render function returning `{ ok, data }` or `{ ok:false, status, error }`, shared by the studio routes and the anonymous trial routes (CT:1-21).
- **Dry run** — `DRY_RUN` (always false in code) OR no `OPENROUTER_API_KEY`: every model route answers with a canned or echoed result instead of calling a model (D-116).
- **Aspect snap / bucket** — the seven supported output ratios 16:9 · 3:2 · 4:3 · 1:1 · 3:4 · 2:3 · 9:16 (server thresholds GEN:87-99; client centre-crop to the nearest, CB:15-33).
- **Change list** — the surgical prompt's numbered *CHANGE n of N* items, furniture first then surfaces (GEN:111-231).
- **Preserved furniture / preserved surfaces / style-ambient surfaces** — kept pieces, surfaces left at None (pixel-faithful), and detected surfaces with no pick that only take a subtle style palette shift (GEN:59-63, 233-264).
- **Reference (image) / roster** — a user upload attached to a render as REFERENCE IMAGE n (room = 1): a material sample or a desired furniture piece (`CustomRef.kind`), listed in the *REFERENCE ROSTER* (GEN:17-24, 266-284).
- **Lighting knobs / fixtures / preset** — sun angle · colour temperature · intensity · shadows + four tri-state fixtures; the product's six presets (RC:32-39); other tables exist only in the relight route (dead) and the sandboxes (D-62, D-122, D-125).
- **Room program** — Auto Furnish's per-room-type *essential* / *optional* / *preserve* / *layout* lists, ten of them (AFP:45-173); **density** *Minimal* · *Balanced* · *Fully furnished* (AFP:182-186).
- **Absolute rules / spatial rules / self-check** — the shared placement blocks: FORM IS FROZEN · DOORS STAY CLEAR · THE CAMERA DOES NOT MOVE; the PLACEMENT physics; the closing CHECK (`placement-rules.ts`).
- **Room survey (room notes)** — a text model's read of openings, circulation, fixed services, partitions, primary zone, dimensions and wall space (STP:54-81, 193-285); **emptiness report** — *empty* / *partly furnished* / *furnished* + a room-type guess (AFP:325-365).
- **Style spec / brief** — the structured aesthetic read from reference images (name, summary, palette hex + role, materials, finishes, furniture language, lighting, decor, avoid) (STP:20-52); **aspects** (palette · materials · furniture · lighting · decor), **strength** (hint · balanced · full), **geometry lock** (locked · structural · flexible), **reference role** (overall · palette · materials · furniture · lighting) (STP:83-128).
- **Drift / violation / severity / score** — an objective fault in a render (structure · opening · physics · scale · access · scope), *blocking* or *warning*, scored blocking × 10 + warning × 1; **repair** = a corrective render that keeps the look (RD:15-180; DG).
- **Defurnish scope** — *joinery* (strip to a bare shell, the default) or *keep-builtins* (DEC:25-37).
- **Mask / fill ratio** — a segmentation mask per surface label (SEG); a mask whose white fill is under 8 % is treated as a failed segmentation (T-mask).
- **Swatch library vs Material Catalog** — `studio_materials` (uploaded texture swatches for the visualizer, SMQ) vs `studio_material_catalog` (sellable products with vendor and price, managed in Accounts) (D-117…D-121).
- **Sandbox** — an internal `/tools/*-sandbox` page benchmarking models or flows; URL-only (D-122…D-126).
- **Watermark / trial quota** — the OpenMaison mark stamped on anonymous-trial outputs, and the signed `om_trial_v1` cookie counting 3 generations (D-85).

## Overview / map

**The phone shell** (`visualizer-mobile-shell.tsx`, `visualizer-material-sheet.tsx`) is a set of presentational components the editor mounts inside `lg:hidden` blocks, fed from the same state and mutations as the desktop rail: a top bar (back, the room pill that opens the Rooms sheet, the versions pill that opens the Versions sheet, and a ⋯ menu), one tray per mode, a five-tab dock whose mode is derived from the desktop's open tile, and a Generate bar that counts pending changes and offers 1–3 variants. Anything deeper — descriptions, fine-tuning, Style Transfer, Defurnish, Auto Furnish, finishing — opens the level-two Controls sheet, which is the desktop panels in a bottom sheet; materials open their own picker sheet ordered "by usefulness". The anonymous trial reuses the same components. The phone's Generate calls the intent router (`handleGenerate`), never the desktop's primary-action switch — which is why Defurnish carries its own phone-only button and Auto Furnish has no run control on a phone.

**The engine** is a family of stateless routes under `/api/render/*`, each a thin frame (session cookie, per-IP rate limit, validation, model allowlist, dry run) around a prompt builder. Detection (`gemini-3-flash-preview`) returns positioned surfaces and furniture plus a photo / sketch classification and never fails on the model side; segmentation returns masks for surface-only renders; the surgical render turns the user's picks into a numbered change list with explicit preserve lists, reference rosters and a final checklist, fanning variants out in parallel; restyle / sketch render, Style Transfer (two stages: a style brief, then the render), Auto Furnish (room programs + placement rules + detection anchors), Relight and Defurnish each have their own prompt; the drift guard verifies whole-room passes with a cheap judge and repairs blocking faults up to twice, keeping whichever candidate scores best. Rooms, jobs and the landing's workspace are written through separate studio-scoped CRUD routes (`/api/projects/rooms`, `/api/renders/jobs`, `/api/visualizer/workspace`) — the model routes themselves never touch the database. With no OpenRouter key every model route simulates (echoes the input or returns a canned sample), which is the contract a 2.0 simulation can copy (D-116). Around the edges sit the studio's swatch library (uploaded from the editor only, unmanaged elsewhere), a separate product Material Catalog in Accounts that only a sandbox feeds into renders, five URL-only sandboxes that each keep rules and presets found nowhere else, and the trial's watermark.


---

## D1 · The phone shell (≤ 1023 px)

B already records the data the editor hands the shell (B-33 rooms, B-74 swatch row, B-84 furniture chips, B-100 lighting tray, B-113 the level-two Controls sheet, B-114 mode mapping + badges, B-115 tools, B-118 the ⋯ menu, B-126 the touch guard) and the material picker's outline (B-73) and the add dialog (B-52). The rows below are the shell's own anatomy, states, rules and every word, plus what B left out.

### D-01 · The phone layout model ("camera-app", direction A)
- Where: MSH:15-27 (design note), VZ:4677-4686, VZ:4800-4829 (top bar mount), VZ:5252-5347 (tray · dock · generate mount), VZ:5767-5825 (sheets)
- Entry: any viewport below `lg` (the whole shell is inside `lg:hidden`; desktop keeps the rail + gallery strip)
- Does: five stacked bands, top to bottom: **top bar** (back · room switcher · versions · ⋯) → **canvas** (photo fills the width, only the active mode's markers) → **tray** (the active mode's primary picker, always on screen) → **dock** (Surfaces · Furniture · Style · Lighting · Tools) → **generate** (the persistent primary action). "More" on a tray opens the level-two bottom Sheet (the desktop panel bodies, B-113).
- Rules: the shell is presentational only — "data in, callbacks out"; the editor keeps the state and passes the SAME mutations the desktop rail uses "so the two never drift" (MSH:24-26). Dated 2026-09-13 in the code.
- Data: none of its own. `MobileMode = "surfaces" | "furniture" | "style" | "lighting" | "tools"` (MSH:29).
- States: —
- Words: —
- Reachable: yes (≤ lg)

### D-02 · Which layout is live (`useMediaQuery`, `useIsBelowLg`, `useCoarsePointer`)
- Where: MQ:1-32; used at VZ:1275-1277
- Entry: —
- Does: a generic SSR-safe `useMediaQuery(query)` on `useSyncExternalStore` (subscribes to `matchMedia(...).addEventListener("change")`). Two named queries: `BELOW_LG_QUERY = "(max-width: 1023.98px)"` ("where the app shows the bottom nav instead of the sidebar") and `(pointer: coarse)` ("Primary input is a finger … Used to swap "Click" → "Tap" copy").
- Rules: returns `false` on the server AND on the first client render (so hydration matches), then the live value — so for one frame a phone believes it is a desktop; layout itself is CSS (`lg:hidden` / `hidden lg:flex`), JS only decides side effects (e.g. `openMobilePanel` is a no-op when not `belowLg`, the Versions sheet auto-open). B-24 has the editor's use.
- Data: —
- States: —
- Words: —
- Reachable: yes

### D-03 · Top bar (`MobileTopBar`)
- Where: MSH:87-129; mount VZ:4801-4828
- Entry: always on screen below `lg`
- Does: left to right — **Back** (only when the host passes `onBack`, i.e. the AI Visualizer page; the project's Renders tab has none) · **room switcher pill** (room name + chevron; opens the Rooms sheet D-17) · spacer · **versions pill** (history icon, *{versionLabel} · {versionCount}*; opens the Versions sheet D-19) · **⋯ menu** (built by the editor; items in B-118).
- Rules: the room pill reads the active room's name; with no active room it reads *Room* when rooms exist, else *No room yet*; the pill's look changes when there are no rooms. The pill is capped at ~46 % of the width and truncates. The versions pill is hidden when `versionCount` is 0 (= no renders in the room; the Original does not count). `versionLabel` = *Original* when the Original is the editing base, *V{n}* for a render (numbered oldest-first across all jobs), *Version* when the key cannot be resolved (VZ:4756-4761). ⋯ menu rules (VZ:4816-4824): *Download this image* and *Full view* are disabled without an image; Download takes the selected sketch render if any, else the working image; *Full view* opens the View dialog on the working image alone (no before, no compare strip); *Share to portal* shows only on a project with the `tools/homeowner-portal` page enabled and is disabled while a share is running; *Change photo* only while the Original is the editing base.
- Data: —
- States: with / without rooms · with / without renders · Back present / absent.
- Words: aria *Back* · aria *Switch room* · *Room* · *No room yet* · aria *Versions, {n} renders* · pill *{label} · {n}* · aria *More actions* · menu *Download this image* · *Full view* · *Share to portal* · *Change photo* · *Hide markers* / *Show markers*
- Reachable: yes (≤ lg)

### D-04 · Tray building blocks (`Scroller`, `Chip`, `MoreChip`, `TrayLabel`)
- Where: MSH:31-83
- Entry: —
- Does: every tray is one or two horizontal, snap-scrolling rows (`Scroller`, gutter-aligned). `Chip` = a 36 px pill with `aria-pressed`; three tones for the pressed state — **primary** (default), **red** (a *Remove*), **blue** (a *Recolour*). `MoreChip` = a text-style chip with a chevron, label default *More*. `TrayLabel` = a small uppercase caption with an optional right-hand action.
- Rules: chips never wrap (horizontal scroll only); tray rows have a fixed 36 px line height so the tray does not jump between states.
- Data: —
- States: pressed / not pressed per chip.
- Words: *More* (default)
- Reachable: yes (≤ lg)

### D-05 · Surfaces tray — states
- Where: MSH:136-160, 213
- Entry: dock › Surfaces (the phone shows this mode while the Surfaces tile is open; see D-13)
- Does: shows exactly one of: a spinner line while detection runs; a prompt when there is no image; an empty line (+ *Add one*) when detection found nothing; else the chip row + swatch row.
- Rules: the order of checks is detecting → no image → no chips → list. *Add one* / *Add* appear only when the host passes `onAddSurface` (the public trial omits it — "Omit where the product has no "add a missed surface" flow", MSH:146).
- Data: —
- States: detecting · no image · none detected · list with nothing selected · list with a surface selected.
- Words: *Detecting surfaces…* · *Upload a room photo to detect surfaces.* · *No surfaces detected.* · *Add one* · *Pick a surface above, or tap a dot on the photo.*
- Reachable: yes (≤ lg)

### D-06 · Surfaces tray — the surface chips
- Where: MSH:163-177; data VZ:4691-4708; select VZ:5260-5266
- Entry: Surfaces tray
- Does: one chip per EXACT label (lower-cased; identical labels collapse) — label title-cased, *×{n}* when the label occurs more than once, and a small swatch square (the material's colour, or its image for a custom / library material) once a material is assigned. A trailing *Add* chip opens the add-a-surface sheet (D-24). Tapping a chip selects that label group (its first surface is the representative); tapping the selected chip again deselects it. Selecting here always clears a desktop-style structural group selection (`roomSelectedGroup` → null).
- Rules: phone chips are per exact label, NOT per structural group (Walls / Floor … — B-57); a material picked on a phone therefore reaches every surface with the same label (B-59's label-group rule). The chip shows the FIRST instance's material only.
- Data: `SurfaceChip { key, label, count, swatch, previewUrl, selected }` (MSH:133).
- States: unselected · selected (filled) · with / without a material dot.
- Words: *×{n}* · *Add*
- Reachable: yes (≤ lg)

### D-07 · Surfaces tray — the swatch row
- Where: MSH:178-211; data VZ:4709-4729 (B-74); routing VZ:5267-5269
- Entry: select a surface chip (or tap its dot on the photo)
- Does: first tile **None** (a hatched square with a ban icon; aria *No material change*; it looks pressed when no swatch in the row is selected) → up to 12 material tiles (square swatch or image, two-line name, pressed when applied) → last tile **All materials** (⋯ icon). A tile assigns the material to the selected label group at once; None clears it (the surface is left unchanged in the render).
- Rules: row order and the 12 cap are B-74's (current → suggested for this label + style → recents → session customs). *All materials* opens the phone material picker (D-22) when a surface is selected, else the level-two sheet on the Surfaces panel. Library materials never appear in this row (only in the picker).
- Data: `SwatchItem { id, name, swatch, previewUrl, selected }` (MSH:134).
- States: None pressed · one tile pressed.
- Words: *None* · aria *No material change* · *All materials*
- Reachable: yes (≤ lg)

### D-08 · Furniture tray — states and chips
- Where: MSH:221-258; data VZ:4731-4747 (B-84); select VZ:5278-5283
- Entry: dock › Furniture
- Does: states as the Surfaces tray (spinner / no image / none + *Add one* / list). One chip per furniture group (label minus its "(position)", lower-cased, B's `normFurnitureKey`), title-cased, *×{n}* for repeats; the chip carries the group's action: an ✕ icon and **red** when *remove*, a refresh icon when *replace* (primary tone), a palette icon and **blue** when *customize*; *keep* has no icon. Trailing *Add* chip opens the add-furniture sheet. Tap = select the group (tap again = deselect).
- Rules: the chip's tone shows only while it is the selected chip (tone applies to the pressed state); an unselected chip shows its action by icon only. The action shown is the FIRST instance's.
- Data: `FurnitureChipItem { key, label, count, action: "keep"|"remove"|"replace"|"customize", selected }` (MSH:221).
- States: detecting · no image · none detected · list · selected.
- Words: *Detecting furniture…* · *Upload a room photo to detect furniture.* · *No furniture detected.* · *Add one* · *Add* · *×{n}* · *Pick an item above, or tap a dot on the photo.*
- Reachable: yes (≤ lg)

### D-09 · Furniture tray — the action row
- Where: MSH:259-265; VZ:4748-4754 (`applyFurnitureActionToGroup`), VZ:5284-5285
- Entry: select a furniture chip
- Does: three chips — **Remove** (red), **Replace** (primary), **Recolour** (blue; the `customize` action) — pressed when that is the group's action, then a MoreChip whose label follows the action: *Describe* (replace), *Finish & colour* (customize), *More* (otherwise). An action chip applies to EVERY instance of the group through the desktop's `nextFurnitureForAction` (pressing the active action again toggles it back to keep — B-78). The MoreChip opens the level-two sheet on the Furniture panel, where the replacement description / preset / reference photo or the finish & colour are set (B-79, B-80).
- Rules: the phone word is *Recolour*; the desktop and the payload say *customize* (B-80). There is no Keep chip — un-pressing is the way back.
- Data: —
- States: none / remove / replace / customize pressed.
- Words: *Remove* · *Replace* · *Recolour* · *Describe* · *Finish & colour* · *More*
- Reachable: yes (≤ lg)

### D-10 · Style tray
- Where: MSH:275-305; mount VZ:5289-5296
- Entry: dock › Style
- Does: caption *Design style* with a right-hand MoreChip; a row of 72 px tiles: first **None** (hatched; pressed when no style), then the 25 styles (B-87), each drawn as its palette in vertical stripes with the name under it (two lines max). Tapping a tile sets the style through the desktop's `handleStyleChange`; None sets `""`.
- Rules: the MoreChip label is a prop: the studio tool passes nothing, so it reads *Style transfer* and opens the level-two sheet on the Style Transfer panel (`openMoreOn("styleTransfer")`); the public trial "has no such tool and shows *All styles*" (MSH:282). The tray never shows the style descriptions (desktop cards do).
- Data: `StyleChipItem { name, palette: string[], selected }` (MSH:275); palettes from `STYLE_PALETTE_MAP`.
- States: None pressed · one style pressed.
- Words: *Design style* · *Style transfer* (studio) / *All styles* (trial) · *None* · the 25 style names
- Reachable: yes (≤ lg)

### D-11 · Lighting tray
- Where: MSH:307-337; mount VZ:5297-5309
- Entry: dock › Lighting
- Does: caption *Lighting* with a *Fine-tune* MoreChip (opens the level-two sheet on the Lighting panel = the desktop `RelightControls`, sliders + fixtures + instruction). A row of 72 px tiles: first **As shot** (ban icon; pressed when lighting is not configured) then the six presets (D-61), each its preview photo with a check badge when active and its label under it. A preset tile loads that preset's knobs (sun, temperature, intensity, shadows AND its fixtures, copied); *As shot* clears the preset and resets the knobs to neutral.
- Rules: the phone word is *As shot* (B-100 calls it "Off"; desktop has only a *Reset* link). Tapping the active preset again does NOT toggle it off on the phone (it re-applies); on desktop it does (B-93). "Pressed" for As shot = `!relightConfigured`, so a hand-tuned lighting (no preset) shows no pressed tile.
- Data: `LightingChipItem { id, label, preview, selected }` (MSH:307).
- States: As shot · a preset · custom (nothing pressed).
- Words: *Lighting* · *Fine-tune* · *As shot* · preset labels (D-61)
- Reachable: yes (≤ lg)

### D-12 · Tools tray
- Where: MSH:339-363; items VZ:5311-5329 (B-115)
- Entry: dock › Tools
- Does: caption *Tools* and a row of icon tiles: *Empty the room* · *Auto furnish* · *Style transfer* · *Finishing note* · *Select area* (reads *Selecting…* while on) · *Hide markers* / *Show markers*. A tile is pressed when its thing is active (panel open, a style reference exists, a note exists, region mode on, markers on). Disabled tiles are dimmed and refuse the tap; a tile's `hint` is only a native `title` tooltip (*Draw around items the detector missed* on Select area) — so on a phone the hint is never seen.
- Rules: B-115 has the enable rules. Picking *Empty the room* / *Auto furnish* closes the other tool and every tile, then opens the level-two sheet at FULL height on that tool's panel; *Style transfer* / *Finishing note* open the sheet on those panels; *Select area* toggles lasso mode and clears any drawn path; markers toggle in place.
- Data: `ToolItem { id, label, icon, active?, disabled?, hint? }` (MSH:339).
- States: per tile: normal · pressed · disabled.
- Words: *Tools* · *Empty the room* · *Auto furnish* · *Style transfer* · *Finishing note* · *Select area* / *Selecting…* · *Hide markers* / *Show markers* · title *Draw around items the detector missed*
- Reachable: yes (≤ lg)

### D-13 · Dock (`MobileDock`)
- Where: MSH:365-400; mount VZ:5331-5335; mapping VZ:4680-4686 (B-114)
- Entry: always on screen below `lg`
- Does: five equal tabs with icon + label — *Surfaces* · *Furniture* · *Style* · *Lighting* · *Tools* — `role="tablist"` (aria *Editing mode*), each `role="tab"` with `aria-selected`. A small dot badge marks a mode that holds pending changes.
- Rules: the badge is never drawn on the ACTIVE tab. Badge rules (VZ:5334): Surfaces = any material assigned · Furniture = any group changed · Style = a style or a style reference · Lighting = lighting configured · Tools = a finishing note exists. Switching mode closes the Defurnish and Auto Furnish panels. Mode is derived, not stored: the dock shows the open tile (surfaces / furniture / style / lighting) and **Tools for anything else** — no tile open, Finishing, Style Transfer, Defurnish or Auto Furnish (VZ:4680-4681). So opening Style transfer from the Style tray moves the dock to Tools.
- Data: —
- States: active tab · badge dots.
- Words: *Surfaces* · *Furniture* · *Style* · *Lighting* · *Tools* · aria *Editing mode*
- Reachable: yes (≤ lg)

### D-14 · Generate bar (`MobileGenerateBar`)
- Where: MSH:402-453; mount VZ:5336-5346
- Entry: always on screen below `lg`, above the home indicator (bottom padding = the safe-area inset, at least 16 px)
- Does: idle: a full-width primary button (sparkles icon + label) and, to its right, a **variants dropdown** reading *{n}×* (aria *{n} variant* / *{n} variants*) with three items *1 variant* · *2 variants* · *3 variants* (a check on the current one). Busy: the button is replaced by a non-interactive *Rendering…* bar with a spinner and an outline **Cancel** button (aborts the running request through the shared AbortController, VZ:3924-3926). An error line shows under the bar.
- Rules: label (VZ:5337) = *Render from sketch* in sketch mode, else *Generate · {n} change* / *Generate · {n} changes* where n = `pendingChangeCount` (style + style reference + materials assigned + furniture groups changed + lighting configured + finishing note), else *Generate*. Disabled: sketch mode → while rendering or without an image; otherwise `!canGenerate`. Busy: sketch rendering, else `generating` (so a Defurnish or Auto Furnish run does NOT turn the bar busy). The variants dropdown is hidden in sketch mode ("Sketch mode renders one image"). Error text = the generate error or the sketch error. B-106 notes the variants control exists only on phone widths.
- Data: `variantCount` 1–3.
- States: idle · disabled · busy (+ Cancel) · error.
- Words: *Generate* · *Generate · {n} change(s)* · *Render from sketch* · *Rendering…* · *Cancel* · *{n}×* · *{n} variant(s)*
- Reachable: yes (≤ lg)

### D-15 · What the phone's Generate actually runs
- Where: VZ:5340 (`onGenerate={sketchMode ? handleRenderFromSketch : handleGenerate}`), VZ:3247-3260 (`handleGenerate` routing), VZ:3915-3922 (the desktop-only `runPrimaryAction`), VZ:4632-4638 (Defurnish's own phone button)
- Entry: the Generate bar
- Does: `handleGenerate` routes by intent: lighting only → relight pass; a style REFERENCE and no surgical edits → Style Transfer; a named style and no surgical edits → whole-room restyle; otherwise the surgical render (C owns each pass). The phone bar never calls `runPrimaryAction`, so it never runs Defurnish or Auto Furnish. Defurnish has its own phone-only button inside its panel (*Empty the room* → *Regenerate* once versions exist → *Defurnishing…* while running; `lg:hidden`). Auto Furnish has no run control below `lg` (C's Uncertain #1).
- Rules: the desktop primary label's precedence (prompt text → Defurnish open → Auto Furnish open → sketch → Relight → Style Transfer → Generate) does not exist on the phone; the phone label only counts changes.
- Data: —
- States: —
- Words: *Empty the room* · *Regenerate* · *Defurnishing…* (Defurnish panel, phone only)
- Reachable: yes (≤ lg) — Auto Furnish on a phone: apparently unreachable to run

### D-16 · Versions sheet opens by itself after a phone render
- Where: VZ:3465-3466
- Entry: a successful surgical Generate below `lg`
- Does: "Phones have no gallery strip — surface the result in the Versions sheet": the sheet opens on the new versions.
- Rules: the only auto-open call in the editor is on the surgical path of `handleGenerate`; restyle / style transfer / relight / sketch / defurnish results do not open it by this line (relight opens its own result panel, B-98).
- Data: —
- States: —
- Words: —
- Reachable: yes (≤ lg)

### D-17 · Rooms sheet (`RoomSwitcherSheet`)
- Where: MSH:457-524; mount VZ:5768-5777; data VZ:4769-4772 (B-33)
- Entry: top bar › room pill
- Does: a bottom sheet (≤ 80 % of the screen) titled *Rooms*. Each row: the room's cover (its ORIGINAL photo, not the latest render), the name, *{n} render* / *{n} renders*, a check on the active room, and an options button (aria *Options for {name}*) with *Rename* and *Delete room*. Tapping a row switches room and closes the sheet. Footer: *Upload photo* (always) and *Take photo* (touch devices only — shown by the `hover: none` media query; opens the camera, `capture="environment"`). Both create a new room named *Room {n+1}* and load the photo into it (VZ:2283-2287); the sheet closes first.
- Rules: *Delete room* closes the sheet, then asks the browser confirm *Delete this room and all its renders?* (VZ:2290) and deletes the room's Storage files first (B-30). Empty list → a centred line.
- Data: `RoomEntry { id, name, renders, cover, active }` (MSH:457); `renders` = sum of variants over the room's jobs.
- States: empty · list · a row renaming.
- Words: *Rooms* · *No rooms yet. Add a photo to start.* · *{n} render(s)* · aria *Options for {name}* · *Rename* · *Delete room* · *Upload photo* · *Take photo* · confirm *Delete this room and all its renders?*
- Reachable: yes (≤ lg)

### D-18 · Inline rename in the Rooms sheet
- Where: MSH:469-473, 486-496
- Entry: Rooms sheet › ⋯ › Rename
- Does: the row's name becomes an autofocused text box (aria *Room name*). Enter or leaving the box commits; Escape cancels; closing the sheet cancels. The commit calls the editor's `renameRoom` (the same PATCH as desktop, B-29).
- Rules: a blank or whitespace-only name is ignored (no rename, box closes); the name is trimmed. Tapping inside the box does not switch room.
- Data: —
- States: viewing · editing.
- Words: aria *Room name*
- Reachable: yes (≤ lg)

### D-19 · Versions sheet (`VersionsSheet`)
- Where: MSH:526-579; mount VZ:5778-5796; entries VZ:4762-4768
- Entry: top bar › versions pill; auto after a phone surgical render (D-16)
- Does: a bottom sheet (≤ 82 %) titled *Versions* with the hint *Tap to edit · compare any two*, a two-column grid of cards. While any pass runs (generate, sketch, auto furnish, defurnish) the first card is a *Rendering…* placeholder. Then every render **newest first** (V-numbers still count oldest-first), then the **Original** last. A card = the image (4:3), an *Editing* badge on the current editing base, the label (*V{n}* / *Original*) and a sub-line (the job's local caption, else its stored style). Tapping a card makes it the editing base and closes the sheet (Original → `editVersion(original)`; a render → `editFromGallery`). Render cards carry *Compare* (opens the View dialog with this version as "after" and closes the sheet) and a trash button (aria *Delete {label}*); the Original card instead says *The photo you started from*.
- Rules: delete has NO confirmation (optimistic; toast *Render deleted*) and the sheet stays open; the Original can never be deleted here. The delete PATCHes or DELETEs the job only (D-106) — the variant's image stays in the `renders` bucket, and a failed DB call is logged but the toast still says *Render deleted* (VZ:3203-3245). C owns the compare / edit / delete behaviour.
- Data: `VersionEntry { key, url, label, sub?, selected, isOriginal }` (MSH:526); key = `${jobId}:${variantId}` or `__original__`.
- States: rendering card · list · Editing badge.
- Words: *Versions* · *Tap to edit · compare any two* · *Rendering…* · *Editing* · *Original* · *V{n}* · *The photo you started from* · *Compare* · aria *Edit {label}* · aria *Delete {label}*
- Reachable: yes (≤ lg)

### D-20 · The View dialog's phone *Changes* sheet
- Where: VZ:5827-5843
- Entry: View dialog › Changes (phone; the desktop uses a popover, C)
- Does: a bottom sheet (≤ 70 %) listing the viewed version's changes as *{surface label} → {material}* rows.
- Rules: titled from the version's parent when known.
- Data: `viewingVariant.materials[{label, material}]`.
- States: —
- Words: *Changes from {V-label}* / *Changes in this version* · *→*
- Reachable: yes (≤ lg)

### D-21 · Material tile (`MaterialTile`)
- Where: MS:29-52
- Entry: every tile in the phone picker (and the trial's desktop grid)
- Does: a square tile (colour or image) with a two-line name that never truncates, an optional grey sub-line, a check badge when applied. `compact` (grids of 5–6 columns, "the 380px rail") = smaller tile, ONE-line truncated name, no sub.
- Rules: aria-label = the name; the native tooltip = *{name} · {sub}*; `aria-pressed` = applied. A stock tile's sub is its subcategory only when it differs from the category. Tiles with no colour fall back to a light grey.
- Data: —
- States: normal · applied · pressed-down (touch).
- Words: —
- Reachable: yes

### D-22 · Phone material picker sheet (`MaterialPickerSheet`) — header and closing rules
- Where: MS:237-279; mount + data VZ:4775-4788, VZ:5798-5816 (B-73 has the outline)
- Entry: Surfaces tray › *All materials* with a surface selected (D-07)
- Does: a 92 %-high bottom sheet (no close ×). Header: Back arrow (aria *Back*, closes), the surface's label title-cased (*Dark Grey Plaster Ceiling*), under it *Now: {material}* or *Unchanged*, and a **None** chip at the right ("None is a chip, not a row") — pressed when nothing is applied; pressing it clears the surface and closes. Body = the browser (D-23). Picking any tile (stock, custom or library) assigns and closes the sheet: "picking closes the sheet and the tray shows the result".
- Rules: the sheet only opens while a surface is selected (`open = materialSheetOpen && !!mobilePickerScope`). Data the editor feeds: `catalogue` = the stock catalogue WITHOUT the two brand categories *Gush Paints* and *Gush Enamel*, which are passed separately as `brands` (only if non-empty); `suggestedCategories` = the label's categories (`surfaceCategoriesFor`, falling back to `SURFACE_CATEGORY_MAP[label]`); `library` = the studio's library pre-filtered to those categories (all of it when the label maps to none); `recent` = the recents resolved to stock items; `customs` = this session's uploads. A library pick imports the material as a session custom (B-68) — so library tiles never show as applied.
- Data: —
- States: Now: {material} · Unchanged · None pressed.
- Words: sheet title (screen-reader only) *Choose a material for {Scope}* · aria *Back* · *Now:* · *Unchanged* · *None*
- Reachable: yes (≤ lg)

### D-23 · Material browser (`MaterialBrowser`) — sections, order, search, brands
- Where: MS:89-235
- Entry: inside the picker sheet (4 columns); the trial's desktop rail uses it with 6 compact columns
- Does: **sticky head** — a search box (placeholder *Search {N} materials…*, N = stock + brand items + library, customs not counted; a clear ✕) and, when not searching, category chips *All* + categories + brand names. **Body, All view, in this order ("order of usefulness")**: *Suggested for {Scope}* (only if any) → *Recent* (only if any) → *Your library* (ALWAYS shown: first an *Upload a swatch* tile, then this session's customs with sub *This session* and a remove ✕ each, then studio library tiles with their category as sub) → one section per stock category → one section per brand, **collapsed to 8 tiles** with *Show all {n}* / *Show fewer* when longer. Each section heading shows its count. **Category chip** → only that one section (a brand chip shows the brand's full list, uncollapsed). **Search** → *Your library* matches (customs + library) then *Results* (stock + brands); none → *Nothing matches "{q}".*
- Rules: chip order = the surface's relevant categories that exist in the catalogue first, then the other categories in catalogue order, then the brands; the same order drives the All view's category sections. Search fields: stock = name, category, subcategory, description, tags (tags are compared as stored, not lower-cased); library = name + category; customs = name only. Search hides the chips. In search results customs lose their ✕ and *This session* sub. *Results* renders even with 0 stock hits when the library matched. `columns` 3 · 4 (default) · 5 · 6; 5+ switches to compact tiles. `BRAND_PREVIEW = 8`.
- Data: local state only: query, category (default *All*), expanded brands.
- States: All · one category · searching · no match.
- Words: *Search {N} materials…* · aria *Search materials* · aria *Clear search* · *All* · *Suggested for {Scope}* · *Recent* · *Your library* · *Upload a swatch* (compact *Upload*) · aria *Upload a swatch photo* · *This session* · aria *Remove {name}* · *Results* · *Show all {n}* · *Show fewer* · *Nothing matches "{q}".*
- Reachable: yes

### D-24 · Add a missed surface / furniture sheet (`AddItemDialog`) — detail beyond B-52
- Where: MS:281-326; VZ:5817-5825
- Entry: Surfaces / Furniture tray › *Add* or *Add one*
- Does: name → *Place on photo* → the editor enters place mode (the next tap on the photo drops the dot, B-48).
- Rules: furniture categories, in order: *Seating* (default) · *Tables* · *Storage* · *Beds* · *Lighting* · *Decor* · *Appliances* · *Fixtures*. The name is trimmed; Enter confirms; the button stays disabled until a non-blank name. Closing the sheet (or confirming) clears the name; the category is NOT reset between opens. The editor falls back to *Decor* if no category arrives.
- Data: `placing { kind: "surface" | "furniture", label, category? }`.
- States: empty (button disabled) · named.
- Words: B-52 (*Add furniture* / *Add a surface* · *Name it, then tap the spot on the photo.* · *e.g. Floor lamp* / *e.g. Skirting* · *Place on photo*)
- Reachable: yes (≤ lg)

### D-25 · Test-pinned: the top bar (T-msh:8-21)
- Where: T-msh:8-21
- Does: pins that the room pill (aria *Switch room*), the versions pill (aria matching *Versions, 6 renders*) and *Back* each fire their callback; the pill text is *V3 · 6*; with `versionCount` 0 the versions pill is absent; with no room and no rooms the pill reads *No room yet*.
- Rules: the versions pill must not render without renders.
- Reachable: test

### D-26 · Test-pinned: the dock (T-msh:23-31)
- Where: T-msh:23-31
- Does: the active mode's tab has `aria-selected="true"`; tapping *Lighting* reports `"lighting"`.
- Rules: the dock is an ARIA tablist.
- Reachable: test

### D-27 · Test-pinned: the Generate bar (T-msh:33-48)
- Where: T-msh:33-48
- Does: the label renders and fires; the variants trigger is named *1 variant*; `disabled` disables the button; the error text shows verbatim (*Generation failed: nope* in the test); busy swaps to *Rendering…* and a *Cancel* that fires `onCancel`.
- Rules: busy hides the Generate button entirely (no double-submit).
- Reachable: test

### D-28 · Test-pinned: the Surfaces tray (T-msh:50-80)
- Where: T-msh:50-80
- Does: chips show *×3*; tapping *Floor* selects `"floor"`; tapping a swatch picks its id; *No material change* clears; *All materials* opens more. Empty / busy: *Detecting surfaces…* while detecting; *Upload a room photo…* without an image; *Pick a surface above…* with chips but nothing selected.
- Rules: detecting outranks every other state.
- Reachable: test

### D-29 · Test-pinned: the Furniture tray (T-msh:82-91)
- Where: T-msh:82-91
- Does: with a *replace* item selected, *Remove* reports `("sofa", "remove")` and the more chip reads *Describe* and opens more.
- Rules: the more chip's label follows the selected group's action.
- Reachable: test

### D-30 · Test-pinned: Style / Lighting / Tools trays (T-msh:93-114)
- Where: T-msh:93-114
- Does: a style tile reports its name, *None* reports `""`; a lighting preset reports its id, *As shot* fires `onOff`; a disabled tool tile does not fire, an enabled one reports its id.
- Rules: style None = the empty string, not null.
- Reachable: test

### D-31 · Test-pinned: the Rooms and Versions sheets (T-msh:116-138)
- Where: T-msh:116-138
- Does: tapping a room selects it AND closes the sheet; *Upload photo* fires. Versions: *Rendering…* shows while rendering; *Edit V2* reports the key; *Compare* reports the key; exactly ONE delete button for one render + the Original; *The photo you started from* shows on the Original.
- Rules: the Original is never deletable; selecting a room always closes the sheet.
- Reachable: test

### D-32 · Test-pinned: the picker's header and section order (T-ms:31-43)
- Where: T-ms:30-43
- Does: the sheet title-cases the scope (*Dark Grey Plaster Ceiling*), shows *Now:* with the applied material; level-3 headings run *Suggested for …* → *Recent* → *Your library* → relevant categories (Paints before Flooring) → the brand last (*Gush Paints*).
- Rules: suggested, recent and library always precede the catalogue; brands always last.
- Reachable: test

### D-33 · Test-pinned: brand collapse (T-ms:45-51)
- Where: T-ms:45-51
- Does: a 12-item brand hides item 12 until *Show all 12* is pressed.
- Rules: brand sections preview 8 tiles.
- Reachable: test

### D-34 · Test-pinned: pick / None close the sheet (T-ms:53-61)
- Where: T-ms:53-61
- Does: picking *Warm White* assigns `"p2"` and closes; *None* fires `onNone`.
- Rules: a pick always closes the picker.
- Reachable: test

### D-35 · Test-pinned: applied mark, library, upload, remove (T-ms:63-74)
- Where: T-ms:63-74
- Does: the applied material's tile is `aria-pressed`; a library tile passes the whole library record to `onPickLibrary`; *Upload a swatch photo* fires upload; *Remove Site sample* removes the custom by id.
- Rules: library picks hand over the record (the editor imports it); customs are removable from the picker.
- Reachable: test

### D-36 · Test-pinned: category narrowing and search (T-ms:76-87)
- Where: T-ms:76-87
- Does: the *Flooring* chip leaves exactly one section; typing *walnut* hides the chips and finds the library's *Studio Walnut*; *zzzz* shows *Nothing matches…*.
- Rules: search spans stock, brands, library and customs; chips hide while searching.
- Reachable: test

### D-37 · Test-pinned: the add-item sheet (T-ms:90-105)
- Where: T-ms:90-105
- Does: *Place on photo* is disabled until named; a surface confirms `("Skirting", undefined)`; furniture with the *Lighting* chip and Enter confirms `("Floor lamp", "Lighting")`.
- Rules: surfaces carry no category; Enter submits.
- Reachable: test

### D-38 · Test-pinned: the touch-affordance guard — file scope (T-touch:18-40)
- Where: T-touch:18-40 (the three rules themselves: B-126)
- Does: the guard runs over 15 files — the editor, canvas overlays, canvas gestures, the mobile shell, the material sheet, the AI Visualizer page, the three landing components (design card, start strip, first-run hero), the rail, and the trial's five files (`trial-visualizer`, `trial-canvas`, `trial-panels`, `trial-results`, `trial-start`).
- Rules: a file absent from the checkout is SKIPPED, not failed — "The trial … ships on the prod line only; the fork lines carry the studio tool without it". The rules: (1) every hover-revealed control (`group-hover:opacity-100`) must also be visible where there is no hover (`hover-none:opacity-100`); (2) no bottom Sheet may carry a position utility (it silently loses `fixed` and never shows — "why the mobile Controls sheet never rendered before 2026-09-13"); (3) Pointer Events only: no `onMouseDown/Move/Up/Leave`, no `addEventListener("mouse…")`, no `onDoubleClick` ("iOS synthesises mouse events from touches … double-fires").
- Reachable: test

---

## D2 · The engine's rules (what each prompt asks the model to do and never do)

Every image call goes through `callOpenRouterForImage` (`src/lib/ai.ts:212-299`): OpenRouter chat completions with `modalities` (`["image"]` for FLUX, `["image","text"]` for Gemini — `resolveImageModalities`, `src/lib/sketch-render.ts:29-32`), `image_config.aspect_ratio` (omitted for `openai/*` models, which reject it), `usage.include` (real USD cost per call), no retry of its own. Text calls (`callOpenRouter`) retry ONCE on a transient failure (`ai.ts:101-112`); `callOpenRouterJson` makes two attempts, the second with a bigger token budget when the first was truncated (`ai.ts:135-205`). Every render path snaps the photo's width/height to the nearest supported aspect ratio: ≥1.7 → 16:9 · ≥1.45 → 3:2 · ≥1.2 → 4:3 · ≥0.9 → 1:1 · ≥0.7 → 3:4 · ≥0.55 → 2:3 · else 9:16; unknown size → 16:9 (GEN:87-99, PHO:71-82, `API/render/relight:37-47`).

### D-39 · Shared result shape of the render cores (`CoreResult`)
- Where: CT:1-21
- Does: every core function returns `{ ok: true, data }` or `{ ok: false, status, error }` instead of throwing or building an HTTP response, "so it stays framework-agnostic and callable from both the authed routes and the anonymous public-trial routes".
- Rules: "NOT a "never throws" contract": only explicitly validated input returns `fail()`; malformed input can still throw — "Any future caller — especially an anonymous/public one — must still wrap calls".
- Data: —
- Reachable: yes (every `/api/render/*` core route + the trial routes)

### D-40 · Fidelity clauses (sketch → photo tightness)
- Where: `src/lib/sketch-render.ts:7-25`
- Does: three clauses appended to the restyle / sketch prompt: **exact** — *Preserve the EXACT geometry, proportions, wall positions, and camera perspective of the reference. Do not move, add, or remove structural elements.* · **balanced** (default for anything else) — *Follow the reference layout, proportions, and perspective faithfully while resolving rough, ambiguous, or unfinished areas into natural, plausible detail.* · **loose** — *Interpret the rough layout and design intent of the reference. Produce a well-composed, plausible room that is clearly consistent with the sketch, without rigidly tracing every line.*
- Rules: an unknown or missing fidelity resolves to *balanced*.
- Reachable: yes (sketch render, restyle)

### D-41 · Whole-room restyle / sketch prompt — the shared body (`buildRestylePrompt`)
- Where: RP:125-262 (extracted verbatim from the photorealistic route so the authed route and the public demo route "build the SAME prompt from one source of truth")
- Does: assembles, in order: *Ultra-photorealistic interior design photograph. {Style} style interior.* → *STYLE:* the style's prompt text (`STYLE_PROMPT_MAP`; an unknown style falls back to **Modern**) → *SCENE DESCRIPTION:* (D-43) → *SCENE DRESSING (add these details naturally):* (D-42, unless suppressed) → *SPECIAL REQUEST: {customPrompt}* when the user typed a note → *MATERIAL CONTAINMENT* (D-44) → *CRITICAL INSTRUCTIONS* (photo D-45 or sketch D-46).
- Rules: the viewpoint guardrails apply to every caller: *Keep the reference's exact camera angle, framing, and perspective — do not zoom, pan, tilt, crop, or re-frame the shot.* · *The output aspect ratio must match the input image.* · when dressing is suppressed also *Do not add decorative props, plants, or styling that are not present in the reference.* Dressing is suppressed ONLY for a sketch at *exact* fidelity ("scene dressing fights accuracy"); a photo restyle always keeps it ("style-appropriate decor … is a big part of what makes the restyle read as bold and distinct").
- Reachable: yes (restyle, sketch render; the trial / demo reuse it)

### D-42 · Scene dressing (auto-added props by room and furniture)
- Where: RP:18-50
- Does: adds sentences by keyword. From the furniture list: dining/table (not coffee) → *on the dining table: ceramic vase with fresh eucalyptus stems, linen placemats, artisan ceramic bowls* · coffee table → *on the coffee table: stacked hardcover art books, small terrazzo tray with candle, ceramic cup* · desk/study → *on the desk: slim laptop, architectural desk lamp, leather notebook, pencil holder* · console/TV console → *near the console: potted fiddle leaf fig plant, framed art leaning against wall*. Always: *through all windows: lush tropical greenery with dappled sunlight, distant trees, soft natural daylight streaming in*. From the room context: kitchen → *kitchen details: wooden cutting board with bread, herb pots on windowsill, copper pendant lights, open shelf with ceramic jars* · bedroom/master → *bedroom details: textured linen throw draped on bed, bedside stack of books, soft warm reading lamp glow, sheer curtains* · living/dining → *living details: textured throw pillows in complementary tones, woven jute area rug, trailing pothos plant on shelf* · bath → *bathroom details: neatly folded white towels, amber glass soap dispenser, small orchid plant*. Always last: *atmosphere: warm golden hour afternoon light, subtle shadows with soft edges, lived-in but curated feel, slight atmospheric haze near windows*.
- Rules: the tropical-greenery window view and the golden-hour atmosphere are added to EVERY non-suppressed restyle, whatever the style, the room or its real window view (and a photo restyle is never suppressed).
- Reachable: yes

### D-43 · Scene narrative (structured data → visual language)
- Where: RP:56-119
- Does: *This is {roomContext}.* · *The room contains: …* where each furniture name is dressed by type: sofa/couch *with plush upholstered cushions and soft fabric texture* · bed *with a padded headboard, crisp white bedding, and decorative pillows* · dining table *with a solid wood top showing natural grain* · coffee table *with a smooth polished surface* · chair *with comfortable cushioned seating* · wardrobe/cabinet *with paneled doors and clean hardware* · TV console *with a mounted display above it* · shelf/bookshelf *with curated objects and books* · lamp *casting warm ambient light* · plant *with lush green foliage* · fridge *with a stainless steel finish* · washing *with a modern front-loading design* · toilet → *a modern wall-mounted {name}* · sink/basin *with chrome fixtures*. Colour overrides mentioning wood/oak/walnut/timber, marble, tile/ceramic, concrete add *Materials in the space: …*. A spatial layout's "(flush …)" facts (first three) become *Key spatial relationships: …*.
- Rules: nothing known → *A modern interior space with carefully arranged furniture.*
- Reachable: yes (the studio editor sends little of this; the 3D planner callers send more)

### D-44 · Material containment block (every restyle, every style)
- Where: RP:202-212
- Does: *MATERIAL CONTAINMENT (critical — keep each material inside its own surface):* read the room as SEPARATE zones (each wall, ceiling, floor, slatted / panelled section, arched recess, door and window frame), ONE coherent finish per zone; a wall material *must STOP CLEANLY at the ceiling line, at internal corners, and at the edge of its panel or niche … NEVER creep onto the ceiling*; *The ceiling stays a ceiling finish* (never clad in brick or wood planks unless the reference shows it); respect surface DIVISIONS (slat panelling beside a plain wall, an arched recess); a style's "feature wall" material goes on *ONE wall only*.
- Rules: exists because style prompts name materials "but never say WHERE they go".
- Reachable: yes

### D-45 · Photo restyle — critical instructions (`sourceType: "photo"`)
- Where: RP:216-227
- Does: *This is a REAL PHOTOGRAPH … Perform a COMPLETE redecoration … This is a full makeover — NOT a colour filter, NOT a surfaces-only change. The furniture, textiles and decor MUST visibly change too.* Restyle EVERYTHING: **FURNITURE** (silhouette, legs, frame, material and finish change; *Keep each piece in roughly the same position and footprint; do not rearrange or empty the room*) · **SOFT FURNISHINGS** (upholstery, throws, cushions, curtains, blinds, rugs, bedding) · **DECOR & GREENERY** (plants, art, vases, books, lamps, pendants, tabletop objects; may add small decor) · **SURFACES** (walls, ceiling, flooring) · the fidelity clause · *PRESERVE ONLY the architecture and framing: wall positions and proportions, window and door openings, arches, recesses and niches, ceiling height, and the exact camera angle* · photoreal (*NOT a 3D render, NOT an illustration*).
- Rules: "Everything that is furniture, textile, or decor is fair game to restyle."
- Reachable: yes (the editor's whole-room restyle, C)

### D-46 · Sketch render — critical instructions (default `sourceType`)
- Where: RP:228-237
- Does: fidelity clause · *Transform the reference 3D wireframe image into a photorealistic photograph* · *Preserve the EXACT room layout, wall positions, and furniture placement shown* · *Every piece of furniture visible in the reference must appear in the output at the same position and scale* · viewpoint guardrails · *Replace flat CAD colors with realistic materials* · *natural window light with soft caustics, ambient occlusion, contact shadows* · *Shot by a professional interior photographer, Canon 5D Mark IV, 24mm f/2.8, natural light, 8K, magazine-quality* · *NOT a 3D render, NOT an illustration*.
- Rules: —
- Reachable: yes (Render from sketch, C)

### D-47 · Refinement prompt (restyle of a render)
- Where: RP:250-261
- Does: when `isRefinement` + an instruction: *Refine this photorealistic interior render. Refinement: {instruction} · Style: {style} — {desc} · Preserve: room layout, camera angle, furniture positions, photorealistic quality.* + the containment sentence + *Only modify what was explicitly requested.* + *Additional: {customPrompt}*.
- Rules: replaces the main prompt entirely when present.
- Reachable: uncertain in the studio editor (no caller sends `isRefinement` in the slice read; the 3D planner may)

### D-48 · Photorealistic core (`runPhotorealistic`) — model, limits, dry run
- Where: PHO:1-151
- Does: builds the D-41 prompt, sends the image (plus an optional depth map as a second image) at the snapped aspect ratio, `temperature 0.2`, 120 s abort.
- Rules: default model **`black-forest-labs/flux.2-pro`** ("dramatically better interior renders than Gemini"); the caller's `model` wins (the editor sends flash / pro / flux, B-07). No size cap unless a caller passes `maxImageBytes` (the authed route never does). **Dry run** (`DRY_RUN` const false, OR no `OPENROUTER_API_KEY`): logs model, aspect, style, room context, furniture count, depth map flag, refinement flag and the first 200 chars of the prompt, and returns `{ imageUrl: "data:{mime};base64,{the INPUT image}", cost: null }` — the photo comes back unchanged.
- Data: returns `{ imageUrl, cost }` (cost = OpenRouter USD or null).
- States: errors *Missing image* (400) · *Image too large* (413, opt-in) · *No image in AI response* (502) · *Generation timed out — try again* (504) · *Generation failed: {message}* (502).
- Reachable: yes

### D-49 · Surgical render — what counts as a change, variants and size limits (`runGenerate`)
- Where: GEN:76-160
- Does: validates, snaps the aspect ratio, builds one prompt (D-50…D-58), then fans out one image call per variant IN PARALLEL (`Promise.all`) with the same prompt.
- Rules: a furniture change is valid only if it is a remove, or a replace / customize with a non-blank description (or, for replace, a reference photo); invalid ones are dropped silently. Refused with *Missing image or changes* (400) when there is no image, or no surface change, no valid furniture change, no style-ambient surface, no lighting and no free text. Variants are clamped to **1–5** (the UI offers 1–3; default 3 when absent). Size cap **14,000,000 base64 chars** ("~10MB") for the room image AND each custom reference: *Image too large (max 10MB)* / *Custom material reference {n} too large (max 10MB)* (413). Default model **`google/gemini-3-pro-image-preview`** (the editor sends flash by default, B-07). A style of `""` or *None* imposes no aesthetic (no fallback to Modern). **One failed variant fails the whole render** (no partial results); no retries; 120 s abort → *Generation timed out — try again* (504); anything else → *Generation failed — please try again* (502). Each variant echoes back `materials` (the surfaces sent) and `furnitureChanges`.
- Data: `GenerateInput { imageBase64, mimeType, surfaces[{label, material, description?, customRefIndex?}], unassignedSurfaces?, style, variants, model?, modalities?, imageWidth?, imageHeight?, refinementPrompt?, furnitureChanges?[{label, action, replacementDesc?, customRefIndex?, x?, y?}], preservedFurniture?[string | {label, x?, y?}], preservedSurfaces?[], customRefs?[{name, base64, mimeType, kind?: "material"|"furniture"}], lighting?{sunAngle?, colorTemp?, intensity?, shadows?, fixtures?, instruction?} }`.
- States: —
- Reachable: yes (`POST /api/render`)

### D-50 · Surgical render — label expansion (plural coverage)
- Where: GEN:161-173
- Does: generic labels are expanded so the model does not treat "Walls" as one wall: *walls/wall* → *EVERY wall surface in the room (back wall, left wall, right wall, every visible wall — not just one feature wall)* · *floor/flooring* → *the ENTIRE visible floor (every floor surface in the room, including parts under and partially behind furniture)* · *ceiling* → *the ENTIRE visible ceiling* · *cabinets* → *EVERY cabinet panel and door in the room* · *wardrobe(s)* → *EVERY wardrobe panel and door in the room* · *backsplash/splashback* → *EVERY backsplash surface visible* · *doors* → *EVERY door in the room*. Other labels pass through; an expanded one prints *{label} (apply to {expansion})*.
- Reachable: yes

### D-51 · Surgical render — the numbered change list
- Where: GEN:111-115, 175-231
- Does: every edit becomes *CHANGE {n} of {total} — …*; **furniture is numbered FIRST** ("the ones most often overlooked, so DO THEM FIRST"), surfaces continue the count. A surface: *SURFACE {label} → cover ALL of the above with {material} ({description}).* + the coverage rule: *Change ONLY the material / finish / colour … keep its geometry and structure IDENTICAL … any slats, grooves, fluting, panels, mouldings, arches, reveals or trim, plus their exact widths and spacing … RE-SKIN the existing structure; never redesign, widen, narrow, add, remove, or straighten it. Cover the WHOLE of this one surface … but do NOT let the material spill or bleed onto adjacent walls*. A surface with an uploaded swatch: *→ use REFERENCE IMAGE {n} (labeled "{name}") as the MATERIAL SAMPLE … at a realistic per-meter scale … Do NOT paste or composite the reference photo itself; do NOT stretch it to fit; do NOT bring in its lighting or framing.*
- Rules: the room is always REFERENCE IMAGE 1; uploaded references start at 2 in the order sent.
- Reachable: yes

### D-52 · Surgical render — furniture wording (remove / recolour / replace)
- Where: GEN:195-231, 315-320
- Does: an optional position anchor *[located at ~{x}% from left, ~{y}% from top]* from the dot. **REMOVE** — *erase the original "{label}" ENTIRELY from this exact location and seamlessly reconstruct the background (floor / wall / rug) that would be behind it, leaving ZERO trace of it*. **RECOLOR/REMATERIAL** (the *customize* / phone *Recolour* action) — *keep the SAME "{label}" in the exact same position, shape, size, orientation and footprint — do NOT move it or swap it … Change ONLY its material / fabric / finish / colour to: "{desc}". It is the identical piece, re-finished.* **REPLACE** — STEP 1 = the remove sentence, STEP 2 = *in that now-empty cleared slot, add {target}* … *The original … and the replacement MUST NOT co-exist*. Target = the description (+ *match the piece shown in REFERENCE IMAGE {n}*), or the reference photo alone (*recreate that piece's design*), or, with neither, *a tasteful replacement that suits the room* (*in the {style} aesthetic* when a style is set).
- Rules: a SPECIFIED replacement (description or photo) is rendered *TRUE to its … design — do NOT restyle it to the room's design aesthetic*; only an unspecified one may follow the style. Block footer: erase first, then paint; match scale to neighbours and the room's light; with an anchor *operate on that region only*.
- Reachable: yes

### D-53 · Surgical render — what must NOT change
- Where: GEN:233-264, 303, 309-315
- Does: base rule: *Apply only the changes listed below. Everything not listed stays identical to the input — same room layout, same architecture, same camera angle and perspective, same furniture and positions, same lighting* (the lighting clause drops when a lighting change is folded in) *. Do not zoom, pan, tilt, shift, add, or remove anything beyond what's listed.* Then *Preserve unchanged (do not swap, recolor, restyle, or "improve"):* the kept furniture (with position anchors when known) and *Keep these surfaces EXACTLY as in the input … every other surface stays pixel-faithful to the input:* the surfaces left at None.
- Rules: with changes present: *There are exactly {n} numbered CHANGE items below — you MUST apply EVERY single one. They are INDEPENDENT edits … do not skip, merge, shortcut, or ignore any.* With both furniture and surface changes: *applying only the surface re-skin (or only the furniture swap) is a FAILED render.*
- Reachable: yes

### D-54 · Surgical render — uploaded references (swatches and furniture photos)
- Where: GEN:17-24, 266-284, 304-308, 321-327
- Does: when any reference is attached: *Image 1 is the room you're editing. Images 2–{n} are user-uploaded reference images … inputs only; never copy a reference's own background, framing, or lighting.* Then a **REFERENCE ROSTER — what each reference image is for (do not swap):** *REFERENCE IMAGE {n} ("{name}") → MATERIAL for: {surfaces}* or *→ DESIRED FURNITURE for: {items}*; an unused reference reads *(unused — ignore this image)*. Material references: *treat the reference as a material sample (paint chip, tile swatch, fabric sample) … don't stretch or wallpaper it … Each reference's colors stay independent … the design style hint doesn't override them*. Furniture references: *recreate a piece matching that reference's design, form, material and colour … The reference image itself never appears in the output.*
- Rules: `CustomRef.kind` defaults to material. The final checklist calls the roster "MATERIAL ROSTER" while the block is titled "REFERENCE ROSTER" (a naming slip in the prompt).
- Reachable: yes

### D-55 · Surgical render — surfaces section rules
- Where: GEN:323-325
- Does: *Surface changes — AFTER the furniture changes above … Each label covers every visible instance … Specific labels like "Feature Wall" mean only that one wall. Cover each surface COMPLETELY within its own boundary … never spilling onto a neighbouring surface … keep every surface's existing structure, relief and pattern … When two or more surfaces are given the SAME material … they MUST end up the identical material and the same base colour … never let one wall read warmer or greyer than another sharing its material.*
- Reachable: yes

### D-56 · Surgical render — style-ambient surfaces and the style clause
- Where: GEN:252-257, 328-330, 335
- Does: detected surfaces with no pick (`unassignedSurfaces`) get, with a style: *apply the {style} aesthetic as a subtle palette shift. Same material type (wood stays wood, plaster stays plaster); shift only color temperature and accents. If in doubt, shift less.*; without a style: *keep these EXACTLY as in the input — no palette shift*. Closing clause with a style: *Apply the {style} aesthetic ({desc}) to the surface changes and style-ambient surfaces only … Don't restyle anything else*; without: *Do NOT impose any design style. Perform ONLY the listed changes … using neutral, true-to-material finishes … no aesthetic shift*; with lighting: *; the lighting change above is intentional and applies to the whole room*.
- Reachable: yes

### D-57 · Surgical render — free text, lighting fold-in, final pass
- Where: GEN:286-302, 331-348
- Does: **free text only** (no numbered changes, no lighting, no style) switches to a dedicated edit prompt: *You are editing an interior photograph. Apply the following instruction from the user … Change exactly what it asks — adding, removing, moving, recolouring, or restyling items as needed — while keeping everything the user did NOT mention identical … User instruction: {text}*. Otherwise free text rides as *Refinement — also apply this instruction … It may ADD, REMOVE, MOVE, recolour, or restyle items beyond the numbered changes*. **Lighting fold-in**: *Lighting — also change the room's lighting to the following (relight physically: re-cast shadows, highlights and reflections; do NOT add a flat tint, wash, fog, haze, or soft-focus; keep the image razor-sharp):* + the D-59 lines + the extra instruction. **Final pass before returning** checklist: all numbered changes done, none merged, nothing extra; each furniture change visibly present; preserved items and surfaces identical; every instance covered, no partial patches, no bleed; structure kept; (refs) each reference on its listed surface, at realistic scale, colours preserved; aspect ratio matches. Ends *Produce a photorealistic, sharp-focus result at the input's aspect ratio.*
- Reachable: yes

### D-58 · Surgical render — dry run
- Where: GEN:362-392
- Does: with `DRY_RUN` on or no `OPENROUTER_API_KEY`: logs the full payload (model, modalities, aspect, variants, the whole prompt, surfaces, style, image sizes, reference names, message structure) and returns `{ variants: [1…n] }` where EVERY variant is the input photo echoed back (`data:` URL) with `materials` = the surfaces sent and `furnitureChanges`.
- Rules: the usage events (`onStart` → *feature_opened*, success, failure) do NOT fire in a dry run.
- Reachable: dev / no-key only

### D-59 · Lighting sentences (`relight-prompt.ts`, shared by relight and the surgical render)
- Where: `src/lib/relight-prompt.ts:1-67`
- Does: each knob becomes one bullet. **Sun** ≤0 *It is night outside the windows — no direct sunlight; the room is lit by its interior fixtures and ambient glow.* · ≤25 *Low sun near the horizon: long, raking directional shadows and strong warm side-light entering the windows.* · ≥70 *High overhead sun: short shadows and even, top-down daylight.* · else *Mid-height sun: moderate, natural directional shadows.* **Colour temperature** *Light colour temperature about {K}K — {tone}* (≤2500 *deep warm amber / candlelight* · ≤3400 *warm amber* · ≤4600 *neutral white* · ≤6000 *cool white* · else *crisp cool blue-white daylight*) + *Make the colour shift pronounced and unmistakable — but keep it physically believable … not a flat uniform colour film*. **Intensity** ≤30 *Low overall light level … keep the image SHARP and high-contrast, never murky, foggy, hazy, or soft-focus.* · ≥70 *High overall light level: bright and clean, lifted shadows, high-key …* · else *Moderate, natural overall light level with crisp detail.* **Shadows** ≤30 *Soften the shadows by adding gentle FILL LIGHT … This is added fill light, NOT haze* · ≥70 *Deepen the shadows: strong, well-defined, high-contrast shadows … not crushed to pure black.* · else *Natural shadow depth and contrast.* **Fixtures** *Turn ON and make clearly visible (glowing, casting their own light): …* / *Turn OFF (dark, not emitting light): …* with the names *cove / LED strip lighting* · *pendant lights* · *recessed downlights / spotlights* · *accent / feature lights*.
- Rules: an unset knob adds no line; only fixtures explicitly on / off are named.
- Reachable: yes

### D-60 · Relight prompt (lighting only)
- Where: `API/render/relight:95-106`
- Does: *Relight this interior photograph. Change ONLY the lighting — the room's architecture, layout, wall/floor/ceiling finishes, materials, furniture, decor, the physical positions of every fixture, the camera angle, framing and composition must stay EXACTLY the same … This is a relight, not a redesign.* → *Apply this lighting:* the D-59 lines (none → *Tasteful, natural interior lighting.*) → *CRITICAL — relight PHYSICALLY, do not filter:* no tint / wash / gradient / fog / haze / mist / bloom / glow-diffusion / soft-focus / translucent film (*A uniform overlay or hazy veil is a FAILURE*); change the ACTUAL light and recompute shadows, highlights, reflections, falloff; PRESERVE sharpness and micro-detail exactly (*The air in the room is perfectly clear*); *Windows keep their existing view and position* → *Also: {instruction}* → *Output a photorealistic, razor-sharp photograph of the same room under the new lighting only*.
- Reachable: yes

### D-61 · The six lighting presets — the values the client sends
- Where: RC:10-39; previews `public/lighting-presets/*.jpg`
- Does: model **`google/gemini-3.1-flash-image`** (`RELIGHT_MODEL`, "model/cost never shown in-product"). Presets (sun° · K · intensity · shadows · fixtures · preview):
  - **Daylight** — *Bright, neutral sun through windows* — 70 · 5600 · 80 · 50 · all four OFF · `/lighting-presets/daylight.jpg`
  - **Golden Hour** — *Warm, low, raking afternoon sun* — 12 · 2500 · 58 · 70 · accent ON, cove / pendants / downlights OFF · `golden-hour.jpg`
  - **Warm Cozy Home** — *Dim, warm interior lamplight* — 0 · 2300 · 42 · 55 · cove ON, pendants ON, downlights OFF, accent ON · `warm-cozy.jpg`
  - **Blue Hour** — *Cool, moody dusk with accent glow* — 4 · 6400 · 32 · 60 · cove ON, accent ON, pendants / downlights OFF · `blue-hour.jpg`
  - **Overcast** — *Soft, flat, shadowless daylight* — 55 · 6800 · 46 · 25 · all four OFF · `overcast.jpg`
  - **Directional Spotlight** — *Dramatic, high-contrast accent lighting* — 22 · 4000 · 26 · 85 · downlights ON, accent ON, cove / pendants OFF · `spotlight.jpg`
- Rules: each preview is "a fixed example render of the SAME room under that lighting so studios see the actual look, not a CSS tint". Because presets spell every fixture out, a preset render always names the OFF fixtures in the prompt (B-94 lists only the ON ones). **Neutral** (`RELIGHT_NEUTRAL`) = sun 45°, 4300 K, intensity 50, shadows 50, every fixture unset. Knob ranges: sun 0–90, temperature 1800–9000 step 100, intensity 0–100, shadows 0–100 (RC:12). Fixtures (RC:14-23): `cove` *Cove / strip* · `pendants` *Pendants* · `downlights` *Downlights* · `accent` *Accent*, each unset → on → off → unset; only set ones are sent (`relightFixturesPayload`, RC:101-106).
- Reachable: yes

### D-62 · The relight route's own preset table (10 presets — dead: no caller sends `preset`)
- Where: `API/render/relight:22-35, 85-91`
- Does: `daylight` 70·5600·80·50 all off · `cool-office` 80·7000·86·40 downlights on, others off · `golden-hour` 12·2500·58·70 accent on (others unset) · `sunset` 8·2100·54·75 accent on · `ambient-evening` 3·2700·36·65 pendants + accent on · `warm-cozy` 0·2300·42·55 cove + pendants + accent on (downlights unset) · `blue-hour` 4·6400·32·60 cove + accent on · `overcast` 55·6800·46·25 all off · `spotlight` 22·4000·26·85 downlights + accent on · `midnight` 0·3100·18·70 cove + pendants + accent on, downlights off.
- Rules: a preset only seeds defaults — every explicit knob in the body wins. **No caller sends `preset`**: the studio editor sends the knobs (VZ:3030-3042) and so does the relight sandbox (its own third table, D-125) — this table is dead code that still carries the four moods the editor dropped as near-duplicates (Sunset, Ambient Evening, Midnight, Cool Office).
- Reachable: dead (no caller)

### D-63 · Live tweak — neutral, ranges and the bake
- Where: RC:51-99 (maths: B-99), RC:250-289, RC:335-358
- Does: after a relight the result panel offers four live sliders with the SAME ranges as the knobs (sun 0–90, temperature 1800–9000 step 100, intensity 0–100, shadows 0–100), seeded to the render's own values (its baseline). The on-screen look = neutral + (slider − baseline), neutral = `RELIGHT_TWEAK_NEUTRAL` { 4300 K, intensity 50, sun **90** ("overhead = no rake"), shadows 50 }. *Use this version* / *Share to Portal* bake the tweak into a **PNG** at the result's natural size (fallback 1024×768) on a canvas: brightness/contrast filter, then a soft-light temperature layer, a soft-light raking-sun gradient, a screen-blend shadow lift.
- Rules: nothing is re-rendered ("Instant colour & brightness tweaks — no re-render"); if the bake fails (e.g. the image refuses cross-origin drawing) the untouched result is used. An un-dirty panel hands back the render as is.
- Reachable: yes

### D-64 · Shared placement rules (`placement-rules.ts`) — the three absolute rules
- Where: `src/lib/placement-rules.ts:1-45`
- Does: **ABSOLUTE_RULES** (top of every Auto Furnish prompt; not used by Style Transfer): *THREE RULES YOU CANNOT BREAK:* **1. FORM IS FROZEN.** *Re-finish only these three: the FLOOR surface, the WALL paint, the paint on DOOR LEAVES. Everything else keeps its exact material, colour and profile — skirting, architraves, door and window frames, reveals, cornices, mouldings, pillars, columns, ceiling, joinery, appliances. And nothing anywhere changes position, size or shape* · **2. DOORS STAY CLEAR.** *Nothing in front of, against, touching, or inside the swing of any door or doorway … If a piece will not fit without crowding a door, leave it out.* · **3. THE CAMERA DOES NOT MOVE.** *… Your output must sit beside the input as a before/after pair and read as the same shot.* **SPATIAL_RULES** (*PLACEMENT:*): plan in plan view, each piece owns a rectangle of floor, no overlaps, ~90 cm clear routes · working faces of wardrobes / cabinets / appliances openable · everything rests on the floor (no floating, sinking, clipping) · added storage is a real object with depth (*never doors painted onto a wall surface*) · scale to the architecture (*door ~2m, worktop 90cm, seat 45cm*) · do not block windows, sockets, radiators, aircon or vents · *Furnish only the foreground room* · use the room's full depth. **LOCKED_SPATIAL_REMINDER**: *PLACEMENT: nothing moves … do not "tidy", re-align, re-space or re-orient anything — including pieces that look awkwardly placed in the original.* **PLACEMENT_SELF_CHECK**: *CHECK BEFORE OUTPUT — (1) same position, size and shape for every wall, opening, frame and trim? (2) every door clear? (3) same camera? (4) everything on the floor, un-clipped, reachable and openable? Fix anything that fails.*
- Rules: "Kept SHORT on purpose. Measured head-to-head, the compact prompt held the architecture roughly twice as well as the long one on every model tested."
- Reachable: yes (Auto Furnish, Style Transfer)

### D-65 · Auto Furnish — the ten room programs (data 2.0 will reuse)
- Where: AFP:19-175 (`ROOM_PROGRAMS`)
- Does: each room type names its **essential** pieces, **optional** pieces (added by density), a **preserve** list ("Fixed things typical of THIS room type that renders keep destroying") and **layout** conventions:
  1. **living — Living room.** Essential: *sofa · coffee table · area rug · floor or table lighting*. Optional: *armchair · media console · TV · side table · bookshelf · wall art · floor plant · curtains*. Preserve: *existing built-in shelving or media joinery · radiators · air-conditioning units · power sockets*. Layout: seating faces the focal point (window, feature wall, fireplace, TV wall) · the sofa's back against a wall or defining a zone, *never floats mid-floor without purpose* · the rug under at least the front legs, on the room's axis · ~40 cm sofa-to-coffee-table and a walking route behind or beside.
  2. **bedroom — Bedroom.** Essential: *bed with headboard and dressed bedding · two bedside tables · bedside lighting*. Optional: *wardrobe · chest of drawers · bench at the foot of the bed · area rug · wall art · curtains · reading chair*. Preserve: *fitted wardrobes already present · radiators · air-conditioning units · power sockets*. Layout: headboard on the longest uninterrupted wall, centred, *never under or across a window* · ~60 cm clear each side of a double · a bedside table on each accessible side, level with the mattress · wardrobe / chest swing clear.
  3. **kids-bedroom — Kids' bedroom.** Essential: *single or bunk bed with bedding · bedside table · study desk and chair*. Optional: *toy storage · bookshelf · soft rug · playful wall art · curtains · floor cushions*. Preserve: *fitted wardrobes already present · radiators · power sockets*. Layout: bed against a wall to free play floor; a bunk needs headroom · desk facing a window or well-lit wall with chair pull-out room · a clear run from bed to door.
  4. **dining — Dining room.** Essential: *dining table · dining chairs · pendant or ceiling light over the table*. Optional: *sideboard or buffet · area rug · wall art · display shelving · curtains*. Preserve: *existing pendant positions and ceiling outlets · radiators · power sockets*. Layout: table centred on the room or the ceiling outlet, pendant directly above · ~90 cm behind every chair · chair count matches the table.
  5. **kitchen — Kitchen.** Essential: *worktop styling · task lighting*. Optional: *bar stools at the island or counter · open shelving with crockery · small appliances · fruit bowl and utensil crocks · plants*. Preserve: *every existing cabinet, worktop, splashback and handle · the sink, tap, hob, oven, extractor, fridge and every other appliance — exactly where they are · plumbing, sockets and switches*. Layout: *This room is mostly FIXED. You are styling worktops and adding loose items only* · keep the sink–hob–fridge work triangle clear · stools tuck under the overhang.
  6. **living-dining — Living + dining (open plan).** Essential: *sofa · coffee table · area rug under the sofa · dining table · dining chairs*. Optional: *media console · pendant light over the dining table · armchair · sideboard · wall art · floor plant*. Preserve: *existing kitchen or media joinery and appliances · radiators · power sockets*. Layout: two distinct zones (the rug anchors living, the pendant / outlet anchors dining) · a clear circulation spine to every doorway · ~90 cm chair pull-out; seating faces the living focal point.
  7. **study — Study / home office.** Essential: *desk · task chair · task lighting*. Optional: *bookshelf · filing or storage cabinet · reading chair · area rug · wall art · desk plant*. Preserve: *existing built-in shelving or desks · radiators · data and power sockets*. Layout: desk near natural light, ideally side-on to the window · full chair pull-out and a route to the door · never across a doorway.
  8. **bathroom — Bathroom.** Essential: *towels · vanity styling*. Optional: *mirror · plant · bath mat · storage basket · toiletry tray*. Preserve: *every piece of sanitaryware — basin, WC, bath, shower, tap and screen — exactly where and what it is · all tiling, splashbacks and existing vanity joinery · plumbing, extract vents and shaver sockets*. Layout: *almost entirely FIXED … soft items and styling only* · shower door / bath edge clear, floor in front of WC and basin free.
  9. **balcony — Balcony / outdoor.** Essential: *outdoor seating · small outdoor table*. Optional: *planters · outdoor rug · string or lantern lighting · side stool*. Preserve: *the balustrade or railing and its full height · the view beyond · drainage outlets, service units and the building facade*. Layout: nothing blocks the door back in; *nothing is placed against the railing in a way that could be climbed* · outdoor-grade, small footprint, a clear route door → rail.
  10. **entryway — Entryway / foyer.** Essential: *console or shoe cabinet · mirror*. Optional: *bench · coat hooks · runner rug · table lamp · tray for keys · plant*. Preserve: *the front door and its full swing · existing shoe or coat joinery · the consumer unit, intercom and switches*. Layout: *The entry door's swing arc stays completely empty — this is the single most common failure in a hallway* · furniture hugs one wall; a runner follows the direction of travel.
- Rules: "Deliberately generic pieces, not products — the STYLE decides what a "sofa" looks like; the program only decides that a sofa belongs here at all." Several preserve lists name radiators (a European default in a Singapore product).
- Reachable: yes (Auto Furnish)

### D-66 · Auto Furnish — densities and which pieces are named
- Where: AFP:177-240
- Does: three densities (label · hint · clause): **Minimal** — *Essentials only — airy, staged-to-sell* — *MINIMAL — place the essential pieces and nothing more. Leave generous empty floor. The room should feel calm, spacious and professionally staged, not sparse or unfinished.* · **Balanced** (the route's default) — *Essentials plus a few extras — lived-in* — *BALANCED — the essential pieces plus a handful of the optional ones …* · **Fully furnished** — *Complete scheme with decor and styling* — *FULLY FURNISHED — a complete scheme: every essential piece, most of the optional ones, plus styling (textiles, art, plants, objects). Rich and finished, but never cluttered*.
- Rules: `resolveProgram`: an explicit `include` list overrides the program entirely; minimal = essentials; balanced = essentials + the FIRST THREE optionals; full = essentials + every optional; an unknown room type names nothing (*- an appropriate set of furniture for this room type*).
- Reachable: yes

### D-67 · Auto Furnish — the prompt (`buildAutoFurnishPrompt`)
- Where: AFP:242-323
- Does: in order: the three absolute rules (D-64) → *Add furniture to this photograph of an empty {room}. Every pixel not covered by something you add stays identical to the input, apart from the three finishes allowed above.* → the catalogue block (D-69, sandbox only) → *ADD, standing on the floor of this room:* + the pieces → the density clause → *STYLE: {name} — drives the furniture, textiles, decor, and the three allowed finishes. Nothing else.* → *NEVER TOUCH, in a {room}: {preserve}* → *HOW A {ROOM} IS LAID OUT:* + layout lines → SPATIAL_RULES + *Fit the room's real footprint, anchor to its focal point, and match its own shadow direction and white balance.* → *SURVEY — every feature below must still be present and unchanged:* (room notes, D-72) → *THIS PHOTOGRAPH:* (detection anchors) → *Do not include: {exclude}* → *Also: {instruction}* → the self-check → *OUTPUT: the same photograph with furniture added — same architecture, camera, lighting direction and sharpness. No collage, text, watermark or border.*
- Rules: ONE prompt version ("the long "full" variant was retired after measuring that the short one held the architecture roughly twice as well"). The style paragraph from `STYLE_PROMPT_MAP` is resolved by the route but the builder only prints the style NAME.
- Reachable: yes

### D-68 · Auto Furnish — detection anchors and door no-go bands
- Where: AFP:258-297
- Does: detected items become a spatial map on a **0–100 grid** ("models handle whole numbers more reliably than decimals"): *This photograph shows {context}.* · *SURFACES — each must still exist at the same place, size and shape, and keep the material listed unless rule 1 allows re-finishing it: {label [x.. y..]}* · *ALREADY HERE — keep exactly as-is and furnish around: …* · every detected label matching door / doorway / entry / entrance / archway becomes a band *{label}: keep x{c−12}-x{c+12} clear across the whole floor* under *NO-GO — keep these floor bands completely empty, not even a rug edge:* · *Coordinates are [x y] on a 0-100 grid … confirm it overlaps no anchor above and no no-go band.*
- Rules: `DOOR_HALF_WIDTH = 12` ("approximates a door plus the floor its leaf sweeps"). The route caps anchors at 12 surfaces + 10 existing items, labels at 120 chars, context at 300, and drops coordinates outside 0–1.
- Reachable: yes

### D-69 · Auto Furnish — pinning studio catalogue products (sandbox only)
- Where: `src/lib/catalogue-furnish.ts:1-102`; used only by SBX/auto-furnish and `API/render/auto-furnish`
- Does: pins named products from the studio's `studio_material_catalog` into the render as images 2…N: *SPECIFIED PRODUCTS — these are real items the studio sells, and the client will be quoted for exactly what they see. Getting them wrong makes the render useless.* · *IMAGE 1 = THE ROOM …* · *IMAGE {n} = the {slot} you must place: "{name}" by {vendor}. Reproduce THIS product — its shape, proportions, material, colour and finish* · rules: take the object not the picture; relight and reshadow it in the room's light; *Do not substitute a similar-looking piece, and do not restyle a product to suit the scheme. If a specified sofa is oatmeal linen, it stays oatmeal linen*; no duplicates; anything not specified is the AI's choice in the style.
- Rules: at most **4** picks (`MAX_CATALOGUE_PICKS`, "Beyond that the model starts blending references"); product images compressed to **640 px** at quality **0.8**; slot ↔ category hints (sofa/armchair/chair/seating/stool/bench/couch → Seating, Furniture; table/desk/console → Tables, Furniture; bed/headboard → Beds, Furniture; wardrobe/cabinet/chest/drawers/sideboard/shelf/shelving/storage → Storage, Furniture, Joinery; lamp/light/pendant/lighting → Lighting; rug/carpet → Rugs, Soft Furnishings, Flooring; curtain/blind → Soft Furnishings, Window); a total price only when every pick is priced ("so a total can be shown honestly"). The studio editor never sends `catalogue`.
- Data: `CataloguePick { id, name, category, vendor, priceCents, slot }`.
- Reachable: internal sandbox only

### D-70 · Auto Furnish — the emptiness pre-check prompt
- Where: AFP:325-365
- Does: *Look at this interior photograph and judge how furnished it is.* → JSON `{ state: "empty | partly furnished | furnished", roomTypeGuess: <one of the ten ids> | "unknown", existing: [...] }`. Rules given: *"empty" means no freestanding furniture. Built-in joinery, fitted kitchens, wardrobes, radiators and light fittings do NOT count* · partly = one or two freestanding pieces · furnished = substantially furnished · *existing* lists only freestanding furniture · guess the type from architecture and built-ins, else *unknown*.
- Rules: `coerceEmptinessReport` never throws: an unknown state → *empty*; a guess that is not one of the ten program ids → *unknown*; at most 10 existing items. Purpose: "running it on an already-furnished one produces a cluttered mess, so the UI warns first rather than silently wasting a render". Which route asks it: D-96 (room-scan).
- Reachable: yes (the editor's pre-flight scan, C)

### D-71 · Style Transfer — aspects, strengths, geometry locks, reference roles (the words)
- Where: STP:83-161
- Does: **Aspects** (what transfers; anything off is preserved) — *Colour palette* (*Wall / textile / accent colours*) · *Materials & finishes* (*Flooring, joinery, stone, metal*) · *Furniture style* (*Swaps forms — needs flexible geometry*) · *Lighting mood* (*Warmth, contrast, fixture character*) · *Decor & styling* (*Art, plants, textiles, objects*). ON clauses, e.g. *COLOUR — adopt the reference's colour palette across walls, textiles, joinery and accents.* · *LIGHTING — … Relight physically …; never lay a colour wash or haze over the image.* OFF clauses, e.g. *COLOUR — keep every existing colour exactly as in the room photo.* · *LIGHTING — keep the room photo's existing lighting exactly: same sources, direction, colour temperature, brightness and shadows.* **Strength** — *hint*: *SUBTLE — … "the same room, better". Roughly a 25% shift.* · *balanced*: *… Roughly a 60% shift.* · *full*: *FULL — commit completely … Roughly a 95% shift.* **Geometry** — *locked*: *GEOMETRY LOCKED. … you may only re-finish, re-colour and re-upholster what is already there. Do not add, remove, move or resize a single object.* · *structural*: *STRUCTURE LOCKED, FURNISHING FREE. … keep each piece's function, rough footprint and position (a sofa stays a sofa on the same wall).* · *flexible*: *STRUCTURE LOCKED, LAYOUT FREE. … it must be provably the same room from the same tripod. Everything inside is open*. **Reference roles** (per image, "mirrors mnml's per-reference modes") — *Overall vibe* · *Palette only* · *Materials only* · *Furniture only* · *Lighting only*.
- Rules: C owns the controls that pick these.
- Reachable: yes

### D-72 · Style Transfer / Auto Furnish — the room survey (`buildRoomAnalysisPrompt`, `formatRoomNotes`)
- Where: STP:54-81, 163-285
- Does: a text model surveys the ROOM before a pass that may move furniture: *You are a space planner surveying this room photograph before it is restyled. Identify only what constrains where furniture can go.* → JSON `{ roomType, openings[{kind: door|doorway|sliding door|window|stairs, location, note}], circulation[], fixed[], partitions[{kind: glass partition|screen|half-wall|balustrade|archway, location, beyond}], primaryZone, dimensions{widthM, depthM, heightM, confidence: high|medium|low}, wallSpace[] }`. Rules given: *Report only what is VISIBLE. Never guess at a door you cannot see, and never invent a socket.* · *Be precise about WHICH WALL each opening is on — this is the single most important field.* · door swing in *note* when visible · empty arrays are correct · *PARTITIONS matter most* · primaryZone = the foreground room only · DIMENSIONS from cues (*a door is about 2.0m tall, a worktop 0.9m, a floor tile commonly 0.6m, a ceiling usually 2.4-3.0m*), *always give numbers* · WALL SPACE: walk each wall. The notes print as: *Room: …* · *Door: {kind} — {location}. {note} — keep clear.* / *Opening: …* · *Keep clear: …* · *Fixed, do not obstruct or remove: …* · *Room size ({confidence} confidence): ~{w}m wide x {d}m deep x {h}m high — scale to this and use the full depth.* · *Wall space: …* · *Work ONLY in this zone: …* · *Partition: {kind} — {location} — everything beyond it ({beyond}) is a different room; change nothing there.*
- Rules: `coerceRoomNotes` never throws; dimensions are kept only with a real width AND depth (0–100 m), height defaults to **2.7 m**, confidence defaults to *low*; notes are "usable" when any field carries something. Style Transfer only prints the survey when geometry is not locked.
- Reachable: yes

### D-73 · Style Transfer — stage 1: the style brief (`buildStyleAnalysisPrompt`, `StyleSpec`)
- Where: STP:20-52, 287-333, 413-456
- Does: *You are an interior designer writing a style brief. Analyse {this interior reference image | these N interior reference images as ONE combined mood board} and extract ONLY its transferable aesthetic … Describe the LOOK, never the specific room.* → JSON `{ styleName (2-4 words), summary, palette[{hex, role: walls|floor|large upholstery|accent|metal|timber}], materials[], finishes[], furniture[], lighting, decor[], avoid[] }` with *4-6 palette entries, real hex values sampled from the image(s)* · *3-6 entries in each of materials, furniture, decor. 2-4 in finishes and avoid.* · *Be specific ("smoked oak veneer"), never generic ("nice wood").* Printed to the renderer as *Style name: … · Summary: … · Palette: #hex (role), … · Materials: … · Finishes: … · Furniture language: … · Lighting: … · Decor: … · Avoid: …*.
- Rules: why a spec: "image models given two photos routinely copy the REFERENCE's geometry … Naming the aesthetic explicitly in text … pins the transfer to style tokens and lets the user see (and edit) what was extracted before paying for a render." `coerceStyleSpec` keeps only palette entries that are valid hex (#3–8 digits; bare strings allowed); a spec is "usable" with any palette, materials, furniture or a summary.
- Reachable: yes (`/api/render/style-analyze`)

### D-74 · Style Transfer — stage 2: the render prompt (`buildStyleTransferPrompt`)
- Where: STP:335-411
- Does: *Restyle the interior in IMAGE 1 to match the aesthetic of the style reference image(s).* → *IMAGE ROLES — read carefully:* *IMAGE 1 = THE ROOM … the sole authority for architecture, layout, camera angle and framing.* + *IMAGE {n} = STYLE REFERENCE {k}. Aesthetic source only — use it for {the OVERALL AESTHETIC | COLOUR PALETTE ONLY | MATERIALS AND FINISHES ONLY | FURNITURE DESIGN LANGUAGE ONLY | LIGHTING MOOD ONLY}.* → *NEVER copy the reference's room. … You are borrowing its taste, not its floor plan.* → the geometry clause → *WHAT IS ACTUALLY IN IMAGE 1:* (detected context + *Its real surfaces are: … Anything on this list that is NOT covered by a transferred dimension above must come back identical*) → SPATIAL_RULES (or the locked reminder) → *SURVEYED FACTS about this specific room — treat these as ground truth* → *STRENGTH:* → *TRANSFER these dimensions* (none → *(none selected — make no stylistic change)*) → *PRESERVE these dimensions exactly* → the spec tokens (*take precedence over your own reading of the reference image*) → *KEEP UNCHANGED (client requirement, overrides everything above): …* → *Also: …* → the self-check → *OUTPUT: one photorealistic photograph of the SAME room from the SAME camera position … No collage, no side-by-side, no text, no watermark, no border.*
- Rules: image order MUST be [room, ...references] ("the numbering is the only thing telling the model which is which"); with no roles every reference is *overall*.
- Reachable: yes

### D-75 · Detection — model, output shape and the never-fail rule (`runDetect`)
- Where: DET:1-20, 168-288
- Does: one vision call (**`google/gemini-3-flash-preview`**, "most accurate of the candidates, deterministic, ~$0.0025/call"; 2.5 Flash "under-detected surfaces and mis-placed surface points") with max 6,000 tokens and a 30 s abort. Returns `{ surfaces[{label, x, y}] (≤12), furniture[{label, category, x, y}] (≤15), imageType: "photo"|"sketch", sketchSubtype: "3d-model"|"hand-drawn"|"photo-of-drawing"|null, roomContext (≤300 chars) | null }` with x/y normalised 0–1 from the model's `[y, x]` 0–1000 points.
- Rules: refuses only *No image provided* (400) and *Image too large (max 10MB)* (413, >14,000,000 base64 chars). **Every other failure still answers OK**: a model error, a timeout or an unparseable answer returns the defaults — surfaces *Floor* (0.5, 0.85) · *Walls* (0.5, 0.35) · *Ceiling* (0.5, 0.08), no furniture, *photo*, no context — so the editor never sees a detection error from the model. A missing / invalid classification degrades to *photo* ("never a broken sketch path"); a subtype is kept only for a sketch. Furniture category is NOT checked server-side (anything, default *Decor*); a furniture label defaults to *Unknown*. **Dry run** returns a fixed sample: surfaces *marble floor* · *grey painted back wall* · *white plaster ceiling* · *dark wood upper cabinets*; furniture *beige sofa (center-left)* (Seating) · *wooden coffee table (center)* (Tables) · *glass pendant light (top-center)* (Lighting); *photo*; context *a living room with a feature wall and large windows* ("Flip imageType to "sketch" … to exercise the sketch-mode UI without credits").
- Reachable: yes (every upload, version switch, room open)

### D-76 · Detection — the surface rules the model is given
- Where: DET:22-35
- Does: surfaces are *the distinct re-materialable surface ZONES of the room, split by MATERIAL / finish — NOT just by architectural part*, each `{"label":"{material/finish} {surface} ({position})","point":[y,x]}`. Rules: **point** on a visible patch of the surface's OWN material, on its largest visible area, never on furniture, an edge or a seam; a floor mostly covered still gets an entry but the point must land on *real exposed floor you could walk on* · **split** a multi-material wall into separate entries; the same finish in two clearly separate areas = two entries · **no duplicates** of one continuous plane · **be complete** — a checklist: the Ceiling, EACH visible wall (back, left, right) even when they share a finish, the Floor, each cabinet / joinery / wardrobe / shelving run (upper and lower separately if different), each Countertop, Backsplash, feature panels, prominent window or door frames; never invent · **side walls** are *the most commonly MISSED surface* — scan the far-left and far-right edges, include a sliver · **MANDATORY** at least one floor and one ceiling entry · **label style**: material / finish FIRST (*"dark wood upper cabinets"*, *"grey painted back wall"*, *"marble floor"*, *"white plaster ceiling"*, *"wood slat paneling (left)"*, *"tiled backsplash"*), NEVER a bare *wall* / *cabinets* / *floor* / *ceiling* · **architectural finishes only** — appliances and freestanding furniture belong in furniture · **up to 12**.
- Reachable: yes

### D-77 · Detection — the furniture rules and the suppression list
- Where: DET:37-65, 200
- Does: *up to 15 replaceable PRIMARY pieces a designer would physically swap out* (seating, tables, beds, storage / joinery-as-furniture, lighting FIXTURES, ceiling fans, large floor rugs, wall art / mirrors, large floor plants, major appliances, bathroom fixtures); *ALWAYS include a ceiling fan when one is visible* (as Fixtures). **One entry per instance** with its own point on the object's visual centre (*a row of 9 pendant lights → 9 entries; a set of 6 dining chairs → 6 entries*), disambiguated by position (*"pendant light (left)"*); *ANTI-LOOP: never output the same entry twice and never reuse a point*. Labels singular, plain words with spaces, *"{color/material} {object} ({position})"*, under 60 chars. **Category** EXACTLY one of *Seating · Tables · Storage · Beds · Lighting · Decor · Appliances · Fixtures* (mapping given: art / mirrors / posters → Decor; lamps / sconces / chandeliers / pendants → Lighting; bookshelves / wardrobes / dressers / cabinets / sideboards → Storage; sofas / armchairs / dining chairs / stools / benches / ottomans → Seating; dining / coffee / side / console tables, nightstands, desks → Tables; beds / headboards → Beds; fridges / ovens / dishwashers / microwaves → Appliances; sinks / baths / toilets / showerheads / vanities → Fixtures). **SUPPRESSION** told to the model: bedding on a bed (treat the bed as one item), small tabletop accessories, hardware / fittings, plants under ~30 cm or on furniture, air vents, smoke detectors.
- Rules: `SUPPRESSED_LABEL_PATTERNS` then drop, server-side, whatever the model still returns: (1) *duvet · comforter · quilt · coverlet · bed skirt · bedskirt · bed sheet · fitted sheet · pillow sham · throw pillow · decorative pillow · accent pillow*; (2) *pillow / blanket / throw* followed by *on / left on / right on / center on / in / atop* a *bed / sofa / couch / chair / armchair*; (3) *book · books · stack of books · coaster(s) · candle(s) · tissue box · remote · mug · tray · coffee mug · tea cup* followed by a "(" position; (4) *door handle · drawer pull · light switch · power outlet · air vent · smoke detector*. Grouping identical items is done client-side (B-82).
- Reachable: yes

### D-78 · Detection — sketch classification and the output order
- Where: DET:187-203
- Does: step 0 asks for *imageType* — *"photo" if it is a real photograph of a finished/built room. "sketch" if it is NOT a finished photo — a hand drawing, a marker/pencil/pen sketch, a 3D-model/CAD/SketchUp screenshot, a render-style line drawing, a whiteboard drawing, or a photo of any such drawing. When unsure, prefer "photo".* · *sketchSubtype* (*3d-model* = crisp CAD/SketchUp; *hand-drawn* = loose pencil / pen / marker; *photo-of-drawing* = a photographed drawing or whiteboard; else null) · *roomContext* = *a short plain caption of the room and its key built elements, e.g. "a kitchen with an island and upper cabinets". Used to guide rendering.* A sketch still gets surfaces and furniture (*so the render step knows the intended layout*).
- Rules: *Put imageType, sketchSubtype and roomContext FIRST so they survive truncation*; the answer must be one compact JSON line, coordinates integers 0–1000, origin top-left, y top→bottom; a worked example line is included.
- Reachable: yes

### D-79 · Detection — the salvage parser (`parseDetectResponse`)
- Where: DET:67-166
- Does: tolerates code fences, trailing prose and **truncation**: (1) plain JSON; (2) a string-aware depth scan finds the outer object's close; (3) on truncation, keeps everything up to the last COMPLETE item inside the surfaces / furniture arrays and closes the open brackets, "so we return whatever items DID complete instead of throwing everything away". Surface entries accept `{label, point:[y,x]}`, a `box_2d` (centre used), legacy `{x, y}` 0–1, or a bare string (centred dot); `name` is accepted for `label`. Points are clamped to 0–1.
- Rules: nothing salvageable → defaults (D-75), logged.
- Reachable: yes

### D-80 · Segmentation masks (`runSegment`) — used by the masked surface render
- Where: SEG:1-105
- Does: **`google/gemini-2.5-flash`** ("Gemini's native segmentation capability") returns per requested label a `box_2d` [ymin, xmin, ymax, xmax] 0–1000 and a base64 PNG mask within that box. Prompt: *Give the segmentation masks for these specific surfaces in the room image: "…". … (white = the surface, black = not) … Segment the FULL extent of each surface — the entire plane, including parts in shadow or partly behind furniture — but do not include neighbouring surfaces. If a requested surface is not visible, omit it.*
- Rules: up to **12** labels (trimmed, blanks dropped; none → *No labels provided* 400); 16,000 tokens; 30 s abort; a truncated answer keeps every complete mask object. Like detection it never fails on the model side: an error or no parse → `{ masks: [] }`. **Dry run** → `{ masks: [] }` (so a dry run always takes the un-masked path). Purpose: "the mask confines the re-materialed pixels to the surface so the material can't bleed onto neighbours" (C's Route C).
- Reachable: yes (surface-only renders)

### D-81 · Defurnish — the two scopes and the prompt (`runDeclutter`)
- Where: DEC:1-135
- Does: two customer-facing depths ("movable-only and "totally bare" are intentionally not offered — bare produced the same result as strip-to-shell in practice"): **joinery** (default, "gut everything non-structural → plain bare shell ready to renovate"): remove ALL furniture, people, rugs, decor, plants, clutter, accessories, free-standing AND built-in appliances (*fridges, washing machines, dryers, ovens, hobs, dishwashers, aircon units*), wall TVs, artwork, mirrors, wall lights, AND all built-in joinery (built-in cabinets, islands, countertops, wardrobes, built-in and floating shelving, floating media units, wall ledges), AND all wall panelling / timber / slatted cladding / feature-wall treatments — *wall cladding counts as a finish to strip, NOT as architecture to keep … that wall must come back PLAIN and painted*; also flatten protruding boxes, plinths, bulkheads, ledges, niches, alcoves and media recesses; keep only the true structural shell (*true load-bearing columns and beams — NOT decorative slatted columns*), windows, doors, the existing floor and the ceiling lights. **keep-builtins** ("Lighter"): remove all furniture (free-standing and floating), rugs, decor, plants, clutter, accessories, wall TVs, artwork, floating media units and wall lights; KEEP wall panelling / cladding, fitted wardrobes and cabinetry, the shell, ceiling lights and all finishes (*The wall panelling especially must remain exactly as it is*). Then: *This is a defurnishing edit for renovation — the output MUST be visibly emptied. Returning the image unchanged, or nearly unchanged, is a FAILURE* · MANDATORY: removed items completely gone (*ZERO fragments, outlines, ghosting, shadows, or reflections*); reconstruct touched surfaces matching the ADJACENT surface (plain painted wall ONLY where panelling / joinery itself was removed) · KEEP EXACTLY: the shell *same positions, sizes, and COUNT* — stripping a wall never creates *a new window, opening, or doorway*; the floor keeps its material; camera, framing, aspect; the room's lighting and exposure · *Also remove: {extra}* · *Output a photorealistic, sharp photograph of the same room, now genuinely empty.*
- Rules: default model **`google/gemini-3.1-flash-image`** (the 2026-06-23 evaluation: "cleanest removal + faithful architecture at ~half the cost of Gemini 3 Pro"); allowlist flash / `gemini-3-pro-image` / `gemini-2.5-flash-image` / `flux.2-pro`, anything else is clamped to the default ("so the route can't be driven to bill an unexpected/expensive model"). One retry when the model answers without an image — but a THROWN upstream failure (e.g. OpenRouter's empty-body "no choices") is not retried here, unlike Style Transfer, Auto Furnish and drift fix, whose loops catch it; 120 s abort. Errors *Missing image* 400 · *Image too large (max 10MB)* 413 · *No image in AI response — please try again* 502 · *Generation timed out — try again* 504 · *Generation failed: {msg}* 502. **Dry run** → the input photo echoed back, `cost: null`. The panel's scope words are B-112's.
- Reachable: yes

### D-82 · Drift detection — the six categories, the severities and the judge's rules
- Where: RD:13-130
- Does: a "quality inspector" compares IMAGE 1 (original) with IMAGE 2 (restyle): *find what is objectively WRONG with IMAGE 2 — not what you dislike about it. Taste, colour choices and styling decisions are NEVER violations. Only report things that would embarrass a designer in front of a client.* Movement allowed by geometry: *locked* → *NOTHING was allowed to move* · *structural* (default) → furniture may be replaced keeping function, footprint and position; shell and camera identical · *flexible* → furniture and layout free; shell and camera identical. Scope lines from the context: preserved dimensions, intentionally changed ones (*must NOT be reported*), the keep list, and the original's surface read as a baseline. **Categories** (label shown in sandboxes): **structure** *Structure moved* — a wall / window / door / ceiling / floor plane moved, resized, appeared or vanished, or the camera shifted; INCLUDES a wall turned into cabinetry (doors, seams or handles painted onto a wall), a new niche cut into a wall, a wall clad to fake built-ins · **opening** *Opening blocked* — ANY object in front of, against, touching, leaning on, across, partly over, or inside the swing of a door / doorway / sliding door / wardrobe or cupboard door, or a walking route cut off; *contact alone is a violation* · **physics** *Physically impossible* — floats, sinks, leans impossibly, clips · **scale** *Wrong scale* (door ~2 m, worktop 90 cm, seat 45 cm) · **access** *Unreachable* — beyond a glass partition, screen, half-wall or balustrade, in an adjacent room, wedged unopenable, no walkable route (*if a person standing in this room would have to leave it to touch the object*) · **scope** *Changed something locked*. **Severity**: *blocking* — a client would immediately notice (blocked door, moved wall, changed camera, clipping / floating, unreachable piece); *warning* — noticeable to a professional, not fatal.
- Rules: answer JSON `{ violations[{category, severity, object, location, detail}] }`; *An empty array is the CORRECT answer for a good render. Do not invent problems*; each problem once; never report colour / material / finish / furniture style / lighting mood / decor; **max 6**, the worst. `coerceDriftReport`: unknown categories dropped; a violation with neither object nor detail dropped; a missing severity = blocking; **structure and opening are ALWAYS blocking whatever the judge said** ("forcing them to blocking also guarantees the repair pass fires rather than the render shipping with a yellow badge"). Score = blocking × 10 + warning × 1 (lower is better). Summary line: *No issues found* · *{n} minor issue(s)* · *{Category label}: {object}* · *{n} placement problems*.
- Reachable: yes (restyle, style transfer, auto furnish — C-17)

### D-83 · Drift repair — the correction prompt and the guard's rules
- Where: RD:132-180; DG:1-196
- Does: IMAGE 1 = the drifted render, IMAGE 2 = the original (*included ONLY so you can see the true architecture, camera angle and proportions*): *Repair specific faults in IMAGE 1* + the numbered faults *{n}. [{category}] {object} — {location}. {detail}* + *Fix EXACTLY those faults and nothing else*: keep IMAGE 1's colours, materials, finishes, furniture style, lighting and decor (*This is a repair, not a restyle — the look is already approved*); restore moved / changed things to IMAGE 2; move a door-blocking object *to the nearest sensible clear position*; seat floating / clipping objects; restore a wall turned into cabinetry and stand storage in front of it; move an unreachable piece *into the main room in the foreground*; add / remove / restyle nothing else; + the original's surfaces to restore to; + *OUTPUT: one photorealistic photograph from the SAME camera position as IMAGE 1 …*. The client guard: shrink both images to **1024 px / JPEG 0.8** for the check ("The detector reads composition, not texture"), **1280 px / 0.88** for a repair ("its input sets the output resolution"); if blocking faults: up to **2** escalating repairs, each re-checked and targeting only what is STILL blocking; every candidate, the untouched render included, is scored and the lowest wins.
- Rules: "Every failure path is non-fatal. The user already paid for the render — a detector that errors must hand back the render untouched, never block it." A repair with no verdict is discarded. Result `{ imageUrl, report, repaired, unrepaired }`. Only BLOCKING violations are sent to the repair.
- Reachable: yes (automatic)

### D-84 · Image preparation helpers (HEIC, bucket crop, compress)
- Where: NI:1-53; CB:1-130; CI:1-27
- Does: **`normalizeImageFile`** — HEIC/HEIF (by MIME `image/heic|heif|heic-sequence|heif-sequence`, by `.heic/.heif` extension, or — only for an empty or `application/octet-stream` type — by probing the bytes) is converted to **JPEG at quality 0.92** with the `heic-to` WASM (loaded only when a HEIC arrives), renamed `{name}.jpg`; everything else passes untouched ("Chrome, Firefox and Edge CANNOT decode HEIC/HEIF … iPhone photos are HEIC by default"). **`cropToBucketAspect`** — centre-crops a photo to the NEAREST of seven buckets (16:9 · 3:2 · 4:3 · 1:1 · 3:4 · 2:3 · 9:16) so the model's output lines up with the input on the compare slider (the example: 1200×630 → Gemini returns 1344×768, "a 7% aspect mismatch"); within 0.5 % of a bucket it returns the original untouched (no re-encode); otherwise re-encodes as PNG when the hint is PNG, else JPEG at 0.95. **`compressBase64`** — downscales to fit `maxDim` (default **2048 px**) and re-encodes as **JPEG** (default quality **0.95**) "so the payload stays under Vercel's 4.5 MB limit"; a decode failure returns the ORIGINAL bytes with width/height 0 (callers must check).
- Rules: HEIC failure message *Couldn't read this HEIC photo — please try a JPG, PNG, or WebP.* Crop errors *Image has zero dimensions* · *Canvas 2D context unavailable* · *Image load failed*. B-35 records which sizes the editor applies where.
- Reachable: yes

### D-85 · The OpenMaison watermark (anonymous trial only)
- Where: MARK:1-10; `src/lib/render/trial-gate.ts:1-55`; `src/lib/render/trial-quota.ts:1-37`
- Does: `openmaison-mark.ts` inlines the white OpenMaison logo (mark + wordmark, viewBox 885×173) generated from `public/logo-full-mono.svg` ("do not edit by hand"; a test fails if it drifts). `watermarkTrialImage` stamps it bottom-right on every anonymous-trial output: width ~13 % of the image clamped to 110–260 px (never over 40 % of a tiny image), padding max(12 px, 1.8 %), a soft dark drop shadow, opacity 0.92, output JPEG quality 88; on any failure it returns the image unmarked. Trial rules: `trialEnabled()` = always outside production, else only with `TRIAL_VISUALIZER_ENABLED=true`; quota cookie `om_trial_v1` (HMAC-signed `{ generations }`), `TRIAL_LIMIT = 3`, counting any of render / photorealistic / declutter.
- Rules: studio renders are never watermarked. A's G section owns the trial pages.
- Reachable: trial only (flagged off in production by default)

---

## D3 · The routes

Every `/api/render/*` route shares one frame: `POST` only; the `qanvast_session` cookie verified by `verifySession` (no cookie → *Unauthorized* 401, bad cookie → *Invalid session* 401); **no role check** (any signed-in member of any role may call any render route) and **no studio scoping** (nothing is read from or written to the database — the routes are stateless model calls; persistence is the client's job through the jobs / rooms routes); an **in-memory per-IP rate limit** per route key over a 60 s window (`src/lib/rate-limit.ts`: per server instance, lost on a cold start) answering *Too many requests* 429. "Dry run" = the file's `DRY_RUN` constant (false everywhere) OR a missing `OPENROUTER_API_KEY` — so **an environment without the key simulates every route** as listed in D-116.

### D-86 · `POST /api/render` — the surgical render
- Where: `API/render:1-40` → GEN (D-49…D-58)
- Does: auth → rate limit **10 / min** (key `render`) → `runGenerate(body)` → `{ variants[{id, imageUrl, materials, furnitureChanges?}] }`.
- Rules: `maxDuration = 60` s while the core's own abort is 120 s — the platform kills the function before the core's *Generation timed out* can ever answer (likewise every 60 s route with a 120 s abort: photorealistic, relight, declutter, outpaint, reangle, depth). The body is parsed WITHOUT a try/catch, so malformed JSON is an unhandled 500 (every other render route answers *Invalid request* 400). Usage events (A owns the funnel): the core's `onStart` records **`feature_opened`** (at render start, not at page open), success `feature_succeeded` with `render_ms`, failure `feature_failed` with the message, all `ai_visualizer`.
- Data: body = `GenerateInput` (D-49); writes nothing.
- States: D-49's errors verbatim.
- Reachable: yes (the editor's surgical Generate)

### D-87 · `POST /api/render/detect`
- Where: `API/render/detect:1-21` → DET (D-75…D-79)
- Does: auth → rate limit **20 / min** (`render-detect`) → `{ imageBase64, mimeType }` → `runDetect` → `{ surfaces, furniture, imageType, sketchSubtype, roomContext }`.
- Rules: no `maxDuration` export (platform default); the core's abort is 30 s; model errors never surface (defaults returned). Body parsed without try/catch.
- Data: writes nothing.
- States: *No image provided* 400 · *Image too large (max 10MB)* 413.
- Reachable: yes (upload, version switch, lasso re-detect, the trial)

### D-88 · `POST /api/render/segment`
- Where: `API/render/segment:1-22` → SEG (D-80)
- Does: auth (a missing OR invalid cookie both → *Unauthorized* 401) → rate limit **20 / min** (`render-segment`) → `{ imageBase64, mimeType, labels[] }` → `{ masks[{label, box_2d, mask}] }`.
- Rules: no `maxDuration`; 30 s core abort; never fails on the model side (`masks: []`).
- States: *No image provided* 400 · *No labels provided* 400 · *Image too large (max 10MB)* 413.
- Reachable: yes (Route C, surfaces-only renders)

### D-89 · `POST /api/render/declutter` — Defurnish
- Where: `API/render/declutter:1-29` → DEC (D-81)
- Does: auth → rate limit **30 / min** (`render-declutter`; "Sandbox fans out one image across several models per click; budget for that + retries") → `{ imageBase64, mimeType, model?, scope?: "joinery"|"keep-builtins", instruction?, imageWidth?, imageHeight? }` → `{ imageUrl, cost }`.
- Rules: `maxDuration = 60`; model allowlist (D-81); invalid JSON → *Invalid request* 400.
- Reachable: yes (Defurnish / *Empty the room*)

### D-90 · `POST /api/render/photorealistic` — restyle and sketch render
- Where: `API/render/photorealistic:1-34` → PHO (D-48)
- Does: auth → rate limit **30 / min** (`render-photorealistic`; "Always-compare fan-out issues one call per model per Generate; budget for ~3 models + retries") → `PhotorealisticInput` → `{ imageUrl, cost }`.
- Rules: `maxDuration = 60`; **no model allowlist** (any `model` string is billed as sent); no size cap (the core's cap is opt-in and not passed); a throw → *Invalid request* 400.
- Reachable: yes (whole-room restyle, Render from sketch)

### D-91 · `POST /api/render/relight`
- Where: `API/render/relight:1-144` (D-59…D-62)
- Does: auth → rate limit **30 / min** (`render-relight`) → `{ imageBase64, mimeType, model?, preset?, sunAngle?, colorTemp?, intensity?, shadows?, fixtures?, instruction?, imageWidth?, imageHeight? }` → `{ imageUrl, cost }`.
- Rules: `maxDuration = 60`; allowlist = **`google/gemini-3.1-flash-image` only** ("Finalised on Gemini 3.1 Flash (3 Pro, FLUX, 2.5 dropped)"); size cap 14,000,000 chars; one retry on an image-less answer (a thrown upstream failure is not retried, as in D-81); 120 s abort.
- States: *Invalid request* 400 · *Missing image* 400 · *Image too large (max 10MB)* 413 · *No image in AI response — please try again* 502 · *Generation timed out — try again* 504 · *Generation failed: {msg}* 502.
- Reachable: yes (lighting-only Generate)

### D-92 · `POST /api/render/style-transfer`
- Where: `API/render/style-transfer:1-273` → STP (D-71…D-74)
- Does: auth → rate limit **30 / min** (`render-style-transfer`) → body `{ imageBase64, mimeType, references[{base64, mimeType, role}], model?, aspects[], strength?, geometry?, keepList?, instruction?, spec?, useSpec?, roomNotes?, useRoomNotes?, detected?{context, surfaces[]}, imageWidth?, imageHeight? }` → `{ imageUrl, cost, prompt, usedSpec, usedRoomNotes }` (the prompt text is returned to the client).
- Rules: `maxDuration = 300` with a 280 s abort ("must fire INSIDE maxDuration … so the caller gets our timeout message instead of a platform-level function kill"; measured "Gemini 3 Pro ~100s, GPT-5.4 Image ~155s"). Up to **3** references (an unknown role → *overall*); each ≤ 14,000,000 chars, and **room + references together ≤ 2,000,000 chars** ("0.6MB of base64 renders in 5-21s; multi-MB payloads push providers past their own timeout"). Allowlist: `gemini-3-pro-image` · `gemini-3.1-flash-image` (default) · `gemini-3.1-flash-lite-image` · `flux.2-pro` ("The GPT image models were dropped: far slower and pricier for no gain"). An empty or invalid aspect list falls back to ALL five ("rather than shipping "change nothing" to the model"); strength default *balanced*; geometry default *structural*; the spec is used unless `useSpec: false` and only if usable; room notes are ignored under *locked*. Detected context capped at 300 chars, ≤ 12 surfaces of ≤ 120 chars. Two attempts, catching a thrown empty body as well as a null image.
- States: *Invalid request* 400 · *Missing room photo* 400 · *Room photo too large (max 10MB)* 413 · *Missing style reference image* 400 · *Reference image too large (max 10MB)* 413 · *Images are too large in total — use a smaller room photo or fewer reference images.* 413 · *{model} returned nothing — the provider timed out. Try fewer reference images, a smaller room photo, or fewer models at once.* 502 · *No image in AI response — please try again* 502 · *Generation timed out — try again* 504 · *Generation failed: {msg}* 502.
- Reachable: yes (Style Transfer)

### D-93 · `POST /api/render/style-analyze` — read the style
- Where: `API/render/style-analyze:1-99` (D-73)
- Does: auth → rate limit **30 / min** → `{ references[{base64, mimeType}] }` (≤ 3) → **`google/gemini-2.5-flash`** in JSON mode (1,400 tokens, 60 s) → `{ spec }` (coerced).
- Rules: `maxDuration = 60`. **Dry run** returns a fixed brief: *Warm Japandi* — *Quiet, low-contrast warmth built from pale timber, off-white plaster and soft natural textiles.*; palette #EFE9E0 walls · #C9A97E timber · #8C8377 large upholstery · #2F2B27 accent · #A8A093 metal; materials *white oak, lime-wash plaster, raw linen, honed travertine, blackened steel*; finishes *matte, raw, satin*; furniture *low-slung seating, rounded arms, tapered timber legs, open under-frames*; lighting *Soft diffused daylight with warm low-level lamp fill*; decor *ceramic vessels, dried botanicals, woven baskets, a single large abstract canvas*; avoid *high-gloss surfaces, chrome, busy patterns, cool blue-white light*.
- States: *Invalid request* 400 · *Missing reference image* 400 · *Reference image too large (max 10MB)* 413 · *Style analysis timed out* 504 · *Could not read the reference image* 502.
- Reachable: yes (Style Transfer's read-the-style)

### D-94 · `POST /api/render/auto-furnish`
- Where: `API/render/auto-furnish:1-242` → AFP (D-64…D-69)
- Does: auth → rate limit **30 / min** → body `{ imageBase64, mimeType, model?, roomType, style?, density?, include?[], exclude?, instruction?, roomNotes?, detected?{context, surfaces, existing}, catalogue?[{id, name, category, vendor, priceCents, slot, base64, mimeType}], imageWidth?, imageHeight? }` → `{ imageUrl, cost, prompt, catalogue }`.
- Rules: `maxDuration = 300`, 280 s abort. **A valid room type is required** (*Pick a room type*, "without a valid one the model improvises both the contents AND the quantity, which is the failure mode this whole feature exists to avoid"). Allowlist: `gemini-3-pro-image` · `gemini-3.1-flash-image` (default) · `gemini-3.1-flash-lite-image` · `flux.2-pro` ("GPT image models were dropped after testing: 5-13x slower, 3-7x the cost, and no better at holding the architecture"). Density default *balanced*; include ≤ 20 items; catalogue ≤ 4 picks with a name and an image, name ≤ 120, vendor ≤ 80, slot ≤ 60; **room + catalogue images ≤ 2,000,000 chars**. The style's paragraph is looked up but only the name is printed (D-67). Two attempts.
- States: *Invalid request* 400 · *Missing room photo* 400 · *Room photo too large (max 10MB)* 413 · *Pick a room type* 400 · *Images are too large in total — use fewer catalogue products or a smaller room photo.* 413 · *{model} returned nothing — the provider timed out. Try a smaller photo or a different model.* 502 · *No image in AI response — please try again* 502 · *Generation timed out — try again* 504 · *Generation failed: {msg}* 502. **Dry run** returns the input photo, `cost: null` and the full prompt.
- Reachable: yes (Auto Furnish on desktop; the phone has no run control, D-15)

### D-95 · `POST /api/render/room-analyze` — the spatial survey
- Where: `API/render/room-analyze:1-88` (D-72)
- Does: auth → rate limit **30 / min** → `{ imageBase64, mimeType }` → **`google/gemini-2.5-flash`** JSON mode (1,200 tokens, 60 s) → `{ notes }` ("one call per room, reusable across every render of that room" — though the editor calls it per pass, C).
- Rules: `maxDuration = 60`; size cap 14,000,000. **Dry run** → a fixed survey: *narrow home office*; door *left wall, near the camera* — *opens inward into the room*; window *back wall, centred* — *sill roughly at desk height*; circulation *the path from the door along the left wall to the window*; fixed *power sockets on the back wall below the window* · *air-conditioning unit high on the right wall*.
- States: *Invalid request* 400 · *Missing room photo* 400 · *Room photo too large (max 10MB)* 413 · *Room read timed out* 504 · *Could not read the room photo* 502.
- Reachable: yes (pre-flight of Style Transfer unless locked, and of Auto Furnish)

### D-96 · `POST /api/render/room-scan` — is the room empty?
- Where: `API/render/room-scan:1-74` (D-70)
- Does: auth → rate limit **60 / min** → `{ imageBase64, mimeType }` → **`google/gemini-2.5-flash`** JSON mode (600 tokens, 55 s) → `{ report: { state, roomTypeGuess, existing[] } }`.
- Rules: advisory ("a scan failure must never block furnishing"); `maxDuration = 60`. **Dry run** → `{ state: "empty", roomTypeGuess: "living", existing: [] }`.
- States: *Invalid request* 400 · *Missing room photo* 400 · *Room photo too large (max 10MB)* 413 · *Room scan timed out* 504 · *Could not scan this room* 502.
- Reachable: yes (Auto Furnish pre-flight)

### D-97 · `POST /api/render/drift-check`
- Where: `API/render/drift-check:1-117` (D-82)
- Does: auth → rate limit **60 / min** → `{ originalBase64, originalMimeType?, renderBase64, renderMimeType?, context? }` (each a data URL or bare base64) → **`google/gemini-2.5-flash`** JSON mode (1,200 tokens, 55 s; "runs after EVERY render, so it must stay near-free") → `{ report }` (coerced).
- Rules: each image ≤ 14,000,000 chars and **the pair ≤ 2,000,000 chars**; `maxDuration = 60`. A detector failure returns an error the guard treats as "unknown" ("must NEVER block a render the user already paid for"). **Dry run** → a fixed BLOCKING violation: *opening* · *desk* · *left wall, directly in front of the door* · *The desk sits across the doorway so the door cannot open.* — so with no key every guarded pass triggers the repair loop (D-98, D-116).
- States: *Invalid request* 400 · *Both the original and the render are required* 400 · *Image too large (max 10MB)* 413 · *Images are too large in total* 413 · *Drift check timed out* 504 · *Could not check this render* 502.
- Reachable: yes (automatic)

### D-98 · `POST /api/render/drift-fix`
- Where: `API/render/drift-fix:1-168` (D-83)
- Does: auth → rate limit **30 / min** → `{ renderBase64, originalBase64, violations[], surfaces?[], model?, imageWidth?, imageHeight? }` → image model with IMAGE 1 = render, IMAGE 2 = original → `{ imageUrl, cost }`.
- Rules: `maxDuration = 300`, 280 s abort; allowlist as auto-furnish (default flash); violations re-validated (unknown category or empty → dropped; ≤ 6, "Beyond a handful the correction prompt stops being surgical"); surfaces ≤ 12 × 120 chars; the pair ≤ 2,000,000 chars; two attempts. **Dry run** → the render echoed back unchanged.
- States: *Invalid request* 400 · *Missing the render to repair* 400 · *Missing the original room photo* 400 · *Image too large (max 10MB)* 413 · *Images are too large in total* 413 · *Nothing to fix — no valid violations supplied* 400 · *Could not repair this render — keeping the original.* 502 · *Repair timed out* 504 · *Repair failed: {msg}* 502.
- Reachable: yes (automatic)

### D-99 · `POST /api/render/outpaint` (experiment)
- Where: `API/render/outpaint:1-116`
- Does: the client sends the render padded onto a larger canvas (sharp centre + blurred border); the model keeps the centre and paints a sharp continuation: *TASK: Outpaint / extend an interior photo — NOT a redesign.* · keep the sharp centre EXACTLY · replace the blurred border with *a SHARP, photorealistic, seamless continuation of the SAME room* · *Do NOT invent a different room, add doorways to new spaces, or change the central content* · *Output one uniformly sharp image, same dimensions as the input, with no blurred areas remaining.*
- Rules: rate limit 30 / min; `maxDuration = 60`; default **`google/gemini-3-pro-image-preview`**, temperature 0.3, 120 s abort; **no model allowlist and no size cap**. **Dry run** → the padded input echoed back.
- States: *Missing image* 400 · *No image in AI response* 502 · *Outpaint timed out — try again* 504 · *Outpaint failed: {msg}* 502 · *Invalid request* 400.
- Reachable: internal sandbox (C-109)

### D-100 · `POST /api/render/reangle` — camera moves (experiment)
- Where: `API/render/reangle:1-291`
- Does: `mode: "single"` (default) re-shoots the render from one move; `mode: "grid"` asks for ONE 3×2 montage (at 16:9) and slices it server-side into six JPEG tiles (quality 88) "so we don't pay for six separate generations". Six curated moves (label · instruction): **orbit-left** *Orbit left* — *about 15 degrees to the LEFT … one side-step to the left* · **orbit-right** *Orbit right* · **step-in** *Step forward* — *Dolly the camera FORWARD … roughly one metre … (do not zoom)* · **step-back** *Step back* · **look-up** *Raise / look up* — *slightly higher eye level and tilt it a little downward* · **look-down** *Lower / look down*. A free `instruction` overrides; nothing → orbit-left. Prompt: *TASK: Novel camera viewpoint of an EXISTING interior — a camera move, NOT a redesign.* + ABSOLUTE CONSTRAINTS (every wall, window, door, piece, rug, fixture, plant, decor identical; same materials, colours, lighting, mood; no add / remove / rearrange) + fill small revealed areas plausibly, *never introduce new design elements*.
- Rules: subtle moves only ("large orbits reveal geometry that never existed in a flat photo and force the model to invent"); rate limit **40 / min**; `maxDuration = 60`; default `gemini-3-pro-image-preview`, temperature 0.15, 120 s; no allowlist, no size cap. **Dry run** → the input echoed (grid: six identical echo tiles + `grid { cols 3, rows 2, order }`).
- States: *Missing image* 400 · *No image in AI response* 502 · *Generation timed out — try again* 504 · *Generation failed: {msg}* 502 · *Invalid request* 400.
- Reachable: internal sandbox (C-110)

### D-101 · `POST /api/render/orbit-video` (experiment, fal.ai)
- Where: `API/render/orbit-video:1-137`
- Does: submits the render to a fal.ai image-to-video queue (default **`fal-ai/kling-video/v2.1/standard/image-to-video`**, overridable "so you can try Kling / Luma / Hailuo / Wan"), polls the status every **3 s** until COMPLETED, returns `{ videoUrl, model }`. Default prompt *Slow, smooth cinematic camera orbit gliding around this interior room with a gentle forward dolly, photorealistic. The room, all furniture, materials, colours and layout stay EXACTLY the same — only the camera moves through the space. No morphing, no changing objects, no new items, no people, no text.*; negative prompt *morphing, warping, melting, changing furniture, new objects appearing, people, hands, text, watermark, distortion, flicker, blurry, low quality*; duration default "5".
- Rules: needs `FAL_KEY` (or `FAL_API_KEY`) — **no dry run**: without it the route answers *Orbit video needs a fal.ai key. Add FAL_KEY=... to .env.local (get one at fal.ai).* (400). Rate limit **10 / min**; `maxDuration = 300`, 280 s abort; polling server-side ("fine on localhost … for Vercel you'd move polling to the client").
- States: *Missing image* 400 · *No video in fal result* 502 · *Video generation timed out* 504 · *Orbit video failed: {msg}* 502 · *Invalid request* 400.
- Reachable: internal sandbox (C-111)

### D-102 · `POST /api/render/depth` (experiment)
- Where: `API/render/depth:1-119`
- Does: asks an image model for a grayscale depth map (*closest … pure WHITE, … farthest … pure BLACK*, crisp object edges, no colour / text / lighting) for the drag-to-orbit viewer → `{ depthUrl, cost }`. "The clean production upgrade is a real monocular-depth model (Depth-Anything V2 via the onnxruntime-node dep)".
- Rules: rate limit 30 / min; `maxDuration = 60`; default `gemini-3-pro-image-preview`, temperature 0.1, 120 s; no allowlist. **Dry run** → the INPUT image returned as the "depth map".
- States: *Missing image* 400 · *No depth map in AI response* 502 · *Depth timed out — try again* 504 · *Depth failed: {msg}* 502 · *Invalid request* 400.
- Reachable: internal sandbox (C-112)

### D-103 · `POST /api/render/detect-sandbox` (benchmark)
- Where: `API/render/detect-sandbox:1-201`
- Does: "THROWAWAY … for benchmarking detect models + prompt styles (center-point vs bounding-box). Not used by the product." Any `model` (default `google/gemini-2.5-flash`), `mode: "centerpoint" | "bbox"`, temperature **0**, 16,000 tokens ("so "thinking" models … don't truncate"), 60 s; returns `{ model, mode, surfaces, furniture (≤16), costUsd, ms, finishReason, parsed, raw (≤6,000 chars) }`.
- Rules: rate limit 40 / min; **no dry run** — without the key: *OPENROUTER_API_KEY not configured* (500). A rule that exists only here: the clutter rule of thumb *if it would fit in two hands and rests on a counter/table/shelf, it is CLUTTER — skip it* (the product prompt has a suppression list instead, D-77).
- States: *No image* 400 · *Image too large (max 10MB)* 413 · *OpenRouter {status}: …* 502.
- Reachable: internal sandbox

### D-104 · `POST /api/render/floorplan-3d-sandbox` (not the visualizer)
- Where: `API/render/floorplan-3d-sandbox:1-350`
- Does: floor plan → room inventory / vectorised room polygons / top-down or isometric 3D render / prompt optimiser; allowlist `gemini-3.1-flash-image` only ("FINALISED … 2026-08-24 calibration"); inventory by `gemini-3-flash-preview`; client-authored prompts capped at 6,000 chars.
- Rules: rate limit 30 / min; `maxDuration = 120`; "Throwaway sandbox route — remove alongside /tools/floorplan-3d-sandbox once the … models + prompts are finalised". Out of the AI Visualizer's scope (C-122).
- Reachable: internal sandbox

### D-105 · `GET · POST /api/renders/jobs` — list and record renders
- Where: `API/renders/jobs:1-121`
- Does: **GET** `?entityType=project|lead&entityId=…` or `?roomIds=a,b,c` (standalone sessions), optional `&status=completed` → `{ jobs: [DB rows, snake_case] }` newest first. **POST** `{ id, roomId?, model?, status?, variantsJson?, style?, completedAt?, projectId?, leadId? }` → inserts one `render_jobs` row → `{ ok: true }`.
- Rules: auth through `requireSession` (*Not authenticated* 401 · *Invalid session* 401) — the only guard, because the app proxy waves every `/api/renders/*` path through as public (it exists for the share page, `src/proxy.ts:343-346`); every query runs on a studio-scoped client (a token minted for the session's studio, Postgres RLS the backstop — "Never service-role"); **`studio_id` always comes from the session, never the body**. GET needs an entity pair or room ids (*entityType (project|lead) and entityId, or roomIds, are required* 400). POST needs `id` (*id is required* 400; the client generates it, C-35); defaults `status "completed"`, `variants_json []`, `completed_at now`. No role check. DB errors echo the database message (500); anything else *Internal server error* 500.
- Data: `render_jobs { id, studio_id, room_id, project_id?, lead_id?, model, status, variants_json, style, completed_at, created_at }` (E owns the table).
- Reachable: yes (editor load + every persisted pass)

### D-106 · `PATCH · DELETE /api/renders/jobs/[id]`
- Where: `API/renders/jobs/[id]:1-95`
- Does: **PATCH** `{ variantsJson?, style? }` — only the fields sent are updated ("so a variants-only update doesn't clobber the style") — used when a relit version is re-baked in place or one variant is removed; **DELETE** removes the job (when its last variant goes).
- Rules: *id is required* 400; PATCH with neither field → *nothing to update (variantsJson and/or style required)* 400; a foreign id is a silent no-op under RLS (still `{ ok: true }`). Storage objects are NOT touched here (the client removes them).
- Reachable: yes (delete a version, Use this version after a live tweak)

### D-107 · `DELETE /api/renders/jobs/by-room/[roomId]`
- Where: `API/renders/jobs/by-room/[roomId]:1-44`
- Does: deletes every `render_jobs` row of a room (used when a room is deleted); `{ ok: true }`.
- Rules: *roomId is required* 400; RLS-scoped (a foreign room is a no-op); the room row and the Storage files are deleted by the caller separately.
- Reachable: yes (Delete room)

### D-108 · `GET · PUT /api/visualizer/workspace`
- Where: `API/visualizer/workspace:1-136`
- Does: **GET** → `{ rooms: project_rooms (id, name, project_id, lead_id, original_image_url, created_at), jobs: completed render_jobs (id, room_id, variants_json, created_at), workspace: { folders[{id, name}], sessions[{id, name, folderId, roomIds[], createdAt, updatedAt}] } }` for the session studio; **GET `?meta=1`** → `{ workspace }` only ("used by mutations for their read-modify-write cycle"); **PUT** `{ workspace }` → merged into `studios.settings.visualizerWorkspace` server-side ("so the client never round-trips (or overwrites) sibling settings keys").
- Rules: a missing / malformed workspace normalises to empty arrays; PUT without an object → *workspace object is required* 400. The PUT replaces the whole workspace blob (last writer wins — there is no merge of concurrent edits beyond the sibling-keys guard). No role check: any member may reorganise folders and sessions. A owns the landing that calls it.
- Reachable: yes (the landing)

### D-109 · `GET · POST /api/projects/rooms`
- Where: `API/projects/rooms:1-115`
- Does: **GET** `?entityType=project|lead&entityId=…` or `?roomIds=…` → `{ rooms }` oldest first. **POST** `{ name, projectId?, leadId? }` → `{ room }` (the created row).
- Rules: *name is required* 400 (the only required field — "No projectId/leadId = a standalone visualizer-session room … studio-owned only"); the name is stored as sent (not trimmed on create); `studio_id` from the session; RLS-scoped; GET needs an entity pair or room ids (same 400 as D-105).
- Data: `project_rooms { id, studio_id, name, project_id?, lead_id?, original_image_url, created_at }`.
- Reachable: yes (room load, Upload new room — only when Save to project is ON, C-36)

### D-110 · `PATCH · DELETE /api/projects/rooms/[roomId]`
- Where: `API/projects/rooms/[roomId]:1-80`
- Does: **PATCH** `{ originalImageUrl?, name? }` updates only what was sent ("a rename must not null out the room's image"); **DELETE** removes the row.
- Rules: PATCH needs `originalImageUrl` (may be null) or a non-blank `name` (trimmed) → else *originalImageUrl or name is required* 400; DELETE has no id check and never fails on a foreign id (RLS matches 0 rows). Storage stays client-side.
- Reachable: yes (photo upload, rename, delete room)

### D-111 · Test-pinned: the render jobs API (`render-jobs-scoped-api.test.ts`)
- Where: `src/__tests__/render-jobs-scoped-api.test.ts:89-177`
- Does: pins: GET / POST / DELETE-by-room → 401 without a session; GET → 400 without an entity; POST → 400 without `id`; POST ignores an attacker's `studio_id` / `studioId` and stamps the session's, and the scoped client is built with the SESSION studio only; GET returns DB-shaped rows (`studio_id`, `variants_json`); DELETE-by-room filters `room_id` on the session-scoped client.
- Rules: tenant isolation is the contract: no client-supplied studio ever reaches the query.
- Reachable: test

### D-112 · Test-pinned: the project rooms API (`reference-rooms-scoped-api.test.ts`)
- Where: `src/__tests__/reference-rooms-scoped-api.test.ts:198-319`
- Does: pins: GET / PATCH / DELETE → 401 without a session; GET → 400 without an entity; GET returns DB rows with `original_image_url`; POST stamps the session studio and keeps `project_id`; POST → 400 without a name; POST → **200 with neither projectId nor leadId** ("the standalone visualizer-session room"); PATCH `{ originalImageUrl }` updates exactly `{ original_image_url }` filtered by id; DELETE filters by id.
- Rules: a room may belong to nothing (sessions); only the name is required.
- Reachable: test

### D-113 · Test-pinned: temp-render mode (`e8-temp-render.test.ts`)
- Where: `src/__tests__/e8-temp-render.test.ts:1-46` (a source-text guard over `visualizer.tsx`)
- Does: pins that `saveToLibrary` exists and defaults to **true**; a switch labelled *Save to project* exists; the `/api/projects/rooms` create and the `/api/renders/jobs` record both sit inside `if (saveToLibrary …)`; `saveToLibrary` appears ≥ 5 times (declaration, lock check, the rooms gate, each upload gate, each insert gate); some `disabled={…saveToLibrary…}` exists (History and Share); a *Temp mode* banner exists.
- Rules: with Save to project OFF nothing may persist (C-36 has the words).
- Reachable: test

### D-114 · Test-pinned: the mask fill threshold (`mask-composite.test.ts`)
- Where: `src/__tests__/mask-composite.test.ts:1-67`
- Does: pins `maskFillRatio`: all-black → 0, all-white → 1, empty → 0; the failing real case (~3.1 % white) falls BELOW `MIN_MASK_FILL_RATIO` (**0.08**) and the healthy case (~49.9 %) clears it; luminance **< 24 counts as black**.
- Rules: why — `/api/render/segment` "asks an LLM to hand-emit inline base64 PNG mask bytes — unreliable by construction"; a near-empty but valid mask used to erase ~97 % of a correct render ("the render did nothing"), so such a mask is now treated as a failed segmentation.
- Reachable: test

### D-115 · Model roster by route (what 2.0 would call)
- Where: the routes above
- Does: **detection** `google/gemini-3-flash-preview` · **segmentation, style brief, room survey, emptiness scan, drift check** `google/gemini-2.5-flash` (text / JSON) · **surgical render** default `google/gemini-3-pro-image-preview` (the editor sends *Fast* = `google/gemini-3.1-flash-image` by default, *High quality* = `google/gemini-3-pro-image-preview`, B-07) · **restyle / sketch** default `black-forest-labs/flux.2-pro` (editor sends per quality) · **relight** `google/gemini-3.1-flash-image` only · **defurnish** default flash, allowlist flash · `gemini-3-pro-image` · `gemini-2.5-flash-image` · `flux.2-pro` · **style transfer · auto furnish · drift fix** default flash, allowlist flash · `gemini-3-pro-image` · `gemini-3.1-flash-lite-image` · `flux.2-pro` · **outpaint · reangle · depth** `gemini-3-pro-image-preview`, no allowlist · **orbit video** fal.ai Kling 2.1.
- Rules: what the studio editor actually sends — surgical render and photo restyle: *Fast* = `gemini-3.1-flash-image` / *High quality* = `gemini-3-pro-image-preview` (VZ:356-363); sketch render: *Fast* = flash / *High quality* = `flux.2-pro` (VZ:436-439); Auto Furnish: *Fast* = flash / *High* = `gemini-3-pro-image` (`auto-furnish-controls.tsx:21-24`); Style Transfer, Defurnish and Relight: always flash (`STYLE_TRANSFER_MODEL`, `DEFURNISH_MODEL` VZ:366, `RELIGHT_MODEL`). Two spellings of Gemini 3 Pro coexist (`gemini-3-pro-image-preview` in the surgical / photorealistic / experiment routes, `gemini-3-pro-image` in the allowlists); a preview id sent to an allowlisted route would be clamped to flash, though the editor never does that today. Model names and costs are never shown in the product (RC:10); the editor's own labels are *Fast* / *High quality* (B-07).
- Reachable: —

### D-116 · What a dry run returns (no `OPENROUTER_API_KEY`) — the simulation contract
- Where: every route above
- Does: `/api/render` → n variants, each the INPUT photo, `materials` = the surfaces sent · `/detect` → the fixed sample (4 surfaces, 3 furniture, *photo*, *a living room with a feature wall and large windows*) · `/segment` → no masks (so surface renders skip the mask composite) · `/photorealistic` · `/relight` · `/declutter` · `/outpaint` · `/reangle` → the input echoed (`cost: null`) · `/depth` → the input as `depthUrl` · `/style-transfer` · `/auto-furnish` → the input echoed + the full `prompt` (+ `usedSpec` / `usedRoomNotes`) · `/style-analyze` → the *Warm Japandi* brief (D-93) · `/room-analyze` → the *narrow home office* survey (D-95) · `/room-scan` → *empty*, *living* · `/drift-check` → ONE BLOCKING *opening* violation (a desk across the door) · `/drift-fix` → the render echoed · `/orbit-video` → a 400 asking for `FAL_KEY` · `/detect-sandbox` → a 500 *OPENROUTER_API_KEY not configured*.
- Rules: consequences a simulation should reproduce or consciously drop: a guarded pass (restyle, style transfer, auto furnish) always runs check → fix → check → fix → check (5 extra calls) and settles on the untouched render marked unrepaired, which the editor does not surface (C-17); the jobs / rooms / workspace routes have NO dry run — they always write to the database; usage events are not recorded for a dry-run surgical render.
- Reachable: dev / no-key environments

---

## D4 · The studio's own materials

Two different per-studio lists exist and they never meet: the **visualizer's swatch library** (`studio_materials`, "NF10", read by the editor, B-67) and the **Material Catalog** of sellable products (`studio_material_catalog`, managed in Accounts, used by client selections and by the Auto Furnish sandbox's product pinning). Both store images in the same `studio-materials` bucket.

### D-117 · `GET · POST /api/studio-materials/records` — the swatch library
- Where: `src/app/api/studio-materials/records/route.ts:1-99`; client SMQ:50-122
- Does: **GET** `[?category=]` → `{ materials: StudioMaterial[] }` — active rows only, newest first. **POST** `{ name, category, imageUrl, hex?, description? }` → the created row (camelCase). The client uploads the image to Storage FIRST (`studio-materials/{studioId}/{uuid}.{ext}`, no upsert) and only then creates the row; if the row insert fails it deletes the orphaned file (best effort) and rethrows.
- Rules: `requireSession` (*Not authenticated* / *Invalid session* 401); studio-scoped client; `studio_id` and `uploaded_by` from the session. POST requires a non-blank name, category AND image URL (*name, category and imageUrl are required* 400); the name is trimmed, the category is stored as sent. **Anyone signed in may add** — the query file's comment still says "owner/admin can save to library, pure-id members default to session-only", but the dialog hard-codes `canSaveToLibrary = true` ("Every designer's uploads are kept in the shared studio library", CMD:58-60). React Query key `["studio-materials", studioId, category | "all"]`, 60 s stale time; a successful upload invalidates the studio's key.
- Data: `studio_materials` (see D-120).
- Reachable: yes (the editor's library tiles; the upload dialog, B-66)

### D-118 · `DELETE /api/studio-materials/records/[id]` — archive a swatch (no caller)
- Where: `src/app/api/studio-materials/records/[id]/route.ts:1-39`; SMQ:124-142 (`useDeleteStudioMaterial`)
- Does: soft delete: `is_active = false`; the Storage file is kept ("recoverable in case of accidental delete, and avoids orphaning any quote/render that referenced the URL").
- Rules: RLS-scoped (a foreign id is a silent no-op, still `{ ok: true }`); no role check. **Nothing in the product calls it** — the hook has no user, the editor's × only drops the session copy (B-69).
- Reachable: dead (route + hook exist, no UI)

### D-119 · Managing the swatch library outside the editor — there is no such screen
- Where: grep over `src/components/accounts`, `src/app/(main)/accounts`, `src/app/api` (only the two routes above touch `studio_materials`)
- Does: a studio cannot list, search, rename, re-categorise, re-image or delete its uploaded swatches anywhere: they are added only from the editor's upload dialog (*Save to studio library*, default ticked) and seen only inside the editor's material pickers (desktop grid and the phone *Your library* section, filtered to the selected surface's categories). There is no rename route (no PATCH) and no UI for the archive route.
- Rules: every upload by any member lands in the shared library by default, so the library only grows; duplicates are not detected.
- Reachable: —

### D-120 · Shape of `studio_materials` and the `studio-materials` bucket (migration 121)
- Where: `scripts/migrations/121_studio_materials.sql`
- Does: `studio_materials { id uuid, studio_id → studios (cascade), name text NOT NULL, category text NOT NULL, image_url text NOT NULL, hex text NULL ("dominant colour … used for UI swatches when the image fails to load"), roughness numeric(3,2) NULL · metalness numeric(3,2) NULL ("for downstream 3D applications (visualiser uses image directly)"), description text NULL, uploaded_by → profiles (set null), is_active bool default true, created_at, updated_at (trigger) }`; partial indexes on `(studio_id)` and `(studio_id, category)` where active. Bucket **`studio-materials`**: public read, **5,242,880 bytes (5 MB)** limit, `image/jpeg · image/png · image/webp` only.
- Rules: the editor accepts swatch files up to 10 MB and HEIC (B-65) — a HEIC is converted to JPEG before upload, but a 5–10 MB swatch fails the library save and falls back to session-only (B-67). The editor never sends `hex`, `roughness`, `metalness` or `description`.
- Reachable: —

### D-121 · The Material Catalog (Accounts › Projects › Material Catalog) — the studio's product list
- Where: `src/components/accounts/material-catalog-manager.tsx:1-407`; `src/app/api/material-catalog/records/route.ts` + `[id]/route.ts`; `src/lib/queries/material-catalog.ts:160-184`; `scripts/migrations/194_studio_material_catalog.sql`; mounted at `src/app/(main)/accounts/page.tsx:121, 1148-1151`
- Entry: Accounts sidebar › *Projects* group › *Material Catalog* (the Accounts page admits owner, admin, id and accounting; the tab is not flagged owner-only)
- Does: header *Material Catalog* — *A reusable library of materials. Your team picks from this when building client selections instead of retyping each option.* + *Add material*; search (*Search materials*: name, vendor, category, specs) and category chips (*All* + the categories in use); a card grid (image, name, *{category} · {vendor} · {price}*) with *Edit* and an archive button that asks inline (*Archive* / *Archiving…* · *Cancel*). The dialog (*Add material* / *Edit material*): *Name \** (*e.g. Carrara Marble Tile*), *Category \** (*e.g. Flooring*), *Vendor / Brand* (vendor picker, *Select vendor…*, *Clear vendor*), *Default price ({currency})* (*0.00*), *Specs / Description* (*Material specs, dimensions, finish notes…*), *Image* (*Paste URL or upload →*, upload *png / jpeg / webp*, **5 MB** cap *Image must be 5MB or smaller*, stored at `studio-materials/{studio}/catalog/{uuid}.{ext}`), *Cancel* / save.
- Rules: save needs a name and a category; the price is typed as text and stored in cents (blank, invalid or negative → none); archive = soft delete. POST errors *Material name is required* · *Material category is required* (400); PATCH on a missing row → *Not found* 404. Toasts *Material added* · *Material updated* · *Couldn't save this material* · *Material archived* · *Couldn't archive this material* · *Image uploaded* · *Image upload failed*. Empty states *No materials yet* — *Add materials here, or save options to the catalog as your team builds selections.* · *No materials match your filters.* · *Couldn't load the catalog.* + *Try again*.
- Data: `studio_material_catalog { id, studio_id, name, category, vendor (legacy text), vendor_id (migration 312, sent only when set or cleared), image_url, price_cents, specs, is_active, created_by, created_at, updated_at }` — "Picked into project_selections.options by value (copy, not FK)".
- Reachable: yes (Accounts) — but it reaches the visualizer only through the Auto Furnish **sandbox** (D-69); the studio editor never reads it.

---

## D5 · The sandboxes (internal; C-117…C-121 have their titles and blurbs)

All five pages sit under `src/app/(main)/tools/*-sandbox/page.tsx`, are linked from nowhere (only the breadcrumb knows three of their names, `src/components/ui/breadcrumb.tsx:31-33`), have no role or flag gate of their own, and so open for **any signed-in member who types the URL** (the proxy only requires a valid session). They call the same `/api/render/*` routes as the product unless noted. Rows record only what exists nowhere else.

### D-122 · `/tools/visualizer-sandbox` — the canvas-first prototype
- Where: SBX/visualizer (720 lines)
- Does: tests a canvas-first editor ("tap a surface → it segments & highlights, pick a swatch (tints instantly)") against the real detect, segment, render, photorealistic and declutter routes, plus the Spatial View experiment (outpaint / reangle / orbit video / depth, D-99…D-102).
- Rules only here: a **Faithful ↔ Creative** slider (0–1, default 0.3) picks the model — below 0.5 `google/gemini-3-pro-image-preview`, else `google/gemini-3.1-flash-image`; **always 2 variants**, shown as *Look 1* / *Look 2*; a per-surface **Lock** (*Lock* / *Locked*, chip *{label} protected*) that feeds `preservedSurfaces`; an **instant client-side tint** of the selected surface through its segmentation mask before any render; *Continue on this →* re-detects on a result; no style = **Modern** (the product sends "" = no style); its own five plain-language lighting presets (colour temp · intensity · sun° · shadows): *Morning* 5200 · 72 · 60 · 40 · *Golden hour* 3000 · 55 · 15 · 58 · *Bright daylight* 5800 · 88 · 78 · 32 · *Cozy evening* 2600 · 34 · 0 · 62 with pendants + downlights + cove ON · *Overcast* 6200 · 60 · 50 · 24.
- Words: *Faithful* · *Creative* · *Lock* · *Locked* · *{label} protected* · *Look {n}* · *Original* · *Continue on this →* · errors *Detection failed — make sure you're signed in, then try again.* · *Couldn't read that image — try another.* · *Couldn't continue on that render.* · *No image returned — try again.*
- Reachable: internal sandbox

### D-123 · `/tools/auto-furnish-sandbox` — the model bake-off and product pinning
- Where: SBX/auto-furnish (763 lines)
- Does: benchmarks Auto Furnish across models on one prompt, runs the drift guard with an **auto-repair toggle** and shows each result's drift report, and is the ONLY place that pins Material Catalog products into a render (D-69, D-121: *Pin real items from your catalogue and the render uses those, not invented furniture — so the client is looking at something you can actually quote. Anything you don't pin is chosen by the AI in the selected style.*) with a priced total.
- Rules only here: its model roster with pre-flight estimates — *FLUX.2 Pro* $0.075 / 39 s (*0 drift in testing at half 3 Pro's cost — image-output only*, the sandbox's DEFAULT, while the product defaults to flash) · *Gemini 3 Pro* $0.143 / 41 s (*Nano Banana Pro · strong refurnishing, priciest*) · *Gemini 3.1 Flash* $0.069 / 15 s (*Nano Banana 2 · fastest of the three, solid all-rounder*) · *Gemini 3.1 Flash Lite* $0.035 / 9 s (*Nano Banana 2 Lite · cheapest, weakest spatial reasoning*); room photo compressed to 1536 px / 0.9; an *exclude* field (*e.g. no TV, no rug*).
- Reachable: internal sandbox ("Throwaway sandbox — remove once auto-furnish is folded into the AI Visualizer")

### D-124 · `/tools/style-transfer-sandbox` — brief vs no brief
- Where: SBX/style-transfer (962 lines)
- Does: room + up to 3 references → read the style into an editable brief → render across models; can **A/B the brief** (each model run twice, *· with brief* and *· no brief*, via `useSpec`).
- Rules only here: roster with MEASURED costs (900 px room + 700 px reference, palette + materials, balanced / structural): *FLUX.2 Pro* $0.075 / 39 s · *Gemini 3.1 Flash* $0.069 / 10 s (*current default, good instruction-following*) · *Gemini 3.1 Flash Lite* $0.035 / 5 s · *Gemini 3 Pro* $0.139 / 21 s (*highest fidelity, 2× the cost*); compression room 1536 px / 0.9, references 896 px / 0.82; a payload warning at **3,600,000** base64 chars — above the route's hard 2,000,000 cap (D-92), so the sandbox can send a payload the route refuses without warning first.
- Reachable: internal sandbox

### D-125 · `/tools/relight-sandbox` — the third lighting table
- Where: SBX/relight (410 lines)
- Does: relights one upload with `gemini-3.1-flash-image` and offers a per-result live edit (colour temp, intensity, sun) that never re-renders, with a PNG bake on save.
- Rules only here: slider ranges **sun 0–90, temperature 2000–7000 K, intensity 0–100, and NO shadows knob**; temperature words *warm* (≤3200) · *neutral* (≤4500) · *cool* (≤5500) · *daylight*, sun *night (no sun)*; the preset stays selected while tweaking; and ten presets whose values differ from BOTH the editor's six (D-61) and the route's dead table (D-62): *Daylight* 70° · 5200 K · 80 · all off · *Cool White Office* 80 · 6300 · 86 · downlights on · *Golden Hour* 12 · 2900 · 58 · accent on · *Sunset* 8 · 2500 · 54 · accent on · *Ambient Evening* 3 · 3000 · 36 · pendants + accent on · *Warm Cozy Home* 0 · 2600 · 42 · cove + pendants + accent on, downlights off · *Blue Hour* 4 · 5400 · 32 · cove + accent on · *Overcast* 55 · 6500 · 46 · all off · *Directional Spotlight* 22 · 4000 · 26 · downlights + accent on · *Midnight* 0 · 3400 · 18 · cove + pendants + accent on, downlights off. It sends knobs, never `preset`.
- Reachable: internal sandbox ("Throwaway sandbox — remove after relighting model + feature selection")

### D-126 · `/tools/detect-sandbox` — detector benchmark
- Where: SBX/detect (238 lines) → `API/render/detect-sandbox` (D-103)
- Does: runs the same room through several models in centre-point or bounding-box mode and overlays the dots (surfaces = hollow rings, furniture = filled dots coloured by type; *Show boxes* reveals extents).
- Rules only here: roster `google/gemini-3-flash-preview` (the product's pick) · `google/gemini-3.5-flash` · `google/gemini-3.1-flash-lite` · `google/gemini-3.1-pro-preview`; the page text says *Throwaway tool — runs all 5 models on the same room so you can compare* but the roster has FOUR; the "two hands" clutter rule (D-103); no dry run.
- Reachable: internal sandbox

---

## D6 · Cross-cutting engine facts

### D-127 · The phone shell is also the anonymous trial's UI
- Where: `src/components/trial-visualizer/trial-visualizer.tsx:32-33, 557, 654-760` (A owns the trial)
- Does: the public trial imports the same `MobileTopBar`, the five trays, `MobileDock`, `MobileGenerateBar`, `VersionsSheet`, `MaterialPickerSheet` and `MaterialBrowser` (the latter at 6 compact columns inside its desktop rail). Differences it passes in: no Rooms sheet; no *Add* / *Add one* surface flow; the Style tray's more chip reads *All styles* (no Style Transfer); the Generate bar is fixed to 1 variant with the dropdown hidden; the dock's Style badge ignores style references.
- Rules: the shell's props exist for this second consumer (MSH:146, 282) — a 2.0 phone shell should expect the same two hosts only if the trial is in scope.
- Reachable: trial only (flagged, A's G section)

### D-128 · Style data the engine reads (shape only; the builder reads `design-styles.ts` directly)
- Where: `src/data/design-styles.ts:27-285`
- Does: one `DESIGN_STYLES` list (25 entries) feeds five lookups: `STYLE_NAMES` (UI order) · `STYLE_PROMPT_MAP` name → `promptTemplate` (the *STYLE:* paragraph of a restyle, the *({desc})* of the surgical style clause, the looked-up-but-unprinted paragraph of Auto Furnish) · `STYLE_AFFINITY_MAP` (material suggestions, B-62) · `STYLE_DESCRIPTION_MAP` (desktop cards) · `STYLE_PALETTE_MAP` (the phone Style tray's stripes).
- Rules: an unknown style name → restyle falls back to *Modern*'s paragraph (RP:169); the surgical render uses an empty paragraph and still names the style; Auto Furnish names the style alone.
- Reachable: —

### D-129 · Time budgets: the route's `maxDuration` vs its own abort
- Where: each route file's `maxDuration` + `setTimeout(… abort …)`
- Does: detect — none · 30 s; segment — none · 30 s; **render 60 · 120**; **photorealistic 60 · 120**; **relight 60 · 120**; **declutter 60 · 120**; style-transfer 300 · 280; auto-furnish 300 · 280; drift-check 60 · 55; drift-fix 300 · 280; style-analyze 60 · 60; room-analyze 60 · 60; room-scan 60 · 55; **outpaint 60 · 120**; **reangle 60 · 120**; **depth 60 · 120**; orbit-video 300 · 280; detect-sandbox none · 60; floorplan-3d-sandbox 120 · —.
- Rules: where the abort (bold) is longer than `maxDuration`, a slow model is cut off by the platform and the user sees a generic platform failure, never the route's *Generation timed out — try again*; the three 300 s routes were fixed on purpose ("The abort must fire INSIDE maxDuration", `API/render/style-transfer:206-208`). The surgical render — the product's main pass — is one of the unfixed ones. (Actual platform limits not verified.)
- Reachable: —

### D-130 · Payload caps and the client's compression targets
- Where: the routes (D-86…D-98); CI:1; DG:23-29; CB; SBX pages
- Does: server caps — **14,000,000 base64 chars (~10 MB) per image** on every image route (except photorealistic, outpaint, reangle, depth, orbit-video: none) and **2,000,000 chars (~1.5 MB) for all images together** on style transfer, auto furnish, drift check and drift fix. Client targets — detection 2048 px / JPEG 0.95 (the `compressBase64` default, "so the payload stays under Vercel's 4.5 MB limit"); editing base ≤ 1600 px and swatches ≤ 1024 px (B-35); drift check 1024 px / 0.8, repair 1280 px / 0.88; sandboxes' rooms 1536 px / 0.9, references 896 px / 0.82, catalogue products 640 px / 0.8.
- Rules: with a 4.5 MB platform body limit the routes' 10 MB check can only fire off-platform (not verified). The 2 MB multi-image cap is what actually limits Style Transfer and Auto Furnish: a large room photo alone can exceed it (*Images are too large in total — …*).
- Reachable: —

### D-131 · Rate limits in one place (per IP, per minute, per server instance)
- Where: each route's `checkRateLimit` call; `src/lib/rate-limit.ts:1-37`
- Does: render **10** · detect 20 · segment 20 · photorealistic 30 · relight 30 · declutter 30 · style-transfer 30 · style-analyze 30 · auto-furnish 30 · room-analyze 30 · room-scan 60 · drift-check 60 · drift-fix 30 · outpaint 30 · reangle 40 · orbit-video 10 · depth 30 · detect-sandbox 40 · floorplan-3d-sandbox 30 (default elsewhere: 5).
- Rules: counted per `route key + IP` in process memory (a cold start or a second instance resets it; a studio behind one office IP shares every budget). The surgical render fans its variants out on the SERVER (1 request for 3 variants); restyle and style transfer fan out on the CLIENT (3 requests for 3 variants, C-09/C-10), each then passing through the drift guard's own calls. Exceeding answers *Too many requests* (429).
- Reachable: —

---

## Uncertain / not verified

1. **Auto Furnish on a phone** — by reading, nothing below `lg` runs `handleAutoFurnish` (the Generate bar calls `handleGenerate`; the Controls sheet footer too; `AutoFurnishControls` has no button). C's Uncertain #1 says the same. Not run on a device.
2. **Platform time limits** — D-129 assumes `maxDuration` is honoured as written; whether the hosting plan allows 300 s, and what the user sees when a 60 s function is killed mid-call, was not checked.
3. **Request body limit** — `compress-image.ts` names "Vercel's 4.5 MB limit"; if that limit applies, the routes' 14,000,000-character checks (*Image too large (max 10MB)*) are unreachable in production. Not verified against the deployment.
4. **Who sees Accounts › Material Catalog** — the Accounts page admits owner, admin, id and accounting (`access-control.ts:126`) and the tab has no `ownerOnly` flag, while the component's comment calls management "owner/admin territory" and the access comment says ID / accounting get "the viewable subset". Which roles actually see and can edit the tab was not traced.
5. **`studio_materials` row-level policies and the bucket's write policy** — only the table, indexes and bucket settings were read from migration 121 (shape only, per the brief); E owns the policies.
6. **Rate-limit keying behind a proxy** — `getClientIp` prefers `x-real-ip`, then the last `x-forwarded-for` hop; whether a whole studio office shares one budget depends on the network (D-131).
7. **Refinement restyle** (`isRefinement`, D-47) — no studio-editor caller was found in the parts read; the 3D planner may use it (not part of this slice).
8. **Line numbers in VZ** are from this checkout; the shell wiring was read at VZ:4677-4830, 5236-5347, 5460-5545, 5766-5825 only.
9. **The detect sandbox's "5 models"** copy vs its 4-model roster — which model was removed was not traced (git history not read).
10. **Drift guard per variant** — D-131 assumes the guard runs once per result as C-09 / C-10 describe; the call counts in D-116 are per guarded result.

## Hand-offs

- **Reader A** — the anonymous trial's own routes (`/api/demo/visualizer/{quota,detect,segment,render,photorealistic,declutter}`: `trialEnabled()` → *trial_disabled* 503, their rate limits, `maxImageBytes: 8_000_000`, the fixed trial model, the shared 3-generation quota, the watermark call) and the trial pages that reuse the phone shell (D-127); the landing that calls `/api/visualizer/workspace` (D-108).
- **Reader B** — the desktop counterparts the phone rows reference: structural groups (B-57), `nextFurnitureForAction` toggling (B-78), the replace / customize panels (B-79, B-80), `suggestMaterials` (B-62), the upload flow and dialog (B-65, B-66), the library import (B-68), the Controls sheet (B-113), `processRoomFile` and the downscales (B-35).
- **Reader C** — every pass's client payload and persistence (C-09…C-17, C-35, C-36), the View dialog's Compare opened from the Versions sheet, `deleteRender` / `editVersion` / `editFromGallery`, the drift guard's user-visible behaviour (C-17), and the Spatial View experiment component that drives outpaint / reangle / orbit / depth (C-109…C-112).
- **Reader E** — tables and storage: `render_jobs`, `project_rooms`, `studios.settings.visualizerWorkspace`, `studio_materials` (+ its RLS and the `studio-materials` bucket policies), `studio_material_catalog` (+ `vendor_id`, migration 312), the `renders` bucket, and the orphaned-file cases this slice found (a deleted render's image stays in `renders`, D-19; an archived swatch's file stays in `studio-materials`, D-118).
- **Reader F** — what 2.0 already has for: a bottom-sheet phone shell (REG-298…300, REG-353…355 — sheets, one-row toolbars), a Price book / library gallery that could host the swatch library and the product catalogue (D-117…D-121), and a Maison AI simulation layer that could reproduce the dry-run contract (D-116).
- **Quotes / selections module audit** — the Material Catalog (D-121) is primarily a client-selections feature (`project_selections.options`, `selection-create-dialog.tsx`, `material-catalog-picker.tsx`); only its Auto Furnish pinning belongs to the visualizer.
