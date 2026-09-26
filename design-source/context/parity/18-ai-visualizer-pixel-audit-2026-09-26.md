# AI Visualizer — the pixel-level audit (2026-09-25 → 26)

**Asked for** (owner, 2026-09-25 evening): "go through in depth and pixel by pixel of complete AI Visualizer and all its features, functionalities, layout, ui, ux, transitions, animations … all touchpoints, saving the renders to files option, robust world-class visualizer experience, 2.0 components intact … fix everything to be perfect. After this please update the story for the testers … then commit and push." The calls were ours to take, as for the build (REG-671…684).

**Register:** REG-685…698. **Every change, by area:** [`18-…/changes-by-area.md`](18-ai-visualizer-pixel-audit-2026-09-26/changes-by-area.md). **Raw records:** [`18-…/raw/`](18-ai-visualizer-pixel-audit-2026-09-26/raw/) — the findings, the critic, every fix wave's report and every verification round.

## How it ran

1. **Audit.** Ten lenses read the live build at every width (1440 · 1280 · 1025 · 1024×768 and 768×1024 touch · 390 · 375 · 320 · a phone held sideways), each finding checked again by a second reader; a design critic added what no lens owned. **215 findings** kept (5 blocker · 80 major · 96 minor · 34 polish) plus 24 critic gaps. Index: `raw/findings-index.txt`.
2. **Fix waves A–C** (2026-09-25 night): agents on disjoint files — server, engine, stage, strip, rail, editor, gallery, client link, data, links.
3. **Verification round 1** on five live test servers: 178 fixed · 61 partly · 5 not fixed · 2 regressed · 4 not checkable, and **150 new issues** (1 blocker · 25 major).
4. **Fix wave D** — eight packages. **The owner's window closed at 05:04 on 2026-09-26 with all eight agents mid-edit** and no reports. The next session read each agent's transcript, wrote a digest of every edit it had landed and what it was about to do, and restarted the eight with those digests; nothing was redone or lost (the tree typechecked throughout).
5. **Verification round 2** (six verifiers): 187 of 221 re-checked items fixed; 74 new issues (6 major).
6. **Fix wave E** — nine packages (the engine split into Remove quality and painting quality), plus the integrator's own fixes (among them the Files upload bug below).
7. **Verification round 3** (four verifiers, on a fresh build): 100 of 119 items fixed · 15 partly · 4 left as the owner's calls (no worse); 26 new issues (1 major · 10 minor · 15 polish).
8. **Fix wave F** — both engine agents again, the library galleries, and the integrator (the editor, the canvas, the client link, Files, the quote editor, the ghosts). Then one build, the three probes, the UAT walk of chapter 13.

Checked by: `design-source/verify/ai-visualizer/verify-viz-{studio,client,sheets}.cjs` (37 · 30 · 14, all passing on the final build); `scripts/viz/render-test.mts` and `scripts/viz/remove-test.mts` for the engine; the repair (R61/R62) run twice on a fresh copy of the baseline (all checks pass, the second run changes nothing); typecheck and lint clean.

## The calls (REG-686)

Taken as recommended on the owner's standing instruction.

