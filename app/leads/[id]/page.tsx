import type { Metadata } from 'next'
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
 * `?from=qanvast` (931:49680, opened from Qanvast Ops › Leads) turns the L2 crumb into "Qanvast Ops / Leads" with back → /qanvast-ops.
 */
export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const detail = await fetchLeadDetail(id)
  if (!detail) notFound()
  return <LeadOverview detail={detail} tab="" origin={sp.from === 'qanvast' ? 'qanvast' : undefined} />
}
