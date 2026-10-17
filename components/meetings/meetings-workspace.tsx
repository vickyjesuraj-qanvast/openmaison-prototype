'use client'

import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import type { StudioMeetingsData } from '@/lib/meetings/queries'
import { LeadMeetings } from './lead-meetings'
import { MeetingsListGhost } from './meetings-workspace-ghost'
import pageStyles from '@/app/leads/leads.module.css'

/**
 * (pending modules S23 — 1.0's Tools › Meeting Copilot, /tools/copilot-analytics: its History) Every meeting the viewer may see: the lead's
 * Meetings tab unpinned (the rail's Tasks page's shape, REG-466 — the L1 header carrying New Meeting ▾, the toolbar its search and Column
 * settings), with a Lead column and Start's lead picker. 1.0's Analytics and Objections are Company › Reports › Meetings (one home, REG-1361);
 * its Gallery is each meeting's "From this meeting" and the AI Visualizer's own home.
 */
export function MeetingsWorkspace({ data }: { data: StudioMeetingsData }) {
  return (
    <PageReveal skeleton={<MeetingsListGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }} data-testid="meetings-workspace">
        <LeadMeetings leadId={null} leads={data.leads} rows={data.meetings} team={data.team} viewer={data.viewer} mayChange={data.mayChange} now={data.now} studioName={data.studioName}
          header={({ add }) => <PageHeader title="Meetings" actions={add} />} />
      </div>
    </PageReveal>
  )
}
