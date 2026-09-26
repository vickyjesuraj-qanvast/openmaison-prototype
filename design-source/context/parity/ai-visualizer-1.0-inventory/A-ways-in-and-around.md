# OpenMaison 1.0 — AI Visualizer inventory · Slice A: the ways in, the landing, and everything around the editor

1.0 repo `qanvast-id-tool` · branch `integ/security-non-qanvast` · commit `67f42e469` · read 2026-09-25 (read-only; every file in the slice read whole, neighbours opened where a call crossed into them).

## Abbreviations

| Code | Path |
|---|---|
| TOOL | `src/app/(main)/tools/ai-visualizer/page.tsx` (508 lines — the landing + the editor hand-off) |
| LAND | `src/components/visualizer/landing/` (`design-card.tsx` · `first-run-hero.tsx` · `landing-skeleton.tsx` · `start-strip.tsx`) |
| WSQ | `src/lib/queries/visualizer-workspace.ts` (the landing's data + mutations) |
| WSR | `src/app/api/visualizer/workspace/route.ts` |
| VIS | `src/components/projects/visualizer.tsx` (the editor, 5,904 lines — readers B/C/D; cited here only for its outward touchpoints) |
| SIDE / BNAV / TOP | `src/components/layout/app-sidebar.tsx` · `bottom-nav.tsx` · `topbar.tsx` |
| BUDDY | `src/components/layout/id-buddy-panel.tsx` |
| COACH | `src/components/ui/page-coach-marks.tsx` |
| CRUMB | `src/components/ui/breadcrumb.tsx` |
| ACL | `src/lib/access-control.ts` |
| PCFG | `src/context/platform-config-context.tsx` · `src/app/api/config/pages/route.ts` |
| LEAD | `src/components/leads/lead-detail-drawer.tsx` |
| PROJ | `src/app/(main)/projects/[projectId]/page.tsx` (5,130 lines) |
| KFR / TED / FLB / SRF / RAS | `src/components/projects/key-files-rail.tsx` · `tool-entry-dialog.tsx` · `file-lightbox.tsx` · `shared-render-feedback.tsx` · `render-annotator-studio.tsx` |
| FILES | `src/app/api/projects/[id]/files/route.ts` · `[fileId]/route.ts` |
| SHARE | `src/app/renders/[token]/page.tsx` (+ `layout.tsx`) |
| APIR | `src/app/api/renders/` (`share/route.ts` · `[token]/route.ts` · `[token]/consultation/route.ts`) |
| HL | `src/app/api/homeowner-links/` (`share-render` · `shared-renders` · `render-annotations` · `active-link`) |
| HOP | `src/app/my/projects/[projectId]/page.tsx` (the homeowner portal's project page) |
| HOAPI | `src/app/api/homeowner/projects/[id]/` (`design/route.ts` · `renders/[assetId]/…`) |
| RAH | `src/components/homeowner/render-annotator.tsx` |
| CPR / CPM / CPG | `src/app/api/copilot/render/route.ts` · `moodboard/route.ts` · `moodboard/gallery/route.ts` |
| UPV | `src/lib/copilot/upload-visual.ts` |
| AG | `src/lib/agents/` (`tools.ts` · `executors.ts` · `page-tool-map.ts` · `system-prompt.ts` · `page-context-serializer.ts` · `types.ts`) |
| INL | `src/components/dashboard/inline-response.tsx` |
| TRV | `src/components/trial-visualizer/` |
| DEMO | `src/app/api/demo/` (`restyle/route.ts` · `visualizer/{quota,detect,segment,render,photorealistic,declutter}/route.ts`) |
| VDEMO | `src/components/landing/visualizer-demo.tsx` |
| SPEC1 / SPEC2 | `docs/features/render-visualiser/spec.md` · `docs/features/visualizer-detection-editing/spec.md` |
| PRD / ONB / CHG | `docs/prd.md` · `docs/training/onboarding-script.md` · `CHANGELOG.md` |

## Vocabulary (what this slice defines)

- **Design** — one card on the landing. Three *kinds*: `project` (rooms with `project_rooms.project_id`), `lead` (`project_rooms.lead_id`), `session` (a *personal* design). `WorkspaceDesign { kind, refId, name, sub?, folderId, updatedAt, rooms[], roomIds[], renderCount, cover }` — WSQ:12-23.
- **Personal design / session** — a standalone design that belongs to no lead or project. Stored as JSON, not a table: `studios.settings.visualizerWorkspace.sessions[] { id, name, folderId, roomIds[], createdAt, updatedAt }` — WSQ:28, WSR:25. The chip says *Personal*; the code says *session*; the user-facing noun is *design* (commit `fa9cc279e`: "call personal items 'designs'").
- **Folder** — a grouping for personal designs only: `settings.visualizerWorkspace.folders[] { id, name }` — WSQ:24. *Unfiled* = `folderId null`.
- **Room** — a `project_rooms` row (`id, name, project_id, lead_id, original_image_url, created_at`) — WSR:60-63. A room belongs to a project, a lead, or (for sessions) nothing; a session lists its rooms by id.
- **Render / render count** — the number of *variants* across the room's `completed` `render_jobs` (`variants_json[].imageUrl`) — WSQ:73-83. Not a table of its own.
- **Cover** — the newest job's first variant image, else the room's `original_image_url`; a design's cover = its first room with a cover — WSQ:82, 105.
- **Kind chip** — *Project* · *Lead* · *Personal* — `design-card.tsx:10-14`.
- **Continue** — the 4 most recently updated designs; shown only in the *All* view with no search and more than 4 designs — TOOL:196-202.
- **Start strip** — the three ways to begin: *Blank design* · *From a lead* · *From a project* — `start-strip.tsx:97-130`.
- **Entity** — what the editor is opened on: `{ projectId? | leadId? | sessionId?, sessionRoomIds?, initialRoomId?, name }` — TOOL:39.
- **Photo Renders** — the project page's name for the tool (header button + entry dialog) — PROJ:1727, TED:38.
- **Renders folder** — `project_files.folder = "Renders"` (auto-filed) normalised to the chip id `renders` on read — VIS:2811, FILES route:103; the project's Files & Docs chip *Renders* — PROJ:384.
- **Auto-file** — after a render is saved to `render_jobs`, each variant is also written as a `project_files` row in *Renders* (projects only) — VIS:2805-2818, `src/lib/finance-auto-file.ts:31-63`.
- **Share link** — a `render_share_links` row: `token` (16 hex), `snapshot` JSON, `expires_at` = +7 days, `view_count`, `created_by` — APIR share:49-76. Public page `/renders/[token]`.
- **Snapshot** — the frozen JSON the public page shows: `variantImageUrl, originalImageUrl, roomName, style, materials[{label, material}], branding{logoUrl, primaryColor, companyName, tagline, companyAddress, phone, email}, countryCode` — APIR share:49-65.
- **Consultation request** — a `render_consultation_requests` row (`share_link_id, client_name, client_phone, message`) from the public page's form — APIR consultation:39-44.
- **Share to Portal** — a `homeowner_shared_assets` row (`asset_type "render"`, `project_link_id, title, url, thumbnail_url, shared_by`) keyed off the project's *active homeowner link* — HL share-render:74-83.
- **Like · comment · pin (annotation) · reply · resolved** — JSONB on `homeowner_shared_assets`: `likes[] { homeownerId, name, at }`, `comments[] { id, authorRole, homeownerId, authorName, body, createdAt }`, `metadata.annotations[] { id, x, y (0–1), body, status open|resolved, authorRole studio|homeowner, homeownerId, authorName, createdAt, comments[] }` — HOAPI like:13, comment:14-21, annotations:73-84.
- **Mood board · AI render (co-pilot)** — `copilot_visual_assets` rows of `type "mood_board" | "ai_render"` made during a live meeting; mirrored into `render_jobs` + `project_files` when the session is bound to a project — CPR:201-250, CPM:211-260.
- **mAIson / ID Buddy tools** — `detect_surfaces`, `generate_render`, `open_tool_page("visualizer")` — AG tools:420-462, 1575-1600.
- **Funnel** — `usage_events` with `feature_key "ai_visualizer"`: *Opened* (`feature_opened`) → *Render generated* (`feature_succeeded`), plus `feature_failed` — `src/lib/usage/funnels.ts:18-25`, `src/app/api/render/route.ts:30-34`.
- **Page key** — `tools/ai-visualizer`, the visibility flag an admin can switch off globally (`platform_config.page_visibility`) or per studio (`studios.settings.page_visibility`) — PCFG route:10-48.
- **Trial** — the anonymous `/try-visualizer` editor: cookie `om_trial_v1`, `TRIAL_LIMIT = 3` generations, watermark, flag `TRIAL_VISUALIZER_ENABLED` — `src/lib/render/trial-quota.ts`, `trial-gate.ts`.
- **Demo** — the older marketing `/try` restyle card: 3 sample restyles + 1 own-photo render, cookie `om_demo_v1`, flag `DEMO_VISUALIZER_ENABLED` — VDEMO:18-20, DEMO restyle:23-29.

## Overview / map

The AI Visualizer is one full-screen editor (`Visualizer` in VIS) with **two hosts**: the tool page `/tools/ai-visualizer` (TOOL) and the project page's `Renders` tab (PROJ:4040 — which, as recorded in D-04, no longer has a tab in the tab strip). The tool page is a **gallery landing**: a header (*AI Visualizer*, *New design*), a **Start strip** (Blank / From a lead / From a project), filter chips (All · Leads · Projects · Personal, each with a count), a search box, folder chips under Personal, a *Continue* row, and card grids of *designs*. A design is not a table row: project and lead designs are **derived** by grouping `project_rooms` by `project_id` / `lead_id` and summing their completed `render_jobs` variants; personal designs are JSON sessions in `studios.settings.visualizerWorkspace` that list room ids. Pressing a card drills into a *design detail* view (its rooms as cards); *Open design* or a room card mounts the editor full-screen with `{projectId | leadId | sessionId}` and the breadcrumb gains a virtual last segment (the design's name) whose parent link goes back to the gallery. Below `lg` the editor takes the whole screen (focus mode hides the top bar and bottom nav).

**Ways in**: the sidebar's *Tools › AI Visualizer*, the collapsed sidebar's Tools flyout, the phone bottom nav's *More › Tools* grid, the top bar's *Tools & Apps* grid, the lead drawer's journey step *concept* (*Open AI Visualizer* → `?leadId=`), the project header's *Photo Renders* button → `ToolEntryDialog` → `?projectId=&leadId=`, and mAIson's `open_tool_page("visualizer")`. Every way in is gated by the access matrix (`owner · admin · id`) and the page-visibility flag `tools/ai-visualizer` (a disabled page shows *Coming Soon*; the lead drawer instead toasts *This tool is turned off for your studio*).

**Ways out**: a saved render is auto-filed into the project's Files & Docs *Renders* folder (projects only — leads keep renders only as `render_jobs.lead_id`); the *Key Files* rail on the project Overview counts them; a render can be **shared three ways** — a public 7-day *share link* (`/renders/[token]`, branded, with a *Request a Consultation* form that writes `render_consultation_requests`), *Share to Portal* (a `homeowner_shared_assets` row the homeowner sees under *Design › Renders* with ❤️ · comments · pins), and *Send to Chat* (a message into the lead/project's linked chat). The project's Files & Docs *Show to homeowner* toggle on a Renders-folder file also shares/unshares it to the portal. Feedback flows back through *Homeowner feedback on shared renders* (project › Files & Docs) and the two-way *annotate* dialog, reachable from the editor's View dialog once the viewed render is shared.

**Side channels**: the live-meeting Co-Pilot generates *mood boards* and *AI renders* with the visualizer's image model and mirrors them into `render_jobs` + `project_files` *Renders*; mAIson/ID Buddy has its own `detect_surfaces` + `generate_render` tools whose output is shown inline with *Save* / *Share* but **never saved** to rooms, jobs or files. A public **trial** (`/try-visualizer`, six tool pages, 3 watermarked generations per browser, behind `TRIAL_VISUALIZER_ENABLED`) and an older marketing **demo** (`/try`, restyle only) reuse the editor's parts but touch no studio data.

