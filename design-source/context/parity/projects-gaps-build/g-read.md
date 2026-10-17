# Package G — floor-plan mark-up with the client · the short read (gaps build, Phase B, 2026-10-07)

Sources: inventory `projects-1.0-inventory/F-tasks-materials-floorplan-compliance.md` §4 (F-181…F-246); the reviewers' report
`26-projects-missing-from-1.0-2026-10-07/3-schedule-tasks-materials.md` (the ten Floor plan rows, all "Left out on purpose — Q-19, later") and
`7-coverage.md` (the uncited helpers: `floor-plan-notify-window.ts`, `-export-pdf.ts`, `-annotation-filter.ts`, `-comment-attachments.ts`,
`-site-diary.ts`, `upload-floor-plan-comment-image.ts`); 1.0 code read: `src/lib/floor-plan-{collab,layers,symbols,scale,notify-window,export-pdf}.ts`,
`src/components/floor-plan-collab/*` (heads). Q-19 held the module ("later, own modules"); the owner's "build everything" of 2026-10-07 is that later.
The 3-D Space Planner (F-247…F-267) is NOT this package — it is its own module.

## 1. What 1.0 does (what a studio uses)

- **One shared, annotated plan per project, many plans, one Primary** (F-181…F-183, F-199, F-227, F-228). Management › Floor Plan for the studio, the
  same component as the homeowner's portal tab. Not a CAD tool — marks, not geometry. Statuses: open · resolved. Only the studio sets the Primary; the
  homeowner always opens on it. Studio uploads become Primary at once (and email the homeowner); the homeowner's own upload never does. Archive is a
  soft flag (marks kept); archiving the Primary promotes the newest. Rename inline.
- **Upload** PNG / JPEG / WebP / PDF (F-207): a PDF's first page drawn in the browser at a 2400px long edge, the original kept; big photos shrunk to the
  same edge. Import from a file already on the project (F-189). "Ask your homeowner to send it" (email).
