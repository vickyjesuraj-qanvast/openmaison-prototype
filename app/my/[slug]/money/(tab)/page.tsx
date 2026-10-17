import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalMoneyView } from '@/components/portal/money/portal-money'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalMoney } from '@/lib/projects/payments-portal'
import { fetchLiveMethodValues } from '@/lib/projects/payment-methods-queries'   // (parity map, FB-112 · P-D)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your payments')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 6, board 4) The portal's Money — the gate first, as every portal page (lib/portal/session.ts); then each project's payments. */
export default async function PortalMoneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'money')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'money')))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  const [data, homes0, methods] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalMoney(gate.visitor.links, undefined, gate.visitor.homeownerId), fetchLiveMethodValues()])
  /* (parity map, FB-112 — P-D's Settings › Finance › Client payments) the ways the studio takes today ride to the pay box (no bank while Bank
     transfer is off, no PayNow while PayNow is off) and to I have paid (its two, the live ones) */
  const homes = homes0.map((h) => (h.pay ? { ...h, pay: Object.assign({}, h.pay, { methods }) } : h))
  return <PortalMoneyView data={data} homes={homes} methods={methods} />
}