---

## A. The ways in — navigation, gates, flags, tracking

### A-01 · Sidebar › Tools › AI Visualizer
- Where: SIDE:19-29 (`TOOLS_NAV`), SIDE:375-440 (the section)
- Entry: the desktop sidebar (`lg+`), Tools group (collapsible; auto-expands when the path starts with `/tools`, SIDE:176-181)
- Does: `router.push("/tools/ai-visualizer")`. Third item after *Quote Digitizer* and *Quote X-Ray*; the row lights up when `pathname.startsWith("/tools/ai-visualizer")` (SIDE:427).
- Rules: whole Tools group shown only when `canAccessPage(userTags, "/tools/quote-digitizer")` (SIDE:380 — the gate keys off the *digitizer's* row, not the visualizer's); each item filtered by `!comingSoon && isPageEnabled(item.id) && (!ownerOnly || isOwner)` (SIDE:426). The visualizer item has neither `ownerOnly` nor `comingSoon`.
- Data: none
- States: active / inactive; collapsed sidebar → A-02
- Words: *Tools* (group) · *AI Visualizer*
- Reachable: yes

### A-02 · Collapsed sidebar Tools flyout
- Where: SIDE:87-110, 206-247, 394
- Entry: hover the wrench icon when the sidebar is collapsed
- Does: a portal flyout titled *Tools* lists `TOOLS_NAV` filtered by `!comingSoon && isPageEnabled` (SIDE:219; owner-only items pre-filtered at SIDE:394); a press pushes the route and closes the flyout. Clicking the collapsed wrench itself goes to `/tools/quote-digitizer` (SIDE:387).
- Rules: 120 ms close delay on mouse leave
- Words: *Tools* · *AI Visualizer*
- Reachable: yes (desktop only)

### A-03 · Phone bottom nav › More › Tools grid
- Where: BNAV:34-41 (`TOOLS_ITEMS`), 96, 119-158, 187-192
- Entry: bottom nav *More* (`lg:hidden`) → bottom sheet
- Does: sheet titled *More* with sections *Pages* · *Tools* · *Finance* · *Qanvast Ops*; the *Tools* grid (3 columns, icon tile + label) has *AI Visualizer* second. Press → close sheet → `router.push`. The *More* button reads active when the path is one of the sheet's items (BNAV:106-112).
- Rules: `!comingSoon && (!ownerOnly || isOwner) && isPageEnabled` (BNAV:96). Note the list differs from the sidebar's: no Quote X-Ray, no Meeting Copilot, no Homeowner Portal, and *3D Space Planner* is `comingSoon: true` here (hidden) while it is live in the sidebar.
- Words: *More* · *Tools* · *AI Visualizer*
- Reachable: yes (≤ lg)

### A-04 · Top bar › Tools & Apps grid
- Where: TOP:23-31 (`TOOLS`), 152, 338-379
- Entry: the grid icon in the top bar (`aria-label="Tools & Apps"`, `title="Tools & Apps"`)
- Does: popover (280 wide) with *Tools* (3-column icon grid; *AI Visualizer* second), then *Finance*, then *Qanvast Ops* when listed. Press → close → `router.push`.
- Rules: `(!ownerOnly || isOwner) && isPageEnabled` (TOP:152). Note: this list has no `canAccessPage` check of its own.
- Words: *Tools & Apps* · *Tools* · *AI Visualizer*
- Reachable: yes

### A-05 · Breadcrumb
- Where: CRUMB:27-38 (labels), 91-108 (virtual segments), 156-163 (back)
- Entry: any tool page
- Does: `/tools/ai-visualizer` reads *Tools › AI Visualizer*. When the editor is open the tool page appends a virtual last crumb with the design's name (TOOL:107-110) and registers `onNavigateBack` (TOOL:111-114): pressing the *AI Visualizer* crumb then calls `setActive(null)` (back to the gallery) instead of navigating (CRUMB:158-163).
- Data: `useBreadcrumb()` — `appendSegments`, `onNavigateBack`
- Words: *Tools* · *AI Visualizer* · `{design name}`
- Reachable: yes

### A-06 · Access matrix
- Where: ACL:73 (`tools: ["owner","admin","id"]`), ACL:108 (`"tools/ai-visualizer": ["owner","admin","id"]`), `src/app/(main)/layout.tsx:131-146`
- Does: `canAccessPage(tags, pathname)` — accounting-only members are refused; the main layout redirects an unauthorised member to their default route (layout:143-145). The admin studio page mirrors the row (`src/app/admin/studios/[id]/page.tsx:132`: *AI Visualizer* — `owner, admin, id`).
- Reachable: yes

### A-07 · Page-visibility flag `tools/ai-visualizer`
- Where: PCFG context:46-51; PCFG route:1-48; `src/app/admin/settings/page.tsx:35-43`; `src/app/admin/studios/[id]/page.tsx:68-79`; `src/app/(main)/layout.tsx:120-129, 187-198`
- Entry: Admin › Settings (global page visibility list, *Tools › AI Visualizer*) and Admin › Studios › [studio] (per-studio *Tools › AI Visualizer*)
- Does: `/api/config/pages` merges `platform_config.page_visibility` (global) with `studios.settings.page_visibility` (studio wins); `isPageEnabled(key)` defaults to **true** when the key is absent. Every nav list hides the item when off; the main layout renders *Coming Soon* in place of the page for a disabled `tools/*` key.
- Words (Coming Soon guard): *Coming Soon* · *This feature is not yet available. Check back later!*
- Data: `platform_config(key="page_visibility").value`, `studios.settings.page_visibility`
- Reachable: yes (admin)

### A-08 · Auth + public prefixes in the edge proxy
- Where: `src/proxy.ts:343-359, 452-476`
- Does: `/tools/*` needs the `qanvast_session` cookie (else → `/login`). `/renders/*` and `/api/renders/*` are **public** (token-based share pages); `/try*` and `/api/demo/*` are public (the marketing demo + the anonymous trial and all its routes).
- Reachable: yes

### A-09 · Lead drawer › journey step *concept* → *Open AI Visualizer*
- Where: LEAD:1827-1842 (`nativeToolForStep`), LEAD:303-308 (`guardedToolOpen`), LEAD:2640-2648 (the CTA row)
- Entry: lead drawer, the *concept* journey step's primary CTA (the "✨ native tool" option of the *Add evidence* menu; the other steps map to Live Meeting / Space Planner / Quote Digitizer / Send for signature)
- Does: `router.push("/tools/ai-visualizer?leadId=<lead.id>")` — the tool page opens the editor immediately on that lead (A-20).
- Rules: goes through `guardedToolOpen("tools/ai-visualizer", …)`: if the page flag is off, no navigation — a toast instead.
- Words: *Open AI Visualizer* (button with ✨) · toast *This tool is turned off for your studio* / description *A studio owner can enable it in the workspace's page settings.*
- Reachable: yes

### A-10 · Project header › *Photo Renders*
- Where: PROJ:1716-1732 (lg+ button + tooltip), PROJ:1793-1795 (the ⋯ menu below lg), PROJ:668-669 (`toolEntry` state), PROJ:4684-4693 (dialog mount)
- Entry: project detail header actions
- Does: opens `ToolEntryDialog tool="renders"` (A-11). Sits beside *Plan the Space (3D)*, *Invite to Portal* and *Preview as Homeowner*.
- Words: *Photo Renders* · tooltip *Generate before/after photo renders to show the client what the space will look like.* · `aria-label` *Open Photo Renders for this project* · menu item *Photo Renders*
- Reachable: yes

### A-11 · ToolEntryDialog (renders)
- Where: TED:1-196
- Entry: A-10
- Does: dialog titled *Photo Renders*. While loading: *Checking for existing renders…*. Description: with n existing renders *Pick up where you left off — {n} existing render{s} on this project — or start fresh.*, else *Generate before/after renders to show the client what their space will look like.* If renders exist, a row *Open Visualizer with {n} past render{s}* / *Filed in `Renders` on this project*; always a dashed row *Generate a new render* / *Project context is pre-filled — no need to pick it again.*; footer *Cancel*. Both rows navigate to `/tools/ai-visualizer?projectId=<id>[&leadId=<lead>]` (the "existing" row does not deep-link to any render — TED:84-90 comment: "the visualizer doesn't currently re-load them in-tool").
- Data: `useProjectRenders(projectId)` = `useProjectFiles` filtered to `folder` starting with `render` (`src/lib/queries/project-renders.ts:12-19`)
- Reachable: yes