- **Drawing** (F-190…F-192, F-209…F-215, F-229): pen · box · arrow · text · numbered comment pin · photo pin · three hatched zones (diagonal =
  flooring, cross-hatch = hacking, dots = tiling) · revision cloud · numbered callout · ten M&E stamps in three groups (13A single / double, switch,
  data / TV, aircon, downlight, cove, pendant, water point, floor trap). Colour (role colour by default: studio #5500FF, homeowner #DB382A),
  thickness, dashed. Select (tap to open the thread; drag your own mark, < 6px = a click) · Erase (your own) · ⌘Z (your last mark this session).
  Zoom 100–800 % (wheel, pinch, ±×1.4, double-click fits), Pan mode. Points stored normalised 0–1. Each mark saved on pointer-up, optimistic.
- **Scale and measure** (F-193, F-197, F-212, F-235): teach the plan one known length (two clicks + "900", "0.9m", "90cm"; a bare small decimal is
  metres), stored per plan as mm per image pixel; Measure drags a dimension line that reads mm (under 1000) or m (two decimals).
- **Trade layers** (F-194, F-231): General · Carpentry · Electrical · Plumbing / wet works · Lighting · Tiling & flooring · Client requests · Studio only.
  An eye per layer, counts, the "drawing" layer. **Studio only is stripped from the homeowner's data on the server** — a rule, never a filter.
- **A conversation on each mark** (F-202, F-205, F-206, F-216, F-223, F-230): thread with Studio / Homeowner pills, up to 5 photos per comment
  (queued, sent with the comment, photos-only allowed), resolve / reopen by either side, delete your own; filter Both · Studio · Homeowner, hide
  resolved, a count "shown of total".
- **Mark → task, mark → variation order** (F-217, F-218): a General task on the project titled from the mark, assigned to the presser; a VO from the
  real editor, linked when it saves. One each per mark.
- **The homeowner confirms the layout** (F-201, F-233): "Happy with this layout? Confirm this layout" → append-only rows with name and phone copied,
  method "portal session"; studio banner "Layout confirmed by {name} · {date}" + "confirmed in the portal" ("Not a contract-grade signature"); a
  yellow warning on a plan that is not the confirmed one; grey "Waiting on your homeowner…" with more than one plan.
- **Point schedule and site diary** (F-203, F-204, F-211): stamps counted per symbol (resolved included); photo pins grouped by the day taken.
- **Export** (F-220): an A4 landscape PDF, page 1 the plan with every visible mark, page 2 a numbered legend (pins 1, 2… callouts C1, C2…) with each
  conversation — "send this to your contractor".
- **Notices** (F-234): homeowner told on every studio upload; studio told of homeowner marks / comments **at most once per plan per 15 minutes**
  (the quiet window, `floor-plan-notify-window.ts`: the first mark notifies at once, later ones by the same side stay silent 15 minutes).
  8-second refetch, no push (F-221).

## 2. What 1.0 got wrong or never finished (not ported)

- F-239: the homeowner sees the whole toolkit though the spec gives them the comment pin only, and the server never checks the role. **2.0 gives
  the client a short set and checks it on the server** (G-Q6).
- F-243: deleting a mark (and its whole conversation) is instant with no Undo. **2.0: a soft delete with Undo** (the house rule).
- F-244: every studio upload silently becomes what the homeowner opens on and emails them again. **2.0 asks** (G-Q3).
- F-242: a task from a mark has no due, no milestone, no notification. **2.0: the house task, assigned (bell), opened on the Tasks tab to finish.**
- F-241: the export and the VO are named after the plan, never the project. **2.0 names the project.**
- F-240: the empty filter's hint points the wrong way. F-246: dates in a fixed US locale. **2.0's own words and date format.**
- The 8-second refetch (F-221) is not ported: 2.0 refreshes on each own write and when the page comes back into view (the portal's way).

## 3. My calls — each "as recommended — set on the owner's instruction of 2026-10-07"

| # | Call | Recommendation |
|---|---|---|
| G-Q1 | Where it lives | A **Floor plan** tab on every project (after Choices, before Tasks — `PROJECT_TABS`), and a **Floor plan** section in the client's portal (`/my/<slug>/floor-plan`, More on a phone) with **its own switch** in Company › Client portal, on by default (Q-45's pattern: the page, its requests, its files and its bell rows refused on the server when off). A lead before Won has no floor plan tab (1.0's is a project's). |
| G-Q2 | What a plan is | A row `project_floor_plans` pointing at **a file in the project's Files › Floor plans** (the upload goes through package E's storage — the original PDF or picture keeps its bytes, its first page drawn) plus **the picture marked up**, kept beside it (`floor_plan_pictures`, a JPEG at a 2400px long edge, drawn in the browser — a PDF's first page, a big photo shrunk). Import from a picture or PDF already in Files. Max 8 MB (E's `FILE_UPLOAD_MAX`). |
| G-Q3 | Main plan | 1.0's "Primary" is **Main plan** (plain words). The first plan is the main one; adding another asks with a switch in the add dialog, *Make it the main plan — what {client} opens on* (on by default for the studio, so a revised plan still replaces the old in one press, but never silently). Only the studio sets it; the client's own uploads never become main. Archive = **Put away** (soft, marks kept; the main one passes to the newest) with Undo; the only plan can't be put away. Rename. |
| G-Q4 | The canvas | Our own SVG over the picture (no new drawing library — the marks are a handful of shapes and the Visualizer's stage already shows the zoom / pan / pinch way): points 0–1, `vector-effect: non-scaling-stroke`, zoom 100–800 % (the Visualizer's bar: − % +, ⌘ / Ctrl + wheel, pinch, double-click or double-tap fits), Pan mode and two-finger pan, each mark saved on lift. Tools in one toolbar row on desktop and a scrolling tool tray on a phone: **Select · Pen · Box · Arrow · Text · Pin · Photo · Zone ▾ (3 hatches) · Cloud · Callout · Stamp ▾ (10) · Measure**, then Colour & weight ▾, Layer ▾, Erase, Undo. |
| G-Q5 | Stamps, zones, layers, colours | 1.0's ten stamps, three hatches and eight layers, keys stable as 1.0's (a port keeps every mark). Colours: the studio's marks primary (#5500FF), the client's red (#DB382A), plus five swatches; three weights (thin 2 · medium 3 · thick 5); dashed. Each layer's eye on the Layer menu with its count; **Studio only never leaves the server for a client** (stripped in the loader, refused on the client's write). |
| G-Q6 | What the client may draw | **Pin, Pen, Box, Arrow, Text and Photo** — their marks go on the *Client requests* layer, in their colour. No stamps, zones, clouds, callouts, measuring, scale or layers (studio work). Checked on the server. Either side resolves or reopens any mark; only a mark's author moves or deletes it. |
| G-Q7 | Scale and Measure | Set the plan's scale from one known length (two taps, then "900", "0.9 m", "90 cm"; a bare small decimal is metres — 1.0's `parseDistanceToMm`), stored per plan as mm per picture pixel, Owners / Admins / the team only; Measure on an unscaled plan opens the scale steps first, then returns. Lengths read "{n} mm" under a metre, "{n.nn} m" above. Redo the scale any time (Undo). |
| G-Q8 | Threads | A thread on every mark (`floor_plan_mark_comments`): studio and client, each line wearing **Studio** / **Client** (1.0's "Homeowner" is the client in 2.0's words), up to 5 photos per comment (filed in Files › Floor plans), photos-only allowed, Enter sends. Resolve / Reopen. A deleted mark keeps its conversation until Undo is gone (soft delete). |
| G-Q9 | Mark → task | **Make a task**: the house task on the project (the lead's Tasks, `createTask`), titled from the mark's words or "Floor plan: follow up on {mark}", assigned to whoever pressed it (they hear it on the bell), linked to the mark (`floor_plan_marks.task_id`); the snackbar's **Open** lands on it in Tasks to add a date. A second press opens the same task. |
| G-Q10 | Mark → variation order | **Raise a variation order**: B's `createVariationOrder` (VO-n on the project, kind `variation`), titled from the mark, linked to the mark (`variation_id`), and the quote editor opens on it with Back to the floor plan. Only for whoever may change money (`forMoney`'s rule — the same refusal the Money tab gives). One per mark; after that the card links the order. |
| G-Q11 | Confirming a layout | On the portal: *Happy with this layout?* → **Confirm this layout** (an optional note) — an append-only row (`floor_plan_confirmations`: who, their phone copied, when, the note, the plan, *in the portal*); never in a studio preview. The studio's banner: **Layout confirmed by {client} · {date}** with *Confirmed in the portal — not a contract-grade signature*; on another plan: **{client} confirmed a different layout on {date}**; a plan changed after its confirmation says so (*Changed since {client} confirmed it*). |
| G-Q12 | Point schedule, site diary | Two cards beside the plan, only when there is something to count: **Points** (stamps per symbol under their group, resolved included; "Counting {studio / client} marks only" when filtered) and **Site diary** (photo pins grouped by the day taken, up to three thumbnails, +n). |
| G-Q13 | Export for the contractor | **Download PDF** opens the marked plan's paper (`/projects/<id>/floor-plan/<planId>/print` in the editor group, the invoice paper's frame): page 1 the plan with every mark the filter shows (Studio only included — it is the studio's own copy for its contractor, the page says so) on A4 landscape under the project's name, number, plan, date and scale; page 2 the legend — pins 1, 2… and callouts C1, C2… with their words and conversation, the point schedule. Printed by the browser (2.0's way: the quote preview's Download PDF). |
| G-Q14 | The bell, both ways | Studio: **A client marks up the floor plan** (a mark, a comment, a plan they add — the 15-minute quiet window per plan) and **A client confirms a layout** → the project's team; both in Settings › Notifications with emails / WhatsApp through the delivery layer. Client (derived, `BELL_PRODUCERS`): *A floor plan from your designer* (a plan added), *Your designer replied on the floor plan* (a studio comment on a client's mark, or a studio mark) — read once they open the floor plan. |
| G-Q15 | Who may | Read: Who sees leads (`canOpenLead`). Draw, comment, resolve: the project's team, Owners and Admins (`mayChangeProject`). Main plan, rename, put away, scale: the same. A completed project's floor plan is read-only (the Schedule's rule). Every refusal `{ error }`, said in the row. |
| G-Q16 | Undo everywhere | A mark's draw (⌘Z / Ctrl Z = Undo my last mark, the snackbar's Undo), delete (soft), move, resolve, put away, main plan, scale — each answers with Undo. |
| G-Q17 | Live refresh | No 8-second poll: the studio's page refreshes after each own write and when the tab comes back into view; the portal does the same (portal actions revalidate no path). |
| G-Q18 | Search, Activity, keys | Activity: `project_floor_plan_*` lines in a **Floor plan** chip (plan added / main / put away / scale set; a mark resolved / reopened, a task or VO raised, the client's confirmation — not every pen stroke). Search: plans by name under Projects' scope (`Floor plan · {project}`), opening the tab on that plan. Keys: the canvas's tools through the registry (area `floorplan`: V select · P pen · B box · A arrow · T text · N pin · M measure · ⌘Z undo · Esc cancel), marked `data-kb-own` on the canvas. |

## 4. Not in this package

The 3-D Space Planner and "Floorplan to 3D Isometric" (F-247…F-267, Q-19's other half) · an AI read of a plan · CAD geometry · a live push
(the prototype refreshes on view) · emails to the client (Phase B's delivery to clients comes later — the client hears it on the portal's bell).
