import type { Metadata } from 'next'
import { countApprovalsWaiting, fetchStudioTasks } from '@/lib/leads/tasks'
import { TasksWorkspace } from '@/components/tasks/tasks-workspace'

/** Tasks in the rail (REG-466): every lead's tasks and the studio's own, the Lead Details tab unpinned from one lead. */
export const metadata: Metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  /* (pending modules S46C · M3) …and the approvals that wait for this member on the Dashboard, read beside them — the line at the page's top */
  const [data, approvals] = await Promise.all([fetchStudioTasks(), countApprovalsWaiting()])
  return <TasksWorkspace data={data} approvals={approvals} />
}
