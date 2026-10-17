import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalMessagesView } from '@/components/portal/threads/portal-messages'
import { fetchPortalData } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate, stampOpened } from '@/lib/portal/session'
import { portalFileHref } from '@/lib/portal/files'
import { clientFaces } from '@/lib/portal/faces'
import { fetchPortalConversations } from '@/lib/projects/messages'   // (parity map, UC-064) a lead's conversation too

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Messages')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (gaps build H, H-Q11) The portal's Messages — the gate first, as every portal page (switched off in Company › Client portal, it leads home);
    then each home's one conversation with the team. (parity map, UC-064) A home with no project yet writes to the team too — the lead's
    conversation, answered from Messages; once Won it carries on in the project's, its earlier lines first. */
export default async function PortalMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await portalGate(slug, 'messages')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, 'messages')))
  await stampOpened(gate.visitor)
  const data = await fetchPortalData(slug, gate.look, gate.visitor, gate.paused)
  const titles = Object.fromEntries(data.homes.map((h) => [h.leadId, h.title]))
  const homes = await fetchPortalConversations(gate.visitor, (id) => portalFileHref(slug, id), { titles, faces: await clientFaces(slug, gate.visitor) })   // (pending modules S13) the team's faces
  return <PortalMessagesView data={data} homes={homes} meId={gate.visitor.preview ? '' : gate.visitor.homeownerId} />
}
