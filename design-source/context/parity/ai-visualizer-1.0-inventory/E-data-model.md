# OpenMaison 1.0 — AI Visualizer inventory · Slice E: the data model

1.0 repo `qanvast-id-tool` · branch `integ/security-non-qanvast` · commit `67f42e469` · read 2026-09-25 (read-only; nothing run) · reader E. All 1.0 paths are under `/Users/vicky/Documents/GitHub/qanvast-id-tool`; 2.0 paths under `/Users/vicky/Documents/GitHub/openmaison-prototype`.


## Abbreviations

| Code | Path |
|---|---|
| SM/ | `supabase/migrations/` (timestamped files, e.g. `20240201000001_render_jobs.sql`) |
| XM/ | `scripts/migrations/` (numbered files, e.g. `213_lock_render_jobs.sql`) |
| DBT | `src/types/database.ts` (hand-written `Db*` row interfaces — not generated; several visualizer tables have no interface) |
| M092 | `XM/092_rls_permissive_phase0.sql` (phase-0 allow-all policies + storage policies) |
| M213 | `XM/213_lock_render_jobs.sql` |
| M226 | `XM/226_lock_tenant_tables.sql` |
| M229 | `XM/229_lock_homeowner_tables.sql` |
| M230 | `XM/230_lock_child_tables_of_locked_parents.sql` |
| JOBS / JOB1 / JOBR | `src/app/api/renders/jobs/route.ts` · `…/jobs/[id]/route.ts` · `…/jobs/by-room/[roomId]/route.ts` |
| ROOMS / ROOM1 | `src/app/api/projects/rooms/route.ts` · `…/rooms/[roomId]/route.ts` |
| RSHARE / RTOK / RCONS | `src/app/api/renders/share/route.ts` · `…/renders/[token]/route.ts` · `…/renders/[token]/consultation/route.ts` |
| WSR / WSQ | `src/app/api/visualizer/workspace/route.ts` · `src/lib/queries/visualizer-workspace.ts` |
| VZ | `src/components/projects/visualizer.tsx` (the editor) |
| SMQ / SMR | `src/lib/queries/studio-materials.ts` · `src/app/api/studio-materials/records/…` |
| MCQ / MCR | `src/lib/queries/material-catalog.ts` · `src/app/api/material-catalog/records/route.ts` + `[id]/route.ts` |
| HL | `src/app/api/homeowner-links/{active-link,share-render,shared-renders,render-annotations}/route.ts` |
| HOAPI | `src/app/api/homeowner/projects/[id]/…` (design · documents · renders/[assetId]/like · comment · annotations …) |
| CPR / CPM / CPG | `src/app/api/copilot/render/route.ts` · `…/copilot/moodboard/route.ts` · `…/copilot/moodboard/gallery/route.ts` |
| UPV | `src/lib/copilot/upload-visual.ts` |
| QP / QC | `src/lib/queries/projects.ts` · `src/lib/queries/copilot.ts` |
| CMD | `src/components/projects/custom-material-upload-dialog.tsx` (the custom-material dialog; B owns its UI) |

## Vocabulary (data words; where each is defined)

- **room** — one row of `project_rooms`: a named photo slot (`name`, `original_image_url`) owned by a project, a lead, or nobody (a standalone "session" room). Defined `SM/20240201000002_project_rooms.sql:4-12`; editor type `Room` `VZ:281-285`. There is **no room kind column** — "Room {n}" is the default name (`VZ:2285`); room types exist only as the Auto Furnish room program (`src/lib/auto-furnish-prompt.ts:45`, not persisted).
- **local room** — a room that lives only in the editor's memory, id `local-{nanoid}` (`VZ:2249-2253`): temp mode (`saveToLibrary` off) or no project / lead / session.
- **render job** (job) — one row of `render_jobs`: one generation pass on one room, holding 1…n **variants** in `variants_json` (`SM/20240201000001_render_jobs.sql:2-12`; editor types `RenderJob` / `RenderJobRow` `VZ:302-320`).
- **variant** / **version** — one image inside a job (`VariantResult` `VZ:272-279`: `id` number, `imageUrl`, `materials[]`, `parentKey?`). The UI numbers them V1…Vn across the room (`versionOf`, `VZ:1662`, reader C); the key of a version is `` `${jobId}:${variantId}` ``; the upload is the pseudo-version `"__original__"`.
- **parentKey** — the version a variant was made ON (`"__original__"` or `` `${jobId}:${vId}` ``), stamped before the job is saved so "Changes from V{n}" survives a reload (`VZ:3440-3442`).
- **style (job label)** — `render_jobs.style` holds a display label, not only a style name: the style card (e.g. *Scandinavian*), *Defurnished · Keep built-ins*, *Sketch render · …*, *Relit · <preset>*, *Auto furnished · …*, *Style transfer · …* (see E-26).
- **model** — `render_jobs.model`, the OpenRouter model id that made the job (see E-27).
- **session (visualizer session / design)** — a standalone visualizer workspace entry in `studios.settings.visualizerWorkspace.sessions[]` (no table; `WSR:24-26`, `WSQ:28`), grouping studio-owned rooms by id. A **design** is the landing's card: a project, a lead or a session with its rooms (`WorkspaceDesign`, `WSQ:12-23`).
- **folder** — `visualizerWorkspace.folders[]` (`{ id, name }`), groups sessions only (`WSQ:24`, `WSQ:167-187`).
- **share link** — a row of `render_share_links`: a public token to a frozen **snapshot** of renders, with an expiry and a view counter (`SM/20260410000001_render_share_links.sql:2-11`).
- **consultation request** — a row of `render_consultation_requests`: name + phone + message left by whoever opened a share link (`SM/20260410000001…:17-24`).
- **library material** (custom material saved to the library) — a row of `studio_materials` (`XM/121_studio_materials.sql:16-30`); the image lives in the `studio-materials` bucket. Stock materials are code (`src/data/mock-catalogue.ts`, reader B), never rows.
- **catalogue item** — a row of `studio_material_catalog` (`XM/194_studio_material_catalog.sql:18-31`): the studio's reusable selection options (name, vendor, price, specs). **Not read by the shipped editor** — only the internal Auto Furnish sandbox sends catalogue picks to the render route (E-90).
- **shared asset** — a row of `homeowner_shared_assets` (`asset_type = 'render'` for the visualizer) pushed to the homeowner portal through the project's active **homeowner link** (`homeowner_project_links`).
- **like / comment / annotation** — homeowner feedback kept as JSON on the shared asset: `likes[]`, `comments[]` (columns, `XM/195_render_feedback.sql`) and `metadata.annotations[]` (pins with their own threads; no migration).
- **visual asset** — a row of `copilot_visual_assets` (types `portfolio_match` · `mood_board` · `ai_render`) made during a live co-pilot meeting; mirrored into `render_jobs` + `project_files` when the meeting is bound to a project.
- **auto-file** — the best-effort copy of each saved variant into the project's Files › *Renders* folder as a `project_files` row (`src/lib/finance-auto-file.ts`, `VZ:2805-2817`).
- **temp mode** (E8, *save to library* off) — a render session that writes nothing: no room row, no upload, no job row (`VZ:1385-1388`).
- **usage event** — a row of `usage_events` with `feature_key = 'ai_visualizer'` (see §13).
- **page visibility** — `platform_config` + `studios.settings.page_visibility` switches that show or hide `/tools/ai-visualizer` (see §14–15).

## Overview / map

The AI Visualizer persists very little in 1.0, and almost all of it is image URLs. A **room** row (`project_rooms`) holds the uploaded photo's public URL; every successful generation writes one **job** row (`render_jobs`) whose `variants_json` array carries the resulting image URLs plus, per variant, the material swaps that made it and the version it was made on. Rooms hang off a project, a lead, or nothing: rooms with neither belong to a **session** that is not a table at all but a JSON list inside `studios.settings.visualizerWorkspace` (sessions + folders), read and rewritten whole by `/api/visualizer/workspace`. Images live in the public `renders` Storage bucket under `{studioId}/{entityId}/rooms/{roomId}/…`; custom materials saved to the library are `studio_materials` rows with images in the public `studio-materials` bucket. Everything in the editor that is not a URL — detected surfaces, furniture, markers, material picks, lighting knobs, drift reports, the Auto Furnish room type — lives only in React state and is lost on reload (the exceptions ride inside each stored variant: `materials[]`, `furnitureChanges[]` and `parentKey`, E-182).

Outbound, a render can go four ways, each with its own store: (1) **Files** — a `project_files` row in folder *Renders* pointing at the same public URL (project context only); (2) **homeowner portal** — a `homeowner_shared_assets` row (`asset_type 'render'`) on the project's active `homeowner_project_links` row, which then collects `likes`, `comments` and `metadata.annotations` from the homeowner; (3) **public share link** — a `render_share_links` row with a frozen JSON `snapshot`, a 7-day expiry and a view count, whose page can write `render_consultation_requests`; (4) the **co-pilot** writes the other direction — its `copilot_visual_assets` renders and mood boards are mirrored into `render_jobs` (with `room_id` NULL, so the editor never shows them) and `project_files`. Tenant isolation arrived late (the 2026 "WS-A…E" lock wave, migrations 209–235): every table read/write moved behind `scopedSupabase(session.studioId)` routes with RLS keyed on the JWT's `studio_id` claim, and Storage writes moved behind `/api/storage/upload` + `/api/storage/remove`, which only accept paths starting `{studioId}/`.

### How the effective schema is assembled (read before the tables)

