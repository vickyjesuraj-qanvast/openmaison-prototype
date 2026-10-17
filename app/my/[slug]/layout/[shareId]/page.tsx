import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { notFound, redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalLayoutView } from '@/components/planner/viewer/portal-layout'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalLayouts } from '@/lib/planner/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, '3D layout')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build J, J-Q16) A shared 3D layout in the client's portal — the gate first, under the Designs section's switch (switched off, it
    leads home); then the layout, when it is shared on one of the visitor's homes and not stopped. */
export default async function PortalLayoutPage({ params }: { params: Promise<{ slug: string; shareId: string }> }) {
  const { slug, shareId } = await params
  const gate = await portalGate(slug, 'designs')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, `layout/${encodeURIComponent(shareId)}`)))
  await stampOpened(gate.visitor)
  const [data, layouts] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalLayouts(gate.visitor.links.map((l) => l.leadId))])
  const layout = layouts.find((l) => l.id === shareId)
  if (!layout) notFound()
  return <PortalLayoutView data={data} layout={layout} />
}
