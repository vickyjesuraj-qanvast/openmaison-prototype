import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalAboutView } from '@/components/portal/about/portal-about'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchAboutPage } from '@/lib/portal/about'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'About')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build H, H-Q20 · H-Q23) The portal's About page — the gate first: switched off, or with nothing on it, it leads home (the look lists
    `about` as hidden, `portalGate`'s section rule). */
export default async function PortalAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'about')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'about')))
  await stampOpened(gate.visitor)
  const [data, about] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchAboutPage(slug)])
  if (!about) redirect(portalPath(slug))
  return <PortalAboutView data={data} about={about} />
}
