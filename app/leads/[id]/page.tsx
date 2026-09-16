import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { notFound } from 'next/navigation'
import { fetchLeadDetail } from '@/lib/leads/detail'
import { LeadOverview } from './overview'

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
  const detail = await fetchLeadDetail(id)
  if (!detail) notFound()
  return <LeadOverview detail={detail} tab="" origin={readFrom(sp.from)} />
}
