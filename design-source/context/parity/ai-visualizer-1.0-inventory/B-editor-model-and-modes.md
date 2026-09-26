# OpenMaison 1.0 — AI Visualizer inventory · Slice B: the editor's model and its modes

Commit `67f42e469` (branch `integ/security-non-qanvast`) · read whole 2026-09-25 · reader B. All paths under `/Users/vicky/Documents/GitHub/qanvast-id-tool`. Rows cite `path:line`; where a region is also reader C's (the render flow, versions, tools, exits) the row says "also C".

## Abbreviations

| Code | File |
|---|---|
| VZ | `src/components/projects/visualizer.tsx` (5,904 lines — the editor) |
| CS | `src/components/projects/control-shell.tsx` (ControlPanel · ControlTile) |
| RL | `src/components/projects/visualizer-rail.tsx` (VisualizerRail · GalleryStrip · GalleryThumb · GalleryRenderingTile) |
| RC | `src/components/projects/relight-controls.tsx` |
| CMD | `src/components/projects/custom-material-upload-dialog.tsx` |
| MCP | `src/components/projects/material-catalog-picker.tsx` |
| MS | `src/components/projects/visualizer-material-sheet.tsx` (MaterialBrowser · MaterialPickerSheet · AddItemDialog) |
| CG | `src/components/projects/use-canvas-gestures.ts` |
| GM | `src/components/projects/canvas-gesture-math.ts` |
| OV | `src/components/projects/visualizer-canvas-overlays.tsx` (PlaceOverlay · LassoOverlay) |
| CMP | `src/components/ui/compare-slider.tsx` |
| MSH | `src/components/projects/visualizer-mobile-shell.tsx` (D owns; exports named here only) |
| DS | `src/data/design-styles.ts` |
| FP | `src/data/furniture-presets.ts` |
| MC | `src/data/mock-catalogue.ts` |
| GC | `src/data/gush-catalogue.ts` |
| SM | `src/lib/queries/studio-materials.ts` |
| WQ | `src/lib/queries/visualizer-workspace.ts` |
| MQ | `src/hooks/use-media-query.ts` |
| NI | `src/lib/normalize-image.ts` |
| CB | `src/lib/crop-to-bucket-aspect.ts` |
| CI | `src/lib/compress-image.ts` |
| MK | `src/lib/visualizer/mask-composite.ts` |
| PG | `src/app/(main)/tools/ai-visualizer/page.tsx` (mount, A/D own) · PP `src/app/(main)/projects/[projectId]/page.tsx` |
| T-touch | `src/__tests__/visualizer-touch-affordance-guard.test.ts` · T-ov `visualizer-canvas-overlays.test.tsx` · T-ms `visualizer-material-sheet.test.tsx` · T-mask `mask-composite.test.ts` · T-cg `use-canvas-gestures.test.tsx` · T-gm `canvas-gesture-math.test.ts` |

## Vocabulary

- **Entity** — what the editor is opened on: a *project* (`projectId`), a *lead* (`leadId`) or a standalone *session* (`sessionId` + `sessionRoomIds`); `entityId = projectId || leadId || sessionId` (VZ:1499-1501). Rooms and jobs are loaded per entity.
- **Session / design** — a standalone visualizer design with no project or lead; its room ids live in `studios.settings.visualizerWorkspace.sessions[].roomIds` (WQ:28, D/E own the route). The editor only reports new rooms back through `onRoomCreated` (VZ:2244).
- **Workspace** — the landing page's model of every design (projects, leads, sessions, folders) built by `useVisualizerWorkspace` from `GET /api/visualizer/workspace` (WQ:48-136). The editor never calls it.
- **Room** — `Room { id, name, originalImageUrl }` (VZ:281-285) = a `project_rooms` row (`RoomRow` VZ:323-327) or a local-only `local-<id>` room in temp mode (VZ:2250-2254).
- **Original** — the room's first upload, held in `roomOriginal[roomId]` (VZ:1486) and shown in the gallery under the key `"__original__"` (VZ:1630).
- **Working image / editing base** — `RoomImageState { base64, mimeType, previewUrl, width?, height? }` per room (VZ:329-335): the image every edit and render runs on; `roomBaseKind` says whether it is the `"original"` or a `"render"` (VZ:1487).
- **Version / render** — one `VariantResult { id, imageUrl, materials[], parentKey? }` (VZ:272-279) inside a **job** `RenderJob { id, roomId, model, style, createdAt, variants[] }` (VZ:302-309; DB shape `RenderJobRow` VZ:313-320); gallery key `${jobId}:${variantId}`; numbered V1, V2… oldest first (VZ:1651-1652). (C owns versions.)
- **Surface** — `Surface { id, label, materialId | null, x, y }` (VZ:87): a detected plane with a descriptive label ("black marble floor") and a normalised 0–1 dot position; `materialId` null = **None** (keep unchanged).
- **Structural group** — `SurfaceGroup` (VZ:199-205): `Walls · Feature Walls · Panelling · Cabinets · Wardrobes · Open Shelving · Countertops · Backsplash · Floor · Ceiling · Doors · Trim & Moulding · Other`, derived from the label by `surfaceGroupFor` (VZ:220-244). Selecting a group bulk-assigns every surface in it.
- **Label group (leaf)** — surfaces whose lower-cased labels are identical collapse into one row shown "×N"; a material applies to every instance (VZ:4110-4116, 2571-2574).
- **Marker / dot** — the button drawn at a surface's or furniture item's (x, y) on the image: squares for surfaces, circles for furniture (VZ:5085-5204); `detectorsOn` shows or hides them (VZ:1328).
- **Material** — a stock `CatalogueItem { id, name, category, subcategory, description, swatch, finish, colorFamily, tags }` (MC:33-43); or a session **custom material** `CustomMaterial { id: "custom-<nanoid>", name, base64, mimeType, previewUrl }` (VZ:337-343); or a **studio library** material `StudioMaterial` (row in `studio_materials`, SM) which is imported into the session as a custom material on click (VZ:2653-2682).
- **Swatch** — the tile that stands for a material: a hex square for stock, an image tile for custom/library (VZ:651-686, MS:29-52).
- **Recent** — the last 12 stock material ids the user assigned, per user in localStorage (VZ:1365-1372, 2578-2585).
- **Furniture item / instance** — `FurnitureItem { id, label, category, action, replacementDesc, customizeMaterial, customizeColor, refImage, x, y }` (VZ:104-120); a **furniture group** = every instance with the same `normFurnitureKey(label)` (label minus its trailing "(position)", lower-cased; VZ:162-164).
- **Furniture action** — `keep | remove | replace | customize` (VZ:91); keep is the silent default.
- **Reference photo** — `FurnitureRefImage { base64, mimeType, previewUrl }` attached to a *replace* (VZ:103).
- **Style** — one of the 25 `DESIGN_STYLES` names (DS:27-256) or `""` = None (VZ:1347).
- **Style reference / Style Transfer** — a `StyleTransferState` with reference images (VZ:1459; C owns the controls).
- **Lighting preset / knobs / fixtures** — `RelightKnobs { sunAngle, colorTemp, intensity, shadows, fixtures }` (RC:25), six `RELIGHT_PRESETS` (RC:32-39), four tri-state fixtures (RC:14-21).
- **Tweak / baseline** — `RelightTweak` (RC:52): the live, client-side slider values on a relit result and the values the render was made with.
- **Relit** — a relight render; its job label starts with "Relit" (VZ:3130).
- **Finishing** — the panel holding *Custom Instructions* (`refinementPrompt`) and *Render quality* (VZ:4464-4497); the same text is the footer **Prompt** box (VZ:5455-5459).
- **Variants** — how many renders one Generate produces, 1 / 2 / 3 (VZ:1348).
- **Quality** — *Fast* = `google/gemini-3.1-flash-image` (default) · *High quality* = `google/gemini-3-pro-image-preview` (VZ:356-363); for a sketch *Fast* / *High quality* = flash / `black-forest-labs/flux.2-pro` (VZ:436-443).
- **Tile / panel** — `ControlTile` (a summary card) and `ControlPanel` (the slide-in panel it opens) (CS).
- **Rail** — the desktop right column `VisualizerRail` (RL:26-133): markers switch → single-open accordion sections → optional drawer → footer.
- **Drawer** — the overlay over the rail's sections for Style Transfer / Auto Furnish / Defurnish (RL:74-86).
- **Pill** — the footer's tool buttons (Style Transfer · Auto Furnish · Defurnish) (RL:91-107).
- **Gallery strip** — the collapsible thumbnail row under the canvas on desktop (RL:137-172).
- **Save to project / temp mode** — `saveToLibrary` (VZ:1388): OFF = nothing persists.
- **Sketch mode** — `SketchState.isSketch` (VZ:444-450): the upload was classified a sketch and must be rendered to a photo first.
- **Region / lasso mode** — `regionMode` (VZ:1313): draw around missed items to re-detect.
- **Place mode** — `placing` (VZ:1341): the next tap on the image drops a new surface / furniture dot.
- **Pick-to-remove** — `removing` (VZ:1344): tap the one marker of a ×N group to delete.
- **Detection cache** — `detectionCacheRef` (VZ:1382): surfaces + furniture per version URL, so re-selecting a version re-runs no detect call.
- **Tap word** — `tapWord = coarse ? "Tap" : "Click"` (VZ:1278).

## Overview / map

The editor is one client component, `Visualizer` (VZ:1270), mounted full-screen by the AI Visualizer tool page (PG:212-217, with `sessionId` / `sessionRoomIds` / `initialRoomId` / `onRoomCreated` / `onBack`) and inside a project page's Renders tab (PP:4042, `projectId` + `leadId`). It holds every piece of state itself — there is no store, no reducer, no undo stack: the model is ~90 `useState`s (VZ:1281-1492), mostly `Record<roomId, …>` maps so each room keeps its own image, surfaces, furniture, selection, sketch state, original and lineage while the config that "travels" (style, style reference, lighting, prompt, quality, variants, custom materials, recents) is shared across rooms.

Data comes from two scoped routes on mount — rooms (`/api/projects/rooms`) and completed render jobs (`/api/renders/jobs`) — keyed by entity (VZ:1507-1592). Everything visual on a room (its surfaces, furniture, dots) is ephemeral: it is re-detected by `/api/render/detect` on every upload, on every version the user selects to edit (cached per URL for the session), and once when a room with a stored image is opened. Persistence is: the room row + its original in the `renders` Storage bucket (`{studio}/{entity}/rooms/{room}/original.{ext}`), one `render_jobs` row per generate (C), the studio material library (`studio_materials` + `studio-materials` bucket), and one localStorage key for recents. The session workspace (folders, sessions, room ids) is written by the landing page, not the editor.

The editing model is *select → assign → generate*: on desktop the rail's four accordion sections (Style · Surfaces & Materials · Furniture · Lighting) plus a footer (Prompt · Fast/High quality · one primary button) and three pill-opened drawers (Style Transfer · Auto Furnish · Defurnish); below `lg` a dock of the same modes drives trays (D owns those) and a "More" bottom sheet that carries the older tile grid (`railTiles`) with slide-in `ControlPanel`s. Surfaces are a two-level list (structural group → label rows) whose selection is mirrored by the dots on the canvas; a material picked from the catalogue applies to the whole group or to every surface sharing the label; surfaces left at None are sent as a preserve list so the render leaves them alone. Furniture rows fan an action (Remove · Replace · Customize) out to every instance of a group. Style is a card grid of 25 named looks (or None) that only sets a name — nothing auto-assigns. Lighting is presets + sliders + fixtures that ride into the single Generate. The canvas is a pointer-events pan/zoom surface with two overlays (place, lasso) and the marker layer measured to the letterboxed image.

---

## B1 · The model — types

### B-01 · Surface type
- Where: VZ:87 (type), VZ:2154-2162 (built from detection), VZ:2724-2731 (placed by hand)
- Entry: —
- Does: `{ id: nanoid, label, materialId: string | null, x, y }`; x/y are the normalised 0–1 position of the detected material patch, the dot's anchor. Manual / fallback surfaces default to the centre (0.5, 0.5) or to the tapped spot.
- Rules: `materialId` starts null on every detection ("Detection only IDENTIFIES surfaces … It never assigns a material", VZ:2158-2160). `materialId` is a stock catalogue id or `custom-<id>`.
- Data: in-memory only (`roomSurfaces[roomId]`); reaches the render as `surfaces[{label, material, description | customRefIndex}]` + `preservedSurfaces[labels]` (VZ:3266-3306; C).
- States: None (null) · assigned (stock) · assigned (custom).
- Words: —
- Reachable: yes

### B-02 · FurnitureItem, its action and reference photo
- Where: VZ:91 (`FurnitureAction`), VZ:96-102 (`nextFurnitureForAction`), VZ:103 (`FurnitureRefImage`), VZ:104-120 (`FurnitureItem`)
- Entry: —
- Does: `{ id, label, category, action, replacementDesc, customizeMaterial, customizeColor, refImage, x, y }`. `nextFurnitureForAction(f, a)` toggles: tapping the active action returns to `keep`; `keep`/`remove` clear description, palette picks and the reference; `replace` clears the palette picks; `customize` clears the reference image ("image lives only on replace").
- Rules: category is the detector's word (one of the 8 in FP:6-15, corrected at suggestion time by `inferCategoryFromLabel`, FP:150-188); a hand-added item defaults to `"Decor"` (VZ:2736) or the picked category.
- Data: in-memory; reaches the render as `furnitureChanges[{label, action, replacementDesc?, x, y, customRefIndex?}]` and `preservedFurniture[{label,x,y}]` for keeps (VZ:3324-3346, 3385-3387; C).
- States: keep · remove · replace · customize.
- Words: the action buttons print the raw words `remove` · `replace` · `customize` (capitalised by CSS, VZ:1179-1199).
- Reachable: yes

### B-03 · Room, RoomRow and the working image
- Where: VZ:281-285 (`Room`), VZ:323-327 (`RoomRow` = `{ id, name, original_image_url }`), VZ:329-335 (`RoomImageState`)
- Entry: —
- Does: a room is a name + stored original URL; the working image is the base64 the renders and detections consume, with its bucket-cropped dimensions.
- Rules: `previewUrl` is the cropped data URL for a fresh upload or a stored room (VZ:2422, 2496) "so what the user sees == what the AI sees"; falls back to the stored URL when cropping fails (VZ:2514).
- Data: `project_rooms` (id, name, original_image_url, project_id, lead_id, studio_id — E owns the table); working image in memory only.
- States: room without image (`originalImageUrl` null → dropzone) · room with stored image not yet loaded (→ auto-load) · loaded.
- Words: —
- Reachable: yes

