import type { Metadata } from 'next'
import { fetchDeletedLeads, fetchLeadRows, fetchReviewRows } from '@/lib/leads/queries'
import { LeadsWorkspace } from '../workspace'
import { parseView } from '@/lib/leads/view'
import { fetchLeadReasons, fetchLeadSources, fetchStageMovement } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { fetchMemberStats } from '@/lib/company/members'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const [{ rows: allRows, team, now }, deleted, review, params, stageMovement, sourceList, viewer, reasonList, customFields, memberStats] = await Promise.all([fetchLeadRows(), fetchDeletedLeads(), fetchReviewRows(), searchParams, fetchStageMovement(), fetchLeadSources(), fetchViewer(), fetchLeadReasons(), fetchCustomFields(true), fetchMemberStats()])   /* (REG-612) */
  /* (REG-601) Who sees which leads: a Manager their team's, a Designer their own, once the studio asks for it. */
  const visible = await visibleLeadIds(viewer)
  const rows = visible ? allRows.filter((r) => visible.has(r.id)) : allRows
  /* (REG-599) The pickers offer the live sources; a retired source still on a lead stays filterable. */
  const live = liveSourceNames(sourceList.sources)
  const sources = [...live, ...[...new Set(rows.map((r) => r.source))].filter((s) => !live.includes(s))]
  return <LeadsWorkspace rows={rows} team={team} now={now} deleted={deleted} review={review} urlView={parseView(params.view)} stageMovement={stageMovement} sources={sources} liveSources={live} viewer={viewer} leadReasons={reasonList.reasons} customFields={customFields} memberStats={memberStats} />
}
