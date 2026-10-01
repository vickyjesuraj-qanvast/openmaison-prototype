import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { notFound } from 'next/navigation'
import { fetchLeadDetail } from '@/lib/leads/detail'
import { fetchLeadTasks } from '@/lib/leads/tasks'
import { LeadOverview } from '../overview'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const detail = await fetchLeadDetail(id)
  return { title: detail ? `${detail.lead.name} · Leads` : 'Lead' }
}

/**
 * Lead Details › Overview (858-24770). `now` and every derived figure come from the loader — the client never reads the clock.
 * `?from=…` (931:49680's `?from=qanvast`, generalised by REG-465 to any in-app path) names where the lead was opened from: the
 * L2 crumb reads "{section} / Leads" and Back returns there.
 */
export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  /* (Dane's UAT 5.05) The tasks as the Tasks tab loads them, read beside the frame: a task pressed here opens in that tab's panel over the
     Overview. Both loaders run together (REG-286's rule); the tasks loader answers an empty set for an id that is not a lead. */
  const [detail, tasks] = await Promise.all([fetchLeadDetail(id), fetchLeadTasks(id)])
  if (!detail) notFound()
  return <LeadOverview detail={detail} tab="" origin={readFrom(sp.from)} taskData={tasks} />
}
