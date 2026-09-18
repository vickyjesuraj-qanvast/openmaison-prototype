import type { Metadata } from 'next'
import { fetchStudioContracts } from '@/lib/contracts/queries'
import { ContractsWorkspace } from '@/components/contracts/list/contracts-workspace'

/** Tools › Contracts — every contract in the studio (REG-534). Frame copied from app/quotes/page.tsx. */
export const metadata: Metadata = { title: 'Contracts' }
export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const data = await fetchStudioContracts()
  return <ContractsWorkspace data={data} />
}
