'use client'

import { useMemo } from 'react'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { TasksListGhost } from '@/components/shell/list-ghosts'
import { LeadTasks } from '@/components/leads/tasks/lead-tasks'
import type { StudioTasksData } from '@/lib/leads/tasks'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * Tasks in the rail (REG-466, owner 2026-09-16, no mock — proposal accepted): the Tools › Quotes frame (L1 header, the
 * listing's page body) around the Lead Details › Tasks orchestrator with `leadId` null — every lead's tasks and the
 * studio's own, a Lead column, the scope chip, Lead / Stage filters. Everything else is the tab, reused.
 * (parity map, TD-027 — 1.0's New task › Link to Project) The add row's Lead picker offers the projects made with New project too (their
 * client is no lead, REG-911), under a **Projects** group: they ride the picker's list after the leads, marked by their stage 'Project' — the
 * list the Filters' Lead pane already read (fix-G, G-15), so the two stay one list and nothing is offered twice.
 */
export function TasksWorkspace({ data }: { data: StudioTasksData }) {
  const merged = useMemo<StudioTasksData>(() => ({ ...data, leads: [...data.leads, ...(data.projectLeads ?? [])], projectLeads: [] }), [data])
  return (
    <PageReveal skeleton={<TasksListGhost />}>   {/* (REG-708) the page's own ghost, as its loading.tsx */}
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* The Leads header's shape (owner 2026-09-16): the primary Add Task with the plus, then the kebab, in the header itself. */}
        <LeadTasks leadId={null} data={merged} header={(c) => <PageHeader title="Tasks" actions={<>{c.add}{c.more}</>} />} />
      </div>
    </PageReveal>
  )
}
