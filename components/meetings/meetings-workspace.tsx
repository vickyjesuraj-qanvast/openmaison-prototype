'use client'

import { useRouter } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { withFrom } from '@/lib/nav'
import { runsStudio } from '@/lib/settings/roles'
import type { StudioMeetingsData } from '@/lib/meetings/queries'
import { LeadMeetings } from './lead-meetings'
import { MeetingsListGhost } from './meetings-workspace-ghost'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * (pending modules S23 — 1.0's Tools › Meeting Copilot, /tools/copilot-analytics: its History) Every meeting the viewer may see: the lead's
 * Meetings tab unpinned (the rail's Tasks page's shape, REG-466 — the L1 header carrying New Meeting ▾, the toolbar its search and Column
 * settings), with a Lead column and Start's lead picker. 1.0's Analytics and Objections are Company › Reports › Meetings (one home, REG-1361);
 * its Gallery is each meeting's "From this meeting" and the AI Visualizer's own home.
 * (pending modules S46B — his "fix everything" 2026-10-19 after the findability audit, M5; 1.0's Copilot landing had a Meeting Insights card)
 * The Leads and Projects listings' **Insights** door after the primary — outlined, `bar_chart_4_bars`, its square on a phone — into Company ›
 * Reports › Meetings with the way back, for whoever reads that report (Owners and Admins, its tab's gate); not before a first meeting, as the
 * Projects listing's (nothing to read yet).
 * (the calm UI build 2026-10-27, 1-30 · 2-47 — the L1 header's one anatomy: title · the one filled "New meeting ▾" · ⋮) that door is the toolbar
 * ⋮'s first row, **Reports** (the page it opens is Company › Reports), for the same readers and from the first meeting on.
 */
export function MeetingsWorkspace({ data }: { data: StudioMeetingsData }) {
  const router = useRouter()
  const openReports = () => router.push(withFrom('/company/reports/meetings', `${window.location.pathname}${window.location.search}`))
  const reports = runsStudio(data.viewer.role) && data.meetings.length > 0 ? openReports : undefined
  return (
    <PageReveal skeleton={<MeetingsListGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="meetings-workspace">
        <LeadMeetings leadId={null} leads={data.leads} rows={data.meetings} team={data.team} viewer={data.viewer} mayChange={data.mayChange} now={data.now} studioName={data.studioName}
          header={({ add }) => <PageHeader title="Meetings" actions={add} />} onReports={reports} />
      </div>
    </PageReveal>
  )
}
