export const meta = {
  name: 'ai-visualizer-fix-wave-d',
  description: 'Fix what the live verification found still open or new, by package on disjoint files',
  phases: [ { title: 'Wave D', detail: 'eight packages take the verification round’s open and new items' } ],
}
const S = args.scratch
const OWN = {
  share: 'components/visualizer/share/**, app/renders/** (page, loading, layout, actions.ts), components/shell/page-reveal.* ONLY if the fix cannot live in the share page (prefer the share page\'s own CSS: its roots get flex:1 / min-width:0 / width:100% inside PageReveal)',
  server: 'app/visualizer/actions.ts, app/visualizer/state/route.ts (new), app/visualizer/img/**, app/files/img/**, lib/visualizer/queries.ts, lib/visualizer/policy.ts, lib/visualizer/outputs.ts, lib/visualizer/picture-store.ts, lib/visualizer/images.ts, lib/visualizer/room-name.ts, app/company/materials-actions.ts, lib/leads/activity.ts (visualizer lines only), lib/notifications/** (render_feedback only), scripts/repair-demo-data.ts (R61/R62 only, idempotent, with checks)',
  engine: 'lib/visualizer/engine/**, lib/visualizer/samples.ts, lighting.ts, furniture.ts, model.ts, note.ts, tools.ts, materials.ts, patterns.ts, catalogue.ts, surfaces.ts, demo.ts, lib/visualizer/data/** (read-only unless a data bug), scripts/viz/**, public/visualizer/demo/**',
  editor: 'components/visualizer/editor/visualizer-editor.tsx, use-editor-state.ts, editor-model.ts, editor.module.css, topbar.tsx, topbar.module.css, skeletons.*, app/(editor)/visualizer/**, lib/nav.ts',
  canvas: 'components/visualizer/editor/stage.tsx, stage.module.css, pin-card.*, versions-strip.*, components/om/compare-slider.*, components/visualizer/editor/dialogs/** (share, present, moodboard, add-room, small-dialogs, quote, version-facts, dialogs.module.css, …)',
  rail: 'components/visualizer/editor/rail.tsx, rail.module.css, describe-box.*, panels/**',
  gallery: 'components/visualizer/home/**, app/visualizer/page.tsx, loading.tsx, layout.tsx, components/company/materials/**, app/company/materials/**, components/company/templates/library-gallery.* + library-deleted-sheet.tsx (keep other galleries identical unless the fix is right for them too), components/om/folders/**',
  leads: 'components/leads/** (files, tasks table, detail quick links / info column), app/leads/[id]/** (overview.tsx and the tab frames), components/shell/notifications-panel.*, components/shell/mobile-nav.* (only for a lead\'s way into its design on a phone)',
}
const DECISIONS = `OWNER-LEVEL CALLS already made (apply them; the integrator logs them in the register):
D1 Client pins: the client's link shows only threads the client started, with the studio's replies in them. The studio's own pins stay internal (never on the link). The share dialog says so in one line under the versions: "Your team’s pins stay private — {first name} sees only the notes {she/they} add." → use "Your team’s pins stay private — the client sees only their own notes." (invented copy).
D2 Who hears the client: every answer (favourite, note, pin, reply, call back) notifies the lead's members AND whoever shared the link (the link's created_by), de-duplicated; the call-back Follow-up task is assigned to the sharer plus the lead's members. The page names the sharer (as it does now), so what it promises is now true.
D3 Customize finishes that name a PART (Planter, Frame, Screen, Legs, Base…): on the sample pieces, trace the part (fig → its pot; art → its frame ring = outer outline minus the canvas; TV → its bezel/stand; lamp → base/shade where it applies) as a \`parts\` map on the piece and paint only that part; on a piece with no traced part, don't offer that row (offer the whole-piece rows only). Never paint leaves, canvases or screens with a planter/frame/bezel finish.
D4 Room names from files: lib/visualizer/room-name.ts roomNameFromFile() exists and the editor already uses it for rooms made from photos (Files' photo, upload, drop). The server's roomRow falls back to "Room n". Use it anywhere else a room is named from a file.
D5 Keyboard hints (critic-17): show a shortcut in a tooltip only where the shortcut already exists (e.g. ⌘Z / ⇧⌘Z on Undo/Redo, ← → in the strip's head). No '?' sheet.
D6 Materials in use (critic-13): the material's delete confirm and the Deleted sheet's Delete forever say "Used in n designs" when it is; the picker's "Now" line reads "{name} (renamed since)" when the version's snapshot name differs from the material's current name.
D7 A lead's way into its design on a phone: mirror how Quote X-Ray reached the phone (E-81): the lead's phone chrome offers "AI Visualizer" where the other quick links go on a phone.
D8 The Tasks table's 150px empty band on touch tablets (REG-310's end band landing at the start) is a real bug found here: fix it in components/leads/tasks/tasks-table.module.css for every table that shares the rule (check the listing's tables too, don't break the leads listing).
D9 Autosave that survives a reload (F041/F201, the "false Changed in another tab"): CONTRACT between server and editor — (a) server: POST /visualizer/state (app/visualizer/state/route.ts, same-origin JSON body { roomId, pending?, detection?, baseRev? }) runs the SAME logic as saveRoomState (move the body into one shared server function; same viewer and Who-sees-leads checks) and returns the same JSON; and saveRoomState (both paths) treats a baseRev mismatch as success — no bump, return { savedAt, stateRev: current } — when the stored state already equals the incoming one (compare the lifted pending JSON and the detection JSON), so a flush landing late never reads as another tab. (b) editor: on pagehide and on visibilitychange→hidden, flush dirty rooms with fetch('/visualizer/state', { method: 'POST', keepalive: true, headers: {'content-type':'application/json'}, body }) (keepalive body ≤ 64 KB — pictures are addresses now) and ALSO write a sessionStorage draft om.viz.draft.<roomId> = { baseRev, pending, detection, at }; on load, a draft younger than 2 minutes whose baseRev equals the loaded stateRev (the flush hadn't landed when the page read) is taken as the room's current picks and saved normally; a draft whose baseRev is below the loaded rev is dropped. Keep the unmount/Back flush.`
const RET = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'object', properties: { ref: { type: 'string' }, what: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['ref', 'what', 'files'] } },
    notDone: { type: 'array', items: { type: 'object', properties: { ref: { type: 'string' }, why: { type: 'string' } }, required: ['ref', 'why'] } },
    crossFileRequests: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, change: { type: 'string' }, ref: { type: 'string' } }, required: ['file', 'change', 'ref'] } },
    iconsNeeded: { type: 'array', items: { type: 'string' } },
    registerLines: { type: 'array', items: { type: 'string' } },
    verification: { type: 'string' },
  },
  required: ['done', 'notDone', 'crossFileRequests', 'iconsNeeded', 'registerLines', 'verification'],
}
const COMMON = (key) => `You are fixing the OpenMaison 2.0 prototype's AI Visualizer after a live verification round (repo /Users/vicky/Documents/GitHub/openmaison-prototype; CLAUDE.md applies — house pieces (components/om/*), DS tokens, lib/motion, radii 4/8/12, modal header standard, strict TS + noUncheckedIndexedAccess, strict react-hooks lint: no setState in effect bodies, no refs read in render, no Date.now() in render; every inert affordance answers "Coming soon in OpenMaison 2.0"; plain words for studio staff). The goal is a world-class, pixel-perfect studio tool at every width (1440, 1280, 1025, tablet 1024×768 and 768×1024 touch, phone 390/375 and 320, phone landscape 844×390).

THE WORK LIST: ${S}/verify/round1.json — 13 verifiers' results. For every result whose status is partly / not-fixed / regressed / cannot-check, "remaining" says what is still wrong; and every "newIssues" entry is a new defect (with repro, evidence, a proposed fix, files and a screenshot you can Read). Many new issues are reported by several verifiers — dedupe them. The original audit (F-ids, with the verifier's fix under verdict) is ${S}/audit/result.json; earlier waves' reports are ${S}/fix/wave-{a,b,c}.json.
TAKE every item whose fix lives mainly in YOUR files (your package: ${key}); do your part of items that span packages and put the other side in crossFileRequests with the exact change. Items that are proposals needing the owner (not defects) → notDone with why, unless a call below settles them.

${DECISIONS}

RULES: eight agents edit the same working tree at once, on DISJOINT files. Edit ONLY: ${OWN[key]}. Icons not in public/fonts/ICONS.txt → iconsNeeded (don't subset yourself). Do NOT run next build / dev / start; never touch ports 3000/3001, 3021–3025 or local.db (servers on 3021–3025 run the PREVIOUS build — you may look at them read-only with Playwright to reproduce, NODE_PATH=/Users/vicky/Documents/GitHub/openmaison-prototype/node_modules; they won't show your edits). Verify with npx tsc --noEmit -p . and npx eslint on your files; engine changes also with the scripts/viz harnesses and by LOOKING at the output pictures. Don't edit design-source/REGISTER.md; return registerLines (one per user-visible change, with refs, flag invented copy). Scratch: ${S}/fix/d/${key}/. Refs: use the F-id, "critic-n", or "new:<lens>:<short title>".`
phase('Wave D')
const out = await parallel(Object.keys(OWN).map((k) => () => agent(COMMON(k), { label: `fix:${k}`, phase: 'Wave D', schema: RET, effort: 'high' }).then((r) => ({ key: k, ...(r || {}) }))))
return out.filter(Boolean)
