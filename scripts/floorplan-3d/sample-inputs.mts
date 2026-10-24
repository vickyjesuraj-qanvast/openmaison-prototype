/*
 * (REG-2800) What Tools › Floorplan to 3D Isometric's sample renders were made from — exactly what 1.0 sends its image model
 * (deployment/qanvast `src/lib/render/floorplan-pipeline.ts` `generateWithGate`): the plan straightened and cleaned (2.0's own pipeline,
 * lib/planner/straighten-run.ts — 1.0's deskew), and the look's locked prompt with the plan's room inventory appended in 1.0's format
 * (`formatManifest` in its floorplan-3d route). The rooms are each sample's planner flat — its plan's own — where 1.0 asked a vision model.
 * Writes <outDir>/<key>.png (the plan to send) and <outDir>/<key>-<look>.txt (the prompt). The renders themselves were drawn once with 1.0's
 * model (Gemini 3.1 Flash Image, "Nano Banana 2") and kept in public/floorplan-3d/samples/. Run: `npx tsx scripts/floorplan-3d/sample-inputs.mts <outDir>`.
 */
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { straightenCanvas, type Can } from '../../lib/planner/straighten-run.ts'
import { planFromTemplate } from '../../lib/planner/templates.ts'
import { SAMPLE_PLANS } from '../../lib/floorplan-3d/model.ts'
import type { Room } from '../../lib/planner/model.ts'

const out = process.argv[2]
if (!out) { console.error('Give the folder to write into'); process.exit(2) }
mkdirSync(out, { recursive: true })
const make = (w: number, h: number) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))) as unknown as Can

/* 1.0's two locked prompts, word for word (floorplan-pipeline.ts LOCKED_ISO_PROMPT · PHOTO_TOPDOWN_PROMPT) */
const RENDER_QUALITY = `RENDER QUALITY & CONTEXT:
- The output must be a PHOTOGRAPH-QUALITY 3D render: physically-based materials, realistic lighting, soft shadows — as if ray-traced. It must NOT look like a sketch, drawing, illustration, line art, watercolor, or flat vector graphic. The input is only a geometric blueprint — do NOT inherit its line-drawing style.
- NO SURROUNDINGS: no grass, garden, trees, roads, pavement, terrain, or any site context around the building. The unit sits alone on a clean, solid, neutral studio background.`
const LOCKED_ISO_PROMPT = `Using the provided top-down floor plan as a fixed geometric blueprint, generate a photorealistic 3D isometric 'dollhouse' render.

CORE FIDELITY REQUIREMENTS:
- The building footprint, wall segments, and room partitions must match the provided plan's geometry EXACTLY.
- DO NOT add, remove, or merge any spaces. Every enclosed area shown in the plan must be represented as a distinct room or closet in the 3D model.
- Perform a 'room-by-room' count during generation: If the plan has 11 distinct enclosed spaces, the render must have exactly 11 distinct enclosed spaces in the same relative positions.
- Avoid 'hallway-merging' or 'closet-omission': small storage areas and partitions must be preserved with the same fidelity as large living areas.

VIEWPORT & CAMERA:
- Camera: Three-quarter view from above (45-degree elevation).
- ORIENTATION LOCK: The building's primary outer walls must remain PARALLEL to the image edges. Do NOT rotate, spin, or orient the plan diagonally. The orientation in the render must match the orientation of the input plan.
- Cut walls at a consistent height (no ceiling) to reveal the entire interior layout simultaneously.

INTERIOR & STYLE:
- Furnish every space according to the per-plan room inventory provided.
- Maintain a strict 1:1 mapping of function to space: Do not invent extra bathrooms or storage units not present in the plan.
- Use a modern, tasteful interior style with realistic materials and soft studio lighting.
- The background must be a clean, neutral solid color.

STRICT NEGATIVE CONSTRAINTS:
- NO TEXT: Remove all labels, room names, dimensions, and annotations found on the input plan. The output must be a clean, photorealistic image only.
- NO FABRICATION: Do not add architectural features (extra windows, moved doors, or shifted walls) that are not explicitly drawn on the floor plan.

${RENDER_QUALITY}`
const PHOTO_TOPDOWN_PROMPT = `Using this top-down floor plan as the exact layout reference, generate a photorealistic bird's-eye render of the home viewed straight down from directly above (90 degrees overhead, no perspective tilt).

- No ceiling — every room's interior is fully visible from above.
- The plan is axis-aligned; keep the render axis-aligned too. The walls must stay PARALLEL TO THE IMAGE EDGES — do NOT rotate the layout or present it diamond-oriented.
- The building footprint (outer wall outline) must match the plan's outline EXACTLY — same shape, same notches, same proportions.
- Keep the EXACT same layout: same wall positions, same door and window placements. Do not add, move, or remove any room, wall, door, or window.
- FIDELITY CHECK before finishing: your render must contain the same number of bedrooms, the same number of bathrooms, and the same kitchen position as the plan, each in the same relative location.
- Furnish each room appropriately for its function (beds in bedrooms, sofa and TV in the living room, dining table, kitchen cabinetry and appliances, bathroom fixtures) in a modern, tasteful interior style.
- NO TEXT anywhere in the output: no room names, labels, dimensions, captions, watermarks, or annotations — even if the input plan has text on it, the render must be a clean photorealistic image with zero text.
- Photorealistic materials, realistic soft daylight with gentle shadows.

${RENDER_QUALITY}`