### A-12 · Deep link `?projectId=` / `?leadId=`
- Where: TOOL:52-54, 81-83, 209-222
- Does: on mount, `?projectId=` opens the editor on that project, else `?leadId=` on that lead, with `name: "Render"` as the breadcrumb segment (so the crumb reads *… › AI Visualizer › Render*, not the project's name). Both params together → project wins (`leadId` is passed by the project dialog but ignored by the landing; the editor receives only `projectId`).
- Rules: no validation that the id belongs to the studio here (the editor's scoped reads decide).
- Reachable: yes

### A-13 · Focus mode below `lg`
- Where: TOOL:95-102
- Does: while a design is open, `setFocusMode(true)` in a layout effect — the top bar and bottom nav hide so the editor owns the phone screen; cleared on back/unmount. The project Renders tab does not do this (its `SecondaryPageHeader` already does).
- Reachable: yes

### A-14 · Coach mark for the tool page (dead)
- Where: COACH:87-92, 188-264
- Does: defines a tip for `/tools/ai-visualizer` anchored on `[data-coach='ai-visualizer-header']`, shown 1.2 s after mount, auto-dismissed after 10 s, remembered in `localStorage["om-coach-coachmarks"][key] = true`; skipped unless the dev phone `91234017`. **No element in the codebase carries `data-coach="ai-visualizer-header"`** (grep: only COACH:88), so the tip never appears.
- Words: title *AI room renders* · *Upload a room photo, detect surfaces, assign new materials, and generate a photorealistic render in seconds.* · buttons *Got it* · *Ask mAIson anytime* · close `aria-label` *Dismiss*
- Reachable: dead (anchor missing)

### A-15 · Dashboard coach mark mentions renders
- Where: COACH:106-111
- Words: *Meet mAIson, your AI assistant* · *Ask mAIson to draft messages, analyze your pipeline, create tasks, or generate renders — all from one chat.* (anchor `[data-coach='maison-bot']`)
- Reachable: behind the same seen/dev rules as A-14

### A-16 · Page context type `tools-ai-visualizer` (unused)
- Where: `src/context/page-context.tsx:12`, AG types:68, AG page-context-serializer:18 (*AI Visualizer*)
- Does: the type exists so mAIson's system prompt could say *User is on the AI Visualizer page.* — but neither TOOL nor VIS calls `setPageContext` (grep: no setter anywhere), so mAIson never learns the user is in the visualizer.
- Reachable: dead

### A-17 · SEO feature list
- Where: `src/lib/seo.ts:66-77`
- Words: *"AI Room Visualizer"* in the SoftwareApplication JSON-LD `featureList` (marketing only).

### A-18 · Usage funnel
- Where: `src/lib/usage/funnels.ts:18-25`, `src/lib/usage/types.ts:63-77` (`FeatureKey "ai_visualizer"`), `src/app/api/render/route.ts:30-34`, consumers `src/app/api/admin/analytics/{funnels,feature-matrix}/route.ts`, `src/components/admin/analytics/feature-matrix.tsx` (Admin › Analytics › Features), `src/components/analytics/studio-health-view.tsx:91,172-184` (Admin › Analytics › Studios › [studio])
- Does: the authed generate route fires `feature_opened` (`{source:"api"}`), `feature_succeeded` (`{render_ms}`), `feature_failed` (`{error}`) into `usage_events` with `feature_key "ai_visualizer"`. The funnel reads *AI Visualizer*: *Opened* → *Render generated*; the studio-health view prints `… · {n}% success`. Note "Opened" is fired by a **generate call**, not by visiting the page (pure-client tools like Floor Plan fire a page-open event; the visualizer does not).
- Data: `usage_events(feature_key, event, studio_id, user_id, …)`
- Reachable: yes (admin analytics)

### A-19 · Funnel editor
- Where: `src/components/accounts/funnel-editor.tsx` — grep for visualizer/render: only a comment at :223 ("Pipeline visualization"). **Nothing visualizer-specific** (it is the lead-bucket editor).

### A-20 · No global search, no activity log, no notifications
- Where: `src/lib/search.ts` (no render hits), VIS (no `addActivityLog` / `track(` calls), `src/lib` notifications (no render events)
- Does: renders are not searchable from the top bar, generate no activity-log entry, and no notification is raised when a homeowner likes/comments/pins (see `docs/features/render-feedback/spec.md:67-71` — "A notification when a homeowner leaves feedback" is a listed follow-up).
- Reachable: —

---

## B. The landing (gallery)

### B-01 · Workspace data — how designs are built
- Where: WSQ:48-137, WSR:35-95
- Entry: page mount (`useVisualizerWorkspace(names)`, query key `["viz-workspace", studioId]`, `staleTime 30 s`, enabled only with a studio id)
- Does: `GET /api/visualizer/workspace` returns `{ rooms, jobs, workspace }` — all the studio's `project_rooms` (slim), all its `completed` `render_jobs` (`id, room_id, variants_json, created_at`), and `settings.visualizerWorkspace` (`{folders, sessions}`, normalised to arrays). Client-side: jobs grouped by room, newest first; per room `renders = Σ variants_json.length`, `cover = first variant imageUrl of the newest job with one, else original_image_url`. Rooms with `project_id` group into a **project** design (name from `projects` map, `sub` = client), rooms with only `lead_id` into a **lead** design (name from `leads` map, fallback *Lead* / *Project*), `updatedAt` = the newest room's `created_at`. Sessions map their `roomIds` to rooms (missing rooms dropped silently). All designs sorted by `updatedAt` desc.
- Rules: a room with neither project nor lead is only reachable through a session that lists it; **project/lead designs with no cover and no renders are hidden** (WSQ:129-132 — a room row with no image and no render never shows); sessions always show (even with no rooms). A session's room count comes from rooms that still exist.
- Data: `project_rooms`, `render_jobs`, `studios.settings.visualizerWorkspace`
- Reachable: yes

### B-02 · Which leads count as "worth visualizing"
- Where: TOOL:56-64, `src/data/lead-bucket-config.ts:95, 277-278`
- Rules: `eligibleLeads = leads.filter(getLeadBucket(l).statusCode !== "INACTIVE")` — signed (won) leads are kept (they live in CLOSED alongside INACTIVE); *Returned* / *Archived* / inactive leads are dropped from the picker. Projects are never filtered.

### B-03 · Page header
- Where: TOOL:266-270
- Words: title *AI Visualizer* · subtitle *Every render in one place — start fresh, or pick up a lead or project.* · action *New design* (＋; disabled while a session is being created)
- Reachable: yes

### B-04 · Landing states
- Where: TOOL:264-284; `landing-skeleton.tsx`; `first-run-hero.tsx`
- States: **loading** → `LandingSkeleton` (3 start tiles, 4 chips + search bar, 8 card boxes; `aria-busy="true"`, `aria-label="Loading renders"`); **error** → banner *Couldn't load your renders right now.* + *Try again* (refetch); **empty studio** (no designs at all) → `FirstRunHero` (B-05) and nothing else (no chips, no search); **populated** → Start strip + chips + search + sections.
- Reachable: yes

### B-05 · First-run hero
- Where: `first-run-hero.tsx:6-44`
- Does: a hero with two buttons and a numbered three-step story.
- Words: eyebrow *AI Visualizer* · *Turn a room photo into a finished design, in minutes.* · *Show clients what their space could look like before a single tile is ordered.* · buttons *New design* · *Start from a lead* · steps **1** *Upload a room photo* — *Any phone shot or 3D view. Surfaces and furniture are detected for you.* · **2** *Tap a surface, pick a finish* — *Swap laminates, paints and flooring straight from your catalogue.* · **3** *Generate and share* — *Compare before and after, then send it to the client's chat or portal.*
- Rules: no *From a project* here (only lead + blank).
- Reachable: yes (only when `designs.length === 0`)

### B-06 · Start strip
- Where: `start-strip.tsx:72-131`, TOOL:287-293
- Does: three tiles in a row; the first shows a spinner while the blank session is created.
- Words: *Blank design* — *Upload any room photo and start* · *From a lead* — *Renders save to the lead's file* · *From a project* — *Auto-filed to the project's Renders*
- Rules: note the lead tile's promise ("save to the lead's file") — renders for a lead are written to `render_jobs.lead_id` / `project_rooms.lead_id`, **not** to `lead_files` (VIS has no lead_files write; grep). The project tile's promise is true (D-12).
- Reachable: yes

### B-07 · Entity picker dialog (lead / project)
- Where: `start-strip.tsx:16-70`, TOOL:434-451
- Entry: *From a lead* / *Start from a lead* / *From a project* / the empty rows' buttons
- Does: a dialog with a search box (autofocus) and a list, one 44 px row per entity (label + sublabel + chevron), filtered as you type on label or sublabel; picking closes and opens the editor on that entity (`setActive({ leadId | projectId, name })`).
- Words: titles *Start from a lead* / *Start from a project* · placeholders *Search leads…* / *Search projects…* · empty *No leads match.* / *No projects match.* · sublabels: the lead's `type` (e.g. HDB) / the project's `client`
- Reachable: yes

### B-08 · View chips
- Where: TOOL:296-309
- Does: *All* · *Leads* · *Projects* · *Personal*, each with its count (`designs.length`, per-kind counts). Switching away from Personal clears the folder filter; any switch clears selection mode. `aria-pressed` on the active chip.
- Words: *All* · *Leads* · *Projects* · *Personal*
- Reachable: yes

### B-09 · Search
- Where: TOOL:176-179, 311-327
- Does: matches `name` or `sub` (case-insensitive) across every section; a clear (×) button appears when non-empty.
- Words: placeholder *Search renders…* · `aria-label` *Search renders* · clear `aria-label` *Clear search*
- Reachable: yes

### B-10 · Folder chips (Personal view only)
- Where: TOOL:331-345
- Does: *All personal* `{n}` · one chip per folder (`{name} {n}`) · *Unfiled* `{n}` · *New folder* (opens B-20) · when a real folder is selected, *Delete folder* appears at the right (opens B-22). Counts are per-folder session counts.
- Words: *All personal* · *Unfiled* · *New folder* · *Delete folder*
- Reachable: yes

### B-11 · No search hits
- Where: TOOL:348-353
- Words: *No renders match “{search}”.* · *Clear search*
- Rules: shown when a query is set and the visible count for the current view is 0.

### B-12 · Continue row
- Where: TOOL:196-203, 356-365
- Does: horizontal snap-scroll strip of the 4 most recently updated designs (cards with the kind chip), each opening the design detail (B-16).
- Rules: only in *All*, with no search, and when `designs.length > 4`.
- Words: *Continue* (with a clock icon) · hint *most recently updated* (hidden on phones)
- Reachable: yes

### B-13 · Projects & Leads sections
- Where: TOOL:368-391
- Does: in *All*: one section *Projects & Leads* `{n}` with kind chips on the cards; in *Projects*: section *Projects* `{n}`; in *Leads*: *Leads* `{n}`. Cards open the design detail.
- States: empty (no query) → dashed row *No project renders yet.* + button *Start from a project* / *No lead renders yet.* + *Start from a lead*
- Reachable: yes

### B-14 · Personal section + Select / Move
- Where: TOOL:394-425, 490-505 (`MoveMenu`)
- Does: heading *Personal* (+ *· {folder name}* or *· Unfiled* when filtered) `{n}`; actions on the right: *Select* (toggles selection mode; reads *Done* while on) and, once ≥1 selected, *Move {count}* — a dropdown listing every folder (or *No folders yet*) and *Unfiled*. In selection mode a card press toggles its tick; the ⋯ menu is hidden. Moving toasts and exits selection.
- Words: *Personal* · *Select* / *Done* · *Move {n}* · *No folders yet* · *Unfiled* · toast *Moved to {folder}* / *Moved to Unfiled* · error toast *Couldn't move*
- States: empty (no query) → *No personal designs yet.* or *Nothing in this folder yet.* + button *New design*
- Data: PUT of the whole workspace with `sessions[i].folderId` changed (WSQ:189-194)
- Reachable: yes

### B-15 · Design card
- Where: `design-card.tsx:64-136` (`DesignCard`), 32-57 (`CoverMosaic`), 16-26 (`relTime`)
- Does: 4:3 cover — one photo fills; 2–4 room covers become a mosaic (2 → two columns, 3 → first spans both rows, 4 → 2×2; more than 4 are cut); none → placeholder *No photo yet*. Bottom-left *{n} render{s}* over a gradient; optional kind chip top-left; a tick circle top-right in selection mode. Body: name (truncated) · `{sub · }{n} room{s}{ · relative time}`. Hover-revealed (always visible on touch) ⋯ menu with *Rename* / *Delete* (only passed for personal designs).
- Rules: relative time = *{m}m ago* under an hour, *{h}h ago* under a day, *{d}d ago* under a week, else *Sep 25*-style date (`relTime`). `aria-label` on the card button: *Open {name}* / *Select {name}* / *Deselect {name}*; menu `aria-label` *Options for {name}*.
- Words: *No photo yet* · *{n} render(s)* · *{n} room(s)* · *Rename* · *Delete*
- Reachable: yes

### B-16 · Design detail (drilled in)
- Where: TOOL:224-262
- Entry: any design card (not in selection mode)
- Does: back link *All renders* → gallery; title = design name + kind chip; meta `{sub · }{n} room(s) · {n} render(s)`; actions *Rename* (personal only) and *Open design* (✨ — opens the editor on the whole design). Body: section *Rooms* `{n}` · hint *pick one to jump straight to it* with a grid of room cards (B-17); with no rooms a dashed box *No rooms yet — open the design and upload a room photo.* + *Open design*.
- Words: *All renders* · *Rename* · *Open design* · *Rooms* · *pick one to jump straight to it* · *No rooms yet — open the design and upload a room photo.*
- Reachable: yes

### B-17 · Room card
- Where: `design-card.tsx:139-158`
- Does: cover (or *No photo yet*), *{n} render(s)*, room name; press → opens the editor on the design with `initialRoomId` = this room (`aria-label` *Open {room name}*).
- Reachable: yes

### B-18 · New design (blank session)
- Where: TOOL:124-131, WSQ:153-165
- Entry: header *New design*, hero *New design*, *Blank design* tile, the Personal empty row
- Does: creates a session named *Design · {Mon D}* (e.g. *Design · Sep 25*, `toLocaleDateString(undefined, {month:"short", day:"numeric"})`) with a client-minted uuid, `folderId null`, no rooms; then opens the editor on it (`sessionId`, `sessionRoomIds: []`). When the editor creates a room for a session it calls `onRoomCreated(roomId)` → `useAddRoomToSession` appends the id and bumps `updatedAt` (TOOL:216, WSQ:204-210, VIS:2231-2246).
- States: pending (button disabled / tile spinner) · error toast *Couldn't start a design*
- Data: PUT `settings.visualizerWorkspace.sessions[]`
- Reachable: yes

### B-19 · Rename design dialog
- Where: TOOL:132, 455-473, WSQ:196-201
- Entry: card ⋯ › *Rename*, detail › *Rename*
- Does: dialog *Rename design*, one input (placeholder *Design name*, prefilled, Enter submits), *Cancel* / *Rename*; empty (trimmed) name does nothing; success closes; sets `updatedAt`.
- Words: *Rename design* · *Design name* · *Cancel* · *Rename* · error toast *Rename failed*
- Reachable: yes (personal designs only — project/lead names are the project's/lead's)

### B-20 · New folder dialog
- Where: TOOL:139, 455-473, WSQ:167-178
- Words: *New folder* · placeholder *Folder name* · *Cancel* · *Create* · error toast *Couldn't create folder*
- Data: PUT `folders[]` with a client uuid
- Reachable: yes

### B-21 · Delete design
- Where: TOOL:140-143, 154-169, 476-489, WSQ:212-230
- Entry: card ⋯ › *Delete*
- Does: alert *Delete “{name}”?* / *All its renders are deleted too. This can't be undone.* · *Cancel* / *Delete*. Confirm removes the session from the workspace JSON, then for each of its rooms `DELETE /api/renders/jobs/by-room/{roomId}` and `DELETE /api/projects/rooms/{roomId}` (best-effort, errors logged), closes the detail if it was open, toasts *Design deleted*.
- Words: as above · error toast *Delete failed*
- Rules: only personal designs can be deleted here; project/lead designs have no delete (their rooms are deleted inside the editor — readers B/C).
- Reachable: yes

### B-22 · Delete folder
- Where: TOOL:343, 476-489, WSQ:180-187
- Does: alert *Delete folder “{name}”?* / *Its renders move to Unfiled.* · confirm drops the folder and sets its sessions' `folderId` to null; the chip filter resets to *All personal*.
- Words: as above · error toast *Couldn't delete folder*
- Reachable: yes

### B-23 · Opening the editor (the hand-off)
- Where: TOOL:116-123 (`openEntity`), 209-222
- Does: `<Visualizer projectId leadId sessionId sessionRoomIds initialRoomId onRoomCreated onBack>` keyed on `project-lead-session-initialRoom` so switching designs remounts; `onBack` returns to the gallery (the editor's top-bar back button, `title="Back"`, VIS:4834-4842). The editor is `dynamic(..., { ssr: false })` with a centred spinner while its chunk loads (TOOL:34-37). Container `h-full max-lg:h-dvh`.
- Rules: `sessionRoomIds` are the exact rooms of a personal design; a lead/project design loads its rooms by `lead_id` / `project_id` inside the editor (VIS:1494-1592, reader B).
- Reachable: yes

### B-24 · Workspace API route
- Where: WSR:1-136
- Does: `GET` (full or `?meta=1` = workspace JSON only) and `PUT { workspace }` which read-modify-writes `studios.settings` so sibling keys survive (`{...settings, visualizerWorkspace: ws}`). All through `scopedSupabase(session.studioId)`; `400` *workspace object is required* on a bad body.
- Rules: every mutation in WSQ is **read (meta) → compute → PUT whole JSON** (WSQ:139-151) — last writer wins; no per-session locking.
- Data: `studios.settings.visualizerWorkspace = { folders[], sessions[] }`
- Reachable: yes (session only)

### B-25 · Landing tests
- Where: `src/__tests__/visualizer-landing.test.tsx:1-114`
- Does: covers the mosaic (0/1/3/5 covers → placeholder / 1 img / row-span / 4 imgs), card meta pluralisation (*5 renders*, *2 rooms · 2h ago*, *1 render*, *1 room ·*), kind chip only with `showKind`, options menu presence, selection-mode aria (*Deselect …*), room card *0 renders* + *No photo yet*, the three start tiles, the picker's filter/pick/empty (*No leads match.*), the hero's three step titles and two buttons, the skeleton's `aria-busy`.

### B-26 · Git history of the landing
- Where: `git log` — `eb94dc20c` 2026-07-15 "workspace landing — gallery, folders, standalone sessions (no migration)"; `fa9cc279e` 2026-07-16 "rename+delete on personal cards; call personal items 'designs'"; `f33dba706` 2026-07-16 "landing polish + Fast default + room rename + lighting Advanced"; `5a58f1126` 2026-09-14 "mobile-friendly editor, camera-app phone shell, material browser, landing redesign" (the current start strip / hero / chips).

---

## C. From the lead

### C-01 · The lead's only visualizer touchpoint is the journey CTA
- Where: LEAD:1832 (see A-09); grep of LEAD for `visualiz|render|moodboard` finds nothing else user-facing (the other "render" hits are PDF-rendering comments).
- Does: the lead drawer has **no Renders list, no render count, no card** showing what was rendered for the lead. The lead's renders are only visible on the tool landing as a *Lead* design (B-01) and inside the editor opened on the lead.
- Reachable: yes

### C-02 · What a lead render writes
- Where: VIS:2231-2246 (room create → `POST /api/projects/rooms` with `leadId`), VIS:2790-2798 (`POST /api/renders/jobs` with `leadId`), `src/app/api/renders/jobs/route.ts:106-107`, `src/app/api/projects/rooms/route.ts:87-96`
- Data: `project_rooms.lead_id`, `render_jobs.lead_id`. **No `lead_files` row, no lead activity entry** (contradicts the start-strip tile *Renders save to the lead's file* and ONB:573 "auto-attaches back to the lead's Files, tagged 'Render'").
- Reachable: yes

### C-03 · Lead file › *Open in AI Visualizer* (doc only)
- Where: ONB:570-571 ("Right-click the uploaded file → Open in AI Visualizer"); grep of `src` for `Open in AI Visualizer` / `openInVisualizer`: **no hits**.
- Reachable: dead (never built)

### C-04 · Renders follow the lead into its project (Files & Docs)
- Where: FILES route:24-38, 113-142
- Does: the project's unified files list merges the parent lead's `lead_files` (`compoundId "lf:<uuid>"`); a lead file is classified into the *Renders* folder only when its name contains `render` and it is an image (else *floor-plans* / *site-photos*). Lead-phase *render_jobs* are **not** carried into the project's files or its render history (the project design and the lead design stay separate groups on the landing).
- Reachable: yes

---

## D. From the project

### D-01 · The project's `Renders` tab is unreachable
- Where: PROJ:4039-4044 (`activeTab === "render"` → `<RenderTabWrapper><Visualizer projectId leadId/></RenderTabWrapper>`), PROJ:1871-1885 (the `SlidingTabList` tabs: *Overview* · *Management* · *Finance* · *Files & Docs* · *Activity* — no `render`), PROJ:647-650 (`activeTab` initialises from `?tab=`)
- Does: the tab body still exists and mounts the editor edge-to-edge, but nothing in the strip or elsewhere sets `activeTab = "render"` (grep `tab=render`: none). It renders only if someone types `/projects/<id>?tab=render`.
- Rules: SPEC1:89 still documents it as a live host ("mounted … from the project Renders tab").
- Reachable: dead (URL-only)

### D-02 · RenderTabWrapper
- Where: PROJ:243-278
- Does: measures the distance from the wrapper to `<main>`'s bottom (desktop) so the editor fills exactly to the page bottom; below `lg` a fixed `calc(100dvh - 3.5rem)` (the project's sticky header). Re-measures on resize.
- Reachable: with D-01

### D-03 · Key Files rail › *Renders* tile (Overview)
- Where: KFR:76-227, PROJ:2443-2454
- Entry: project Overview, card *Key Files* (with *View all →* to Files & Docs)
- Does: three tiles *Quote* · *Contract* · *Renders*. The Renders tile counts `project_files` in folder `render`/`renders` **plus** photo attachments on progress updates; meta *{n} image{s}*; empty → dashed tile *No renders yet* with action *Upload renders* (→ Files & Docs). Pressing a non-empty tile opens the lightbox (D-04) — with **only the progress-update photos** (KFR:114-128: "we'll just count [project_files renders] for the meta line and rely on attachments for the lightbox until the visualiser is fully wired into project_files"), so a project whose renders all came from the visualizer opens an empty lightbox (`FileLightbox` returns null when `files.length === 0`).
- Words: *Key Files* · *View all →* · *Renders* · *{n} image(s)* · *No renders yet* · *Upload renders*
- Reachable: yes

### D-04 · File lightbox
- Where: FLB:29-175
- Does: full-screen dark viewer: name, *{i} / {n}*, buttons *Open in Files & Docs* · *Open in new tab* · close (`aria-label` *Close*); ← → arrows (keyboard too), Escape closes, thumbnail strip for galleries; PDFs in an iframe.
- Reachable: from D-03

### D-05 · Files & Docs › *Renders* folder
- Where: PROJ:384 (`FILE_FOLDERS` id `renders`, label *Renders*), PROJ:945-985 (unified list), FILES route:85-180
- Does: `GET /api/projects/[id]/files` returns `project_files` (`pf:`) + the lead's `lead_files` (`lf:`), newest first; folder ids normalised (`"Renders"` → `renders`); image rows get a `thumbnail_url` — auto-filed renders (whose `storage_path` is a full public URL on the public `renders` bucket) pass through unsigned, manual uploads get a 1-hour signed URL; `is_public_render_url` marks the former (FILES:162-171).
- Data: `project_files(project_id, studio_id, folder, file_name, file_size, file_type, storage_path, uploaded_by, approval_status, is_homeowner_visible)`
- Reachable: yes

### D-06 · *Show to homeowner* on a render file → also shares to the portal
- Where: PROJ:1134-1196 (`syncRenderPortalShare`, `setFileHomeownerVisible`), FILES `[fileId]` PATCH:150-178
- Does: toggling a file's homeowner visibility PATCHes `is_homeowner_visible`; then, **only for** `folder === "renders" && isPortalShareable && thumbnailUrl` (i.e. auto-filed renders), it also shares/unshares to the portal: on → `GET active-link` → `GET members/me` → `POST share-render {projectId, projectLinkId, title: file.name, url, thumbnailUrl, sharedBy}`; off → `DELETE share-render {projectId, url}`.
- Words: toasts *"{name}" shared to the homeowner portal — visible in Documents and Renders* · *"{name}" is now visible to the homeowner* (+ description *Invite the homeowner to their portal to also enable render feedback.* when there is no active link) · *"{name}" hidden from the homeowner* · error *Failed to update visibility*
- Rules: manually uploaded renders (private bucket, signed URLs) never reach the feedback surface this way.
- Reachable: yes

### D-07 · Download / delete of an auto-filed render
- Where: FILES `[fileId]` GET:90-95 (public URL passthrough: `storage_path` matching `^https?://` is returned as the `signedUrl`), DELETE:229-327
- Does: download works for both kinds; DELETE removes the storage object (for a public-URL row `storage.remove([<url>])` simply fails and is ignored) and the `project_files` row. **It does not touch `render_jobs`** — the render stays in the visualizer's history and on the landing's counts.
- Reachable: yes

### D-08 · Auto-file after a render (the editor → project files)
- Where: VIS:2780-2818, `src/lib/finance-auto-file.ts:31-63`, `src/app/api/project-files/records/route.ts`
- Does: after `POST /api/renders/jobs` succeeds and only when `projectId` is set, each variant is filed: `autoFileToProject(projectId, "Renders", "Render - {room} - {style|Style} - v{variant id}.png", { sourceId: jobId, sourceType: "render", storageUrl: variant.imageUrl })` → `POST /api/project-files/records { projectId, folder, fileName, fileType: "document", storagePath: <public url> }`. Fire-and-forget (errors logged). Leads and sessions: nothing filed.
- Data: `project_files` (`file_type "document"` even though it is an image; `file_size` null)
- Reachable: yes

### D-09 · *Homeowner feedback on shared renders* (Files & Docs, below the file browser)
- Where: SRF:107-146, PROJ:4497-4500
- Does: card with a grid of shared renders (`asset_type` in `render | mood_board | photo`) from `useProjectSharedRenders` (`GET /api/homeowner-links/shared-renders?projectId=`). States: spinner · error *Couldn't load shared renders.* + *Try again* · empty *No renders shared to the homeowner portal yet. Use “Share to Portal” in Photo Renders to share one.*
- Words: *Homeowner feedback on shared renders* · *Likes, comments, and pinned notes on renders you shared. Drop your own pins to point things out.*
- Reachable: yes

### D-10 · Render feedback card
- Where: SRF:32-105
- Does: thumbnail (opens the image in a new tab; pin-count badge when annotated), title (*Render* fallback), counts ❤ `{likes}` · 💬 `{comments}` · 📍 `{pins}`, *Liked by {names}*, the flat comment list (`{author} · {Mon D · h:mm}` + body), and a button *Annotate render* / *Review {n} pin{s} · {open} open* → D-11.
- Reachable: yes

### D-11 · Studio render annotator (two-way pins)
- Where: RAS:47-305; hooks `src/lib/queries/projects.ts:1100-1185+`
- Entry: D-10 button; the editor's View dialog *Annotate* (E-10)
- Does: dialog *{title} — annotate* / *Tap the render to drop a pin the homeowner can see and reply to.* Left: the image; click drops a draft pin (0–1 coords); existing pins numbered, designer pins primary-coloured, homeowner pins blue, resolved pins ringed green. Right: draft composer *New pin — point something out to the homeowner* (textarea placeholder *e.g. Proposing a warmer wood tone for this cabinet — thoughts?*, max 2000, *Cancel* / *Add pin*); each pin card: *You (Studio)* or the homeowner's name · time · *· Resolved*; replies (*You (Studio)* / name); a reply input *Reply to the homeowner…* (Enter sends, `aria-label` *Send reply*); *Mark resolved* / *Reopen*; *Remove* (own pins only). Empty: *No pins yet.* / *Tap the render to point something out, or wait for the homeowner's feedback.*
- Rules: server stamps `authorRole "studio"` and the author name from `profiles.full_name` (fallback *Studio*); ≤ 100 pins per render (`409 This render has too many pins already`); body ≤ 2000 (*Note is too long* / *Reply is too long*); coordinates must be within 0–1 (*Pin position is out of range*); a studio may delete only studio pins (`403 You can only remove your own pins`); assets of another studio read as `404 Render not found`.
- Words (errors → toasts): *Couldn't add pin* · *Couldn't send reply* · *Couldn't update pin* · *Couldn't remove pin*
- Data: `homeowner_shared_assets.metadata.annotations[]` via `POST/PATCH/DELETE /api/homeowner-links/render-annotations` (`{projectId, assetId, x, y, body}` · `{…, annotationId, action: "reply", body}` · `{…, action: "status", status}` · `{projectId, assetId, annotationId}`)
- Reachable: yes

### D-12 · The doc's *Open AI Visualizer* button on the project Overview
- Where: `docs/TESTING_NEW_FEATURES.md:67` ("Open AI Visualizer" button (purple, full-width) on the Overview tab); PROJ grep: no such button — today it is the header's *Photo Renders* (A-10).
- Reachable: dead (doc stale)

---

## E. Sharing with the homeowner (and the client)

### E-01 · *Share* (public link) from the editor's View dialog
- Where: VIS:1856-1880 (`handleShareVariant`), VIS:5601-5610 (button), VIS:5682 (icon on phones)
- Entry: the View dialog of a generated variant
- Does: `POST /api/renders/share { variantImageUrl, originalImageUrl, roomName, style, materials }` → opens the share dialog (E-02) with the returned `shareUrl`.
- Words: *Share* / *Sharing...* · disabled title *Generate a render first to share.* · error toast *Could not create share link*
- Rules: disabled while sharing or when the variant has no image; every press mints a **new** link (nothing lists or revokes old links).
- Reachable: yes

### E-02 · Share dialog (copy · WhatsApp · QR placeholder)
- Where: `src/components/copilot/share-dialog.tsx:14-105`, VIS:5872-5878
- Does: title *Share {room} — AI Render*; button *Show QR Code* / *Hide QR Code* revealing a **placeholder** box (no real QR — "will use qrcode package when installed") captioned *Scan to open on customer's device*; *Share via WhatsApp* (`wa.me/?text={title}: {url}`); a read-only URL field with a copy button (tick for 2 s); *Link expires in 7 days*.
- Rules: `fullUrl = window.location.origin + shareUrl`; the dialog is a bare fixed overlay (not the Dialog primitive) with no Escape/backdrop close.
- Reachable: yes

### E-03 · Share-link API
- Where: APIR share:6-92
- Does: session required; needs `variantImageUrl` (`400 Missing variant image URL`); reads `studios.name, settings, country_code` and the creator's `profiles.email, phone`; branding from `settings.branding` (falls back to legacy `settings.client_portal`, warns); builds the **snapshot** (defaults *Room* / *Modern* / `[]` / `#5500FF`); token = uuid without dashes, first 16 chars; `expires_at = now + 7 days`; inserts `render_share_links { studio_id, token, snapshot, expires_at, created_by }`; returns `{ shareUrl: "/renders/{token}", token, expiresAt }`.
- Rules: expiry is fixed at 7 days (ONB:578 says "7-day default expiry — all configurable", ONB:603 "up to 30" — not in code); the snapshot freezes the image URLs, so a later deleted render still shows while the link lives.
- Reachable: yes

### E-04 · Public render page — shell
- Where: SHARE layout:1-21
- Does: `/renders/[token]`, forced light theme; metadata title *AI Room Visualization — OpenMaison*, description *See your room transformed with AI-powered interior design visualization.*, OG image `/api/og?v=2`.
- Reachable: yes (public)

### E-05 · Public render page — states
- Where: SHARE:44-117; APIR `[token]`:4-36
- States: **loading** *Loading visualization...*; **expired** (`410`) card *Link Expired* / *This share link is no longer available. Please ask your designer for a new link.*; **not found** (`404` or fetch failure) card *Not Found* / *Share link not found* (or *Failed to load* / *This share link could not be found.*); **ready** → E-06. Each GET increments `view_count` (fire-and-forget).
- Rules: no studio/session needed; the token is the only secret.
- Reachable: yes

### E-06 · Public render page — content
- Where: SHARE:119-256
- Does: header = studio logo (or a coloured initial) + company name + tagline; a before/after `CompareSlider` when `originalImageUrl` exists, else the render alone (`alt="AI Render"`); details card: room name + style pill (brand colour) + *MATERIALS USED* list (`label` → `material`); consultation card (E-07); footer *Powered by OpenMaison* (→ openmaison.ai).
- Rules: `branding.companyAddress / phone / email` and `countryCode` are in the snapshot but **never rendered**.
- Reachable: yes

### E-07 · *Request a Consultation* form
- Where: SHARE:57-77, 189-249; APIR consultation:5-56
- Does: card *Like what you see?* / *Get in touch to discuss this design for your space.* → button *Request a Consultation* reveals inputs *Your name* · *Phone number* · *Any message? (optional)* and *Send Request* (*Sending...*); success → *Request Sent!* / *We'll be in touch soon.*
- Rules: name + phone required (button disabled otherwise; server `400 Name and phone are required`); no phone format check; rate limit 5/hour/IP (`429 Too many requests. Please try again later.`); link must exist and be unexpired (`404` / `410`).
- Words (error): *Couldn't send your request. Please try again or contact us directly.*
- Data: `render_consultation_requests { share_link_id, client_name, client_phone, message }` — **nothing reads this table back** in `src` (no studio-side list, no lead is created, no notification): grep `render_consultation_requests` → only this route.
- Reachable: yes (public)

### E-08 · *Share to Portal* from the editor
- Where: VIS:1888-1955 (`shareImageToPortal`), buttons VIS:4819, 5013, 5616-5625, 5690-5692, 5855 (relight results)
- Entry: the View dialog (*Share to Portal*), the canvas ⋯ menu (*Share to portal*), the relight panel
- Does: only with a `projectId` and the homeowner-portal page flag on. A `data:` image (Defurnish / Relight / unsaved) is first uploaded to the public `renders` bucket at `{studioId}/{entityId}/shared/{uuid}.png`; then `GET active-link` → (none → toast) → `GET members/me` → `POST share-render { projectId, projectLinkId, title: "{room} - {suffix|style|Render}", url, thumbnailUrl, sharedBy }`.
- Words: *Share to Portal* / *Sharing…* · toasts *Shared to homeowner portal* · *No homeowner linked to this project* · *Failed to share to portal* · *Failed to share*
- Rules: hidden for leads and sessions (no project) and when `tools/homeowner-portal` is disabled (VIS:1278); idempotent on `(link, url)` — re-sharing the same image answers `{ alreadyShared: true }` and toasts success again.
- Reachable: yes

### E-09 · *Send to Chat*
- Where: VIS:1797-1799 (`linkedChat` = the chat whose `projectId` equals the project **or the lead** id), VIS:1844-1851, buttons 5644-5656, 5699-5703
- Does: sends a chat message `AI Render - {room}\n{imageUrl}` into the linked chat via `sendMessage`; the button reads *Sent* (green, tick) for 2 s.
- Words: *Send to Chat* · *Sent*
- Rules: shown only when a linked chat exists (leads and projects; never sessions).
- Reachable: yes

### E-10 · *Annotate* from the editor
- Where: VIS:1417-1421 (`sharedAssetForVariant` = the shared asset whose `url` equals the viewed variant's image), 5627-5642, 5694-5697, 5892-5900
- Does: once the viewed render has been shared to the portal, an *Annotate* / *Annotate ({n})* button opens the studio annotator (D-11) on that asset.
- Rules: needs project + portal flag + a matching shared asset (a data-URL share that was uploaded under a new path will not match the variant's URL).
- Reachable: yes

### E-11 · `GET /api/homeowner-links/active-link?projectId=`
- Where: HL active-link:22-46
- Does: first `homeowner_project_links` row for the project with `is_active = true` → `{ linkId | null }` (scoped).

### E-12 · `GET /api/identity/members/me`
- Where: `src/app/api/identity/members/me/route.ts`
- Does: `{ memberId | null }` — the current user's `studio_members.id`, used as `shared_by` (nullable; a missing row never blocks a share).

### E-13 · `POST /api/homeowner-links/share-render`
- Where: HL share-render:19-94
- Rules: `projectId, projectLinkId, url` required (`400`); the link must belong to the studio **and** the project (`404 Homeowner link not found`); idempotent on `(project_link_id, asset_type "render", url)` → `{ ok, alreadyShared: true }`; inserts `homeowner_shared_assets { project_link_id, asset_type: "render", title (default "Render"), url, thumbnail_url (default url), shared_by }`.

### E-14 · `DELETE /api/homeowner-links/share-render`
- Where: HL share-render:109-151
- Does: removes every `render` asset with that `url` across **all** the project's links → `{ ok, removed }`. Comment (HL:105-107): this discards any likes/comments on the render; a later re-share starts a fresh row. Only the Files & Docs toggle calls it (D-06); the editor has no "unshare".

### E-15 · `GET /api/homeowner-links/shared-renders?projectId=`
- Where: HL shared-renders:28-60
- Does: all `homeowner_shared_assets` across the project's links, newest `shared_at` first, transformed to `HomeownerSharedAsset[]` (likes/comments/annotations default `[]`); `{ renders: [] }` when the project has no link.

### E-16 · Homeowner API — the Design feed
- Where: HOAPI design:5-143
- Does: `GET /api/homeowner/projects/[id]/design` for a real homeowner or a studio *preview* session; gathers assets across every link on the project; resolves `shared_by` → `studio_members.user_id` → `profiles.full_name` as `sharedByName`; returns per asset `{ id, assetType, title, description, url, thumbnailUrl, metadata, sharedBy, sharedByName, sharedAt, likeCount, likedByMe, comments[{…, isMine}], annotations[{…, isMine, comments[]}] }`. Preview sessions have no identity (`likedByMe`/`isMine` false).
- Reachable: yes (homeowner session / preview)

### E-17 · Homeowner portal › Design › Renders
- Where: HOP:62-63, 81-82, 116-118, 156, 266-294, 1590-1616
- Entry: the portal's *Design* tab → sub-tab *Renders* (also *Selections*, *Floor plan*); deep link keys `design` → `{tab: design, sub: renders}`; polled every 15 s (`useHomeownerDesign`, `refetchInterval: 15000`) so a *Share to Portal* appears without reload
- Does: grid of `RenderCard`s for `assetType` in `render | mood_board | photo` (documents stay in *Documents*).
- States: loading (tab loader) · error *Couldn't load renders.* + retry · empty *No renders yet* / *Renders, mood boards, and photos shared by your studio will appear here.*
- Rules: the sub-tab is gated by the portal feature flag `designSelections` (HOP:82).
- Reachable: yes

### E-18 · Homeowner render card
- Where: HOP:1617-1758
- Does: image (opens in a new tab), title (or *Render* / *Mood Board* / *Photo* / *Document* by type), *{type} · {sharedByName}*, date; actions ❤ *Like* / `{count}` (toggle), 💬 *Comment* / `{count}` (opens the thread), 📍 *Annotate* / `{n} · {open} open` (title *Pin feedback on a specific spot*). Thread: *No comments yet. Tell your designer what you think so they can adjust.*, comments as *You* / name · date · body, input *Add a comment…* (max 2000, Enter sends, `aria-label` *Send comment*).
- Rules (preview mode): like → toast *Preview mode — a real homeowner login can react.*; comment → *Preview mode — a real homeowner login can comment.* and the input is replaced by *Preview mode — a real homeowner login can comment here.*
- Words (errors): *Couldn't update like* · *Couldn't add comment*
- Reachable: yes

### E-19 · Like + comment routes
- Where: HOAPI like:15-69, comment:23-95
- Rules: real homeowner only (`requireRealHomeowner`; preview rejected); asset must hang off one of the project's links (`404 Render not found`); like toggles one entry per homeowner `{ homeownerId, name, at }` → `{ liked, likeCount }`; comment body trimmed, non-empty (`400 Comment cannot be empty`), ≤ 2000 (`400 Comment is too long`), appended with `authorRole "homeowner"`. Read-modify-write JSONB.

### E-20 · Homeowner annotator
- Where: RAH:40-348
- Does: dialog *{title} — add feedback* / *Tap anywhere on the image to drop a pin and leave a note for your designer.*; draft composer *New pin — what would you like to change here?* (placeholder *e.g. Can we try a warmer wood tone for this cabinet?*, max 2000, *Cancel* / *Add pin*); pins: *You* / author · time · *· Resolved*; replies show *{name} (Studio)* for studio authors; reply input *Reply…*; *Mark resolved* / *Reopen*; *Remove* on own pins. Empty: *No pins yet.* / *Tap the image to point out something you'd like changed.* Preview: every action toasts *Preview mode — a real homeowner login can annotate.*, reply inputs hidden, footer *Preview mode — a real homeowner login can drop pins and comment here.*
- Words (errors): *Couldn't add pin* · *Couldn't add reply* · *Couldn't update pin* · *Couldn't remove pin*
- Reachable: yes

### E-21 · Homeowner annotation routes
- Where: HOAPI `renders/[assetId]/annotations/route.ts` (POST), `[annotationId]/route.ts` (PATCH status · DELETE own), `[annotationId]/comments/route.ts` (POST reply)
- Rules: same limits as the studio side — 0–1 coordinates, non-empty ≤ 2000 body, ≤ 100 pins (`409`), status `open | resolved` (`400 Invalid status`), delete only own homeowner pins (`403 You can only remove your own pins`). Both sides may resolve/reopen any pin.

### E-22 · `RenderComment` component (dead)
- Where: `src/components/homeowner/render-comment.tsx:25-105`
- Does: an older card with *Comment* toggle and *Add a comment...* posting to `/api/homeowner/projects/{id}/design/comment` (a route that does exist: `HOAPI design/comment/route.ts`); toasts *Comment added* / *Failed to add comment*. **Not imported anywhere** (grep: only its own file) — superseded by the `RenderCard` thread (E-18).
- Reachable: dead

### E-23 · Homeowner dashboard "recent shared assets"
- Where: `src/app/api/homeowner/dashboard/route.ts:120-140+`
- Does: the portal home gathers recent `homeowner_shared_assets` across the homeowner's own links and sibling links (so a render shared through a co-owner's link surfaces). Not read further (portal home is outside this slice) — see Uncertain.

### E-24 · Render feedback spec vs code
- Where: `docs/features/render-feedback/spec.md:6-11, 67-71`
- Does: spec v1 = likes + comments, "no notifications and no studio replies"; code now has studio replies **per pin** (RAS / HL render-annotations) but still no reply to a **flat** comment (SRF shows comments read-only) and no notification.

---

## F. mAIson / ID Buddy / Co-Pilot touchpoints

### F-01 · Tool `detect_surfaces` (definition)
- Where: AG tools:417-433
- Words (to the model): *Analyze an uploaded room photo to identify redesignable surfaces (walls, floor, ceiling, cabinets, etc.). First step before generate_render.* · param `file_name` *Name of the uploaded room image. If omitted, uses the most recently uploaded file.*
- Reachable: yes (mAIson chat, when `tools/ai-visualizer` is enabled — F-06)

### F-02 · Tool `generate_render` (definition)
- Where: AG tools:435-462
- Words: *Generate an AI visualization by applying material changes to surfaces in an uploaded room photo. Use detect_surfaces first to know available surfaces.* · params `file_name`, `surfaces[] { label ("Surface name (e.g., 'Walls', 'Floor').") , material ("Desired material (e.g., 'Sage Green Marble', 'Warm Oak').") , description ("Additional styling notes.") }`, `style` (*Overall design style (e.g., 'Modern', 'Scandinavian', 'Industrial'). Default 'Modern'.*)

### F-03 · Executor `detectSurfaces`
- Where: AG executors:2709-2740
- Does: takes the named (or most recent) uploaded image; prompt asks for *ONLY a JSON array of surface label strings, max 6 items*; model `google/gemini-2.5-flash`, 200 tokens; on parse failure defaults to `["Walls","Floor","Ceiling","Cabinets"]`; returns `summary "Detected {n} surfaces: …"`, `data { surfaces (≤6), fileName }`.
- Rules: throws *Surface detection requires an image file (JPEG, PNG, etc.)* for non-images.
- Rules (divergence): this is a **separate, simpler detector** from the tool's `/api/render/detect` (no positions, no furniture, older model).

### F-04 · Executor `generateRender`
- Where: AG executors:2742-2787
- Does: requires ≥ 1 surface (*Specify at least one surface change. Example: surfaces: [{ label: 'Walls', material: 'Sage Green Marble' }]*); prompt with *STRICT GUARDRAILS* (never move walls/windows/doors, no structural change, don't touch unlisted furniture, only listed surfaces, keep camera, photorealistic); model `google/gemini-2.5-flash-image`; returns `{ imageUrl, surfaces, style, description, fileName }`.
- Rules: the result is **not** written to `render_jobs`, `project_rooms`, `project_files` or any lead — it lives only in the chat (system prompt 19a: "The generated image is automatically saved as the most recent file" — i.e. into the conversation's file list, not the studio's data). Error *Render generation failed — no image returned*.
- Reachable: yes

### F-05 · `open_tool_page("visualizer")`
- Where: AG tools:1573-1596, executors:3158-3189
- Does: enum includes `"visualizer"` → `/tools/ai-visualizer` (+ `?params`); returns `{ url, action: "navigate" }` — the panel navigates. The description tells the model to use it "after creating a floor plan, project, or render" but no render id/param scheme exists for the visualizer (the only params the landing understands are `projectId` / `leadId`).

### F-06 · Page flag → tools removed
- Where: AG page-tool-map:8-9, 34-35, 45-66
- Does: `tools/ai-visualizer` off ⇒ `detect_surfaces` and `generate_render` are dropped from the tool list and the system prompt lists *AI Visualizer* as disabled.

### F-07 · System-prompt rules about the visualizer
- Where: AG system-prompt:456-457, 563-568, 582-583, 674, 773-777, 951-964
- Words (verbatim rules): *13. Image + style change request → call detect_surfaces first (if not already done in this conversation), then generate_render with the desired changes. Style change keywords include: "render", "visualize", "restyle", "convert to [style]", "make it [style]", "change to [style]", "japandi", "scandinavian", "modern", "minimalist", "industrial", any interior design style name, "change the walls/floor/ceiling", "new look", "redesign", or any request to alter the visual appearance of a room.* · *16. Show inline images — when generate_render returns an imageUrl, it will be displayed inline in chat. Just describe the result naturally.* · *18. Visual design loop — detect surfaces → generate render → optionally convert to 3D → open in Space Planner. …* · *19a. Follow-up renders — when the user asks to modify a previously generated render (e.g., "now change the wall to walnut brown"), call generate_render again. The generated image is automatically saved as the most recent file. Do NOT ask the user to re-upload.* · agent names *AI Render Engine*, *Surface Detector* · edge cases: *"make it nicer" (vague) → suggest 2-3 specific styles based on the room type…* · *Photo that isn't a room interior → explain the tool works best with interior room photos* · *"undo the render" → you can't undo, but offer to re-render from the original image with different materials* · *"try another style" → call generate_render with different materials on the same (original or latest) image* · Example 7 (*make this room japandi* → detect → render → "Here's your Japandi render. Want to try a different variation, or convert this into a 3D model you can walk through in the Space Planner?").

### F-08 · Tool status labels
- Where: AG tools:1621-1622
- Words: *AI Visualiser agent — detecting surfaces...* · *AI Visualiser agent — generating render...* (note "Visualiser" here vs "Visualizer" everywhere else)

### F-09 · ID Buddy panel — inline render result
- Where: BUDDY:337-415 (`InlineToolResult`)
- Does: on a successful `generate_render` event, shows the image (`alt="AI render — {surfaces}"`) with overlay buttons *Save* (downloads `render-{style}-{ts}.png`, `aria-label` *Save render image*) and *Share* (Web Share with the file if available, else copies the URL and reads *Copied* for 2 s; `aria-label` *Share render image*); caption *{style} style render* (default *Modern*).
- Reachable: yes

### F-10 · Dashboard inline response — render card
- Where: INL:757-830, 890-898
- Does: same card (`RenderImageCard`) for the dashboard's inline mAIson answers; default style label *AI*.

### F-11 · ID Buddy quick chip *Generate Moodboard*
- Where: BUDDY:49-52, 73, 81, 1174-1177
- Does: a quick-action chip that opens a lead picker titled *Select a lead for moodboard* (rows show the lead's `stylePreference` or *No style set*) and sends the **text** prompt *Write a moodboard concept description for {name} ({style|modern} style, {type|HDB}, {budget})* — a written concept, not an image (it does not call the co-pilot moodboard image route).
- Reachable: yes

### F-12 · Co-Pilot › AI render (`POST /api/copilot/render`)
- Where: CPR:1-268
- Does: for a live meeting session: `{ sessionId, photo?, styleKeywords? }` → prompt (with-photo: transform the photo keeping layout, Singapore HDB/condo scale; without: generate a room in the style) → `google/gemini-3-pro-image-preview`, 16:9 → upload to the `renders` bucket at `{studioId}/copilot/{sessionId}/{uuid}.{ext}` (UPV) → `copilot_visual_assets { type "ai_render", title "{s1} + {s2} Room Render" | "AI Room Render", description, image_urls, metadata { styleKeywords, hasSourcePhoto } }`. If the session is bound to a project and the upload produced a hosted URL: also `render_jobs { room_id null, model, status completed, variants_json [{id:1, imageUrl, materials: []}], style, project_id, lead_id? }` and `project_files { folder "Renders", file_name "AI Render — {title}.png", file_type "image", storage_path <url> }`. Dry-run (no key / `dry-run-` id) returns a fixed asset with `/J-4.jpg`; a failed generation also falls back to `/J-4.jpg` without the mirrors.
- Rules: `maxDuration 60`; session ownership checked (`404 Session not found`).
- Reachable: yes (Co-Pilot visual-assist strip — reader of the co-pilot; not this audit)

### F-13 · Co-Pilot › Mood board (`POST /api/copilot/moodboard`)
- Where: CPM:1-278, CPG:1-78
- Does: `{ sessionId, styleKeywords (required), propertyType?, prompt? }` → a collage prompt with a *no text* rule → same model/upload → `copilot_visual_assets { type "mood_board", title "{k1} + {k2} + {k3} Mood Board", … }` + the same project mirrors with `file_name "Moodboard — {title}.png"`. `GET /api/copilot/moodboard/gallery?q=` lists the studio's active `mood_board` + `ai_render` assets (search on title / description / style keywords).
- Rules: because the mirror row is a `render_jobs` row with `room_id null`, these renders **do not appear** on the landing (B-01 skips jobs without a room) — they appear only in the project's Files & Docs *Renders*.

### F-14 · Co-Pilot › share a visual to the portal
- Where: `src/lib/queries/copilot.ts:559-602` (`useShareVisualToPortal`)
- Does: the same three calls as E-08 (`active-link` → `members/me` → `share-render`) with `title` and the hosted image URL; errors *Failed to resolve active homeowner link* · *No homeowner linked to this project* · *Failed to share to portal*. Test `copilot-hub.test.ts:752-759` pins the sequence; the co-pilot hub's action card is titled *Send moodboards to portal* (test :508).

### F-15 · Co-Pilot mock suggestions
- Where: `src/lib/copilot/mock.ts:105-110, 152, 167, 340`
- Words: suggestion *Customer wants 3D renders* / *Generate a quick Scandinavian-style living room render to share on screen now.* / action *Generate Render* (`generate_render`); mood-board actions *Generate Mood Board* with a prompt/style/scope payload; follow-up task *Prepare 3D renders of living room and kitchen in Scandinavian style*.

### F-16 · Tests that pin the co-pilot ↔ visualizer parity
- Where: `src/__tests__/copilot-hub.test.ts:315-451` (model swap to `gemini-3-pro-image-preview`, `render_jobs` + `project_files` inserts gated on project + upload, `folder: "Renders"`, VariantResult parity incl. `materials`, upload-before-persist, never persist a raw data URL; helper uploads to the `renders` bucket); `copilot-route-budgets.test.ts:24-56` (every model-calling copilot route declares `maxDuration` ≥ the visualizer's 60); `agents.test.ts:71-72, 100, 268-287, 401-403, 530-532, 772-810` (tool names present, `generate_render` accepts a surfaces array, `open_tool_page` enum has `"visualizer"`, `generateRender` calls `callOpenRouterForImage`, the prompt mentions detect → render, `InlineToolResult` handles `generate_render`).

---

## G. The trial / marketing visualizer (brief — likely out of 2.0's scope)

### G-01 · Marketing `/try` (restyle demo)
- Where: `src/app/(marketing)/try/page.tsx` (metadata *Try the AI Visualizer — Open Maison* / *See any room restyled by AI in seconds. Pick a room and a style, or upload a photo of your own space — free to try, no download.*), `page-client.tsx` (hero *AI Visualizer* / *See your room reimagined in seconds* / *Pick a room and a style — or upload a photo of your own space. It's the same AI our design studios use, free to try.*), VDEMO:26-245
- Does: card *See any room restyled* / *Pick a room and a style — or try your own photo.*; *Choose a room* (sample rooms + *Your room* upload tile: *Upload a room photo* / *Choose a different photo*, *1 free render on your own room. JPG, PNG, WebP or HEIC.*); *Pick a style* (palette chips); *See it restyled* / *Restyling your room…*; preview overlay *Pick a style, then hit See it restyled* / *Upload a photo of your room to begin*; result = compare slider (*Before* / style name); link *Sign up free to save designs, edit surfaces & furniture, and use your own rooms*; gate banner *You've used your free tries* / *Sign up free to keep rendering, use your own rooms, and save your designs.* / *Sign up free*. Counter *{n} sample(s) · {n} upload left*.
- Rules: 3 sample restyles (pre-rendered static images, instant; a repeated pair is free) + 1 own-photo render; counts in `localStorage om_demo_sampleKeys` / `om_demo_uploads`; upload compressed to 1024 px, HEIC normalised; errors *Couldn't read that image — try a JPG, PNG, or WebP.* / *That render didn't go through — please try again.*; sign-up link `/onboarding?source=visualizer-demo`.
- Reachable: yes (public)

### G-02 · `POST /api/demo/restyle`
- Where: DEMO restyle:16-172
- Rules: rate limit 4/min/IP; body `{ imageBase64, mimeType, style, imageWidth, imageHeight }` (`400 Missing image or style`, `413 Image too large` above ~4 MB base64); cookie `om_demo_v1` HMAC-signed `{ up }`, `FREE_UPLOADS = 1`, 24 h; gate `demoEnabled()` = not production or `DEMO_VISUALIZER_ENABLED === "true"` → else `402 signup_required`; model `google/gemini-3.1-flash-image`, `buildRestylePrompt({ style, sourceType "photo", fidelity "exact" })`, aspect from dims, 90 s abort (`504 Generation timed out — try again`, `502 Generation failed — please try again`, `502 No image in AI response`); output watermarked bottom-right with the text *Made with OpenMaison*; dry-run echoes the input watermarked.
- Reachable: yes (flag)

### G-03 · `/try-visualizer` (the anonymous full editor) and its six tool pages
- Where: `src/app/try-visualizer/page.tsx`, `layout.tsx`, `{style,materials,lighting,furniture,defurnish,sketch}/page.tsx`, TRV `trial-visualizer.tsx` (871 lines)
- Does: the real editor chrome (rail, tiles, panels, phone shell — SPEC1:91's shell) driven by anonymous routes; root page = `TrialStart` (upload / take a photo / sample rooms / a tool card grid) → editor; each tool page (`mode="single" singleTool=…`) leads with that tool and shows `TrialToolMarketing` below. Page titles: *Try the AI Visualizer — OpenMaison* · *Style AI — Restyle Any Room — OpenMaison* · *Materials AI — Change Room Finishes — OpenMaison* · *Lighting AI — Relight Any Room — OpenMaison* · *Furniture AI — Swap Furniture in Any Room — OpenMaison* · *Defurnish AI — Empty Any Room — OpenMaison* · *Sketch to Render — OpenMaison*.
- Rules: `trialEnabled()` = not production or `TRIAL_VISUALIZER_ENABLED === "true"`, else `notFound()` (404) — the pages are **not** live in an unflagged production deploy.
- Reachable: behind flag `TRIAL_VISUALIZER_ENABLED` (always on in dev)

### G-04 · Trial quota + watermark
- Where: `src/lib/render/trial-quota.ts` (cookie `om_trial_v1`, `TRIAL_LIMIT = 3`, HMAC `{ generations }`, tampered → 0), `trial-gate.ts` (logo watermark bottom-right, ~13 % width clamped 110–260 px, JPEG q88; unmarked on failure)
- Rules: the quota is shared across render / photorealistic / declutter; only a **successful** generation is counted; cookie 24 h.

### G-05 · Anonymous routes (one row each)
- Where: DEMO `visualizer/*`
- `GET /quota` → `{ generations, remaining, limit }` · `POST /detect` (rate 20/min, 8 MB cap, `runDetect`) · `POST /segment` (20/min, 8 MB, `runSegment`) · `POST /render` (10/min; `402 signup_required` at the limit **before** any model call; forces `model google/gemini-3.1-flash-image`, `variants 1`; ≤ 4 `customRefs` else `400 Too many reference images`; no analytics; watermarks every variant; returns `{ variants, remaining }`) · `POST /photorealistic` (10/min, same gate, `runPhotorealistic`) · `POST /declutter` (10/min, same gate, `runDeclutter`). All answer `503 trial_disabled` when the flag is off and `429 rate_limited` when bursting.

### G-06 · TrialStart words
- Where: TRV `trial-start.tsx:82-186`
- Words: eyebrow *Free · no sign-up · {remaining} of {limit} renders left* · *See your room, redesigned, in fifteen seconds.* · *The same AI visualiser our design studios use, open to try. Upload a photo, tap what you want changed, generate. Real renders, not filters.* · *Upload a room photo* / *Upload a sketch* · *Take a photo* (touch only) · *No photo handy? Start with a sample room* · *JPG, PNG or HEIC · your photo is only used for this session and never stored.* · *Or start with one tool* · *Every tool works on the same photo once you're in* · per-tool subtitles (`TOOL_INFO`): *Style* — *Restyle the whole room in one pass — walls, floors, furniture, décor, together.* · *Materials* — *Tap any surface and swap the finish — floors, walls, countertops, one at a time.* · *Lighting* — *Morning light to cozy evening — shift the mood without moving a thing.* · *Furniture* — *Remove, replace, or restyle individual pieces — sofa, bed, cabinets, anything.* · *Defurnish* — *Clear it to a blank canvas — walls, floor, camera angle stay exactly put.* · *Sketch to Render* — *Upload a hand sketch or floor plan — render it into a lifelike photo, styled the way you like.*

### G-07 · ToolUploadDialog words
- Where: TRV `trial-start.tsx:197-275`
- Words: *Drop a room photo here* / *Drop a sketch or floor plan here* · *JPG, PNG or HEIC · max 10MB · straight-on shots work best* / *· hand-drawn, CAD or a 3D snapshot* · *Upload a photo* / *Upload a sketch* · *Take a photo* · *No photo handy? Start with a sample room* / *No sketch handy? Try ours* · sample *Kitchen concept sketch* / *A hand-drawn kitchen, ready to render* · *Your image is only used for this session and never stored.*

### G-08 · Gate, soft sign-up, compare dialog
- Where: TRV `trial-signup-gate.tsx`, `trial-results.tsx:108-155`
- Words: gate *You've used all {limit} free renders* / *Sign up free to keep rendering, save your designs, and unlock the full editing suite.* / *Sign up free* (`/onboarding?source=try-visualizer`) · soft card after the first render *That's one of your {n} free renders.* *Sign up free to keep this design, download it without the watermark, and render as much as you like.* · compare dialog: *Before and after* · *· drag the handle* · *Download* · *Keep editing this* / *Edit* · footer *Free renders carry a small watermark. Sign up free to save this design in full resolution and keep editing without limits.* · versions strip *Versions* · *Original* · *Before / after* · *Download* · *Keep editing this*

### G-09 · Progress copy while a trial render runs
- Where: TRV `trial-results.tsx:22-43`
- Words: *Reading the room* (0 s) → *Applying your changes* (3 s) → *Rendering light and shadow* (7 s) → *Finishing touches* (12 s) → *Almost there* (20 s)

### G-10 · Trial editor strings (the quota line, generate labels, menus)
- Where: TRV `trial-visualizer.tsx:548-571, 672, 720-723, 767, 845-860`; `trial-panels.tsx:31, 131, 244-257`; `trial-canvas.tsx:88-165`
- Words: generate *Render from sketch* / *Empty the room* / *Generate · {n} change(s)* / *Generate*; busy *Emptying the room…* / *Rendering your sketch…*; quota *No free renders left* / *{n} of {limit} free renders left* (+ *· no sign-up needed*); *Show markers* / *Hide markers*; *Start over*; sheet titles *Note for the AI* · *Design style* · *Surfaces & materials* · *Furniture* · *Lighting* · *Empty the room*; tile *Surfaces & Materials* with value *{n} set* / *Detecting…* / *None detected*; pill *Defurnish* (title *Render the sketch to a photo first* when a sketch); *Runs your prompt, whichever panel is open*; defurnish options *Keep built-ins* — *Remove loose furniture and décor. Fitted cabinets, wardrobes and joinery stay.* / *Strip to shell* — *Remove everything, built-ins included — back to bare walls, floor and ceiling.*; *Only your changes are applied*; lock titles *Protected — the render leaves this exactly as it is* / *Protect this surface from any change*; canvas *Fit to screen* · *Download the current image* · *Before / after* · *Change photo* · overlay *Detecting surfaces and furniture…*; not-a-sketch dialog action *Upload a sketch instead*; versions sub *From sketch* / *Emptied*.

### G-11 · Per-tool marketing content (below the trial editor)
- Where: TRV `trial-tool-content.ts`, `trial-tool-marketing.tsx`
- Words: shared features *Real AI Rendering* / *Free to Start* (*3 free renders, no sign-up, no credit card. Sign up free afterward to keep going.*) / *About 15 Seconds*; shared FAQs *Is this really free?* · *What photos work best?* · *Does it work on any room, or just specific types?*; headlines *Restyle any room in seconds* · *Change any room's finishes in seconds* · *Relight any room in seconds* · *Swap furniture in any room in seconds* · *Empty any room in seconds* · *Turn any sketch into a photo in seconds*; style feature *10 Design Styles* (*Modern, Scandinavian, Industrial, Japandi, Classic, Minimalist, Art Deco, Bohemian, Coastal, Farmhouse*); lighting *5 Lighting Presets* (*Morning, golden hour, bright daylight, cozy evening, overcast*); sections *Works on any room, including* (Living Room · Bedroom · Kitchen · Dining Room · Home Office · Bathroom) · *How it works* · *Key features* · *Frequently asked questions* · *Try it free*.

### G-12 · Trial tests
- Where: `src/__tests__/trial-quota.test.ts` (round-trip, undefined/tampered/garbage → 0, limit 3), `trial-gate.test.ts` (enabled outside production; disabled in production without the flag), `trial-anonymous-routes.test.ts` (503 when off, 402 at the limit without calling the core, Fast model forced), `trial-watermark.test.ts` (logo mirrors `public/logo-full-mono.svg`; dimensions kept; only the bottom-right touched; portrait/tiny safe; unmarked on undecodable input).

### G-13 · UAE landing mention
- Where: `src/app/uae-get-started/page-client.tsx:110-111`
- Words: *AI Visualizer & 3D Planner* — *Show clients photorealistic renders of their space before a single wall is touched. Place furniture in an interactive 3D floor plan and let design sell itself.*

### G-14 · Public-demo spec vs code
- Where: `docs/features/visualizer-public-demo/spec.md:30-36, 100-107, 133-161`
- Does: spec locks 3 samples + 1 upload (matches G-01) and lists Cloudflare Turnstile + a durable KV rate limit as prerequisites for flipping `DEMO_VISUALIZER_ENABLED` — neither exists (the limiter is in-memory, `src/lib/rate-limit.ts`); the newer trial (G-03) reuses the same safe-by-default flag pattern.

---

## H. Docs — and where they disagree with the code

### H-01 · SPEC1 "Proposed Flow" vs the code
- Where: SPEC1:33-77 vs VIS (readers B/C) and this slice
- Divergences: chips "primary blue #3655F2" (theme is purple); variants *1/2/3* with a *Regenerate* per card; save actions **Download · Attach to Chat · Add to Project · Discard** — code has *Download*, *Share* (link), *Share to Portal*, *Send to Chat* (only with a linked chat), and auto-files to the project without asking; no *Discard*. SPEC1:85's route contract (`{ imageBase64, surfaces, style, variants }`) — reader D.

### H-02 · SPEC1 "Client Architecture (current — 2026-09)"
- Where: SPEC1:88-96
- Does: accurate for the hosts and the phone shell (readers B/C/D own the details); still names the project *Renders* tab as a live host (D-01 says it is unreachable).

### H-03 · SPEC1 technical notes stale on the job queue
- Where: SPEC1:107-117 ("Recommended fix (not yet implemented): … `render_jobs` … poll") and PRD:1237-1239 ("Entity: RenderJob ❌ Not built. Render operations are synchronous API calls")
- Does: `render_jobs` **does exist** and is written by the editor (`POST /api/renders/jobs`, VIS:2790) and the co-pilot — but as a *history* table written after a synchronous generation, not a queue. Both docs are stale in opposite directions.

### H-04 · SPEC2 (detection-driven editing, 2026-06-27)
- Where: SPEC2:1-80
- Does: locks the positioned-surface shape, per-instance furniture, panel-scoped dots, *Customize* replacing *Keep*, a *Detect Surfaces* tool entry, model `gemini-3-flash-preview` — all editor internals (readers B/C/D). Out of scope there: region-locked renders, render → quote wiring.

### H-05 · PRD C.3 stale
- Where: PRD:735-757, 273, 586
- Does: marks *Toggle before/after view — not built* and *Generate multiple named variants — not built*; both exist (the compare slider since `c5b00eafe` 2026-04-11; variant count in the generate bar). Also claims "Studio material catalogue — default only, user catalogue upload not wired" — the NF10 studio material library exists (`studio_materials`, nf-bundle UAT §1).

### H-06 · Onboarding script Module 5 vs code
- Where: ONB:516-606
- Not in code: "up to 10 MB" ✓ (VIS:2366 says *Maximum size is 10MB.*) but *style chip row Scandi, Japandi, Industrial, Modern, Classic, Biophilic, Hotel, Boutique* (editor styles — B/C), *custom styles trained from 3–5 portfolio renders (LoRA)*, *1024×768 / 2048 on Pro*, *~50 renders/month standard, 500 Pro*, *daily cap per studio / per-role limits in Settings → AI*, *watermark in Settings → Branding*, the **Original | Rendered toggle** (it is a slider), buttons *Download / Copy Link / Attach to Lead / Project*, right-click a lead file → *Open in AI Visualizer* (C-03), "output auto-attaches back to the lead's Files, tagged 'Render'" (C-02), share-link expiry "configurable … up to 30" (E-03), "Share … with a small watermark" (share links are **not** watermarked; only trial/demo outputs are), "Standalone mode — no lead attached" ✓ (sessions), "auto-attach … toggle per-studio" (no toggle). Also ONB:594 "every render costs credits" — no credits/quota exist for signed-in studios (grep: no render credit/quota columns; only the anonymous trial counts).

### H-07 · NF bundle UAT (custom materials)
- Where: `docs/uat/nf-bundle-uat.md:18-105`
- Does: TC-NF-1.1…1.5 describe the editor's *+* tile → dialog with *Save to studio library* (owner default checked; hidden for id-only members), buttons *Save & use* / *Use for this render*, toast *Saved 'X' to your studio library*, error *Could not save to library — using for this render only.*, ★ badge on library swatches, table `studio_materials` + bucket `studio-materials`. All inside the editor — hand-off to reader C; recorded here because it is the only UAT that names the visualizer.

### H-08 · `docs/uat/customization-engine-phase2.md`
- Does: no visualizer rows (the "visualization" hits are the lead-pipeline bucket editor).

### H-09 · mAIson roadmap
- Where: `docs/features/maison-bot-roadmap/plan.md:29, 183-196, 365-372`
- Does: counts `detect_surfaces`/`generate_render` among the 6 *AI Creative* tools (matches F-01/F-02); proposes *2.9 AI Design Consultation Assistant* (material options with example renders, tied to budget — not built) and a portal agent with `share_document_via_portal` for renders (not built).

### H-10 · Developer handbook stale models
- Where: `docs/DEVELOPER_HANDBOOK.md:117, 160, 797-798`
- Does: calls the tool "3D room render tool" and lists `POST /api/render/detect → gemini-2.0-flash-lite-001 (30 s)` and `POST /api/render → gemini-2.5-flash-image (120 s)`; the code uses `gemini-3-flash-preview` for detect (SPEC2) and `gemini-3-pro-image-preview` for generation with `maxDuration 60` (CPR:46-48, `api/render/route.ts:2`).

### H-11 · TESTING_NEW_FEATURES
- Where: `docs/TESTING_NEW_FEATURES.md:67, 171`
- Does: expects an *Open AI Visualizer* button on the project Overview (D-12, gone) and a seeded *Render image in "Renders" folder* (D-05 ✓).

### H-12 · CHANGELOG (the only dated release note)
- Where: CHG:89-100, 180-182 (UAE push, 2026-04-16)
- Entries: *Furniture detection* · *Before/after compare slider* · *Design style presets* · *Furniture preset library* · *Public render share pages* (`/renders/[token]` with consultation CTA) · *Share API* (`/api/renders/share` 7-day tokens, `/api/renders/[token]/consultation`) · *Percentage-based markers* · *Better detection model* — then **"The full visualizer enhancement was reverted on this branch (`3311dd45`) … Will be re-merged post-launch."** The share page and API are present at HEAD, so the revert was undone on this branch (no later CHANGELOG entry records it — the file stops at 2026-04-16).

### H-13 · Order features landed (git, this slice's files)
- 2026-02-23/24 first *AI rendering PR merged*, `Fixes to render`; 2026-02-25 *AI visualizer and ui improvements*; 2026-04-11 `c5b00eafe` furniture detection + compare slider + render sharing (share page/API); 2026-05-13 `042d5cc9d` visualizer + share stub/style fixes; 2026-05-21 `a7328d708` leads with null bucket shown in the picker; 2026-06-23 `99b53d968` homeowner_* writes ported to server routes (share-render, shared-renders, active-link); 2026-07-15/16 workspace landing (gallery, folders, sessions, rename/delete, "designs", lighting presets); 2026-07-21 `fa0212957` public `/try` demo; 2026-08-13 `fbaafac1e` render annotations + Style Transfer; 2026-08-21/22/24 `/try-visualizer` trial (routes, quota, gate, per-tool pages, real nav/footer); 2026-09-14 `5a58f1126` mobile editor + camera-app shell + landing redesign, `21102f283` trial rebuilt on the shared editor chrome + logo watermark; 2026-09-18 `bc0d227ac` HMAC hex-decode fix (quota cookies).

---

## Uncertain / not verified

1. **`?leadId=` alongside `?projectId=`** from the project's *Photo Renders* dialog: the landing uses only `projectId` (TOOL:82); whether the editor's lead picker is "pre-filled" as TED:26 claims could not be confirmed from this slice (reader B: does `Visualizer` read `leadId` when `projectId` is set? VIS:1499 uses `projectId ? "project_id" : "lead_id"`, so the lead id looks unused there).
2. **Homeowner portal home** (`/api/homeowner/dashboard`) shows "recent shared assets" — whether renders appear on the portal's home page (and with what words) was not read (outside the slice; E-23).
3. **`render_consultation_requests`** — no reader in `src`; whether an ops/admin surface or a DB view consumes it is unknown.
4. **`activeTab === "render"`** — confirmed unreachable from the UI; whether any external link (email, notification) ever emitted `?tab=render` was not checked outside `src`.
5. **Preview-as-homeowner** on the Renders sub-tab — `isPreview` gating is read from the page; how the preview cookie reaches `getHomeownerOrPreview` was not verified.
6. **Progress-update photos counted as "renders"** on the Key Files tile (D-03) — intended (comment says the visualizer "typically saves output" there "today") but stale; whether the editor ever wrote to progress updates was not verified (no such call found in VIS).
7. **The `Renders` folder on manual uploads** — the Files & Docs upload picker's folder list includes *Renders*, so a manual upload can land there; those files count on the Key Files tile but are excluded from portal auto-share (D-06). Not exercised.
8. **Studio-side page-visibility override UI** for `tools/ai-visualizer` in the studio's own Settings (the lead-drawer toast says "A studio owner can enable it in the workspace's page settings") — only the admin pages were in the slice; whether a studio owner has such a settings page was not checked.

## Hand-offs

- **Reader B / C (the editor's modes and controls):** everything inside `Visualizer` — rooms bar, canvas, detection, materials (incl. the NF7/NF10 studio material library, H-07), furniture, style, lighting, defurnish, sketch, the generate bar, the View/compare dialog's other buttons (Download, Keep editing, versions), room rename/delete, the `initialRoomId` / `sessionRoomIds` handling (VIS:1494-1592), `onRoomCreated` (VIS:2231-2246).
- **Reader D (phone shell, prompts, render routes, catalogue):** `/api/render`, `/api/render/detect`, `/api/render/segment`, `/api/renders/jobs` (+ `by-room`), `/api/projects/rooms`, the prompt builders, `lib/render/core/*` (also reused by the anonymous routes G-05), the mobile shell the trial reuses.
- **Reader E (tables, columns, storage):** `project_rooms`, `render_jobs`, `render_share_links`, `render_consultation_requests`, `homeowner_shared_assets` (+ `likes`, `comments`, `metadata.annotations`), `homeowner_project_links`, `project_files` / `lead_files`, `copilot_visual_assets`, `studios.settings.visualizerWorkspace` + `page_visibility`, `platform_config.page_visibility`, `usage_events`, buckets `renders` / `project-files` / `lead-files` / `studio-materials`, migrations 184/195/209.
- **Reader F (2.0 today):** what the prototype already has for the touchpoints named here — the lead's quick links, the project record, Files tab folders, the portal (`homeowner_*` tables in 2.0), Maison AI suggestions, notifications, activity feed.
- **Co-Pilot audit (separate module):** the visual-assist strip UI that calls F-12/F-13/F-14 and the mood-board gallery page.
