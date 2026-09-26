# OpenMaison 1.0 — AI Visualizer inventory · Slice C: the render flow, the results, the tools and the exits

1.0 repo `qanvast-id-tool` · branch `integ/security-non-qanvast` · commit `67f42e469` · read 2026-09-25 (read-only; nothing run).

## Abbreviations

| Code | Path |
|---|---|
| VZ | `src/components/projects/visualizer.tsx` (5,904 lines — read whole; B reads the same file for the model + modes) |
| RAIL | `src/components/projects/visualizer-rail.tsx` |
| MOB | `src/components/projects/visualizer-mobile-shell.tsx` |
| ANN | `src/components/projects/render-annotator-studio.tsx` |
| TED | `src/components/projects/tool-entry-dialog.tsx` |
| STC | `src/components/projects/style-transfer-controls.tsx` |
| AFC | `src/components/projects/auto-furnish-controls.tsx` |
| RLC | `src/components/projects/relight-controls.tsx` |
| CS | `src/components/projects/control-shell.tsx` |
| OVL | `src/components/projects/visualizer-canvas-overlays.tsx` |
| PAGE | `src/app/(main)/tools/ai-visualizer/page.tsx` (the host: landing + the editor's exits) |
| PROJ | `src/app/(main)/projects/[projectId]/page.tsx` |
| JOBS | `src/app/api/renders/jobs/route.ts` · JOB1 `…/jobs/[id]/route.ts` · JOBR `…/jobs/by-room/[roomId]/route.ts` |
| SHARE | `src/app/api/renders/share/route.ts` · SHD `src/components/copilot/share-dialog.tsx` |
| HL-LINK / HL-SHARE / HL-LIST / HL-ANN | `src/app/api/homeowner-links/{active-link,share-render,shared-renders,render-annotations}/route.ts` |
| QP | `src/lib/queries/projects.ts` · WS `src/lib/queries/visualizer-workspace.ts` · WSR `src/app/api/visualizer/workspace/route.ts` |
| DG | `src/lib/visualizer/drift-guard.ts` · RD `src/lib/render-drift.ts` · MC `src/lib/visualizer/mask-composite.ts` |
| CMP | `src/components/ui/compare-slider.tsx` · AF `src/lib/finance-auto-file.ts` · SC `src/lib/storage-client.ts` |
| MARK | `src/lib/render/openmaison-mark.ts` · STP `src/lib/style-transfer-prompt.ts` · AFP `src/lib/auto-furnish-prompt.ts` |
| RENDER | `src/app/api/render/route.ts` (the surgical render route; D owns its rules) |
| LAND | `src/components/visualizer/landing/{design-card,start-strip,first-run-hero}.tsx` |

Strings are quoted verbatim in *italics*; `…` inside a string is the code's own ellipsis character.

## Vocabulary (this slice)

- **Render / pass** — one press of the primary button. Six passes share the button: *Generate* (surgical edit of surfaces + furniture, `POST /api/render`), whole-room **restyle** (`/api/render/photorealistic`), **Style Transfer** (`/api/render/style-transfer`), **Relight** (`/api/render/relight`), **Render from sketch** (`/api/render/photorealistic`), **Defurnish** (`/api/render/declutter`), **Auto Furnish** (`/api/render/auto-furnish`). Dispatch: VZ:3247-3260, VZ:3915-3922.
- **Variant** — one output image of a pass: `VariantResult { id, imageUrl, materials[{label, material}], parentKey? }` (VZ:272-279). `materials` is the "Changes" list; `parentKey` names the version the changes were made on.
- **Job** — one pass's record: `RenderJob { id, roomId, model, style, createdAt, variants[] }` (VZ:302-309) ↔ DB row `render_jobs` (VZ:313-320; E owns the table). One job holds 1–3 variants.
- **Version** — a variant's place in the room's chronological list, numbered *V1, V2…* across every job (VZ:1651-1652). The upload is the **Original** (key `__original__`); a render's key is `${jobId}:${variantId}` (VZ:1287-1288).
- **Editing base / working image** — the image the controls act on (`roomImages[roomId]`); `roomBaseKind` = `original` | `render` drives lineage naming (VZ:1486-1487).
- **Lineage / parent** — `jobParentUrl` (local) and `variant.parentKey` (persisted) — the image a render was made FROM; drives the compare "before" and *Changes from V{n}* (VZ:1489-1492, VZ:1704-1709).
- **Job label / descriptor** — the local per-job caption (`jobLabel`), falling back to `job.style` after a reload (VZ:1488, VZ:5375).
- **Gallery** — the desktop strip under the canvas (RAIL:137-172); phones use the **Versions sheet** (MOB:528-579).
- **Compare window / View dialog** — the full-page dialog titled *View Render* with the before/after slider and the "pick any 2" strip (VZ:5548-5765).
- **Save to project / temp mode** — `saveToLibrary` (VZ:1388); OFF = nothing persists (no room row, no Storage, no job row).
- **Surgical edits** vs **whole-room restyle** — an assigned material / a furniture change (`hasSurgicalEdits`, VZ:3879) vs a picked style with no surgical edits (VZ:3260).
- **Route C / masked composite** — a surface-only render is confined to segmentation masks from `/api/render/segment` (MC; VZ:3339-3354, 3403-3418).
- **Drift guard / placement check** — verify + auto-repair of a whole-room render (`/api/render/drift-check`, `/api/render/drift-fix`; DG, RD).
- **Share link** — a public snapshot row in `render_share_links` (`/renders/{token}`, 7 days) (SHARE). **Share to Portal** — a `homeowner_shared_assets` row for the project's active homeowner link (VZ:1894-1956). **Annotation / pin** — a positioned note thread on a shared render, stored in `homeowner_shared_assets.metadata.annotations` (ANN, HL-ANN).
- **Send to Chat** — posts the image URL into the linked project/lead chat (VZ:1844-1851).
- **Auto-file** — every persisted variant becomes a `project_files` record in the project's *Renders* folder (VZ:2807-2818, AF).
- **Tool** — the rail's Tools row / pills (markers, Defurnish, Auto Furnish, Style Transfer), the canvas *Selection tool* (lasso re-detect), and the Detect Surfaces re-run.
- **Sandbox** — an internal `/tools/*-sandbox` page benchmarking a model or a flow; not linked from nav.
- **Design / session / workspace / folder** — the landing's units: a project's rooms, a lead's rooms, or a **Personal** *session* (studio-owned rooms grouped in `studios.settings.visualizerWorkspace`) filed in a folder (WS:10-24).
- **Focus mode** — below `lg` the editor hides the app topbar + bottom nav (PAGE:113-120).
- **Wake lock** — the screen is kept awake while any pass runs (VZ:3938-3977).
- **Credits** — never shown; the word only appears in code comments (VZ:1380, 2866, 2926). There is no cost/credit line anywhere in the studio editor.

## Overview / map

The editor is one client component, `Visualizer` (VZ:1270), mounted three ways: full-screen inside the AI Visualizer landing page (PAGE:209-221, with `onBack`), inside a project's *Render* tab (PROJ:4039-4044, no `onBack`), and by deep link `?projectId=` / `?leadId=` (PAGE:52-53, 83-87). Everything below the controls — the primary button, the gallery, the compare window, sharing, annotation, the tools and the exits — is this slice.

**One button runs every pass.** The desktop rail's footer holds a collapsible *Prompt*, a *Fast* / *High quality* model toggle and a single primary button whose label and handler follow the mode (VZ:3873-3922, RAIL:120-127). `canGenerate` needs an image plus at least one intent (VZ:1748). Each pass posts base64 to its own route, receives `{ imageUrl }` or `{ variants }`, optionally runs the drift guard, then hands the variants to `persistVariantsToHistory` (VZ:2759-2834): upload each data URL to the `renders` bucket, `POST /api/renders/jobs`, auto-file to the project's *Renders* folder, and push the job into `roomHistory`. There is no job queue, no polling and no resume: a pass is a single long fetch (the route allows 60 s, RENDER:2), cancelled by an `AbortController` shared by every flow (VZ:1377, 3924-3926). On reload only completed jobs come back (`GET /api/renders/jobs?…&status=completed`, VZ:1545-1547).

**The gallery is one Original plus V1…Vn.** Clicking a tile makes it the editing base (`editVersion`, VZ:3073-3126 — fetch, downscale to 1600 px, restore cached detection or detect again). *Compare* opens the View dialog with a default "before" (Original when there is one render, V1 otherwise, VZ:1674-1677) and a bottom strip where any two versions can be picked (VZ:1696-1703). The dialog carries Download · Share (public link) · Share to Portal · Annotate · Send to Chat (VZ:5592-5666). Annotate is the studio side of the portal's pin threads (ANN). The tools (Defurnish, Auto Furnish, Style Transfer, the lasso re-detect) sit in the rail's drawer/pills and on the phone's *Tools* tray; Outpaint / Reangle / Orbit video / Depth exist only in the sandbox experiment. Exits are the Back arrow (→ the landing, which also owns focus mode and the confirm dialogs for deleting a design or folder); the editor has no unsaved-work guard because everything a pass produces is saved at once — everything else (surfaces, materials, style, labels) is session-only and lost on reload.

---

## A · Generate

### C-01 · The primary button (desktop rail)
- Where: VZ:3873-3922 (label / busy / disabled / dispatch), VZ:5462 (wired), RAIL:120-127 (rendered)
- Entry: the rail footer, always visible on `lg+`
- Does: one press runs `runPrimaryAction` (VZ:3915-3922): prompt text present and not in sketch mode → `handleGenerate`; else an open Defurnish panel → `handleDefurnish`; else an open Auto Furnish panel → `handleAutoFurnish`; else sketch mode → `handleRenderFromSketch`; else `handleGenerate` (which itself routes by intent, C-03).
- Rules: label precedence (VZ:3880-3892): prompt-led → *Generate from prompt*; Defurnish open → *Defurnish*; Auto Furnish open → *Auto Furnish*; sketch → *Render from sketch*; lighting only → *Relight*; style reference and no surgical edits → *Style Transfer*; else *Generate* or *Generate · {n}* when n > 1. Disabled (VZ:3905-3913): prompt-led → `!canGenerate`; Defurnish → busy or no image; Auto Furnish → busy or no image; sketch → rendering or no image; else `!canGenerate`. The button is also disabled while busy (RAIL:122).
- Data: —
- States: idle · busy (spinner + busy label) · disabled · error line under the button (RAIL:128, VZ:5463)
- Words: *Generate from prompt* · *Defurnish* · *Auto Furnish* · *Render from sketch* · *Relight* · *Style Transfer* · *Generate* · *Generate · 2* / *Generate · 3*; busy: *Generating…* · *Checking placement…* (while the drift guard runs) · *Defurnishing…* · *Reading the room…* · *Furnishing…* · *Rendering…* (VZ:3893-3903)
- Reachable: yes

### C-02 · When Generate lights up (`canGenerate`)
- Where: VZ:1724-1748
- Entry: —
- Does: `canGenerate` = an image with base64 AND (a surface with a material · a furniture change · lighting configured · a style picked · a style reference attached · non-empty prompt) AND not already generating.
- Rules: `relightConfigured` = a preset active, or any knob off neutral (sun 45° · 4300 K · intensity 50 · shadows 50), or any fixture set, or a lighting instruction (VZ:1725-1732). `hasRedesignIntent` = assigned material · furniture change · prompt text (VZ:1735-1738) — detected-but-unassigned surfaces never count. A fresh photo resets style and style reference to none (VZ:2383-2386), so a new upload cannot generate until the user picks something.
- Data: —
- States: —
- Words: the Surfaces panel's own hint when nothing is set is the tile value *Upload a photo* / *No surfaces* (VZ:4531); the rail sections show *None* / *0 set* / *Off* (VZ:5402-5423). There is no dedicated "nothing to generate" hint on the button itself.
- Reachable: yes

### C-03 · Routing by intent inside `handleGenerate`
- Where: VZ:3247-3260
- Entry: the primary button / the phone's Generate bar
- Does: (1) lighting configured and no redesign intent → `handleRelight` (C-11); (2) a style reference and no surgical edits → `handleStyleTransfer` (C-10); (3) a named style and no surgical edits → `handleRestyleWholeRoom` (C-09); (4) otherwise the surgical render (C-07), folding lighting in when configured (C-12).
- Rules: the prompt rides along in every pass as the custom instruction (VZ:3376, 3729, 3818, 3611); a style reference outranks a named style card (VZ:3257-3259, hint at VZ:4052).
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-04 · Variant count (1 / 2 / 3)
- Where: state VZ:1348; desktop label VZ:3892; phone bar MOB:431-446 + VZ:5342-3343; legacy mobile sheet VZ:5513-5528
- Entry: the phone Generate bar's *{n}×* dropdown; the mobile Controls sheet's *Variants* segmented 1 · 2 · 3; on desktop there is NO variant control in the rail — the count is only changeable through the phone sheet/bar (see Uncertain).
- Does: the surgical render sends `variants: variantCount` and the server fans out (VZ:3371); restyle and style transfer fan out `n` parallel client calls (VZ:3711-3713, 3803-3805). Relight, Defurnish, Sketch and Auto Furnish always produce one.
- Rules: default 1; the gallery shows `variantCount` placeholder tiles while a surgical/restyle pass runs (VZ:5369). Sketch mode hides the control (`hideVariants`, VZ:5345).
- Data: —
- States: —
- Words: *Variants* · *{n}×* · *1 variant* / *2 variants* / *3 variants* (MOB:441) · phone bar label *Generate · {n} change{s}* counts pending changes, not variants (VZ:5337)
- Reachable: yes (phone); desktop: dead control — the count stays at 1 unless the mobile sheet was used at a narrower width

### C-05 · Render quality (model toggle)
- Where: MODELS VZ:356-362; state VZ:1349; rail toggle VZ:5456-5461; Finishing panel VZ:4488-4495
- Entry: left of the primary button (desktop) and the Finishing panel (mobile sheet)
- Does: *Fast* = `google/gemini-3.1-flash-image` (default), *High quality* = `google/gemini-3-pro-image-preview`; sent as `model` on the surgical render and the whole-room restyle (VZ:3372, 3819).
- Rules: model ids never shown (VZ:434-435). Other passes have fixed models: relight `gemini-3.1-flash-image` (RLC:11), defurnish `gemini-3.1-flash-image` (VZ:366), style transfer `gemini-3.1-flash-image` (STC:29), sketch Fast `gemini-3.1-flash-image` / High `black-forest-labs/flux.2-pro` (VZ:436-439), Auto Furnish Fast `gemini-3.1-flash-image` / High `gemini-3-pro-image` (AFC:21-24).
- Data: `render_jobs.model`
- States: —
- Words: *Fast* · *High quality* · panel label *Render quality* · hint *Fast is quicker; high quality sticks closest to your photo.* (VZ:4494)
- Reachable: yes

### C-06 · The prompt box (custom instructions)
- Where: rail prompt VZ:5451-5455 + RAIL:108-118; Finishing panel VZ:4464-4486; state VZ:1352-1353
- Entry: the rail footer's *Prompt* disclosure (collapsed by default) or the Finishing panel's *Custom Instructions*
- Does: free text; when present the button becomes *Generate from prompt* and the text outranks open Defurnish / Auto Furnish panels (VZ:3874-3878). It counts as redesign intent (beats the relight shortcut) and is passed to every pass as `refinementPrompt` / `customPrompt` / `instruction`.
- Rules: a surface-only render with prompt text is no longer "surface only" → no masked composite (VZ:3346-3350).
- Data: —
- States: collapsed with a dot when text is present (RAIL:112) · expanded with the hint (RAIL:114)
- Words: *Prompt* · placeholder *Describe anything you want — e.g. warmer wood tones, add a large potted plant, softer evening lighting, cosier mood… (works on its own or with the changes above)* · hint *Runs your prompt, whichever panel is open* · Finishing: *Custom Instructions* · placeholder *e.g. "Make it warmer with more wood tones" or "Add brass accents throughout"* · *Optional. Refines the render alongside surface materials and style.* · tile value *Note added* / *Default* (VZ:4554)
- Reachable: yes

### C-07 · The surgical render request (`POST /api/render`)
- Where: VZ:3261-3398 (payload build + fetch); route header RENDER:1-40
- Entry: C-03 case 4
- Does: builds `surfaces` (only assigned ones: `{label, material, description}` for stock, `{label, material, customRefIndex}` for custom), `customRefs` (deduped custom material images then furniture reference photos, `{name, base64, mimeType, kind:"material"|"furniture"}`), `furnitureChanges` (changed items: `{label, action, replacementDesc, x, y, customRefIndex}`; customize composes palette + note, VZ:265-270), `preservedFurniture` (kept items with x/y), `preservedSurfaces` (unassigned labels), `style`, `variants`, `model`, `modalities`, `imageWidth/Height`, `refinementPrompt`, and `lighting` when configured (VZ:3361-3393). Response `{ variants: [{id, imageUrl, materials}] }` (generate-core `VariantResult`, `src/lib/render/core/generate-core.ts:43`).
- Rules: route needs the `qanvast_session` cookie (401 *Unauthorized* / *Invalid session*), rate limit 10/min/IP → 429 *Too many requests* (RENDER:22-26); `maxDuration = 60` s (RENDER:2). `unassignedSurfaces` is always empty (VZ:3296, 3369).
- Data: usage events `feature_opened` / `feature_succeeded` / `feature_failed` for `ai_visualizer` (RENDER:29-33; `src/lib/usage/funnels.ts:19-24`)
- States: —
- Words: on `!res.ok` the route's `error` text or *Generation failed — please try again.* (VZ:3396); on throw *Generation failed: {detail}* (VZ:3473)
- Reachable: yes (also B for the surfaces / furniture model)

### C-08 · Route C — masked composite for surface-only renders
- Where: VZ:3339-3354, 3403-3418; MC:56-185
- Entry: automatic
- Does: when the render changes only surface materials (no furniture change, no lighting, no prompt), the client asks `/api/render/segment` for masks of the changed labels in parallel with the render; each variant is then composited: rendered pixels kept only inside the union mask (feathered 2 px), the untouched original everywhere else; output re-encoded as JPEG 0.92.
- Rules: masks with < 8 % fill are rejected (`MIN_MASK_FILL_RATIO`, MC:31); any failure returns the plain render (MC:63, 109, 160-163; `fetchSurfaceMasks` → `[]` on error).
- Data: —
- States: silent; console log only (VZ:3408)
- Words: —
- Reachable: yes

### C-09 · Whole-room restyle (a style, no surgical edits)
- Where: VZ:3789-3864
- Entry: C-03 case 3
- Does: `n = variantCount` parallel `POST /api/render/photorealistic` with `{ imageBase64, mimeType, style, sourceType:"photo", imageWidth/Height, furnitureList, customPrompt, model, fidelity:"exact" }`; failed calls drop out; the survivors go through the drift guard with `geometry:"flexible"`; then persist. Label: the style, or *Restyle · {style}* when editing a render (VZ:3849-3850).
- Rules: guard `!style` → *Pick a style first — that's the look the whole room is restyled into.* (VZ:3792); all variants failed → *Restyle failed — please try again.* (VZ:3836)
- Data: `render_jobs.style` = the style name
- States: —
- Words: as above
- Reachable: yes

### C-10 · Style Transfer pass
- Where: VZ:3674-3786; controls STC (C-105)
- Entry: C-03 case 2 (a reference attached, no surgical edits)
- Does: optional pre-flight `POST /api/render/room-analyze` unless geometry is *Locked* (VZ:3695-3709, failure ignored); then `n` parallel `POST /api/render/style-transfer` with `{ image…, model, references[{base64,mimeType,role}], aspects, strength, geometry, keepList, instruction, spec (the brief), roomNotes, detected:{surfaces} }`; drift guard with `changed = aspects`, `preserved = the other aspects`, the keep list and geometry; persist with label *Style transfer* or *Style transfer · {brief style name}* (VZ:3769).
- Rules: no reference → *Upload a style reference image first.*; no aspects → *Pick at least one thing to transfer (colour, materials, furniture, lighting or decor).*; all failed → *Style transfer failed — please try again.* (VZ:3677, 3681, 3750)
- Data: `render_jobs.model = google/gemini-3.1-flash-image`
- States: —
- Words: as above
- Reachable: yes

### C-11 · Relight-only pass
- Where: VZ:3023-3069 (also B for the knobs)
- Entry: C-03 case 1 — lighting configured, nothing else
- Does: `POST /api/render/relight` with the knobs, fixtures and instruction; on success seeds the live-edit baseline, opens the full-screen *RelightResultPanel* automatically, saves the render as a version labelled *Relit* or *Relit · {preset}* (VZ:3054), remembers per-job live-edit state, toasts.
- Rules: shares `generating` and `generateError` with Generate; abort via the same controller.
- Data: `render_jobs.model = google/gemini-3.1-flash-image`, `style = "Relit · …"`
- States: —
- Words: toast *Relit* — *Saved to the gallery — adjust it live in the panel.* (VZ:3057); error *Relight failed — please try again.* (VZ:3063); save failure *Couldn't save the relit render* — *Please try again.* (VZ:2975)
- Reachable: yes

### C-12 · Lighting folded into a redesign
- Where: VZ:3383-3391, 3455-3464
- Entry: automatic when lighting is configured alongside surface/furniture/prompt changes
- Does: the surgical payload carries a `lighting` object; after the render the new version becomes relightable (the *Live edit* button appears, `relightJobState[jobId]` seeded with the applied lighting as baseline).
- Rules: `isRelightJob` = tracked in `relightJobState` OR label starts with *Relit* (VZ:3130).
- Data: —
- States: —
- Words: the Lighting section's copy explains it: *Set the lighting, then hit Generate Render below. Lighting alone relights the room (everything else preserved); combine it with material or furniture changes to apply both in one render.* (RLC:140 — note the copy says "Generate Render" but the button says *Generate*)
- Reachable: yes

### C-13 · Render from sketch
- Where: VZ:2896-2952; section VZ:455-500; canvas banner VZ:4960-4964; phone bar VZ:5337-5345
- Entry: a room whose detection classified the image as a sketch (`imageType === "sketch"`, VZ:2144; also B) — the button becomes *Render from sketch*; the sketch section (quality + button) shows in the mobile Controls sheet (VZ:5497-5506)
- Does: `POST /api/render/photorealistic` with `{ image…, style, roomContext, furnitureList, customPrompt, model: QUALITY_PRESET_MODEL[fast|high], fidelity:"exact" }`; the result is saved immediately as *Sketch render* / *Sketch render · {style}* (VZ:2929) and adopted as the working image (`editVersion(url,false)` → detection runs on it with `forcePhoto`), which exits sketch mode. Re-selecting the Original (the sketch) brings sketch mode back.
- Rules: one image per press (no variants); the quality preset is a separate state from the Fast/High model toggle (VZ:1478). While the section says *Re-select the sketch from the gallery to render again*, nothing else prevents pressing again.
- Data: —
- States: *Rendering…* on the button; error line under the quality cards (VZ:490) and the phone bar (VZ:5344)
- Words: banner *Looks like a sketch — I'll render it first.* + *Not a sketch? Use as-is →* (VZ:469-470); canvas pill *Looks like a sketch — hit "Render from sketch" to turn it into a photo first, then edit it.* (VZ:4962); *Quality* · *Fast* / badge *Quick* / *Lower detail — quicker to generate.* · *High quality* / badge *Slower* / *Best detail — takes a bit longer.* (VZ:440-443); button *Render from sketch* / *Rendering…*; footnote *The render becomes your editable image and is saved to the gallery. Re-select the sketch from the gallery to render again.* (VZ:496); error *Render failed — please try again.* (VZ:2946)
- Reachable: yes

### C-14 · "Not a sketch? Use as-is"
- Where: VZ:2957-2960, VZ:470
- Entry: the sketch banner's link
- Does: flips `isSketch` off for the room → the normal editing flow on the raw upload (surfaces stay empty because detection populated nothing for a sketch, VZ:2146-2151; the user can lasso or Add surface).
- Rules: —
- Data: —
- States: —
- Words: *Not a sketch? Use as-is →*
- Reachable: yes (only inside the mobile Controls sheet's sketch section — on desktop the SketchRenderSection is not mounted; see Uncertain)

### C-15 · Defurnish — "Empty the room"
- Where: VZ:2836-2888 (handler), VZ:4591-4640 (panel), VZ:364-372 (scopes), entry VZ:416-428 + 4582, pill VZ:5436, tray VZ:5314
- Entry: rail pill *Defurnish* / tile-row button *Empty the room — Defurnish* / phone Tools tray *Empty the room*; disabled without an image or in sketch mode (title *Upload a room photo first*)
- Does: `POST /api/render/declutter` with `{ image…, model: DEFURNISH_MODEL, scope, instruction }`; the result is saved at once as *Defurnished · {scope label}* (VZ:2870) and loaded onto the canvas (`editVersion`). Closing the panel clears versions, error and the instruction; the scope is sticky (VZ:2836-2842).
- Rules: scopes *Keep built-ins* / *Strip to shell* (starred, default `joinery`, VZ:1447); the desktop primary button runs it; the in-panel button only shows below `lg` (VZ:4635, `lg:hidden`) and relabels *Regenerate* after one run.
- Data: `render_jobs.style = "Defurnished · Keep built-ins" | "Defurnished · Strip to shell"`
- States: busy *Defurnishing…* · error line in the panel
- Words: drawer title *Empty the room — Defurnish* (desktop, VZ:5429) / panel title *Empty the room* (sheet, VZ:4670); *Upload a room photo first.*; *Scope*; *Keep built-ins* — *Clear furniture, accessories, wall TVs & wall lights. Keep panelling + fitted cabinetry.*; *Strip to shell* ★ — *Remove everything incl. panelling & protruding built-ins → flat plain bare walls. Floor kept.*; *Extra items to remove* · placeholder *e.g. also remove the ceiling fan and the radiator* · *Existing wall/floor/ceiling finishes, camera angle & lighting are always preserved.*; button *Empty the room* / *Regenerate* / *Defurnishing…*; error *Defurnish failed — please try again.* (VZ:2884); entry titles *Empty the room — AI defurnishing* (VZ:421)
- Reachable: yes

### C-16 · Auto Furnish
- Where: VZ:3534-3669 (handler + body), AFC (panel, C-104), pill VZ:5435, tray VZ:5315
- Entry: rail pill *Auto Furnish* / tile-row button *Auto Furnish* (title *Furnish an empty room with AI*, AFC:48) / phone Tools tray *Auto furnish*; disabled without an image or in sketch mode
- Does: pre-flight in parallel — `POST /api/render/room-scan` (emptiness report + `existing[]`) and `POST /api/render/room-analyze` (openings notes), both advisory (VZ:3553-3586); then `POST /api/render/auto-furnish` with `{ image…, model (Fast/High per panel), roomType, style, density, exclude, instruction (panel text, else the Finishing prompt), roomNotes, detected:{context, surfaces[{label,x,y}], existing} }`; drift guard with `geometry:"flexible"`, `changed` = furniture · decor · floor · wall paint · door paint, `preserved` = walls/doors/windows/openings · ceiling/skirting/trim · built-ins/appliances · camera; persist as *Auto furnished* / *Auto furnished · {style}*; the panel closes on success (VZ:3645).
- Rules: one image; the scan note is kept after the pass (state, VZ:1446).
- Data: `render_jobs.model` = Fast `google/gemini-3.1-flash-image` / High `google/gemini-3-pro-image`
- States: *Reading the room…* (scan) → *Furnishing…*; scan note *ok* or *warn*; error block in the panel
- Words: scan notes *Room reads as empty — good to furnish.* / *Room reads as {state}. Auto Furnish assumes an empty room — empty it first for a cleaner result.* (VZ:3577-3578); error *Furnishing failed — please try again.* (VZ:3651)
- Reachable: yes on desktop; **not runnable below `lg`** by reading (no button calls `handleAutoFurnish` there — see Uncertain)

### C-17 · Drift guard — verify and auto-repair placement
- Where: VZ:3489-3532; DG:100-196; RD:15-58, 135-146
- Entry: automatic after restyle (C-09), style transfer (C-10) and Auto Furnish (C-16); NOT after the surgical render, relight, defurnish or sketch
- Does: both images shrunk to 1024 px → `POST /api/render/drift-check` with the context → a report of violations in six categories (structure · opening · physics · scale · access · scope) with severity blocking / warning. If any blocking: up to 2 escalating `POST /api/render/drift-fix` passes (inputs at 1280 px), each re-checked; every candidate scored (blocking = 10, warning = 1) and the best wins, so a repair can never make it worse.
- Rules: every failure returns the render untouched (DG:11, 122); unrepaired problems are not surfaced (VZ:3527-3528); the verdict is no longer shown (VZ:1460-1461).
- Data: nothing persisted about drift
- States: primary button *Checking placement…* while it runs (VZ:3894, 3902)
- Words: toast *Auto-fixed placement on {n} render* / *… on {n} renders* only when a repair improved a result (VZ:3531)
- Reachable: yes (internal)

### C-18 · Loading state per slot
- Where: gallery VZ:5369-5371 + RAIL:208-220; Versions sheet MOB:545-549; phone bar MOB:419-425; canvas: none
- Entry: any pass in flight
- Does: the gallery shows `variantCount` placeholder tiles for a surgical/restyle/style-transfer pass and 1 for sketch / auto furnish / defurnish; each offers *Cancel* on hover/touch; the Versions sheet shows one *Rendering…* card; the phone bar swaps to *Rendering…* + *Cancel*. The canvas image itself does not change while rendering (no overlay).
- Rules: the gallery auto-expands when a pass starts (VZ:3980-3982).
- Data: —
- States: —
- Words: *Rendering…* · *Cancel* · tile title *Cancel this render* (RAIL:213)
- Reachable: yes

### C-19 · Cancel while busy
- Where: VZ:1377, 3924-3926; every pass sets `genAbortRef` (VZ:2904, 3028, 3357, 3551, 3689, 3801)
- Entry: the placeholder tile's *Cancel*, the phone bar's *Cancel*
- Does: aborts the in-flight fetch; the `catch` recognises `AbortError`, logs, and clears busy state without an error message.
- Rules: Defurnish has no abort controller (VZ:2845-2888) — its fetch cannot be cancelled although the gallery tile offers Cancel; a cancelled style-transfer/restyle fan-out aborts all `n` calls (shared signal).
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-20 · Wake lock and the tab-hidden abort
- Where: VZ:3938-3977
- Entry: any of `generating · sketchRendering · autoFurnishBusy · defurnishing`
- Does: requests `navigator.wakeLock("screen")` while busy, re-acquires on return to the foreground; if the tab was hidden > 45 s, aborts the pass and toasts.
- Rules: —
- Data: —
- States: —
- Words: toast *Render interrupted* — *The app was in the background too long. Keep it open while rendering and try again.* (VZ:3966)
- Reachable: yes

### C-21 · Timeouts
- Where: RENDER:2 (`maxDuration = 60`); route strings `src/app/api/render/{style-transfer:269, relight:140, reangle:219/283}/route.ts`, `outpaint:108`
- Entry: —
- Does: no client-side timeout; the routes return *Generation timed out — try again* (style transfer, relight, reangle) / *Outpaint timed out — try again* which the client shows verbatim (`data.error`).
- Rules: D owns the per-route limits.
- Data: —
- States: —
- Words: as above
- Reachable: yes

### C-22 · Rate limit and auth errors on the render routes
- Where: RENDER:10-26 and the same pattern in every `src/app/api/render/*/route.ts`
- Entry: —
- Does: 401 *Unauthorized* / *Invalid session*, 429 *Too many requests* (10 per minute per IP, key `render`); the client shows the string under the button.
- Rules: —
- Data: —
- States: —
- Words: *Unauthorized* · *Invalid session* · *Too many requests*
- Reachable: yes

### C-23 · Error words per pass (client-side fallbacks)
- Where: VZ:2884, 2946, 3063, 3396, 3473, 3651, 3677, 3681, 3750, 3780, 3792, 3836, 3858
- Entry: —
- Does: every pass shows `data.error` from the route when present, else its own fallback: Generate *Generation failed — please try again.* / *Generation failed: {detail}*; Restyle *Restyle failed — please try again.*; Style transfer *Style transfer failed — please try again.*; Relight *Relight failed — please try again.*; Sketch *Render failed — please try again.*; Defurnish *Defurnish failed — please try again.*; Auto Furnish *Furnishing failed — please try again.*; HTTP fallback *HTTP {status}*. Route-side words that reach the user: *Missing room photo* · *Room photo too large (max 10MB)* · *Reference image too large (max 10MB)* · *Missing style reference image* · *Images are too large in total — use a smaller room photo or fewer reference images.* · *Missing image* · *Image too large (max 10MB)* · *No image in AI response — please try again* · *Invalid request*.
- Rules: errors clear on the next press (`setGenerateError("")`) and on room switch (VZ:1596).
- Data: —
- States: —
- Words: as listed
- Reachable: yes

### C-24 · What happens when a render lands
- Where: VZ:3439-3466 (surgical), 3767-3774, 3844-3852, 3636-3645, 2866-2881, 2926-2940, 3048-3057
- Entry: —
- Does: (1) stamp `parentKey` = the version being edited (VZ:3441-3442); (2) `persistVariantsToHistory` (C-31); (3) **select the new version** in the gallery (`roomSelectedVersion[room] = "{jobId}:{firstVariantId}"`), which hides *Change photo* (VZ:3446, 1636); (4) label the job (*Edit · {style}* when editing a render, else the style; VZ:3448-3449); (5) remember the parent image for compare; (6) if lighting was folded in, seed relight state; (7) **on phones open the Versions sheet** (VZ:3466). The canvas keeps showing the editing base — the new render is NOT auto-adopted for the surgical/restyle/style-transfer passes; Defurnish, Sketch and Relight-*Use this version* DO adopt (`editVersion`).
- Rules: temp mode replaces the room's single job (VZ:2825-2827).
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-25 · Render diagnostics (console only)
- Where: VZ:3420-3437, 2421-2427
- Entry: —
- Does: logs input vs output dimensions per variant and flags *⚠ ASPECT MISMATCH* in the console; not user-facing.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal

### C-26 · No credits / cost line
- Where: VZ (whole file), RAIL, MOB — no UI string; comments only VZ:1380, 2866, 2926; sandboxes show `$` estimates (C-118…)
- Entry: —
- Does: the studio editor never shows a cost, a credit balance or a quota. The public trial has a quota (`src/lib/render/trial-quota.ts`, A/D) — not the studio editor.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-27 · The legacy mobile Controls sheet's Generate footer
- Where: VZ:5468-5545 (sheet), footer VZ:5510-5542
- Entry: the phone trays' *More* / *Fine-tune* / *Describe* chips (`openMobilePanel("full")`, VZ:1402-1406, 4773)
- Does: a bottom sheet titled *Controls* with a snap handle (*Expand controls* / *Shrink controls*), the tile grid (railTiles), the focused ControlPanels, and a footer with *Variants* 1·2·3 and a *Generate {n} Render{s}* button that calls `handleGenerate` directly and closes the sheet.
- Rules: disabled when `!canGenerate || sketchMode` (VZ:5532) — it never runs the sketch, Defurnish or Auto Furnish passes; the error line repeats `generateError`.
- Data: —
- States: *Generating…* with spinner
- Words: *Controls* · *Variants* · *Generate 1 Render* / *Generate 2 Renders* / *Generate 3 Renders* · *Generating…*
- Reachable: yes (phones/tablets)

### C-28 · Phone Generate bar
- Where: VZ:5336-5346; MOB:404-453
- Entry: pinned under the dock below `lg`
- Does: one button (*Render from sketch* in sketch mode, else *Generate* / *Generate · {n} change{s}* where n = style + reference + assigned materials + changed furniture + lighting + note, VZ:4687-4689), a *{n}×* variants dropdown, busy state with *Rendering…* + *Cancel*, and the error line (`generateError || sketchError`).
- Rules: `onGenerate` = `handleRenderFromSketch` in sketch mode, else `handleGenerate` — it never calls `runPrimaryAction`, so an open Defurnish/Auto Furnish panel is ignored here.
- Data: —
- States: —
- Words: *Generate* · *Generate · 3 changes* · *Render from sketch* · *Rendering…* · *Cancel*
- Reachable: yes (D owns the shell; the rules are recorded here)

---

## B · Jobs (the client's side of `/api/renders/jobs/*`)

### C-30 · Loading rooms and completed jobs on open
- Where: VZ:1507-1592; JOBS:23-71
- Entry: mount / when project, lead or session changes (the component is remounted by key, PAGE:215)
- Does: resets every piece of state, then in parallel `GET /api/projects/rooms?entityType=project|lead&entityId=…` (or `?roomIds=a,b` for a session) and `GET /api/renders/jobs?entityType=…&entityId=…&status=completed` (or `?roomIds=…&status=completed`); jobs are grouped by `room_id` (jobs without a room are dropped, VZ:1578), mapped to `RenderJob` (`variants_json` → `variants`), and the active room becomes `initialRoomId` when it exists, else the first room (VZ:1570). Rooms' stored uploads seed the *Original* per room.
- Rules: the route orders `created_at DESC` (JOBS:58) — newest job first in `roomHistory`; the route requires entity or roomIds (400 *entityType (project|lead) and entityId, or roomIds, are required*); RLS scopes to the session studio. A session with no rooms skips both fetches (VZ:1549-1560). Fetch failures resolve to empty lists silently.
- Data: `render_jobs` rows `{ id, room_id, model, style, created_at, variants_json }`; `project_rooms { id, name, original_image_url }`
- States: `loadingRooms` → canvas spinner (VZ:5041-5042)
- Words: —
- Reachable: yes

### C-31 · Persisting a finished pass (`persistVariantsToHistory`)
- Where: VZ:2759-2834; JOBS:73-121; SC:21-41
- Entry: every pass on success
- Does: `jobId = crypto.randomUUID()`; when `saveToLibrary && entityId`: each `data:` variant is uploaded through `/api/storage/upload` to bucket `renders` at `{studioId}/{entityId}/rooms/{roomId}/jobs/{jobId}/variant-{n}.png` (upsert false) and swapped for its public URL; then `POST /api/renders/jobs` `{ id, roomId, model, status:"completed", variantsJson, style, completedAt, projectId|null, leadId|null }`; then, for a project, `autoFileToProject(projectId, "Renders", "Render - {room} - {style|Style} - v{n}.png", { sourceId: jobId, sourceType:"render", storageUrl })` per variant (best effort, dynamic import). Finally the job is prepended to `roomHistory[roomId]` (or replaces the room's job in temp mode).
- Rules: the server stamps `studio_id` from the session and ignores any in the body (JOBS:96-98); `id` required (400 *id is required*); a failed POST throws *render job save failed* (or the route's error) — the pass then shows it as its error, and the uploaded files stay in Storage.
- Data: `render_jobs` insert; Storage bucket `renders`; `project_files` (folder *Renders*) via `/api/project-files/records`
- States: —
- Words: file name pattern *Render - {room} - {style} - v{n}.png*
- Reachable: yes

### C-32 · Editing a job in place (`PATCH /api/renders/jobs/[id]`)
- Where: VZ:2983-3018 (relight overwrite), VZ:3232-3237 (drop one variant); JOB1:23-67
- Entry: *Use this version* with live tweaks in the relight panel; deleting one variant of a multi-variant job
- Does: relight overwrite re-uploads the baked image to `…/jobs/{jobId}/variant-1-edit-{timestamp}.png` (a fresh path so the browser cache refreshes, VZ:2990-2993) and PATCHes `{ variantsJson, style }`; deleting a variant PATCHes `{ variantsJson: remaining }`.
- Rules: PATCH needs at least one field (400 *nothing to update (variantsJson and/or style required)*); a foreign id is a silent no-op under RLS.
- Data: `render_jobs.variants_json`, `render_jobs.style`
- States: —
- Words: —
- Reachable: yes

### C-33 · Deleting jobs (`DELETE /api/renders/jobs/[id]`, `…/by-room/[roomId]`)
- Where: VZ:3238 (last variant → delete job), VZ:2319 (room delete), WS:212-231 (session delete); JOB1:69-95; JOBR:18-44
- Entry: deleting a version's last variant; *Delete room*; deleting a Personal design
- Does: `DELETE …/jobs/{id}` when a job's last variant is removed; `DELETE …/jobs/by-room/{roomId}` when a room or a session is deleted (then `DELETE /api/projects/rooms/{roomId}`).
- Rules: Storage objects are removed by the client first for a room delete (VZ:2292-2316, `/api/storage/remove` on paths after `/renders/`), but NOT for a single-version delete (the file stays in the bucket) nor for a session delete (WS:212-231 deletes rows only).
- Data: `render_jobs` delete
- States: —
- Words: —
- Reachable: yes

### C-34 · No polling, no resume, one status
- Where: VZ:1545-1547 (`status=completed`), VZ:2791 (`status:"completed"`), every pass = a single `fetch`
- Entry: —
- Does: the client only ever writes `status: "completed"` (the job row is created AFTER the image exists); it only ever reads completed jobs. There is no pending/failed row, no poll loop, nothing to resume after a reload — a pass interrupted by navigation or a reload is lost (and its credits with it; the routes have no server-side job record).
- Rules: the wake-lock effect (C-20) is the only mitigation.
- Data: `render_jobs.status` (always `completed` from this client)
- States: —
- Words: —
- Reachable: —

### C-35 · Storage layout
- Where: VZ:2447 (original), VZ:2775 (variants), VZ:2993 (relight edit), VZ:1902 (portal share of a data URL)
- Entry: —
- Does: bucket `renders`, paths `{studioId}/{entityId}/rooms/{roomId}/original.{jpg|png}` · `…/jobs/{jobId}/variant-{n}.png` · `…/jobs/{jobId}/variant-1-edit-{ms}.png` · `{studioId}/{entityId}/shared/{uuid}.png`; uploads via `POST /api/storage/upload` (multipart `bucket, path, upsert, file`), which enforces the `{studioId}/` prefix (SC:1-14).
- Rules: —
- Data: —
- States: —
- Words: upload failure *Upload failed ({status})* (SC:36) surfaces through the pass's error line
- Reachable: internal

### C-36 · Temp mode (Save to project OFF)
- Where: VZ:1385-1388, 1711-1714, 2227-2254, 2445, 2767, 2825-2827, 3227, 4061-4084, 5355-5357
- Entry: the *Save to project* switch at the top of the Surfaces & Materials panel (VZ:4063-4079)
- Does: OFF → rooms are local (`local-{id}`), the upload is not stored, no job row, variants stay data URLs, one job per room (each pass replaces the last), version deletes don't sync, the gallery header is disabled until the first render.
- Rules: locked once a render has started or the room has history (`renderHasStarted`, VZ:1714) — title *Locked once render starts*; resets ON when the entity changes. Default ON.
- Data: —
- States: ON *Renders persist to this project.* · OFF *Temp mode — closing wipes the render.* · after a render in temp mode a yellow note *Temp mode — close this and your render is gone.*; gallery header disabled title *Save to project to browse history.*
- Words: *Save to project* and the strings above
- Reachable: yes (note the switch's odd home inside the Surfaces panel)

### C-37 · Standalone sessions (Personal designs)
- Where: VZ:1496-1505, 2231-2247; PAGE:216, 218; WS:196-210
- Entry: *New design* on the landing (C-137)
- Does: a session has no DB column; its rooms are studio-owned (`projectId: null, leadId: null`) and the visualizer loads them by the explicit room-id list; a new room's id is reported through `onRoomCreated` → `useAddRoomToSession` writes it into `studios.settings.visualizerWorkspace.sessions[].roomIds`.
- Rules: the room-id list is captured once at mount so adding a room never reloads/wipes work (VZ:1502-1505).
- Data: `studios.settings.visualizerWorkspace` (JSONB, WSR:1-18)
- States: —
- Words: —
- Reachable: yes

---

## C · Versions, history and the gallery

### C-40 · The gallery strip (desktop)
- Where: VZ:5351-5392; RAIL:137-172; expand state VZ:3933-3935
- Entry: under the canvas on `lg+`
- Does: a header row *Gallery* with a badge *{n} render{s}* and a chevron; expanded → thumbnails in a horizontal scroller: the Original first, then the in-flight placeholders, then every version (newest job first because `roomHistory` is newest-first).
- Rules: expanded by default on ≥ 1024 px, collapsed on narrower screens (VZ:3933-3935); auto-expands when a pass starts; disabled (with title) in temp mode until a render exists.
- Data: —
- States: empty text only when there is no history, nothing rendering AND no image: *No renders yet. Configure settings and generate.* (VZ:5357)
- Words: *Gallery* · *1 render* / *{n} renders* · *Save to project to browse history.*
- Reachable: yes

### C-41 · The Original tile
- Where: VZ:5359-5367; RAIL:175-205
- Entry: —
- Does: click → `editVersion(originalUrl, true)` and select `__original__`: the editing base returns to the upload, style and style reference reset to None, sketch classification re-runs (a sketch brings sketch mode back), toast *Editing the original*.
- Rules: no Compare and no Delete on the Original (props omitted); it is the upload, not a render.
- Data: —
- States: selected border when `selectedVersionKey === "__original__"`
- Words: label *Original* · title *Continue editing on the original* · aria *Edit the original*
- Reachable: yes

### C-42 · A version tile
- Where: VZ:5372-5391; RAIL:175-205
- Entry: —
- Does: label *V{n} · {descriptor}* (descriptor = local `jobLabel` or the persisted `job.style`); click → `editFromGallery` (C-46) + select; hover/touch reveals *Compare* (top-left) → `openCompare(key)` and a red × *Delete this render* → `deleteRender` (C-48).
- Rules: the label falls back to the job's `style` column after a reload, so *Edit ·* / *Restyle ·* prefixes are lost on reload (they are never persisted).
- Data: —
- States: selected border = the version being edited
- Words: *Compare* · title *Compare versions* · title *Delete this render* · aria *Delete V{n} · …* · tile title *Continue editing on this version* or, for a relight job, *Edit this version — live lighting tweaks or any other edit*
- Reachable: yes

### C-43 · Version numbering
- Where: VZ:1649-1652
- Entry: —
- Does: `chronoVariantKeys` = every job oldest-first, every variant in job order; `versionOf(jobId, vId)` = index + 1. So a 3-variant job yields V4 · V5 · V6, and numbering shifts when an earlier version is deleted.
- Rules: no version limit anywhere (C-49).
- Data: —
- States: —
- Words: *V1* … *V{n}*
- Reachable: —

### C-44 · Job descriptors (what the label says)
- Where: VZ:3448-3449, 3850, 2870, 2929, 3054, 3639, 3769, 5860-5861, 2969
- Entry: —
- Does: surgical from the Original → *{style}* (empty when style is None → the label is just *V{n}*); surgical while editing a render → *Edit · {style}*; restyle while editing a render → *Restyle · {style}*; defurnish → *Defurnished · Keep built-ins* / *Defurnished · Strip to shell*; sketch → *Sketch render* / *Sketch render · {style}*; relight → *Relit* / *Relit · {preset}* / *Relit · edited*; auto furnish → *Auto furnished* / *Auto furnished · {style}*; style transfer → *Style transfer* / *Style transfer · {brief name}*.
- Rules: only the descriptor passed as `style` to the job row persists; `jobLabel` is local.
- Data: `render_jobs.style`
- States: —
- Words: as listed
- Reachable: —

### C-45 · Making a version the editing base (`editVersion`)
- Where: VZ:3073-3126
- Entry: any tile / Versions-sheet card / after Defurnish, Sketch, Relight *Use this version*
- Does: fetch the URL (unless a data URL) → base64 → downscale to 1600 px (`compressBase64(…, 1600)`) → becomes `roomImages[roomId]`; `roomBaseKind` = original|render; Original resets style + reference; fit to screen; restores the cached detection for that URL (no AI call) or runs detection once (`forcePhoto` for renders so they never re-classify as a sketch) and caches it.
- Rules: the cache key is the version's URL; sketches are never cached (VZ:1378-1382).
- Data: —
- States: —
- Words: toast *Editing the original* / *Editing this version* (VZ:3121); error toast *Couldn't load that version* — *Please try again.* (VZ:3124)
- Reachable: yes

### C-46 · `editFromGallery` — relight jobs and style restore
- Where: VZ:3145-3174
- Entry: clicking a version tile / Versions sheet *Edit*
- Does: always `editVersion(url,false)`; for a relight job also restores the live-edit baseline/tweak/source so *Live edit* re-opens correctly; for other jobs clears relight state and selects the style the render was made with (a clean style name, *None*, or the *· {style}* suffix of a sketch descriptor).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-47 · "Change photo" only while on the Original
- Where: VZ:1631-1636; buttons VZ:5028-5036 (toolbar), VZ:4821-4823 (phone ⋯)
- Entry: the left toolbar / the phone ⋯ menu
- Does: opens the hidden file input → `processRoomFile(activeRoomId, file)` replaces the room's upload (re-uploads `original.*` with upsert, re-detects).
- Rules: shown only when the selection is untouched or the Original is selected — hidden once a render is selected (swapping the source would orphan the renders).
- Data: `project_rooms.original_image_url`
- States: —
- Words: *Change photo*
- Reachable: yes

### C-48 · Deleting a version (`deleteRender`)
- Where: VZ:3200-3245; VersionsSheet MOB:569
- Entry: the tile's ×, the Versions sheet's trash
- Does: optimistic removal of the variant (or the whole job when it was the last variant); closes the View dialog if it showed that image; drops local label/parent; syncs the DB (PATCH or DELETE); toasts.
- Rules: **no confirmation**; the Storage file is not removed; DB failures are logged only (the toast still says deleted).
- Data: `render_jobs`
- States: —
- Words: toast *Render deleted*
- Reachable: yes

### C-49 · Version count limit
- Where: — (no cap in VZ, JOBS, WS)
- Entry: —
- Does: unlimited versions per room; unlimited rooms (the tab bar scrolls, VZ:4848-4850).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-50 · What persists per room vs what is session-only
- Where: persisted: VZ:2775-2798 (variants, model, style, parentKey inside `variants_json`), VZ:2447-2457 (original); session-only: VZ:1295-1305, 1346-1359, 1486-1492, 1474, 1382
- Entry: —
- Does: **persisted** — the room name + original upload, each job's variants (URL, materials list, parentKey), model, style descriptor. **Lost on reload** — detected surfaces + assigned materials, furniture actions, custom material uploads, the picked style / style reference / lighting knobs / prompt, `jobLabel` (Edit/Restyle prefixes), `jobParentUrl` (the compare falls back to the default before), `relightJobState` (live edits fall back to the preset parsed from the label, VZ:3136-3143), the detection cache, `recentMaterials` survives in `localStorage` key `visualizer-recent-materials-{userId}` (VZ:1365-1371).
- Rules: —
- Data: as above
- States: —
- Words: —
- Reachable: —

### C-51 · The Versions sheet (phone gallery)
- Where: VZ:5778-5796 (wired), VZ:4762-4768 (entries), MOB:528-579
- Entry: the top bar's versions pill (C-52); auto-opens when a surgical/restyle/style-transfer render lands (VZ:3466)
- Does: a 2-column grid: a *Rendering…* card while busy, then every render (newest job first) and the Original last; the selected card carries an *Editing* badge; tap the card → edit it (C-46) and close; *Compare* → `openCompare` and close; trash → delete (no confirm). The Original's footer reads *The photo you started from* and has no actions.
- Rules: order = renders first, Original last (the reverse of desktop).
- Data: —
- States: —
- Words: *Versions* · *Tap to edit · compare any two* · *Rendering…* · *Editing* · *V{n}* + sub-line (descriptor) · *Original* · *The photo you started from* · *Compare* · aria *Edit V{n}* / *Delete V{n}*
- Reachable: yes (D owns the sheet chrome)

### C-52 · The phone top bar's version pill
- Where: VZ:4756-4761, 4807-4809; MOB:117-125
- Entry: —
- Does: shows *{Original|V{n}|Version} · {count}* where count = total renders; hidden until there is at least one render; tap opens the Versions sheet.
- Rules: —
- Data: —
- States: —
- Words: *Original · 3* · *V2 · 3* · aria *Versions, {n} renders*
- Reachable: yes

### C-53 · Gallery auto-expand and history reset on room switch
- Where: VZ:3980-3982, 1594-1602
- Entry: —
- Does: any pass starting expands the strip; switching rooms clears the error, fits the canvas and clears relight preview state.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-54 · Sketch "versions" — dead state
- Where: VZ:444-450 (`SketchState.versions/selected`), VZ:1647 (`currentSketchRenderUrl`), VZ:5226-5230 (in-canvas compare), VZ:4816/5013 (download/share of the sketch render)
- Entry: —
- Does: the sketch flow used to append candidates to `versions` and compare them in-canvas; since the auto-adopt change nothing ever pushes into `versions` (only `isSketch:false` is patched, VZ:2959; the classification resets it to `[]`, VZ:2202), so `currentSketchRenderUrl` is always null and the in-canvas CompareSlider never mounts.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: dead (by reading)

### C-55 · Relight results — live edit, "Use this version", overwrite
- Where: VZ:5846-5869 (wired), VZ:3176-3198, 2983-3018; RLC:229-367 (also B for the sliders)
- Entry: auto-opens after a relight-only pass; *Live edit* in the Lighting section (RLC:218-222) when a relight result exists; a relight tile's click re-seeds it
- Does: a full-screen panel: room name, a *Relit* chip, *drag to compare* hint, a compare slider (before = the source, or the relight itself once tweaked), four live CSS sliders (sun angle · colour temperature · intensity · shadows) relative to the render's baseline, *Reset*, *Use this version* (bakes tweaks into a PNG via canvas; if edited → overwrite the gallery tile in place with label *Relit · edited* (or save a new *Relit · edited* job when there is no tracked job), then adopt it as the editing base), *Share to Portal* (bakes and shares; panel stays open), *Done* (closes; remembers baseline/tweak/source per job).
- Rules: the live sliders spend no credits (CSS only); the editor always works on the un-baked source so re-opening never double-applies (VZ:1471-1474).
- Data: `render_jobs.variants_json[0].imageUrl`, `render_jobs.style`
- States: —
- Words: *Relit* · *drag to compare* · *Share to Portal* / *Sharing…* · *Done* · *Adjust the lighting (live)* · *Instant colour & brightness tweaks — no re-render. To change the lighting recipe, use Relight in the controls panel.* · *Sun angle (approx)* · *Colour temperature* · *Intensity* · *Shadows (approx)* · *Reset* · *Use this version* (title *Use this version as the working image to edit materials, furniture, etc.*) · toasts *Saved — now editing this version* / *Using this version — edit anything else from the controls.* (VZ:5867) · Lighting section button *Live edit*
- Reachable: yes

### C-56 · Detection cache per version
- Where: VZ:1378-1382, 2182-2190, 3108-3120
- Entry: —
- Does: detection results (surfaces + furniture with positions) are cached under the version's URL so re-selecting a version restores them instantly; edits made after caching are not written back (clones are stored), so re-selecting a version resets its surfaces to the detected state — assigned materials are lost on every switch.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal (also B)

---

## D · The View dialog (full-page compare)

### C-60 · Opening the View dialog
- Where: VZ:1690-1693 (`openCompare`), VZ:5000-5010 (toolbar *Full view*), VZ:4817 (phone ⋯ *Full view*), VZ:5386 (tile *Compare*), VZ:5794 (Versions sheet *Compare*), dialog VZ:5548-5765
- Entry: *Compare* on a version → before/after with the default other side; *Full view* → the working image alone (a synthetic variant `{id:0, materials:[]}`) with no compare keys
- Does: a full-viewport dialog (`View Render`, visually hidden title) over a dark canvas: header · slider or single image · bottom gallery.
- Rules: `openCompare` picks `defaultBeforeKeyFor(version)`: with ≤ 1 render the Original, with ≥ 2 the real V1 (oldest render), falling back to the Original; when the default IS the version, a single image (VZ:1668-1677).
- Data: —
- States: single image (one key) · slider (two keys)
- Words: dialog title *View Render* (hidden)
- Reachable: yes

### C-61 · Picking any two versions to compare
- Where: VZ:1654-1703, VZ:5730-5761
- Entry: the dialog's bottom strip *Gallery · select 2 versions to compare*
- Does: every entry (Original + all versions, keyed like the main gallery, labelled *Original* or *V{n} · {descriptor}*) is a toggle: selecting adds it (a third pick bumps the oldest selection); deselecting the last remaining one is refused; selection order sets the sides — badge *1* = left/before, *2* = right/after. The header actions target the right image (or the single one).
- Rules: max 2; `viewingOriginalUrl` = left URL only when two are selected.
- Data: —
- States: selected border + numbered badge
- Words: *Gallery* · *· select 2 versions to compare* · title *Add to comparison* / *Remove from comparison* · aria *Compare {label}* / *Remove {label}*
- Reachable: yes

### C-62 · The compare slider
- Where: VZ:5712-5728; CMP:5-116
- Entry: —
- Does: drag anywhere (mouse or touch) to move the divider; both images `object-contain` in a box that takes the BEFORE image's aspect ratio; corner captions = the two selected labels (defaults *Before* / *After* in the dialog; the component's own defaults are *Original* / *AI Render*).
- Rules: no keyboard control of the divider; starts at 50 %.
- Data: —
- States: —
- Words: captions as above
- Reachable: yes

### C-63 · The "Changes" list
- Where: VZ:5568-5590 (desktop popover), VZ:5671-5680 + 5828-5843 (phone chip + bottom sheet), source `VariantResult.materials`
- Entry: the header button, shown only when the viewed variant has ≥ 1 material change
- Does: a popover (desktop) or a bottom sheet (phone) listing each change as *{surface label} → {material name}*; the heading names the parent version when the render carries `parentKey`.
- Rules: only surgical renders have `materials` (restyle, style transfer, relight, defurnish, sketch and auto furnish all save `materials: []`), so the button is absent for them and for the Original; furniture changes are not listed (the route's `furnitureChanges` is not read by the client).
- Data: `render_jobs.variants_json[].materials`, `[].parentKey`
- States: —
- Words: *Changes* / *Changes from Original* / *Changes from V{n}* + count badge · popover heading *Changes from V{n}* / *Changes in this version* · phone aria *Show changes in this version*
- Reachable: yes

### C-64 · Header actions (desktop, `lg+`)
- Where: VZ:5592-5666
- Entry: —
- Does: *Download* (C-85) · *Share* (C-83; disabled while sharing or without a URL, title *Generate a render first to share.*) · *Share to Portal* (C-84; only with a project and the portal enabled) · *Annotate* / *Annotate ({n})* (C-70; only once the viewed image is a shared asset) · *Send to Chat* → *Sent* (C-86; only when a linked chat exists) · *Close*. The back arrow (title/aria *Close*) also closes.
- Rules: —
- Data: —
- States: *Sharing...* (public link) · *Sharing…* (portal) · *Sent* for 2 s
- Words: *Download* · *Share* · *Sharing...* · *Share to Portal* · *Sharing…* · *Annotate* · *Annotate (3)* · *Send to Chat* · *Sent* · *Close*
- Reachable: yes

### C-65 · Header actions below `lg`
- Where: VZ:5668-5707
- Entry: —
- Does: the *Changes* chip, a download icon (aria *Download*), a share icon (aria *Share*), and a ⋯ menu (aria *More actions*) holding *Share to Portal*, *Annotate*, *Send to Chat* / *Sent*; the ⋯ only renders when a linked chat or the portal share applies.
- Rules: —
- Data: —
- States: —
- Words: as above
- Reachable: yes

### C-66 · Closing the dialog
- Where: VZ:5548, 5557, 5662
- Entry: back arrow · *Close* · Esc / outside press (Radix `onOpenChange`)
- Does: clears the viewed variant, the *Sent* flag and the phone Changes sheet; compare keys are left as they were (re-applied on the next open).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-67 · What the View dialog does NOT have
- Where: VZ:5548-5765 (whole dialog)
- Entry: —
- Does: no *Regenerate*, no *Discard*, no *Add to project* / *Save* (saving is automatic, C-31), no delete from inside the dialog (delete lives on the tile / Versions sheet), no zoom. Deleting the viewed render elsewhere closes the dialog (VZ:3220).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-68 · Full view of the working image
- Where: VZ:5000-5010, 4817
- Entry: the left toolbar's eye (title *Full view*) / phone ⋯ *Full view*
- Does: opens the dialog on the current editing base as a `{id:0}` variant — no Changes button, Share sends `variantImageUrl` = the (1600 px) data URL, Annotate never matches, the bottom strip still lets you pick versions.
- Rules: —
- Data: —
- States: —
- Words: *Full view* · *Download this image* (phone ⋯) · toolbar title *Download the current image*
- Reachable: yes

---

## E · Annotate (studio pins on a shared render)

### C-70 · When Annotate appears
- Where: VZ:1412-1421, 5631-5643, 5694-5698, 5892-5901; QP:1068-1090; HL-LIST
- Entry: the View dialog, only when `projectId` is set, the homeowner portal is enabled for the studio (`isPageEnabled("tools/homeowner-portal")`, VZ:1278), and a `homeowner_shared_assets` row exists whose `url` equals the viewed variant's `imageUrl` (i.e. after *Share to Portal*, or a Files & Docs share of the same file).
- Does: opens `StudioRenderAnnotator` with the asset id, its stored URL and title (`{room} — Render` fallback).
- Rules: matching is by exact URL, so a data-URL render (temp mode / unsaved) can never be annotated; the button shows the pin count.
- Data: `GET /api/homeowner-links/shared-renders?projectId=` → `HomeownerSharedAsset[]` incl. `annotations`
- States: —
- Words: *Annotate* / *Annotate ({n})*
- Reachable: behind studio flag `tools/homeowner-portal` (platform config) and a project context

### C-71 · The annotator dialog and dropping a pin
- Where: ANN:47-206
- Entry: C-70
- Does: a dialog *{title} — annotate*; click anywhere on the image → a pulsing draft pin at the normalized (x, y) and a draft form in the side panel; *Add pin* posts `{ projectId, assetId, x, y, body }`; *Cancel* discards. Existing pins are numbered circles (designer = primary, homeowner = blue, resolved = green ring); clicking one selects its thread.
- Rules: body required, max 2000 chars (`maxLength`), 100 pins per render (409 *This render has too many pins already*); position must be 0–1 (*Pin position is out of range*).
- Data: `homeowner_shared_assets.metadata.annotations[] = { id, x, y, body, status:"open"|"resolved", authorRole:"studio"|"homeowner", homeownerId, authorName, createdAt, comments[{ id, authorRole, homeownerId, authorName, body, createdAt }] }` (HL-ANN:171-182, 231-239; `src/types/app.ts:3731-3743`); author name resolved from the session's profile, fallback *Studio*
- States: draft · pending (spinner on *Add pin*) · error toast
- Words: *{title} — annotate* · *Tap the render to drop a pin the homeowner can see and reply to.* · *New pin — point something out to the homeowner* · placeholder *e.g. Proposing a warmer wood tone for this cabinet — thoughts?* · *Cancel* · *Add pin* · aria *Pin {n}* · toast *Couldn't add pin* (or the route's message)
- Reachable: yes (gated as C-70)

### C-72 · Threads: reply, resolve, remove
- Where: ANN:216-297; HL-ANN:190-276; QP:1119-1223
- Entry: a pin's card in the side panel
- Does: each card shows the number, author (*You (Studio)* or the homeowner's name), time (`MMM d · h:mm`), *· Resolved* when resolved, the note, indented replies, a reply input (Enter sends; max 2000) with a send button, *Mark resolved* / *Reopen*, and *Remove* on studio-authored pins only.
- Rules: the server refuses deleting a homeowner pin (403 *You can only remove your own pins*); *Pin not found* 404; *Reply cannot be empty* / *Reply is too long*; either side may resolve/reopen. Mutations invalidate the `projectSharedRenders` query.
- Data: `PATCH /api/homeowner-links/render-annotations { action:"reply", body }` / `{ action:"status", status }`; `DELETE { projectId, assetId, annotationId }`
- States: pending buttons disabled; error toasts *Couldn't send reply* · *Couldn't update pin* · *Couldn't remove pin*
- Words: *You (Studio)* · *· Resolved* · placeholder *Reply to the homeowner…* · aria *Send reply* · *Mark resolved* · *Reopen* · *Remove*
- Reachable: yes (gated as C-70)

### C-73 · Annotator empty state
- Where: ANN:209-214
- Entry: no pins and no draft
- Does: —
- Rules: —
- Data: —
- States: —
- Words: *No pins yet.* · *Tap the render to point something out, or wait for the homeowner's feedback.*
- Reachable: yes

### C-74 · Homeowner pins as seen by the studio
- Where: ANN:151-166, 219-235; A owns the portal side
- Entry: —
- Does: homeowner-authored pins render blue with the homeowner's `authorName`; the studio can reply and resolve but not remove them.
- Rules: —
- Data: same JSON (authorRole `homeowner`, `homeownerId` set)
- States: —
- Words: —
- Reachable: yes

### C-75 · What "Annotate" is not
- Where: ANN (whole file)
- Entry: —
- Does: pins + text threads only — no drawing tools, no colours, no arrows/shapes, no free text on the image, no undo, no export of the annotated image, no save-as-file. "Annotate" in 1.0 means "start a pin conversation with the homeowner".
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-76 · The annotator's second home
- Where: ANN:10-11 (comment); PROJ:1134-1194 (Files & Docs share toggle)
- Entry: the project's Files & Docs feedback panel (A owns that tab)
- Does: the same component is opened from the project's file list for any shared render.
- Rules: —
- Data: —
- States: —
- Words: PROJ toast *"{file}" shared to the homeowner portal — visible in Documents and Renders* (PROJ:1194)
- Reachable: yes (A)

---

## F · Save, share, export

### C-80 · Save to project (see C-36)
- Where: VZ:4061-4084
- Entry: Surfaces & Materials panel
- Does: see C-36.
- Rules: —
- Data: —
- States: —
- Words: *Save to project* · *Renders persist to this project.* · *Temp mode — closing wipes the render.* · *Temp mode — close this and your render is gone.* · title *Locked once render starts*
- Reachable: yes

### C-81 · Auto-file to the project's Files › Renders
- Where: VZ:2805-2818; AF:12-67; `src/lib/queries/project-renders.ts:12-19`; TED:84-90, 138-159
- Entry: automatic for project-bound renders
- Does: one `project_files` record per variant (`POST /api/project-files/records { projectId, folder:"Renders", fileName, fileType:"document", storagePath: the public URL }`); the project page counts them (`useProjectRenders` = files whose folder starts with "render") for the Photo Renders entry dialog: *Open Visualizer with {n} past render{s}* · *Filed in Renders on this project*.
- Rules: best effort (errors logged); lead-bound and session renders are NOT auto-filed (`projectId` only); the entry dialog cannot open a specific past render — it just opens the tool with the project (TED:84-90 comment).
- Data: `project_files` (E)
- States: —
- Words: as above
- Reachable: yes

### C-82 · The material list "for quoting" — no quote wiring
- Where: `VariantResult.materials` (VZ:275); no import of any quote module in VZ; grep of `quote` in VZ → none
- Entry: —
- Does: the Changes list (C-63) is the only consumer of the material changes; nothing sends materials to a quote, a price book or the digitizer.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-83 · Share — the public link
- Where: VZ:1856-1881, 5601-5610, 5682, 5872-5878; SHARE:6-92; SHD:14-105
- Entry: *Share* in the View dialog
- Does: `POST /api/renders/share { variantImageUrl, originalImageUrl (the compare's left image or null), roomName, style (the rail's current style, not the job's), materials }` → the server snapshots studio branding (logo, primary colour, company name, tagline, address; legacy `settings.client_portal` fallback), the creator's email/phone, `countryCode`, mints a 16-char token, `expires_at = now + 7 days`, inserts `render_share_links { studio_id, token, snapshot, expires_at, created_by }` and returns `{ shareUrl: "/renders/{token}", token, expiresAt }`. The client opens `ShareDialog`.
- Rules: `variantImageUrl` required (400 *Missing variant image URL*); failure → toast *Could not create share link*; the snapshot's `style` defaults to *Modern* when empty (SHARE:53) — so a None-style render is labelled Modern on the public page; a data-URL variant is stored inline in the snapshot (no upload).
- Data: `render_share_links` (E); the public page `/renders/[token]` (A)
- States: *Sharing...*
- Words: dialog *Share {room} — AI Render* · *Show QR Code* / *Hide QR Code* (a placeholder box, SHD:59-67: *Scan to open on customer's device*) · *Share via WhatsApp* (opens `wa.me/?text={title}: {url}`) · read-only URL + copy button (check icon for 2 s) · *Link expires in 7 days*
- Reachable: yes

### C-84 · Share to Portal
- Where: VZ:1883-1956 (flow), 5011-5020 (toolbar), 4818-4820 (phone ⋯), 5616-5626 (dialog), 5689-5693 (dialog ⋯), 5855 (relight panel); HL-LINK, HL-SHARE, `src/app/api/identity/members/me/route.ts`
- Entry: any of the five buttons; only with a `projectId` AND the studio flag `tools/homeowner-portal`
- Does: a data-URL image is first uploaded to `renders` at `{studio}/{entity}/shared/{uuid}.png` (upload failure falls back to sharing the data URL inline); `GET /api/homeowner-links/active-link?projectId=` → the first active homeowner link; `GET /api/identity/members/me` → `sharedBy`; `POST /api/homeowner-links/share-render { projectId, projectLinkId, title:"{room} - {suffix|style|Render}", url, thumbnailUrl:url, sharedBy }` → a `homeowner_shared_assets` row (`asset_type:"render"`); idempotent on (link, url) → `{ alreadyShared:true }` still toasts success.
- Rules: no active link → toast *No homeowner linked to this project*; link lookup / insert failure → *Failed to share to portal*; other errors → *Failed to share*; success → *Shared to homeowner portal*. Relight shares use the suffix *Relit*.
- Data: `homeowner_shared_assets` (E); the portal shows it under Design/Renders (A)
- States: buttons show *Sharing…* and disable while in flight
- Words: toolbar title *Share the current image to the homeowner portal* / *Sharing…* · phone ⋯ *Share to portal* · dialog *Share to Portal*
- Reachable: behind flag `tools/homeowner-portal` + project context

### C-85 · Download
- Where: VZ:1801-1842; buttons VZ:4993-4999, 4816, 5593-5600, 5681
- Entry: the left toolbar (current image), the phone ⋯ (*Download this image*), the View dialog (the viewed variant)
- Does: fetches the image, redraws it on a canvas, exports JPEG at quality 0.95 and triggers a download named `{room-name-lowercased-hyphenated}-{YYYY-MM-DD}.jpg` (fallback `render-…`).
- Rules: always JPG regardless of the source (PNG renders are re-encoded); the toolbar downloads the 1600 px editing base (a data URL), not the stored full-resolution file; **no watermark** for studio downloads — the OpenMaison mark (MARK:1-10, the white logo SVG inlined for a lambda) is the public trial's watermark only (`src/__tests__/trial-watermark.test.ts`, A/D); failures only log (VZ:1840).
- Data: —
- States: —
- Words: *Download* · *Download the current image* · *Download this image*
- Reachable: yes

### C-86 · Send to Chat
- Where: VZ:1796-1799, 1844-1851, 5644-5657, 5699-5703
- Entry: the View dialog, only when a linked chat exists
- Does: `sendMessage(linkedChat.id, "AI Render - {room}\n{imageUrl}")`; the button flips to *Sent* for 2 s.
- Rules: `linkedChat` = the chat whose `projectId` equals this project or lead id, else the FIRST chat in the app context (VZ:1797-1799) — a render can be posted into an unrelated chat when nothing matches; the message is plain text with the URL (a data URL in temp mode).
- Data: the app's chats store (A owns chats/copilot)
- States: *Sent* (disabled)
- Words: *Send to Chat* · *Sent* · message *AI Render - {room}*
- Reachable: yes

### C-87 · Copy / attach to moodboard / attach to chat
- Where: grep `moodboard`, `clipboard` in VZ → none; `src/app/api/copilot/moodboard/route.ts` mentions the visualizer (A)
- Entry: —
- Does: no "copy image", no "attach to moodboard" and no attachment picker in the editor; the only chat hook is C-86. The copilot's moodboard route is the copilot's own (A).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-88 · ID Buddy (mAIson Bot) hooks visible from the editor
- Where: `src/lib/agents/page-tool-map.ts:9, 35`; `src/lib/agents/tools.ts:419-460`; `src/lib/agents/executors.ts:2742-2790, 3158-3170`; `src/context/page-context.tsx:12`; `src/lib/agents/page-context-serializer.ts:18`
- Entry: the bot, not the editor
- Does: the page key `tools/ai-visualizer` unlocks two bot tools — `detect_surfaces` (*Analyze an uploaded room photo to identify redesignable surfaces (walls, floor, ceiling, cabinets, etc.). First step before generate_render.*) and `generate_render` (`surfaces[{label, material, description}]`, `style`), which runs its OWN prompt on `google/gemini-2.5-flash-image` and returns an image URL in the chat — it does not create a room, a job or a gallery entry; `open_tool_page("visualizer")` navigates to `/tools/ai-visualizer`. The page type *tools-ai-visualizer* exists for the serializer (*AI Visualizer*), but PAGE never sets a page context or view state, so the bot does not see the open room/version.
- Rules: gated by the studio's page visibility (`PAGE_TO_TOOLS`).
- Data: —
- States: bot status line *AI Visualiser agent — generating render...* (tools.ts:1622)
- Words: as above
- Reachable: yes (A owns the copilot)

### C-89 · Usage tracking
- Where: RENDER:29-33; `src/lib/usage/funnels.ts:18-25`
- Entry: —
- Does: only the surgical render route tracks `feature_opened` → *Opened* and `feature_succeeded` → *Render generated* (and `feature_failed`) for the funnel *AI Visualizer*; the other passes are not counted.
- Rules: —
- Data: usage events (E)
- States: —
- Words: —
- Reachable: internal

### C-90 · Who may use it
- Where: `src/lib/access-control.ts:108` (`"tools/ai-visualizer": ["owner","admin","id"]`); `src/components/leads/lead-detail-drawer.tsx:1832` (`guardedToolOpen`); `src/proxy.ts:344` (public `/renders/*` share pages)
- Entry: —
- Does: the tool page is for owners, admins and IDs; the platform config can hide the page per studio (`isPageEnabled`); the homeowner-portal actions need `tools/homeowner-portal` enabled.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

---

## G · Tools

### C-100 · The rail's markers switch and the pill tools (desktop)
- Where: VZ:5398-5450; RAIL:52-55, 91-107
- Entry: the rail
- Does: a header switch *Show surface markers* toggles `detectorsOn`; the footer pills *Style Transfer* · *Auto Furnish* · *Defurnish* open their drawer over the sections (pressing the active pill closes it). The drawer has a title and a close ×; closing Style Transfer returns to the Style section.
- Rules: pills disabled without an image or in sketch mode (title *Upload a room photo first*).
- Data: —
- States: active pill filled
- Words: *Show surface markers* · *Style Transfer* · *Auto Furnish* · *Defurnish* · drawer titles *Style Transfer* / *Auto Furnish* / *Empty the room — Defurnish* · *Close*
- Reachable: yes

### C-101 · The tile grid's Tools row (mobile Controls sheet)
- Where: VZ:4561-4584; entry buttons VZ:416-428, AFC:43-55
- Entry: the mobile Controls sheet (railTiles)
- Does: *Tools* rule, then *Hide markers* / *Show markers*, *Empty the room — Defurnish*, *Auto Furnish*.
- Rules: the two entries are disabled without an image or in sketch mode.
- Data: —
- States: —
- Words: *Tools* · *Hide markers* / *Show markers* (titles *Hide markers* / *Show markers*) · *Empty the room — Defurnish* · *Auto Furnish*
- Reachable: yes (phones/tablets)

### C-102 · The phone Tools tray
- Where: VZ:5311-5330; MOB:341-363
- Entry: the dock's *Tools*
- Does: six tiles — *Empty the room* (opens the Defurnish panel in the sheet), *Auto furnish* (opens the Auto Furnish panel in the sheet), *Style transfer* (sheet at the Style Transfer panel), *Finishing note* (sheet at Finishing), *Select area* / *Selecting…* (toggles the lasso; hint *Draw around items the detector missed*), *Hide markers* / *Show markers*.
- Rules: the first two disabled without an image or in sketch mode; *Select area* disabled without an image.
- Data: —
- States: active tiles highlighted (Style transfer = a reference attached; Finishing = a note present)
- Words: as above · tray label *Tools*
- Reachable: yes (D owns the shell)

### C-103 · Defurnish panel — see C-15
- Where: VZ:4591-4640
- Entry: C-15
- Does: see C-15.
- Rules: —
- Data: —
- States: —
- Words: see C-15
- Reachable: yes

### C-104 · Auto Furnish panel
- Where: AFC:57-196; data AFP:45-105 (room programs), AFP:182-186 (densities)
- Entry: C-16
- Does: intro; the scan note; *What room is it?* chips (`ROOM_PROGRAMS`: *Living room* · *Bedroom* · *Kids' bedroom* · *Dining room* · *Kitchen* · … — the list continues in AFP beyond line 105, D owns the data); *How much furniture* — *Minimal* / *Balanced* / *Fully furnished* with the hint of the selected one; *Quality* — *Fast* (title *Quicker, lower cost*) / *High quality* (title *Slower, best quality*); a preview box *Will place ({n})* listing the resolved pieces and *Will never touch* listing the program's preserve list; *Leave out* (placeholder *e.g. no TV, no rug*); *Extra direction* (placeholder *e.g. seating for six, kid-friendly, leave the window wall clear*, note *Applies to this render only. It cannot override the rules above — architecture, doors and camera stay locked.*); the style line; the error block; a status line.
- Rules: defaults `living · balanced · fast` (AFC:35-41); the style comes from the Style tile (not duplicated).
- Data: —
- States: status *Reading the room…* / *Furnishing…* / *Hit Auto Furnish below to render.*
- Words: *Furnishes an empty room. The architecture, camera and framing stay put — only furniture is added, plus the floor, wall and door finishes if your style calls for it.* · density hints *Essentials only — airy, staged-to-sell* / *Essentials plus a few extras — lived-in* / *Complete scheme with decor and styling* · *Style: {style} — change it in the Style tile.* / *No style selected — the AI will choose one suited to the room. Pick one in the Style tile to control it.*
- Reachable: yes (desktop); see C-16 for phones

### C-105 · Style Transfer panel
- Where: VZ:4043-4057 (body + hints); STC:133-442; labels STP:86-109
- Entry: the rail pill *Style Transfer* / the Style tile's *Style Transfer* tile (VZ:4517-4525) / phone Style tray *Style transfer* chip
- Does: intro; a dashed upload box *Upload a style reference* (*A magazine shot, moodboard or past project*; JPG/PNG/WebP, multiple); up to 3 references in a grid with a remove ×; a *Role* select per reference once there are ≥ 2 (*Overall vibe* · *Palette only* · *Materials only* · *Furniture only* · *Lighting only*); *Add another reference*; *Style strength* pills *Subtle* (*Light refresh — same room, better*) · *Balanced* (*Clearly the reference's style*) · *Full* (*Commit fully to the reference*); *Show advanced options* / *Hide advanced options* → *Style brief* with *Read the style* / *Re-read* / *Reading…* (`POST /api/render/style-analyze` → editable `styleName`, palette colour inputs, materials, furniture; *Clear brief*), *What transfers* pills (*Colour palette* · *Materials & finishes* · *Furniture style* · *Lighting mood* · *Decor & styling*), *Geometry* pills (*Locked* · *Structural* · *Flexible*) with the hint, a warning when furniture + Locked, and *Keep unchanged* (placeholder *e.g. the marble flooring, the client's green sofa*).
- Rules: defaults aspects palette + materials + lighting + decor, strength balanced, geometry structural (STC:72-79); references compressed to 896 px / 0.82; a changed reference set clears the brief; max 3 (*Up to 3 reference images.*); the reference is the only hard requirement (`styleTransferConfigured`). A new room photo clears the reference (VZ:2386).
- Data: session-only
- States: upload error banner · analyzing skeleton · analyze error banner
- Words: intro *Borrow the look of a photo instead of picking a preset. Your room's architecture, camera angle and framing stay put.* · with a reference: *Hit Generate to restyle the room from this reference.* or *Generate will use this reference, not the "{style}" preset — remove it to go back to the preset.* · *Reads the reference into explicit colours and materials the render follows literally. Optional, but it stops the AI copying the reference's room instead of its look.* · *No brief yet — Generate still works straight from the image.* · *Nothing selected — pick at least one before generating.* / *Anything not selected stays exactly as it is in your photo.* · *Furniture transfer with Locked geometry can only re-upholster what's there. Use Structural or Flexible to swap pieces.* · errors *That image couldn't be read — re-save it as a JPG or PNG.* · *Couldn't read that file.* · *Couldn't process that image.* · *Couldn't read that reference.* · tile value *{n} image{s} · {brief name}* / *None*
- Reachable: yes

### C-106 · Selection tool — lasso re-detect of missed items
- Where: VZ:1311-1317, 1604-1615 (Esc), 1989-2123 (`runRegionDetect`), 5021-5027 (toolbar), 5211-5221 (overlay), 5318/5326 (phone tray); OVL:43-112
- Entry: the toolbar lasso (title *Selection tool — draw a box to detect missed items* / *Exit selection tool (Esc)*), the phone Tools tray *Select area*
- Does: draw freehand around missed items; on release the path's bounding box (+5 % padding) is cropped from the image and posted to `/api/render/detect`; found furniture/surfaces are remapped to image coordinates, deduplicated against existing items (position < 6 %, or same type within 18 %; surfaces by normalized label containment) and appended; markers are switched on and the matching panel opens.
- Rules: area < 0.5 % of the image → *Draw a larger region*; the canvas gestures are disabled while the lasso owns the pointer; Escape exits.
- Data: —
- States: overlay busy *Detecting region…* (OVL:106); hint *Draw around items the detector missed*
- Words: toasts *Added {n} furniture + {n} surface{s}* · *No new items found in that region* · errors *Could not crop image* · *Detection failed* · *Could not detect region*
- Reachable: yes (also B for the overlay + canvas)

### C-107 · Detect Surfaces (re-run) and auto-detect on open
- Where: VZ:4094-4107 (button), 2524-2543 (stored-URL detect + auto-load once per room), 2125-2221 (`runDetection`, B)
- Entry: the Surfaces panel's *Detect Surfaces* button (only for a room whose image is stored but not yet loaded); otherwise automatic
- Does: loads the stored original, then detects; detection runs automatically on upload, on selecting a version and once per room on entry (`autoLoadedRoomsRef`).
- Rules: —
- Data: —
- States: *Detecting surfaces…* / *Detecting furniture…* (VZ:4088, 4345) · *Upload a room photo in the canvas to detect surfaces.* · *No surfaces detected. Try re-uploading.* · *No furniture detected.* · *Upload an image to detect furniture.* · canvas overlay *Analyzing image…* (VZ:603)
- Words: *Detect Surfaces*
- Reachable: yes (also B)

### C-108 · Sketch to render — see C-13 / C-14
- Where: VZ:430-500, 2896-2960
- Entry: —
- Does: see C-13.
- Rules: —
- Data: —
- States: —
- Words: see C-13
- Reachable: yes

### C-109 · Outpaint
- Where: `src/app/api/render/outpaint/route.ts`; the only caller `src/components/tools/spatial-view-experiment.tsx:223`, mounted only by `src/app/(main)/tools/visualizer-sandbox/page.tsx:16`
- Entry: none in the editor
- Does: extends the render's borders for the parallax viewer (experiment).
- Rules: —
- Data: —
- States: —
- Words: route error *Outpaint timed out — try again*
- Reachable: internal sandbox

### C-110 · Reangle (generated camera moves)
- Where: `src/app/api/render/reangle/route.ts`; caller `spatial-view-experiment.tsx:155, 260, 291`
- Entry: none in the editor
- Does: one call returns a montage of six camera moves (*Orbit ←* · *Orbit →* · *Step in* · *Step back* · *Look up* · *Look down*), sliced into stills with a compare slider (experiment header comment lines 3-16).
- Rules: —
- Data: —
- States: —
- Words: route errors *No image in AI response* · *Generation timed out — try again*
- Reachable: internal sandbox

### C-111 · Orbit video
- Where: `src/app/api/render/orbit-video/route.ts`; caller `spatial-view-experiment.tsx:110`
- Entry: none in the editor
- Does: a short orbit video of the render (experiment).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-112 · Depth (3D photo parallax)
- Where: `src/app/api/render/depth/route.ts`; caller `spatial-view-experiment.tsx:239`
- Entry: none in the editor
- Does: a depth map for the drag-to-orbit viewer (experiment).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-113 · Drift check / drift fix
- Where: DG:65-92, 154-169; routes `src/app/api/render/{drift-check,drift-fix}/route.ts`
- Entry: none directly — the guard (C-17)
- Does: see C-17; the sandboxes display the report (labels *Structure moved* · *Opening blocked* · *Physically impossible* · *Wrong scale* · *Unreachable* · *Changed something locked*, RD:51-58) but the editor never does.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal

### C-114 · Room analyze / room scan
- Where: VZ:3559-3570 (auto furnish), 3697-3704 (style transfer); routes `src/app/api/render/{room-analyze,room-scan}/route.ts`
- Entry: none directly — pre-flights
- Does: `room-analyze` → `notes` about openings / circulation / fixed services; `room-scan` → `report { state, existing[] }` (empty or not, what's there).
- Rules: advisory; failures ignored.
- Data: —
- States: —
- Words: route errors *Missing room photo* · *Room photo too large (max 10MB)*
- Reachable: internal

### C-115 · Segment
- Where: MC:167-185; `src/app/api/render/segment/route.ts`
- Entry: none directly — Route C (C-08)
- Does: masks per surface label.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal

### C-116 · Style analyze ("Read the style")
- Where: STC:199-218; `src/app/api/render/style-analyze/route.ts`
- Entry: the Style Transfer panel's advanced section (C-105)
- Does: `POST { references[{base64,mimeType}] }` → `{ spec }` → the editable brief.
- Rules: —
- Data: —
- States: —
- Words: route errors *Missing reference image* · *Reference image too large (max 10MB)*
- Reachable: yes

### C-117 · Sandbox — `/tools/visualizer-sandbox`
- Where: `src/app/(main)/tools/visualizer-sandbox/page.tsx:370-378, 379, 383`
- Entry: URL only (not in nav)
- Does: *AI Visualizer — Sandbox* — *Canvas-first: tap the room, panels open only when you need them. Wired to the real detect + render APIs; isolated from the live visualizer.*; hosts the Spatial View experiment (C-109…112); its own surfaces/furniture/defurnish/sketch flow against the same routes.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-118 · Sandbox — `/tools/auto-furnish-sandbox`
- Where: `…/auto-furnish-sandbox/page.tsx:21, 27-33, 357-358`
- Entry: URL only
- Does: *Auto Furnish Sandbox* — *Upload an empty room, say what it is and pick a style — the AI furnishes it. Benchmarks several models on the identical prompt.*; shows per-model `$` estimates and drift reports; catalogue picks with prices.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox (marked "Throwaway")

### C-119 · Sandbox — `/tools/style-transfer-sandbox`
- Where: `…/style-transfer-sandbox/page.tsx:318-319, 407-408`
- Entry: URL only
- Does: *Style Transfer Sandbox* — *Upload a room, attach reference images, read the style into an editable brief, then render. Only "Generate" spends credits.*; model roster with costs.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-120 · Sandbox — `/tools/relight-sandbox`
- Where: `…/relight-sandbox/page.tsx:255, 249`
- Entry: URL only
- Does: *Relighting Sandbox* — *Sliders update the live preview instantly and use ZERO credits. Only "Relight" generates a real render.*; an older preset list (Cool White Office, Ambient Evening…).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-121 · Sandbox — `/tools/detect-sandbox`
- Where: `…/detect-sandbox/page.tsx:3-5, 202`; route `/api/render/detect-sandbox`
- Entry: URL only
- Does: *Detector Sandbox* — benchmarks the detector across models and centre-point vs bounding-box prompts.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-122 · Sandbox — `/tools/floorplan-3d-sandbox`
- Where: `…/floorplan-3d-sandbox/page.tsx:139-140, 789-790`
- Entry: URL only
- Does: *Floor Plan → 3D Sandbox* (deskew + 3D generation); not part of the visualizer.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-123 · Sandbox — `/tools/quote-template-sandbox`
- Where: `…/quote-template-sandbox/page.tsx:187-224, 49-50`
- Entry: URL only; redirects non-owners to `/tools`
- Does: *Quote Template Sandbox* — not a visualizer surface (quote designer dependencies check).
- Rules: owner-only
- Data: —
- States: —
- Words: —
- Reachable: internal sandbox

### C-124 · Tool entry dialog — "Photo Renders" from a project
- Where: TED:30-51, 65-90, 94-196; PROJ:668-669, 1720-1731, 1793-1795, 4684-4694
- Entry: the project header's *Photo Renders* button (`lg+`, tooltip *Generate before/after photo renders to show the client what the space will look like.*) or the header ⋯ menu item *Photo Renders*
- Does: a dialog titled *Photo Renders* whose description depends on the count of files in the project's Renders folder: *Pick up where you left off — {n} existing render{s} on this project — or start fresh.* or *Generate before/after renders to show the client what their space will look like.*; while loading *Checking for existing renders…*; with past renders a row *Open Visualizer with {n} past render{s}* / *Filed in Renders on this project*; always a dashed row *Generate a new render* / *Project context is pre-filled — no need to pick it again.*; *Cancel*. Both rows navigate to `/tools/ai-visualizer?projectId={id}[&leadId={leadId}]`.
- Rules: the same dialog serves *Plan the Space (3D)* (`/tools/floor-plan`).
- Data: —
- States: —
- Words: as above
- Reachable: yes

---

## H · Keyboard, focus mode, exits

### C-130 · Keyboard shortcuts
- Where: VZ:1604-1615 (Escape exits the lasso), VZ:4270-4274 / 4412-4415 (Enter commits, Escape cancels *Add surface* / *Add furniture*), VZ:4859 (Enter / Escape on the room rename), ANN:260 (Enter sends a reply), PAGE:456 (Enter confirms a name), MOB:492 (Enter / Escape on the phone rename); dialogs close on Esc via Radix
- Entry: —
- Does: there are no global shortcuts (no G for generate, no arrows between versions, no number keys). Canvas gestures: wheel zoom, pinch, double-tap to fit (`use-canvas-gestures.ts:17-19`, B).
- Rules: —
- Data: —
- States: —
- Words: title *Exit selection tool (Esc)*
- Reachable: yes

### C-131 · Back / close
- Where: VZ:4834-4843 (desktop top-bar arrow, title *Back*), VZ:4805 + MOB:100-104 (phone top bar, aria *Back*); PAGE:217, 106-109 (`onBack` → `setActive(null)`; the breadcrumb's back does the same); PROJ:4042 (no `onBack` in the project tab)
- Entry: —
- Does: leaves the editor for the landing (or, in a project's Render tab, there is no back — the tab strip is the exit). No prompt, no save step.
- Rules: the Back button only renders when `onBack` is provided.
- Data: —
- States: —
- Words: *Back*
- Reachable: yes

### C-132 · Focus mode
- Where: PAGE:111-120; `src/context/focus-mode-context.tsx:5-16`; `src/components/layout/topbar.tsx:164`
- Entry: opening any design on the landing below `lg`
- Does: hides the app topbar and bottom nav while the editor is open; the phone top bar (Back · room · versions · ⋯) owns the screen; restored on close/unmount.
- Rules: desktop unaffected; the project's Render tab relies on its own SecondaryPageHeader instead (PAGE:115).
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-133 · Unsaved-work warnings
- Where: grep `beforeunload` in VZ / PAGE → none
- Entry: —
- Does: none. Leaving mid-render silently loses the pass (C-34); leaving loses all session-only state (C-50). The only warning is temp mode's banner (C-36).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-134 · Confirm dialogs
- Where: VZ:2290 (`window.confirm`), VZ:3203-3245 (no confirm), PAGE:468-481, 93-94
- Entry: —
- Does: **Delete room** → native `confirm("Delete this room and all its renders?")` (the landing's comment notes native prompts look wrong on iOS / are blocked in installed PWAs — the editor still uses one); **Delete a version** → none; **Delete a design** (landing) → *Delete "{name}"?* — *All its renders are deleted too. This can't be undone.* / *Cancel* / *Delete*; **Delete a folder** → *Delete folder "{name}"?* — *Its renders move to Unfiled.*; **Discard** — no such action exists.
- Rules: —
- Data: —
- States: —
- Words: as above
- Reachable: yes

### C-135 · What the page restores on return
- Where: PAGE:209-221 (key remount), WS:52-55 (`staleTime` 30 s), VZ:1507-1592, 2534-2543
- Entry: —
- Does: closing the editor returns to the landing (view, folder, search state kept in memory for the session); re-opening a design remounts the editor from scratch — rooms + completed jobs reload, the first (or deep-linked) room is selected, its stored photo is loaded and detected once, surfaces all *None*, style *None*, gallery labels from `render_jobs.style`. The landing's *Continue* row and card meta come from the workspace query (refetched after 30 s).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes

### C-136 · Ways into the editor
- Where: PAGE:52-53, 83-87 (deep links); PAGE:120-140 (landing cards, pickers, *New design*); PROJ:4039-4044 (Render tab); TED (C-124); `src/components/leads/lead-detail-drawer.tsx:1832` (*Open AI Visualizer* → `/tools/ai-visualizer?leadId={id}`); nav entries `src/components/layout/app-sidebar.tsx:22`, `topbar.tsx:25`, `bottom-nav.tsx:36` (*AI Visualizer*); coach mark `src/components/ui/page-coach-marks.tsx:87-92`
- Entry: —
- Does: `?projectId=` / `?leadId=` open the editor immediately (breadcrumb *Render*); the landing's *Open design* and a room card open with `initialRoomId`; the lead drawer's *Open AI Visualizer*; the project header's *Photo Renders*; the project's *Renders* tab.
- Rules: the coach mark on first visit: *AI room renders* — *Upload a room photo, detect surfaces, assign new materials, and generate a photorealistic render in seconds.*
- Data: —
- States: —
- Words: as above
- Reachable: yes

### C-137 · The landing (designs, sessions, folders) — recorded here because no reader owns it
- Where: PAGE:263-481; LAND; WS:50-231
- Entry: `/tools/ai-visualizer`
- Does: header *AI Visualizer* — *Every render in one place — start fresh, or pick up a lead or project.* with *New design* (creates a session *Design · {Mon d}* and opens it); first-run hero when the studio has nothing (*Turn a room photo into a finished design, in minutes.* · *Show clients what their space could look like before a single tile is ordered.* · steps *Upload a room photo* / *Tap a surface, pick a finish* / *Generate and share* · *New design* · *Start from a lead*); otherwise the Start strip (*Blank design* — *Upload any room photo and start* · *From a lead* — *Renders save to the lead's file* · *From a project* — *Auto-filed to the project's Renders*), view chips *All* · *Leads* · *Projects* · *Personal* with counts, search *Search renders…*, folder chips under Personal (*All personal* · folders · *Unfiled* · *New folder* · *Delete folder*), a *Continue* row (*most recently updated*, when > 4 designs), sections *Projects & Leads* / *Projects* / *Leads* / *Personal*, cards with a kind chip (*Project* / *Lead* / *Personal*), *{n} render{s}*, *{n} room{s} · {rel time}*, a ⋯ menu (*Rename* / *Delete*) on Personal cards, *Select* / *Done* + *Move {n}* into a folder or *Unfiled*; drilled-in design view (*All renders* back, *Open design*, *Rename*, room cards *pick one to jump straight to it*, *No rooms yet — open the design and upload a room photo.*); entity pickers *Start from a lead* / *Start from a project* (*Search leads…* / *Search projects…*, *No leads match.* / *No projects match.*).
- Rules: project/lead designs hide until a room has a photo or a render (WS:117-120); sessions always show; leads exclude INACTIVE (PAGE:60-63); deleting a session deletes its rooms' jobs and rows (WS:212-231) but not their Storage files.
- Data: `studios.settings.visualizerWorkspace { folders[{id,name}], sessions[{id,name,folderId,roomIds[],createdAt,updatedAt}] }` (WSR)
- States: skeleton · error *Couldn't load your renders right now.* + *Try again* · empty rows *No project renders yet.* / *No lead renders yet.* / *No personal designs yet.* / *Nothing in this folder yet.* · *No renders match "{q}".* + *Clear search* · card placeholder *No photo yet*
- Words: toasts *Couldn't start a design* · *Design deleted* · *Delete failed* · *Couldn't delete folder* · *Rename failed* · *Couldn't create folder* · *Moved to {folder|Unfiled}* · *Couldn't move*; dialogs *Rename design* / *New folder* (*Design name* / *Folder name*, *Cancel*, *Rename* / *Create*)
- Reachable: yes

### C-138 · Room management from the editor (exits at room level)
- Where: VZ:2226-2362, 4851-4931; MOB:459-524 (also B)
- Entry: the room tabs (desktop) / the *Rooms* sheet (phone)
- Does: *Upload new room* (title *Pick a photo — a new room is created automatically*, auto-named *Room {n}*), the active tab's ⋯ *Room options* → *Rename room* (inline input, Enter/Escape) / *Delete room* (C-134); phone sheet *Rooms* with *{n} render{s}* per room, *Rename* / *Delete room*, *Upload photo* / *Take photo*, empty *No rooms yet. Add a photo to start.*; canvas empty state *Start with a room photo* — *Upload a photo of the room you want to visualise — we'll detect the surfaces and furniture automatically.* + *Upload new room* / *Take photo*.
- Rules: rename failure reverts and toasts *Couldn't rename the room*; deleting the active room selects the first remaining.
- Data: `project_rooms`
- States: —
- Words: as above
- Reachable: yes

---

## I · Errors and resilience

### C-150 · Every toast / error string in this slice (index)
- Where: as cited
- Entry: —
- Does: **toasts** — *Render deleted* (VZ:3244) · *Editing the original* / *Editing this version* (3121) · *Couldn't load that version* — *Please try again.* (3124) · *Relit* — *Saved to the gallery — adjust it live in the panel.* (3057) · *Couldn't save the relit render* — *Please try again.* (2975) · *Auto-fixed placement on {n} render(s)* (3531) · *Render interrupted* — *The app was in the background too long. Keep it open while rendering and try again.* (3966) · *Shared to homeowner portal* / *No homeowner linked to this project* / *Failed to share to portal* / *Failed to share* (1914-1952) · *Could not create share link* (1877) · *Saved — now editing this version* / *Using this version — edit anything else from the controls.* (5867) · *Couldn't rename the room* (2275) · *File too large* — *Maximum size is 10MB.* (2366) · *Unsupported image* — *{reason}* / *Please try a JPG, PNG, or WebP.* (2377) · *File too large. Maximum size is 10MB.* (2596, custom material) · *Could not load library material* (2680) · *Could not load that image* (4336, furniture reference) · lasso toasts (C-106) · annotator toasts (C-71/72) · landing toasts (C-137). **Inline errors** — C-23 per pass; STC upload/analyze banners (C-105); AFC error block; sketch section error.
- Rules: —
- Data: —
- States: —
- Words: as listed
- Reachable: —

### C-151 · "Best results" and other hints
- Where: VZ:625-627 (also B), VZ:1133/1140/4175/4195 (marker tooltips)
- Entry: the empty upload zone
- Does: *Upload a room photo* · *JPG, PNG, WebP, HEIC · max 10MB* · *Best results on straight-on shots or clean 3D renders.* · buttons *Upload Image* / *Take photo* (camera only on hover-none devices).
- Rules: —
- Data: —
- States: —
- Words: as above
- Reachable: yes

### C-152 · Retry paths
- Where: VZ (no auto-retry anywhere); PAGE:275-278
- Entry: —
- Does: no automatic retry on any pass; the user presses the primary button again (the error clears on press). The landing offers *Try again* for a failed workspace load. Route-side, `guardRender` retries the FIX up to twice (C-17) but never the render itself.
- Rules: —
- Data: —
- States: —
- Words: *Try again*
- Reachable: yes

### C-153 · Route error passthrough
- Where: every pass: `data.error || \`HTTP ${res.status}\`` (e.g. VZ:2864, 2924, 3045, 3617, 3739, 3825)
- Entry: —
- Does: the route's `error` string is shown verbatim under the button / in the panel; when the body is not JSON the message is *HTTP {status}* (e.g. *HTTP 413* for an oversized body, *HTTP 504* for a gateway timeout).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### C-154 · Body-size safeguards
- Where: VZ:3090-3094 (editing base ≤ 1600 px), VZ:2614-2617 (material swatch ≤ 1024 px), STC:34-35 (references 896 px), DG:25-29 (drift 1024 / 1280 px), VZ:2135 (detection uses `compressBase64` default 2048 px / 0.95, `src/lib/compress-image.ts:5-6`)
- Entry: —
- Does: images are downscaled client-side before every call to stay under the platform body limit; the comment at VZ:3090-3092 records that oversized FLUX PNGs produced *Generation failed*.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: internal

### C-155 · The "Auto-saved" indicator on control panels
- Where: CS:12-49; VZ:4644-4671 (`autosaved={false}` for Defurnish and Auto Furnish)
- Entry: the mobile Controls sheet's focused panels
- Does: each panel header has a *Back* arrow and, for the state panels, a green *Auto-saved* dot (edits mutate lifted state directly; nothing is written to the server) — the Defurnish and Auto Furnish panels omit it.
- Rules: —
- Data: —
- States: —
- Words: *Auto-saved* · aria *Back*
- Reachable: yes

---

## Uncertain / not verified

1. **Auto Furnish on phones** — by reading, no control below `lg` calls `handleAutoFurnish`: the phone Generate bar and the mobile sheet footer call `handleGenerate`, the rail's `runPrimaryAction` is desktop-only, and `AutoFurnishControls` has no button (its status line says *Hit Auto Furnish below to render.*). Not run to confirm.
2. **Variant count on desktop** — no desktop control sets `variantCount`; the `Generate · {n}` label only appears if the count was changed through the mobile sheet/bar at a narrower width. Not run to confirm.
3. **`SketchRenderSection` on desktop** — it is only mounted inside the mobile Controls sheet (VZ:5497-5506); on desktop the *Not a sketch? Use as-is* link and the sketch quality preset appear unreachable (the rail primary still runs *Render from sketch* with the default *fast* preset). Not run to confirm.
4. **In-canvas sketch compare** (C-54) — dead by reading (`versions` never filled).
5. Whether the `renders` Storage bucket is public (the code builds public URLs and shares them to homeowners; comments say "public `renders` bucket") — not checked against Supabase config.
6. Whether copilot-mirrored renders (`/api/copilot/render` writes `render_jobs` + `project_files`) appear in the editor's gallery depends on whether they carry a `room_id` — not read (A).
7. The exact `/api/render` body limit and the `HTTP 413` path — inferred from comments only.
8. `ShareDialog`'s QR code is a placeholder box by the code's own comment (SHD:59-60) — it never renders a scannable code.
9. The Send-to-Chat fallback to `chats[0]` when no chat matches the project/lead (VZ:1799) — behaviour verified by reading, product intent unknown.
10. Whether `homeowner_shared_assets` rows created from the project's Files & Docs share (same URL) make the *Annotate* button appear inside the editor — by reading yes (URL match), not run.

## Hand-offs

- **A** — the public share page `/renders/[token]` (what the homeowner sees from the C-83 snapshot, incl. the *Modern* default style), the copilot's `/api/copilot/render` + moodboard routes, the project's *Renders* tab (`RenderTabWrapper`, PROJ:4039-4044) and the Files & Docs share/annotate panel (PROJ:1134-1194), the homeowner-portal side of pins, the chats store behind Send to Chat.
- **B** — rooms, upload (`processRoomFile`, `cropToBucketAspect`, HEIC normalise), detection (`runDetection`), surfaces & materials (incl. the Save-to-project switch's home in that panel), furniture rows, the style grid, lighting knobs (`RelightControls`), the rail tiles and the canvas gestures/overlays; the sketch classification (`imageType`).
- **D** — the phone shell chrome (trays, dock, sheets), every prompt text and each `/api/render/*` route's rules and models, the catalogue data (`ROOM_PROGRAMS` beyond AFP:105, `STYLE_ASPECTS`, the Gush catalogues), the trial's quota/watermark lambda.
- **E** — tables and columns: `render_jobs` (id · studio_id · room_id · project_id · lead_id · model · status · style · variants_json · completed_at · created_at), `project_rooms`, `render_share_links` (studio_id · token · snapshot · expires_at · created_by), `homeowner_project_links` (is_active), `homeowner_shared_assets` (project_link_id · asset_type · title · url · thumbnail_url · shared_by · metadata.annotations), `project_files` (folder *Renders*), `studios.settings.visualizerWorkspace`, `studio_members`, the `renders` Storage bucket layout (C-35), usage events.
- **F** — 2.0 today: what of Files (the lead's Files tab), the Activity feed, the portal (`/confirm`, `/sign`) and the notifications could host renders, shares and pins.