/* the inventory, in 1.0's words (formatManifest): name (position): key items, then the totals and its two rules */
const ITEMS: Partial<Record<Room['kind'], string[]>> = {
  master: ['queen bed', 'bedside tables', 'wardrobe'], bedroom: ['single bed', 'wardrobe', 'study desk'], bathroom: ['shower', 'toilet', 'vanity'],
  kitchen: ['kitchen cabinetry', 'hob', 'fridge', 'sink'], living: ['sofa', 'TV console', 'dining table and chairs'], dining: ['dining table and chairs'],
  yard: ['washing machine', 'drying rack'], store: ['shelves'], balcony: ['two outdoor chairs', 'plants'], foyer: ['shoe cabinet'], study: ['desk', 'chair', 'bookshelf'],
}
function manifest(rooms: Room[]): string {
  const xs = rooms.flatMap((r) => [r.x, r.x + r.w]), zs = rooms.flatMap((r) => [r.z, r.z + r.d])
  const X0 = Math.min(...xs), X1 = Math.max(...xs), Z0 = Math.min(...zs), Z1 = Math.max(...zs)
  const where = (r: Room) => {
    const u = (r.x + r.w / 2 - X0) / (X1 - X0), v = (r.z + r.d / 2 - Z0) / (Z1 - Z0)
    const row = v < 0.34 ? 'top' : v > 0.66 ? 'bottom' : 'middle', col = u < 0.34 ? 'left' : u > 0.66 ? 'right' : 'centre'
    return row === 'middle' ? (col === 'centre' ? 'centre' : col) : col === 'centre' ? row : `${row}-${col}`
  }
  const lines = rooms.map((r, i) => `${i + 1}. ${r.name} (${where(r)})${ITEMS[r.kind]?.length ? `: ${ITEMS[r.kind]!.join(', ')}` : ''}`)
  const beds = rooms.filter((r) => r.kind === 'master' || r.kind === 'bedroom').length, baths = rooms.filter((r) => r.kind === 'bathroom').length
  return [
    'ROOM INVENTORY — detected from the plan. Your render must contain EXACTLY these rooms and nothing else:',
    ...lines,
    `Totals: ${rooms.length} rooms in all · ${beds} bedroom(s) · ${baths} bathroom(s)/WC(s).`,
    'HARD RULE: do NOT add any extra bedroom, bed, bathroom, wall, or room that is not in this inventory. Do NOT merge, split, or omit any listed room. Each room\'s furniture must match its listed key items.',
    'This inventory is LAYOUT INFORMATION ONLY — do NOT write any of these names, or any other text, label, caption, or annotation, anywhere in the render. The output must be a clean photorealistic image containing ZERO text.',
  ].join('\n')
}

for (const s of SAMPLE_PLANS) {
  const img = await loadImage(join(process.cwd(), 'public', s.plan.replace(/^\//, '')))
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0)
  const r = straightenCanvas(make, c as unknown as Can, { clean: true, quarter: 0, edge: 2048 })
  writeFileSync(join(out, `${s.key}.png`), (r.canvas as unknown as Canvas).toBuffer('image/png'))
  const inv = manifest(planFromTemplate(s.template).rooms)
  writeFileSync(join(out, `${s.key}-dollhouse.txt`), `${LOCKED_ISO_PROMPT}\n\n${inv}`)
  writeFileSync(join(out, `${s.key}-top.txt`), `${PHOTO_TOPDOWN_PROMPT}\n\n${inv}`)
  console.log(`${s.key}: ${r.canvas.width}×${r.canvas.height}, turned ${r.angle.toFixed(1)}°`)
}
