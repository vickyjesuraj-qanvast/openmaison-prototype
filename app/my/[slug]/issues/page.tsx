import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalIssuesView } from '@/components/portal/threads/portal-issues'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { fetchPortalIssues } from '@/lib/portal/threads'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Issues')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build H, H-Q2) The portal's Issues — the gate first (switched off, it leads home); then each home's issues, the client's words only
    (no internal note, no studio-only line). `?open=` lands on one. */
export default async function PortalIssuesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'issues')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'issues')))
  await stampOpened(gate.visitor)
  const [data, issues] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalIssues(gate.visitor, slug)])
  return <PortalIssuesView data={data} homes={issues.homes} categories={issues.categories} meId={gate.visitor.preview ? '' : gate.visitor.homeownerId} />
}
