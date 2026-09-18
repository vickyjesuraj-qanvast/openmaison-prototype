import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchContractEditor } from '@/lib/contracts/queries'
import { ContractPreview } from '@/components/contracts/preview/contract-preview'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchContractEditor(id)
  return { title: data ? `${data.contract.title} · Preview` : 'Preview' }
}

/** Preview (REG-534): the contract as the client will see it on the signing page; `?print=1` prints it (Download as PDF · Print). */
export default async function ContractPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const data = await fetchContractEditor(id)
  if (!data) notFound()
  return <ContractPreview data={data} from={readFrom(sp.from)} print={sp.print === '1'} />
}
