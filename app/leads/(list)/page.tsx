import type { Metadata } from 'next'
import { fetchDeletedLeads, fetchLeadRows, fetchReviewRows } from '@/lib/leads/queries'
import { LeadsWorkspace } from '../workspace'
import { parseView } from '@/lib/leads/view'
import { fetchLeadReasons, fetchLeadSources, fetchStageMovement } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { fetchMemberStats } from '@/lib/company/members'
import { isMarketing } from '@/lib/settings/roles'   // (S44O — C6)
import { withoutQuoteMoney } from '@/lib/leads/lead-money'
import { refusesPath } from '@/lib/leads/visibility'   // (parity map, PR-022) the Leads pipeline is never Accounting's
import { AccessGate } from '@/components/shell/access-gate'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (await refusesPath('/leads')) return <AccessGate section="Leads" />   // (parity map, PR-022) before a lead is read
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const [{ rows: allRows, team, now }, deleted, review, params, stageMovement, sourceList, viewer, reasonList, customFields, memberStats] = await Promise.all([fetchLeadRows(), fetchDeletedLeads(), fetchReviewRows(), searchParams, fetchStageMovement(), fetchLeadSources(), fetchViewer(), fetchLeadReasons(), fetchCustomFields(true), fetchMemberStats()])   /* (REG-612) */
  /* (REG-601) Who sees which leads: a Manager their team's, a Designer their own, once the studio asks for it. */
  const visible = await visibleLeadIds(viewer)
  const seen = visible ? allRows.filter((r) => visible.has(r.id)) : allRows
  /* (S44O — call C6) Marketing never reads a quote's money — not even inside a stage log the browser is handed */
  const rows = isMarketing(viewer.role) ? seen.map((r) => ({ ...r, stageData: withoutQuoteMoney(r.stageData) })) : seen
  /* (REG-599) The pickers offer the live sources; a retired source still on a lead stays filterable. */
  const live = liveSourceNames(sourceList.sources)
  const sources = [...live, ...[...new Set(rows.map((r) => r.source))].filter((s) => !live.includes(s))]
  return <LeadsWorkspace rows={rows} team={team} now={now} deleted={deleted} review={review} urlView={parseView(params.view)} stageMovement={stageMovement} sources={sources} liveSources={live} importSources={sourceList.sources.map((s) => s.name)} viewer={viewer} leadReasons={reasonList.reasons} customFields={customFields} memberStats={memberStats} />
}
