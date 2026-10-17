import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { floorPlanPhotos, floorPlanPictures, projectFloorPlans } from '@/lib/db/schema'
import { sendStored } from '@/lib/leads/file-store'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/**
 * (pending modules S28 — card studio:floorplan-isometric-ai) A floor-plan photo a 3D layout is traced on, by its id — a lead's (to whoever may
 * open the lead), a personal layout's (to every member, as personal layouts are) — or, once its lead is won, the project's floor plan it
 * became (the same id; lib/projects/create.ts `carryLeadFloorPlans`), so the layout's underlay keeps its address. Never Accounting's (a floor
 * plan is the design, PR-022 — the Floor plan tab's picture route's rule). The picture never changes under its id. PRODUCTION: like /files/img,
 * an authenticated session first.
 */
export async function GET(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { planId } = await params
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role) || !/^[\w-]{1,64}$/.test(planId)) return new Response('Not found', { status: 404 })
  const [photo] = await db.select({ leadId: floorPlanPhotos.leadId, name: floorPlanPhotos.name, picture: floorPlanPhotos.picture }).from(floorPlanPhotos).where(eq(floorPlanPhotos.id, planId)).limit(1)
  if (photo) {
    if (photo.leadId && !(await canOpenLead(viewer, photo.leadId))) return new Response('Not found', { status: 404 })
    return sendStored(photo.picture, req, { name: `${photo.name}.jpg`, cache: STUDIO_CACHE }) ?? new Response('Not found', { status: 404 })
  }
  const [plan] = await db.select({ leadId: projectFloorPlans.leadId, name: projectFloorPlans.name, data: floorPlanPictures.data }).from(projectFloorPlans)
    .innerJoin(floorPlanPictures, eq(floorPlanPictures.planId, projectFloorPlans.id)).where(eq(projectFloorPlans.id, planId)).limit(1)
  if (!plan || !(await canOpenLead(viewer, plan.leadId))) return new Response('Not found', { status: 404 })
  return sendStored(plan.data, req, { name: `${plan.name}.jpg`, cache: STUDIO_CACHE }) ?? new Response('Not found', { status: 404 })
}
