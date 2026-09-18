import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchContractTemplateEditor } from '@/lib/contracts/queries'
import { ContractTemplateEditor } from '@/components/contracts/editor/contract-template-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  const data = await fetchContractTemplateEditor(templateId)
  return { title: data ? `${data.template.title} · Contract template` : 'Contract template' }
}

/** The contract template editor (REG-534): the contract editor in library mode; a missing or deleted template is a 404. */
export default async function ContractTemplateEditorPage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { templateId } = await params
  const sp = await searchParams
  const data = await fetchContractTemplateEditor(templateId)
  if (!data) notFound()
  return <ContractTemplateEditor data={data} from={readFrom(sp.from)} />
}
