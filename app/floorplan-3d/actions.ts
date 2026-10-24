'use server'

import { refuse, type Refusal } from '@/lib/company/template-rules'
import { fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { workspaceRefusal } from '@/lib/settings/desk'
import { roleGate } from '@/lib/settings/roles'
import { PLAN_MAX_BYTES, type Look, type PlaceRoom } from '@/lib/floorplan-3d/model'
import { floorplanLive, floorplanRenderer, PROTOTYPE_WORDS, type PlanRender } from '@/lib/floorplan-3d/service'
import { KIND_LABEL, LIMITS } from '@/lib/planner/model'

/*
 * (REG-2800) Tools › Floorplan to 3D Isometric's two server steps — 1.0's route (src/app/api/render/floorplan-3d-sandbox, session-guarded, the
 * model's work on the server so its check can't be skipped): read a studio's own plan's rooms, and draw its look. Both go through the image
 * model's slot (lib/floorplan-3d/service.ts). On the prototype the stand-in holds it and the page never calls these — it says so and offers the
 * samples, whose renders are files. A long string (the plan) travels inside one object argument (the house rule, REG-685…698).
 */

const LOOKS: readonly Look[] = ['dollhouse', 'top']
/** 1.0's words when the model fails (its page's error state). */
const FAILED = 'The 3D render didn’t come through. This is usually temporary — try again.'
const UNREAD = 'We couldn’t read that floor plan. Try a clearer photo — any angle is fine.'

/** Who may use the tool: a member whose role opens the page (Accounting and Marketing don't — the house gate's own sentence). */
async function gate(): Promise<Refusal | null> {
  const no = await workspaceRefusal()
  if (no) return no
  const viewer = await fetchViewer()
  return (await refusesPath('/floorplan-3d', viewer)) ? refuse(roleGate(viewer.role).help) : null
}
/** The straightened plan: a picture as a data URL, no larger than 1.0's 10 MB. */
function planOk(scan: unknown): scan is string {
  return typeof scan === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(scan) && scan.length * 0.75 <= PLAN_MAX_BYTES
}
/** The rooms as the studio confirmed them: names and the planner's room kinds, no more than a layout holds. */
function roomsOk(rooms: unknown): rooms is PlaceRoom[] | null {
  return rooms === null || (Array.isArray(rooms) && rooms.length <= LIMITS.rooms && rooms.every((r) => !!r && typeof r === 'object'
    && typeof (r as PlaceRoom).name === 'string' && (r as PlaceRoom).name.length <= 60 && (r as PlaceRoom).kind in KIND_LABEL))
}

export async function readFloorPlanRooms(input: { scan: string }): Promise<{ rooms: PlaceRoom[] | null } | Refusal> {
  { const no = await gate(); if (no) return no }
  if (!floorplanLive()) return refuse(PROTOTYPE_WORDS)
  if (!planOk(input?.scan)) return refuse(UNREAD)
  try {
    const rooms = await floorplanRenderer().readRooms({ scan: input.scan })
    return { rooms: rooms && roomsOk(rooms) ? rooms : null }   // 1.0: a failed reading isn't fatal — the view is drawn without it
  } catch { return { rooms: null } }
}

export async function renderFloorPlan(input: { scan: string; rooms: PlaceRoom[] | null; look: Look }): Promise<PlanRender | Refusal> {
  { const no = await gate(); if (no) return no }
  if (!floorplanLive()) return refuse(PROTOTYPE_WORDS)
  if (!planOk(input?.scan)) return refuse(UNREAD)
  if (!LOOKS.includes(input.look) || !roomsOk(input.rooms)) return refuse(FAILED)
  try {
    const r = await floorplanRenderer().render({ scan: input.scan, rooms: input.rooms, look: input.look })
    return typeof r?.image === 'string' && r.image ? { image: r.image, fidelity: r.fidelity ?? null } : refuse(FAILED)
  } catch { return refuse(FAILED) }
}
