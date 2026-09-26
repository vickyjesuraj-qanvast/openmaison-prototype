# AI Visualizer — 1.0 → 2.0 parity audit (2026-09-25)

**Written for:** the owner, who handed this module over with the calls; and the 1.0 developers, as the map of what the AI Visualizer became in 2.0.

**The brief** (owner, 2026-09-25): "Now let's work on the AI Visualizer module. I want you to go in depth and audit the AI visualizer in 1.0 in the qanvast-id-tool repo and build it in 2.0 prototype. Please go through all the touchpoint in 1.0 and build it in the 2.0 with our design principles, layouts, visual consistency, ds components, transitions, animations, touchpoints, and intuitiveness. Studios really love this feature and i want it to be the best intuitive design in the 2.0. … You take the best recommendation calls yourself and built it." Every call in §6 is therefore set *As recommended* (§9) and built in the rounds of §7. 2.0 has no mock for this module: every surface is built on the house pieces (REG-614's rule) and logged as `user-directed · invented UI + copy`.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469` (branch `integ/security-non-qanvast`). Five readers read the code whole; their inventories sit beside this file under `ai-visualizer-1.0-inventory/` and are the references cited in the rows: **A** the ways in, the landing, the project, sharing, the portal, mAIson and the trial (A-01…H-13 — A's rows carry section letters: A · B · C · D · E · F · G · H) · **B** the editor's model and modes (B-01…B-131) · **C** the render flow, versions, compare, sharing, tools and exits (C-01…C-155) · **D** the phone shell, the engine's rules and the routes · **E** the data model. **F** (2.0 today) is §0.5 below.
- **2.0** = `openmaison-prototype` on `main` (`a0dc393`). Before this module 2.0 had two traces only: the Tools tile *AI Visualizer* (coming soon, REG-422) and the lead's quick link *AI Visualiser* (coming soon, REG-249).

## 0.2 Scope rules

- **In scope:** everything a studio does with a room photo — the ways in, the gallery of designs, rooms, upload, detection, surfaces and materials, furniture, style, lighting, the tools (empty the room, furnish, style transfer, sketch to photo, the note), generate, versions, compare, download, sharing with the client, pins, the studio's material library, and the touchpoints into the lead (Files, Activity, notifications, quotes, the quick link) and the data behind them.
- **Later modules (their own audits):** Projects (1.0's *Photo Renders*, the project's Renders tab and Key Files, *Share to Portal* — 2.0 has no project record yet), the homeowner portal's Design › Renders (likes, comments, pins inside the portal), Maison AI's own `detect_surfaces` / `generate_render` tools, the live-meeting Co-Pilot's mood boards and renders.
- **Not for a prototype (Platform):** the image models (Gemini through OpenRouter), segmentation masks, the drift guard, storage buckets, wake lock, per-route rate limits and the usage funnel. 2.0 keeps a stand-in for each (§5).
- **Excluded:** the public marketing trial (`/try`, `/try-visualizer`) — it sells the product to visitors; the studio app is what 2.0 rebuilds.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | 1.0 says one thing and does another, or two 1.0 surfaces disagree; a call decides (§2). |
| **Later** | another module's internals (§0.2). |
| **Platform** | live infrastructure; 2.0 keeps a stand-in (§5). |
| **Dead** | code no 1.0 user can reach; not ported unless asked. |
| **Excluded** | out of 2.0 on purpose (§0.2). |
| **2.0 only** | no 1.0 counterpart; new in 2.0. |

Before this module every in-scope row was **Missing** (2.0 had no visualizer). The matrix's last column says what 2.0 builds.

## 0.4 How it was marked

The owner delegated every call (the brief above). The recommendations in §6 are the calls; §9 records them as *As recommended*. The build rounds are logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 against a test DB and banked under `design-source/verify/ai-visualizer/`.

## 0.5 What 2.0 had, and the pieces the build reuses (F)

| # | 2.0 today | Where |
|---|---|---|
| F-01 | Tools tile *AI Visualizer* — answers "Coming soon in OpenMaison 2.0" | `components/shell/tools-popover.tsx:20` (REG-422) |
| F-02 | Lead quick link *AI Visualiser* (British spelling) — coming soon | `components/leads/detail/quick-links.tsx:57`, handler `app/leads/[id]/overview.tsx:382` |
| F-03 | UAT step 1.06 expects the tile to say coming soon | `design-source/uat/story/ch1.json` |
| F-04 | An AI tool page on house pieces: setup · progress card · Recent · a record page · the WhatsApp send dialog | Quote X-Ray (`components/xray/*`, REG-529 · 636…642) |
| F-05 | An app-frame editor: fixed frame, top bar 56, canvas, side panes (drawers below 1200), `useHistory` undo / redo, first-visit hint, Undo on every remove | the quote template editor (`components/templates/editor/*`, REG-542 · 569) |
| F-06 | A photo viewer: header, zoom bar, prev / next, side panels | the lead's file viewer (`components/leads/files/file-viewer.tsx`) |
| F-07 | A gallery of a studio's library: cards or the listing table, a scope pill, search, folders, rename / duplicate / delete, the Deleted sheet | `LibraryGallery` (`components/company/templates/library-gallery.tsx`, REG-538 · 663…666) |
| F-08 | Folders any library can keep | `library_folders` + `components/om/folders/*` (REG-663…665) |
| F-09 | A client link outside the shell, branded with the kit | `/sign/[id]`, `/confirm/[quoteId]` (REG-534 · 591) |
| F-10 | Dialog (s 400 · m 600 · l 800 · xl 1200 · xxl fluid), Sheet (≤767), Drawer, ConfirmDialog, PortalMenu, Tooltip, Snackbar with Undo, Chips, ChoiceCard, StatTile, TextField, Dropzone, Tabs, SegmentedButton | `components/om/*`, `components/ds` |
| F-11 | The lead's Files (images as `lead_files` rows, folders), Activity derived from records, `lead_events`, notifications with rules and messages, Who sees leads (`canOpenLead`), the signed-in member (`sessionMemberId`) | `lib/leads/*`, `lib/notifications/*`, `lib/db/session.ts` |
| F-12 | The lead's style preference (`leads.style`, `STYLE_OPTIONS`) | `lib/leads/enums.ts:73` |
| F-13 | Price book items with names, categories, photos — what a quote line starts from | Company › Price book (REG-649…655) |
| F-14 | What 2.0 lacks and this module adds: a compare slider, a photo canvas with pan / zoom and markers, an image engine, a materials library, a render share page | — |

