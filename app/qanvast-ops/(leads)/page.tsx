import type { Metadata } from 'next'
import { fetchQanvastLeads } from '@/lib/leads/qanvast'
import { fetchLeadRows } from '@/lib/leads/queries'
import { fetchViewer, visibleLeadIds, refusesPath } from '@/lib/leads/visibility'
import { fetchLeadSources } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { QanvastLeads } from '@/components/qanvast/qanvast-leads'
import { AccessGate } from '@/components/shell/access-gate'

/** Qanvast Ops › Leads (931:49232) — spec design-source/context/lead-return/02-qanvast-ops.txt. Frame copied from app/leads/page.tsx. */
export const metadata: Metadata = { title: 'Qanvast Ops' }
export const dynamic = 'force-dynamic'

export default async function QanvastOpsPage() {
  if (await refusesPath('/qanvast-ops')) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  /* (one-home N-05) Add Lead opens the house lead form and Filters the house filters — what they read is the listing's own: the studio's
     members, who is looking, the live sources, the custom fields, and the Qanvast leads as the listing's rows (their members, tasks, seen). */
  /* (pending modules S14) Who sees leads decides this list too, as it does the listing's */
  const viewer = await fetchViewer()
  const [data, { rows: allRows, team }, sourceList, customFields] = await Promise.all([visibleLeadIds(viewer).then(fetchQanvastLeads), fetchLeadRows(), fetchLeadSources(), fetchCustomFields(true)])
  const ids = new Set(data.rows.map((r) => r.id))
  return <QanvastLeads data={data} leadRows={allRows.filter((r) => ids.has(r.id))} team={team} viewer={viewer} liveSources={liveSourceNames(sourceList.sources)} customFields={customFields} />
}
