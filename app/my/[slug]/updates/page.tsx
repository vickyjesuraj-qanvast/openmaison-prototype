import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalUpdatesView } from '@/components/portal/project/portal-updates'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalUpdates } from '@/lib/portal/updates'
import { portalGate, stampOpened } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Updates')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 4b, board 3) The portal's Updates — the gate first, then the project's published updates, newest first. */
export default async function PortalUpdatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'updates')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'updates')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  const [data, homes] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalUpdates(gate.visitor, slug, { money: !gate.look.hidden.includes('money') })])   // (gaps build D, item 10) the stage's invoice while Money is on
  return <PortalUpdatesView data={data} homes={homes} />
}
