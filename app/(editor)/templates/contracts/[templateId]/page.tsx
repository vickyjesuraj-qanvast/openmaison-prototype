import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchContractTemplateEditor } from '@/lib/contracts/queries'
import { ContractTemplateEditor } from '@/components/contracts/editor/contract-template-editor'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { templateDefaultBlock } from '@/lib/company/template-rules'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  if (await refusesPath(`/templates/contracts/${templateId}`)) return { title: 'Contract template' }   // (S44Z) no record's name in a tab that is not theirs
  const data = await fetchContractTemplateEditor(templateId)
  return { title: data ? `${data.template.title} · Contract template` : 'Contract template' }
}

/** The contract template editor (REG-534): the contract editor in library mode; a missing or deleted template is a 404. */
export default async function ContractTemplateEditorPage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { templateId } = await params
  if (await refusesPath(`/templates/contracts/${templateId}`)) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [sp, data, viewer] = await Promise.all([searchParams, fetchContractTemplateEditor(templateId), fetchViewer()])
  if (!data) notFound()
  /* (Contracts on the move, P-10) the reading screen's ⋮ sets the default and the handover letter — an Owner's or an Admin's, the gallery's rule */
  return <ContractTemplateEditor data={data} from={readFrom(sp.from)} defaultBlock={templateDefaultBlock(viewer)} />
}
