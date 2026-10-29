'use client'

import { useEffect, useMemo } from 'react'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { TasksListGhost } from '@/components/shell/list-ghosts'
import { LeadTasks } from '@/components/leads/tasks/lead-tasks'
import { setCountPref } from '@/lib/prefs'
import type { StudioTasksData } from '@/lib/leads/tasks'
import { APPROVALS_COUNT_KEY, ApprovalsLine } from './approvals-line'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * Tasks in the rail (REG-466, owner 2026-09-16, no mock — proposal accepted): the Tools › Quotes frame (L1 header, the
 * listing's page body) around the Lead Details › Tasks orchestrator with `leadId` null — every lead's tasks and the
 * studio's own, a Lead column, the scope chip, Lead / Stage filters. Everything else is the tab, reused.
 * (parity map, TD-027 — 1.0's New task › Link to Project) The add row's Lead picker offers the projects made with New project too (their
 * client is no lead, REG-911), under a **Projects** group: they ride the picker's list after the leads, marked by their stage 'Project' — the
 * list the Filters' Lead pane already read (fix-G, G-15), so the two stay one list and nothing is offered twice.
 * (pending modules S46C · M3) `approvals` — the Dashboard's Needs your OK count: one line at the top while any waits for this member.
 * (the calm UI build 2026-10-27 took the line off, the audit's 1-03; Vicky 2026-10-29: brought back, with Dane's phone strip — one button with a ›)
 */
export function TasksWorkspace({ data, approvals = 0 }: { data: StudioTasksData; approvals?: number }) {
  const merged = useMemo<StudioTasksData>(() => ({ ...data, leads: [...data.leads, ...(data.projectLeads ?? [])], projectLeads: [] }), [data])
  useEffect(() => { setCountPref(APPROVALS_COUNT_KEY, approvals) }, [approvals])   // (REG-708) the loader draws the line next time as the page drew it now
  return (
    <PageReveal skeleton={<TasksListGhost approvals={approvals} />}>   {/* (REG-708) the page's own ghost, as its loading.tsx */}
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {/* The Leads header's shape (owner 2026-09-16): the primary Add Task with the plus, then the kebab, in the header itself. */}
        <LeadTasks leadId={null} data={merged} header={(c) => <PageHeader title="Tasks" actions={<>{c.add}{c.more}</>} />} notice={<ApprovalsLine count={approvals} />} />
      </div>
    </PageReveal>
  )
}
