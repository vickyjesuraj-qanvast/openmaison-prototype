'use client'

import { useEffect } from 'react'
import { CompanyShell } from '@/components/company/company-shell'
import { Icon } from '@/components/om/icon'
import { REPORTS_TABS, type ReportsTab } from '@/lib/company/sections'
import { useSignedInRole } from '@/components/shell/access-gate'   // (S44O — C6)
import { opensPath } from '@/lib/settings/roles'
import type { InsightsData } from '@/lib/leads/insights'
import type { SalesData } from '@/lib/leads/sales'
import type { ProjectInsightsData } from '@/lib/projects/insights'
import type { BooksData } from '@/lib/finance/books'
import type { MeetingReportsData } from '@/lib/meetings/reports'
import type { HealthFacts } from '@/lib/studio-health/model'
import type { Range } from '@/lib/leads/tat'
import { InsightsView } from '@/components/leads/insights/insights-view'
import { ProjectInsightsView } from '@/components/projects/insights/project-insights-view'
import { ReportsView } from '@/components/finance/books/reports-view'
import { MeetingsReport } from './meetings-report'
import { StudioHealthReport } from './studio-health-report'
import { ReportsGhost } from './reports-ghost'
import { REPORTS_TAB_COOKIE, rememberReport } from '@/lib/finance/report-memory'
import b from '@/components/finance/books/books.module.css'
import gate from '@/components/leads/insights/insights-view.module.css'

/**
 * (REG-1361, owner 2026-10-08) Company › Reports — every report the studio reads, in one place, on Company's frame: **Leads** (turnaround by
 * team member — what Leads › Insights was, REG-611), **Projects** (started, completed, duration, late milestones, collection — Projects ›
 * Insights, gaps build I), (pending modules S23) **Meetings** (held, went ahead, deal scores, coaching, objections — 1.0's Meeting Insights),
 * **Finance** (profit and loss, what is owed, profitability, cash flow … — Finance › Reports, gaps build F2). The
 * Insights buttons on Leads and Projects and a lead's Response time open a tab here with `?from=`, so Back returns where they were.
 * Every viewer sees every tab; a tab they may not read shows its gate.
 */
export function ReportsWorkspace({ tab, from, origin, backLabel, range, leads, sales, projects, meetings, health, books, report, period, project, entity }: {
  tab: ReportsTab['key']
  from?: string
  /** What the L2 crumb calls the page Reports was opened from, when its section's word is not enough — a lead's name. */
  origin?: string
  backLabel?: string
  leads?: InsightsData | null
  /** (pending modules S45A — H-UHD-1) the Leads tab's Sales report facts — an Owner's or an Admin's; null for anyone else */
  sales?: SalesData | null
  projects?: ProjectInsightsData | null
  /** (pending modules S23) the Meetings tab's facts — null for anyone but an Owner or an Admin (its gate) */
  meetings?: MeetingReportsData | null
  /** (pending modules S39) the Studio health tab's facts — null for anyone but an Owner or an Admin (its gate) */
  health?: HealthFacts | null
  /** (pending modules S39) the range the address asks for (`?range=`) — the house reports' default otherwise */
  range?: Range
  books?: BooksData | null
  report?: string | null; period?: string | null; project?: string | null
  /** (parity map, FB-105) the Finance tab's Issued by scope from the address */ entity?: string | null
}) {
  /* (S44O — call C6) the tabs this member opens — Marketing reads Leads alone; every other role sees the strip as before (a tab they can't read
     shows its own gate) */
  const role = useSignedInRole()
  const tabs = REPORTS_TABS.filter((t) => opensPath(role, t.href)).map((t) => ({ label: t.label, href: t.href }))
  /* (simplify S-13) the tab read last is where Company › Reports lands next time, in this browser (app/company/reports/page.tsx reads it) */
  useEffect(() => { rememberReport(REPORTS_TAB_COOKIE, tab) }, [tab])
  let body: React.ReactNode
  if (tab === 'leads') body = <InsightsView data={leads ?? null} sales={sales ?? null} initialRange={range} initialReport={report} />
  else if (tab === 'projects') body = <ProjectInsightsView data={projects ?? null} initialRange={range} />
  else if (tab === 'meetings') body = <MeetingsReport data={meetings ?? null} initialRange={range} />
  else if (tab === 'health') body = <StudioHealthReport data={health ?? null} initialRange={range} />
  else body = books ? (
    <div className={b.page} data-testid="finance-reports"><ReportsView books={books} report={report ?? null} period={period ?? null} project={project ?? null} entity={entity ?? null} /></div>
  ) : (
    /* (REG-1361) The Finance tab's gate — Finance › Reports was the Owners' and Admins' (F2-Q1). Invented copy. */
    <div className={gate.gate} data-testid="finance-reports-gate">
      <Icon name="lock" size={32} weight={300} />
      <span className={gate.gateTitle}>Finance reports are for Owners and Admins</span>
      <span className={gate.gateBody}>Ask your studio’s owner for the money reports.</span>
    </div>
  )
  return (
    <CompanyShell title="Reports" tabs={tabs} from={from} origin={origin} backLabel={backLabel} skeleton={<ReportsGhost tab={tab} money={projects ? projects.withMoney : undefined} />}>
      {body}
    </CompanyShell>
  )
}
