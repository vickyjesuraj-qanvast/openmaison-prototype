'use client'

import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { MaisonFab } from '@/components/shell/maison-fab'
import { useComingSoon } from '@/components/om/snackbar'
import { LeadTasks } from '@/components/leads/tasks/lead-tasks'
import type { StudioTasksData } from '@/lib/leads/tasks'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * Tasks in the rail (REG-466, owner 2026-09-16, no mock — proposal accepted): the Tools › Quotes frame (L1 header, the
 * listing's page body) around the Lead Details › Tasks orchestrator with `leadId` null — every lead's tasks and the
 * studio's own, a Lead column, the scope chip, Lead / Stage filters. Everything else is the tab, reused.
 */
export function TasksWorkspace({ data }: { data: StudioTasksData }) {
  const comingSoon = useComingSoon()
  return (
    <PageReveal skeleton={<LeadsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* The Leads header's shape (owner 2026-09-16): the primary Add Task with the plus, then the kebab, in the header itself. */}
        <LeadTasks leadId={null} data={data} header={(c) => <PageHeader title="Tasks" actions={<>{c.add}{c.more}</>} />} />
        <MaisonFab onPress={comingSoon} />
      </div>
    </PageReveal>
  )
}