### B-04 · VariantResult · RenderJob · RenderJobRow (also C)
- Where: VZ:272-279, VZ:302-320
- Entry: —
- Does: a job = one render call (`model`, `style` = the job's descriptor label, `createdAt`, `variants[]`); a variant = `{ id (1-based), imageUrl, materials[{label, material}], parentKey? }`. `parentKey` = the gallery version the changes were made on (`"__original__"` or `${jobId}:${vId}`), persisted inside `variants_json` (VZ:3418-3420).
- Rules: the DB shape is snake_case (`room_id`, `variants_json`) and is mapped on load (VZ:1577-1589).
- Data: `render_jobs` rows via `/api/renders/jobs` (E/D).
- States: —
- Words: —
- Reachable: yes

### B-05 · CustomMaterial · MaterialDisplay · getMaterialDisplay
- Where: VZ:337-343, VZ:345-351, VZ:378-397
- Entry: —
- Does: `getMaterialDisplay(materialId, customMaterials)` resolves an id to `{ name, swatch?, previewUrl?, description?, isCustom }`: `custom-` ids look in the session list, others in `MOCK_CATALOGUE`; unknown → null (a removed custom material shows as None).
- Rules: custom names are auto `"Custom N"` unless the dialog gives one (VZ:2624).
- Data: session memory; not persisted (a library save happens in the dialog, B-68).
- States: —
- Words: —
- Reachable: yes

### B-06 · SketchState and the quality presets
- Where: VZ:433-450
- Entry: —
- Does: `SketchState { isSketch, subtype, roomContext, versions[], selected }` per room; `QualityPreset "fast" | "high"` → `QUALITY_PRESET_MODEL` (`google/gemini-3.1-flash-image` / `black-forest-labs/flux.2-pro`); `QUALITY_OPTS` are the two cards.
- Rules: `versions`/`selected` are legacy (the per-tab sketch versions strip was removed; the render is adopted straight away, VZ:2937-2941); `currentSketchRenderUrl` is only non-null when `selected ≥ 0` (VZ:1647), which nothing sets any more → the in-canvas sketch compare (VZ:5224-5230) is effectively dead.
- Data: memory.
- States: —
- Words: `Fast` · badge `Quick` · hint *Lower detail — quicker to generate.* / `High quality` · badge `Slower` · hint *Best detail — takes a bit longer.* (VZ:440-443)
- Reachable: yes (sketch mode)

### B-07 · The render models (Fast / High quality)
- Where: VZ:356-363 (`MODELS`), VZ:366-372 (`DEFURNISH_MODEL`, `DEFURNISH_SCOPES`), VZ:1349 (default = `MODELS[1]` Fast)
- Entry: footer toggle (B-111), Finishing panel (B-109)
- Does: `MODELS[0]` `google/gemini-3-pro-image-preview` label `Pro Quality` note `best`; `MODELS[1]` `google/gemini-3.1-flash-image` label `Fast Preview` note `quick`. The UI never prints these labels or model ids — it prints *Fast* / *High quality* ("per product decision", VZ:434-435).
- Rules: Fast is the default; the choice is session-wide, not per room.
- Data: `model` on the job row.
- States: —
- Words: *Fast is quicker; high quality sticks closest to your photo.* (VZ:4495)
- Reachable: yes

## B2 · The model — state

### B-08 · Per-room state maps
- Where: VZ:1281-1305, VZ:1477, VZ:1486-1492
- Entry: —
- Does: `rooms[]`, `activeRoomId`, `roomHistory{roomId: RenderJob[]}` (newest first), `roomSelectedVersion{roomId: key}` (drives the gallery border; absent = Original), `roomImages`, `roomSurfaces`, `roomSelectedSurface{roomId: surfaceId|null}`, `roomSelectedGroup{roomId: SurfaceGroup|null}`, `expandedSurfaceGroups{group: bool}` (NOT per room — reset on every detection), `roomFurniture`, `roomSelectedFurniture`, `roomSketch`, `roomOriginal{roomId: url}`, `roomBaseKind{roomId: "original"|"render"}`, `jobLabel{jobId: string}` (local descriptor shown in the gallery), `jobParentUrl{jobId: url}` (compare "before").
- Rules: switching rooms keeps every map; only errors, the canvas transform and the relight panel reset (B-19). `jobLabel` / `jobParentUrl` are local — after a reload the gallery falls back to `job.style` and the Original (VZ:1483-1492).
- Data: memory.
- States: —
- Words: —
- Reachable: yes

### B-09 · Session-wide config state (shared across rooms)
- Where: VZ:1347-1372 (`style`, `variantCount`, `selectedModel`, `catalogueFilter`, `materialSearch`, `refinementPrompt`, `promptOpen`, `customMaterials`, `pickedMaterialFile`, `libraryMaterials`, `recentMaterials`), VZ:1442-1474 (`autoFurnish`, `defurnishScope` default `"joinery"`, `defurnishInstruction`, `relightKnobs`, `styleTransfer`, `relightActivePreset`, `relightInstruction`, `relightTweak`, `relightBaseline`, `relightJobState`), VZ:1478 (`qualityPreset` default `"fast"`)
- Entry: —
- Does: the "recipe" the next Generate uses. It is not per room: a style, lighting or prompt set on Room 1 is still set when Room 2 is opened.
- Rules: `style` and `styleTransfer` are reset to None on a fresh photo and when the Original is re-selected (VZ:2385-2389, 3097); lighting, prompt and furniture/material picks are NOT reset by a room switch. Defurnish scope "is intentionally sticky across opens" (VZ:2841).
- Data: memory, except `recentMaterials` (B-20).
- States: —
- Words: —
- Reachable: yes

### B-10 · UI / mode state
- Where: VZ:1308-1344 (`isDragging`, `detecting`, `regionMode`, `regionPath`, `regionDetecting`, `detectorsOn` default true, `showAddSurface`/`addingLabel`, `showAddFurniture`/`addingFurnitureLabel`/`addingFurnitureCategory` default `"Seating"`, `placing`, `removing`), VZ:1374-1399 (`generating`, `genAbortRef`, `detectionCacheRef`, `generateError`, `saveToLibrary` default true, `showPanel`, `sheetSnap` default `"full"`, `changesSheetOpen`, `roomsSheetOpen`, `versionsSheetOpen`, `materialSheetOpen`, `addItemKind`), VZ:1409-1441 (`viewingVariant`, `viewingOriginalUrl`, `annotatorOpen`, `viewingCompareKeys`, `sentToChat`, `sharing`, `sharingToPortal`, `shareUrl`, `shareDialogOpen`, `openTile` default `"style"`, `defurnishOpen`, `autoFurnishOpen`), VZ:1444-1453 (auto-furnish / defurnish busy + error + `defurnishVersions`), VZ:1462-1470 (`driftChecking`, `relightResult`, `relightBeforeUrl`, `relightPanelOpen`, `relightJobId`), VZ:1479-1480 (`sketchRendering`, `sketchError`), VZ:3933 (`historyExpanded`)
- Entry: —
- Does: which panel is open (`openTile`: `"style" | "styleTransfer" | "surfaces" | "furniture" | "lighting" | "finishing" | null`), which tool mode is armed, which sheets are up.
- Rules: `openTile` null on desktop means "no accordion open" (dots of both kinds show); the two drawers are separate booleans that win over `openTile` in the rail (`openId={defurnishOpen || autoFurnishOpen ? null : openTile}`, VZ:5416).
- Data: memory.
- States: —
- Words: —
- Reachable: yes

### B-11 · Derived room values
- Where: VZ:1617-1652
- Entry: —
- Does: `activeRoom`, `activeImage`, `activeSurfaces`, `detectedSurfaceLabels` (fed to prompts and the drift judge), `activeSelectedSurfaceId/Surface/Group`, `activeHistory`, `selectedVersionKey` (default `"__original__"`), `canChangePhoto` (= selection untouched or on the Original), `activeFurniture`, `activeFurnitureChanges` (action ≠ keep), `furnitureItemCount` (distinct groups), `furnitureChangedCount`, `activeSketch`/`sketchMode`/`currentSketchRenderUrl`, `galleryOriginalUrl` (roomOriginal → working preview → stored URL), `chronoVariantKeys` + `versionOf(jobId, vId)`.
- Rules: "Change photo" hides once a render is the selected version ("swapping the source then would orphan those renders", VZ:1632-1636).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-12 · Intent flags and `canGenerate` (also C)
- Where: VZ:1721-1748, VZ:3873-3879
- Entry: —
- Does: `relightConfigured` = a preset is active OR any knob ≠ neutral OR any fixture set OR a lighting instruction typed; `hasRedesignIntent` = any surface has a material OR any furniture change OR prompt text; `hasStyleSelected` = style ≠ ""; `hasStyleReference` = `styleTransferConfigured(styleTransfer)`; `hasSurgicalEdits` = material assigned OR furniture change; `promptLed` = prompt text; `canGenerate` = image loaded AND (material OR furniture change OR lighting OR style OR reference OR prompt) AND not generating.
- Rules: detected-but-unassigned surfaces alone never enable Generate.
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-13 · Derived material lists (`suggestedCategories`, `filteredCatalogue`)
- Where: VZ:1752-1759, VZ:1761-1795
- Entry: —
- Does: `suggestedCategories` = for a selected group `groupMaterialCategories(group)`, else for a selected surface `surfaceCategoriesFor(label)` falling back to an exact `SURFACE_CATEGORY_MAP[label]` hit, else null. `filteredCatalogue` = stock catalogue minus the Gush brands → if searching: fuzzy match on name / category / subcategory / description / tags → else if filter `Recent`: the recents in order → else if a category is picked: that category → else (All) the whole list sorted with the suggested categories first.
- Rules: search wins over the category chip; the Gush groups are always excluded here and rendered as their own sections (B-62).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-14 · No undo · no dirty state · "Auto-saved"
- Where: VZ:4831, 4846 (comments "undo/redo" with no control), CS:40-44 (`Auto-saved` indicator), VZ:1433-1436
- Entry: —
- Does: there is no undo stack, no redo, no unsaved-changes prompt. Every control mutates lifted state directly; closing a panel just closes it. The panel header prints *Auto-saved* with a green dot for every panel except *Empty the room* and *Auto Furnish* (`autosaved={false}`, VZ:4674-4675).
- Rules: leaving the page discards every unrendered pick (surfaces, furniture actions, lighting, prompt) — only renders persist.
- Data: —
- States: —
- Words: *Auto-saved*
- Reachable: yes

### B-15 · What persists where (summary)
- Where: VZ:1507-1592 (load), 2226-2256 (room), 2364-2469 (original), 2759-2834 (jobs; C), 1365-1372 + 2578-2585 (recents), CMD/SM (library), WQ (workspace)
- Entry: —
- Does: **DB rows** — `project_rooms` (create / rename / set original / delete through `/api/projects/rooms[...]`), `render_jobs` (C), `studio_materials` (library), `studios.settings.visualizerWorkspace` (landing only). **Storage** — bucket `renders`: `{studioId}/{entityId}/rooms/{roomId}/original.{jpg|png}` (upsert), `{studioId}/{entityId}/rooms/{roomId}/jobs/{jobId}/variant-{n}.png`, `…/variant-1-edit-{Date.now()}.png` (relight overwrite), `{studioId}/{entityId}/shared/{uuid}.png` (portal share of a data URL); bucket `studio-materials`: `{studioId}/{uuid}.{ext}`. **localStorage** — `visualizer-recent-materials-{userId}` (JSON array of stock ids, max 12). **Memory only** — surfaces, furniture, selections, materials assigned, custom materials, lighting, prompt, style, sketch state, labels/parents of jobs, detection cache.
- Rules: nothing is written when `saveToLibrary` is off or there is no `entityId` (B-23).
- Data: as listed.
- States: —
- Words: —
- Reachable: yes

### B-16 · Mount points and props
- Where: VZ:1270 (props `projectId? leadId? sessionId? sessionRoomIds? initialRoomId? onRoomCreated? onBack?`), PG:34 + 212-217 (tool page: dynamic import, `key` = project-lead-session-initialRoom so a change remounts, `onRoomCreated` → `useAddRoomToSession`, `onBack` → close), PP:79 + 4042 (project page: `projectId` + `leadId`, no `onBack`)
- Entry: Tools › AI Visualizer (a design card / *New* → session; lead / project pickers) and a project's Renders tab.
- Does: the tool page shows the editor full-screen with the top bar breadcrumb set to the design's name and focus mode below `lg` (PG:102-118).
- Rules: a project mount also passes the project's `leadId`, but `entityCol`/`entityId` prefer the project (VZ:1499-1500) — the lead id is only used for `linkedChat` matching (VZ:1797-1799) and the job row's `leadId` (VZ:2795).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-17 · Load on mount (reset + rooms + jobs)
- Where: VZ:1507-1592
- Entry: mount / entity change
- Does: 1) resets every per-room map, errors, viewer and `saveToLibrary` (true) "to prevent data leaking between projects/leads"; 2) if no `entityId` → not loading, nothing; 3) fetches `GET /api/projects/rooms?entityType=project|lead&entityId=…` (or `?roomIds=a,b` for a session; an empty session list skips the fetch) and `GET /api/renders/jobs?…&status=completed` in parallel; 4) maps rows, picks the active room, seeds `roomOriginal` from each room's stored URL, groups jobs by `room_id` (jobs without a room are dropped).
- Rules: the session's room-id list is captured once in a ref so adding a room never re-triggers the reset (VZ:1502-1505). Fetch failures degrade to empty lists silently (no toast).
- Data: reads `project_rooms`, `render_jobs`.
- States: `loadingRooms` → a spinner in the canvas (VZ:5041-5043).
- Words: —
- Reachable: yes

### B-18 · `initialRoomId` targeting
- Where: VZ:1567-1571
- Entry: the landing page opens a design on a particular room (PG:120-123)
- Does: if `initialRoomId` is one of the loaded rooms it becomes active, else the first room.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-19 · Room-switch reset
- Where: VZ:1594-1602
- Entry: `activeRoomId` changes
- Does: clears `generateError`, fits the canvas, clears the relight preview (`relightResult`, panel closed, `relightJobId` null, baseline neutral).
- Rules: style / lighting knobs / prompt / furniture-material picks are NOT reset on a switch.
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-20 · Recent materials (localStorage)
- Where: VZ:1365-1372 (read, lazy initialiser), VZ:2578-2585 (write)
- Entry: assigning a stock material
- Does: prepends the id, dedupes, caps at 12, writes JSON to `visualizer-recent-materials-{getUserId()}`; the *Recent* chip appears in the category row only when the list is non-empty (VZ:842).
- Rules: custom ids are never stored ("session-local"); quota errors are swallowed.
- Data: localStorage key above.
- States: —
- Words: chip *Recent*
- Reachable: yes