---

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · call |
|---|---|---|---|---|
| DEF-01 | **The tool** | *AI Visualizer* in every nav list; *AI Visualiser* only in mAIson's status line (A-01…A-04, A F-08); the project calls it *Photo Renders* (A-10). | *AI Visualizer* on the Tools tile, *AI Visualiser* on the lead's quick link (F-01, F-02). | **Mismatch** in both — **Q-01**: *AI Visualizer* everywhere. |
| DEF-02 | **A design** | One card on the landing. Three kinds: a project's rooms and a lead's rooms (derived by grouping `project_rooms`, never stored), or a *personal* design (a JSON *session* in `studios.settings.visualizerWorkspace`) (A B-01, A Vocabulary). | — | **Missing** — **Q-03**: a `visualizer_designs` row — one per lead, any number of personal ones. |
| DEF-03 | **A room** | A `project_rooms` row: a name and the uploaded photo (the *Original*) (B-03). | — | **Missing** — built with 1.0's table name (§4). |
| DEF-04 | **A version** | A variant inside a *job* (`render_jobs.variants_json[]`), numbered V1, V2… oldest first across every job; the upload is the *Original* (C-43, B-04). | — | **Missing** — built with 1.0's shape (§4). |
| DEF-05 | **The editing base** | The image the controls act on; after most passes it stays on the OLD image while the strip selects the new one (C-24, C-45). | — | **Mismatch** inside 1.0 — **Q-08**: what the canvas shows is what you edit. |
| DEF-06 | **A surface** | `{ label, x, y }` from the detector — a descriptive label ("black marble floor") and a dot; no region (B-01, H-04). Grouped into 13 structural groups (B-57). | — | **Missing** — 2.0 keeps the label, the dot and the groups and adds the **region** the engine changes (§5). |
| DEF-07 | **A material** | A stock catalogue item (136 generic + 310 Gush), a session custom swatch, or a studio-library swatch (`studio_materials`) (B-05, B-64, B-67). | — | **Missing** — **Q-18** · **Q-19**. |
| DEF-08 | **A render** | A model call; one button runs seven kinds of pass (C-01 Vocabulary). | — | **Platform** — **Q-05**: the curated engine (§5). |
| DEF-09 | **Sharing** | Three ways: a public 7-day link, *Share to Portal* (projects), *Send to Chat* (A E-01…E-10). | — | **Missing** — **Q-14**: one link, to the lead's client. |
| DEF-10 | **Annotate** | Pins with reply threads on a render shared to the portal — not drawing (C-75). | — | **Missing** — **Q-15**: pins on a version, shown on the share link. |
| DEF-11 | **Save to the lead** | Promised (*Renders save to the lead's file*, the onboarding script) and never done: a lead render writes only `render_jobs.lead_id` (A C-02). | — | **Mismatch** — **Q-13**. |

## 2. Mismatches — 1.0 disagrees with itself

| # | Topic | 1.0 says | 1.0 does | Call |
|---|---|---|---|---|
| MM-01 | Saving a lead's renders | The start tile: *Renders save to the lead's file* (A B-06). | No `lead_files` row, no Activity (A C-02). | Q-13 |
| MM-02 | Variants on desktop | *Generate · 3* exists (C-01). | No desktop control sets the count (B-106, C-04). | Q-09 |
| MM-03 | Auto Furnish on a phone | The Tools tray offers *Auto furnish* (C-102). | No phone control runs it (C-16, Uncertain 1). | Q-25 |
| MM-04 | What you edit after a render | The strip selects the new version. | The canvas keeps the old base for Generate / Restyle / Style transfer; Defurnish, Sketch and Relight adopt the new one (C-24). | Q-08 |
| MM-05 | Deleting | The landing avoids native prompts on purpose (A B-21). | A version deletes with no confirm and no undo; a room with a native `confirm` (C-48, C-134). | Q-11 |
| MM-06 | The share link's style | The render had no style. | The public page says *Modern* (C-83). | Q-14 |
| MM-07 | Send to Chat | The chat of this lead or project. | Falls back to the studio's first chat (C-86). | Q-14 |
| MM-08 | The consultation form | *Request a Consultation* on the public page. | Writes `render_consultation_requests`; nothing reads it (A E-07). | Q-16 |
| MM-09 | The material list "for quoting" | The PRD's output (A H-01). | Nothing reads it beyond the Changes popover (C-82). | Q-17 |
| MM-10 | The lighting copy | *…then hit Generate Render below.* | The button says *Generate* / *Relight* (C-12). | Q-22 |
| MM-11 | Surface markers | The switch says *Show surface markers*. | It hides furniture dots too (B-45). | Q-06 |
| MM-12 | Work in progress | *Auto-saved* on every panel (B-14). | Surfaces, picks, lighting, the note, labels and lineage are lost on reload (C-50). | Q-07 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory rows) · what 1.0 does · status · what 2.0 builds (the call) · round.