- **Two migration folders.** `SM/` holds 102 timestamped Supabase CLI files (the visualizer's own tables were born here: `render_jobs`, `project_rooms`, `render_share_links`, `render_consultation_requests`, the homeowner tables, `copilot_visual_assets`). `XM/` holds 381 numbered files applied by the team's script runner (materials, storage buckets, RLS phases, every lock). The effective schema is their union; a table's later ALTERs can sit in either folder. Numbering in `XM/` is not unique (e.g. `209_revoke_destructive_grants.sql` + `209_variation_orders_gst_columns.sql`, `213_lock_render_jobs.sql` + `213_quotes_is_omission.sql`), and some files' header comments carry an older number (`XM/194_studio_material_catalog.sql:1` says "183", `XM/195_render_feedback.sql:1` says "184").
- **RLS in four eras**, all of which touch the visualizer tables: (a) the original per-table policies (often tautological — `using (studio_id = studio_id)`); (b) `M092` Phase 0 — every RLS table gets `phase0_allow_all` (anon key could do anything); (c) the 2026 lock wave — `M213` (render_jobs), `M226` (studio_id tables incl. `project_rooms`, `render_share_links`, `studio_materials`, `studio_material_catalog`, `project_files`), `M229` (homeowner tables), `M230` (child tables incl. `render_consultation_requests`), `232` (storage anon writes revoked), `233`/`235` (sensitive buckets private) — policy `scoped` = `studio_id = (auth.jwt()->>'studio_id')::uuid`, `FORCE ROW LEVEL SECURITY`, `anon` loses DML, `authenticated` keeps it, `service_role` bypasses; (d) `XM/234_rollback_209_233_tenant_locks.sql` — an **emergency panic button** that disables RLS on every FORCE'd table and re-grants anon; it is not a normal state and is only run if a lock breaks an environment.
- **Row types.** `DBT` is hand-written; it has interfaces for `studio_materials`, `studio_material_catalog`, `copilot_visual_assets`, `homeowner_project_links`, `homeowner_shared_assets`, `project_files`, `lead_files`, `usage_events`, `studios` — but **none** for `render_jobs`, `project_rooms`, `render_share_links` or `render_consultation_requests`; those are typed locally in the editor (`VZ:302-327`) or not at all.

## 1 · `render_jobs` — one generation pass on one room

### E-01 · Table `render_jobs`
- Source: created `SM/20240201000001_render_jobs.sql:2-12`; `room_id`, `model`, `lead_id` added by `SM/20240201000002_project_rooms.sql:23-25`; no later ALTER in either folder (grep of both folders, 2026-09-25).
- Purpose: the render history. One row per saved generation (surgical render, whole-room restyle, style transfer, Auto Furnish, relight, defurnish, sketch render, co-pilot render / mood board mirror). The images are in `variants_json`.
- Tenant scope: direct — own `studio_id NOT NULL`. Owner entity = project **or** lead **or** (for standalone session rooms) only the room.
- Type: no `Db*` interface in `DBT`; the editor's local `RenderJobRow` (`VZ:311-320`) and `RenderJob` (`VZ:302-309`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-02 | `id` | uuid PK | no | `gen_random_uuid()` | Job id. **Minted in the browser** (`crypto.randomUUID()`, `VZ:2764`) or in the co-pilot route (`CPR:211`, `CPM:221`) and sent in the insert — the DB default is never used by app code. Also the `{jobId}` folder in the Storage path. |
| E-03 | `studio_id` | uuid FK → `studios.id` ON DELETE CASCADE | no | — | Tenant. Always the session's (`JOBS:98`, never from the body). |
| E-04 | `project_id` | uuid FK → `projects.id` ON DELETE **SET NULL** | yes | — | Owning project (project-context editor, or the co-pilot mirror). Deleting the project orphans the job (`XM/099_projects_archived_at.sql:6-8`). |
| E-05 | `status` | text CHECK in (`queued`,`processing`,`completed`,`failed`) | no | `'completed'` | Every writer writes `completed` (`JOBS:101` default, `VZ:2791`, `CPR:219`, `CPM:229`). `queued` / `processing` / `failed` are **never written** — generation is synchronous in the browser and a failed render writes nothing. Readers filter `status = completed` (`VZ:1546-1547`, `WSR:68`). |
| E-06 | `variants_json` | jsonb | no | `'[]'` | Array of stored variants — see §17 (E-182). Rewritten whole on PATCH (`JOB1:44`). |
| E-07 | `style` | text | yes | — | Display label of the pass (see E-26). PATCH can change it (relight live edit, `VZ:3013`). |
| E-08 | `created_at` | timestamptz | no | `now()` | Sort key (newest first, `JOBS:58`); the landing's cover = the newest job's first variant (`WSQ:74-81`). |
| E-09 | `completed_at` | timestamptz | yes | — | Written = browser clock at save (`VZ:2794`) or server `new Date()` (`JOBS:104`, `CPR:223`). Never read by any reader found. |
| E-10 | `room_id` | uuid FK → `project_rooms.id` ON DELETE **SET NULL** | yes | — | The room. NULL for co-pilot mirrors (`CPR:217`, `CPM:227`) — and every reader **skips** rows with no room (`VZ:1578`, `WSQ:70`), so co-pilot renders never appear in the visualizer (they do appear in Files). Room delete does not cascade; the editor deletes jobs explicitly first (`VZ:2317-2319`). |
| E-11 | `model` | text | yes | — | OpenRouter model id (see E-27). Carried into the editor's `RenderJob.model` (`VZ:1583`); not shown. |
| E-12 | `lead_id` | uuid FK → `leads.id` ON DELETE SET NULL | yes | — | Owning lead (lead-context editor; or the co-pilot session's lead alongside its project, `CPR:226`). |

### E-13 · Indexes on `render_jobs`
- Only the primary key. No index on `studio_id`, `room_id`, `project_id` or `lead_id` in either folder, although every read filters on one of them (`JOBS:51-56`, `WSR:65-68`) and deletes filter on `room_id` (`JOBR:33`).

### E-14 · RLS era (a) — the original policies
- `SM/20240201000001…:14-22`: RLS on; `"Studio members can read own render jobs"` FOR SELECT `USING (studio_id = studio_id)` (a tautology — always true); `"Studio members can insert render jobs"` FOR INSERT `WITH CHECK (true)`. No UPDATE / DELETE policy.

### E-15 · RLS era (b) — Phase 0
- `M092:94-96` drops both policies; `M092:128` creates `phase0_allow_all` FOR ALL `USING (true) WITH CHECK (true)`.

### E-16 · RLS era (c) — the lock
- `M213:34-47`: ENABLE + FORCE RLS; drop `phase0_allow_all`; policy `scoped` FOR ALL `USING/WITH CHECK (studio_id = (auth.jwt() ->> 'studio_id')::uuid)`; REVOKE SELECT/INSERT/UPDATE/DELETE from `anon`; GRANT them to `authenticated`. `service_role` bypasses (co-pilot routes use the scoped client anyway).
- `XM/234_rollback_209_233_tenant_locks.sql:22-33` would undo it (panic button only).

### E-17 · Writer — `POST /api/renders/jobs` (save a pass)
- Where: `JOBS:73-121`. Called by the editor's `persistVariantsToHistory` (`VZ:2759-2829`) after each variant image is uploaded (paths: §16, E-179).
- Body → columns: `id`* (400 *"id is required"* if blank), `roomId`→`room_id`, `model`, `status` (default `completed`), `variantsJson`→`variants_json` (default `[]`), `style`, `completedAt`→`completed_at` (default now), `projectId`, `leadId` (each only when truthy). `studio_id` from the session.
- Skipped entirely in temp mode or with no entity (`VZ:2767` `saveToLibrary && entityId`): then the job lives only in React state, and in temp mode it **replaces** the room's previous job instead of stacking (`VZ:2818-2825`).
- Errors: 500 with the Postgres message; the editor throws the server's `error`, else *"render job save failed"* (`VZ:2799-2801`), which surfaces through the calling flow's error state.

### E-18 · Writer — `PATCH /api/renders/jobs/[id]` (rewrite variants and/or label)
- Where: `JOB1:23-67`. Only the sent fields change (`variantsJson` → `variants_json`, `style`); neither sent → 400 *"nothing to update (variantsJson and/or style required)"*.
- Callers: relight live-edit overwrite `updateRelightVersion` (`VZ:2983-3016`: variant 1's `imageUrl` swapped to a fresh `…/variant-1-edit-{ms}.png`, label rewritten); deleting one variant of a multi-variant job (`VZ:3231-3236`, sends the remaining array).
- A foreign id is a silent no-op under RLS (returns `{ ok: true }`).

### E-19 · Writer — `DELETE /api/renders/jobs/[id]`
- Where: `JOB1:69-95`. Caller: deleting the **last** variant of a job (`VZ:3237`). The Storage object of a deleted variant is **not** removed (only room delete removes objects).

### E-20 · Writer — `DELETE /api/renders/jobs/by-room/[roomId]`
- Where: `JOBR:18-44`. Callers: room delete (`VZ:2319`) and session delete (`WSQ:222`). Required because `room_id` is SET NULL, not CASCADE (`VZ:2317`).

### E-21 · Writer — co-pilot render mirror
- Where: `CPR:209-231`. Only when the co-pilot session is bound to a project **and** the image uploaded to `renders` (`persistedImageUrl`). Row: `room_id NULL`, `model 'google/gemini-3-pro-image-preview'`, `status 'completed'`, `variants_json [{ id: 1, imageUrl, materials: [] }]`, `style` = the style keywords joined `", "` or NULL, `project_id`, `lead_id` if the session has one. Failure logged, never surfaced.

### E-22 · Writer — co-pilot mood board mirror
- Where: `CPM:219-260`. Same shape as E-21; `style` = `styleKeywords.join(", ")` or NULL (`CPM:232`).

### E-23 · Reader — `GET /api/renders/jobs`
- Where: `JOBS:23-71`. Query: `?entityType=project|lead&entityId=…` or `?roomIds=a,b,c` (session rooms), optional `&status=`. 400 *"entityType (project|lead) and entityId, or roomIds, are required"*. `select *`, newest first, returns `{ jobs: [...] }` snake_case (no transformer).
- Caller: the editor's load effect (`VZ:1545-1590`), always with `status=completed`.

### E-24 · Reader — `GET /api/visualizer/workspace`
- Where: `WSR:59-90`. `select id,room_id,variants_json,created_at` for the whole studio, `status = completed` — **every** job of the studio on each landing load (no pagination). Used to count renders per room and pick covers (`WSQ:66-83`).

### E-25 · Lifecycle — what deletes or orphans a job
- Room delete (editor): objects removed, then jobs by room, then the room (`VZ:2289-2322`).
- Session delete (landing): jobs by room + room rows; **Storage objects are left behind** (`WSQ:212-229`).
- Project delete: project `ON DELETE SET NULL` on `render_jobs.project_id`, while `project_rooms` CASCADE → the job keeps neither room nor project (fully orphaned, invisible). `XM/099_projects_archived_at.sql:6-8`; route comment `src/app/api/projects/[id]/delete/route.ts:91-92`.
- Lead delete: `lead_id` SET NULL on both rooms and jobs → the rooms become "standalone" but belong to no session, so they vanish from the landing (`WSQ:96`).
- Studio delete: CASCADE.

### E-26 · The `style` label values (who writes which)
| Pass | `style` written | Where |
|---|---|---|
| Surgical render (materials / furniture / note) | the selected style name (`currentStyle`, may be empty) | `VZ:3304`, `VZ:3443` |
| Whole-room restyle | the selected style name | `VZ:3797`, `VZ:3846` |
| Style transfer | *Style transfer* or *Style transfer · {styleName}* | `VZ:3769-3770` |
| Auto Furnish | *Auto furnished* or *Auto furnished · {style}* | `VZ:3639-3640` |
| Relight (new version) | *Relit* / *Relit · {preset}* / *Relit · edited* | `VZ:3054`, `VZ:5860-5861` |
| Relight live edit (overwrite) | the existing label (PATCH) | `VZ:3013` |
| Defurnish | *Defurnished · Keep built-ins* / *Defurnished · Strip to shell* | `VZ:2870` (scopes `VZ:368-371`) |
| Sketch render | *Sketch render* / *Sketch render · {style}* | `VZ:2929` |
| Co-pilot render / mood board | style keywords joined `", "` | `CPR:222`, `CPM:232` |
- The in-memory label can differ from the stored one: a surgical render made on another render is shown *Edit · {style}* but stored as `{style}` (`VZ:3447-3449`). The relight "is this relightable?" test reads the label prefix *Relit* (`VZ:3130`, `VZ:3139`) — so the label is load-bearing.

### E-27 · The `model` values written
- Surgical / restyle: the user's quality pick — `google/gemini-3-pro-image-preview` (*Pro Quality*, "High quality") or `google/gemini-3.1-flash-image` (*Fast Preview*, the default) (`VZ:356-362`).
- Defurnish `google/gemini-3.1-flash-image` (`VZ:366`); relight `RELIGHT_MODEL` = `google/gemini-3.1-flash-image` (`relight-controls.tsx:11`); style transfer `STYLE_TRANSFER_MODEL` = `google/gemini-3.1-flash-image` (`style-transfer-controls.tsx:29`); Auto Furnish `AUTO_FURNISH_MODEL[quality]` (`auto-furnish-controls.tsx:21`); sketch render `QUALITY_PRESET_MODEL` fast = `google/gemini-3.1-flash-image`, high = `black-forest-labs/flux.2-pro` (`VZ:436-439`); co-pilot `google/gemini-3-pro-image-preview` (`CPR:48`, `CPM:48`).

### E-28 · Status lifecycle (who writes which)
- Only `completed` exists in practice (E-05). There is no queue, no job row before the image exists, no failure row, no retry. The CHECK's other three values are dead vocabulary.

### E-29 · What is **not** persisted with a job
- Detected surfaces / furniture, marker positions, per-surface material picks (other than the `materials[]` summary per variant), lighting knobs, the drift-guard reports (`recordDrift` only toasts, `VZ:3529-3532`), prompts, cost, credits, the user who made it (no `created_by` column).

## 2 · `project_rooms` — a named photo slot

### E-30 · Table `project_rooms`
- Source: `SM/20240201000002_project_rooms.sql:4-12`; no later ALTER (the brief's "ALTERs e.g. `lead_id`" — `lead_id` is in the CREATE itself).
- Purpose: the rooms of a project, a lead, or a standalone visualizer session; holds the room's photo URL.
- Tenant scope: direct (`studio_id NOT NULL`). Owner: `project_id`, else `lead_id`, else a `visualizerWorkspace` session that lists its id.
- Type: no `Db*` interface; editor `RoomRow` (`VZ:322-327`) and `Room` (`VZ:281-285`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-31 | `id` | uuid PK | no | `gen_random_uuid()` | Room id (DB-minted; returned by POST). Also the `{roomId}` folder in Storage. |
| E-32 | `project_id` | uuid FK → `projects.id` ON DELETE **CASCADE** | yes | — | Owning project. |
| E-33 | `lead_id` | uuid FK → `leads.id` ON DELETE SET NULL | yes | — | Owning lead (lead-context editor). A lead that becomes a project keeps its rooms on the lead; nothing moves them to the project (no code found that rewrites `project_id` on rooms). |
| E-34 | `studio_id` | uuid FK → `studios.id` ON DELETE CASCADE | no | — | Tenant (session's, `ROOMS:92`). |
| E-35 | `name` | text | no | — | Room name. Default *Room {n}* on one-click new room (`VZ:2285`); renamed inline (PATCH, trimmed, blank refused). No uniqueness, no length limit. |
| E-36 | `original_image_url` | text | yes | — | Public URL of the (bucket-cropped) upload, `renders/{studioId}/{entityId}/rooms/{roomId}/original.{png\|jpg}`; NULL until a photo is uploaded. Swapping the photo overwrites the same path (upsert). The landing falls back to it as the room's cover (`WSQ:82`). |
| E-37 | `created_at` | timestamptz | no | `now()` | Sort order of rooms (ascending, `ROOMS:56`); the landing uses the newest room's `created_at` as a project / lead design's "updated" date (`WSQ:101-106`). |

### E-38 · Indexes on `project_rooms`
- Only the primary key (no index on `studio_id`, `project_id` or `lead_id`).

### E-39 · RLS / policies on `project_rooms`
- Era (a) `SM/20240201000002…:14-20`: `"Studio members can manage own rooms"` FOR ALL `USING (true) WITH CHECK (true)`.
- Era (b) `M092:54` + `M092:118`: replaced by `phase0_allow_all`.
- Era (c) `M226:39-69` (section A1): `scoped` on `studio_id`, FORCE, anon revoked. (`M213:28-29` had explicitly left rooms for "a separate workstream".)

### E-40 · Writer — `POST /api/projects/rooms`
- Where: `ROOMS:71-115`. Body `{ name*, projectId?, leadId? }`; 400 *"name is required"*. Neither id = a standalone session room (`ROOMS:85-87`); the page then appends its id to the session (`onRoomCreated` → `useAddRoomToSession`, `WSQ:204-210`). Returns `{ room }` (the DB row).
- Caller: `createRoom` (`VZ:2226-2253`), only when `saveToLibrary && entityId`; otherwise a `local-…` room.

### E-41 · Writer — `PATCH /api/projects/rooms/[roomId]`
- Where: `ROOM1:19-55`. Body `{ originalImageUrl?, name? }`; only sent keys change (`"originalImageUrl" in body` so it can be set to NULL; `name` trimmed, ignored if blank). Neither → 400 *"originalImageUrl or name is required"*.
- Callers: after the photo upload (`VZ:2445-2459`); inline rename (`VZ:2258-2280`, toast *"Couldn't rename the room"* + revert on failure).

### E-42 · Writer — `DELETE /api/projects/rooms/[roomId]`
- Where: `ROOM1:57-80`. Callers: room delete after its jobs (`VZ:2321`, confirm *"Delete this room and all its renders?"* `VZ:2290`), session delete (`WSQ:224`).

### E-43 · Reader — `GET /api/projects/rooms`
- Where: `ROOMS:23-69`. `?entityType=project|lead&entityId=…` or `?roomIds=…`; explicit `studio_id` filter kept on top of RLS; ascending `created_at`; returns `{ rooms }` snake_case. Caller: the editor's load (`VZ:1541-1544`).

### E-44 · Reader — `GET /api/visualizer/workspace`
- Where: `WSR:60-63`: `select id,name,project_id,lead_id,original_image_url,created_at` for the whole studio. Grouped into project / lead designs; rooms with neither id are only reachable through a session's `roomIds` (`WSQ:91-127`). Project / lead designs with no photo and no render are hidden (`WSQ:129-132`).

### E-45 · Local-only rooms
- `local-{nanoid}` ids (8 base-36 chars, `VZ:374-376`) never reach the DB; rename / delete skip the server for them (`VZ:2264`). They exist in temp mode and when the editor has no project, lead or session.

## 3 · `render_share_links` — public token to a frozen render

### E-46 · Table `render_share_links`
- Source: `SM/20260410000001_render_share_links.sql:2-14`; no later ALTER.
- Purpose: a public, expiring link (`/renders/{token}`) to ONE variant, with the studio's branding frozen into `snapshot` at creation. Made from the editor's full-screen viewer (*Share*, `VZ:1856-1882`; the dialog is reader C's).
- Tenant scope: direct (`studio_id NOT NULL`), but written and read only by service-role routes (the public page must resolve a token with no studio session).
- Type: no `Db*` interface; the page's `RenderShareData` (`src/app/renders/[token]/page.tsx:8-24`) types the snapshot only.

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-47 | `id` | uuid PK | no | `gen_random_uuid()` | Link id; parent of consultation requests. |
| E-48 | `studio_id` | uuid FK → `studios.id` ON DELETE CASCADE | no | — | The session's studio (`RSHARE:71`). |
| E-49 | `token` | text UNIQUE | no | — | 16 hex chars = the first 16 of a dash-less `crypto.randomUUID()` (`RSHARE:67`; ~60 random bits since the UUID's version nibble falls inside). The public path `/renders/{token}`. |
| E-50 | `snapshot` | jsonb | no | — | The frozen page content — see §17 (E-183). Never updated after insert. |
| E-51 | `expires_at` | timestamptz | no | — | Creation + **7 days** (`RSHARE:68`). No way to extend, revoke or list links. |
| E-52 | `view_count` | int | no | `0` | +1 on every successful public GET, fire-and-forget read-then-write (`RTOK:28-33`) — racy, not atomic. Never shown to the studio. |
| E-53 | `created_by` | uuid FK → `profiles.id` ON DELETE SET NULL | yes | — | The user who made the link (`RSHARE:75`). Not read anywhere. |
| E-54 | `created_at` | timestamptz | no | `now()` | Not read anywhere. |

### E-55 · Indexes on `render_share_links`
- `idx_render_share_links_token (token)` — redundant with the UNIQUE constraint's own index; `idx_render_share_links_studio (studio_id)` (`SM/20260410000001…:13-14`).

### E-56 · RLS / policies on `render_share_links`
- Born with RLS **off** (no ENABLE in its migration; not in `M092`). `M226:52` (section B1) enables + FORCEs RLS with `scoped` on `studio_id` and revokes anon. The routes use `createServerSupabase()` (service role) so the lock is transparent (`M213:23-27`).

### E-57 · Writer — `POST /api/renders/share`
- Where: `RSHARE:6-92`. Auth: the `qanvast_session` cookie verified directly (401 *"Unauthorized"* / *"Invalid session"*), then the **service-role** client (not `scopedSupabase`).
- Body `{ variantImageUrl*, originalImageUrl?, roomName?, style?, materials? }`; 400 *"Missing variant image URL"*; bad JSON → 400 *"Invalid request"*; insert failure → 500 *"Failed to create share link"*.
- Reads `studios.name, settings, country_code` (branding: `settings.branding`, legacy fallback `settings.client_portal` with a console warning to *"run migration 115"*) and the creator's `profiles.email, phone`.
- Returns `{ shareUrl: "/renders/{token}", token, expiresAt }`.
- Caller: `handleShareVariant` (`VZ:1856-1882`) sends the viewed variant's `imageUrl`, the compare "before" URL, the room name, the editor's **current** style pick (not the job's label) and the variant's `materials[]`; failure toast *"Could not create share link"*.

### E-58 · Reader — `GET /api/renders/[token]` (public)
- Where: `RTOK:4-36`. No auth; service role. Not found → 404 *"Share link not found"*; expired → 410 `{ error: "This share link has expired", expired: true }`; else returns `snapshot` as the body and bumps `view_count`.
- Caller: the public page `src/app/renders/[token]/page.tsx:46` (A's SHARE).

### E-59 · Share-link states
- **live** (now < `expires_at`) → page renders the snapshot; **expired** → the page's expired state (`page.tsx:92`); **unknown token** → 404. There is no *revoked* state and no studio-side list of links.

## 4 · `render_consultation_requests` — "talk to the designer" leads from a share page

### E-60 · Table `render_consultation_requests`
- Source: `SM/20260410000001_render_share_links.sql:17-26`; no later ALTER.
- Purpose: the public share page's contact form — a homeowner who opened the link leaves name, phone and a message.
- Tenant scope: child of `render_share_links` (no `studio_id`); `M230` locks it via the parent.

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-61 | `id` | uuid PK | no | `gen_random_uuid()` | — |
| E-62 | `share_link_id` | uuid FK → `render_share_links.id` ON DELETE CASCADE | no | — | The link the request came through (resolved from the token). |
| E-63 | `client_name` | text | no | — | Trimmed; required. PII. |
| E-64 | `client_phone` | text | no | — | Trimmed; required; **no format validation** (any non-blank text). PII. |
| E-65 | `message` | text | yes | — | Trimmed, blank → NULL. |
| E-66 | `created_at` | timestamptz | no | `now()` | — |

### E-67 · Index
- `idx_render_consultation_requests_link (share_link_id)`.

### E-68 · RLS / policies
- Born with RLS off. `M226:190` lists it as excluded ("platform / non-tenant"); `M230:25-59` then enables + FORCEs RLS with `scoped_via_parent` (EXISTS on `render_share_links.studio_id = CLAIM`), anon revoked. The writer is service role.

### E-69 · Writer — `POST /api/renders/[token]/consultation` (public)
- Where: `RCONS:5-56`. In-memory rate limit of 5 requests per IP per **minute** — the comment says *"5 per hour per IP"* (`RCONS:8`) but no `windowMs` is passed, so `src/lib/rate-limit.ts:1,12` applies its 60-second default; per server instance (a Map), so not shared across instances. 429 *"Too many requests. Please try again later."*. 400 *"Name and phone are required"*; 404 *"Share link not found"*; 410 *"This share link has expired"*; 500 *"Failed to submit request"*; bad JSON 400 *"Invalid request"*; success `{ success: true }`.

### E-70 · Reader — none
- No route, page, notification, email or lead-creation reads `render_consultation_requests` (grep of `src/` for the table name finds only the writer). The requests are **write-only**: nobody in the studio is told, and they never become leads.

## 5 · `studio_materials` — custom materials saved to the studio library

### E-71 · Table `studio_materials`
- Source: `XM/121_studio_materials.sql:16-60` (table, two partial indexes, comments, `updated_at` trigger) + the `studio-materials` bucket (`:64-72`); no later ALTER.
- Purpose: the studio's library of uploaded material swatches, listed in the editor's material browser next to the stock `MOCK_CATALOGUE` (`VZ:1362`, reader B). Written by the *custom material* upload dialog (`src/components/projects/custom-material-upload-dialog.tsx`, CMD).
- Tenant scope: direct (`studio_id NOT NULL`).
- Types: `DbStudioMaterial` (`DBT:2276-2290`), `StudioMaterial` (`src/types/app.ts:1845-1859`), `transformStudioMaterial` (`src/lib/transformers.ts:3003-3019`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-72 | `id` | uuid PK | no | `gen_random_uuid()` | — |
| E-73 | `studio_id` | uuid FK → `studios.id` ON DELETE CASCADE | no | — | Session's studio (`SMR POST:78`). |
| E-74 | `name` | text | no | — | Trimmed; the dialog defaults it to the suggested name or *Custom material* (`CMD:69`, `CMD:81`); the hook falls back to the file name if blank (`SMQ:104`). |
| E-75 | `category` | text | no | — | Free text by design ("mirrors CATALOGUE_CATEGORIES", `XM/121:11-12`); the dialog offers the 12 stock categories (§18, E-192) and defaults to the selected surface's category, else *Paints* (`CMD:70-72`). Not validated server-side beyond non-blank. |
| E-76 | `image_url` | text | no | — | Public URL in bucket `studio-materials`, path `{studioId}/{uuid}.{ext}` (`SMQ:89-97`). |
| E-77 | `hex` | text | yes | — | Intended dominant colour `#rrggbb` fallback swatch (`XM/121:42-43`). The dialog never sends it → always NULL in practice. |
| E-78 | `roughness` | numeric(3,2) | yes | — | PBR 0…1 for "downstream 3D" (`XM/121:44-45`). **No writer anywhere.** |
| E-79 | `metalness` | numeric(3,2) | yes | — | PBR 0…1. **No writer anywhere.** |
| E-80 | `description` | text | yes | — | Never sent by the dialog → NULL. |
| E-81 | `uploaded_by` | uuid FK → `profiles.id` ON DELETE SET NULL | yes | — | `session.userId` (`SMR POST:84`). Not displayed. |
| E-82 | `is_active` | boolean | no | `TRUE` | Soft delete flag; reads filter `is_active = true` (`SMR GET:35`). |
| E-83 | `created_at` | timestamptz | no | `now()` | Sort (newest first, `SMR GET:38`). |
| E-84 | `updated_at` | timestamptz | no | `now()` | Bumped by trigger `trg_studio_materials_set_updated_at` → `studio_materials_set_updated_at()` BEFORE UPDATE (`XM/121:50-60`). |

### E-85 · Indexes on `studio_materials`
- `idx_studio_materials_studio (studio_id) WHERE is_active = TRUE`; `idx_studio_materials_category (studio_id, category) WHERE is_active = TRUE` (`XM/121:32-36`).

### E-86 · RLS / policies on `studio_materials`
- Born with RLS off (none in `XM/121`, not in `M092`). `M226:54` (B1): ENABLE + FORCE, `scoped` on `studio_id`, anon revoked. The bucket's own policies: §16.

### E-87 · Writer — `POST /api/studio-materials/records`
- Where: `SMR` `route.ts:52-99`. Body `{ name*, category*, imageUrl*, hex?, description? }` → 400 *"name, category and imageUrl are required"*. Returns the transformed row.
- Caller: `useUploadStudioMaterial` (`SMQ:84-122`): uploads the file to `studio-materials` first, then inserts; if the insert fails it deletes the uploaded object (`SMQ:111-115`). Dialog toasts: success *"Saved "{name}" to your studio library"*; failure *"Could not save to library — using for this render only."* (falls back to a session-only material, `CMD:88-103`).
- Rule drift: `XM/121:7-9` and `SMQ:9-11` say only Owner / Admin may save to the library; the dialog hard-codes `canSaveToLibrary = true` — **every member saves**, and the *save to library* box starts ticked (`CMD:58-64`, `CMD:73-75`).

### E-88 · Writer — `DELETE /api/studio-materials/records/[id]` (soft delete)
- Where: `SMR [id]/route.ts:13-39`: `update { is_active: false }`; the object stays in the bucket (`SMQ:124-128`).
- Caller: `useDeleteStudioMaterial` (`SMQ:129-142`) — **imported nowhere**: there is no way in the UI to remove a library material.

### E-89 · Reader — `GET /api/studio-materials/records`
- Where: `SMR route.ts:22-50`, optional `?category=`. Hook `useStudioMaterials(studioId?, category?)` (`SMQ:50-63`, query key `["studio-materials", sid, category ?? "all"]`, stale 60 s); the editor calls it with no category (`VZ:1362`).

## 6 · `studio_material_catalog` — the studio's product catalogue (sandbox-only for the visualizer)

### E-90 · Table `studio_material_catalog`
- Source: `XM/194_studio_material_catalog.sql:18-37` (header says "183"); `vendor_id` + index from `XM/312_vendors_kind_and_catalog_link.sql:80-84` (down file `312_…_down.sql:13`); merge function `XM/313_merge_vendors_fn.sql:235`.
- Purpose: reusable selection options (Project › Management › Materials, Accounts' catalogue manager). Its only visualizer use is `catalogue[]` product references in `POST /api/render/auto-furnish` (`src/lib/catalogue-furnish.ts`, max 4 picks) — sent **only by the internal sandbox** `/tools/auto-furnish-sandbox`; the shipped editor's Auto Furnish never sends catalogue picks (`VZ` has no catalogue-picker import).
- Tenant scope: direct. Types `DbStudioMaterialCatalogItem` (`DBT:2294-2311`), `StudioMaterialCatalogItem` (`src/types/app.ts:1864-1882`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-91 | `id` | uuid PK | no | `gen_random_uuid()` | — |
| E-92 | `studio_id` | uuid FK → `studios.id` ON DELETE CASCADE | no | — | — |
| E-93 | `name` | text | no | — | 400 *"Material name is required"*. |
| E-94 | `category` | text | no | — | Free text; 400 *"Material category is required"*. |
| E-95 | `vendor` | text | yes | — | Brand / showroom string; kept forever as the display fallback. |
| E-96 | `vendor_id` | uuid FK → `vendors.id` ON DELETE SET NULL | yes | — | Migration 312 link, backfilled from `vendor`; sent sparsely (fork-safety, `MCR route.ts:69-88`). |
| E-97 | `image_url` | text | yes | — | Public URL in `studio-materials` under a `catalog/` prefix (`XM/194:13-14`, `:41-42`). |
| E-98 | `price_cents` | integer | yes | — | Default unit price in cents. |
| E-99 | `specs` | text | yes | — | Free text. |
| E-100 | `is_active` | boolean | no | `TRUE` | Soft delete (`MCR [id]/route.ts:80-82`). |
| E-101 | `created_by` | uuid FK → `profiles.id` ON DELETE SET NULL | yes | — | `session.userId`. |
| E-102 | `created_at` | timestamptz | no | `now()` | — |
| E-103 | `updated_at` | timestamptz | no | `now()` | **No trigger** (unlike `studio_materials`); the soft delete sets it by hand (`MCR [id]/route.ts:81`). |

### E-104 · Indexes / RLS on `studio_material_catalog`
- `idx_studio_material_catalog_studio (studio_id) WHERE is_active`, `idx_studio_material_catalog_category (studio_id, category) WHERE is_active` (`XM/194:33-37`), `idx_material_catalog_vendor (vendor_id) WHERE vendor_id IS NOT NULL` (`XM/312:84`).
- RLS: born off; `M226:54` B1 `scoped`, FORCE, anon revoked.

## 7 · `homeowner_project_links` — the door a render goes through to the portal (visualizer-relevant columns)

### E-105 · Table `homeowner_project_links`
- Source: `SM/20260323000001_homeowner_portal.sql:22-38`; ALTERs `SM/20260510000003_homeowner_links_lead_only.sql:17-47` (project optional, CHECK, partial uniques, `idx_hpl_lead`), `SM/20260520000002_scope_invite_throttle.sql:12-13`, `SM/20260521000003_homeowner_project_links_primary_unique.sql:30-32`, `XM/273_ho_unpublish_support.sql:9`; rows auto-created for every lead with a phone by the trigger `auto_bind_homeowner_for_lead()` (`SM/20260521000001_auto_bind_homeowner_for_leads.sql`); profiles re-scoped per studio by `XM/151_homeowner_profiles_studio_scoped.sql`.
- Purpose: homeowner ↔ project / lead ↔ studio. The visualizer only reads it: *Share to portal* needs the project's first active link (`HL active-link`), and shared assets hang off `id`.
- Tenant scope: direct (`studio_id NOT NULL`). Type `DbHomeownerProjectLink` (`DBT:2133-2146`).

| Row | Column | Type | Null | Default | Meaning (for the visualizer) |
|---|---|---|---|---|---|
| E-106 | `id` | uuid PK | no | `gen_random_uuid()` | Parent of `homeowner_shared_assets.project_link_id`. |
| E-107 | `homeowner_id` | uuid FK → `homeowner_profiles.id` CASCADE | no | — | The homeowner (whose likes / comments are stamped with it). |
| E-108 | `project_id` | uuid FK → `projects.id` CASCADE | **yes** since `20260510000003` (was NOT NULL) | — | *Share to portal* resolves links by `project_id` only (`HL active-link:36`), so it is **project-only**: a lead-stage render cannot be shared to the portal even though lead-only links exist (the editor gates the action on `projectId`, `VZ:1895`). |
| E-109 | `studio_id` | uuid FK → `studios.id` CASCADE | no | — | Tenant. |
| E-110 | `lead_id` | uuid FK → `leads.id` SET NULL | yes | — | Lead-only links (CHECK `hpl_project_or_lead`: project or lead must be set). |
| E-111 | `role` | text | yes | `'primary'` | `primary` (unique per `(studio_id, lead_id)` when `lead_id` set). |
| E-112 | `portal_token` | text | yes | — | Not used by the visualizer. |
| E-113 | `chat_history_visible` | boolean | yes | `false` | Not used by the visualizer. |
| E-114 | `is_active` | boolean | yes | `true` | *Share to portal* picks `is_active = true` … `.limit(1)` with **no order** (`HL active-link:33-39`) — with several active links (couple / family) the asset lands on an arbitrary one; portal reads gather across every link of the project so it still shows (`src/lib/homeowner-route-auth.ts:83-92`). |
| E-115 | `linked_at` | timestamptz | no | `now()` | — |
| E-116 | `last_questionnaire_invite_at` | timestamptz | yes | — | Questionnaire throttle (not visualizer). |
| E-117 | `last_seen_at` | timestamptz | yes | — | Last portal open (not visualizer). |

### E-118 · Indexes / RLS on `homeowner_project_links`
- `idx_hpl_homeowner`, `idx_hpl_project`, `idx_hpl_studio`, `idx_hpl_lead`; partial uniques `hpl_unique_homeowner_project (homeowner_id, project_id) WHERE project_id IS NOT NULL`, `hpl_unique_homeowner_lead_only (homeowner_id, lead_id) WHERE project_id IS NULL AND lead_id IS NOT NULL`, `hpl_unique_primary_per_lead (studio_id, lead_id) WHERE lead_id IS NOT NULL AND role = 'primary'`.
- RLS: `M226:171-178` deferred it; `M229:35-56` `scoped` on `studio_id`, FORCE, anon revoked. Portal routes are service role.

## 8 · `homeowner_shared_assets` — renders pushed to the homeowner portal, with the homeowner's feedback

### E-119 · Table `homeowner_shared_assets`
- Source: `SM/20260323000001_homeowner_portal.sql:42-55`; `likes` + `comments` added by `XM/195_render_feedback.sql:14-18` (header says "184"); **annotations have no migration** — they live in `metadata.annotations` (`DBT:2163-2165`; the "migration 209" in comments across the code refers to no real annotations migration — both `XM/209_*` files are about grants / VO GST).
- Purpose: one card in the homeowner portal's design feed. The visualizer's *Share to portal* (any result: a render, the working image, a Defurnish or Relight result — `VZ:1883-1956`) and the co-pilot's share (`QC:559-609`) both write `asset_type = 'render'` rows; Files & Docs' *Show to homeowner* toggle writes and deletes the same rows (`HL share-render:55-58`, `:96-108`).
- Tenant scope: child of `homeowner_project_links` (no `studio_id`). Types `DbHomeownerSharedAsset` (`DBT:2148-2166`), `HomeownerSharedAsset` (`src/types/app.ts:3745-3761`), `transformHomeownerSharedAsset` (`src/lib/transformers.ts:2859-2882`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-120 | `id` | uuid PK | no | `gen_random_uuid()` | The `assetId` in the homeowner feedback routes. |
| E-121 | `project_link_id` | uuid FK → `homeowner_project_links.id` CASCADE | no | — | The link it was shared through (E-114: arbitrary first active link). |
| E-122 | `asset_type` | text | no | — | Comment lists `'render', 'floor_plan', 'mood_board', 'photo', 'document'`; **only `render` is ever written** by app code (`HL share-render:78`). The portal's design tab shows `render` · `mood_board` · `photo` (`src/app/my/projects/[projectId]/page.tsx:1604`); documents tab reads `document` (`HOAPI documents/route.ts:107`). |
| E-123 | `title` | text | yes | — | Visualizer: *{room name} - {suffix}* where suffix = the passed title suffix (e.g. *Relit*), else the current style, else *Render* (`VZ:1938`); route default *Render*. Co-pilot: the visual's title. |
| E-124 | `description` | text | yes | — | Never written by the share route. |
| E-125 | `url` | text | no | — | Public `renders` URL; a `data:` result is first uploaded to `renders/{studioId}/{entityId}/shared/{uuid}.png` (`VZ:1898-1906`); **if that upload fails the full base64 data URL is stored** (`VZ:1887-1893`). Idempotency key with `project_link_id` + `asset_type` (`HL share-render:59-72` → `{ ok: true, alreadyShared: true }`). |
| E-126 | `thumbnail_url` | text | yes | — | Same as `url` (no separate thumbnail is made). |
| E-127 | `metadata` | jsonb | yes | — | NULL at share time; the feedback routes create `{ annotations: [...] }` (§17, E-187). The CREATE comment's `{ floorPlanToken, renderSettings }` keys are never written. |
| E-128 | `shared_by` | uuid FK → `studio_members.id` SET NULL | yes | — | From `GET /api/identity/members/me` (`VZ:1926-1930`), null-safe. The portal resolves it to a name through `studio_members.user_id` → `profiles.full_name` (`HOAPI design/route.ts:46-80`). |
| E-129 | `shared_at` | timestamptz | no | `now()` | Feed order (newest first). |
| E-130 | `likes` | jsonb | no | `'[]'` | `RenderLike[]` — one entry per homeowner, toggled (§17, E-185). |
| E-131 | `comments` | jsonb | no | `'[]'` | `RenderComment[]` — render-level thread, homeowner-written (§17, E-186). |

### E-132 · Indexes / RLS on `homeowner_shared_assets`
- `idx_hsa_link (project_link_id)` only; nothing on `url` although share / unshare look rows up by it.
- RLS: `M226:171-178` deferred; `M229:59-94` `scoped_via_parent` (EXISTS link with `studio_id = CLAIM`), FORCE, anon revoked. Homeowner routes use the service role (`createServerSupabase`) and gate by `requireRealHomeowner` + `getProjectLinkIds`.

### E-133 · Writer — `POST /api/homeowner-links/share-render` (studio)
- `HL share-render:19-94`. Body `{ projectId*, projectLinkId*, url*, title?, thumbnailUrl?, sharedBy? }` → 400 *"projectId, projectLinkId and url are required"*; link must pair with the project → 404 *"Homeowner link not found"*; duplicate (same link + `render` + url) → `{ ok: true, alreadyShared: true }`; else insert `asset_type 'render'`.
- Editor messages: *"Failed to share to portal"*, *"No homeowner linked to this project"*, success *"Shared to homeowner portal"*, catch-all *"Failed to share"* (`VZ:1912-1952`). Gate: `projectId` present and the page switch `tools/homeowner-portal` on (`homeownerPortalEnabled = isPageEnabled("tools/homeowner-portal")`, `VZ:1278`; buttons at `VZ:4818`, `VZ:5011`, `VZ:5616`, `VZ:5855`; reader C).

### E-134 · Writer — `DELETE /api/homeowner-links/share-render` (studio unshare)
- `HL share-render:109-151`. Body `{ projectId*, url* }` → deletes every `render` row with that URL across all the project's links; returns `{ ok: true, removed: n }`. Discards the likes, comments and pins on it (accepted, `:105-107`). Used by Files & Docs' hide toggle, not by the editor.

### E-135 · Reader — `GET /api/homeowner-links/shared-renders?projectId=` (studio)
- `HL shared-renders:28-60`: all assets (any `asset_type`, despite the name) across the project's links, newest first, transformed; `useProjectSharedRenders` (`QP:1067-1089`) → the project page's feedback panel (`src/components/projects/shared-render-feedback.tsx`, A's SRF).

### E-136 · Writer — `/api/homeowner-links/render-annotations` (studio pins)
- `HL render-annotations:145-276`. POST `{ projectId, assetId, x, y, body }` (x, y in 0…1 else 400 *"Pin position is out of range"*; *"Note cannot be empty"*; > 2000 chars *"Note is too long"*; ≥ 100 pins → 409 *"This render has too many pins already"*); PATCH `action:"reply"` (*"Reply cannot be empty"* / *"Reply is too long"*) or `action:"status"` (`open` | `resolved`, else *"status must be 'open' or 'resolved'"*); DELETE only the studio's own pins (403 *"You can only remove your own pins"*); missing pin 404 *"Pin not found"*; foreign asset 404 *"Render not found"*. Identity stamped server-side: `authorRole 'studio'`, `homeownerId null`, `authorName` = `profiles.full_name` or *Studio*. Whole `metadata` object rewritten (read-modify-write, no lock).

### E-137 · Writers — homeowner feedback routes (portal)
- `HOAPI renders/[assetId]/like/route.ts:15-69`: toggles the homeowner's entry → `{ liked, likeCount }`; real homeowners only (preview sessions refused by `requireRealHomeowner`).
- `…/comment/route.ts`: appends `{ id, authorRole:'homeowner', homeownerId, authorName, body, createdAt }`; *"Comment cannot be empty"*, > 2000 *"Comment is too long"*.
- `…/annotations/route.ts`: homeowner pin (same range / 2000-char / 100-pin rules, `:17`, `:34-41`, `:69-70`).
- `…/annotations/[annotationId]/route.ts`: PATCH status (`open`/`resolved`, else *"Invalid status"*); DELETE own pins only (`authorRole 'homeowner'` **and** same `homeownerId`, `:98-101`).
- `…/annotations/[annotationId]/comments/route.ts`: reply (*"Reply cannot be empty"*, > 2000 *"Reply is too long"*).
- All read-modify-write the JSON arrays with no concurrency guard ("low-concurrency portal", `like/route.ts:47-48`).

### E-138 · Readers — the portal
- `HOAPI design/route.ts:28-40` (all assets across the project's links, newest first, author names resolved), `src/app/api/homeowner/dashboard/route.ts:137-149`, `HOAPI documents/route.ts:104-107` (`document` only). Rendering + the pin UI: `src/components/homeowner/render-annotator.tsx` (A's RAH); studio side `src/components/projects/render-annotator-studio.tsx` (A's RAS / C's ANN).
- No notification either way: sharing a render writes no homeowner notification (the preference `homeowner_notification_preferences.design_assets` exists, `SM/20260323000001_homeowner_portal.sql:68`, but no code reads it), and a homeowner's like / comment / pin writes no studio notification (no notification code under `HOAPI …/renders/**` or `HL/**`); the studio sees feedback only by opening the project's shared-renders panel.

## 9 · `copilot_visual_assets` — co-pilot renders and mood boards (they flow into the visualizer's tables)

### E-139 · Table `copilot_visual_assets`
- Source: `SM/20240301000008_copilot_phase3_tables.sql:8-21` and an identical copy `XM/078_copilot_phase3_tables.sql:8-21` (diffed: same DDL). No ALTER. (The brief pointed at `SM/20260503000014_moodboard.sql` — that file creates `homeowner_moodboard_items`, a different, portal-side table; see E-166.)
- Purpose: visuals made during a live co-pilot meeting (mAIson Live): `ai_render` (`CPR`), `mood_board` (`CPM`), `portfolio_match` (only in mocks / tests, `src/lib/copilot/mock.ts`). When the meeting is bound to a project, each render / mood board is also written into `render_jobs` (E-21 / E-22) and `project_files` (E-152).
- Tenant scope: child of `copilot_sessions` via `session_id` (no `studio_id`); routes guard with `isCopilotSessionOwned` (`src/lib/copilot/session-ownership.ts`). Types `DbCopilotVisualAsset` (`DBT:1977-1988`), `CopilotVisualAsset` + `VisualAssetType` (`src/types/app.ts:3443-3456`).

| Row | Column | Type | Null | Default | Meaning |
|---|---|---|---|---|---|
| E-140 | `id` | uuid PK | no | `gen_random_uuid()` | Minted in the route (`crypto.randomUUID()`, `CPR:129`, `CPM:146`). |
| E-141 | `session_id` | uuid FK → `copilot_sessions.id` ON DELETE CASCADE | no | — | The meeting. |
| E-142 | `type` | text | no | — | `ai_render` · `mood_board` · `portfolio_match` (`VisualAssetType`). |
| E-143 | `title` | text | no | — | Render: *{first two styles joined " + "} Room Render* or *AI Room Render* (`CPR:131-133`). Mood board: *{first three keywords joined " + "} Mood Board* (`CPM:147`). |
| E-144 | `description` | text | yes | `''` | Render: *AI-generated render with {styles} style* (`CPR:134`); mood board: the designer's prompt, else *AI-generated mood board for: {keywords} ({propertyType})*. |
| E-145 | `image_urls` | text[] | yes | `'{}'` | `[publicUrl]` in `renders/{studioId}/copilot/{sessionId}/{uuid}.{ext}`; if the upload failed, the raw data URL; if generation failed, the placeholder `/J-4.jpg` (`CPR:176-180`). |
| E-146 | `metadata` | jsonb | yes | `'{}'` | See §17 (E-188). |
| E-147 | `source` | text | yes | `'ai_detected'` | Always `ai_detected` from these routes. |
| E-148 | `status` | text | yes | `'active'` | Always `active`; readers filter `status = 'active'` (`CPG:32`, `src/app/api/copilot/poll/route.ts:78`). No writer ever changes it. |
| E-149 | `created_at` | timestamptz | yes | `now()` | Gallery order (newest first). |

### E-150 · Indexes / RLS on `copilot_visual_assets`
- `idx_copilot_visual_assets_session (session_id)`.
- RLS: phase 0 era; `XM/225_lock_copilot.sql:160-180` `scoped_via_parent` (EXISTS `copilot_sessions.studio_id = CLAIM`), FORCE, anon revoked. Delete of a session cascades (`XM/281_copilot_summary_entries_cascade.sql:18` lists it as CASCADE).

### E-151 · Writers and readers of `copilot_visual_assets`
- Writers: `POST /api/copilot/render` (`CPR:182-199`), `POST /api/copilot/moodboard` (`CPM:192-209`). Both return 404 *"Session not found"* for a foreign session, 500 *"Failed to create render"* / *"Failed to create mood board"*; DRY_RUN (no `OPENROUTER_API_KEY` or a `dry-run-…` session) returns a canned asset and writes nothing.
- Readers: `GET /api/copilot/moodboard/gallery` (`CPG:24-33`: `mood_board` + `ai_render`, active, the studio's sessions, `?q=` filters title / description / `metadata.styleKeywords` in memory), `GET /api/copilot/poll` (`:75-78`), public `GET /api/copilot/share/[shareId]` (`:47`, via `copilot_share_links`).
- Outbound to the portal: `useShareVisualToPortal` (`QC:559-609`) → `homeowner_shared_assets` with `asset_type 'render'` even for a mood board.

## 10 · `project_files` — the *Renders* folder rows

### E-152 · Table `project_files` (visualizer-relevant use)
- Source: two conflicting creates — `SM/20240101000006_projects.sql:84-95` (legacy names `file_url`, `mime_type`, `category`, `uploaded_at`) and `SM/20260419000004_project_files.sql:2-16` (new names, a no-op where the legacy table existed); `XM/148_project_files_align_columns.sql:13-21` renames legacy → new and adds `approval_status`; `XM/207_homeowner_visible_files.sql:15-16` adds `is_homeowner_visible`. `XM/006_projects.sql` mirrors the first create.
- Purpose here: every saved visualizer variant (project context only) and every co-pilot render / mood board of a project-bound meeting becomes a file in folder *Renders*, so it appears in Project › Files and in the tool-entry dialog's past renders (`src/lib/queries/project-renders.ts:12-19`, folder starts with "render").
- Tenant scope: direct. Type `DbProjectFile` (`DBT:2596-2610`).

| Row | Column | Type | Null | Default | Meaning for render rows |
|---|---|---|---|---|---|
| E-153 | `id` | uuid PK | no | `gen_random_uuid()` | — |
| E-154 | `project_id` | uuid FK → `projects.id` CASCADE | no | — | The project. |
| E-155 | `studio_id` | uuid FK → `studios.id` | no | — | Session's studio. |
| E-156 | `folder` | text | no | `'all'` (new create) / `'document'` (legacy `category`) | Visualizer + co-pilot write *Renders* (`VZ:2811`, `CPR:236`, `CPM:246`). The files route lower-cases and hyphenates it to the chip id `renders` (`src/app/api/projects/[id]/files/route.ts:95-101`). |
| E-157 | `file_name` | text | no | — | Visualizer: *Render - {room} - {style or "Style"} - v{variant id}.png* (`VZ:2810-2811`); co-pilot: *AI Render — {title}.png* / *Moodboard — {title}.png*. The files route decides "is an image" from the extension. |
| E-158 | `file_size` | bigint | yes | — | Never sent for renders (NULL). |
| E-159 | `file_type` | text | yes | — | Visualizer rows get **`document`** — `autoFileToProject` defaults `fileType` to `"document"` and the editor does not pass one (`src/lib/finance-auto-file.ts:55`); co-pilot rows get `image` (`CPR:239`, `CPM:249`). |
| E-160 | `storage_path` | text | no | — | The **full public `renders` URL** (not a bucket path) — the file routes let `https://` values through unsigned (`is_public_render_url`, `files/route.ts:148-171`). If the editor had no URL it would fall back to `auto-filed/render/{jobId}` (`finance-auto-file.ts:42-46`), but the editor always passes one. The job id (`sourceId`) is **not stored** anywhere on the file row. |
| E-161 | `uploaded_by` | uuid FK → `profiles.id` | yes | — | `session.userId`. |
| E-162 | `approval_status` | text | no (after 148) | `'none'` | `none`. |
| E-163 | `is_homeowner_visible` | boolean | no | `FALSE` | Off; Files' *Show to homeowner* toggle for a render uses `homeowner_shared_assets` instead (E-134). |
| E-164 | `created_at` | timestamptz | yes | `now()` | — |
- Indexes: `idx_project_files_project (project_id, folder)` / `idx_project_files_project_folder` (after 148), `idx_project_files_studio`, `idx_project_files_homeowner_visible (project_id) WHERE is_homeowner_visible`. RLS: `012_rls` / `SM/…013_rls` policies → `M092:117` phase 0 → `M226:42` `scoped`.
- Lifecycle: deleting a render or a room in the editor does **not** delete its file row — Files keeps showing a render the gallery no longer has (and, after a room delete, a broken image because the object was removed, `VZ:2292-2315`).

## 11 · `lead_files` — not written by the visualizer

### E-165 · Table `lead_files`
- Source: `SM/20240101000004_leads.sql:41-51` (= `XM/004_leads.sql`); `is_homeowner_visible` from `XM/207:18-19`; lock `XM/219_lock_lead_files.sql`; bucket `lead-files` from `XM/088_lead_files_storage.sql` (privatised by `233`).
- Columns: `id` uuid PK · `lead_id` uuid NOT NULL FK → `leads` CASCADE · `studio_id` uuid NOT NULL FK → `studios` CASCADE · `file_name` text NOT NULL · `file_url` text NOT NULL · `file_size` bigint · `mime_type` text · `uploaded_by` uuid FK → `profiles` SET NULL · `uploaded_at` timestamptz NOT NULL `now()` · `is_homeowner_visible` boolean NOT NULL `FALSE` (`DbLeadFile`, `DBT:203-215`).
- Visualizer relation: **none** — lead-context renders are never auto-filed (the editor files only when `projectId`, `VZ:2807`). After handover the project Files tab merges the lead's files and guesses a *renders* folder only for images whose **name** contains "render" (`files/route.ts:26-37`, `:113-134`). So a lead's renders exist only in `render_jobs`, reachable only from the visualizer.

## 12 · Tables touched in passing

### E-166 · `homeowner_moodboard_items` (portal-side, not the visualizer)
- `SM/20260503000014_moodboard.sql:3-12`: `id` uuid PK · `homeowner_id` FK → `homeowner_profiles` CASCADE · `project_link_id` FK → `homeowner_project_links` CASCADE · `image_url` text NOT NULL · `caption` text · `created_at` timestamptz NOT NULL `now()`; index `idx_moodboard_link`; RLS `M229` `scoped_via_parent`. The homeowner's own pinboard; no visualizer code writes it.

### E-167 · `messages` (Send to chat)
- The full-screen viewer's *Send to chat* posts a plain-text message *AI Render - {room}\n{imageUrl}* into the project's linked conversation through the inbox's `sendMessage` (`VZ:1844-1851`) — no attachment row, the image is just a URL in the body. Reader C owns the flow.

### E-168 · `profiles` · `studio_members` · `studios` (reads)
- `profiles.email, phone` (share snapshot contact, `RSHARE:43-47`); `profiles.full_name` (studio pin author, `HL render-annotations:115-131`); `studio_members.id` of the current user (`/api/identity/members/me`, for `shared_by`); `studios.name, settings, country_code` (share snapshot branding, `RSHARE:28-32`).

### E-169 · `copilot_sessions` (reads)
- `project_id, lead_id` of the meeting decide whether a co-pilot visual is mirrored into `render_jobs` / `project_files` (`CPR:121-127`); `studio_id` ownership guard.

## 13 · `usage_events` — `feature_key = 'ai_visualizer'`

### E-170 · Table `usage_events`
- Source: `XM/236_usage_events.sql:4-39` (WS-H: RLS + FORCE, policy `usage_events_scoped` on `studio_id = CLAIM`, `REVOKE ALL FROM anon`); 90-day retention by the cron `src/app/api/cron/usage-retention/route.ts:16`; daily rollup `XM/238_usage_daily_rollup.sql` + `src/lib/usage/rollup.ts:22-26`.
- Columns: `id` uuid PK `gen_random_uuid()` · `studio_id` uuid NULL FK → `studios` CASCADE · `user_id` uuid NULL FK → `profiles` SET NULL · `session_id` uuid NULL · `event_type` text NOT NULL · `feature_key` text NULL · `properties` jsonb NOT NULL `'{}'` · `route` text NULL · `occurred_at` timestamptz NOT NULL `NOW()` (`DbUsageEvent`, `DBT:3008-3018`).
- Indexes: `idx_usage_events_studio_time (studio_id, occurred_at DESC)`, `idx_usage_events_user_time (user_id, occurred_at DESC)`, `idx_usage_events_feature (feature_key, occurred_at DESC) WHERE feature_key IS NOT NULL`, `idx_usage_events_session (session_id) WHERE session_id IS NOT NULL`.

### E-171 · The visualizer's three events
- Only the surgical render route writes them: `src/app/api/render/route.ts:30-34` through `runGenerate` hooks → `track()` (`src/lib/usage/track.ts:13-38`, scoped client).
  - `feature_opened` · `properties { source: "api" }` · at the start of a generation (so "opened" = "a render was requested", not "the page was opened").
  - `feature_succeeded` · `properties { render_ms }`.
  - `feature_failed` · `properties { error: <message> }`.
- **Not tracked**: restyle, style transfer, relight, defurnish (declutter), Auto Furnish, sketch render (`photorealistic`), detection, segmentation — none of `src/app/api/render/*/route.ts` calls `track` (grep 2026-09-25). The admin funnel therefore counts only surgical renders.
- Funnel definition: `src/lib/usage/funnels.ts:18-25` (entry at `:19`) — *AI Visualizer*: step `opens` *Opened*, step `successes` *Render generated*; rollup keys `feature.ai_visualizer.opens|successes|failures` (`rollup.ts:24-26`). `FeatureKey` union `src/lib/usage/types.ts:63-72`.

## 14 · `platform_config` — global page visibility

### E-172 · Table `platform_config`
- Source: `XM/051_platform_config.sql:2-36`; more keys seeded by `XM/053_seed_audit_and_settings.sql:19-26` (banner, default prompt, auto refund, lead sources, marketplace categories), `XM/278_brand_dossiers.sql:51` (`quote_xray_brand_ammo_enabled`); lock `XM/264_platform_table_lockdown.sql` (RLS enabled **without** FORCE, no policies, all DML revoked from anon **and** authenticated → service role only).
- Columns: `key` text PK · `value` jsonb NOT NULL `'{}'` · `updated_at` timestamptz NOT NULL `now()`.
- Tenant scope: none (platform-wide).

### E-173 · Key `page_visibility` → `"tools/ai-visualizer": true`
- Seeded `true` (`XM/051:20`). Written by the platform admin (`src/app/api/admin/page-visibility/route.ts:22-72`, the admin Settings list labels it *AI Visualizer*, `src/app/admin/settings/page.tsx:37`).
- Read by `GET /api/config/pages` (`src/app/api/config/pages/route.ts:11-26`) and by the ID Buddy chat (`src/app/api/buddy/chat/route.ts:155-157`).

### E-174 · Visibility resolution rule
- `merged = { ...platform page_visibility, ...studios.settings.page_visibility }` — the studio wins (`config/pages/route.ts:48-50`); `isPageEnabled(key)` strips a leading `/` and returns `pages[key] !== false`, so a **missing key means visible** (`src/context/platform-config-context.tsx:46-51`).
- The visualizer also reads `tools/homeowner-portal` (E-133) — a key the platform seed does not contain, so it is on unless a studio switches it off.
- Role gate on top (not data): `src/lib/access-control.ts:108` `"tools/ai-visualizer": ["owner", "admin", "id"]`, overridable by `studio_roles` page permissions (reader A).

## 15 · `studios.settings` keys the visualizer reads or writes

### E-175 · `studios.settings.visualizerWorkspace` (JSONB key, no migration)
- Shape: §17 (E-184). Written only by `PUT /api/visualizer/workspace` (read-modify-write server-side so sibling keys survive, `WSR:97-136`); the client computes the whole next object (`WSQ:140-151`) — two tabs editing at once overwrite each other (last write wins, no version check).
- Mutations: create session (`WSQ:153-165`, name from the page), create folder (`:167-178`), delete folder (sessions fall back to Unfiled, `:180-187`), move sessions to a folder (`:189-194`), rename session (`:196-201`, bumps `updatedAt`), add room to session (`:204-210`), delete session (also deletes its rooms' jobs and rows, **not** their images, `:212-229`).
- Not typed in `DbStudioSettings`.

### E-176 · `studios.settings.page_visibility` (per-studio override)
- Shape `Record<pageKey, boolean>`; written by the platform admin per studio (`src/app/api/admin/studios/[id]/page-visibility/route.ts:63-75`; keys listed in `src/app/admin/studios/[id]/page.tsx:72`, `:132`) only — studios cannot switch pages themselves; `tools/homeowner-portal` is also admin-set, and the portal page just reads it (`src/app/(main)/tools/homeowner-portal/page.tsx:34-50`: *"This feature isn't enabled for your studio. Contact OpenMaison support if you'd like to turn it on."*).

### E-177 · `studios.settings.branding` (read into share snapshots)
- Keys read by `RSHARE:40-63`, each with a snake_case fallback: `logoUrl|logo_url`, `primaryColor|primary_color` (default `#5500FF`), `companyName|company_name` (fallback `studios.name`), `tagline`, `companyAddress|company_address`. Legacy `settings.client_portal` is the whole-object fallback (console warning *"… still has legacy settings.client_portal — run migration 115"*). Full `StudioBranding` type: `src/types/app.ts:4156+`.

## 16 · Storage — buckets, limits, policies and path patterns

### E-178 · Bucket `renders`
- Created `XM/123_storage_buckets_and_policies_audit.sql:33-41`: **public = true**, `file_size_limit 10485760` (10 MB), `allowed_mime_types ['image/jpeg','image/png','image/webp']` (no GIF, although `UPV:33-39` maps `image/gif` → `.gif`, so a GIF co-pilot image would be refused and fall back to the data URL).
- Policies: `M092:135-139` `phase0_renders_select|insert|delete|update` (bucket-wide, any role); `XM/232_revoke_storage_anon_writes.sql` drops every non-SELECT policy on `storage.objects` (writes only through service-role routes); `233` / `235` leave `renders` public on purpose (`233:20-22`, `235:13-15`).
- Write paths: browser → `POST /api/storage/upload` (`src/app/api/storage/upload/route.ts:22-64`: bucket must match `/^[a-z0-9][a-z0-9-]{1,62}$/`, path must start `{session.studioId}/` and contain no `..` → 403 *"Path must be under the session studio's prefix"*; uploads with the service role, `upsert` from the form, content type = the blob's type; returns `{ path, publicUrl }`). Server → `UPV` (service role). Deletes → `POST /api/storage/remove` (`src/app/api/storage/remove/route.ts:23-48`, same prefix rule, *"All paths must be under the session studio's prefix"*).
- Reads: public URL `…/storage/v1/object/public/renders/{path}` (`src/lib/storage-client.ts:58-62`) — anyone with the URL can see a render, forever (no expiry, no signing), including renders shared through an expired share link.

### E-179 · Path patterns in `renders` (confirmed from code)
| Pattern | Written by | Upsert | Notes |
|---|---|---|---|
| `{studioId}/{entityId}/rooms/{roomId}/original.{png\|jpg}` | photo upload / swap (`VZ:2446-2450`) | yes | `png` when the cropped image is PNG, else `jpg`. Overwritten on swap → same URL → browsers may show the cached old photo. |
| `{studioId}/{entityId}/rooms/{roomId}/jobs/{jobId}/variant-{variantId}.png` | every persisted pass (`VZ:2775-2776`) | no | Always named `.png` whatever the model returned (the bytes keep their real content type). |
| `{studioId}/{entityId}/rooms/{roomId}/jobs/{jobId}/variant-1-edit-{epochMs}.png` | relight live-edit overwrite (`VZ:2993-2995`) | yes | Fresh name per edit to defeat the browser cache; the previous file is **not** deleted. |
| `{studioId}/{entityId}/shared/{uuid}.png` | *Share to portal* of an unsaved (data URL) result (`VZ:1902-1903`) | no | `entityId` is the project here (sharing needs a project). Never deleted. |
| `{studioId}/copilot/{sessionId}/{uuid}.{png\|jpg\|webp\|gif}` | co-pilot render / mood board (`UPV:83`) | no | Service-role upload. |
- `{entityId}` = `projectId`, else `leadId`, else the visualizer **session id** from `visualizerWorkspace` (`VZ:1496-1499`) — so standalone rooms sit under a folder named after a JSON-only id.
- Deletion: room delete parses each URL after `/renders/` and removes it (`VZ:2292-2315`); variant delete, session delete, project / lead delete remove nothing.

### E-180 · Bucket `studio-materials`
- Created `XM/121_studio_materials.sql:64-72`: **public = true**, 5 MB (`5242880`), `['image/jpeg','image/png','image/webp']`. Policies `phase0_studio_materials_*` added by `XM/123:57-65`; writes locked by `232`; stays public (`233:20-21`).
- Paths: library materials `{studioId}/{uuid}.{ext}` (ext from the file name, default `jpg`, lower-cased — `SMQ:89-90`); catalogue images under a `catalog/` prefix per `XM/194:13-14`, `:41-42` (the exact catalogue path is built by the catalogue manager, not the visualizer — not verified here).
- Soft-deleting a material leaves the object (`SMQ:124-128`).

### E-181 · Other buckets the visualizer's data points into
- `project-files` / `lead-files` (private since `233`) are **not** used for renders: render file rows store the public `renders` URL in `storage_path` (E-160).

## 17 · JSON shapes (every key)

### E-182 · `render_jobs.variants_json` — as actually stored
```ts
type VariantsJson = StoredVariant[]            // never empty in practice; [] is the column default
type StoredVariant = {
  id: number                                   // 1…n inside the job (not globally unique); the UI's V-number is computed across the room
  imageUrl: string                             // public renders URL (the editor uploads data: URLs before the insert)
  materials: {                                 // [] for restyle / style transfer / Auto Furnish / relight / defurnish / sketch / co-pilot
    label: string                              // surface label, e.g. "Back wall"
    material: string                           // stock catalogue item name, or a custom material's name ("Custom 1"); "" if the custom was lost
    description?: string                       // stock only: the catalogue description (VZ:3283-3284)
    customRefIndex?: number                    // custom only: index into the request's customRefs — the reference image itself is NOT stored
  }[]
  furnitureChanges?: {                         // surgical renders with furniture edits (echoed by the server, generate-core.ts:43, :411)
    label: string
    action: "remove" | "replace" | "customize"
    replacementDesc?: string                   // customize = palette picks + note composed (VZ:266-270); replace = free text
    x?: number; y?: number                     // normalised 0…1 position of the item
    customRefIndex?: number                    // replace with a reference photo (image not stored)
  }[]
  parentKey?: "__original__" | `${string}:${number}`   // version the change was made on (jobId:variantId); absent on defurnish / sketch / relight and pre-stamping rows
}
```
- The editor's own `VariantResult` type (`VZ:272-279`) declares only `id`, `imageUrl`, `materials[{label, material}]`, `parentKey?`; the extra keys ride along because the editor spreads the server's objects (`VZ:2769-2779` `{ ...v, imageUrl }`). The share snapshot and the gallery only read `label` + `material`.

### E-183 · `render_share_links.snapshot`
```ts
type RenderShareSnapshot = {
  variantImageUrl: string                      // required
  originalImageUrl: string | null              // the viewer's compare "before" (original upload or parent version)
  roomName: string                             // default "Room"
  style: string                                // the editor's current style pick; default "Modern"
  materials: { label: string; material: string; description?: string; customRefIndex?: number }[]   // the variant's materials[], default []
  branding: {
    logoUrl: string | null
    primaryColor: string                       // default "#5500FF"
    companyName: string | null                 // branding, else studios.name
    tagline: string | null
    companyAddress: string | null              // stored, never rendered by the page
    phone: string | null                       // the CREATOR's profiles.phone — stored, never rendered
    email: string | null                       // the creator's profiles.email — stored, never rendered
  }
  countryCode: string                          // studios.country_code, default "SG" — stored, never rendered
}
```
- Source `RSHARE:49-65`; consumer type `src/app/renders/[token]/page.tsx:8-24`. Frozen: later branding, room renames or variant deletions do not change a live link.

### E-184 · `studios.settings.visualizerWorkspace`
```ts
type VisualizerWorkspace = {
  folders: { id: string; name: string }[]     // id = crypto.randomUUID() (fallback "id-{ms}-{rand}", WSQ:45)
  sessions: {
    id: string                                 // the "entityId" used in Storage paths for standalone rooms
    name: string
    folderId: string | null                    // null = Unfiled
    roomIds: string[]                          // project_rooms ids, in creation order
    createdAt: string                          // ISO
    updatedAt: string                          // ISO; bumped on rename and on add-room only
  }[]
}
```
- `normalizeWs` (`WSR:30-33`) coerces anything non-array to `[]`; no per-item validation, so a malformed element survives.

### E-185 · `homeowner_shared_assets.likes`
```ts
type RenderLike = { homeownerId: string; name: string; at: string /* ISO */ }   // one per homeowner; toggled
```
- `XM/195:8`, `src/types/app.ts:3697-3701`, writer `HOAPI like/route.ts:49-53`.

### E-186 · `homeowner_shared_assets.comments`
```ts
type RenderComment = {
  id: string                                   // uuid
  authorRole: "homeowner" | "studio"           // only "homeowner" is ever written (studio replies go on pins)
  homeownerId: string | null
  authorName: string
  body: string                                 // trimmed, 1…2000 chars
  createdAt: string                            // ISO
}
```
- `XM/195:9-10`, `src/types/app.ts:3706-3713`, writer `HOAPI comment/route.ts:63-70`.

### E-187 · `homeowner_shared_assets.metadata.annotations`
```ts
type RenderAnnotation = {
  id: string                                   // uuid
  x: number; y: number                         // normalised 0…1 (left, top); outside → 400
  body: string                                 // 1…2000 chars
  status: "open" | "resolved"                  // either side may flip it
  authorRole: "homeowner" | "studio"
  homeownerId: string | null                   // null for studio pins
  authorName: string                           // homeowner session name, or the studio user's full_name / "Studio"
  createdAt: string
  comments: RenderAnnotationComment[]          // same shape as RenderComment; both sides reply
}
// metadata = { ...otherKeys, annotations: RenderAnnotation[] }  — max 100 pins per asset
```
- `src/types/app.ts:3718-3743`; writers E-136 / E-137. Deletion: each side removes only its own pins.

### E-188 · `copilot_visual_assets.metadata`
```ts
type CopilotRenderMetadata   = { styleKeywords: string[]; hasSourcePhoto: boolean }                         // CPR:191
type CopilotMoodBoardMetadata = { styleKeywords: string[]; propertyType: string | null; prompt: string | null } // CPM:201
```
- The gallery search reads `metadata.styleKeywords` (`CPG:58-66`).

### E-189 · Bodies that never reach a table (for the port)
- `POST /api/renders/jobs` body keys `id, roomId, model, status, variantsJson, style, completedAt, projectId, leadId`; `PATCH …/jobs/[id]` `variantsJson, style`; `POST /api/projects/rooms` `name, projectId, leadId`; `PATCH …/rooms/[id]` `originalImageUrl, name`; `POST /api/renders/share` `variantImageUrl, originalImageUrl, roomName, style, materials`; `POST /api/homeowner-links/share-render` `projectId, projectLinkId, title, url, thumbnailUrl, sharedBy`; `POST /api/studio-materials/records` `name, category, imageUrl, hex, description`; `PUT /api/visualizer/workspace` `{ workspace }`.

## 18 · Statuses and enums (the vocabulary a 2.0 port must carry)

### E-190 · Job statuses (`render_jobs.status`)
| Value | Written by | Read by |
|---|---|---|
| `completed` | every writer (E-17, E-21, E-22; also the DB default) | editor load + landing (both filter on it) |
| `queued` · `processing` · `failed` | nobody (CHECK-only vocabulary) | nobody |

### E-191 · Room kinds
- No persisted kind. Two in-memory notions only: (1) `roomBaseKind` = `"original" | "render"` — what the user is editing on (`VZ:1487`); (2) the Auto Furnish room programme ids (`src/lib/auto-furnish-prompt.ts:45-163`): `living` *Living room* · `bedroom` *Bedroom* · `kids-bedroom` *Kids' bedroom* · `dining` *Dining room* · `kitchen` *Kitchen* · `living-dining` *Living + dining (open plan)* · `study` *Study / home office* · `bathroom` *Bathroom* · `balcony` *Balcony / outdoor* · `entryway` *Entryway / foyer*. Sketch detection also keeps `subtype` / `roomContext` strings in memory (`VZ:444-450`).

### E-192 · Stock material type (`src/data/mock-catalogue.ts:32-61`, type only)
```ts
type CatalogueItem = {
  id: string; name: string
  category: "Laminates" | "Paints" | "Gush Paints" | "Gush Enamel" | "Flooring" | "Countertops" | "Tiles" | "Wallpapers" | "Fabrics" | "Metals" | "Glass" | "Stone"
  subcategory: string; description: string
  swatch: string                                   // hex
  finish: "matte" | "gloss" | "satin" | "textured" | "natural"
  colorFamily: "warm" | "cool" | "neutral" | "bold"
  tags: string[]
}
// CATALOGUE_CATEGORIES = ["All", ...the 12]  ("All" is a filter, never a stored category)
```
- The 12 categories are the options the custom-material dialog offers for `studio_materials.category` (`CMD:110-111` filters "All" out). `SURFACE_CATEGORY_MAP` (`mock-catalogue.ts:63+`) maps surface labels to suggested categories (reader B). Stock items are code: 136 literal entries plus `GUSH_CATALOGUE` spread in (`:404`).

### E-193 · Quality / model enums
- Render quality: *Fast Preview* `google/gemini-3.1-flash-image` (default) · *Pro Quality* `google/gemini-3-pro-image-preview` (`VZ:356-362`). Sketch quality `fast` | `high` (*Fast* / *High quality*, `VZ:436-443`). Defurnish scope `keep-builtins` (*Keep built-ins*) | `joinery` (*Strip to shell*) (`VZ:367-371`). Only the model id and the label reach the DB (E-26, E-27).

### E-194 · Share-link states (`render_share_links`)
- `live` (now < `expires_at`) · `expired` (410, page's expired view) · `not found` (404). No revoked / disabled / extended state; no studio-side list.

### E-195 · Shared asset vocabularies (`homeowner_shared_assets`)
- `asset_type`: `render` (the only value written) · `floor_plan` · `mood_board` · `photo` · `document` (read-side only).
- Annotation `status`: `open` · `resolved`. `authorRole`: `homeowner` · `studio`.

### E-196 · Co-pilot visual vocabularies (`copilot_visual_assets`)
- `type`: `ai_render` · `mood_board` · `portfolio_match`. `source`: `ai_detected`. `status`: `active` (only).

### E-197 · Usage vocabularies
- `feature_key` `ai_visualizer`; `event_type` `feature_opened` · `feature_succeeded` · `feature_failed`; rollup keys `feature.ai_visualizer.opens|successes|failures`.

### E-198 · Page keys
- `tools/ai-visualizer` (seeded `true`; role tags owner · admin · id), `tools/homeowner-portal` (not seeded; owner only in `access-control.ts:107`).

## 19 · Tenant locks — one line per visualizer table

| Row | Table | Final policy | Migration | Who actually reads / writes |
|---|---|---|---|---|
| E-199 | `render_jobs` | `scoped` (`studio_id = CLAIM`), FORCE, anon revoked | `M213` (after `M092` allow-all) | scoped routes (`JOBS` / `JOB1` / `JOBR`, `WSR`, co-pilot routes) |
| E-200 | `project_rooms` | `scoped`, FORCE, anon revoked | `M226` A1 | scoped routes (`ROOMS` / `ROOM1`, `WSR`) |
| E-201 | `render_share_links` | `scoped`, FORCE, anon revoked | `M226` B1 | **service role** (`RSHARE`, `RTOK`, `RCONS`) — the lock is decorative for them |
| E-202 | `render_consultation_requests` | `scoped_via_parent` → `render_share_links` | `M230` | service role (`RCONS`) |
| E-203 | `studio_materials` | `scoped`, FORCE, anon revoked | `M226` B1 | scoped routes (`SMR`) |
| E-204 | `studio_material_catalog` | `scoped`, FORCE, anon revoked | `M226` B1 | scoped routes (`MCR`) |
| E-205 | `homeowner_project_links` | `scoped` | `M229` | scoped (`HL`) + service role (portal) |
| E-206 | `homeowner_shared_assets` | `scoped_via_parent` → `homeowner_project_links` | `M229` | scoped (`HL`) + service role (portal `HOAPI`) |
| E-207 | `copilot_visual_assets` | `scoped_via_parent` → `copilot_sessions` | `XM/225_lock_copilot.sql:160-180` | scoped (`CPR` / `CPM` / `CPG`) + service role (poll, public share) |
| E-208 | `project_files` | `scoped` | `M226` A1 | scoped (`/api/project-files/records`) + service role (`/api/projects/[id]/files`) |
| E-209 | `usage_events` | `usage_events_scoped` (not named `scoped`), FORCE, `REVOKE ALL FROM anon` | `XM/236` | `track()` (scoped, or service role when no studio) |
| E-210 | `platform_config` | RLS on, **no policy**, DML revoked from anon + authenticated (service role only) | `XM/264` | service role (`/api/config/pages`, admin routes, buddy chat) |
| E-211 | `studios` (settings) | `scoped` on `id = CLAIM` | `M226` A3 | scoped (`WSR`) + service role (`RSHARE`, config pages) |
| E-212 | Storage `renders` / `studio-materials` | public read; no write policy after `232` (service-role routes only, `{studioId}/` prefix enforced in code) | `M092`, `XM/123`, `232`, `233`, `235` | `/api/storage/upload` · `/api/storage/remove` · `UPV` |
- Panic button: `XM/234_rollback_209_233_tenant_locks.sql` disables every FORCE'd table's RLS and re-grants anon (not a normal state).
- The claim comes from `scopedSupabase(studioId)` minting an HS256 JWT with `studio_id` (`M226:8-10`); the studio id is always the session's, never the body's.

## 20 · The 2.0 side (read only, `openmaison-prototype`)

### E-213 · 2.0's schema conventions (`lib/db/schema.ts`)
- **Ids**: `text('id').primaryKey()`, minted server-side with `randomUUID()` in the actions (1.0 mints several ids in the browser — job ids, co-pilot asset ids).
- **Time**: `integer('…_at', { mode: 'timestamp' })` = Unix **seconds**; the shared `timestamps` helper defaults `created_at` / `updated_at` to `(unixepoch())` (`lib/db/schema.ts:16-23`), most domain tables set them explicitly. 1.0's `timestamptz` and the ISO strings inside JSON (`visualizerWorkspace`, likes, comments, pins) become seconds in columns; inside JSON 2.0 keeps whatever the reader needs.
- **Booleans**: `integer(…, { mode: 'boolean' })`. **Money**: integer `_minor` (8 columns, e.g. `price_book_items.cost_minor`) — 1.0's `price_cents` maps to `_minor`.
- **JSON**: text columns, either `text(…, { mode: 'json' })` (e.g. `stage_logs.payload`, `lead_events.detail`) or a plain text column holding a JSON string (e.g. `quotes.client_view_json`, `settings.value`).
- **Soft delete**: `deleted_at` (12 tables declare `integer('deleted_at', …)`) + Undo in the UI; actor stamps `created_by` / `updated_by` / `deleted_by` (members.id) where the parity rounds added them.
- **One studio**: no `studio_id` on domain tables (the `organizations` / `memberships` trio is provisional plumbing, `schema.ts:4-14`); studio-wide values live in `settings` (`key` text PK · `value` JSON string · `updated_at`, `schema.ts:236-241`) — 2.0's home for both `platform_config` and `studios.settings` keys.
- **People**: `members` (with `is_you`, the signed-in member, `schema.ts:94`); homeowners `homeowner_profiles` + `homeowner_lead_links` (**lead-scoped** — 1.0's `homeowner_project_links` "until Projects exist", `schema.ts:1033-1062`).
- **No projects**: "All domain tables (projects, rooms) were REMOVED — they were invented" (`schema.ts:12`). Every 1.0 `project_id` has nothing to point at yet.
- **Events**: Activity is derived from the records (`lib/leads/activity.ts`) plus `lead_events` for what cannot be derived (`kind` · `actor_id` · `at` · `detail` JSON, `schema.ts:1109-1120`); in-app bell rows are `notifications` (`member_id` · `kind` · `title` · `body` · `href` · `lead_id` · `quote_id` · `channels` · `actor_id` · `created_at` · `read_at`).
- **Folders**: `library_folders` (`library` · `name` · `parent_id` · `created_by` · `created_at` · `updated_at` · `deleted_at`, `schema.ts:1130-1143`) with a `folder_id` on each library's rows.

### E-214 · How 2.0 stores images (no Storage)
- `lead_files.thumb` is a **public asset path**: an upload never stores bytes — the action writes a stand-in thumbnail `/figma-assets/file-thumb-1.png`, a fixed 728 064-byte size and `image/jpeg` (`app/leads/files-actions.ts:59-69`); seeded rows use `/figma-assets/…` paths too (`scripts/seed-overview.ts`, `scripts/seed-returns.ts`); the column comment says so (`schema.ts:762`).
- **Data URLs in rows** exist elsewhere: price-book item photos downscaled to 480 px (`components/company/price-book/item-dialog.tsx:73`, into `price_book_items.thumb`), the brand-kit logo at 1200 px (`components/templates/editor/brand-pane.tsx:55`), inspector images at 1600 px (`components/templates/editor/inspector.tsx:383`) — all through `readFileAsDataUrl(file, max)` (`lib/templates/files.ts:4-20`: SVG / non-images kept as-is, PNG stays PNG, else JPEG q 0.9).
- So a 2.0 visualizer has two options per image: a public path (samples, fixtures) or a downscaled data URL in the row (uploads, engine output). Note for the audit's §4.2: the Files tab itself does **not** keep data URLs today.

### E-215 · Where a new table has to be registered (2.0)
- Migration: the last is `drizzle/0052_library_folders.sql` (53 files, journal idx 52) → the next is **0053** (`npm run db:generate` → `npm run db:migrate`, additive only).
- Repair: the last rule is **R60** (*an Admin on the team*, `scripts/repair-demo-data.ts:1376`) → the next is **R61**.
- Baseline: both hard-coded lists hold the **same 51 tables** but in a different order — `lib/db/baseline.ts:17` `BASELINE_TABLES` (…`tags`, `lead_tasks`, `task_tags`…) and `scripts/snapshot-baseline.ts:7` `TABLES` (…`lead_events`, `lead_tasks`, `stage_logs`…). A new table must join **both** (restore deletes in reverse list order, `baseline.ts:52`, so a child table goes after its parent).
- Activity: a new record type needs its branch in `lib/leads/activity.ts` and its repair rule together (CLAUDE.md, REG-343).
- Entry point already reserved: the rail's Tools popover lists *AI Visualizer* (`components/shell/tools-popover.tsx:20`, key `visualizer`, icon `wand_shine`) with no `href`, so it answers *Coming soon* (`:69`); *Meeting Copilot* is a coming-soon tile too (`:25`) — 1.0's co-pilot tables have no 2.0 home.

## 21 · Proposed port table (1.0 → 2.0)

### E-216 · Table-level map
| 1.0 (folder) | 2.0 table | Columns kept (by name) | Dropped (platform-only / dead) | New in 2.0 |
|---|---|---|---|---|
| `render_jobs` (SM) | **`render_jobs`** | `id`, `room_id`, `project_id` (null until Projects), `lead_id`, `status`, `variants_json`, `style`, `model`, `created_at`, `completed_at` | `studio_id` | `created_by` (1.0 never records who rendered) |
| `project_rooms` (SM) | **`project_rooms`** | `id`, `project_id` (null), `lead_id`, `name`, `original_image_url`, `created_at` | `studio_id` | `design_id` (replaces `sessions[].roomIds`), `position`, `updated_at`, `deleted_at` |
| `studios.settings.visualizerWorkspace.sessions[]` (JSON) | **`visualizer_designs`** | `id`, `name`, `folder_id` (← `folderId`), `created_at`, `updated_at` (ISO → seconds) | `roomIds` (rooms point at the design) | `created_by`, `deleted_at` |
| `…visualizerWorkspace.folders[]` (JSON) | `library_folders` (`library = 'visualizer'`) | `id`, `name` | — | `parent_id` (null), `created_by`, `created_at`, `updated_at`, `deleted_at` (house columns) |
| `render_share_links` (SM) | **`render_share_links`** | `id`, `token`, `snapshot`, `expires_at`, `view_count`, `created_by` (→ `members.id`, was `profiles.id`), `created_at` | `studio_id` | `lead_id`, `room_id`, `job_id` + `variant_id` (1.0 cannot tell which render a link shows except by URL), `revoked_at` |
| `render_consultation_requests` (SM) | **`render_consultation_requests`** | all six: `id`, `share_link_id`, `client_name`, `client_phone`, `message`, `created_at` | — | `handled_at` / a follow-up task or notification — 1.0 has **no reader** (E-70) |
| `studio_materials` (XM 121) | **`studio_materials`** | `id`, `name`, `category`, `image_url`, `hex`, `description`, `uploaded_by` (→ `members.id`), `is_active`, `created_at`, `updated_at` | `studio_id`, `roughness`, `metalness` (never written) | `deleted_at` (house soft delete; keep `is_active` for the port), optional `folder_id` |
| `studio_material_catalog` (XM 194/312) | — (use `price_book_items`) | name → `name`, category → `category`, vendor → `vendor`, image_url → `thumb`, price_cents → `cost_minor` | `vendor_id` (2.0 keeps vendor as text), `specs` | — (sandbox-only for the visualizer) |
| `homeowner_shared_assets` (SM + XM 195) | `render_annotations` for pins; likes / comments → decide with the portal module | pin keys `id`, `x`, `y`, `body`, `status`, `author_role`, `author_name`, `comments` (JSON), `created_at` | `project_link_id` (no portal), `homeowner_id` | `job_id`, `variant_id`, `author_member_id`, `updated_at`, `deleted_at` |
| `homeowner_project_links` (SM) | `homeowner_lead_links` (exists) | — | `project_id`, `role`, `is_active` for this purpose | — |
| `copilot_visual_assets` (SM/XM 078) | — (2.0's *Meeting Copilot* is a coming-soon tile) | — | all | — |
| `project_files` render rows (SM + XM 148/207) | `lead_files` (a *Renders* folder row, `kind 'image'`) | `file_name` → `name`, `storage_path` → `thumb` | `file_type` (`document` bug), `approval_status`, `studio_id` | `parent_id` = the Renders folder, `owner_id`, `mime`, `size_bytes` |
| `usage_events` · `platform_config.page_visibility` | — | — | platform analytics / platform switches | — |
| Storage `renders` · `studio-materials` | — (image in the row or a public path, E-214) | — | buckets, paths, policies | — |

### E-217 · `render_jobs` column map (2.0 types)
| 1.0 column | 2.0 declaration | Note |
|---|---|---|
| `id` uuid | `text('id').primaryKey()` | Minted by the save action, not the browser. |
| `studio_id` | — | Dropped. |
| `project_id` uuid SET NULL | `text('project_id')` (no FK) | Null until Projects exist. |
| `lead_id` uuid SET NULL | `text('lead_id').references(() => leads.id, { onDelete: 'cascade' })` | Lead delete in 2.0 is soft; *Delete forever* should take the renders (as X-Ray readings do). |
| `room_id` uuid SET NULL | `text('room_id').notNull().references(() => projectRooms.id, { onDelete: 'cascade' })` | Removes 1.0's orphan class (E-25) and the room-less co-pilot rows. |
| `status` text CHECK | `text('status').notNull().default('completed')` | Keep the four-value union in TS; only `completed` is written. |
| `variants_json` jsonb | `text('variants_json', { mode: 'json' }).notNull()` | Keep **every** stored key (E-182), not only the editor's declared four. |
| `style` text | `text('style')` | The display label (E-26). |
| `model` text | `text('model')` | Model id. |
| `created_at` / `completed_at` timestamptz | `integer(…, { mode: 'timestamp' })` | Seconds. |
| — | `text('created_by')` | New: members.id. |
- Index: `render_jobs_room_idx (room_id)` and `render_jobs_lead_idx (lead_id)` (1.0 had none, E-13).

### E-218 · `project_rooms` column map (2.0 types)
| 1.0 column | 2.0 declaration | Note |
|---|---|---|
| `id` | `text('id').primaryKey()` | — |
| `project_id` | `text('project_id')` | Null until Projects. |
| `lead_id` | `text('lead_id').references(() => leads.id, { onDelete: 'cascade' })` | Null for a personal design's room. |
| `studio_id` | — | Dropped. |
| `name` | `text('name').notNull()` | Default *Room {n}* (E-35). |
| `original_image_url` | `text('original_image_url')` | Data URL or public path (E-214). |
| `created_at` | `integer('created_at', { mode: 'timestamp' }).notNull()` | — |
| — | `text('design_id')`, `integer('position')`, `integer('updated_at', …)`, `integer('deleted_at', …)` | New. |

### E-219 · `render_share_links` column map
| 1.0 | 2.0 | Note |
|---|---|---|
| `id` | `text('id').primaryKey()` | — |
| `studio_id` | — | Dropped. |
| `token` UNIQUE | `text('token').notNull()` + `uniqueIndex` | 1.0: 16 hex chars; keep the length. |
| `snapshot` jsonb | `text('snapshot', { mode: 'json' }).notNull()` | E-183; drop `countryCode` / contact keys only if the page never shows them. |
| `expires_at` | `integer('expires_at', { mode: 'timestamp' }).notNull()` | 1.0: +7 days. |
| `view_count` | `integer('view_count').notNull().default(0)` | Increment atomically (`view_count + 1` in SQL), unlike 1.0. |
| `created_by` → profiles | `text('created_by')` → members | — |
| `created_at` | `integer('created_at', { mode: 'timestamp' }).notNull()` | — |

### E-220 · `render_consultation_requests` column map
| 1.0 | 2.0 | Note |
|---|---|---|
| `id` | `text('id').primaryKey()` | — |
| `share_link_id` CASCADE | `text('share_link_id').notNull().references(() => renderShareLinks.id, { onDelete: 'cascade' })` | — |
| `client_name` · `client_phone` | `text(…).notNull()` | Validate the phone with `isSgPhone` (`lib/format.ts`) — 1.0 accepts any text. |
| `message` | `text('message')` | — |
| `created_at` | `integer('created_at', { mode: 'timestamp' }).notNull()` | — |

### E-221 · `studio_materials` column map
| 1.0 | 2.0 | Note |
|---|---|---|
| `id` · `name` · `category` · `description` · `hex` | `text(…)` (`name`, `category` not null) | `category` = one of the 12 stock categories in practice. |
| `image_url` NOT NULL | `text('image_url').notNull()` | Data URL (downscaled) in 2.0. |
| `roughness` · `metalness` numeric(3,2) | — | Never written in 1.0. |
| `uploaded_by` → profiles | `text('uploaded_by')` → members | — |
| `is_active` | `integer('is_active', { mode: 'boolean' }).notNull().default(true)` | Plus `deleted_at` for the house soft delete. |
| `created_at` · `updated_at` | `integer(…, { mode: 'timestamp' })` | 1.0's trigger becomes an explicit set in the action. |

### E-222 · `visualizer_designs` (new, from the JSON sessions)
| 1.0 key | 2.0 column | Note |
|---|---|---|
| `sessions[].id` | `text('id').primaryKey()` | Keep the id: 1.0 Storage paths use it as `{entityId}`. |
| `sessions[].name` | `text('name').notNull()` | — |
| `sessions[].folderId` | `text('folder_id')` | → `library_folders` (`library 'visualizer'`). |
| `sessions[].roomIds[]` | — | Each room gets `design_id` instead. |
| `sessions[].createdAt` · `updatedAt` (ISO) | `integer(…, { mode: 'timestamp' })` | Seconds. |
| — | `text('lead_id')`, `text('created_by')`, `integer('deleted_at', …)` | New (a lead's design can be a row too, instead of 1.0's derived grouping). |

### E-223 · Port-time data fixes 1.0 needs (found while mapping)
- Rows with `room_id IS NULL` (co-pilot mirrors, orphans after a project delete) have nowhere to go in a room-first model — skip them or file them as images only.
- `project_files` render rows carry `file_type = 'document'` (E-159) and no job id; match them to jobs by URL if they must be linked.
- `homeowner_shared_assets.url` may be a multi-MB `data:` URL when the pre-share upload failed (E-125).
- `variants_json[].materials[].customRefIndex` points into a request array that was never stored — the custom image is unrecoverable; keep the name only.

## Uncertain / not verified

- **Which RLS era each environment is in.** `XM/` files are applied by a script runner per environment ("staging → prod → each fork"); whether `213` / `226` / `229` / `230` / `232` are live everywhere — or whether the panic button `234` was ever run — cannot be told from the repo. The routes are written to work either way (scoped client + explicit filters).
- **Supabase CLI vs script-runner overlap.** `copilot_visual_assets` is created in both folders (identical DDL); `project_files` has two conflicting creates reconciled by `148`. Other visualizer tables appear in one folder only — assumed to be applied on every environment.
- **Real `variants_json` contents in production.** The stored keys beyond the editor's type (`description`, `customRefIndex`, `furnitureChanges[]`) are inferred from the code path (`generate-core.ts:411` → `VZ:2777` spread); rows written before the `parentKey` stamp, or by older builds, may differ. No DB was queried.
- **The render route's DRY_RUN branch** returns data-URL "renders" of the input photo (`generate-core.ts:383-391`); whether any environment runs dry and so fills `renders` with copies of room photos is unknown.
- **`studio_material_catalog` image paths** (`catalog/` prefix) — stated in the migration comments; the manager component that builds the path was not read (not a visualizer file).
- **Browser-cache effect of upserted originals** (same path on photo swap) is inferred from the code comment at `VZ:2988-2991` about variants, not observed.
- **Rate limits** are in-memory per server instance (`src/lib/rate-limit.ts`); on serverless they reset per instance — the effective limit in production is unknown.
- **`render_jobs.completed_at`**: no reader found in `src/` beyond the insert; a report or an admin page outside the grep patterns could read it.
- **Room / job counts**: `WSR` loads every completed job of the studio; how large real studios get (and so whether the landing slows) is not knowable from code.
- **Annotation migration "209"**: code comments cite a migration 209 for annotations; no such migration exists in either folder (both `XM/209_*` files are unrelated). Treated as a stale reference — annotations live in `metadata`.

## Hand-offs

- **Reader A** (ways in): the landing's use of `visualizerWorkspace` (designs, folders, cards), the public share page's words and states (`/renders/[token]`), the project page's *Show to homeowner* toggle that also writes `homeowner_shared_assets`, `isPageEnabled` / `access-control.ts` gates, the ID Buddy's page map (`src/lib/agents/page-tool-map.ts:9`, `:35`).
- **Reader B** (editor model): how `materials[]` per variant is assembled from surface picks (stock vs custom, `VZ:3268-3285`), the library-material list in the browser (`useStudioMaterials`), the 12 categories' UI, `roomBaseKind`, sketch state.
- **Reader C** (render flow / exits): every caller of `persistVariantsToHistory`, the version numbering (`versionOf`), the share dialog, *Share to portal* buttons (`VZ:4818`, `VZ:5011`, `VZ:5616`, `VZ:5631`, `VZ:5855`), *Send to chat*, the relight live-edit overwrite, delete-render UX, the error states when a job save fails.
- **Reader D** (render routes / engine): `src/app/api/render/**` (only `route.ts` tracks usage), `generate-core.ts` (variant cap 1…5, the echoed `materials` / `furnitureChanges`), the co-pilot routes' prompts, the auto-furnish route's `catalogue[]` input.
- **Reader F** (2.0): confirm E-214 (the Files tab stores a stand-in public path, not a data URL — relevant to the audit's §4.2), the two baseline lists' order difference (E-215), and whether `visualizer_designs` / `project_rooms` naming fits the gallery and Files models.
- **Audit owner**: E-182 (the stored variant shape is wider than `{ id, imageUrl, materials[{label, material}], parentKey }`), E-70 (consultation requests have no reader), E-87 (everyone saves to the library despite the Owner/Admin comment), E-88 (no way to delete a library material), E-114 (*Share to portal* picks an arbitrary active link), E-159 (visualizer render files are typed `document`), E-171 (only surgical renders are counted in usage).