### B-21 · Detection cache
- Where: VZ:1378-1382, VZ:2195-2203 (store), VZ:3107-3122 (hit)
- Entry: selecting a gallery version to edit
- Does: after a non-sketch detection with a `cacheKey` (the version's URL) the surfaces + furniture are cloned into the cache; re-selecting that version restores them (materials back to None, first surface selected, groups collapsed, furniture selection cleared) without a detect call.
- Rules: sketches are never cached; the cache is per component instance (lost on remount).
- Data: memory.
- States: —
- Words: toast *Editing this version* / *Editing the original* still fires on a hit (VZ:3124).
- Reachable: yes

### B-22 · The workspace API — who calls it
- Where: WQ:31-44 (`GET /api/visualizer/workspace?meta=1`, `PUT` with `{ workspace: { folders, sessions } }`), WQ:48-136 (`GET /api/visualizer/workspace` → `{ rooms, jobs, workspace }`), WQ:153-230 (mutations: create session / folder, delete folder, move, rename, add room to session, delete session), VZ:2244 (`onRoomCreated`)
- Entry: the landing page; the editor only through `onRoomCreated`
- Does: the workspace JSON is `{ folders: [{id, name}], sessions: [{id, name, folderId, roomIds[], createdAt, updatedAt}] }` stored in `studios.settings.visualizerWorkspace` (per studio, not per user). A new session room is appended to `roomIds` by the page's `useAddRoomToSession` when the editor calls `onRoomCreated(roomId)`. Deleting a session also deletes its rooms and jobs through the per-room routes. Project/lead designs are grouped from `project_rooms` rows; empty project/lead designs (no cover, no renders) are hidden, sessions always show.
- Rules: every mutation is a read-modify-write of the whole JSON (WQ:140-151). D owns the route's own rules; E the tables.
- Data: `studios.settings.visualizerWorkspace`.
- States: —
- Words: —
- Reachable: yes (through the landing)

### B-23 · "Save to project" toggle (temp render mode) (also C)
- Where: VZ:1384-1388, 1714, 4062-4085 (the switch, inside the Surfaces panel body), 2227-2255 (`createRoom` local), 2436-2452 (no original upload), 2765-2826 (no job persist; history replaced not appended), 5355-5356 (gallery disabled)
- Entry: Surfaces & Materials panel (mobile sheet) / Surfaces section (desktop rail — `surfacesBody` is shared)
- Does: a DS `Switch` labelled *Save to project*; ON: *Renders persist to this project.*; OFF: *Temp mode — closing wipes the render.* When OFF and a render exists a yellow note reads *Temp mode — close this and your render is gone.* Rooms created while OFF are `local-…` rooms (rename in memory only), uploads are not stored, jobs are not inserted and the room's history holds only the latest job.
- Rules: locked (`disabled`) once `renderHasStarted` = generating or any history (tooltip *Locked once render starts*); resets to ON when the entity changes.
- Data: gates every write in B-15.
- States: on · off · locked.
- Words: as quoted; gallery header tooltip when disabled *Save to project to browse history.*
- Reachable: yes

### B-24 · Touch-aware branches
- Where: VZ:1274-1278 (`useIsBelowLg`, `useCoarsePointer`, `tapWord`), MQ:23-32 (`(max-width: 1023.98px)`, `(pointer: coarse)`)
- Entry: —
- Does: `belowLg` decides which surface is live (rail vs sheets; `openMobilePanel` is a no-op on desktop, VZ:1402-1406; the Versions sheet opens after a phone render, VZ:3448); `coarse` swaps the word *Click* → *Tap* in three strings (B-140). CSS `hover-none:` variants reveal hover-only buttons on touch (T-touch).
- Rules: SSR-safe: both are false on the first render.
- Data: —
- States: —
- Words: —
- Reachable: yes

## B3 · Rooms

### B-25 · Empty state (no rooms yet)
- Where: VZ:5044-5058
- Entry: an entity with no rooms (a fresh session, lead or project)
- Does: an `EmptyState` with an image icon, a primary *Upload new room* button (opens the hidden `newRoomInputRef` picker, `accept="image/*"`) and, on hover-none devices only, an outline *Take photo* button (`cameraRoomInputRef`, `capture="environment"`).
- Rules: the tab-bar upload button is hidden while there are no rooms so "a fresh lead isn't confused" (VZ:4906-4909).
- Data: —
- States: empty · loading (spinner while `loadingRooms`).
- Words: title *Start with a room photo* · description *Upload a photo of the room you want to visualise — we'll detect the surfaces and furniture automatically.* · *Upload new room* · *Take photo*
- Reachable: yes

### B-26 · Upload new room (one click → room + photo)
- Where: VZ:2283-2287 (`handleNewRoomUpload`), VZ:4909-4930 (tab-bar button + two hidden inputs)
- Entry: the tab bar's dashed *Upload new room* button (desktop, only when rooms exist), the empty state, the phone Room switcher's upload / camera (VZ:5773-5774)
- Does: pick a file → `createRoom("Room " + (rooms.length + 1))` → `processRoomFile(id, file)` (B-38).
- Rules: rejects non-`image/*` types silently (a HEIC reported with an empty type is therefore refused here, unlike the drop path, B-36); the name is derived from the current count so after deleting Room 2 of three the next upload is also "Room 3".
- Data: —
- States: —
- Words: button *Upload new room* · tooltip *Pick a photo — a new room is created automatically*
- Reachable: yes

### B-27 · `createRoom`
- Where: VZ:2226-2256
- Entry: B-26
- Does: when `saveToLibrary && entityId`: `POST /api/projects/rooms { name, projectId | null, leadId | null }` → the returned room is appended and activated; for a session `onRoomCreated(id)` reports it to the page. Otherwise a `local-<nanoid>` room in memory.
- Rules: `studio_id` is stamped server-side; a failed POST returns null and nothing is created (no toast; the upload is dropped).
- Data: `project_rooms` insert.
- States: —
- Words: —
- Reachable: yes

### B-28 · Room tabs, switching and the active tab's ⋯ menu
- Where: VZ:4848-4903
- Entry: desktop top bar
- Does: rooms render as pill tabs in a horizontally scrolling carousel; clicking one sets `activeRoomId`. Only the active tab carries a ⋯ button (aria *Room options for {name}*, tooltip *Room options*) whose menu has *Rename room* and a destructive *Delete room*.
- Rules: the ⋯ menu is on the active tab only "so it works on touch (the old hover-reveal icons + double-click-to-rename were invisible on a phone)". No limit on rooms; the carousel keeps *Upload new room* pinned "even past ~14 rooms".
- Data: —
- States: active · inactive · renaming.
- Words: *Rename room* · *Delete room* · *Room options*
- Reachable: yes

### B-29 · Rename a room
- Where: VZ:2258-2281 (`renameRoom`), VZ:4854-4863 (inline input, aria *Rename room*), VZ:5775 (phone sheet `onRename`)
- Entry: ⋯ › Rename room (desktop), Room switcher sheet (phone, D)
- Does: the tab turns into an input pre-filled with the name; Enter or blur commits, Escape cancels. Trimmed; empty or unchanged → no-op. Optimistic update, then `PATCH /api/projects/rooms/{id} { name }`.
- Rules: `local-` rooms rename in memory only; on failure the name reverts and a toast shows.
- Data: `project_rooms.name`.
- States: —
- Words: toast *Couldn't rename the room*
- Reachable: yes

### B-30 · Delete a room
- Where: VZ:2289-2362
- Entry: ⋯ › Delete room; phone Room switcher (VZ:5776)
- Does: native `confirm("Delete this room and all its renders?")`; then, when there is an entity: removes every variant file whose URL contains `/renders/` and the original from Storage (best-effort), `DELETE /api/renders/jobs/by-room/{roomId}`, `DELETE /api/projects/rooms/{roomId}`; then drops the room from every local map and, if it was active, activates the first remaining room (or none → empty state).
- Rules: no undo. Storage deletes go through `removeObjects("renders", [path])` (client storage helper). The job rows are deleted explicitly because the FK is SET NULL, not cascade (VZ:2325).
- Data: `render_jobs`, `project_rooms`, bucket `renders`.
- States: —
- Words: *Delete this room and all its renders?* (native confirm)
- Reachable: yes

### B-31 · What a room remembers
- Where: B-08 maps; VZ:2534-2546 (`autoLoadedRoomsRef`)
- Entry: —
- Does: within the session a room keeps its working image, surfaces (+ materials), furniture (+ actions), selections, sketch state, selected version, history, original, base kind. Across reloads it keeps only its name, its stored original and its render jobs; everything else is re-derived (auto-detect once per room, B-44).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-32 · Back button
- Where: VZ:4833-4844 (desktop, only when `onBack`), MSH `MobileTopBar onBack` (VZ:4804)
- Entry: top-left
- Does: calls `onBack` (the tool page closes the editor; the project page passes none → no button).
- Rules: —
- Data: —
- States: —
- Words: tooltip *Back*
- Reachable: yes

### B-33 · Phone room switcher (data handed to D)
- Where: VZ:4769-4772 (`mobileRooms` = `{ id, name, active, cover: originalImageUrl, renders }`), VZ:5768-5777
- Entry: phone top bar
- Does: the sheet gets select / upload / camera / rename / delete callbacks bound to the same handlers as desktop.
- Rules: `renders` = the sum of variants over the room's jobs.
- Data: —
- States: —
- Words: D
- Reachable: yes (≤ lg)

## B4 · Upload and detection

### B-34 · Accepted files and size limit
- Where: VZ:585, 632 (`accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"`), VZ:633 (camera `accept="image/*" capture="environment"`), VZ:4917 + 4924 (`accept="image/*"`), VZ:5240 (change-photo picker, the long list), VZ:5078-5083 (drop: `image/*` OR empty type OR `.heic/.heif` name), VZ:2365-2368 (10 MB), NI:12-53
- Entry: every picker / drop
- Does: 10 MB hard cap before anything else; HEIC/HEIF (by MIME, extension, or byte probe when the type is empty/octet-stream) is converted to JPEG q0.92 with `heic-to` (WASM, lazy); JPEG/PNG/WebP pass through.
- Rules: the *Upload new room* and camera inputs accept any `image/*` (a browser may still list HEIC); the empty dropzone and change-photo pickers list HEIC explicitly.
- Data: —
- States: —
- Words: toast *File too large* · *Maximum size is 10MB.* · toast *Unsupported image* · *Couldn't read this HEIC photo — please try a JPG, PNG, or WebP.* (NI:51) or fallback *Please try a JPG, PNG, or WebP.*
- Reachable: yes

### B-35 · Normalisation: bucket crop and downscales
- Where: CB:15-23 (buckets 16:9 · 3:2 · 4:3 · 1:1 · 3:4 · 2:3 · 9:16), CB:56-130, VZ:2398-2429, VZ:2489-2498, CI:2-27, VZ:2132 (detect: 2048 px), VZ:3089-3090 (editing base: 1600 px), VZ:2620 (material swatch: 1024 px), VZ:4325 (furniture ref: 2048 px)
- Entry: every image entering the editor
- Does: centre-crops the photo to the nearest OpenRouter aspect bucket (skipped within 0.5 % — no re-encode), JPEG q0.95 (PNG stays PNG); the crop's dimensions ride into every render request so the output aspect matches (comparison slider alignment). `compressBase64` downscales the longest side and re-encodes JPEG q0.95 for the detect call, the editing base of any adopted version, custom swatches and furniture references (Vercel 4.5 MB body limit).
- Rules: crop failure falls back to the raw image with measured dims and `bucket: "?"`; a console log records `cropped to bucket aspect`.
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-36 · `processRoomFile` — a fresh photo
- Where: VZ:2364-2469
- Entry: new room upload, change photo, dropzone
- Does: size check → normalise → **style reset to None and the style reference cleared** ("no accidental Modern makeover") → read as data URL → bucket crop → set the working image + `roomOriginal` + `roomBaseKind = "original"` → fit to screen → (when saving) upload the CROPPED image to `renders/{studio}/{entity}/rooms/{room}/original.{png|jpg}` (upsert) and `PATCH /api/projects/rooms/{id} { originalImageUrl }` → `runDetection`.
- Rules: an upload error is logged, not shown; detection still runs on the local image.
- Data: bucket `renders`, `project_rooms.original_image_url`.
- States: while detecting the canvas shows the overlay (B-37).
- Words: —
- Reachable: yes

### B-37 · `UploadZone` — dropzone and the analyzing overlay
- Where: VZ:502-649
- Entry: canvas
- Does: with an image: the `<img object-contain>` plus a marker overlay positioned to the letterboxed content rect (`measureImage` derives it from the natural aspect; a ResizeObserver keeps it aligned) and, while `detecting`, a dimmed overlay with a spinner. Without an image: a dashed dropzone (click opens the picker; drag-over highlights) with an image icon, copy, an *Upload Image* button and a hover-none-only *Take photo* button.
- Rules: drop only works on the empty dropzone — with an image present there is no drop target (replace goes through Change photo).
- Data: —
- States: empty · dragging · image · detecting.
- Words: *Upload a room photo* · *JPG, PNG, WebP, HEIC · max 10MB* · *Best results on straight-on shots or clean 3D renders.* · *Upload Image* · *Take photo* · overlay *Analyzing image…* (neutral on purpose: "On a sketch nothing is detected — so don't claim 'Detecting surfaces'") · img alt *Uploaded room*
- Reachable: yes

### B-38 · Change photo
- Where: VZ:1632-1636 (`canChangePhoto`), VZ:5023-5031 (left toolbar, `SwapPhotoIcon`), VZ:4822-4824 (phone ⋯ menu), VZ:5236-5250 (hidden picker)
- Entry: left toolbar / phone ⋯
- Does: opens the picker; the file replaces the room's image through `processRoomFile` (same room row, original overwritten with upsert).
- Rules: only while the Original is the selected version; hidden once a render is selected.
- Data: —
- States: —
- Words: tooltip *Change photo* · menu *Change photo*
- Reachable: yes

### B-39 · `runDetection` — the detect call and what it fills
- Where: VZ:2125-2223
- Entry: after upload (B-36), on version select (B-21 miss), on room open (B-44), sketch "Use as-is" does NOT re-run it
- Does: sets `detecting`, clears the room's surfaces / furniture / selections / group, collapses every group, compresses the image (2048) and `POST /api/render/detect { imageBase64, mimeType }`. Response fields read: `imageType` (`"sketch"` → sketch mode unless `forcePhoto`), `sketchSubtype`, `roomContext`, `surfaces[]` (`{label,x,y}` or bare strings → centred), `furniture[]` (`{label, category, x, y}`). Photo: surfaces get ids and `materialId: null`, the first surface is auto-selected, furniture gets `action: "keep"`; the result is cached under `cacheKey`. Sketch: no dots at all.
- Rules: `forcePhoto` is set when adopting a render ("clean/minimalist renders can otherwise be mistaken for a 3D-model sketch", VZ:2140).
- Data: the detect route (D).
- States: `detecting` → *Analyzing image…* on the canvas, *Detecting surfaces…* / *Detecting furniture…* in the panels.
- Words: —
- Reachable: yes

### B-40 · Detection failure fallback
- Where: VZ:2205-2220
- Entry: the detect call throws
- Does: seeds three generic surfaces *Walls* (0.5, 0.35), *Floor* (0.5, 0.85), *Ceiling* (0.5, 0.08), no furniture, treats the room as a photo, selects *Walls*.
- Rules: a non-OK response that still parses as JSON is NOT a failure — it yields empty lists (VZ:2138: `res.json().catch(() => ({}))` with no `res.ok` check) → *No surfaces detected. Try re-uploading.*
- Data: —
- States: —
- Words: labels *Walls* · *Floor* · *Ceiling*
- Reachable: yes

### B-41 · Sketch mode (classification, banner, quality, use-as-is) (render itself: C)
- Where: VZ:444-500 (`SketchRenderSection`), VZ:1644-1647, VZ:2957-2960 (`handleUseAsIs`), VZ:4959-4964 (canvas banner), VZ:5484-5492 (in the phone sheet), VZ:5460 + 3880-3922 (primary button relabels)
- Entry: an upload classified `imageType: "sketch"`
- Does: the canvas shows a banner; the rail/sheet shows the sketch block: a yellow note with a *Use as-is* link, a *Quality* label with the two preset cards (B-06) and, in the sheet, a *Render from sketch* button (the desktop footer's primary button becomes *Render from sketch*). *Use as-is* flips `isSketch` false without re-detecting — the room then has no surfaces or furniture until something triggers detection again (a version select or reopen).
- Rules: while in sketch mode the Defurnish / Auto Furnish / Style Transfer pills and the tools are disabled (*Upload a room photo first*); the mobile generate bar hides the variant count. The first surface / furniture panels show their "none detected" states.
- Data: `SketchState`.
- States: sketch · rendering (*Rendering…*) · error line.
- Words: banner *Looks like a sketch — hit "Render from sketch" to turn it into a photo first, then edit it.* · note *Looks like a sketch — I'll render it first.* · link *Not a sketch? Use as-is →* · label *Quality* · button *Render from sketch* / *Rendering…* · footnote *The render becomes your editable image and is saved to the gallery. Re-select the sketch from the gallery to render again.*
- Reachable: yes

### B-42 · Auto-load + auto-detect on opening a room with a stored image
- Where: VZ:2471-2532 (`loadStoredImageToRoom`, `handleDetectFromStoredUrl`), VZ:2534-2546 (effect, once per room via `autoLoadedRoomsRef`)
- Entry: entering a room whose row has `original_image_url` but no working image
- Does: fetches the stored file → data URL → bucket crop (legacy rooms get cropped in memory without re-upload) → working image → `runDetection`.
- Rules: once per room per mount; skipped while another detection runs. `loadStoredImageToRoom` never touches `detecting` (so selecting on lead entry shows no "Detecting…"); `handleDetectFromStoredUrl` does.
- Data: reads bucket `renders`.
- States: —
- Words: —
- Reachable: yes

### B-43 · Manual "Detect Surfaces" fallback
- Where: VZ:4098-4111
- Entry: Surfaces panel when the room has a stored URL but no working image and no surfaces
- Does: a small outline button runs `handleDetectFromStoredUrl(activeRoom)`.
- Rules: shown only in that gap state (normally the auto-load covers it).
- Data: —
- States: —
- Words: *Detect Surfaces*
- Reachable: yes (edge)

### B-44 · Region re-detect (lasso)
- Where: VZ:1311-1317 (state), VZ:1604-1615 (Escape exits), VZ:5013-5020 (toolbar toggle), VZ:5211-5222 (`LassoOverlay` mount), VZ:1962-1989 (`cropImageToRect`), VZ:1991-2123 (`runRegionDetect`), OV:43-116, VZ:5307-5308 (phone tools tray)
- Entry: left toolbar lasso button (desktop), Tools tray *Select area* (phone)
- Does: toggles `regionMode` (canvas gestures disabled, cursor crosshair, image dimmed, hint pill *Draw around items the detector missed*). Press-drag draws a polyline; release with ≥ 3 points → bounding box → `runRegionDetect`: area < 0.5 % of the image → toast and stop; pad 5 % on every side, clip to [0,1]; crop to JPEG q0.92; `POST /api/render/detect` on the crop; remap furniture and surface coords back to the full image; dedupe furniture against existing (closer than 6 %, or closer than 18 % AND the same type by normalised-label containment) and surfaces by normalised label containment; append; toast the counts; turn markers on and open the panel that matches what was added (both → no panel, so both dot kinds show); exit region mode.
- Rules: `pointercancel` discards a half-drawn path; < 3 points clears without detecting (T-ov). The route response is NOT sketch-checked here. Busy state blocks drawing.
- Data: —
- States: idle (hint) · drawing (polyline) · busy (*Detecting region…* spinner card) · done.
- Words: toolbar tooltip *Selection tool — draw a box to detect missed items* / *Exit selection tool (Esc)* · toasts *Draw a larger region* · *Could not crop image* · *Detection failed* · *No new items found in that region* · *Added {n} furniture + {n} surface(s)* · *Could not detect region* · phone tool *Select area* / *Selecting…* with hint *Draw around items the detector missed*
- Reachable: yes

### B-45 · Marker (dot) visibility rule
- Where: VZ:5085-5091 (surfaces), VZ:5149-5153 (furniture), VZ:168-170 (`clampDotPct` 2.5–97.5 %), VZ:4560-4574 (Tools › markers toggle), RL:52-55 (*Show surface markers* switch), VZ:4825 (phone ⋯), VZ:5309 (phone tools tray)
- Entry: —
- Does: dots render only when `detectorsOn && !detecting`; surface dots hide while the Furniture panel is open, furniture dots hide while the Surfaces panel is open, `openTile === null` shows both. Positions are clamped so edge dots stay on the image. The toggle exists in four places, all bound to the one `detectorsOn` (default on).
- Rules: the rail switch's label says *surface* markers but it hides furniture dots too.
- Data: —
- States: on · off.
- Words: *Show surface markers* (rail switch) · *Hide markers* / *Show markers* (button, ⋯ menu, tray) with tooltip *Hide markers* / *Show markers*
- Reachable: yes

### B-46 · Tapping a surface dot
- Where: VZ:5098-5138
- Entry: canvas
- Does: in pick-to-remove mode and this dot is a target → delete just this instance and leave the mode; otherwise clear any group selection and toggle this label group's selection (a second tap on the selected group deselects); when selecting, open the Surfaces panel and expand the dot's structural group; when deselecting, collapse it. Selected dots (whole label group, or the whole structural group) grow with a ring and a white square; remove targets pulse red with an ×.
- Rules: each dot has a 36 px pseudo-element hit area (`before:w-9 before:h-9`). Tapping any non-target dot while in removing mode exits the mode. On a phone the Surfaces tray then shows (the dock mode follows `openTile`).
- Data: —
- States: rest (small white square) · hover (grows) · selected · remove target.
- Words: tooltip / aria = the title-cased label; in removing mode *{Tap|Click} to remove this one* / aria *Remove {label}*
- Reachable: yes

### B-47 · Tapping a furniture dot
- Where: VZ:5153-5204
- Entry: canvas
- Does: remove target → drop the instance from the list; else toggle this instance's selection and, when selecting, open the Furniture panel (the row highlights). The dot's fill shows the action: red × = remove, primary ↻ = replace, blue palette = customize, white = keep (ring when selected).
- Rules: selection is per instance (not per group) but the row highlight uses the group key (VZ:4353-4357). No `scrollIntoView` (a past bug).
- Data: —
- States: keep · remove · replace · customize · selected · remove target.
- Words: as B-46
- Reachable: yes

### B-48 · Place mode (add a surface / furniture by tapping the photo)
- Where: VZ:1339-1341, VZ:2708-2722 (`commitNewSurface`, `commitNewFurniture`), VZ:2724-2757 (`placeItem`), VZ:4942-4948 (banner), VZ:5206-5209 + OV:23-36 (`PlaceOverlay`)
- Entry: *Add surface* / *Add furniture* inputs (B-49, B-50), the row's *+* (B-51), the phone `AddItemDialog` (B-52)
- Does: arms `placing { kind, label, category? }`; a banner appears over the canvas; the overlay (crosshair, `z-30`, pointerdown, stops propagation so the canvas does not pan) reports image-relative 0–1 coords; `placeItem` clamps, appends the item, selects it (clearing any group selection) and opens its panel; the banner's *Cancel* clears `placing`.
- Rules: a placed surface starts at None; a placed furniture item at keep. Coordinates are relative to the measured image box, so letterbox taps clamp to the edge.
- Data: —
- States: armed · placed.
- Words: banner *{Tap|Click} on the image to place "{label}"* · *Cancel*
- Reachable: yes

### B-49 · Add surface (desktop / sheet input)
- Where: VZ:4265-4287
- Entry: bottom of the Surfaces panel
- Does: a dashed *Add surface* button turns into an autofocused input; Enter or blur commits (trimmed; empty = nothing), Escape cancels; commit arms place mode with the typed label.
- Rules: no category for a surface; its structural group is derived from the label later.
- Data: —
- States: —
- Words: *Add surface* · placeholder *Surface name…*
- Reachable: yes

### B-50 · Add furniture (desktop / sheet input + category)
- Where: VZ:4400-4446, MS:281 (categories)
- Entry: bottom of the Furniture panel
- Does: *Add furniture* → an input (*Item name…*), a native `<select>` of the 8 categories (`Seating · Tables · Storage · Beds · Lighting · Decor · Appliances · Fixtures`, default Seating) and a *+* button (tooltip *Place on image*, disabled until a name); Enter commits, Escape cancels; blur does NOT commit here (unlike surfaces).
- Rules: —
- Data: —
- States: —
- Words: *Add furniture* · *Item name…* · *Place on image*
- Reachable: yes

### B-51 · "Add another like this"
- Where: VZ:4157-4163 (surface row +), VZ:1136-1142 (furniture row +), VZ:4380 (`onAddSimilar`)
- Entry: the + button on a surface row (hover / touch-visible) or furniture row
- Does: arms place mode with the row's label (and category) so a missed duplicate gets its own dot; the new instance joins the row's ×N group and shares its material / action.
- Rules: —
- Data: —
- States: —
- Words: tooltip *Add another like this — click on the image to place it* (surface and furniture; not swapped to Tap)
- Reachable: yes

### B-52 · Phone "add a missed item" dialog (`AddItemDialog`)
- Where: MS:281-326, VZ:5817-5825, VZ:5272 + 5290 (tray callbacks)
- Entry: Surfaces tray / Furniture tray add buttons (D)
- Does: a bottom sheet: title, a one-line hint, an autofocused name input (Enter confirms), for furniture a chip row of the 8 categories (default Seating), and a full-width *Place on photo* button (disabled until a name). Confirm arms place mode (furniture without a picked category falls back to Decor at VZ:5821).
- Rules: —
- Data: —
- States: —
- Words: *Add furniture* / *Add a surface* · *Name it, then tap the spot on the photo.* · placeholders *e.g. Floor lamp* / *e.g. Skirting* · aria *Furniture name* / *Surface name* · *Place on photo*
- Reachable: yes (≤ lg)

### B-53 · Remove from the list (single vs pick-to-remove)
- Where: VZ:4164-4183 (surface ×), VZ:1143-1149 + 4381-4392 (furniture ×), VZ:4950-4957 (banner), VZ:1342-1344
- Entry: the × on a row
- Does: one instance → removed immediately (surface: every surface with that label; furniture: every instance of the group — which is one). Several instances → arms `removing { kind, key }`, turns markers on, opens the matching panel, and shows a red banner; the user taps the one dot to drop. *Cancel* or tapping a non-target dot leaves the mode.
- Rules: removing from the list never changes the render — it only forgets the detection ("This is NOT a render 'Remove' — the piece stays in the photo untouched", VZ:4388-4389). Selection is cleared if the removed row was selected.
- Data: —
- States: —
- Words: surface tooltips *Remove this surface* / *Remove one — pick which on the image*; furniture tooltip *Remove from the list (doesn't change the render)*; banner *{Tap|Click} the marker you want to remove* · *Cancel*
- Reachable: yes

### B-54 · Escape and mode exclusivity
- Where: VZ:1604-1615, VZ:4942-4964 (banner precedence), VZ:1325 (`useCanvasGestures({ disabled: regionMode })`)
- Entry: —
- Does: Escape exits region mode (only). Banners stack by precedence: place > remove > sketch. Region mode disables pan/zoom; place mode overlays the image at `z-30` above the lasso (`z-20`).
- Rules: place and remove can both be armed at once (the place banner wins visually).
- Data: —
- States: —
- Words: —
- Reachable: yes

## B5 · Surfaces & Materials mode

### B-55 · The Surfaces & Materials tile / section value
- Where: VZ:4525-4534 (tile in the sheet grid), VZ:5402-5404 (rail section value)
- Entry: —
- Does: tile value = *{n} surface(s)* + *· {m} set* when any material is assigned; *No surfaces* with an image, *Upload a photo* without; state `set` when any surface exists. The desktop accordion header prints only *{m} set*.
- Rules: —
- Data: —
- States: set · empty.
- Words: *Surfaces & Materials* · *No surfaces* · *Upload a photo* · *{m} set*
- Reachable: yes

### B-56 · Surfaces panel states
- Where: VZ:4086-4111
- Entry: —
- Does: detecting → spinner + *Detecting surfaces…*; no image → *Upload a room photo in the canvas to detect surfaces.*; image loaded but zero surfaces → *No surfaces detected. Try re-uploading.*; image stored but not loaded → *Detect Surfaces* button (B-43).
- Rules: —
- Data: —
- States: as listed.
- Words: as quoted.
- Reachable: yes

### B-57 · The two-level surface list
- Where: VZ:4113-4262 (grouping + `renderLabelRow` + group headers), VZ:199-244 (groups), VZ:207-218 (`SURFACE_GROUP_ORDER`)
- Entry: Surfaces panel / section
- Does: leaf groups by exact lower-cased label (detection order) are bucketed into structural groups (first-seen order, displayed in `SURFACE_GROUP_ORDER`). Every group renders a header even for a single surface: a chevron (collapsed by default after a detection; tooltip *Collapse* / *Expand*), a swatch dot when all members share one material, the group name, a count badge (number of label rows), and a right-hand summary: the shared material's name, *Mixed* when the members differ, *None* when nothing is set. Clicking the header body selects the whole group; the chevron only expands. Expanded members render as nested rows: swatch dot, label, ×N, material name or *None*, plus hover/touch-visible *+* and *×*.
- Rules: `surfaceGroupFor` is keyword-ordered "most specific first": panelling words (panel / slat / flut / batten / wainscot / reeded / ribbed / groove / fluted) → Panelling; wardrobe / closet / armoire → Wardrobes; shelv / shelf / bookcase / display unit / open storage / niche → Open Shelving; cabinet / cabinetry / joinery / sideboard / credenza / tv unit / tv console / media unit / vanity unit / dresser → Cabinets; countertop / counter / worktop / island / vanity top / tabletop → Countertops; backsplash / splashback → Backsplash; floor → Floor; ceiling / soffit / bulkhead → Ceiling; door / doorway → Doors; window / glazing / mullion / sill / skirting / baseboard / cornice / architrave / moulding / dado / picture rail / trim → Trim & Moulding; feature wall / accent wall / backdrop / feature / accent → Feature Walls; wall → Walls; else Other.
- Data: —
- States: group collapsed · expanded · selected; row selected.
- Words: header tooltip *Change all {n} {group} at once — or expand to set each one* · *Mixed* · *None* · *×{n}*
- Reachable: yes

### B-58 · Group selection vs individual selection
- Where: VZ:1299-1301, VZ:4127-4136 (row click clears group), VZ:4207-4213 (header click sets group + rep surface), VZ:4658-4664 (Back), VZ:5411 (Deselect)
- Entry: —
- Does: exactly one of `roomSelectedGroup` / an individual label selection is meaningful at a time: selecting a row clears the group; selecting a group also sets the representative surface (so the picker has a scope label). Desktop shows the picker inline under the list with a *Deselect* link; the sheet's panel swaps the list for the picker with *← Back to surfaces*.
- Rules: —
- Data: —
- States: —
- Words: *Deselect* · *Back to surfaces* · caption *Materials · {label}* / *Materials · all {group}*
- Reachable: yes

### B-59 · Assigning a material (`assignMaterial`)
- Where: VZ:2564-2586
- Entry: any swatch
- Does: group selected → every surface whose `surfaceGroupFor(label)` equals the group gets the id; else every surface sharing the selected surface's exact label. Stock ids go to recents (B-20).
- Rules: requires a selection (no-op otherwise; the grid is overlaid *Select a surface first*).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-60 · None — keep this surface unchanged (`clearSurfaceMaterial`)
- Where: VZ:2548-2562, VZ:775-792 (desktop None row), MS:259-266 (phone None chip), VZ:5810 (`onNone`)
- Entry: the picker
- Does: sets `materialId: null` on the same scope as B-59. The row is highlighted when the selected surface has no material.
- Rules: None is the default for every surface; the render's preserve list is every None surface (B-71).
- Data: —
- States: —
- Words: *None* · *keep unchanged* · tooltip *No material — keep this surface unchanged*
- Reachable: yes

### B-61 · The desktop materials picker (`MaterialsPanel`)
- Where: VZ:688-1043, VZ:4290-4313 (`materialsBody` props: `cols=4`, `selectionLabel = "all {group}"` for a group)
- Entry: a surface or group selected (desktop rail inline; sheet panel)
- Does, top to bottom: a search box (clear ×); the None row (when a surface is selected); a results line while searching (*{n} result(s) · {categories}*); the *Suggested for {scope} · {style}* row (only when not searching and the style yields suggestions — B-62); a surface-aware hint when All is on and there are no suggestions; category chips (hidden while searching): *All*, *Recent* (only when recents exist), then Laminates · Paints · Flooring · Countertops · Tiles · Wallpapers · Fabrics · Metals · Glass · Stone (Gush chips are filtered out); a *Generic* group header with a count under All / Paints; the swatch grid: an *Upload* dashed tile (hidden while searching), studio-library tiles with a ★ badge (hidden while searching; filtered to the scope's categories when a surface is selected; a library entry already imported this session is hidden in favour of its session twin), session custom tiles with a hover/touch × *Remove*, then the stock swatches (`MaterialSwatch`: hex tile, check when assigned, name under, tooltip *{name} · {subcategory}*); a *Select a surface first* overlay when nothing is selected; *No materials match "{q}"*; then *Gush Paints* and *Gush Enamel* sections (under All / Paints only, own search filter on name / hex / subcategory, count badge, scrolling grid).
- Rules: swatches are disabled without a selection; the Upload tile is always enabled. Category filter and search are session-wide (not per surface).
- Data: —
- States: —
- Words: placeholder *Search materials…* · *Suggested for {scope} · {style}* · *Showing {c1}, {c2}, {c3} first for "{scope}"* · *Generic* · *Upload* · tooltip *Upload custom material* · library tooltip *{name} · studio library* · custom tooltip *{name} · uploaded* · *Remove* · *Select a surface first* · *No materials match "{q}"* · *Gush Paints* · *Gush Enamel*
- Reachable: yes

### B-62 · `suggestMaterials` (the Suggested row and the phone's first section)
- Where: MC:157-213, DS:270-273 (`STYLE_AFFINITY_MAP`), VZ:721 + 4718 + 5804 (callers)
- Entry: a scope + a style
- Does: no affinity for the style (i.e. None) → `[]` (no Suggested row). Otherwise resolves the label's categories (`resolveSurfaceCategories`, MC:74-99 — exact map hit or keyword order backsplash › countertop › wardrobe › cabinet › shelving › ceiling › floor › partition › door › window › curtain › feature wall › panelling › wall); with categories it is a HARD filter, ordered by the surface's category priority then by `paletteProximity(swatch, style palette) * 100 + styleScore` (tags +3 each, finish +2, colour family +1); without categories a pure style ranking with score ≥ 5. Limit 6.
- Rules: the same function feeds the phone picker's *Suggested for …* section and the tray's swatch row.
- Data: static.
- States: —
- Words: —
- Reachable: yes

### B-63 · Category mapping tables
- Where: MC:59-95 (`SURFACE_CATEGORY_MAP`, 34 keys), VZ:176-197 (`surfaceCategoriesFor`: floor › countertop › backsplash › wardrobe › cabinet › ceiling › door › window › curtain › wall), VZ:246-264 (`groupMaterialCategories`: Walls→Walls, Feature Walls & Panelling→Feature Wall, Cabinets, Wardrobes→Wardrobe, Open Shelving→Shelving, Countertops→Countertop, Backsplash, Floor, Ceiling, Doors→Door, Trim & Moulding→Ceiling ("typically painted"), Other→[])
- Entry: —
- Does: turns a label or group into the ordered list of catalogue categories used for sorting, the library filter and the upload dialog's default category.
- Rules: —
- Data: static.
- States: —
- Words: —
- Reachable: yes

### B-64 · The stock catalogue
- Where: MC:45-57 (categories), MC:216-405 + GC (items), MS:23 (`BRAND_PREVIEW = 8`)
- Entry: —
- Does: 136 generic materials — Laminates 18 (White Lacquer · Dark Oak · Sage Laminate · Marble Veneer · Walnut Grain · Light Ash · Charcoal Oak · High Gloss White · Teak Natural · Cement Grey · Maple Blonde · Midnight Blue · Terrazzo Effect · Cherry Wood · Brushed Aluminium · Forest Green · Hickory Rustic · Rose Gold), Paints 20 (Off-White Matte · Sage Green · Warm Greige · Navy Accent · Dusty Rose · Pure White · Warm White · Cool Grey · Charcoal · Terracotta · Olive Green · Sky Blue · Mushroom · Linen · Black Satin · Emerald · Blush Pink · Concrete Grey · Teal · Ivory Cream), Flooring 18 (Marble White Polished · Oak Herringbone · Porcelain Grey · Vinyl Plank Warm · Polished Concrete · Walnut Engineered · Terrazzo White · Black Granite · Ash Wide Plank · Vinyl Plank Grey · Bamboo Natural · Slate Dark · Chevron Oak Light · Limestone Beige · Cement Tile Patterned · Travertine Cream · Cork Natural · Teak Outdoor), Countertops 12 (Quartz Calacatta · Granite Black · Solid Surface White · Quartz Carrara · Granite Grey Speckle · Butcher Block Oak · Sintered Stone Dark · Marble Statuario · Concrete Countertop · Quartz Midnight · Dekton Trilium · Stainless Steel), Tiles 16 (Subway Tile White · Zellige White · Hexagon Marble · Fish Scale Sage · Penny Round Black · Subway Sage · Large Format Beige · Moroccan Patterned · Herringbone White · Terracotta Square · Zellige Green · Subway Black · Basketweave Marble · Brick Slip Red · Porcelain Wood Look · Glass Mosaic Blue), Wallpapers 12 (Grasscloth Natural · Linen Texture White · Tropical Botanical · Art Deco Gold · Concrete Effect · Vertical Stripe Navy · Floral Vintage · Brick Effect White · Cork Natural · Geometric Grey · Silk Effect Champagne · Japanese Wave), Fabrics 12 (Linen Natural · Velvet Emerald · Cotton White · Leather Cognac · Velvet Navy · Bouclé Cream · Linen Sage · Leather Black · Sheer White · Wool Charcoal · Velvet Dusty Pink · Leather Tan), Metals 10 (Matte Black · Brushed Brass · Polished Chrome · Brushed Nickel · Copper · Antique Brass · Gold Polished · Stainless Brushed · Iron Wrought · Rose Gold), Glass 8 (Clear Float · Frosted White · Fluted Clear · Tinted Grey · Reeded Clear · Mirror Bronze · Tinted Green · Laminated Safety), Stone 10 (Marble Carrara · Granite Absolute Black · Limestone Beige · Slate Grey · Onyx Green · Travertine Silver · Sandstone Buff · Quartzite White · Exposed Brick Red · Concrete Raw) — plus the bundled Gush brand catalogue: **Gush Paints 220** (matte emulsion, e.g. *All Good Things*, *Koyo*, *Tangyuan*, subcategory = the Gush code) and **Gush Enamel 90** (gloss). Each item carries a hex swatch, finish, colour family, tags and a one-line description that reaches the render prompt (D).
- Rules: Gush hex values "are approximate — swap for official Gush values before brand use" (GC:5).
- Data: static TS.
- States: —
- Words: —
- Reachable: yes

### B-65 · Custom material upload — the flow
- Where: VZ:2639-2651 (`triggerCustomMaterialUpload`: a transient `<input accept=…heic…>`), VZ:5881-5890 (dialog mount: `suggestedName = "Custom {n+1}"`, `suggestedCategory = surfaceCategoriesFor(selected)[0]`), VZ:2594-2637 (`handleCustomMaterialUpload`)
- Entry: the *Upload* tile (desktop grid, phone *Upload a swatch*)
- Does: pick → dialog (B-66) → on confirm: 10 MB check, HEIC normalise, read, downscale to 1024, `custom-<id>` with the dialog's name (or *Custom N*), appended to the session list; if a surface is selected the new material is auto-assigned in a microtask ("restoring the pre-dialog one-shot UX").
- Rules: the dialog's category is used only for the library save; the session material has no category. The `libraryUrl` returned by the dialog is ignored by the editor (the library list refreshes through React Query and the session copy is shown instead — `importedTwin` matches on `previewUrl`, which for a fresh upload is the data URL, so the library twin ALSO appears until reload).
- Data: —
- States: —
- Words: toast *File too large. Maximum size is 10MB.* · toast *Unsupported image*
- Reachable: yes

### B-66 · `CustomMaterialUploadDialog`
- Where: CMD:50-206
- Entry: after picking a file (B-65)
- Does: shows a preview (file name, *{KB} KB · {type}*), a *Name* input (prefilled with the suggestion, else *Custom material*), a *Category* select of the 11 real categories (All removed; default the surface's first category, else *Paints*), and a *Save to studio library* checkbox (default checked; shown to everyone — `canSaveToLibrary = true`, "every designer's uploads are kept in the shared studio library"). Confirm with the box ticked uploads through `useUploadStudioMaterial` then returns; on upload failure it toasts and falls through to session-only.
- Rules: the primary button is disabled while saving; Cancel closes without adding anything.
- Data: `studio_materials` + bucket `studio-materials` (SM).
- States: idle · saving (*Saving…*).
- Words: title *Add custom material* · *Use this material for the current render, or save it to your studio library so it appears next time.* · *Name* · placeholder *e.g. Walnut veneer* · *Category* · *Select category* · *Save to studio library* · *Available for future renders by you and your team. Uncheck for one-render-only.* · *Cancel* · *Save & use* · *Use for this render* · *Saving…* · toast *Saved "{name}" to your studio library* · toast *Could not save to library — using for this render only.*
- Reachable: yes

### B-67 · The studio material library (query + upload + delete)
- Where: SM:50-63 (`GET /api/studio-materials/records[?category=]`, staleTime 60 s, key `["studio-materials", studioId, category|"all"]`), SM:84-122 (upload: client Storage write to `studio-materials/{studioId}/{uuid}.{ext}` then `POST /api/studio-materials/records { name, category, imageUrl, hex, description }`; the blob is removed if the row insert fails), SM:129-142 (`DELETE /api/studio-materials/records/{id}` = soft delete `is_active=false`, blob kept), `src/types/app.ts:1845` (`StudioMaterial { id, studioId, name, category, imageUrl, hex, roughness, metalness, description, uploadedBy, isActive, createdAt, updatedAt }`)
- Entry: the visualizer reads it on mount (`useStudioMaterials()` VZ:1362); the delete hook is not used by the editor
- Does: per-studio, shared by every member; the bucket is public-read with a 5 MB cap and jpeg/png/webp per the doc comment (SM:14).
- Rules: the visualizer never deletes a library entry — the custom tile's × only removes the session copy (B-69). The editor's 10 MB check precedes the bucket's 5 MB cap (an 8 MB swatch would fail the library save and fall back to session-only).
- Data: `studio_materials` (E), bucket `studio-materials`.
- States: —
- Words: —
- Reachable: yes

### B-68 · Clicking a library material (import into the session)
- Where: VZ:2653-2682, VZ:855-880 (desktop tiles), MS:176 + 207 (phone tiles)
- Entry: a ★ library tile
- Does: if already imported (a session custom whose `previewUrl` equals the library URL) → re-assign; else fetch the URL → base64 → append `{ id: custom-…, name: lib.name, previewUrl: lib.imageUrl }` → assign to the selected surface.
- Rules: disabled without a selected surface (desktop). The imported copy shows as a custom tile from then on; the library tile hides.
- Data: —
- States: —
- Words: toast *Could not load library material*
- Reachable: yes

### B-69 · Removing a session custom material
- Where: VZ:2684-2696, VZ:906-912 (× on the tile), MS:204 (phone ×, aria *Remove {name}*)
- Entry: the tile's ×
- Does: drops it from the session list and unassigns it from every surface in every room.
- Rules: does not touch the studio library.
- Data: —
- States: —
- Words: tooltip *Remove*
- Reachable: yes

### B-70 · Material chip states
- Where: VZ:651-686, MS:29-52, VZ:4140-4150 (row swatch dot), VZ:4224-4232 (group dot)
- Entry: —
- Does: stock tile = hex square (ring + check when it is the selected surface's material; hover scale); custom / library tile = image square (custom with a dark check overlay when assigned); rows and group headers show a 12 px dot of the material (image or hex) before the label.
- Rules: `isAssigned` compares against the selected surface only (a group selection never shows a check).
- Data: —
- States: assigned · unassigned · disabled.
- Words: —
- Reachable: yes

### B-71 · Unassigned surfaces are left unchanged (also C)
- Where: VZ:3297-3306 (`unassignedSurfaces` always `[]`; `preservedSurfaces` = every None surface's label), VZ:3363-3366 (`surfaceOnlyRender` → masked composite, MK)
- Entry: Generate
- Does: the render receives only assigned surfaces plus an explicit preserve list; when the change is surfaces-only (no furniture, lighting or prompt) the changed surfaces are segmented in parallel and the render is composited back inside those masks so nothing bleeds (Route C). A mask with < 8 % white fill is rejected (MK:31, T-mask).
- Rules: the earlier "ambient-shift None surfaces toward the style" behaviour is disabled (VZ:3298-3300).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-72 · Free-text for a material
- Where: — (none)
- Entry: —
- Does: there is no "describe a material" field per surface; the only free text is the Finishing note / Prompt (B-109) which rides along with the whole render. Furniture has per-item describe fields (B-79, B-80).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a

### B-73 · The phone material picker (`MaterialBrowser` + `MaterialPickerSheet`)
- Where: MS:93-235 (browser), MS:237-279 (sheet), VZ:4776-4788 + 5798-5816 (data), VZ:5270 (`onMore` opens it when a surface is selected, else the More sheet), T-ms
- Entry: Surfaces tray › more (phone)
- Does: a 92dvh bottom sheet. Header: back arrow, the scope label title-cased, *Now: {material}* or *Unchanged*, a *None* chip (pressed when null; picking it clears and closes). Sticky search (placeholder *Search {N} materials…* where N = catalogue + brands + library) and chips *All* + the surface's relevant categories first, then the rest, then the brand names (chips hide while searching). Body in "order of usefulness": *Suggested for {Scope}* (count) · *Recent* · *Your library* (an *Upload a swatch* tile, session customs with sub *This session* and a × , library tiles with their category) · one section per category · brand sections collapsed to 8 tiles with *Show all {n}* / *Show fewer*. Searching shows *Your library* matches then *Results*; no match → *Nothing matches "{q}"*. A category chip narrows to that one section. Picking a tile assigns and closes.
- Rules: `columns` 3–6 (6 = compact tiles "inside a 380px rail" — only the trial visualizer uses the browser on desktop; the studio tool's desktop rail uses `MaterialsPanel`). The library list is pre-filtered to the surface's categories (VZ:4785-4787).
- Data: —
- States: as listed.
- Words: as quoted; sheet aria title *Choose a material for {Scope}* · aria *Back* · aria *Search materials* · aria *Clear search* · aria *Upload a swatch photo*
- Reachable: yes (≤ lg)

### B-74 · Phone tray swatch row (`mobileSwatches`)
- Where: VZ:4709-4730, VZ:4692-4707 (`mobileSurfaceChips`: title-cased label, count, swatch/preview, selected)
- Entry: Surfaces tray (D)
- Does: for the selected surface, up to 12 tiles in order: its current stock material, `suggestMaterials(label, style)`, recents, then every session custom; deduped.
- Rules: without a selected surface the row is empty; library materials are not in the row (only in the sheet).
- Data: —
- States: —
- Words: D
- Reachable: yes (≤ lg)

### B-75 · `MaterialCatalogPicker` — not part of the visualizer
- Where: MCP:24-175; used by `src/components/projects/selection-create-dialog.tsx` and `src/components/accounts/material-catalog-manager.tsx`
- Entry: selection options (project selections), Accounts › Material Catalog
- Does: a popover picking from the *studio material catalog* (migration 183, `useMaterialCatalog`) — a different table from the visualizer's `studio_materials` library: searchable by name / vendor / category / specs, category chips, 2-column cards with image, vendor · price.
- Rules: the visualizer never opens it; the two "material" libraries are unrelated in 1.0.
- Data: `useMaterialCatalog(studioId)` (E).
- States: loading · error (*Couldn't load the catalog.* / *Try again*) · empty (*Your material catalog is empty* / *Add materials in Accounts → Material Catalog, or save options here as you build them.*) · no match (*No materials match "{q}".*).
- Words: trigger *Choose from catalog* · placeholder *Search materials* · *All*
- Reachable: yes, elsewhere (not from the visualizer)

## B6 · Furniture mode

### B-76 · The Furniture tile / section value
- Where: VZ:4535-4544, VZ:5413
- Entry: —
- Does: tile value *{n} item(s)* (distinct groups) + *· {m} changed*, or *None detected*; state set when any furniture exists. The desktop header prints *{m} changed* or nothing.
- Rules: —
- Data: —
- States: —
- Words: *Furniture* · *None detected*
- Reachable: yes

### B-77 · Furniture panel states
- Where: VZ:4342-4351
- Entry: —
- Does: detecting → spinner + *Detecting furniture…*; none → *No furniture detected.* with an image, *Upload an image to detect furniture.* without.
- Rules: —
- Data: —
- States: —
- Words: as quoted
- Reachable: yes

### B-78 · A furniture row (`FurnitureRow`)
- Where: VZ:1047-1265, VZ:4353-4394 (grouping, `applyToGroup`)
- Entry: Furniture panel
- Does: one row per group: armchair icon tinted by action, the title-cased label (struck through when remove), a *×{n}* badge for grouped instances, a *+* (add another) and a *×* (delete); three toggle buttons *remove · replace · customize* (active one tinted red / primary / blue; tapping it again → keep); a panel below for replace or customize. Rows at keep are dimmed.
- Rules: every change fans out to all instances of the group; the selected row = the group of the selected dot.
- Data: —
- States: keep · remove · replace · customize · selected.
- Words: as above (raw action words)
- Reachable: yes

### B-79 · Replace panel (presets · describe · reference photo)
- Where: VZ:1201-1238, FP:190-279 (`suggestReplacements`), VZ:4316-4338 (`handleFurnitureRefUpload`)
- Entry: *replace* on a row
- Does: *Quick pick* chips = `suggestReplacements(category, style, 4, label)` (a chip sets `replacementDesc` to the preset's description; selected when equal); *Or describe it* textarea (2 rows); *Add image* (accept `image/*`) reads, normalises, compresses to 2048 and stores the reference on every instance of the group; a thumbnail with *Remove image* when set.
- Rules: `suggestReplacements` corrects the category from the label (`inferCategoryFromLabel`, decor › lighting › storage › tables › seating › beds › appliances › fixtures keyword lists), scores presets by label-word hits (+8 each, generic words ignored) and style affinity (+10 exact, +3 partial), keeps only presets with a label hit ("never pure style filler — a TV → a fridge"), then appends generated same-type alternatives *"{Style} {type phrase}"* for the style then Modern · Scandinavian · Mid-century · Industrial · Minimalist · Luxury (description *a {style} {type}, in keeping with the room*), deduped by label, capped at 4 here.
- Data: —
- States: —
- Words: *Quick pick* · *Or describe it* · placeholder *e.g. oversized rattan peacock chair with plush terracotta velvet cushions* · *Add image* (tooltip *Upload a photo of the furniture you want*) · *Remove image* · toast *Could not load that image*
- Reachable: yes

### B-80 · Customize panel (finish · colour · describe)
- Where: VZ:1241-1263, VZ:122-160 (finish tables), VZ:266-270 (`composeCustomizeDesc`)
- Entry: *customize* on a row
- Does: a finish chip group whose heading and options come from the label (first regex match wins): rug/carpet/runner → *Weave / pile* (Wool · Jute · Cotton flatweave · Shag pile · Persian-style · Sisal · Hide); curtain/drape/blind → *Fabric* (Linen · Cotton · Velvet · Sheer voile · Blackout); pendant/chandelier/sconce/lamp/light/lantern → *Shade / finish* (Brass · Matte black · Chrome · Brushed nickel · Opal glass · Smoked glass · Rattan shade · Linen shade); stool → *Material* (Leather · Velvet · Solid wood · Matte black metal · Woven rattan); bench/ottoman/pouf → *Upholstery* (Velvet · Linen · Leather · Bouclé · Woven); chair → *Upholstery* (Velvet · Linen · Bouclé · Leather · Woven rattan · Moulded plastic · Solid wood); sofa/couch/sectional/loveseat/settee → *Upholstery* (Velvet · Linen · Bouclé · Leather · Chenille · Cotton weave); bed/headboard/daybed → *Headboard* (Velvet upholstered · Linen upholstered · Leather upholstered · Bouclé upholstered · Solid wood · Rattan); tables/desk/console/nightstand → *Top / finish* (Natural oak · Walnut · Black ash · White oak · Marble · Travertine · Glass · Matte black metal); wardrobe/cabinet/sideboard/…/vanity → *Front / finish* (Natural oak veneer · Walnut veneer · Matte lacquer · Gloss lacquer · Fluted wood · Rattan front · Glass front · Matte black); mirror/painting/art/frame → *Frame* (Brass frame · Black frame · Natural wood frame · Gold-leaf frame · Slim metal frame · Frameless); plant/planter/pot → *Planter* (Terracotta pot · Ceramic pot · Concrete pot · Woven basket · Matte black pot · Glazed stoneware); vase/sculpture/bowl/… → *Material* (Ceramic · Terracotta · Brass · Marble · Glass · Stoneware); appliances → *Finish* (Stainless steel · Matte black · Gloss white · Panel-ready · Cream retro); sink/bath/toilet/shower/tap → *Finish* (Chrome · Brushed brass · Matte black · White ceramic · Stone); else by category (Seating · Beds · Tables · Storage · Lighting · Decor · Appliances · Fixtures, VZ:142-151) else generic *Material / finish* (Matte white · Matte black · Brushed steel · Brass · Natural wood · Walnut · Marble). Then a *Colour* chip group (Charcoal · Cream · Sage green · Terracotta · Navy · Emerald · Mustard · Blush pink · Tan · Light grey · Off-white · Black) and *Or describe it*. Chips toggle (tap again → clear). The render gets `composeCustomizeDesc` = "{colour} {finish}, {free text}".
- Rules: —
- Data: —
- States: —
- Words: headings as listed · *Colour* · *Or describe it* · placeholder *e.g. reupholster in emerald velvet, keep the walnut legs*
- Reachable: yes

### B-81 · Furniture presets data (`furniture-presets.ts`)
- Where: FP:6-15 (8 categories), FP:33-131 (78 presets)
- Entry: —
- Does: prompt-ready descriptions with style affinities. Seating 15 (Modern sofa · Scandinavian sofa · Mid-Century armchair · Industrial sofa · Bohemian armchair · Luxury sofa · Japandi sofa · Classic wingback · Modern / Scandinavian / Mid-Century / Classic / Boucle dining chair · Boucle accent chair · Bar stool); Tables 13 (Modern dining table · Scandinavian table · Industrial table · Modern / Mid-Century coffee table · Luxury dining table · Farmhouse table · Modern / Mid-Century side table · Modern / Scandinavian nightstand · Modern / Luxury console table); Storage 6 (Modern sideboard · Scandinavian shelf · Mid-Century credenza · Industrial bookcase · Classic display cabinet · Luxury console); Beds 6 (Modern platform bed · Scandinavian bed · Classic upholstered bed · Bohemian bed · Luxury bed · Japandi bed); Lighting 11 (Modern pendant · Scandinavian pendant · Industrial lamp · Classic chandelier · Bohemian pendant · Arc floor lamp · Modern / Vintage table lamp · Desk task lamp · Modern / Industrial wall sconce); Decor 21 (Large plant · Trailing plant · Modern rug · Bohemian rug · Wall art · Statement mirror · Abstract canvas art · Vintage framed art · Gallery wall · Minimalist poster · Botanical print · Woven tapestry · Modern sculpture · Chunky knit throw · Bohemian throw · Silk throw · Linen throw · Velvet throw · Cushion stack · Sheer curtains · Velvet drapes); Appliances 3 (Modern fridge · Retro fridge · Professional range); Fixtures 3 (Modern vanity · Classic vanity · Freestanding bathtub).
- Rules: —
- Data: static.
- States: —
- Words: —
- Reachable: yes

### B-82 · Instances vs groups and the counts
- Where: VZ:162-164, VZ:1638-1642, VZ:4353-4368, VZ:4732-4746 (phone chips)
- Entry: —
- Does: `normFurnitureKey` strips a trailing "(…)" hint and lower-cases, so *brown bar stool (left)* and *(right)* are one row with ×2 and two dots. Counts in the tile / dock use distinct groups.
- Rules: the region re-detect's same-type dedupe uses containment of these keys (B-44).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-83 · Furniture payload and preserved furniture (also C)
- Where: VZ:3324-3346, 3385-3387
- Entry: Generate
- Does: only changed items are sent with their action, description, normalised (x, y) and an index into `customRefs` for a replace reference; every keep item is sent as `preservedFurniture` with its position.
- Rules: reference images are deduped by base64 and appended after material references.
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-84 · Phone furniture tray data (D)
- Where: VZ:4732-4754 (`mobileFurnitureChips { key, label, count, action, selected }`, `applyFurnitureActionToGroup`), VZ:5276-5291
- Entry: Furniture tray
- Does: chips per group with the action; the tray's action buttons call the same toggle as the desktop row; *more* opens the sheet on the Furniture panel; add opens `AddItemDialog`.
- Rules: —
- Data: —
- States: —
- Words: D
- Reachable: yes (≤ lg)

## B7 · Style mode

### B-85 · The Style tile / section value
- Where: VZ:4509-4515, VZ:5401
- Entry: —
- Does: tile value = the style name (blank for None), state set when a style is picked; desktop header *Style* with value the name or *None*.
- Rules: `openTile` starts at `"style"`, so on desktop the Style section is open first.
- Data: —
- States: —
- Words: *Style* · *None*
- Reachable: yes

### B-86 · The Style panel (None + 25 cards)
- Where: VZ:3987-4041 (`styleBody`), VZ:2702-2704 (`handleStyleChange`)
- Entry: Style section / panel; phone StyleTray (D)
- Does: a 2-column grid: a *None* card (hatched strip, *No style — only your changes are applied*) then one card per style with a 5-colour palette strip, the name and its one-line description. Tapping sets `style` only.
- Rules: picking a style never assigns materials ("Previously this auto-filled every surface with a style-matched material … ignored the user's intent", VZ:2698-2701). A style with no surgical edits makes Generate a whole-room restyle (C).
- Data: —
- States: selected · not.
- Words: *None* · *No style — only your changes are applied* + the names/descriptions in B-87
- Reachable: yes

### B-87 · The 25 design styles (`design-styles.ts`)
- Where: DS:27-256, DS:263-283 (derived maps: `STYLE_NAMES`, `STYLE_PROMPT_MAP` (D), `STYLE_AFFINITY_MAP`, `STYLE_DESCRIPTION_MAP`, `STYLE_PALETTE_MAP`)
- Entry: —
- Does: each style = id, name, description, a prompt paragraph (D owns), affinities `{ tags, finishes, colorFamilies }`, `colorTemperature`, a 5-hex palette. In order: **Modern** — *Clean lines, neutral palette, polished finishes* (#F8F8F8 #2A2A2A #A8A8A8 #8B7355 #D4D4D4); **Scandinavian** — *Light wood, white walls, hygge warmth* (#F5EFE6 #E8DCC8 #B8A88A #A8B5A0 #FFFFFF); **Industrial** — *Exposed brick, concrete, raw metals* (#6B5B4F #3C3C3C #2A2A2A #8B6F47 #D4A574); **Japandi** — *Japanese minimalism meets Nordic warmth* (#E8DFD3 #C4A984 #4A4A4A #9CAF88 #1C1C1C); **Classic** — *Herringbone floors, crown molding, marble* (#F5F0E6 #FAF9F6 #3A3A5C #B8935A #6B4226); **Minimalist** — *White palette, hidden storage, negative space* (#FFFFFF #F5F5F5 #E0E0E0 #B8B8B8 #8A8A8A); **Art Deco** — *Geometric patterns, gold leaf, jewel tones* (#0A0A0A #D4AF37 #2C5F2D #7B3F00 #C0C0C0); **Bohemian** — *Layered textiles, rattan, eclectic warmth* (#B8563A #C89B5B #6B4226 #E8DCC0 #3A4A3A); **Coastal** — *Whitewashed wood, navy and sand, sea breeze* (#FFFFFF #E8E8E8 #2C3E50 #D2B48C #87A8B8); **Farmhouse** — *Reclaimed wood, shaker cabinets, country charm* (#F5F0E8 #FFFFFF #8B6F47 #2A2A2A #8B5A2B); **Mid-Century Modern** — *Tapered legs, organic curves, retro optimism* (#D4A574 #6B4226 #D4A017 #2C5F5D #CC5500); **Mediterranean** — *Terracotta tiles, stucco walls, wrought iron* (#C85A3C #F5F0E8 #2A4A6B #8B7355 #1A1A1A); **Tropical** — *Lush palms, rattan, resort-inspired serenity* (#2C5F2D #8B6F47 #E8DCC0 #D4A574 #FF6B6B); **Wabi-Sabi** — *Imperfect beauty, raw plaster, aged patina* (#E8DED0 #B8A588 #8A8074 #4A4540 #C4B5A0); **Bauhaus** — *Primary colors, tubular steel, form follows function* (#FFFFFF #000000 #E63946 #1D3557 #F1C40F); **Hampton** — *Coastal luxury, coffered ceilings, relaxed elegance* (#FFFFFF #87A8C8 #4A5568 #E8E8E8 #B8935A); **Rustic** — *Rough timber, stone fireplace, cabin warmth* (#8B6F47 #6B5545 #D4A574 #2A2A2A #8B5A3C); **Transitional** — *Traditional meets contemporary, timeless balance* (#F5F0E8 #B8B8B8 #8B7355 #D4D4D4 #4A4A4A); **Hollywood Glam** — *Mirrored surfaces, velvet, jewel tones* (#1A1A1A #D4AF37 #5C1A1A #F5F5F5 #C0C0C0); **Biophilic** — *Living walls, indoor trees, nature connection* (#4A7C3F #8B6F47 #D4B896 #E8DFD3 #2C4A2C); **Maximalist** — *Bold patterns, saturated color, curated excess* (#1D3557 #D4AF37 #A8243B #2C5F2D #F5E8D0); **Cottagecore** — *Floral prints, vintage charm, pastel palette* (#F5E8D0 #D4B896 #E8B4B8 #FFFFFF #C9B5A0); **Parisian** — *Haussmann moldings, herringbone oak, effortless chic* (#E8DCC0 #F5EDE0 #B8935A #C4A0A0 #8A9A7B); **Dubai Luxury** — *Floor-to-ceiling marble, gold accents, opulence* (#F5F0E6 #D4AF37 #E8DCC0 #F8F4E3 #8B7355); **Balinese** — *Carved teak, stone accents, resort serenity* (#8B6F47 #2A2A2A #4A7C3F #E8DCC0 #7B5B3E).
- Rules: the palette is also what `suggestMaterials` measures swatches against (B-62); the public demo samples use 5 of them (Scandinavian · Industrial · Japandi · Bohemian · Dubai Luxury, `src/data/visualizer-samples.ts`).
- Data: static.
- States: —
- Words: as listed
- Reachable: yes

### B-88 · Style rules through the session
- Where: VZ:2385-2389 (new photo → None), VZ:3096-3097 (Original re-selected → None + reference cleared), VZ:3161-3172 (a gallery render restores the style it was made with, parsing *"Sketch render · {Style}"*), VZ:1725-1748 (intent), VZ:4045-4057 (reference vs preset note)
- Entry: —
- Does: the style follows the base being edited: fresh photo / Original → None; a render → its own style; a relight tile leaves it alone.
- Rules: a style reference outranks the named style on Generate; the Style Transfer panel prints *Generate will use this reference, not the "{style}" preset — remove it to go back to the preset.* when both are set, else *Hit Generate to restyle the room from this reference.*
- Data: —
- States: —
- Words: as quoted
- Reachable: yes

### B-89 · Where the style goes (prompt feed)
- Where: VZ:3383 (`style` in `/api/render`), VZ:3806 + 2912 (`/api/render/photorealistic` restyle / sketch), VZ:3600 (auto-furnish `style || undefined`), DS:266-268 (`STYLE_PROMPT_MAP` — D), MC:157 (`suggestMaterials`), VZ:1073 (`suggestReplacements(…, style, …)`)
- Entry: —
- Does: the name is sent as-is; the routes expand it with `STYLE_PROMPT_MAP` (D owns the text). In the editor it also ranks the Suggested materials and the Quick pick furniture presets.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-90 · Homeowner palette preference
- Where: — (not found in VZ, MSH, DS, MC)
- Entry: —
- Does: nothing in this slice reads a homeowner's palette or style preference; the only "homeowner" touchpoints are the portal share and annotate (C).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: not present

### B-91 · Style Transfer tile, pill and drawer (controls: C)
- Where: VZ:4516-4524 (tile: value *{n} image(s)* + *· {brief name}* or *None*), VZ:4043-4057 (`styleTransferBody` intro), VZ:5421-5426 (drawer title *Style Transfer*), VZ:5428-5445 (pill), VZ:5298 (phone tools tray)
- Entry: footer pill / sheet tile / Tools tray
- Does: opens the drawer with the intro line and `StyleTransferControls`; on desktop the pill toggles it and closing returns to the Style section.
- Rules: disabled without an image or in sketch mode (*Upload a room photo first*).
- Data: —
- States: —
- Words: *Style Transfer* · *Borrow the look of a photo instead of picking a preset. Your room's architecture, camera angle and framing stay put.* · *None*
- Reachable: yes

## B8 · Lighting mode

### B-92 · The Lighting tile / section value
- Where: VZ:4501-4504 (`relightPresetLbl`: preset label · *Custom* when configured without a preset · *Default*), VZ:4545-4551 (tile: *{label} · relit* when a result exists), VZ:5414 (desktop header: label or *Off*)
- Entry: —
- Does: summarises the lighting recipe.
- Rules: —
- Data: —
- States: —
- Words: *Lighting* · *Default* · *Custom* · *Off* · *· relit*
- Reachable: yes

### B-93 · `RelightControls` — presets, advanced sliders, fixtures, instruction, live edit
- Where: RC:113-225, VZ:4449-4461 (`lightingBody`)
- Entry: Lighting section / panel
- Does: an intro line; *Presets* with a *Reset* link (disabled when nothing is set) and a 2-column grid of 6 preset cards, each with a fixed example photo (`/lighting-presets/*.jpg`, all six exist), a label and a description (tapping the active preset again turns it off → neutral); a collapsed `<details>` *Advanced — fine-tune manually* with four range sliders and word labels; *Fixtures* tri-state chips; *Extra instruction (optional)* textarea; and, when a relit result exists, a *Live edit* button that reopens the result panel.
- Rules: moving any slider clears the active preset; toggling a fixture does NOT ("so you can tweak individual lights from a preset base"). Neutral = sun 45°, 4300 K, intensity 50, shadows 50, every fixture unset.
- Data: `relightKnobs`, `relightActivePreset`, `relightInstruction`.
- States: neutral · preset · custom · with result.
- Words: intro *Set the lighting, then hit **Generate Render** below. Lighting alone relights the room (everything else preserved); combine it with material or furniture changes to apply both in one render.* · *Presets* · *Reset* · *Advanced — fine-tune manually* · *Sun angle* · *Colour temperature* · *Intensity* · *Shadows* · *Fixtures* · *Extra instruction (optional)* · placeholder *e.g. add a warm reading lamp glow in the corner* · *Live edit*
- Reachable: yes

### B-94 · The six lighting presets
- Where: RC:32-39
- Entry: —
- Does: **Daylight** — *Bright, neutral sun through windows* (sun 70°, 5600 K, 80, shadows 50, all fixtures off); **Golden Hour** — *Warm, low, raking afternoon sun* (12°, 2500 K, 58, 70, accent on); **Warm Cozy Home** — *Dim, warm interior lamplight* (0°, 2300 K, 42, 55, cove on · pendants on · downlights off · accent on); **Blue Hour** — *Cool, moody dusk with accent glow* (4°, 6400 K, 32, 60, cove on · accent on); **Overcast** — *Soft, flat, shadowless daylight* (55°, 6800 K, 46, 25, all off); **Directional Spotlight** — *Dramatic, high-contrast accent lighting* (22°, 4000 K, 26, 85, downlights on · accent on).
- Rules: near-duplicates (Sunset, Ambient Evening, Midnight, Cool Office) were dropped on purpose (RC:28-30).
- Data: static.
- States: —
- Words: as listed; card tooltip = the description
- Reachable: yes

### B-95 · Slider ranges and the word labels
- Where: RC:12 (Sun 0–90, Temp 1800–9000 step 100, Intensity 0–100, Shadows 0–100), RC:46-49
- Entry: —
- Does: value captions: temperature *{k}K · amber* (≤2500) / *warm* (≤3400) / *neutral* (≤4600) / *cool* (≤6000) / *daylight*; sun *night* (≤0) / *low* (≤25) / *overhead* (≥70) / *mid*, printed *{word} · {deg}°*; intensity *dim* (≤30) / *bright* (≥70) / *moderate*; shadows *soft* (≤30) / *deep* (≥70) / *natural*.
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### B-96 · Fixtures (tri-state)
- Where: RC:14-23, RC:41-45, RC:101-106 (`relightFixturesPayload` sends only non-unset keys)
- Entry: —
- Does: four chips *Cove / strip* · *Pendants* · *Downlights* · *Accent*; each cycles unset → on → off → unset and prints *· on* / *· off* when set.
- Rules: unset fixtures are omitted from the payload.
- Data: `lighting.fixtures { cove?, pendants?, downlights?, accent? : "on"|"off" }`.
- States: unset · on · off.
- Words: as listed
- Reachable: yes

### B-97 · How lighting renders (also C)
- Where: VZ:1721-1733 (`relightConfigured`), VZ:3255 (lighting-only → `handleRelight`), VZ:3023-3071 (`POST /api/render/relight { image…, model: RELIGHT_MODEL, sunAngle, colorTemp, intensity, shadows, fixtures, instruction }`), VZ:3389-3397 (`lighting: {…}` folded into `/api/render` when combined with a redesign)
- Entry: the single primary button
- Does: lighting alone → a dedicated relight pass (result auto-saved as *Relit · {Preset}* and the result panel opens; toast); combined with surfaces / furniture / prompt → one render carrying a `lighting` block; the resulting render becomes relightable (`relightJobState` seeded, VZ:3430-3440).
- Rules: the primary label reads *Relight* only when lighting is the sole intent (VZ:3888-3889).
- Data: —
- States: —
- Words: toast *Relit* · *Saved to the gallery — adjust it live in the panel.*
- Reachable: yes

### B-98 · `RelightResultPanel` — the live editor
- Where: RC:229-367, VZ:5846-5870 (mount + `onUseAsBase`), VZ:3178-3200 (`reopenLiveEdit`, `closeRelightPanel`)
- Entry: auto-opens after a relight; *Live edit* in the Lighting panel; a relit gallery tile's Edit seeds it (C)
- Does: full-screen: header with back arrow (*Close*), the room name, a *Relit* badge, *drag to compare*, optional *Share to Portal* (project + portal flag; bakes the tweaks first) and *Done*. Left: a `CompareSlider` of before (the source image, or the untouched relit result once a tweak is dirty) vs the result with live CSS adjustments. Right: *Adjust the lighting (live)* + hint, four sliders (*Sun angle (approx)* · *Colour temperature* · *Intensity* · *Shadows (approx)*), *Reset* (to baseline, disabled when clean) and *Use this version* (disabled without a result; tooltip *Use this version as the working image to edit materials, furniture, etc.*): bakes the tweaks into a PNG when dirty, hands it to the editor which overwrites the relit gallery tile (`updateRelightVersion`) or saves *Relit · edited*, adopts it as the working image and toasts.
- Rules: sliders start at the render's baseline; the preview is the delta from that baseline (neutral at rest). Closing remembers baseline + tweak + un-baked source per job so reopening never double-applies.
- Data: memory (`relightJobState`); the overwrite re-uploads to a fresh path and PATCHes the job (C).
- States: clean · dirty · sharing.
- Words: *Relit* · *drag to compare* · *Share to Portal* / *Sharing…* · *Done* · *Adjust the lighting (live)* · *Instant colour & brightness tweaks — no re-render. To change the lighting recipe, use **Relight** in the controls panel.* · *Reset* · *Use this version* · toasts *Saved — now editing this version* / *Using this version — edit anything else from the controls.* · aria title *Relit room*
- Reachable: yes

### B-99 · Live tweak maths
- Where: RC:51-99
- Entry: —
- Does: `previewFilter` = brightness 0.55 + intensity × 0.9, contrast 1.08 when intensity < 40, raised up to ×1.26 as shadows go above 50; `shadowLiftOverlay` = a screen-blended mid-grey (opacity up to 0.5) for shadows < 50; `tempOverlay` = soft-light amber below 4300 K (max 0.6) / blue above 4700 K (max 0.52); `sunOverlay` = a raking warm-to-dark gradient scaled by how low the sun is. `relightPreviewDelta` maps the slider to neutral + (tweak − baseline).
- Rules: styling detail is out of scope; recorded because the "bake" writes these into the saved PNG (RC:258-275).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-100 · Phone lighting tray data (D)
- Where: VZ:5292-5304
- Entry: Lighting tray
- Does: the six presets with their preview images; *Off* = no preset + neutral knobs; more → the sheet's Lighting panel.
- Rules: —
- Data: —
- States: —
- Words: D
- Reachable: yes (≤ lg)

## B9 · Finishing, prompt, quality and the primary button

### B-101 · The Finishing tile
- Where: VZ:4552-4559
- Entry: sheet grid / Tools tray *Finishing note*
- Does: full-width tile, value *Note added* or *Default*.
- Rules: there is no Finishing section in the desktop accordion — desktop reaches the same fields through the footer (B-103, B-104).
- Data: —
- States: —
- Words: *Finishing* · *Note added* · *Default*
- Reachable: yes (sheet)

### B-102 · The Finishing panel (Custom Instructions + Render quality)
- Where: VZ:4464-4497
- Entry: sheet panel *Finishing*
- Does: *Custom Instructions* textarea (3 rows, a × clears) + hint; *Render quality* segmented *Fast* / *High quality* + hint.
- Rules: the textarea IS `refinementPrompt` (same as the footer Prompt); the toggle IS `selectedModel`.
- Data: —
- States: —
- Words: *Custom Instructions* · placeholder *e.g. "Make it warmer with more wood tones" or "Add brass accents throughout"* · *Optional. Refines the render alongside surface materials and style.* · *Render quality* · *Fast* · *High quality* · *Fast is quicker; high quality sticks closest to your photo.*
- Reachable: yes (sheet)

### B-103 · The footer Prompt box (desktop rail)
- Where: RL:108-118, VZ:5455-5459, VZ:3874-3878 (`promptLed`)
- Entry: rail footer
- Does: a collapsible *Prompt* toggle (chevron; a dot when text exists and it is collapsed; tooltip *Expand prompt* / *Collapse prompt*); when open a 3-row textarea and, once text exists, the hint *Runs your prompt, whichever panel is open*. Text makes the primary button *Generate from prompt* (B-105).
- Rules: collapsed by default; text outranks an open Defurnish / Auto Furnish drawer ("an explicit instruction").
- Data: —
- States: collapsed · open · led.
- Words: *Prompt* · placeholder *Describe anything you want — e.g. warmer wood tones, add a large potted plant, softer evening lighting, cosier mood… (works on its own or with the changes above)* · *Runs your prompt, whichever panel is open*
- Reachable: yes

### B-104 · Fast / High quality toggle (footer `leading`)
- Where: VZ:5460-5465, RL:120-121
- Entry: left of the primary button
- Does: the same `selectedModel` as B-102.
- Rules: —
- Data: —
- States: —
- Words: *Fast* · *High quality*
- Reachable: yes

### B-105 · The single primary button — label / busy / disabled matrix (also C)
- Where: VZ:3880-3922, RL:120-128
- Entry: rail footer (desktop), phone generate bar / sheet footer
- Does: label by mode: prompt text (and not sketch) → *Generate from prompt*; Defurnish drawer open → *Defurnish*; Auto Furnish open → *Auto Furnish*; sketch → *Render from sketch*; lighting-only → *Relight*; style reference without surgical edits → *Style Transfer*; else *Generate* or *Generate · {n}* when variants > 1. Busy labels: *Generating…* / *Checking placement…* (drift guard) / *Defurnishing…* / *Reading the room…* → *Furnishing…* / *Rendering…*. Disabled: `!canGenerate` for generate & prompt; busy or no image for the drawers and sketch. `runPrimaryAction` dispatches in the same order.
- Rules: the error line under the button shows `generateError`.
- Data: —
- States: as listed.
- Words: as listed
- Reachable: yes

### B-106 · Variant count (1 / 2 / 3)
- Where: VZ:1348 (state), VZ:5510-5524 (segmented *Variants* 1 · 2 · 3 in the phone Controls sheet footer), VZ:5342-5343 (`MobileGenerateBar variantCount / onVariantCount`, hidden in sketch mode), VZ:3891 (desktop label *Generate · {n}*)
- Entry: phone only
- Does: how many variants the surgical render / restyle / style transfer produce (`variants: variantCount`, VZ:3384; fan-out at 3711 and 3812).
- Rules: **no desktop control** — `VisualizerRail` has no variants input, so on a desktop the count stays at 1 unless it was changed on a phone-width viewport in the same session.
- Data: —
- States: —
- Words: *Variants* · sheet button *Generate {n} Render(s)* / *Generating…*
- Reachable: yes (≤ lg); dead on desktop

### B-107 · Wake lock and the background-interrupt guard (also C)
- Where: VZ:3939-3977
- Entry: any render in flight
- Does: requests a screen wake lock; if the tab was hidden > 45 s the in-flight fetch is aborted and a toast explains.
- Rules: —
- Data: —
- States: —
- Words: toast *Render interrupted* · *The app was in the background too long. Keep it open while rendering and try again.*
- Reachable: yes

## B10 · The rail, tiles and panels

### B-108 · `VisualizerRail` anatomy (desktop)
- Where: RL:26-133, VZ:5398-5466 (props)
- Entry: ≥ lg
- Does: a 380 px right column: a *Show surface markers* switch row; the sections (each header = icon · label · right-aligned value; exactly one open, it scrolls; headers stay pinned); an optional drawer covering the sections (icon · title · *Close* ×); a footer with the pills row, the Prompt toggle/box, the leading control + primary button, an error line and an optional `footerNote` (unused by the studio tool; the trial's quota line).
- Rules: shared with the public trial so the chrome cannot drift (RL:3-12).
- Data: —
- States: —
- Words: *Show surface markers* · *Close*
- Reachable: yes

### B-109 · The four desktop sections and their values
- Where: VZ:5401-5415
- Entry: —
- Does: *Style* (value = style or *None*, body = the card grid) · *Surfaces & Materials* (value *{m} set*, body = the surfaces list with the picker inline underneath when a surface / group is selected, plus *Deselect*) · *Furniture* (value *{m} changed* or blank) · *Lighting* (value = preset label / *Custom* / *Off*).
- Rules: opening a section closes both drawers (VZ:5417).
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### B-110 · The drawer and the pills (Style Transfer · Auto Furnish · Defurnish)
- Where: VZ:5418-5445, RL:74-86 + 91-107
- Entry: footer pills
- Does: a pill opens its drawer (title *Style Transfer* / *Auto Furnish* / *Empty the room — Defurnish*); pressing the active pill closes it; closing the Style Transfer drawer returns to the Style section. Only one drawer at a time.
- Rules: pills are disabled without an image or in sketch mode with tooltip *Upload a room photo first*.
- Data: —
- States: active · inactive · disabled.
- Words: pills *Style Transfer* · *Auto Furnish* · *Defurnish*; drawer titles as above
- Reachable: yes

### B-111 · `ControlTile` and `ControlPanel` (`control-shell.tsx`)
- Where: CS:12-49 (panel), CS:51-99 (tile)
- Entry: the phone Controls sheet (B-113)
- Does: a tile = icon box (green when set, primary when empty) · label · value line · a ✓ when set; a `locked` state dims it and prints `lockHint` (defined, never used by VZ). A panel = an absolutely positioned overlay filling the rail container, sliding in from the right, header with a *Back* arrow button, the title, an optional badge and the *Auto-saved* indicator; body scrolls.
- Rules: panels stay mounted (aria-hidden when closed) so they can slide out.
- Data: —
- States: set · empty · locked (unused).
- Words: *Auto-saved* · aria *Back*
- Reachable: yes

### B-112 · The tile grid + Tools row (`railTiles`) and the panel set (`railPanels`)
- Where: VZ:4507-4589, VZ:4644-4677, VZ:5493 + 5536 (mounted only inside the phone sheet)
- Entry: the phone Controls ("More") sheet
- Does: six tiles — *Style* · *Style Transfer* · *Surfaces & Materials* · *Furniture* · *Lighting* · *Finishing* (full width); then a *Tools* rule with *Hide markers* / *Show markers*, *Empty the room — Defurnish* (tooltip *Empty the room — AI defurnishing* / disabled *Upload a room photo first*) and the Auto Furnish entry button (C). Panels: *Design Style*, *Style Transfer*, *Surfaces & Materials* (list, or *← Back to surfaces* + *Materials · {scope}* + picker when selected), *Furniture*, *Lighting*, *Finishing*, *Empty the room* (autosaved=false), *Auto Furnish* (autosaved=false).
- Rules: the desktop no longer renders this grid (its comment at VZ:5395-5396 still calls it the "Sandbox layout"); Defurnish's panel copy lives in `defurnishBody` (C owns the tool; words: *Scope*, *Keep built-ins* / *Strip to shell* ★, *Extra items to remove*, placeholder *e.g. also remove the ceiling fan and the radiator*, *Existing wall/floor/ceiling finishes, camera angle & lighting are always preserved.*, *Upload a room photo first.*, *Empty the room* / *Regenerate* / *Defurnishing…*).
- Data: —
- States: —
- Words: as listed
- Reachable: yes (≤ lg)

### B-113 · The phone Controls sheet (also D)
- Where: VZ:5467-5545, VZ:1389-1406 (`showPanel`, `sheetSnap`, `openMobilePanel`)
- Entry: any tray's *more*, the Tools tray items, `openMoreOn(tile)`
- Does: a bottom sheet at *peek* (44dvh, the canvas stays visible while assigning) or *full* (88dvh) with a drag-handle button that toggles the snap (aria *Expand controls* / *Shrink controls*), a *Controls* title and ×; content = the sketch block when in sketch mode, the tile grid, then a footer with *Variants* 1 / 2 / 3 and *Generate {n} Render(s)* (disabled in sketch mode) + error; the panels overlay inside it.
- Rules: `openMobilePanel` does nothing on desktop (a past incident: the scrim dimmed the page).
- Data: —
- States: closed · peek · full.
- Words: *Controls* · *Variants* · *Generate {n} Render(s)* · *Generating…*
- Reachable: yes (≤ lg)

### B-114 · Phone mode mapping, dock badges and the generate bar (also D)
- Where: VZ:4680-4690 (`mobileMode` from `openTile`; `setMobileMode` closes drawers; `pendingChangeCount` = style + reference + materials assigned + furniture groups changed + lighting + note), VZ:5331-5349
- Entry: the dock
- Does: dock badges: surfaces = any material set, furniture = any group changed, style = style or reference, lighting = configured, tools = a note exists. Generate bar label *Render from sketch* / *Generate · {n} change(s)* / *Generate*; error = generate or sketch error.
- Rules: —
- Data: —
- States: —
- Words: *Generate · {n} change(s)* · *Generate* · *Render from sketch*
- Reachable: yes (≤ lg)

### B-115 · Tools tray items (also C / D)
- Where: VZ:5293-5316
- Entry: dock › Tools
- Does: *Empty the room* · *Auto furnish* · *Style transfer* · *Finishing note* · *Select area* / *Selecting…* (hint *Draw around items the detector missed*) · *Hide markers* / *Show markers*; the first two open their panel in the full sheet, the next two open the More sheet on that tile, lasso toggles region mode, markers toggles dots.
- Rules: Empty / Auto furnish disabled without an image or in sketch mode; Select area disabled without an image.
- Data: —
- States: —
- Words: as listed
- Reachable: yes (≤ lg)

### B-116 · The gallery strip's role in switching versions (versions: C)
- Where: RL:137-220, VZ:5351-5393, VZ:3933-3937 (collapsed by default below lg), VZ:3979-3982 (auto-expands when a render starts)
- Entry: under the canvas (≥ lg)
- Does: header *Gallery* + a *{n} render(s)* badge + chevron; disabled in temp mode with no history (*Save to project to browse history.*); empty text *No renders yet. Configure settings and generate.* (only when there is also no image). Tiles: *Original* (click = `editVersion(original, true)` + select; tooltip *Continue editing on the original*, aria *Edit the original*), one *Rendering…* placeholder per variant in flight (hover/touch *Cancel*, tooltip *Cancel this render*), then every variant *V{n} · {label}* (click = `editFromGallery` + select; tooltip *Continue editing on this version* or *Edit this version — live lighting tweaks or any other edit* for relights; hover *Compare* / *Delete this render*). The selected tile carries the border.
- Rules: clicking a tile always adopts it as the working image (re-detecting or restoring the cache) — there is no "just view" from the strip; the compare and delete actions are C's.
- Data: —
- States: collapsed · expanded · disabled · empty · rendering.
- Words: as quoted
- Reachable: yes

### B-117 · The left floating toolbar (canvas, desktop)
- Where: VZ:4966-5039
- Entry: ≥ lg, over the canvas
- Does: *Zoom in* · *Zoom out* · *Fit to screen*; with an image: a rule, then *Download the current image* · *Full view* (opens the View dialog on the working image — C) · *Share the current image to the homeowner portal* (project + `tools/homeowner-portal` flag; tooltip *Sharing…* while busy) · the lasso toggle (B-44) · *Change photo* (B-38).
- Rules: no undo, no compare, no history buttons here.
- Data: —
- States: —
- Words: tooltips as listed
- Reachable: yes

### B-118 · The phone top bar's ⋯ menu (also D)
- Where: VZ:4800-4829
- Entry: ≤ lg
- Does: *Download this image* · *Full view* · *Share to portal* (project + flag) · *Change photo* (while on the Original) · *Hide markers* / *Show markers*; the bar also shows the room name (opens the room switcher) and the version label (*Original* / *V{n}* / *Version*, with the render count) opening the Versions sheet.
- Rules: —
- Data: —
- States: —
- Words: as listed · aria *More actions*
- Reachable: yes (≤ lg)

## B11 · Canvas

### B-119 · Pan / pinch / wheel / double-tap (`useCanvasGestures`)
- Where: CG:22-168, VZ:1319-1325, VZ:4936-4940 (container: `cursor-grab` / `cursor-grabbing`), VZ:5061-5068 (transform `translate(offset) scale(scale)`, origin centre, 150 ms ease unless gesturing), T-cg
- Entry: the canvas
- Does: Pointer Events only: one pointer pans (absolute from the gesture-start snapshot), two pointers pinch-zoom about the pinch midpoint plus the midpoint's drift as pan (lifting one finger re-anchors without a jump), wheel zooms ±0.1 about the cursor (`passive: false`), a double-tap within 300 ms and 24 px with < 8 px travel fits to screen. `touchAction: "none"` on the container.
- Rules: pointers that start on `button, input, a, [role='button'], label, textarea, select` are ignored (dots and overlays keep their own handlers); mouse buttons other than left / middle are ignored; `disabled` (region mode) makes the hook inert.
- Data: —
- States: `isGesturing` → cursor grabbing, no transition.
- Words: —
- Reachable: yes

### B-120 · Zoom bounds and the maths (`canvas-gesture-math.ts`)
- Where: GM:6-38, T-gm
- Entry: —
- Does: scale clamped to [0.25, 3] and rounded to 2 dp; zoom buttons step ±0.25; `zoomAboutPoint` keeps the canvas point under the focal stationary (`screen = center + offset + p·scale`).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-121 · Fit-to-screen triggers
- Where: VZ:1597 (room switch), VZ:2429 (fresh upload), VZ:3098 (version adopted), CG:45
- Entry: —
- Does: resets scale 1 / offset 0.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-122 · `PlaceOverlay`
- Where: OV:23-36, T-ov
- Entry: place mode
- Does: an invisible full-image layer (`z-30`, crosshair, `touch-action: none`); `pointerdown` → stops propagation, prevents default, reports clamped image-relative (x, y).
- Rules: fires on down (matches the older mousedown behaviour).
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-123 · `LassoOverlay`
- Where: OV:43-116, T-ov
- Entry: region mode
- Does: a dimmed layer (`z-20`) capturing the pointer; the trail renders as an open SVG polyline (no closing edge); release → bounding box; < 3 points → clear; `pointercancel` → discard; busy → inert with a spinner card; the hint pill shows only before drawing starts.
- Rules: —
- Data: —
- States: idle · drawing · busy.
- Words: *Detecting region…* · hint prop (*Draw around items the detector missed*)
- Reachable: yes

### B-124 · Marker overlay geometry (`UploadZone.measureImage`)
- Where: VZ:517-580
- Entry: —
- Does: the overlay is sized to the letterboxed content rect in percentages of the container (scale-invariant through pan/zoom); recomputed on image load and by a ResizeObserver on the container and the image.
- Rules: "getBoundingClientRect() on an object-contain <img> returns the full ELEMENT box … otherwise the marker overlay spans the whole canvas (incl. the letterbox bands)".
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-125 · `CompareSlider`
- Where: CMP:5-116, VZ:5224-5230 (sketch compare, effectively dead — B-06), VZ:5695-5702 (View dialog; C), RC:323-327 (relight panel)
- Entry: —
- Does: before/after images object-contained in a box whose aspect is the BEFORE image's (falls back to the after's, then 16:9); a divider + handle dragged with mouse or touch (window listeners); corner captions default *Original* / *AI Render*; optional `afterFilter` / `afterLayers` for the relight preview.
- Rules: the slider must sit OUTSIDE the panned/scaled container (VZ:5224-5226).
- Data: —
- States: —
- Words: *Original* · *AI Render* · img alts *AI render* / *Original*
- Reachable: yes

### B-126 · Touch affordance rules (guard test)
- Where: T-touch:20-66
- Entry: —
- Does: for every visualizer file: every `group-hover:opacity-100` must pair with `hover-none:opacity-100`; no `SheetContent` may carry `relative` (tailwind-merge would drop `fixed`); no `onMouse*`, `addEventListener("mouse…")` or `onDoubleClick` anywhere.
- Rules: these are the 2.0-relevant behaviours: hover-revealed controls (room rename/delete, gallery Compare/Delete, Cancel render, swatch ×, row + / ×) must be visible on touch; the canvas is pointer-events only.
- Data: —
- States: —
- Words: —
- Reachable: yes

### B-127 · Drag-over highlight on the empty dropzone
- Where: VZ:1308, VZ:5073-5083, VZ:619-621
- Entry: dragging a file over the empty room
- Does: `isDragging` swaps the dashed border to the primary tint; drop reads `dataTransfer.files[0]`.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

## B12 · Copy

### B-128 · "Click" → "Tap" swaps
- Where: VZ:1278 (`tapWord`), VZ:4945 (place banner), VZ:4953 (remove banner), VZ:5131 + 5195 (dot tooltips / aria in removing mode)
- Entry: —
- Does: exactly three strings swap on a coarse pointer: *{Tap|Click} on the image to place "{label}"*, *{Tap|Click} the marker you want to remove*, *{Tap|Click} to remove this one*. Tooltips such as *Add another like this — click on the image to place it* do NOT swap.
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### B-129 · Toasts raised in this slice (verbatim)
- Where: VZ:2002, 2020, 2029, 2107-2113, 2121, 2278, 2366, 2374, 2596, 2604, 2680, 3124, 3127, 3061, 3964, 5863; CMD:90, 101
- Entry: —
- Does: *Draw a larger region* · *Could not crop image* · *Detection failed* · *No new items found in that region* · *Added {n} furniture + {n} surface(s)* · *Could not detect region* · *Couldn't rename the room* · *File too large* / *Maximum size is 10MB.* · *Unsupported image* / *Please try a JPG, PNG, or WebP.* · *File too large. Maximum size is 10MB.* (material) · *Could not load library material* · *Editing the original* · *Editing this version* · *Couldn't load that version* / *Please try again.* · *Relit* / *Saved to the gallery — adjust it live in the panel.* · *Render interrupted* / *The app was in the background too long. Keep it open while rendering and try again.* · *Saved — now editing this version* · *Using this version — edit anything else from the controls.* · *Saved "{name}" to your studio library* · *Could not save to library — using for this render only.* · *Could not load that image* (furniture ref).
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### B-130 · Tooltips and aria strings in this slice (verbatim)
- Where: as cited in the rows above
- Entry: —
- Does: *Back* · *Room options* · *Room options for {name}* · *Rename room* (aria) · *Pick a photo — a new room is created automatically* · *Zoom in* · *Zoom out* · *Fit to screen* · *Download the current image* · *Full view* · *Share the current image to the homeowner portal* / *Sharing…* · *Selection tool — draw a box to detect missed items* / *Exit selection tool (Esc)* · *Change photo* · *Hide markers* / *Show markers* · *Upload a room photo first* · *Empty the room — AI defurnishing* · *Change all {n} {group} at once — or expand to set each one* · *Collapse* / *Expand* · *Add another like this — click on the image to place it* · *Remove this surface* · *Remove one — pick which on the image* · *Remove from the list (doesn't change the render)* · *Place on image* · *No material — keep this surface unchanged* · *Upload custom material* · *{name} · {subcategory}* · *{name} · studio library* · *{name} · uploaded* · *Remove* · *Upload a photo of the furniture you want* · *Locked once render starts* · *Save to project to browse history.* · *Continue editing on the original* / *Edit the original* · *Continue editing on this version* / *Edit this version — live lighting tweaks or any other edit* / *Edit version {n}* · *Compare versions* · *Delete this render* / *Delete {label}* · *Cancel this render* / *Cancel render* · *Use this version as the working image to edit materials, furniture, etc.* · *Expand prompt* / *Collapse prompt* · *Expand controls* / *Shrink controls* · *More actions* · *Choose a material for {Scope}* · *Search materials* · *Clear search* · *Upload a swatch photo* · *Remove {name}* · *Furniture name* / *Surface name* · *Save to project* (aria).
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### B-131 · Panel / section titles and captions (verbatim)
- Where: as cited above
- Entry: —
- Does: *Design Style* · *Style Transfer* · *Surfaces & Materials* · *Furniture* · *Lighting* · *Finishing* · *Empty the room* · *Empty the room — Defurnish* · *Auto Furnish* · *Controls* · *Materials · {scope}* / *Materials · all {group}* · *Back to surfaces* · *Deselect* · *Tools* · *Quality* · *Presets* · *Fixtures* · *Scope* · *Variants* · *Prompt* · *Gallery* · *Generic* · *Gush Paints* · *Gush Enamel* · *Suggested for {Scope}* · *Recent* · *Your library* · *Results* · *This session* · *Show all {n}* / *Show fewer* · *Quick pick* · *Or describe it* · *Colour* · *Custom Instructions* · *Render quality*.
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: yes

---

## Uncertain / not verified

1. **The detect route's exact response contract** (`imageType`, `sketchSubtype`, `roomContext`, surface/furniture shapes, category vocabulary) is read from the client's parsing only (VZ:2140-2192); D owns the route and its prompt.
2. **`ControlTile` "locked"** and `lockHint` exist (CS:51-99) but no tile in VZ ever passes `state="locked"` — the comment's "Materials before a surface is selected" case was replaced by the inline picker; treat as unused.
3. **The in-canvas sketch compare** (VZ:5224-5230) depends on `SketchState.selected ≥ 0`, which nothing sets after the per-tab sketch versions strip was removed — I believe it is dead, not verified at runtime.
4. **Variant count on desktop**: no control was found in `VisualizerRail` or the desktop layout; `variantCount` can only change through the phone bar / sheet. Not verified against a running build.
5. **Library twin after a fresh upload**: `importedTwin` matches `previewUrl === lib.imageUrl`; a just-uploaded custom material's `previewUrl` is a data URL, so the same swatch should appear twice (session tile + ★ library tile) until reload. Inferred from code (VZ:2617-2626, 860-861), not observed.
6. **Room name collisions** (`Room ${rooms.length + 1}`) after deleting a middle room — inferred.
7. **Empty-type HEIC via "Upload new room"** is refused by `file.type.startsWith("image/")` (VZ:2284) while the dropzone accepts it — inferred.
8. **`studio-materials` bucket cap (5 MB, jpeg/png/webp)** comes from the SM doc comment (SM:14), not from a bucket policy I could read.
9. **Homeowner palette preference** — nothing found in this slice; if 1.0 has one it lives outside the visualizer (portal / copilot).
10. **The workspace route's per-user vs per-studio scoping** — the client keys the query by `getStudioId()` and stores under `studios.settings` (per studio); D/E to confirm.
11. **Line numbers for the phone Controls sheet's footer** (VZ:5510-5531) are read from a persisted chunk; ±3 lines.

## Hand-offs

- **Reader C** — `handleGenerate` / `handleRestyleWholeRoom` / `handleStyleTransfer` / `handleAutoFurnish` / `handleDefurnish` / `handleRenderFromSketch` / `handleRelight` bodies and their payloads (VZ:2845-3871), `persistVariantsToHistory` (VZ:2759-2834), the drift guard (VZ:3489-3535), the gallery's versions / compare / delete (VZ:3073-3245, 5351-5393), the View dialog (VZ:5547-5766), the Versions sheet, download / share / share-to-portal / send-to-chat / annotate (VZ:1801-1960, 5872-5901), `GalleryThumb` / `GalleryRenderingTile` actions, Auto Furnish + Style Transfer control components (`auto-furnish-controls.tsx`, `style-transfer-controls.tsx`), Defurnish scope copy (B-112 quotes it for completeness), keyboard shortcuts (only Escape exists in this slice, B-54), the wake-lock guard details.
- **Reader D** — `visualizer-mobile-shell.tsx` (`MobileTopBar`, the five trays, `MobileDock`, `MobileGenerateBar`, `RoomSwitcherSheet`, `VersionsSheet`), the prompt builders (`STYLE_PROMPT_MAP`, how `surfaces` / `preservedSurfaces` / `furnitureChanges` / `lighting` / `customRefs` are worded), every `/api/render/*` route incl. `detect` and `segment`, `/api/visualizer/workspace` rules, `/api/projects/rooms*`, `/api/renders/jobs*`, `/api/studio-materials/records*`, the landing page (`tools/ai-visualizer/page.tsx`) and its session / folder model beyond what B-22 records.
- **Reader E** — tables `project_rooms`, `render_jobs` (+ `variants_json`), `studio_materials`, `studios.settings.visualizerWorkspace`, `homeowner_shared_assets`, the `renders` and `studio-materials` buckets and their policies.
- **Reader F** — what 2.0 already has (Files tab / viewer, the Price book galleries as a possible material-library frame, `components/om/*` chips / pickers / sheets) for each row above.