### 3.1 Ways in, the page and the way back

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VE-01 | Tools › AI Visualizer (A A-01…A-04) | Four nav lists; the landing at `/tools/ai-visualizer`. | Missing | The Tools tile opens **`/visualizer`** (desktop popover and the phone's Tools sheet). | R1 |
| VE-02 | The lead drawer's *Open AI Visualizer* (A A-09) | The concept step's CTA → `?leadId=`; flag-guarded toast. | Missing | The lead's quick link **AI Visualizer** opens the lead's design (made on first open) with `?from=` the tab it was pressed on (**Q-02**). | R1 |
| VE-03 | Deep links (A A-12) | `?projectId=` / `?leadId=`; the crumb reads *Render*. | Missing | Every design has its address `/visualizer/[designId]` (`?room=` picks a room); Back honours `?from=`. | R1 |
| VE-04 | The project's *Photo Renders* + entry dialog (A A-10, A-11), the Renders tab (A D-01, dead) | Opens the tool on the project. | Later | Projects module. | — |
| VE-05 | Coach mark (A A-14) | Anchor missing — never shows. | Dead | The editor's first-visit hint (the template editor's pattern, remembered per browser). | R2 |
| VE-06 | Page flag + access matrix (A A-06, A-07) | Owner · admin · id; a studio flag hides it. | Platform | Every member; Who sees leads decides which lead designs a member sees (**Q-24**). | R1 |
| VE-07 | Focus mode below lg (A A-13) | Hides the top bar and bottom nav. | Missing | The editor is a rail-less app frame at every width (the `(editor)` group). | R1 |
| VE-08 | Open in AI Visualizer on a lead file (A C-03) | Doc only. | Dead | **2.0 builds it** (**Q-31**): the file viewer's kebab and the Files grid's menu. | R3 |

### 3.2 The landing (designs)

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VL-01 | Header *AI Visualizer* + *New design* (A B-03) | Blank personal design, named *Design · Sep 25*. | Missing | L1 header; **New design ▾** — Blank design · From a lead · From a sample room. | R1 |
| VL-02 | First-run hero (A B-05) | Three steps, *New design* · *Start from a lead*. | Missing | The gallery's empty state with the three steps and the same two actions. | R1 |
| VL-03 | Start strip (A B-06) | Blank · From a lead · From a project. | Missing | New design ▾ carries them (projects Later); the sample rooms are a third way in (**Q-05**). | R1 |
| VL-04 | View chips All · Leads · Projects · Personal (A B-08) | Counts per kind. | Missing | The gallery's scope pill *Kind: All ▾* (REG-666's grammar) — Leads · Personal. | R1 |
| VL-05 | Search (A B-09) | Name or client. | Missing | The gallery's search (name, lead, room names). | R1 |
| VL-06 | Folders for personal designs (A B-10, B-20, B-22) | JSON folders; delete moves them to Unfiled. | Missing | The house folders (library `visualizer`), personal designs only (**Q-04**). | R1 |
| VL-07 | Continue row (A B-12) | 4 most recent when > 4 designs. | Missing | The gallery sorts by last edited; the cards say *Edited 2h ago* — no second row. | R1 |
| VL-08 | Design card + mosaic (A B-15) | Cover or 2–4 room mosaic, *{n} renders*, *{n} rooms · 2h ago*, ⋯ Rename / Delete. | Missing | The gallery card: the cover mosaic in the thumb band, the kind chip, the counts; kebab Open · Rename · Move · Duplicate · Delete. | R1 |
| VL-09 | Design detail (A B-16, B-17) | Rooms grid before the editor. | Missing | Not a separate page: the editor's room tabs are the rooms (one press fewer). | R1 |
| VL-10 | Select + Move (A B-14) | Personal only. | Missing | The gallery's selection + bulk bar (Move · Delete). | R1 |
| VL-11 | Delete a design (A B-21) | Hard delete; *This can't be undone.* | Missing | Soft delete with Undo; the Deleted sheet restores or deletes for good (REG-502's rule). | R1 |
| VL-12 | Hidden empty lead designs (A B-01) | A lead design with no photo never shows. | Missing | A lead's design shows once it has a room. | R1 |
| VL-13 | Workspace JSON, last writer wins (A B-24) | Read-modify-write of one blob. | Mismatch | Rows (§4). | R1 |

### 3.3 Rooms and upload

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VR-01 | Empty state + Upload new room + Take photo (B-25, B-26) | A photo makes a room *Room {n}*. | Missing | The canvas empty state: Dropzone *Upload a room photo* · *Take a photo* (touch) · *Use a sample room* · *From the lead's files* (**Q-31**). | R1 |
| VR-02 | Room tabs + ⋯ Rename / Delete (B-28…B-30) | Native confirm on delete. | Missing | Room tabs in the top bar (a sheet on the phone); rename in place; delete with Undo (**Q-11**). | R1 |
| VR-03 | Accepted files, 10 MB, HEIC (B-34) | HEIC converted. | Missing | JPG · PNG · WebP up to 10 MB, the house words; HEIC is Platform (the browser cannot read it without the converter) — the error says so. | R1 |
| VR-04 | Bucket crop + downscales (B-35) | For the model's aspect buckets. | Platform | The photo is scaled to 1600 on its long side for the engine; the stored copy is that scaled JPEG. | R1 |
| VR-05 | Change photo (B-38) | Only on the Original. | Missing | The same rule (renders keep their photo). | R1 |
| VR-06 | Auto-load + auto-detect a stored room (B-42) | Once per room per mount. | Missing | The room's detection is stored with it (**Q-07**) — nothing to re-run. | R1 |

