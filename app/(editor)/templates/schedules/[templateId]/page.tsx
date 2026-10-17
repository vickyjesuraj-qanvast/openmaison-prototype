import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchScheduleTemplateEditor } from '@/lib/company/schedule-templates'
import { ScheduleTemplateEditor } from '@/components/company/templates/schedules/schedule-template-editor'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  if (await refusesPath(`/templates/schedules/${templateId}`)) return { title: 'Schedule template' }   // (S44Z) no record's name in a tab that is not theirs
  const data = await fetchScheduleTemplateEditor(templateId)
  return { title: data ? `${data.template.name} · Schedule template` : 'Schedule template' }
}

/** (Projects round 2, Q-12) The schedule template editor, in the rail-less group; a missing or deleted template is a 404. */
export default async function ScheduleTemplatePage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ templateId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/templates/schedules/${templateId}`)) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const data = await fetchScheduleTemplateEditor(templateId)
  if (!data) notFound()
  return <ScheduleTemplateEditor data={data} from={readFrom(sp.from)} />
}
