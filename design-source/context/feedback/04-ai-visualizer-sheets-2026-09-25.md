# The two sheets — the AI Visualizer rows (2026-09-25)

The owner asked, after the AI Visualizer build (REG-671…678), for the same pass the Leads and Quotes rounds had: read both sheets for anything the AI Visualizer touches and build what is worth building, on our own recommendation.

**Source.** The owner's sheet `1nRylNpelEd8eo5gYXgE7YMI7kzL03qQm7OERjhw8I_k`:

- **Testers' feedback.** Tab `gid=434902554`, 215 rows.
- **Tech Feature Request.** Tab `gid=1489139182`, 111 rows.

The sheet no longer exports without signing in, and the Drive connector needed re-authorising in this session. The rows were therefore read from the CSV copies an earlier session took on 2026-09-23/24. **Rows added after 24 September are not covered.** Once the connector is back, a re-read of both tabs will catch them.

**What was found:**

- **The testers' tab.** 16 AI Visualizer rows. Row 40 is from 30 July. Rows 195–208 are the "Try AI visualizer" session of 15 September. Row 48's feature column says Quotes but its words name the Visualizer.
- **The studios' tab.** 4 rows touch the Visualizer: rows 5, 46, 51 and 54.

## Built in this round

| Rows | What was asked | What 2.0 now does | REG |
|---|---|---|---|
| Testers 40 · 207 · Studios 54 (Forme) | The AI chat for materials can't be found. The prompt box feels hidden and should be expanded and bigger. Voiceover in the AI Visualizer. | **Describe a change** sits above Generate, two lines tall and growing with the words. On a phone it heads the tray. A **mic** dictates into it wherever the browser can listen. The words ride along with any other pick, or make a version on their own. | REG-679 |
| Testers 195 | Wallpapers should have patterns, not solid colours. | **All twelve wallpapers carry their motif**: stripes, geometric, seigaiha, floral, botanical, art deco, brick, grasscloth, linen, concrete and cork. Each shows on the chip and is laid across the wall under the photo's light. A studio's own wallpaper photo tiles itself. | REG-680 |
| Testers 206 | A design style shouldn't be colours alone. It should be a colour, material and pattern palette. | **Each style card** shows the room in that style where the look exists. It also shows the floor, walls and counters the style picks, as swatches with names, above a thin colour palette. | REG-681 |
| Testers 200 | Make the photo upload more prominent when changing an element. | **"Have a sample? Upload a photo of it"** sits right under the material search. The Replace panel keeps *Add a photo of it*. | REG-682 |
| Studios 46 (Hi Reno) | Ability to create a moodboard. | **Moodboard** is on every version's ⋯ menu. It shows the render beside its finishes, the restyled pieces, the style and light, and the picture's five colours. It can be printed, saved as a PDF, or shared with the client. | REG-683 |
| Studios 5 | Renders and floor plans don't display when uploaded through Files & Docs. | **An upload keeps its picture.** 2.0's Files tab used to store a stand-in image for every upload. The grid, the viewer, Download and *Open in AI Visualizer* now all show what was uploaded. | REG-684 |

## Already the case in 2.0

| Rows | What was asked | Where 2.0 stands |
|---|---|---|
| Testers 196 | The material doesn't match its preview chip. | The recolour now works in Lab colour space. A lit wall renders at the paint's own colour: Sage Green #8FAD88 renders as #91AF89. Shadows only darken it (REG-678). |
| Testers 198 | Selecting a dot should highlight the same surface or piece in the right panel. | A square opens that surface's picker, and a circle opens that piece's row. The region lights up on the photo. A square picks its whole group, with a chip to narrow it to one surface (REG-678). |
| Testers 199 | Will there be an onboarding flow? | The landing has a three-step intro card. The editor shows a first-visit tip that can be shown again from ⋯. A new design opens on its add-room choices, and there are three sample rooms to try. |
| Testers 203 | The Generate button still says "Generate 3 changes" after the render. | A Generate spends the picks. The button returns to *Generate* with "Pick a finish, a style or a light first", and a probe checks this. |
| Testers 204 | Back in the browser left the tool, because the URL didn't change. | Every design has its own address. The room rides in `?room=`. Back returns to the gallery, or to wherever the design was opened from. |
| Testers 208 | Selection on the photo doesn't pick surfaces cleanly. | The sample rooms' outlines are traced: the armchair, lamp, console, speaker, TV, pot and the sofa's real edge (REG-678). A surface can be redrawn or drawn from scratch. |

## Not built, and why

| Rows | What was asked | Why not here |
|---|---|---|
| Testers 197 | The trial's images are low quality and the living room's angle is off. | 2.0 uses 1.0's three sample rooms, which are 900 px wide. **New sample photography is needed**, and the tester offered to share some when making the landing page. Swapping in new photos means re-tracing their outlines with `scripts/viz/grid.mts`. |
| Testers 201 · 202 · 205 | The "XX free renders left" message, the landing page's nav width, and the trial's sign-up steps. | These belong to the public trial, which the audit left with the platform (Q-27). The studio product has no render credits. |
| Testers 48 | Calculation mismatch in the AI Visualizer. | There's no detail in the row. In 2.0, *Add to a quote* lists every line before adding and says how many were priced from the Price book. This needs the tester's example if it persists. |
| Studios 51 (H Design) | AI pitch decks. | This isn't part of the Visualizer. *Present* and the client link cover the meeting and the follow-up. A deck generator belongs to a Slides or Proposals module, so it goes back to the owner as a proposal. |
| Studios 4 | In-portal file preview for homeowners. | The homeowner portal isn't in the prototype. The client link's page already shows every render inline, not as downloads. |

## For the devs

- **Files.** `lead_file_images` is migration 0054. The route `app/files/img/[fileId]/route.ts` serves the picture. The upload is `uploadFile(…, image)`, and the Files tab reads the picked image with `readFileAsDataUrl(file, 2000)`.
- **Patterns.** `lib/visualizer/patterns.ts` builds the tiles and the CSS. `recolor(…, texture)` takes a tile. `FinishedSurface.pattern` keeps the motif so later passes can lay it again.
- **The describe box.** It is `components/visualizer/editor/describe-box.tsx`. It uses Web Speech `SpeechRecognition` / `webkitSpeechRecognition` and hides where they're absent.
- **Probe.** `design-source/verify/ai-visualizer/verify-viz-sheets.cjs` runs 14 checks.
