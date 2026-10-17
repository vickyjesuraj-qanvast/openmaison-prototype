import { sendStored } from '@/lib/leads/file-store'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { planPictureFor } from '@/lib/projects/floor-plan'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/** (gaps build G, G-Q2) A floor plan's picture — the one marked up — only to whoever may open the project's lead. Its address carries the plan's
    `updatedAt`, so a cached copy is never shown after the plan changed. PRODUCTION: like /files/img, an authenticated session first. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id, planId } = await params
  const pic = await planPictureFor(id, planId)
  const viewer = await fetchViewer()
  if (!pic || isAccounting(viewer.role) || !(await canOpenLead(viewer, pic.leadId))) return new Response('Not found', { status: 404 })   // (parity map, PR-022) a floor plan is the design — never Accounting's
  return sendStored(pic.data, req, { name: `${pic.name}.jpg`, cache: STUDIO_CACHE }) ?? new Response('Not found', { status: 404 })
}
