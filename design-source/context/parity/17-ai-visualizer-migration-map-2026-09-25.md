# AI Visualizer — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the AI Visualizer build (REG-671…684). This map covers every 1.0 table, JSON shape and rule the visualizer touches. For each, it says where the same thing lives in 2.0 and which part of the build put it there. A port script and the production code after it then have one place to look.

- **The audit.** `16-ai-visualizer-1.0-to-2.0-audit-2026-09-25.md` holds the reasoning and the 34 calls (§6, §9).
- **The column-level diff.** Inventory E (`ai-visualizer-1.0-inventory/E-data-model.md`) holds it (§1–§19), with a first port table in §21. This map supersedes §21 where the build decided otherwise.
- **The sheets round.** `../feedback/04-ai-visualizer-sheets-2026-09-25.md` holds the rows from the two sheets.

**Conventions.**

- 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`). Times are unix seconds, and ids keep 1.0's UUIDs.
- Every `*_by` becomes a `members.id`. An unknown profile maps to the studio's Owner, and the port log records it.
- Every write is a server action with `revalidatePath`:
  - `app/visualizer/actions.ts` for the studio.
  - `app/renders/actions.ts` for the client's link, keyed by its token.
  - `app/company/materials-actions.ts` for Company › Materials.
- Pictures are data URLs in the row, served at addresses (`/visualizer/img/…`, `/files/img/…`). Production keeps object storage (1.0's `renders` bucket) and stores its URLs in the same columns.
- **The studio's picture routes need a signed-in session** (audit 2026-09-26, critic-1). `/visualizer/img/{room|v|m|d}/…` and `/files/img/[fileId]` already ask Who sees leads, whether the design, version or file is deleted, and whether a share link is stopped or ended. They are served `private` only (`lib/visualizer/picture-store.ts`): the studio's for a year, `immutable`, because each address changes with its picture; a picture read through a client's link for 300 s. But the prototype has no login: any request without a cookie reads as the signed-in member (`sessionMemberId()`). In production, a request with no session must get a 401 before those checks run. Only the client's link (`/renders/[token]` and the pictures it names) is reachable without a session, and it is keyed by its token.

**The parts of the build.**

| REG | Part |
|---|---|
| REG-673 | Foundation |
| REG-674 | The modes |
| REG-675 | Out to Files, a quote and the client |
| REG-676 | The client's link |
| REG-677 | Materials |
| REG-678 | The simplicity pass |
| REG-679…684 | The sheets round |

## 1. Tables and columns

| 1.0 | 2.0 | Notes | Part |
|---|---|---|---|
| — (a design was a session list of rooms, or a lead's / project's rooms) | `visualizer_designs` | One per lead (`kind = 'lead'`, made on first open) plus personal designs (`kind = 'personal'`, filed in folders, `library_folders.library = 'visualizer'`). A 1.0 lead's rooms land under the lead's design. A project's rooms wait for Projects (Q-28). A standalone session becomes a personal design named "Design · {date}". Soft delete via `deleted_at` · `deleted_by`. | 673 |
| `project_rooms` (E-30) | `project_rooms` | `design_id` is new, from the owner above. `project_id` is kept and null until Projects. `original_image_url` keeps the storage URL. `sample_key`, `source_file_id`, `detection_json`, `state_json` and `position` are new: the reading, the picks waiting for Generate, and the order. `deleted_at` gives Undo. | 673 |
| `render_jobs` (E-01) | `render_jobs` | Every 1.0 row is `completed`. `variants_json` gains `n` (V-number, stable), `applied`, `finishes` and `deletedAt` per variant (a deleted version keeps its number). `kind` names the pass. `style` stays the display label. `model` is `fast` · `high` (1.0 wrote OpenRouter model ids; map every id to `fast` unless it was the high model). | 673 |
| `render_share_links` (E-46) | `render_share_links` | `design_id` and `lead_id` are new. `snapshot` holds up to six versions (1.0: one), each with its `beforeUrl` and change lines. `message`, `sent_via`, `last_viewed_at` and `revoked_at` are new: Renew and Stop sharing. `expires_at` keeps 7 days. Tokens stay as 1.0 minted them. | 675 · 676 |
| `render_consultation_requests` (E-60) | `render_consultation_requests` | `kind` covers `favourite` · `note` · `call_back`. 1.0 had only the call-back form, which nothing read. `version_key` names the version. A `call_back` writes a Follow-up task (`task_id`) for the lead's members. Port 1.0's rows as `call_back` with no task, and log them for the studio to action. | 676 |
| `homeowner_shared_assets` feedback | `render_annotations` (pins) · `render_consultation_requests` (favourite, notes) | Pins carry x/y on a version, `author_role` studio / client, and a replies thread in `comments_json`. There are 100 per version, of 2,000 characters each. | 675 · 676 |
| `studio_materials` (E-71) | `studio_materials` | `folder_id` and `price_book_item_id` are new: Company › Materials and Add to a quote. `hex` is the colour the render uses (a swatch photo's dominant colour, Q-20). | 677 |
| `studio_material_catalog` (E-90) | — | A sandbox only in 1.0. The catalogue is data in 2.0 (`lib/visualizer/data/catalogue.gen.ts`, 446 items with the Gush books). | — |
| `project_files` "Renders" folder rows | `lead_files` in the lead's folder *Renders* | Written by Save to Files and by sharing, one row per version (`Render - {Room} - V{n}.jpg`). Project files wait for Projects. | 675 |
| — (1.0 stored no upload's picture on a lead file) | `lead_file_images` (migration 0054) | An upload's picture beside its file. `lead_files.thumb` is its address. | 684 |
| `copilot_visual_assets` · `usage_events` · `platform_config` | — | The platform's: the co-pilot, the funnel and the page flag (Q-29, Q-30). | — |

Migrations are 0053 (`drizzle/0053_ai_visualizer.sql`) and 0054 (`0054_lead_file_images.sql`). Both are additive. Every new table is in both baseline lists: `lib/db/baseline.ts` `BASELINE_TABLES` and `scripts/snapshot-baseline.ts` `TABLES`.

## 2. Rules and where they live

| Rule | 2.0 | Part |
|---|---|---|
| Who may: every member uses it; Who sees leads decides which lead designs a member sees and opens; a design, a room's delete and a studio material change by their maker, an Owner or an Admin | `lib/visualizer/policy.ts` (`designChangeBlock` · `materialChangeBlock`); `fetchVisualizerHome` · `fetchVisualizerEditor` (`canOpenLead`) | 673 · 677 |
| A lead's design shows in the gallery once it has a room; opening a deleted lead design brings it back | `fetchVisualizerHome`; `openLeadDesign` | 673 |
| V-numbers are per room, in the order made, never reused | `versionsOf`; `saveRender` | 673 |
| A room's picks and reading autosave 900 ms after the last change; ⌘Z / ⇧⌘Z per room | `use-editor-state.ts`; `saveRoomState` | 673 |
| The primary button's words follow what Generate will do | `intentFor` (`lib/visualizer/model.ts`) | 674 |
| Change photo only while the room has no versions | `setRoomPhoto` | 673 |
| A share link lives 7 days; renew from today; stopping says so on the page; each shared version lands in Files › Renders | `createShareLink` · `renewShareLink` · `stopShareLink`; `fetchShare` state | 675 |
| The client's answers notify the lead's members (`render_feedback`, in-app + WhatsApp); a call back is a Follow-up due within the hour | `app/renders/actions.ts` (`tell`, `askCallBack`) | 676 |
| Add to a quote writes a section into a Draft of the lead (or a new quote), priced from a Price book item of the same name, else S$0 | `addVersionToQuote` | 675 |
| A sample room reads through its current curated outlines, keeping the studio's own additions, redrawn outlines and hidden items | `currentSampleReading` in `parseDetection` | 678 |
| The words in *Describe a change* ride along with an edit, or make a version alone | `runPass` → `editPass(extra)` · `notePass` | 679 |

## 3. The engine and production

2.0 renders with a **curated engine in the browser** (`lib/visualizer/engine/*`, audit §5), because the prototype cannot call an image model. Production keeps 1.0's model calls (OpenRouter), with 2.0's model around them:

- **Detection.** 1.0's AI reading fills `detection_json`: surfaces and furniture with their dots. The curated outlines (`hull`, `cutout`, `plate`) are the prototype's only.
- **Generate.** 1.0's prompt builder gets its instructions from `Pending` and the version on screen. It writes one `render_jobs` row with the variants' `applied` and `finishes`, as `saveRender` does.
- **The words.** 1.0 sent the note to the model. The prototype reads it by rules (`lib/visualizer/note.ts`). The data shape is the same, and production passes the words through.
- **Things that stay 2.0's in production.** These are UI and data, not engine:
  - the live light preview (1.0's own grade maths);
  - the region lit on a pick (from the model's masks where it gives them);
  - the moodboard's colours (`extractPalette`);
  - wallpaper motifs on chips.

## 4. Assets

- `public/visualizer/samples/{living-room,bedroom,kitchen}/` holds 1.0's sample photos, finished looks, the empty plate, the relit bedroom and the kitchen sketch. `public/visualizer/lighting/*.jpg` holds 1.0's preset previews.
- `public/visualizer/demo/` holds the demo's pre-rendered edit, its golden-hour relight and two swatch crops. They are produced by `scripts/viz/demo-renders.mts` from `lib/visualizer/demo.ts`. Re-run it if the engine or the living-room sample changes.
- There are four dev harnesses in `scripts/viz/`:
  - `regions.mts` draws every region's contact sheet.
  - `render-test.mts` runs edit, remove and light.
  - `wallpaper-test.mts` renders the motifs.
  - `grid.mts` draws a coordinate grid for tracing an outline.

## 5. Demo data (repair R61)

The records:

- **Kevin Ng's design.** Three rooms from his Files › Site photos and five versions, each with its trail. A studio pin. A link sent on WhatsApp two days before the run: opened three times, with a favourite, a note and a pin the studio answered. Nine notifications.
- **A personal design.** "Showroom — kitchen concept", in "Showroom ideas".
- **Four studio materials.** Two have swatch photos, two are linked to the Price book, and one is filed in "Floors".

Everything is written once by fixed ids, and the checks at the end of `scripts/repair-demo-data.ts` guard it (the REG-673…677 rows).

## 6. After the pixel-level audit (2026-09-26, REG-685…698)

The audit (`18-ai-visualizer-pixel-audit-2026-09-26.md`) changed some of what §1–§2 say. Where they disagree, this section wins.

**Tables and columns.**

| 2.0 | What it holds | Migration |
|---|---|---|
| `render_images` (`job_id`, `variant_id`, `data`; unique on the pair) | A version's picture, out of `render_jobs.variants_json`; the variant's `imageUrl` becomes its address `/visualizer/img/v/{job}/{variant}`. In production: object storage, the same address. | 0055 |
| `lead_file_renders` (`file_id` → `lead_files`, `render_key`, `design_id`, `room_id`, `n`) | A render saved to a lead's Files is that render: the file points at its version, so *Open this version in AI Visualizer* reopens it and a design deleted for good leaves a plain photo. | 0055 |
| `project_rooms.assets_json` | The room's own pictures (a changed photo, a reference, a swatch) by address, so a room's state JSON never carries a picture. | 0055 |
| `project_rooms.state_rev` | The autosave's revision: a save names the revision it started from; a stale one whose picks the room already holds counts as saved (no false "Changed in another tab"). | 0055 |
| `project_rooms.prior_photo_json` | The photo before *Change photo*, for its Undo. | 0055 |
| `visualizer_designs.source_lead_id` | The lead a personal copy (Duplicate) came from — the copy keeps the client's privacy rules. | 0055 |
| `visualizer_designs_lead_one_idx` (unique, a lead's live design) | One lead design per lead, even with two tabs or two members. The migration merges any second one's rooms into the first. | 0055 |
| `studio_materials.updated_by` → `members.id` | Who changed a material last ("edited … by"). | 0056 |

**Rules that changed.**

| Rule | 2.0 | REG |
|---|---|---|
| A room is renamed, re-photographed or deleted only by its maker, the design's maker, an Owner or an Admin; restores and deletes-for-good follow their delete's rule, naming the maker | `lib/visualizer/policy.ts` (`roomDeleteBlock` · `designRestoreRule` · `materialRestoreRule` …); every action in `app/visualizer/actions.ts` | 687 · 686 (E12) |
| A client link ends when its design is deleted (Restore reopens it), when every version on it is deleted, or when its lead is returned or deleted; Lost and On Hold keep it open. A client write on a closed link is refused naming the sender | `readShareLink` state; `app/renders/actions.ts` (`closedLinkMessage`) | 687 · 688 |
| The client's link shows only threads the client started, with the studio's replies | `fetchShare` | 686 (D1) |
| Every client answer notifies the lead's members and whoever shared the link, once each (Owners / Admins when neither is left); the call-back Follow-up goes to the same people | `renderFeedbackIds` | 686 (D2) |
| The editor's leaving save: `POST /visualizer/state` (same-origin JSON `{ roomId, pending?, detection?, baseRev? }`, ≤ 2 MB, the same checks and answer as `saveRoomState`), sent with `keepalive` on pagehide / hidden, plus a sessionStorage draft `om.viz.draft.<roomId>` taken back on load when younger than 2 minutes at the same revision | `app/visualizer/state/route.ts`; `use-editor-state.ts` | 686 (D9) |
| Add to a quote leaves a line the Price book prices by area or length (S$ / sqft, S$ / m) with no quantity | `addVersionToQuote` (`quantityless`), `isMeasured` | 687 |
| A reference colour is named among the finishes its surface takes (stone for a worktop, never an outdoor finish indoors), else "Reference colour" | `plainFinishName` (`lib/visualizer/outputs.ts`) | 687 |
| A server action never takes a long string as a bare argument: React's action decoder counts it against a 1,000,000-character limit whenever the action has more than one argument. Pictures and rich text travel inside one object | `uploadFile(leadId, { … })`, `setRoomPhoto(roomId, { … })`, `saveRoomAsset(roomId, { dataUrl })`, `saveQuoteText(…, { html })`, the text templates | 695 |
| Every Company library action answers a refusal with `{ error: <the rule> }` instead of throwing (production hides a thrown message) | `lib/company/template-rules.ts` (`refuse` · `isRefusal`); `app/company/*-actions.ts` | 686 (E7) |

**The engine.** `lib/visualizer/engine/mend.ts` rebuilds what a removed piece hid (`rebuild` steps traced per sample piece) and fills a rug under it in its own weave and perspective (`weaveFill`, from the rug's traced `plane`). Sample pieces may carry `parts` (D3), `plane`, `rebuild`, `wisps` and `casts` in `lib/visualizer/samples.ts`. The production engine (an image model) replaces all of this. Its contract is the same `runPass`: what the Applied record says changed, and a caveat when something could not be done.
