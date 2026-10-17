import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalDesignsView } from '@/components/portal/designs/portal-designs'
import { PortalNotice } from '@/components/portal/portal-notice'
import { fetchPortalDesigns } from '@/lib/portal/designs'
import { fetchPortalLayouts } from '@/lib/planner/queries'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your designs')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 9, Q-45) The portal's Designs — the gate first, as every portal page: switched off in Company › Client portal, it leads to
    the home (`portalGate`'s section rule); then the designs shared from the Visualizer that still open. */
export default async function PortalDesignsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'designs')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'designs')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  const [data, homes, layouts] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalDesigns(gate.visitor, slug), fetchPortalLayouts(gate.visitor.links.map((l) => l.leadId))])
  return <PortalDesignsView data={data} homes={homes} layouts={layouts} />   /* (gaps build J, J-Q16) and the shared 3D layouts */
}
