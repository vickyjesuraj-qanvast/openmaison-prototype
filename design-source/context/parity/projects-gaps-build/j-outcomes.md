# Package J — the 3D space planner · outcomes (gaps build, Phase B, 2026-10-08)

Brief: `scratchpad/build2/brief-j.md` · the short read `j-read.md` (calls J-Q1…) · port 3131 · repair R88 · probe
`design-source/verify/projects/verify-pj-gap-j.cjs` · register rows `reg-j.md` (REG-j.n).

Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

| # | Item (brief) | Outcome | What / where |
|---|---|---|---|
| 1 | Singapore flat templates (HDB 3-, 4-, 5-room, Condo, Landed) | Verified | `lib/planner/templates.ts` (six flats re-laid to tile, `furnish` rules, `ROOM_PRESETS`), `components/planner/new-layout-dialog.tsx` (drawn cards, All · HDB · Condo · Landed, Blank, Trace, *Start with furniture placed*) |
| 2 | Draw / edit rooms (walls, doors, windows) | Verified | `top-view.tsx` (draw, move with furniture, edge handles, opening slide), `inspector.tsx` RoomInspector (name, kind, size, ceiling, *Walls standing*, doors / windows by side, finishes), `lib/planner/model.ts` `wallRuns` (shared walls merged, an open side wins, openings cut) |
| 3 | Furniture catalogue (a few dozen parametric pieces) | Verified | `lib/planner/catalogue.ts` (42 pieces, 7 groups), outlines in `plan-drawing.tsx`, 3D builders in `scene/build.ts`, `panels.tsx` FurniturePanel (search, groups, press or drag in) |
| 4 | Place / drag / rotate / resize / duplicate with snapping | Verified | `snapPiece` (5 cm grid, 15 cm wall snap, Alt free), rotate handle (15°) / R / Left · Right, size handle / typed W × D × H, ⌘D · ⌘C / ⌘V · arrows, overlaps ringed and named (`overlapsOf`), remove with Undo; drag on the floor in 3D too |
| 5 | Top view + 3D orbit (+ walk) | Verified | `top-view.tsx` (pan / zoom / pinch, grid, dims), `scene/three-view.tsx` (OrbitControls, shadows, Walls Full · Low, room chips fly, Walk with collisions and the pad), keys 1 · 2 · 3 |
| 6 | Room colours and finishes (the Visualizer's Materials) | Verified | `panels.tsx` FinishesPanel on the Visualizer's `MaterialPicker` (catalogue + Company › Materials), *Use on every room*; piece colours + materials in the inspector; `lib/planner/look.ts` |
| 7 | Undo / redo | Verified | `editor/use-plan-state.ts` (gestures one step, 100 steps, quiet camera), ⌘Z / ⇧⌘Z / bar buttons, every remove's snackbar Undo |
| 8 | Save layouts per project (fix 1.0 F-265) | Verified | `space_layouts` (project_id + lead_id at creation), autosave with rev (`saveLayout` refuses a stale one), project ⋮ *Plan the space in 3D…* → `project-layouts-dialog.tsx`, Back to the project, *Link to a project…* (Undo) |
| 9 | Export PNG / PDF | Verified | Download PNG (Top view drawn at 2× / the 3D frame), Download PDF → `/planner/[id]/print` (`print/layout-print.tsx` on G's paper: plan; 3D view + rooms + furniture) |
| 10 | Read-only share link for the client + the portal's Designs | Verified | `space_layout_shares` (snapshot, no underlay, no expiry), `share-dialog.tsx` (Make the link · Copy · WhatsApp · Share changes · Stop sharing + Undo), `/space/[token]` (`viewer/*`), portal Designs › 3D layouts + `/my/[slug]/layout/[shareId]`, bell `layout_viewed` on the first open |
| 11 | The Tools tile live | Verified | `components/shell/tools-popover.tsx` (href `/planner`), `app/planner/*` gallery on `LibraryGallery` |

## Progress log
- Sync done; base tree `pkg-j/base-tree.txt` = affd03c3c5aa298c2a3cb67a7bf5c91dc01b316f. node_modules cloned; scratch DB `pkg-j/test.db` from base.db.
- Added to package.json: `three@^0.186.1` (dependencies), `@types/three@^0.186.0` (devDependencies); package-lock.json updated by npm.
- Short read `j-read.md` written (calls J-Q1…J-Q20).
- Schema: tables `space_layouts` · `space_layout_shares` (both baseline lists); migration generated locally as `drizzle/0080_open_mercury.sql`
  (renumber at the merge), applied to pkg-j/test.db.
- Written, tsc clean: `lib/planner/model.ts` (pure: PlanDoc in cm, `wallRuns` / `wallBoxes` merge shared walls — an open side wins —,
  footprints, `overlapsOf`, `snapPiece` (5 cm grid, 15 cm wall snap), `snapRoomEdge`, `cleanPlan` the server's shape check, `forClient`),
  `lib/planner/catalogue.ts` (42 pieces, 7 groups), `lib/planner/templates.ts` (six flats + `furnish` — checked: no room overlaps, no piece
  overlaps on any template), `lib/planner/policy.ts`, `lib/planner/queries.ts`, `app/planner/actions.ts` (create · save with rev · rename ·
  duplicate · link / unlink · delete / restore / forever / empty · share / share changes / stop + undo · sent via · the client's view stamps
  → `layout_viewed`); events `project_layout_*` (8 kinds, both unions); bell event `layout_viewed` (EVENTS, defaults, two templates,
  `{layout}` sample field).
- Next: the gallery `/planner`, the editor, the viewers, the portal, the project dialog, the Tools tile, Activity, search, keys, R88, probe.
- Written, tsc + eslint clean: the shared drawing `components/planner/plan-drawing.tsx` (+ css), the 3D scene `components/planner/scene/{build.ts,
  three-view.tsx}` (three.js, orbit / walk / pick / floor drag / fly-to / PNG capture), the editor `components/planner/editor/*` (orchestrator,
  `use-plan-state.ts` history + autosave with rev, `top-view.tsx` interactive SVG, `panels.tsx` Rooms · Furniture · Finishes, `inspector.tsx`,
  `share-dialog.tsx`, `planner-topbar.tsx` on the Visualizer bar's stylesheet), `new-layout-dialog.tsx`, `project-layouts-dialog.tsx`,
  `home/planner-home.tsx` (LibraryGallery), ghosts `planner-ghosts.tsx`, viewers `viewer/*` (link page, portal page, portal cards), the paper
  `print/layout-print.tsx` (G's paper stylesheet). Routes: `app/planner/{layout,page,loading}.tsx`, `app/(editor)/planner/[layoutId]/(edit)` +
  `print` (each with its loading), `app/space/[token]`, `app/my/[slug]/layout/[shareId]`. Tools tile live; project ⋮ "Plan the space in 3D…"
  (frame + listing); portal Designs › 3D layouts; Activity branch + "3D layouts" chip; search kind `layout` + Go to + Create row; keys area
  `planner` (`PLANNER_KEYS`); `fromLabel` names /planner; the Visualizer's `MaterialPicker` takes `onUpload?` · `keepWords` · `styleHint`.
- R88 written (Benjamin's traced + shared + opened, Ryan's condo, Dane's showroom) with four checks; REG-613's kind list gains the eight kinds.
- First build green; looked at the shots (gallery, editor Top / 3D / Walk, finishes, the link, the paper, the portal, the phone): fixed — a wide
  balcony door draws as sliding panels (not a 2.8 m swing), room words hide when the room is too narrow for them, the stage hint clears the
  Maison AI button, the 3D light lifted, the link page fills its width, the traced empty state waits at the stage's foot (clear of the plan), the
  Top view fits only once measured (a phone opened cut off), the 3D camera stands back on a portrait screen, the inspector's lengths carry their
  unit in the field's end (labels were cut), one close in the phone's sheet; R88's master bedside no longer collides with the plan's wardrobe.
- Probe run 1: 51/53 — the Tools tile is a `menuitem` (probe locator), and a real bug: a drag's end changed only the history, so its last
  position never autosaved (the effect now watches the whole history). Run 2: 53/54 — the probe asserted the grid on both axes while the wall
  snap holds the other axis flush (probe corrected to the rule).
- Added: the client's portal bell row *A 3D layout from your designer* (`BELL_PRODUCERS.push`, `BellHome.layouts`, filled in
  `lib/portal/notifications.ts` while Designs is on); *Who may do what* rows `layout-project` · `layout-start`.

- Final build: probe `verify-pj-gap-j.cjs` **55/55** (1440 and 390 / 320, fresh copy of the repaired DB, put back in `finally`). Regression on fresh
  copies: r1 83/83 · r7 62/62 · r8 65/65 · r9 65/65 · fix-F 44/44 · gap-a 66/66 · gap-d 64/64 · gap-g 67/67 · gap-h 65/65 — no probe changed but
  mine. tsc clean; eslint 0 errors (the 9 old warnings); design:lint holds; design:anatomy (its routes gained `/planner`) 56 pages, 1,204 measures
  hold. Shots banked in `design-source/verify/projects/gap-j/` (19). :3131 stopped.

## Not built, and why
- **AI inside the planner** (1.0 F-256: auto-arrange, photoreal render and render tour, furniture from text / a photo / a catalogue page, the
  fix-the-plan wizard, AI from a plan image or a room photo): each needs an engine the prototype doesn't have; the AI Visualizer renders rooms
  (J-Q20). *Start with furniture placed* is the rule-based stand-in for Pre-Furnished. Nothing is metered, so no credits (1.0 charged none).
- **Multi-floor layouts, elevations, presentation mode (sun, time of day), HD / GLB models, versions with summaries, save as template**
  (1.0 F-254 · F-257 · F-259): left for later (j-read §4); Duplicate is the way to reuse a layout, Undo covers a visit, the share is the
  client's snapshot.
- **"Floorplan to 3D Isometric"** (F-251) is a separate AI image tool — its Tools tile still answers Coming soon.

## For the map (CLAUDE.md) and the other packages
- Model `lib/planner/model.ts` (pure: PlanDoc in whole cm, `wallRuns` · `wallBoxes` · `footprint` · `overlapsOf` · `snapPiece` · `snapRoomEdge` ·
  `cleanPlan` — the server's shape check, `forClient` — no underlay), `lib/planner/catalogue.ts` (42 pieces), `lib/planner/templates.ts` (six
  flats, `furnish`, `ROOM_PRESETS`), `lib/planner/look.ts` (finishes through the Visualizer's `resolveMaterial`), `lib/planner/policy.ts`,
  reads `lib/planner/queries.ts` (`fetchPlannerHome` · `fetchPlannerEditor` · `fetchProjectLayouts` · `fetchPublicLayout` · `fetchPortalLayouts` ·
  `libraryFor`), actions `app/planner/actions.ts`.
- Components `components/planner/*`: `plan-drawing.tsx` (the one SVG top view), `scene/{build.ts,three-view.tsx}` (three.js), `editor/*`,
  `home/planner-home.tsx`, `viewer/*`, `print/layout-print.tsx`, `new-layout-dialog.tsx`, `project-layouts-dialog.tsx`, `planner-ghosts.tsx`.
- Routes: `/planner` (shell), `/planner/[layoutId]` (`(edit)` group, `?view=3d|walk` · `?share=1` · `?from=`), `/planner/[layoutId]/print`,
  `/space/[token]` (no sign-in), `/my/<slug>/layout/<shareId>` (portal, Designs switch).
- Tables `space_layouts` · `space_layout_shares` (timestamps ms); migration generated locally as `drizzle/0080_open_mercury.sql`.
- Dependencies added: `three@^0.186.1` (dependencies) and `@types/three@^0.186.0` (devDependencies) — run `npm install` in MAIN at the merge.
- Shared files appended (minimal): `lib/db/schema.ts` · `lib/db/baseline.ts` · `scripts/snapshot-baseline.ts` (two tables) · `lib/projects/events.ts`
  · `lib/leads/events.ts` (eight `project_layout_*` kinds) · `lib/leads/activity.ts` (branch + `layouts` group) · `lib/projects/tabs.ts` (chip) ·
  `lib/notifications/model.ts` (event, default, two templates; one line edited: `SAMPLE_FIELDS` gains `{layout}`) · `lib/keys/registry.ts` (area +
  ten keys via `splice`, `PLANNER_KEYS`) · `lib/global-search/model.ts` (kind `layout` — one line edited: the Designs scope's kinds — label, order,
  Go to page, Create row) · `lib/global-search/queries.ts` (a job + import) · `lib/nav.ts` (`fromLabel` one line) · `lib/settings/permissions.ts`
  (two rows) · `lib/portal/notifications-model.ts` + `notifications.ts` (kind, `BellHome.layouts`, a producer, one fill line) ·
  `scripts/repair-demo-data.ts` (R88 + four checks + imports; REG-613's kind list gains eight) · `lib/leads/purge.ts` (a lead gone for good takes its layouts — one line).
- Other packages' files touched (minimal): `components/shell/tools-popover.tsx` (the tile's href) · `components/projects/project-menu.tsx` (one
  action + row) · `components/projects/project-frame.tsx` and `projects-workspace.tsx` (the dialog's state, its handler, its mount) ·
  `components/portal/designs/portal-designs.tsx` (optional `layouts` prop, `any`, the section) · `app/my/[slug]/designs/page.tsx` (one fetch) ·
  `components/visualizer/editor/panels/material-picker.tsx` (three optional props: `onUpload?` · `keepWords` · `styleHint` — the Visualizer
  unchanged).

