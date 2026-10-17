import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Not on your page')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/**
 * (fix-F, F-23) Where a portal link to something that is no longer the client's lands — a file taken off their page, another client's id, a
 * row of an old notification: the studio's bar and the portal's notice with the way back to their page. It names nothing and reads nothing.
 */
export default async function PortalGonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'gone')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, null))
  return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(slug), label: 'Back to your page' }} />
}
