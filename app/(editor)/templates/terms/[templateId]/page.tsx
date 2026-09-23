import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchTextTemplateEditor } from '@/lib/company/text-templates'
import { TextTemplateEditor } from '@/components/company/templates/editors/text-template-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  const data = await fetchTextTemplateEditor(templateId)
  return { title: data ? `${data.template.title} · Text template` : 'Text template' }
}

/** The Terms / Notes template editor (REG-538): the library editor in the rail-less group; a missing or deleted template is a 404. */
export default async function TextTemplatePage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { templateId } = await params
  const sp = await searchParams
  const data = await fetchTextTemplateEditor(templateId)
  if (!data) notFound()
  return <TextTemplateEditor data={data} from={readFrom(sp.from)} />
}
