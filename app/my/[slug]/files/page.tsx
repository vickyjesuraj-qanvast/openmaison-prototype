import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalFilesView } from '@/components/portal/portal-files'
import { PortalNotice } from '@/components/portal/portal-notice'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your files')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 4a) The portal's Files: the client's documents and the files marked Shown to client. */
export default async function PortalFilesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'files')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'files')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  return <PortalFilesView data={await fetchPortalData(slug, gate.look, gate.visitor, gate.paused)} />
}
