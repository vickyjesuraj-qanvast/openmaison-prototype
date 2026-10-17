import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchTaskTemplateEditor } from '@/lib/company/task-templates'
import { TaskTemplateEditor } from '@/components/company/templates/editors/task-template-editor'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  if (await refusesPath(`/templates/tasks/${templateId}`)) return { title: 'Task template' }   // (S44Z) no record's name in a tab that is not theirs
  const data = await fetchTaskTemplateEditor(templateId)
  return { title: data ? `${data.template.name} · Task template` : 'Task template' }
}

/** The task template editor (REG-538): the library editor in the rail-less group; a missing or deleted template is a 404. */
export default async function TaskTemplatePage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { templateId } = await params
  if (await refusesPath(`/templates/tasks/${templateId}`)) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const sp = await searchParams
  const data = await fetchTaskTemplateEditor(templateId)
  if (!data) notFound()
  return <TaskTemplateEditor data={data} from={readFrom(sp.from)} />
}
