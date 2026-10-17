import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalScheduleView } from '@/components/portal/project/portal-schedule'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalSchedules } from '@/lib/portal/schedule'
import { portalGate, stampOpened } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your schedule')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/**
 * (Projects round 4b, board 2) The portal's Schedule — the gate first, as every portal page (lib/portal/session.ts): an old address
 * redirects, a paused portal shows its notice and nothing else, a visitor not signed in goes to sign in. Then the schedule as last shared.
 */
export default async function PortalSchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'schedule')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'schedule')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  const [data, homes] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalSchedules(gate.visitor, { money: !gate.look.hidden.includes('money') })])   // (gaps build D, item 4) payment points while Money is on
  return <PortalScheduleView data={data} homes={homes} />
}
