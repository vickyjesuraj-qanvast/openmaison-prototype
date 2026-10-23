import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { fetchContractEditor } from '@/lib/contracts/queries'
import { ContractPreview } from '@/components/contracts/preview/contract-preview'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (await refusesPath(`/contracts/${id}/preview`)) return { title: 'Contracts' }   // (S44O — C6) no record's name in a tab that is not theirs
  const data = await fetchContractEditor(id)
  return { title: data ? `${data.contract.title} · Preview` : 'Preview' }
}

/** Preview (REG-534): the contract as the client will see it on the signing page; `?print=1` prints it (Download as PDF · Print). */
export default async function ContractPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; print?: string; /** (contracts on the move) a phone arrives on the paper viewer */ paper?: string }> }) {
  const { id } = await params
  if (await refusesPath(`/contracts/${id}/preview`)) return <AccessGate section="Contracts" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  const data = await fetchContractEditor(id)
  if (!data) notFound()
  return <ContractPreview data={data} from={readFrom(sp.from)} print={sp.print === '1'} paper={sp.paper === '1'} />
}
