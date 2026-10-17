import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PortalHomeView } from '@/components/portal/portal-home'
import { PortalNotice } from '@/components/portal/portal-notice'
import { fetchPortalData } from '@/lib/portal/home'
import { fetchPortalMoney } from '@/lib/projects/payments-portal'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalLook } from '@/lib/portal/queries'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { linkMetadata } from '@/lib/link-cards/meta'
import { unknownPortalMeta } from '@/lib/portal/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, look] = await Promise.all([params, fetchPortalLook()])
  /* (pending modules S13) an address no studio holds is its notice — its tab says so, and it carries no studio's card */
  return (await unknownPortalMeta(slug)) ?? linkMetadata('portal', slug, `/my/${slug}`, { pageTitle: look.studio })   // (pending modules S02) the invite's address carries the portal's card
}

/**
 * (Projects round 4a, boards 1 · 6 · 7) The client portal's home at the studio's address. The gate decides first (lib/portal/session.ts):
 * an old address redirects, a paused portal shows its notice and nothing else, a visitor not signed in goes to sign in.
 */
export default async function PortalHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug)))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  /* (fix-F, F-09) board 7's Money card: what the Money tab says of each project — never when the studio switched Money off */
  const [data, money] = await Promise.all([
    fetchPortalData(slug, gate.look, gate.visitor, gate.paused),
    gate.look.hidden.includes('money') ? Promise.resolve([]) : fetchPortalMoney(gate.visitor.links, undefined, gate.visitor.homeownerId),
  ])
  return <PortalHomeView data={data} money={money} />
}
