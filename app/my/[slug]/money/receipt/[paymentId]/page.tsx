import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalDoc } from '@/components/portal/money/portal-doc'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalData } from '@/lib/portal/home'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalReceipt } from '@/lib/projects/payments-portal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your receipt')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 6, F-12) A receipt of the client's — a payment on one of their homes that has one — the gate first, as every portal page. */
export default async function PortalReceiptPage({ params }: { params: Promise<{ slug: string; paymentId: string }> }) {
  const { slug, paymentId } = await params
  const gate = await portalGate(slug, `money/receipt/${paymentId}`)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, `money/receipt/${paymentId}`)))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  // (REG-1050) what needs the client, for the phone bar's More
  const [receipt, { needs }] = await Promise.all([fetchPortalReceipt(gate.visitor, paymentId), fetchPortalData(slug, gate.look, gate.visitor, gate.paused)])
  /* (fix-F, F-23) one that isn't theirs (or was voided) — the portal's own notice with the way back, never a bare 404 */
  if (!receipt) return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(slug, 'money'), label: 'Back to Money' }} />
  return <PortalDoc look={gate.look} slug={slug} visitor={{ name: gate.visitor.name, preview: gate.visitor.preview, memberName: gate.visitor.memberName, frame: !!gate.visitor.frame }} paused={gate.paused} needs={needs} receipt={receipt} />
}