### 3.4 Detection, markers, place and draw

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VD-01 | The detect call (B-39) | Surfaces + furniture with positions; sketch classification. | Platform | The curated reading (§5.2): sample rooms carry their surfaces and furniture; other photos get 1.0's own fallback set. | R1 |
| VD-02 | Failure fallback Walls · Floor · Ceiling (B-40) | Three centred dots. | Missing | The fallback for every unknown photo — placed where the photo's colour regions are, not at fixed points. | R1 |
| VD-03 | Markers — squares for surfaces, circles for furniture; panel-scoped (B-45…B-47) | 36 px hit areas; the switch mislabels (MM-11). | Missing | The same shapes and scoping; one toggle *Markers*; a selected surface lights its **region** on the photo (2.0 only). | R1 |
| VD-04 | Place mode (B-48…B-52) | Add surface / furniture then tap the photo. | Missing | Same, with the place banner and Cancel. | R2 |
| VD-05 | Lasso re-detect (B-44) | Draw around missed items → a detect call on the crop. | Platform | **Draw a surface** (2.0): the lasso draws the region itself and names it — the engine's regions need no model. | R2 |
| VD-06 | Remove from the list + pick-to-remove (B-53) | Forgets a detection; never changes the photo. | Missing | Same words; Undo. | R2 |
| VD-07 | Sketch classification (B-41) | A sketch must be rendered to a photo first. | Missing | The sample kitchen sketch reads as a sketch; *Render from sketch* is the primary; *Not a sketch? Use as it is*. | R2 |

