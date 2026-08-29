import type { Metadata } from 'next'
import { fetchDeletedLeads, fetchLeadRows, fetchReviewRows } from '@/lib/leads/queries'
import { LeadsWorkspace } from './workspace'
import { parseView } from '@/lib/leads/view'
import { fetchStageMovement } from '@/lib/settings/queries'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const [{ rows, team, now }, deleted, review, params, stageMovement] = await Promise.all([fetchLeadRows(), fetchDeletedLeads(), fetchReviewRows(), searchParams, fetchStageMovement()])
  return <LeadsWorkspace rows={rows} team={team} now={now} deleted={deleted} review={review} urlView={parseView(params.view)} stageMovement={stageMovement} />
}
