import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalChoicesView } from '@/components/portal/choices/portal-choices'
import { PortalNotice } from '@/components/portal/portal-notice'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalChoices } from '@/lib/projects/choices'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your choices')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 8) The portal's Choices: what the studio put to the client — shared or chosen, never a draft. The gate decides first. */
export default async function PortalChoicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'choices')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'choices')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  const [data, homes] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalChoices(gate.visitor.links, slug, gate.visitor.homeownerId)])
  return <PortalChoicesView data={data} homes={homes} />
}
