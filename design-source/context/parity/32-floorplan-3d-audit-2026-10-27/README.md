# Floorplan to 3D Isometric — what 2.0 missed from 1.0, and what made it harder (2026-10-27)

**His ask:** "I noticed a lot of things missing in 3D isometric tool. Users started to give a lot of feedback … audit what is missing from
1.0 and fix it once for all with the super intuitive ux and ui. Also, people felt the 1.0 is simpler to use." The testers' screenshot: the
HDB 4-Room sample's Confirm with *Generate dollhouse view* only — "I can't see the button to generate top-down view. I assume it'll be a
button below the doll-house?"

**Sources:** 1.0's tool read on `origin/deployment/plg` @64791f115 and `origin/deployment/qanvast` @d1796448d → `1.0-inventory.md` (every
screen, control and string with file:line); 2.0 walked on a production build at 1440 and 390 (`shots/before-*`); his screenshot of 1.0's
Confirm (both styles, lavender chips, *Not quite right?*).

## What was missing or harder, and what was done

| # | Finding | 1.0 | 2.0 before | Done | Row |
|---|---|---|---|---|---|
| 1 | **Top-down can't be chosen** — the testers' report | Style always offers Dollhouse and Top-down (fixed example pictures) | Style hidden when the sample has views of one look; HDB 4-Room has Dollhouse only | Both looks always; a look with no view yet stays, not pressable, and says why | REG-3070 |
| 2 | **No Switch style on the view** | Switch style always, regenerates in the new look | hidden for the same reason | Always, same rule | REG-3070 |
| 3 | **Only one sample to try** | (1.0 has none — every run is the studio's own plan) | HDB 3-Room and Condo 3-Bedroom hidden: no renders | **Closed** — the renders were dropped on his word (2026-10-28); the two samples stay hidden until an image model draws them | — |
| 4 | **Own plan: a dead end found after the upload** | the image model reads and draws it | the prototype has no model: straightened, then a note | Said before the upload (under the drop box) and shorter after; samples one press away | REG-3073 |
| 5 | **Confirm busier than 1.0's** | the plan alone | angle line + Turn a quarter + Square it by its corners + "The sample's own rooms…" on a sample | A sample's Confirm is 1.0's; a studio's own plan keeps the two rescues (1.0's missing 90° flip) | REG-3071 |
| 6 | **The plan leaves the screen while it renders** | faded under the status | the progress card alone | The plan faded under the card | REG-3072 |
| 7 | **Chip words** | "11 rooms in total" | "11 rooms in all" | 1.0's words, both tools | REG-3074 |

**Kept where 2.0 is ahead of 1.0:** the sample plans; PDF, HEIC and drag-and-drop; the room editor as a list of rooms (1.0: a free-text
box whose edits never reach its chips or its room check); the download named for the plan and the look; the ghost and the error page; the
Turn a quarter / corners rescue for a studio's own plan; no credits charged (1.0 charged none). **Not taken:** 1.0's lavender sentence-case
chips — 2.0's static label is the design system's Tag (`MetaChip`), the same in the planner's Make a 3D picture.

## The sample renders — approved, then dropped on his word (2026-10-28, see the end)

He approved all ten renders (60 Weave credits: HDB 4-Room Top-down ×2, HDB 3-Room Dollhouse ×2 + Top-down ×2, Condo 3-Bedroom Dollhouse ×2 +
Top-down ×2). The three plans are uploaded to Weave; the first run was refused: the account's 2 free model runs are used and Weave asks for
a paid plan (https://app.weavy.ai). Nothing was spent. Once upgraded: run each `render-inputs/<key>-<look>.txt` with `render-inputs/<key>.png`
on Nano Banana 2.1 (id `bebebed5-50c1-4701-98b3-86929db21585`, param `model` = "Nano Banana 2", 1K, 1:1, jpeg — 6 credits each), save as
`public/floorplan-3d/samples/<key>-<look>-<n>.jpg`, and set the take counts in `SAMPLE_PLANS` (`lib/floorplan-3d/model.ts`). The page then
offers all three samples and both looks with no other change; update `fp3d-pure.mts`'s "HDB 4-Room alone" check and `verify-fp3d.cjs`'s
disabled Top-down check at the same time.

## Verified

Production build on a fresh restore: `verify-fp3d.cjs` 98/98 (restated: a sample's Confirm, both looks, the faded plan, Switch style, the
landing's line, the rescues on a studio's own plan), `fp3d-pure.mts` 34/34, `verify-pm2-s28.cjs` 97/97 (the planner's shared room words);
tsc · eslint clean; design:lint nothing new. Shots `shots/after-*` (1440 · 390).

## Closed — 2026-10-28

**The ten sample renders are dropped on Vicky's word** ("ignore the 10 floor-plan sample renders"). The page ships with what it has: the
HDB 4-Room sample in Dollhouse (two takes), Top-down offered and saying it has no view yet for the sample, and a studio's own plan
straightened. The recipe above stays for whoever plugs in the image model (`setFloorplanRenderer`) — nothing here is pending.