| | Call |
|---|---|
| D1 | The client's link shows only threads the client started (with the studio's replies); the team's own pins stay private, and the Share dialog says so. |
| D2 | Every client answer reaches the lead's members **and** whoever shared the link; the call-back Follow-up goes to the same people. |
| D3 | A Customize finish that names a part (Planter · Frame · a TV's frame and stand · a lamp's shade or base) paints only that traced part; a piece without it offers no such row. |
| D4 | A room made from a photo takes a room's name from the file ("Living room"), else "Room n". |
| D5 | Shortcut hints only where a shortcut already exists; no "?" sheet, no new shortcuts. |
| D6 | A material in use says "Used in n designs"; a finish renamed or recoloured since says so. |
| D7 | On a phone, a lead's ⋯ sheet offers AI Visualizer. |
| D8 | The Tasks table's touch-tablet end band sits at the row's end. |
| D9 | Autosave survives a reload or a closed tab (a keepalive save + a short-lived draft). |
| E1 | Editor snackbars rest over the versions strip — never on the photo or the canvas bar (short upright phones keep today's place). |
| E2 | A dialog's own confirmation is said inside it ("Link copied" in the button). |
| E3 | A phone held sideways gets a landscape layout with the photo as the hero. |
| E4 | On phones the Maison AI button slides away on scroll down and back on scroll up. |
| E5 | Materials remember who changed them last (migration 0056). |
| E6 | Materials Filters stay (invented UI): Category · Finish · Price book link. |
| E7 | Every Company library action answers a refusal with its rule (production hides a thrown message). |
| E8 | Deleting or returning a lead with live client render links says they stop working. |
| E9 | No dark mode (the app has none); Download stays one JPEG per version. |
| E10 | The client's link names members in full. |
| E11 | A rough reading of an uploaded photo stays, with its "Marked roughly…" note. |
| E12 | Rename and Change photo follow the Delete-room rule. |
| E13 | The WhatsApp draft names rooms as the client's page does. |
| F1 | A borrowed look gives the floor the reference wood's depth, not only its hue. |
| F2 | A version's caption names a piece by its kind ("Sofa", "Planter") and a removal says so ("Sofa taken out"). |

## What changed, in short

- **Rules the server keeps** (REG-687): who may rename, re-photograph, delete, restore and delete for good; links that end when their design, versions or lead go; pictures served only to who may see them; a render saved to Files that is itself; Add to a quote that quotes what the version shows and leaves area rates to measure.
- **The client's link** (REG-688) reads as the client's page at every width, with their own room as "Before", full names, and a house notice when it has ended.
- **The engine** (REG-689): Remove rebuilds what a piece hid and runs the rug on in its own weave; Customize paints a piece whole or only its part; materials, light and borrowed looks read true; the sample rooms retraced; the demo re-rendered.
- **The canvas, strip, Present, moodboard, Share and dialogs** (REG-690 · 691), **the rail** (REG-692) and **the editor frame** (REG-693): the photo always whole and in reach, one count of changes, saves that hold, focus that comes back, snackbars that never cover the work, a phone held sideways.
- **The AI Visualizer landing, Materials and every Company library** (REG-694), **Lead Files** (REG-695), **the quote editor where Add to a quote lands** (REG-696) and **the house pieces changed on the way** (REG-697).
- **Files uploads.** Every photo over about 730 KB failed: React's server-action decoder counts a bare string argument against a 1,000,000-character limit whenever an action takes more than one argument. Pictures and rich text now travel inside one object (`uploadFile`, `setRoomPhoto`, `saveRoomAsset`, `saveQuoteText`, the text templates) — 1 MB, 3.4 MB and 10.9 MB photos land.
- **The testers' chapter** (REG-698): UAT chapter 13, 33 steps, walked on the final build.

## What stays open

Proposals for the owner, and known limits of the prototype — none of them a defect in what was built.

- **Download** is one JPEG per version at the engine's size; PNG, full resolution, "Download all versions" and a studio mark on the picture are proposals (critic-11, E9).
- **A client's own busy photo** reads roughly (walls as a blob, a floor that misses sunlit boards). The curated engine can't follow real wall planes on an untraced photo; a segmentation model in production would (E11). The "Marked roughly…" note and *Draw a surface* stay the way through.
- **A one-click piece beside a look-alike neighbour** (a beige cushion by a grey one) can bleed into it; *draw round it* is offered.
- **A whole-room look under dusk light** keeps daylight in its windows (the looks' windows are not traced).
- **An edit on a relit version** is painted under the light and relit, and a change made later down the chain keeps that light (the golden-hour bedroom, Sophia's evening-light room). A *Relight* of such a later version stacks the new light on the old one — as its live preview shows it.
- **"Vn is ready" on a landscape tablet at exactly 1024** with two or more versions still covers part of the newest tile: the strip is 688 wide and the snackbar keeps the owner's fixed 344 (2026-08-29). With one version, and from 1280 up, it rests after the tiles.
- **A lamp's hot spot on a pale paint under a warm light** reads slightly salmon with a redder band, not the yellow-white core of the lit photo (a colour nuance of the light's roll-off, not a hard ring).
- **Render flecks visible only zoomed in (4–14×):** a patch of rug weave among the fringe tips after a rug Remove; a thin light line under the coffee table's front-left edge after a sofa Remove; a 2–3 px fleck at the armchair's post after an armchair Remove; a faint dotted ring round the pampas after a TV Remove; a pale fleck at the kitchen waterfall's inner foot.
- **Keyboard shortcuts** for Generate, Compare and Pin were not added (D5).
- **The Maison AI button** can rest on a card at a phone's first paint; it slides away on the first scroll (E4).
- **On a short upright phone** a snackbar covers the photo's foot rather than the canvas bar (E1 keeps today's place).
- **The Tasks page's phone ghost** draws the Leads cards (older than this audit, outside the AI Visualizer).
- **The Files upload toast** keeps the mock's "Uploading 1 file" over a finished row.
- **Production** must put the studio's picture routes behind a session (the devs' map, §Conventions).

## For the developers

`17-ai-visualizer-migration-map-2026-09-25.md` §6 lists the audit's tables (`render_images`, `lead_file_renders`, the room's `assets_json` · `state_rev` · `prior_photo_json`, `source_lead_id`, one lead design per lead, `studio_materials.updated_by`), the rules that changed, the leaving-save endpoint `POST /visualizer/state`, and the rule that a server action never takes a long string as a bare argument.
