import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchContractEditor } from '@/lib/contracts/queries'
import { ContractEditor } from '@/components/contracts/editor/contract-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchContractEditor(id)
  return { title: data ? `${data.contract.title} · ${data.lead.name}` : 'Contract' }
}

/** The contract editor (REG-534): a full-page surface over the page it was opened from — no rail. A missing or deleted contract is a 404. */
export default async function ContractEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const data = await fetchContractEditor(id)
  if (!data) notFound()
  return <ContractEditor data={data} from={readFrom(sp.from)} />
}
