import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalFloorPlanView } from '@/components/portal/floor-plan/portal-floor-plan'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalFloorPlan, stampFloorPlanSeen } from '@/lib/projects/floor-plan'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Floor plan')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build G, G-Q1) The portal's Floor plan — the gate first, as every portal page (switched off in Company › Client portal, it leads home:
    `portalGate`'s section rule); then the plan the studio shared, marked up together. Opening it reads the bell's floor-plan rows (never in a preview). */
export default async function PortalFloorPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ plan?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const gate = await portalGate(slug, 'floor-plan')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'floor-plan')))
  await stampOpened(gate.visitor)
  const [data, plan] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalFloorPlan(gate.visitor, slug, typeof sp.plan === 'string' ? sp.plan : null)])
  await stampFloorPlanSeen(gate.visitor)
  return <PortalFloorPlanView data={data} plan={plan} />
}
