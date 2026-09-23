import type { Metadata } from 'next'
import { fetchTaskTemplatesData } from '@/lib/company/task-templates'
import { TaskTemplatesGallery } from '@/components/company/templates/task-templates-gallery'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Task templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Tasks (REG-538): the checklists the team adds to a lead in one go. */
export default async function TaskTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp] = await Promise.all([fetchTaskTemplatesData(), searchParams])
  return <TaskTemplatesGallery data={data} from={readFrom(sp.from)} />
}
