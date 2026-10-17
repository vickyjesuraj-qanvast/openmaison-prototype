import { cardImage } from '@/lib/link-cards/card-image'
import { isLinkCardKind } from '@/lib/link-cards/model'
import { linkCard } from '@/lib/link-cards/queries'
import { siteCardImage } from '@/lib/site/card'

export const dynamic = 'force-dynamic'

/**
 * (pending modules S02 — 1.0's `/api/og`) The picture card a client link shows in a chat — one route for every kind, keyed as the link is
 * (`/card/sign/<contract>`, `/card/invoice/<token>`, `/card/portal/<address>` …). No session: it says no more than the link's own page, and a
 * link that no longer opens draws the closed card in the studio's name.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; key: string }> }) {
  const { kind, key } = await params
  /* (pending modules S35) OpenMaison's own website — its page's card, in OpenMaison's name (lib/site/card.tsx); never a client link's */
  if (kind === 'site' && key && key.length <= 200) return siteCardImage(key)
  if (!isLinkCardKind(kind) || !key || key.length > 200) return new Response('Not found', { status: 404 })
  const k = (() => { try { return decodeURIComponent(key) } catch { return key } })()
  return cardImage(await linkCard(kind, k))
}