### 3.5 Surfaces and materials

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VS-01 | Two-level list — 13 structural groups, identical labels ×N, bulk per group (B-57, B-58) | Header summary: a material, *Mixed*, *None*. | Missing | Same model and words. | R2 |
| VS-02 | Assign / None (B-59, B-60) | None = keep unchanged, sent as a preserve list. | Missing | Same. | R2 |
| VS-03 | The picker — search, None, Suggested, category chips, Recent, Upload, library, customs, brands (B-61, B-73) | Desktop grid and a phone sheet. | Missing | One picker (a rail panel; a sheet on the phone): search · None · *Suggested for {surface} · {style}* · Recent · Your library · categories · Gush Paints / Gush Enamel. | R2 |
| VS-04 | `suggestMaterials` + the category maps (B-62, B-63) | Hard category filter, palette proximity, affinities. | Missing | Ported as they are (`lib/visualizer/catalogue.ts`). | R2 |
| VS-05 | The stock catalogue — 136 generic + 310 Gush (B-64) | Hex swatches, finish, colour family, tags. | Missing | Ported whole (**Q-19**). | R2 |
| VS-06 | Custom material upload + *Save to studio library* (B-65, B-66) | Everyone saves by default. | Missing | Upload a swatch → the dialog (name, category, *Save to the studio's materials*) (**Q-18**). | R4 |
| VS-07 | Recent (B-20) | 12 per user, localStorage. | Missing | Same (`om.viz.recent`). | R2 |
| VS-08 | Masked composite for surface-only renders (B-71, C-08) | Segmentation masks, < 8 % rejected. | Platform | The engine only ever changes a surface's region (§5.3). | R1 |

### 3.6 Furniture

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VF-01 | Rows per group ×N, remove · replace · customize (B-78, B-82) | Keep is the silent default. | Missing | Same. | R2 |
| VF-02 | Replace — Quick pick presets, describe, reference photo (B-79, B-81) | 78 presets, style-ranked. | Missing | Same picker; the engine answers Replace honestly (**Q-21**). | R2 |
| VF-03 | Customize — finish tables by label, 12 colours, describe (B-80) | 15 finish tables. | Missing | Same chips; the engine recolours the piece (§5.3). | R2 |
| VF-04 | Add furniture with a category (B-50) | 8 categories. | Missing | Same. | R2 |

### 3.7 Style

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VT-01 | None + 25 styles with palettes (B-86, B-87) | Sets a name only. | Missing | Same list and words. | R2 |
| VT-02 | Style resets on a fresh photo / the Original (B-88) | No accidental makeover. | Missing | Same. | R2 |
| VT-03 | Homeowner palette preference (B-90) | Not present. | 2.0 only | **The lead's style** leads the list: *Kevin's style: Contemporary* → Modern (**Q-32**). | R2 |
| VT-04 | Style Transfer (C-105) | Up to 3 references, roles, strength, what transfers, geometry, keep list, *Read the style*. | Missing | Same controls; the engine reads each reference's palette (§5.4). | R2 |

### 3.8 Lighting

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VG-01 | Six presets with photos (B-94) | Daylight · Golden Hour · Warm Cozy Home · Blue Hour · Overcast · Directional Spotlight. | Missing | Same, with 1.0's photos. | R2 |
| VG-02 | Advanced sliders + word labels, fixtures, instruction (B-93, B-95, B-96) | Tri-state fixtures. | Missing | Same. | R2 |
| VG-03 | Relight pass + the live result panel (B-97, B-98, C-55) | Two steps: render, then live CSS tweaks, then *Use this version*. | Missing | **One step** (**Q-22**): the canvas previews the lighting live as the sliders move; Generate keeps it as a version. | R2 |

### 3.9 Tools

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VO-01 | Empty the room — Keep built-ins / Strip to shell, extra items (C-15) | Auto-adopted. | Missing | Same words; the engine where an empty plate exists (**Q-23**). | R2 |
| VO-02 | Auto Furnish — room programs, density, leave out, direction, the scan note (C-16, C-104) | Desktop only (MM-03). | Missing | Same controls on every width. | R2 |
| VO-03 | Sketch to photo — quality, use as-is (C-13, C-14) | Mobile-sheet only on desktop (C Uncertain 3). | Missing | On every width. | R2 |
| VO-04 | The prompt / Finishing note (B-102, B-103) | Outranks open panels. | Missing | *Note for the render* — the engine reads colours, styles and moods from it and says when it can't (§5.5). | R2 |
| VO-05 | Fast / High quality (C-05) | Two models. | Platform | Kept: High quality renders at full size and takes a little longer. | R2 |
| VO-06 | Drift guard (C-17) | Verify + repair. | Platform | Not needed — the engine never moves geometry. | — |
| VO-07 | Outpaint · Reangle · Orbit video · Depth (C-109…C-112) | Sandbox only. | Dead | Not built. | — |
| VO-08 | The sandboxes (C-117…C-123) | Internal. | Dead | Not built. | — |

### 3.10 Generate, versions and compare

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VN-01 | One primary button, the label follows the intent (C-01, B-105) | Seven passes, one button. | Missing | Same matrix (§5.6), with the changes it will apply listed above it. | R2 |
| VN-02 | Variants 1 · 2 · 3 (C-04) | Phone only (MM-02). | Missing | Beside Generate at every width (**Q-09**). | R2 |
| VN-03 | Loading per slot, Cancel, wake lock, tab-hidden abort (C-18…C-20) | Placeholder tiles. | Missing | Placeholder tiles in the strip + the progress card on the canvas (1.0's trial copy), Cancel. | R2 |
| VN-04 | Errors per pass (C-23) | Route text or fallbacks. | Missing | The house `Couldn't …` words (§5.7). | R2 |
| VN-05 | Gallery strip: Original + V1…Vn, labels (C-40…C-44) | Labels lost on reload. | Missing | The versions strip; each version keeps its label and parent. | R1 |
| VN-06 | Delete a version (C-48) | No confirm. | Missing | Undo (**Q-11**). | R2 |
| VN-07 | View dialog: compare any two, Changes list, actions (C-60…C-67) | Full-page dialog. | Missing | **Compare on the canvas** + **Present** (xxl dialog) (**Q-12**); *Changes* lists surfaces **and** furniture. | R2 |
| VN-08 | Download (C-85) | JPG of the 1600 px base. | Missing | The version at full size (**Q-33**). | R3 |
| VN-09 | Temp mode (C-36) | *Save to project* off. | Excluded | Personal designs cover it (**Q-10**). | — |
| VN-10 | No undo, no unsaved guard (B-14, C-133) | — | Missing | ⌘Z / ⇧⌘Z on the picks; Undo on removes; nothing to lose (autosave). | R2 |

### 3.11 Out to the client and into the lead

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VX-01 | Share → public link, 7 days, share dialog (QR placeholder, WhatsApp, copy) (A E-01…E-03, C-83) | A new link per press. | Missing | **Share with client** (**Q-14**): pick up to 6 versions, one link per share, 7 days, renew / stop; the WhatsApp draft to the lead's number (X-Ray's dialog). | R3 |
| VX-02 | The public page (A E-04…E-06) | Branded header, before / after, materials. | Missing | `/renders/[token]` on the brand kit: each version with before / after, the materials, the studio's pins. | R3 |
| VX-03 | Request a Consultation (A E-07) | Nobody reads it. | Mismatch | *Ask for a call back* → a Follow-up task for the lead's members + a notification (**Q-16**). | R3 |
| VX-04 | Portal likes / comments / pins (A E-17…E-21) | Projects only. | Later → partly 2.0 | The share page carries the client's side: pick a favourite, leave a note, drop a pin and reply (**Q-15**). | R3 |
| VX-05 | Studio annotator (C-70…C-75) | Pins after a portal share. | Missing | **Pins** on any version in the editor (**Q-15**). | R3 |
| VX-06 | Send to Chat (C-86) | Falls back to the first chat. | Excluded | 2.0 has no chat; WhatsApp is the channel (**Q-14**). | — |
| VX-07 | Share to Portal (C-84) | Projects only. | Later | Projects / portal. | — |
| VX-08 | Save to the lead (MM-01) | Never done. | Mismatch | **Save to Files** — the lead's Files › Renders (**Q-13**). | R3 |
| VX-09 | Material list for quoting (MM-09) | Never read. | Mismatch | **Add to quote** (**Q-17**). | R3 |
| VX-10 | Activity, notifications (A A-20) | None. | Missing | Activity lines and the `render_feedback` event (**Q-34**). | R3 |
| VX-11 | mAIson tools + page context (A F-01…F-11, A-16) | A second visualizer, never saved. | Later | The editor registers its Maison AI suggestions (the house rule: they answer coming soon). | R3 |

### 3.12 Materials library, phone, who may

| ID | 1.0 | 1.0 does | Status | 2.0 builds | R |
|---|---|---|---|---|---|
| VM-01 | `studio_materials` library (B-67, B-68) | Per studio, soft delete, used in the picker. | Missing | **Company › Materials** (**Q-18**). | R4 |
| VP-01 | Camera-app shell below lg (D; B-113…B-115) | Top bar · canvas · tray · dock · Generate bar; *More* opens a sheet. | Missing | The same model ≤1024 on 2.0 pieces (**Q-25**). | R4 |
| VP-02 | Touch rules (B-126) | Hover-revealed controls also on touch; pointer events only. | Missing | The house `(hover: none)` arms; pointer events on the canvas. | R4 |
| VW-01 | Who may (A A-06, C-90) | Owner · admin · id. | Missing | Every member; Who sees leads on lead designs; delete by maker, Owner or Admin (**Q-24**). | R1 |
| VW-02 | Usage funnel (A A-18) | Admin analytics. | Platform | Not built. | — |
| VW-03 | Trial + demo (A G-01…G-14) | Public marketing. | Excluded | Not built. | — |

---

## 4. Data port plan — 1.0 → 2.0

2.0 keeps 1.0's table names and columns where they fit its conventions (text ids, integer seconds via `mode: 'timestamp'`, JSON in text columns, soft delete `deleted_at`) — the devs port back by name. Migration **0053**; repair **R61** seeds the demo (§4.3); every new table joins BOTH baseline lists (`lib/db/baseline.ts` `BASELINE_TABLES`, `scripts/snapshot-baseline.ts` `TABLES`).

### 4.1 Tables

| 1.0 | 2.0 | Kept | Dropped (platform) | New in 2.0 |
|---|---|---|---|---|
| `studios.settings.visualizerWorkspace.sessions[]` + the derived lead / project designs | **`visualizer_designs`** | `id`, `name`, `folder_id` (as `folderId`), `created_at`, `updated_at` | `roomIds[]` (rooms point at their design instead) | `kind` (`lead` · `personal`), `lead_id` (one design per lead), `created_by`, `deleted_at`, `deleted_by` |
| `…visualizerWorkspace.folders[]` | `library_folders` (library `visualizer`) | `id`, `name` | — | the house folder columns (REG-664) |
| `project_rooms` | **`project_rooms`** | `id`, `name`, `project_id` (null in 2.0), `lead_id`, `original_image_url`, `created_at` | `studio_id` (one studio) | `design_id`, `position`, `detection_json` (the reading: surfaces + furniture, their regions), `state_json` (the pending picks, autosaved), `sample_key` (a sample room's key), `deleted_at` |
| `render_jobs` | **`render_jobs`** | `id`, `room_id`, `project_id`, `lead_id`, `model`, `status` (`completed`), `variants_json` (`[{ id, imageUrl, materials[{label, material}], parentKey }]`), `style` (the descriptor), `created_at`, `completed_at` | `studio_id`, the provider's ids | `created_by`; `variants_json[]` gains `changes` (the whole applied state: surfaces, furniture, style, lighting, note) and `deletedAt` per variant (Undo) |
| `render_share_links` | **`render_share_links`** | `id`, `token`, `snapshot` (JSON), `expires_at`, `view_count`, `created_by`, `created_at` | `studio_id` | `lead_id`, `design_id`, `revoked_at`, `message` |
| `render_consultation_requests` | **`render_consultation_requests`** | `id`, `share_link_id`, `client_name`, `client_phone`, `message`, `created_at` | — | `kind` (`call_back` · `note` · `favourite`), `version_key` (`jobId:variantId`), `task_id` (the call back's follow-up) |
| `homeowner_shared_assets.metadata.annotations[]` | **`render_annotations`** | `id`, `x`, `y`, `body`, `status`, `author_role`, `author_name`, `comments` (JSON `[{ id, authorRole, authorName, body, createdAt }]`), `created_at` | `homeowner_id` (no portal login) | `job_id`, `variant_id`, `author_member_id`, `updated_at`, `deleted_at` |
| `studio_materials` | **`studio_materials`** | `id`, `name`, `category`, `image_url`, `hex`, `description`, `uploaded_by`, `is_active`, `created_at`, `updated_at` | `studio_id`, `roughness`, `metalness` | `finish`, `folder_id`, `price_book_item_id` (quoting), `deleted_at` (soft delete — `is_active` kept for the port) |
| `project_files` (auto-filed renders) | `lead_files` (folder *Renders*) | a render filed as an image | — | the file's `thumb` = the version's image; created by *Save to Files* and by a share |
| `usage_events` · `platform_config.page_visibility` | — | — | Platform | — |

### 4.2 Images

1.0 stores images in the `renders` bucket (`{studio}/{entity}/rooms/{room}/original.jpg`, `…/jobs/{job}/variant-{n}.png`). 2.0 keeps a **data URL** in the row for anything a studio uploads or the engine makes, served at an address (`/visualizer/img/…`) so pages carry addresses, and **public paths** (`/visualizer/samples/…`, `/visualizer/lighting/…`, `/visualizer/demo/…`) for the sample rooms, 1.0's finished renders and the demo's pre-rendered edit.

*Correction (2026-09-25, build):* this section first said 2.0's Files tab stores uploads the same way. It did not — the reader E-214 was right: the Files tab stored a stand-in picture for every upload. That is fixed in REG-684 (the sheets round): an image uploaded in Files keeps its picture in `lead_file_images` (migration 0054), served at `/files/img/<id>`, so *Open in AI Visualizer* opens what was uploaded.

### 4.3 Demo data (R61, REG-343's rule — every state has its trail)

- **Kevin Ng** (Met, Landed — Semi-D; Dane · James · Michelle): his design with three rooms from his site photos (Living room · Kitchen · Master bedroom — 1.0's sample photos, also filed in his Files › Site photos), versions with their parents and changes (the living room in Japandi and Scandinavian, a Walls + Floor change, the bedroom at Golden Hour, the kitchen restyled), a studio pin, a share link sent three days ago with the client's favourite and a note, the notification it raised, and a *Save to Files* render in Files › Renders.
- **A personal design** *Showroom — kitchen concept* (Dane) filed in the folder *Showroom ideas*: the kitchen sketch rendered to a photo.
- **Company › Materials**: four of the studio's own swatches (one linked to a Price book item).

---

## 5. The engine — how the prototype renders (Q-05)

2.0 cannot call an image model. As with Quote X-Ray (REG-529: a curated engine, not a model), the visualizer runs a **curated, deterministic engine in the browser** (`lib/visualizer/engine/*`). It changes the photo's own pixels for everything that keeps the room's shape, and uses 1.0's finished renders for the whole-room looks.

### 5.1 What it can do

| Pass (1.0) | 2.0's engine |
|---|---|
| Surfaces → materials | Each surface's **region** is recoloured to the material's colour, keeping the photo's light and shadow (§5.3). Any photo. |
| Furniture → Customize | The piece's region is recoloured the same way (finish + colour chips → a colour). Any photo. |
| Furniture → Remove | Where the room has an empty plate (the sample living room), the piece's region is replaced by the empty room's pixels; otherwise *We couldn't take that piece out of this photo — try Customize instead.* |
| Furniture → Replace | The piece keeps its shape and takes the pick's colour and finish — read from its words (1.0's presets name them: "walnut", "terracotta velvet") or from the reference photo's dominant colour. The panel says so: *The piece keeps its shape on the photo — the pick brings its colour and finish.* (Changed during the build from "says it cannot": a result the studio can show beats a refusal.) |
| A style, no surgical changes (restyle) | The sample rooms' **finished renders** for Scandinavian · Industrial · Japandi · Bohemian · Dubai Luxury (1.0's own); any other style or photo: the style's suggested materials on every surface + the style's light (colour temperature). |
| Lighting | A pixel grade from 1.0's own live-tweak maths (brightness, contrast, shadow lift, temperature overlay, the sun's raking gradient) + the fixtures as glows; the sample bedroom's Golden Hour is 1.0's finished render. Any photo. |
| Style transfer | Each reference photo's palette (five colours, read in the browser) goes onto the surfaces by lightness; strength blends; the aspects pick what changes. Any photo. |
| Empty the room | The sample living room's empty plate; otherwise *We couldn't empty this room — try one of the sample rooms.* |
| Auto furnish | An empty sample living room furnished in a style → that style's finished render; otherwise *We couldn't furnish this photo — empty it first.* (1.0's own scan note.) |
| Render from sketch | The sample kitchen sketch → the kitchen photo (1.0's pair); another sketch: *We couldn't turn this sketch into a photo — try the sample sketch.* |
| The note | §5.5. |

### 5.2 Reading a photo (detection)

- **Sample rooms** (`lib/visualizer/samples.ts`) carry their surfaces (label, group, dot, seed points) and furniture (label, category, dot, seed points, box) — written once, checked by eye against the photos.
- **Any other photo** gets 1.0's fallback three — *Walls* · *Floor* · *Ceiling* (B-40) — with their dots moved to the largest colour region in the band 1.0 used (upper, lower, top), so they sit on the wall, floor and ceiling of a normal room photo.
- **Regions** are grown from the dot (and the sample's extra seeds) over neighbouring pixels of a similar colour (a flood fill in Lab space with a local and a seed tolerance), on a 480-wide copy, closed and feathered. *Draw a surface* replaces a region with the drawn shape.

### 5.3 Recolouring that keeps the light

For each pixel in a region: its lightness relative to the region's average carries the shading; the material's colour is scaled by it (clamped, gamma-corrected), so a lit patch stays lit and a shadow stays a shadow. Gloss lifts the highlights, textured and natural add a faint grain. The region's edge is feathered 1.5 px.

### 5.4 Palettes

A reference photo is scaled to 96 px and clustered into five colours (k-means, seeded by lightness); the brief shows them as swatches (1.0's *Read the style*).

### 5.5 The note

The note is read for: a colour + a surface ("sage green walls"), a style name ("make it japandi"), a mood ("warmer", "cooler", "brighter", "moodier", "evening", "golden"), "empty". Anything else answers *We couldn't turn that note into a change — try a surface and a finish, like "sage green walls".*

### 5.6 The primary button (1.0's matrix, C-01)

Sketch → *Render from sketch* · Empty the room open → *Empty the room* · Auto furnish open → *Furnish the room* · a note alone → *Generate from note* · lighting alone → *Relight* · a reference, nothing else → *Style transfer* · a style, nothing else → *Restyle as {style}* · otherwise *Generate · {n} changes*. Variants 2 and 3 use the next suggested materials of each changed surface's category (1.0's "subtle variations").

### 5.7 Timing and errors

A pass takes 1.4 s (Fast) or 2.6 s (High quality) with 1.0's trial progress words (*Reading the room* → *Applying your changes* → *Rendering light and shadow* → *Finishing touches*). Errors use the house `Couldn't …` form; a pass can be cancelled.

---

## 6. Calls

Every call below is **As recommended** (§9).

| Q | Question | Recommendation |
|---|---|---|
| Q-01 | The name | *AI Visualizer* everywhere (the tile, the quick link, the page, the editor). |
| Q-02 | Where it lives | Tools › AI Visualizer at `/visualizer` (in the shell); each design at `/visualizer/[designId]` (rail-less app frame, the quote editor's group); the lead's quick link opens the lead's design with `?from=`. |
| Q-03 | What a design is | `visualizer_designs`: one per lead (made on first open, named after the lead), any number of personal ones. Projects wait for the Projects module. |
| Q-04 | Folders | The house folders (library `visualizer`) for personal designs; a lead's design is filed by its lead. |
| Q-05 | Rendering in the prototype | The curated engine of §5; the sample rooms are a way in (*From a sample room*). |
| Q-06 | Detection and markers | §5.2; one *Markers* toggle for both kinds (fixes MM-11); a selected surface lights its region. |
| Q-07 | Work that survives | The room keeps its reading and its manual adds; pending picks autosave; each version keeps its changes, parent and label (fixes MM-12). |
| Q-08 | What the canvas shows after Generate | The new version, selected in the strip, and edits continue from it; the Original or any version can be picked to branch; Compare is one press. |
| Q-09 | Variants | 1 · 2 · 3 beside Generate at every width (fixes MM-02). |
| Q-10 | Temp mode | Not built — a personal design is the scratch space. |
| Q-11 | Undo | ⌘Z / ⇧⌘Z over the picks; every remove (a version, a room, a surface from the list, a design) answers with Undo (fixes MM-05). |
| Q-12 | Compare | On the canvas: a slider between the version you see and its parent by default, any two from the strip; *Present* opens the xxl dialog to show a client. |
| Q-13 | Saving to the lead | *Save to Files* on a version → the lead's Files › Renders (made on first save); a share saves what the client saw (fixes MM-01). |
| Q-14 | Sharing | *Share with client* — pick up to six versions (the one you see ticked), a message, one link per share, valid 7 days, *Renew* / *Stop sharing*; the WhatsApp draft to the lead's number and Copy link (X-Ray's send dialog). No QR placeholder, no chat (2.0 has no chat). |
| Q-15 | Pins | Pins on any version in the editor (studio) and on the share page (client), with replies, resolve / reopen; 100 pins, 2,000 characters (1.0's limits). |
| Q-16 | The consultation form | *Ask for a call back* on the share page → a Follow-up task for the lead's members, a notification, an Activity line (fixes MM-08). |
| Q-17 | Material list for quoting | *Add to quote* on a version: its finishes become a section in one of the lead's draft quotes (or a new one), priced from the Price book where an item of that name exists, else at zero for the studio to price (fixes MM-09). |
| Q-18 | The studio's materials | Company › Materials — the house library gallery: a swatch photo or a colour, name, category, finish, an optional Price book item; any member adds (1.0), the maker, an Owner or an Admin deletes; soft delete. The picker's *Your library*. |
| Q-19 | The Gush catalogue | Ported whole as the brand sections, with 1.0's note that the colours are approximate kept in code. |
| Q-20 | A custom swatch in a render | The engine uses the swatch photo's dominant colour. |
| Q-21 | Furniture passes | Customize recolours; Remove where an empty plate exists; Replace recolours the piece from the pick's words or photo (§5.1 — changed during the build). |
| Q-22 | Lighting | One step: the canvas previews live; Generate keeps it. Copy fixed (MM-10). |
| Q-23 | Tools | Empty the room, Auto furnish, Style transfer, Render from sketch and the Note on every width; drift guard, outpaint, reangle, orbit and depth not built. |
| Q-24 | Who may | Every member; lead designs follow Who sees leads; a design is renamed or deleted by its maker, an Owner or an Admin (X-Ray's rule, REG-641). |
| Q-25 | Phone and tablet | ≤1024: top bar · canvas · the mode's tray · the dock (Surfaces · Furniture · Style · Lighting · Tools) · the Generate bar; panels are bottom sheets; every tool runs there (fixes MM-03). |
| Q-26 | Maison AI | The visualizer registers suggestions; they answer coming soon (REG-507) until Maison AI is built. |
| Q-27 | The marketing trial | Excluded. |
| Q-28 | Projects' Photo Renders, Renders tab, Share to Portal | Later (Projects). |
| Q-29 | The usage funnel | Platform. |
| Q-30 | The page flag | Platform; the Tools tile goes live. |
| Q-31 | Open in AI Visualizer from a file | Built: a lead's image file opens as a new room in the lead's design; the canvas empty state offers *From the lead's files*. |
| Q-32 | The lead's style | The Style list opens with the lead's preference on top (Contemporary → Modern, Luxury → Dubai Luxury, Mid-century → Mid-Century Modern; the rest by name). |
| Q-33 | Download | The version at full size, named `{Lead or design} - {Room} - V{n}.jpg`. |
| Q-34 | Activity and notifications | Lead Activity: a design's renders, shares, the client's favourite, note, pins and call back, Save to Files, Add to quote; the notification event `render_feedback` — *A client responds to a shared render* — for the lead's members (In app + WhatsApp by default). |

## 7. Rounds

| Round | What | Calls |
|---|---|---|
| R1 · Foundation | Migration 0053 + R61; `lib/visualizer/*` (catalogue, styles, furniture, surfaces, lighting, samples, model); the engine core; `/visualizer` (the gallery); the editor frame (top bar, rooms, canvas with pan / zoom / markers / regions, the versions strip); the quick link and the Tools tile | Q-01…Q-07, Q-24 |
| R2 · The modes | Style · Surfaces & Materials · Furniture · Lighting · Tools; Generate, variants, progress, versions, compare, Present, undo | Q-08…Q-12, Q-19…Q-23, Q-32 |
| R3 · Out to the client, into the lead | Share with client + `/renders/[token]` + the client's side; pins; Save to Files; Add to quote; Open in AI Visualizer; Download; Activity; notifications; Maison AI | Q-13…Q-17, Q-26, Q-31, Q-33, Q-34 |
| R4 · Materials, phone, polish | Company › Materials; the ≤1024 layout; the consistency walk | Q-18, Q-25 |
| R5 · Map | `17-ai-visualizer-migration-map-2026-09-25.md`, the baseline, the UAT step | — |

## 8. Found in 1.0 — not ported

- Variants cannot be set on a desktop (B-106); Auto Furnish cannot run on a phone (C-16); the sketch quality and *Use as-is* are phone-sheet only (C-14).
- A version deletes with no confirm and leaves its file (C-48); a room deletes through a native `confirm` (C-134); a session delete leaves Storage files (C-33).
- Selecting a version wipes every material assigned since (C-56); everything but renders is lost on reload (C-50).
- The share link's snapshot labels a no-style render *Modern* (C-83); every press mints a new link and none can be revoked (A E-01); the QR code is a placeholder (A E-02); the snapshot keeps the studio's contacts and never shows them (A E-06).
- Send to Chat posts into the studio's first chat when the lead has none (C-86).
- The consultation form writes a table nobody reads (A E-07); the Key Files lightbox opens empty for visualizer renders (A D-03); the project's Renders tab is unreachable (A D-01); the coach mark's anchor is missing (A A-14); the page context is never set (A A-16).
- The Defurnish pass cannot be cancelled although its tile offers Cancel (C-19).

## 9. Answers

The owner delegated every call on 2026-09-25 ("You take the best recommendation calls yourself and built it"). **Q-01…Q-34 are As recommended — set on the owner's instruction of 2026-09-25**; the owner can override any row. Recorded as REG-672.

## 10. Build log

- 2026-09-25 — audit written (REG-671); calls set (REG-672).
- 2026-09-25 — **R1–R5 built in one pass** (REG-673 foundation · REG-674 the modes · REG-675 out to Files, a quote and the client · REG-676 the client's link · REG-677 Company › Materials). Migration 0053; repair R61; the devs' map `17-ai-visualizer-migration-map-2026-09-25.md`.
- 2026-09-25 — **the simplicity pass** on the owner's mid-build ask (REG-678): a square picks its group, one quiet options line, Compare named, change lines by surface, the phone's tray keeps the photo in view; the engine's recolour moved to Lab (a paint renders as itself), the living room's outlines traced, Remove matches the plate's light.
- 2026-09-25 — **the two sheets' rows** (REG-679…684; `design-source/context/feedback/04-ai-visualizer-sheets-2026-09-25.md`): Describe a change with a mic, patterned wallpapers, style cards with their look and materials, the upload line, the moodboard, uploads that keep their picture (migration 0054).
- Probes `design-source/verify/ai-visualizer/verify-viz-{studio,client,sheets}.cjs` (37 · 30 · 14).
