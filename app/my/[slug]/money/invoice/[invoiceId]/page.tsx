import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalDoc } from '@/components/portal/money/portal-doc'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalData } from '@/lib/portal/home'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalInvoice } from '@/lib/projects/payments-portal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your invoice')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 6, F-15) An invoice of the client's, sent (never a Draft or another client's) — the gate first, as every portal page. */
export default async function PortalInvoicePage({ params }: { params: Promise<{ slug: string; invoiceId: string }> }) {
  const { slug, invoiceId } = await params
  const gate = await portalGate(slug, `money/invoice/${invoiceId}`)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, `money/invoice/${invoiceId}`)))   // (fix-F, F-20) back here once signed in
  await stampOpened(gate.visitor)
  // (REG-1050) what needs the client, for the phone bar's More
  const [invoice, { needs }] = await Promise.all([fetchPortalInvoice(gate.visitor, invoiceId), fetchPortalData(slug, gate.look, gate.visitor, gate.paused)])
  /* (fix-F, F-23) one that isn't theirs (or was voided) — the portal's own notice with the way back, never a bare 404 */
  if (!invoice) return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(slug, 'money'), label: 'Back to Money' }} />
  return <PortalDoc look={gate.look} slug={slug} visitor={{ name: gate.visitor.name, preview: gate.visitor.preview, memberName: gate.visitor.memberName, frame: !!gate.visitor.frame }} paused={gate.paused} needs={needs} invoice={invoice} />
}
