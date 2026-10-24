import { serviceSlot, type Named } from '@/lib/services/slots'
import type { Look, PlaceRoom } from './model'

/*
 * (REG-2800) THE IMAGE MODEL BEHIND Tools › Floorplan to 3D Isometric — one slot (lib/services/slots.ts), listed in lib/services/registry.ts.
 *
 * 1.0 (deployment/qanvast · plg): `src/lib/render/floorplan-pipeline.ts` prepares the scan in the browser (2.0 does that part for real —
 * components/planner/photo/straighten-photo.ts, REG-1929), then `detectInventory` (a vision pass, google/gemini-3-flash-preview) lists the rooms and
 * `generateWithGate` (google/gemini-3.1-flash-image with LOCKED_ISO_PROMPT or PHOTO_TOPDOWN_PROMPT, the rooms appended) draws the view, checks the
 * render's rooms against the plan's (`diffInventories`) and retries once with the misses said (`describeFailures`). Both through OpenRouter
 * (OPENROUTER_API_KEY), on 1.0's route `src/app/api/render/floorplan-3d-sandbox/route.ts` (session-guarded, 10 MB image, 4 KB inventory).
 *
 * The stand-in answers nothing: the page asks `floorplanLive()` (on the server) and, while the stand-in holds the slot, says plainly that a
 * studio's own plan is not read or drawn on the prototype; the three sample plans carry ready-made renders (lib/floorplan-3d/model.ts) and never
 * reach the slot. PRODUCTION: `setFloorplanRenderer({ name, readRooms, render })` once at start-up (lib/services/install.ts) — the page then
 * reads and draws a studio's own plan, with 1.0's "Not quite right?" correction of the rooms and its soft note when the rooms didn't match.
 */

/** How well the render's rooms matched the plan's (1.0's fidelity gate) — null when it wasn't checked. */
export type Fidelity = { matched: number; total: number } | null
export type PlanRender = { image: string; fidelity: Fidelity }

export type FloorplanRenderer = Named & {
  /** 1.0's inventory pass: the rooms the straightened plan holds, or null when none could be read (the page says so and still lets it draw). */
  readRooms(input: { scan: string }): Promise<PlaceRoom[] | null>
  /** 1.0's generateWithGate: the look drawn from the plan, its rooms checked against `rooms` and retried once — `image` is a URL or a data URL. */
  render(input: { scan: string; rooms: PlaceRoom[] | null; look: Look }): Promise<PlanRender>
}

/** What the stand-in says if it is ever asked — the page never asks it (it reads `floorplanLive()` first). *(invented copy)* */
export const PROTOTYPE_WORDS = 'This is the prototype, so your own plan isn’t read or drawn in 3D'

const STAND_IN: FloorplanRenderer = {
  name: 'Prototype stand-in (no image model)',
  async readRooms() { throw new Error(PROTOTYPE_WORDS) },
  async render() { throw new Error(PROTOTYPE_WORDS) },
}
const slot = serviceSlot<FloorplanRenderer>('floorplan-3d', STAND_IN)

/** PRODUCTION: plug the image model in once, at start-up. */
export const setFloorplanRenderer = (renderer: FloorplanRenderer) => slot.set(renderer)
/** The renderer answering now — read at the moment of use. */
export const floorplanRenderer = () => slot.use()
/** Whether a real image model answers — false on the prototype (the page shows its note and the samples instead). */
export const floorplanLive = () => !slot.standIn()
