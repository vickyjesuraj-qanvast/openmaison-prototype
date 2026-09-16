import type { Metadata } from 'next'
import { fetchStudioTasks } from '@/lib/leads/tasks'
import { TasksWorkspace } from '@/components/tasks/tasks-workspace'

/** Tasks in the rail (REG-466): every lead's tasks and the studio's own, the Lead Details tab unpinned from one lead. */
export const metadata: Metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const data = await fetchStudioTasks()
  return <TasksWorkspace data={data} />
}
