import { sendStored } from '@/lib/leads/file-store'
import { portalGate } from '@/lib/portal/session'
import { portalPlanPictureFor } from '@/lib/projects/floor-plan'
import { LINK_CACHE } from '@/lib/visualizer/picture-store'

/** (gaps build G, G-Q1 · G-Q2) A floor plan's picture on the portal — session-checked as every portal request (`portalGate`; the Floor plan switch
    sends a page of a section that is off home, and this answers not found), on one of the visitor's homes, not put away. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await params
  const gate = await portalGate(slug, `floor-plan/picture/${planId}`)
  if (gate.kind !== 'in') return new Response('Not found', { status: 404 })
  if (gate.look.hidden.includes('floor-plan')) return new Response('Not found', { status: 404 })
  const pic = await portalPlanPictureFor(gate.visitor, planId)
  if (!pic) return new Response('Not found', { status: 404 })
  return sendStored(pic.data, req, { name: `${pic.name}.jpg`, cache: LINK_CACHE }) ?? new Response('Not found', { status: 404 })
}
