'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
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
 * (pending modules S46B — her "fix everything" 2026-10-19 after the findability audit, M5; 1.0's Copilot landing had a Meeting Insights card)
 * The Leads and Projects listings' **Insights** door after the primary — outlined, `bar_chart_4_bars`, its square on a phone — into Company ›
 * Reports › Meetings with the way back, for whoever reads that report (Owners and Admins, its tab's gate); not before a first meeting, as the
 * Projects listing's (nothing to read yet).
 */
export function MeetingsWorkspace({ data }: { data: StudioMeetingsData }) {
  const router = useRouter()
  const phone = useMediaQuery(MOBILE)
  const openInsights = () => router.push(withFrom('/company/reports/meetings', `${window.location.pathname}${window.location.search}`))
  const insights = runsStudio(data.viewer.role) && data.meetings.length > 0 ? (phone
    ? <Tooltip label="Insights"><IconButton icon="bar_chart_4_bars" label="Insights" onClick={openInsights} data-testid="open-insights" /></Tooltip>
    : <Button variant="secondary" appearance="outlined" iconStart={<Icon name="bar_chart_4_bars" size={20} />} onPress={openInsights} data-testid="open-insights">Insights</Button>) : null
  return (
    <PageReveal skeleton={<MeetingsListGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="meetings-workspace">
        <LeadMeetings leadId={null} leads={data.leads} rows={data.meetings} team={data.team} viewer={data.viewer} mayChange={data.mayChange} now={data.now} studioName={data.studioName}
          header={({ add }) => <PageHeader title="Meetings" actions={add || insights ? <>{add}{insights}</> : null} />} />
      </div>
    </PageReveal>
  )
}
