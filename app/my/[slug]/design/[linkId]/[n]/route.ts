import { loginPath, portalPath } from '@/lib/portal/model'
import { portalDesignPictureFor } from '@/lib/portal/designs'
import { portalGate } from '@/lib/portal/session'
import { LINK_CACHE, isAddress, renderPicture, sendPicture } from '@/lib/visualizer/images'

export const dynamic = 'force-dynamic'

/**
 * (gaps build D, item 1 — M-06) A shared design's picture on the portal — session-checked as every portal request is (`portalGate`, the
 * Designs section's switch included): the link on one of the visitor's homes and not ended, its n-th version still live
 * (lib/portal/designs.ts `portalDesignPictureFor`). Its 7-day expiry does not stop it: that is the no-login link's rule, not the portal's.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; linkId: string; n: string }> }) {
  const { slug, linkId, n } = await params
  const gate = await portalGate(slug, `design/${linkId}/${n}`)
  if (gate.kind === 'missing') return new Response('Not found', { status: 404 })
  if (gate.kind === 'redirect') return Response.redirect(new URL(gate.to, req.url), 307)
  if (gate.kind === 'paused') return new Response(`${gate.look.studio}’s portal is paused`, { status: 403 })
  if (gate.kind === 'out') return Response.redirect(new URL(loginPath(slug, portalPath(slug, 'designs')), req.url), 307)
  if (gate.look.hidden.includes('designs')) return new Response('Not found', { status: 404 })
  const url = await portalDesignPictureFor(gate.visitor, decodeURIComponent(linkId), Number(n))
  if (!url) return new Response('Not found', { status: 404 })
  /* a render's address → its stored picture; a sample's public path redirects to itself */
  const m = isAddress(url) ? /^\/visualizer\/img\/v\/([^/?]+)\/(\d+)/.exec(url) : null
  if (isAddress(url) && !m) return new Response('Not found', { status: 404 })
  return sendPicture(m ? await renderPicture(m[1]!, Number(m[2])) : url, req.url, LINK_CACHE)
}
