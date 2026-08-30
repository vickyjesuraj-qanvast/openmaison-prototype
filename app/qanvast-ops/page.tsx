import type { Metadata } from 'next'
import { fetchQanvastLeads } from '@/lib/leads/qanvast'
import { QanvastLeads } from '@/components/qanvast/qanvast-leads'

/** Qanvast Ops › Leads (931:49232) — spec design-source/context/lead-return/02-qanvast-ops.txt. Frame copied from app/leads/page.tsx. */
export const metadata: Metadata = { title: 'Qanvast Ops' }
export const dynamic = 'force-dynamic'

export default async function QanvastOpsPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const data = await fetchQanvastLeads()
  return <QanvastLeads data={data} />
}
