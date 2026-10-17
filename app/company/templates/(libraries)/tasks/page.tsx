import type { Metadata } from 'next'
import { fetchTaskTemplatesData } from '@/lib/company/task-templates'
import { TaskTemplatesGallery } from '@/components/company/templates/task-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Task templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Tasks (REG-538): the checklists the team adds to a lead in one go. */
export default async function TaskTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/tasks')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders] = await Promise.all([fetchTaskTemplatesData(), searchParams, fetchFolders('tasks')])
  return <TaskTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />
}
