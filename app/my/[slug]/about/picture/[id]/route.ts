import { sendStored } from '@/lib/leads/file-store'
import { isShownPortrait, studioPictureData } from '@/lib/portal/about'
import { portalGate } from '@/lib/portal/session'

/**
 * (gaps build H, H-Q23) A picture on the portal's About page — an About photo, or the portrait of a member Our team shows. Checked as every
 * portal request is (the address, Live / Paused, the session) and by the About us switch (an empty or switched-off page opens nothing).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const gate = await portalGate(slug)
  if (gate.kind !== 'in' || gate.look.hidden.includes('about')) return new Response('Not found', { status: 404 })
  const data = (await studioPictureData(id, 'about')) ?? ((await isShownPortrait(id)) ? await studioPictureData(id, 'member') : null)
  return sendStored(data, req, { name: `${id}.jpg`, cache: 'private, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
