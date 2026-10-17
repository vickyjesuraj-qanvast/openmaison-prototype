import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalChoiceReceipt } from '@/components/portal/choices/portal-choice-receipt'
import { loginPath, portalPath } from '@/lib/portal/model'
import { fetchPortalData } from '@/lib/portal/home'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalSelectionReceipt } from '@/lib/projects/choice-receipt'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Your selection receipt')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build D, item 7) A pick's selection receipt on the portal — the gate first (the Choices section's switch included, `choices/…`). */
export default async function PortalChoiceReceiptPage({ params, searchParams }: { params: Promise<{ slug: string; selectionId: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ slug, selectionId }, sp] = await Promise.all([params, searchParams])
  const sub = `choices/receipt/${selectionId}`
  const gate = await portalGate(slug, sub)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, sub)))
  await stampOpened(gate.visitor)
  const [receipt, { needs }] = await Promise.all([fetchPortalSelectionReceipt(gate.visitor, selectionId), fetchPortalData(slug, gate.look, gate.visitor, gate.paused)])
  if (!receipt) return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(slug, 'choices'), label: 'Back to Choices' }} />
  return <PortalChoiceReceipt look={gate.look} slug={slug} visitor={{ name: gate.visitor.name, preview: gate.visitor.preview, memberName: gate.visitor.memberName, frame: !!gate.visitor.frame }} paused={gate.paused} needs={needs} receipt={receipt} back={sp.from === 'files' ? 'files' : 'choices'} />
}
