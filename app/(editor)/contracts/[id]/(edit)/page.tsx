import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { fetchContractEditor } from '@/lib/contracts/queries'
import { ContractEditor } from '@/components/contracts/editor/contract-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (await refusesPath(`/contracts/${id}`)) return { title: 'Contracts' }   // (S44O — C6) no record's name in a tab that is not theirs
  const data = await fetchContractEditor(id)
  return { title: data ? `${data.contract.title} · ${data.lead.name}` : 'Contract' }
}

/** The contract editor (REG-534): a full-page surface over the page it was opened from — no rail. A missing or deleted contract is a 404. */
export default async function ContractEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  if (await refusesPath(`/contracts/${id}`)) return <AccessGate section="Contracts" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  const data = await fetchContractEditor(id)
  if (!data) notFound()
  return <ContractEditor data={data} from={readFrom(sp.from)} />
}
