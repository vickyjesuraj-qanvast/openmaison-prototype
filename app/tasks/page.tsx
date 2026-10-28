import type { Metadata } from 'next'
import { fetchStudioTasks } from '@/lib/leads/tasks'
import { TasksWorkspace } from '@/components/tasks/tasks-workspace'

/** Tasks in the rail (REG-466): every lead's tasks and the studio's own, the Lead Details tab unpinned from one lead. */
export const metadata: Metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  /* (the calm UI build 2026-10-27 — the audit's 1-03 · 1-06: one home for approvals) the approvals that wait for this member are the Dashboard's
     Approvals — the line that repeated them at this page's top went (Tasks is for tasks); `countApprovalsWaiting` stays for whatever reads it */
  const data = await fetchStudioTasks()
  return <TasksWorkspace data={data} />
}
