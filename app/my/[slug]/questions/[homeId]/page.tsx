import type { Metadata } from 'next'
import { portalTitle } from '@/lib/portal/meta'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalQuestionsView } from '@/components/portal/portal-questions'
import { fetchPortalData, fetchPortalQuestions, homeOf } from '@/lib/portal/home'
import { loginPath, portalPath } from '@/lib/portal/model'
import { portalGate } from '@/lib/portal/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return portalTitle(params, 'Tell us about your home')   // (pending modules S13) an address no studio holds keeps the notice's words
}

/** (Projects round 4a, board 6) The questions the studio asked — only on a home this visitor's number opens; another id goes home. */
export default async function PortalQuestionsPage({ params }: { params: Promise<{ slug: string; homeId: string }> }) {
  const { slug, homeId } = await params
  const gate = await portalGate(slug, `questions/${homeId}`)
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'out') redirect(loginPath(slug, portalPath(slug, `questions/${homeId}`)))   // (fix-F, F-20) back here once signed in
  const home = homeOf(gate.visitor, homeId)
  if (!home) redirect(portalPath(slug))
  const [data, questions] = await Promise.all([fetchPortalData(slug, gate.look, gate.visitor, gate.paused), fetchPortalQuestions(home.leadId)])
  if (!questions.length) redirect(portalPath(slug))
  return <PortalQuestionsView data={data} homeId={homeId} questions={questions} now={data.now} />
}
