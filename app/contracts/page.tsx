import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { fetchStudioContracts } from '@/lib/contracts/queries'
import { ContractsWorkspace } from '@/components/contracts/list/contracts-workspace'

/** Tools › Contracts — every contract in the studio (REG-534). Frame copied from app/quotes/page.tsx. */
export const metadata: Metadata = { title: 'Contracts' }
export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  if (await refusesPath('/contracts')) return <AccessGate section="Contracts" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const data = await fetchStudioContracts()
  return <ContractsWorkspace data={data} />
}
