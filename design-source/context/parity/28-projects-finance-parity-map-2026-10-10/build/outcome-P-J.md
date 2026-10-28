# P-J · The 3-D Space Planner — outcome (parity-map build, 2026-10-10)

Brief: `build/brief.md` § P-J · map rows `rows/td.json` (TD-073 · TD-075 · TD-076 · TD-081 · TD-087 · TD-088 · TD-089 · TD-090 · TD-091 · TD-092 ·
TD-098) · the gaps build's planner record `projects-gaps-build/j-read.md` + `j-outcomes.md` (its §4 "Not in this package" is what this round
builds) · register rows `build/reg-P-J.md` (REG-P-J.1…13) · probe `design-source/verify/parity-map-build/verify-pm-j.cjs` (written, not run —
no build, no server, no browser in this round).

Status: **Built (code)** = written, `tsc --noEmit` clean for every file of the package, `eslint` 0 errors / 0 warnings on them, `npm run
design:lint` holds (nothing new). Pure modules exercised with `tsx` on a scratch copy of `pbuild/src.db` (never `local.db`, never `src.db`):
the examples, the describe table, the elevation, the levels' shape check, the version summary and the R95 repair (twice — idempotent).

## Per map row

| Row | Outcome | What changed (files) | What to check in the browser |
|---|---|---|---|
| **TD-081** View toggles | Built (code) | `editor/planner-topbar.tsx` (`ViewMenuButton`, the bar's `viewButton` slot; css), `editor/planner-editor.tsx` (the View ▾ `PortalMenu`: Isometric · Ruler · Furniture · Dimensions · Present; per-visit state), `editor/top-view.tsx` (+ css: the Ruler — `Measure`, `RulerLine`, `snapMeasure`; `showPieces` · `showDims`), `plan-drawing.tsx` (`showPieces`), `scene/build.ts` + `scene/three-view.tsx` (`pieces`), `lib/planner/model.ts` (`snapMeasure` · `lengthText`) | Dane, any layout, 1440: View ▾ beside Top · 3D · Walk; Furniture off → the Top view and 3D bare, on again; Dimensions off → no sizes / overall lengths; Ruler → crosshair + hint, two presses (or a drag) → the line with "2.35 m", ends snap to walls / piece sides (Alt free), Esc clears, Esc again stops; picking Ruler from 3D switches to Top. 390: the ▾ is an icon beside the floating switch, the menu a sheet. |
| **TD-075** Multi-floor layouts | Built (code) | `lib/planner/model.ts` (`Level`, `PlanDoc.levels` · `levelName`, `LEVEL_ONE` · `MAX_LEVELS` · `levelsOf` · `onLevel` · `putLevel` · `allRooms` · `allPieces` · `totalArea`; `cleanPlan` cleans each level; `forClient` / `withoutUnderlays` strip every level's floor plan), `planner-editor.tsx` (the level on screen: every edit goes through `change` = the level's view, `changeDoc` = the whole plan; add / rename / remove with Undo; Copy Level 1's rooms; the stage's level switch), `editor/panels.tsx` (Rooms panel: "+ Add a level", the levels card), `viewer/layout-viewer.tsx` (+ css: level chips), `print/layout-print.tsx` (a plan page per level, rooms / furniture name the level), `lib/planner/queries.ts` + `viewer/portal-layout-cards.tsx` (counts and areas over every level), `editor.module.css` | Dane: Rooms › + Add a level → Level 2's empty state with *Copy Level 1's rooms*; the level switch top right (under the view switch at 390); Rename · Remove (Undo) on the Rooms panel's card; Level 1 can't be removed. Share it → `/space/<token>` shows Level chips; `/planner/<id>/print` has a plan page per level. A layout with one level looks as before, save the Rooms panel's quiet "+ Add a level". |
| **TD-076** Custom templates | Built (code) | `app/planner/actions.ts` (`saveLayoutAsTemplate` · `undoSaveAsTemplate` · `readLayoutTemplates`; `createLayout({ fromLayoutId })`; a template never links to a project nor shares — `TEMPLATE_STAYS`; names of personal layouts no longer collide with templates'), `lib/planner/queries.ts` (`TemplatePick` · `templatePickOf` · `fetchLayoutTemplates`; cards' kind `template`; `PlannerHome.templates`; `fetchProjectLayouts().templates`; the editor's `layout.isTemplate`), `new-layout-dialog.tsx` (My templates above the flats), `home/planner-home.tsx` (Kind: Templates, the card's "Template", ⋮ › Start a layout from it, the New ▾ row's words), `project-layouts-dialog.tsx` (passes the templates), editor ⋮ (Save as a template / Start a layout from it; chip "Template", Share rests) | Dane: a layout's ⋮ › Save as a template (Undo); /planner Kind: Templates; New ▾ › From a template or a flat… → My templates; start → a personal copy. A project's ⋮ › Plan the space in 3D › Start a new layout lists My templates too. Open a template: chip Template, Share with client disabled with its reason; Germaine opening Dane's template reads it (personal rule) and can start from it. |
| **TD-073** Inspiration gallery | Built (code) | NEW `lib/planner/examples.ts` (`EXAMPLES` — six flats × a design style; `examplePlan` = the furnish rule + the style's `suggestMaterials` floor / wall / bathroom picks), `createLayout({ exampleKey })`, `new-layout-dialog.tsx` (`mode="examples"`), `home/planner-home.tsx` (New ▾ › From an example…; the first run's `empty.samples` tiles; css) | /planner New ▾ › From an example… → *Start from an example*, six drawn cards, All · HDB · Condo · Landed; Start → "HDB 4-Room — Japandi" furnished, floors and walls in the style. An empty gallery (a studio with no layouts) shows four examples under its buttons. |
| **TD-087** Version history | Built (code) | `app/planner/actions.ts` (`keepVersion` — each share keeps one, 60 kept; `saveLayoutVersion` by hand or `before` a Bring back; `readLayoutVersions`), `lib/planner/queries.ts` (`LayoutVersionRow` · `VERSION_NOTES` · `fetchLayoutVersions` with the summary), `lib/planner/model.ts` (`versionSummary` — 1.0's automatic summary), NEW `editor/versions-drawer.tsx` (+ css), editor ⋮ (Save a version · Versions… with its count; Bring back = one change + Undo) | Dane: ⋮ › Save a version; ⋮ › Versions… → the house side panel (a sheet at 390): name field, rows with a top view, label, when · who, "2 pieces added · …"; change something, Bring back → the version on screen + a "Before bringing back …" row; Undo. A share adds "Shared with the client". Alex on Dane's layout: the list, no Save, Bring back rests with the rule. |
| **TD-088** Auto-Arrange | Built (code) — a rule, not AI | `lib/planner/templates.ts` (`ARRANGED_KINDS` · `arrangeBlock` · `arrangeRoom`), `editor/inspector.tsx` (the room's ⋮), `planner-editor.tsx` (`arrange` — the room's pieces out, the rule's in, Undo puts back exactly what was there) | Pick a bedroom → its ⋮ › Arrange the furniture → snackbar "Master bedroom arranged — 4 pieces placed, 4 taken away" + Undo. A store / corridor / porch: the row says there's no rule. Read-only: the row says the layout's rule. |
| **TD-089** AI room render (+ tour) | Built (code) — the render; the tour not built | editor ⋮ › Render in AI Visualizer (`renderInVisualizer`: the 3D frame → a JPEG → `openLeadDesign(project.leadId)` or `createDesign({ name })` → `stashPhotos` → `/visualizer/<id>?from=…`; `jpegFile`) — the Visualizer's own upload path adds the room (`takePhotos` in its editor) | Benjamin's SkyOasis (a project's): ⋮ › Render in AI Visualizer → the Visualizer opens on Benjamin's design with a new room of the 3D view; Back returns to the layout. A personal layout starts a personal design named after it (the Visualizer then offers "For a lead? Link it"). Nothing charged until Generate there. |
| **TD-090** Furniture made by AI | Built (code) — a stand-in | NEW `lib/planner/describe.ts` (`describePiece`: colour words → the eight colours, seats / bed sizes / sizes in cm or m, a phrase table → a catalogue key), `editor/panels.tsx` (the Furniture search's *Closest piece to your words* card; css), `planner-editor.tsx` (`placeDescribed`, `addPiece`'s patch), `lib/planner/catalogue.ts` (`PIECE_COLOUR_NAMES`, shared with the inspector) | Furniture: type "a 3-seater sofa in grey" → the card (3-seater sofa · Stone grey · 210 × 90 × 85 cm) → Place it. "wardrobe 180 cm wide in walnut" → a full-height wardrobe 180 wide, Walnut. Plain words ("sofa") still filter the grid as before. |
| **TD-091** Elevations | Built (code) | NEW `lib/planner/elevation.ts` (`elevationOf` — the wall faced from inside, openings, pieces within 45 cm, a pendant from the ceiling), NEW `editor/elevation-panel.tsx` (+ css; the house `Drawer`), NEW `svg-png.ts` (`svgToPng` — moved out of `top-view.tsx` — and `downloadDataUrl`), the room's ⋮ › Wall elevations… | Pick a room → ⋮ › Wall elevations… → the side panel: wall chips (the longest standing wall first), the drawing with doors / windows / pieces and their sizes, the list; Download PNG. 390: a sheet. |
| **TD-092** Presentation mode | Built (code) — Present; HD, sun angle / time of day not built | `planner-editor.tsx` (`tour` over every level, corridors skipped; `startPresent` · `stopPresent` · `presentStep`; full screen where the browser allows; ← → Space / Esc; the room's level comes on screen with it; walls low, no selection, the camera never saved), `editor.module.css` (`[data-present]`, the title and the bar) | View ▾ › Present → the stage alone, "{room} · {layout} · {level}" top left, ‹ "1 of 9" › Exit at the foot; → walks on (and across levels), Esc / Exit ends it. 390 too. |
| **TD-098** Floorplan to 3D Isometric | Built (code) | `scene/three-view.tsx` (`iso`: an orthographic camera at the true isometric angle, `toIso` frames the whole layout with its walls; `toPersp`; the layout's camera never overwritten by it), View ▾ › Isometric, `app/(editor)/planner/[layoutId]/(edit)/page.tsx` (`?view=iso`), `home/planner-home.tsx` (`?view=iso`: the quiet line, layouts open / start isometric; css), `planner-ghosts.tsx` (the line's bone; the bar's View ▾ bone), `components/shell/tools-popover.tsx` (the tile's `href: '/planner?view=iso'` — no longer Soon) | Tools › Floorplan to 3D Isometric → /planner?view=iso with its line; open a layout → 3D, isometric (View ▾ ticks Isometric); Walk goes perspective, back to 3D is isometric again; *Open layouts as usual* drops the mode. The Tools panel marks 3-D Space Planner as the tool you are in. |

## Probes changed
- `design-source/verify/projects/verify-pj-gap-j.cjs` step 2: the New ▾ row is matched as `/From a (flat template|template or a flat)/` —
  *(parity map, TD-076 — a deliberate change of this rule)*: once the studio has a template (R95 makes one) the row reads "From a template or a
  flat…". Its other assertions hold as written (≥ 7 cards — My templates only adds; the trace card still there; one-level layouts unchanged).
- `design-source/verify/ux-build-2026-09-30/P7/verify-p7.cjs` (Tools tiles still to come wear Soon) holds: Market Insights and Meeting Copilot
  are still Soon, and the Isometric tile now has its `href` with no Soon tag.
- NEW `design-source/verify/parity-map-build/verify-pm-j.cjs` — every row above as its rule, self-contained (it makes its template, level and
  versions through the screens), puts back `space_layouts` · `space_layout_shares` · `space_layout_versions` · `lead_events` (layout kinds) ·
  `notifications` · `members` · `visualizer_designs` · `project_rooms`; shots at 1440 and 390 (+ 320's overflow). Args `<scratch.db> [shotDir]`,
  env `BASE`; refuses `local.db`. Needs the WebGL flags the gaps probe uses (in the file).

## Needs from others (the orchestrator wires these)
1. **`scripts/repair-demo-data.ts`** — insert the R95 block below after R94 (or the next free number), its import, and its three checks (with
   R88's checks). Then re-take the baseline.
2. **`lib/keys/registry.ts`** — the `?` panel's planner rows: add `{ id: 'plan3d.present', keys: 'left|right', label: 'Present: the room before · the next (Esc ends it)', area: 'planner' }` and change `plan3d.back`'s label to *Let go of the selection, stop drawing, or clear the ruler* (the editor already does both).
3. **`lib/projects/designs.ts`** (project › Design › Designs) — a layout's room count reads level 1 only: `rooms: readPlan(x.plan).rooms.length` →
   `allRooms(readPlan(x.plan)).length` (`import { allRooms } from '@/lib/planner/model'`).
4. **`lib/global-search/queries.ts`** (P-G) — a template reads "3D layout · Personal": select `spaceLayouts.isTemplate` and say *3D layout ·
   Template* for one.
5. **`app/leads/[id]/overview.tsx`** (a lead without a project starts a personal layout through `NewLayoutDialog`) — optional: pass
   `templates={await readLayoutTemplates()}` (from `@/app/planner/actions`, read when the dialog opens) so My templates shows there too. Its
   `startLayout` spreads the pick, so the new `fromLayoutId` / `exampleKey` already ride through.
6. `CLAUDE.md` Map › the planner entry: levels (`PlanDoc.levels` · `onLevel` / `putLevel`), templates (`is_template`), versions
   (`space_layout_versions`, `VERSION_NOTES`), `lib/planner/{examples,describe,elevation}.ts`, `components/planner/svg-png.ts`,
   `editor/{elevation-panel,versions-drawer}.tsx`, `?view=iso`.

### Repair text (R95)
Import, with the planner's other imports at the head of the script:
```ts
import { furnish as plannerFurnish, planFromTemplate as plannerPlanFromTemplate, templateRoom as plannerTemplateRoom } from '../lib/planner/templates'
```
(i.e. add `templateRoom as plannerTemplateRoom` to the existing `../lib/planner/templates` import.) The block:
```ts
  /* ── R95 · the 3-D Space Planner's parity round (parity map P-J, 2026-10-10 — her "build everything that's in 1.0") ───────────────────
     What the round's new pieces need to show on the demo, each backed by its records: (TD-087) SkyOasis keeps two versions — its share's
     (the snapshot as shared on 4 Oct, "Shared with the client") and Germaine's own the day before, the kitchen island not placed yet
     ("Before the kitchen island"); (TD-076) the studio's own template — Dane's "Studio standard — HDB 5-Room", furnished, the studio's walnut
     vinyl and sage walls — under New layout › My templates and the gallery's Templates; (TD-075) Dane's personal "Landed terrace — two storeys":
     the landed flat furnished on its Ground floor, and an Upper floor of its own (a family area, the master bedroom, two bedrooms and a
     bathroom off a landing), furnished by the same rule. Idempotent: fixed ids (`sid`), INSERT OR IGNORE. (invented copy: the layouts' and
     the levels' names, the hand-kept version's note) */
  console.log('\nR95 3-D Space Planner parity — a share’s version, a template, a two-storey layout')
  {
    const cols = rows<{ name: string }>(await client.execute(`PRAGMA table_info(space_layouts)`)).map((c) => c.name)
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'space_layout_versions'`))[0]?.n ?? 0)
    if (have === 1 && cols.includes('is_template')) {
      let made = 0
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
      const clean = (p: unknown) => JSON.stringify(plannerCleanPlan(p, plannerIsPieceKey))
      const version = (id: string, layoutId: string, rev: number, name: string, plan: string, note: string | null, by: string, at: number) =>
        exec(`INSERT OR IGNORE INTO space_layout_versions (id, layout_id, rev, name, plan, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)`, [id, layoutId, rev, name, plan, note, by, at])
      const layout = (o: { id: string; name: string; template: string; plan: unknown; at: number; editedAt: number; rev: number; isTemplate: boolean }) =>
        exec(`INSERT OR IGNORE INTO space_layouts (id, name, template_key, project_id, lead_id, plan, rev, created_by, updated_by, created_at, updated_at, deleted_at, deleted_by, is_template) VALUES (?,?,?,NULL,NULL,?,?,'dane','dane',?,?,NULL,NULL,?)`,
          [o.id, o.name, o.template, clean(o.plan), o.rev, o.at, o.editedAt, o.isTemplate ? 1 : 0])
      const finish = (rooms: { kind: string; floor: string | null; wall: string | null }[], floors: Record<string, string>, wall: string) =>
        rooms.forEach((r) => { if (r.kind === 'balcony' || r.kind === 'outdoor') return; r.floor = floors[r.kind] ?? floors['*'] ?? null; r.wall = r.kind === 'bathroom' || r.kind === 'yard' ? null : wall })
      const STUDIO = { living: 'lib:sm-walnut-vinyl', dining: 'lib:sm-walnut-vinyl', master: 'lib:sm-walnut-vinyl', bedroom: 'lib:sm-walnut-vinyl', study: 'lib:sm-walnut-vinyl', kitchen: 'floor-007', bathroom: 'floor-003', yard: 'floor-003', '*': 'floor-004' }

      /* 1 · SkyOasis — the share's version (its snapshot as shared) and Germaine's own the day before, the kitchen island not placed yet */
      const [sky] = rows<{ id: string; name: string; plan: string; shared_at: number; snapshot: string }>(await client.execute(`SELECT l.id, l.name, l.plan, s.shared_at, s.snapshot FROM space_layouts l JOIN space_layout_shares s ON s.layout_id = l.id AND s.revoked_at IS NULL WHERE l.name = 'SkyOasis — proposed layout' AND l.deleted_at IS NULL LIMIT 1`))
      if (sky) {
        await version(sid(sky.id, 'pj:version:shared'), sky.id, 7, sky.name, clean(JSON.parse(sky.snapshot)), '@shared', 'germaine', Number(sky.shared_at))
        const before = JSON.parse(sky.plan) as { pieces: { key: string }[] }
        before.pieces = before.pieces.filter((p) => p.key !== 'island')
        await version(sid(sky.id, 'pj:version:hand'), sky.id, 5, sky.name, clean(before), 'Before the kitchen island', 'germaine', ms(2026, 9, 3, 17, 20))
      }

      /* 2 · the studio's own template — never a project's, every member starts from it */
      {
        const plan = plannerPlanFromTemplate('hdb-5', true)
        finish(plan.rooms, STUDIO, 'lib:sm-sage-whisper')
        await layout({ id: sid('dane', 'pj:layout:template'), name: 'Studio standard — HDB 5-Room', template: 'hdb-5', plan, at: ms(2026, 8, 30, 10, 0), editedAt: ms(2026, 8, 30, 10, 40), rev: 3, isTemplate: true })
      }

      /* 3 · a two-storey landed house — the ground floor from the template, an upper floor of its own over the house's footprint */
      {
        const id = sid('dane', 'pj:layout:two-storey')
        const T = plannerTemplateRoom
        const ground = plannerPlanFromTemplate('landed', true)
        const up = [
          T('lu', 'family', 'Family area', 'living', 0, 450, 700, 500, { windows: [['n', 150, 240], ['w', 150, 200]], open: ['s'] }),
          T('lu', 'master', 'Master bedroom', 'master', 700, 450, 600, 500, { doors: [['s', 60, 90]], windows: [['n', 200, 200], ['e', 150, 150]] }),
          T('lu', 'landing', 'Landing', 'corridor', 0, 950, 1300, 120, { open: ['n'] }),
          T('lu', 'bed4', 'Bedroom 4', 'bedroom', 0, 1070, 450, 380, { doors: [['n', 330, 90]], windows: [['w', 110, 160], ['s', 150, 150]] }),
          T('lu', 'bed5', 'Bedroom 5', 'bedroom', 450, 1070, 450, 380, { doors: [['n', 330, 90]], windows: [['s', 150, 150]] }),
          T('lu', 'bath', 'Bathroom', 'bathroom', 900, 1070, 400, 380, { doors: [['n', 60, 70]], windows: [['s', 170, 60]] }),
        ]
        finish(ground.rooms, STUDIO, 'paint-001'); finish(up, STUDIO, 'paint-001')
        const plan = { ...ground, levelName: 'Ground floor', levels: [{ id: `lv-${id.slice(0, 8)}`, name: 'Upper floor', rooms: up, pieces: plannerFurnish(up), underlay: null }] }
        await layout({ id, name: 'Landed terrace — two storeys', template: 'landed', plan, at: ms(2026, 9, 1, 14, 0), editedAt: ms(2026, 9, 1, 15, 25), rev: 6, isTemplate: false })
      }
      note(`${made} record(s) — SkyOasis’s two versions, the studio’s template, a two-storey layout`)
    }
  }
```
The checks (beside R88's):
```ts
    ['template on a project or with a lead (parity map P-J, R95)', `SELECT name FROM space_layouts WHERE is_template = 1 AND (project_id IS NOT NULL OR lead_id IS NOT NULL)`],
    ['layout version kept before its layout began (parity map P-J, R95)', `SELECT v.id FROM space_layout_versions v JOIN space_layouts l ON l.id = v.layout_id WHERE v.created_at < l.created_at`],
    ['share snapshot with a floor plan under one of its levels (parity map P-J, R95)', `SELECT s.name FROM space_layout_shares s, json_each(s.snapshot, '$.levels') e WHERE json_extract(e.value, '$.underlay') IS NOT NULL`],
```
Dry-run on a scratch copy of `pbuild/src.db`: first run 4 records, second 0; the three checks empty; the upper floor's 20 pieces and the ground
floor's 26 overlap nothing (`overlapsOf`); SkyOasis's versions read "1 piece added" (the share's, over Germaine's) and "5 rooms · 19 pieces"
(the oldest kept). Nothing is shared or on a project, so no Activity line or bell row is owed.

## Stand-ins (say so to the owner; nothing on screen claims more)
- **TD-090** a described piece is a word table against the planner's 42-piece catalogue — it never makes a new 3D shape (1.0's text / photo /
  catalogue-page → model). No credits.
- **TD-088** Arrange is the furnishing rule of *Start with furniture placed*, run on one room as it stands — not 1.0's AI arrangement.
- **TD-073** the examples are made by rule (the flat's furnish rule + the AI Visualizer style's material picks) — 1.0's "Made with" cards were
  four fixed mock items.
- **TD-089** the planner only hands the 3D frame to the AI Visualizer as a room photo; the photoreal render is the Visualizer's own Generate
  (its price, its stand-in engine). 1.0's *Render Tour* (several renders in one go) is not built — Present walks the rooms and each view can be
  sent on its own.
- **TD-098** 1.0's tool turned an uploaded floor-plan picture into an AI dollhouse / top-down image. 2.0's tile opens the planner's own
  isometric view of a layout (traced from a project's floor plan, or a flat) — no picture is generated from an upload.

## Not built, and why
- **TD-092** HD mode, the sun's angle and time-of-day sliders, faded / solid walls — Walls Low (and Present's low walls) stands in; the three.js
  scene has one sun and no HD pipeline.
- **TD-091** 1.0's kitchen / wardrobe reference lines (counter 85, upper cabinets 145–225, switches, sockets) and moving pieces inside the
  elevation — the elevation is read-only; pieces move on the Top view.
- **TD-087** 1.0 kept a version on every manual Save; 2.0 saves itself every moment, so versions are kept on each share, by hand and before a
  Bring back (sixty per layout), not on every save.
- **TD-075** 3D shows one level at a time (no stacked storeys, no stairs piece); levels are drawn on their own, as 1.0's floor tabs were.
- Activity lines for versions / templates / renders — not added (none is a project's moment the client sees; region P-J in
  `lib/leads/activity.ts` left empty).
