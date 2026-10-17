import { sendStored } from '@/lib/leads/file-store'
import { studioPictureData } from '@/lib/portal/about'
import { isClientFace } from '@/lib/portal/faces'
import { portalGate } from '@/lib/portal/session'

/**
 * (pending modules S13 — S01's note) A member's photo on the client's portal — the face beside their messages and their answers to an issue.
 * Checked as every portal request is (the address, Live / Paused, the session; a preview opens it too) and by whose it is: only a member on
 * one of the visitor's homes. The studio's own picture address (/company/picture/…) never reaches a client's page.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const gate = await portalGate(slug)
  if (gate.kind !== 'in' || !(await isClientFace(gate.visitor, id))) return new Response('Not found', { status: 404 })
  return sendStored(await studioPictureData(id, 'member'), req, { name: `${id}.jpg`, cache: 'private, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
