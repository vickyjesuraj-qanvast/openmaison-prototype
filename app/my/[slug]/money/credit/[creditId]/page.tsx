import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalDoc } from '@/components/portal/money/portal-doc'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalData } from '@/lib/portal/home'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalCreditNote } from '@/lib/finance/credit-paper'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your credit note')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build F2 — F2-Q9) A credit note of the client's — on one of their homes' invoices — the gate first, as every portal page (the receipt's way). */
export default async function PortalCreditNotePage({ params }: { params: Promise<{ slug: string; creditId: string }> }) {
  const { slug, creditId } = await params
  const gate = await portalGate(slug, `money/credit/${creditId}`)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, `money/credit/${creditId}`)))
  await stampOpened(gate.visitor)
  const [credit, { needs }] = await Promise.all([fetchPortalCreditNote(gate.visitor, creditId), fetchPortalData(slug, gate.look, gate.visitor, gate.paused)])
  if (!credit) return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(slug, 'money'), label: 'Back to Money' }} />
  return <PortalDoc look={gate.look} slug={slug} visitor={{ name: gate.visitor.name, preview: gate.visitor.preview, memberName: gate.visitor.memberName, frame: !!gate.visitor.frame }} paused={gate.paused} needs={needs} credit={credit} />
}
