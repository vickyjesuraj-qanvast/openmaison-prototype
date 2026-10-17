import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isDeletedProject } from '@/lib/projects/handover'
import { readFrom } from '@/lib/nav'
import { fetchProjectDetail, projectLeadId } from '@/lib/projects/queries'
import { PROJECT_ACTIVITY_CHIPS, PROJECT_TABS, isProjectTab, projectBase } from '@/lib/projects/tabs'
import { ProjectFrame } from '@/components/projects/project-frame'
import { fetchLeadTasks } from '@/lib/leads/tasks'
import { LeadTasks } from '@/components/leads/tasks/lead-tasks'
import { fetchLeadFiles } from '@/lib/leads/files'
import { LeadFiles } from '@/components/leads/files/lead-files'
import { fetchLeadNotes } from '@/lib/leads/notes'   // (gaps build, package A — M-02)
import { LeadNotes } from '@/components/leads/notes/lead-notes'
import { fetchLeadQuestions } from '@/lib/leads/questions'
import { LeadQuestionnaire } from '@/components/leads/questionnaire/lead-questionnaire'
import { fetchLeadActivity } from '@/lib/leads/activity'
import { LeadActivity } from '@/components/leads/activity/lead-activity'
import { fetchProjectUpdates } from '@/lib/projects/updates'
import { ProjectUpdates } from '@/components/projects/updates/project-updates'
import { fetchScheduleData } from '@/lib/projects/schedule'
import { fetchCrewBoard } from '@/lib/projects/contractors'   // (S45B · H-UHD-2)
import { ProjectSchedule } from '@/components/projects/schedule/project-schedule'
import { fetchProjectChoices } from '@/lib/projects/choices'
import { ProjectChoices } from '@/components/projects/choices/project-choices'
import { fetchProjectMoney } from '@/lib/projects/money-queries'
import { draftInvoicesFor } from '@/lib/projects/invoices'
import { ProjectMoney } from '@/components/projects/money/project-money'
import { fetchProjectCosts } from '@/lib/finance/queries'   // (gaps build F1)
import { fetchProjectBooks } from '@/lib/finance/books'   // (gaps build F2)
import { fetchFloorPlanData } from '@/lib/projects/floor-plan'   // (gaps build G)
import { ProjectFloorPlan } from '@/components/projects/floor-plan/project-floor-plan'
import { fetchProjectChat } from '@/lib/projects/messages'   // (gaps build H)
import { ProjectMessages } from '@/components/projects/messages/project-messages'
import { fetchProjectTickets } from '@/lib/projects/tickets'
import { ProjectTickets } from '@/components/projects/tickets/project-tickets'
import { fetchProjectCompliance } from '@/lib/compliance/queries'   // (gaps build I)
import { ProjectCompliance } from '@/components/projects/compliance/project-compliance'
import { fetchProjectDesigns } from '@/lib/projects/designs'   // (simplify S-03) Design › Designs
import { ProjectDesigns } from '@/components/projects/designs/project-designs'
import { ProjectViews } from '@/components/projects/project-views'
import { fetchLeadMeetings } from '@/lib/meetings/queries'   // (pending modules S23)
import { LeadMeetings } from '@/components/meetings/lead-meetings'
import { refusesPath, refusesWorkspace } from '@/lib/leads/visibility'
import { opensProjectView } from '@/lib/settings/roles'
import { AccessGate, ProjectViewGate } from '@/components/shell/access-gate'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; tab: string }> }): Promise<Metadata> {
  const { id, tab } = await params
  if (await refusesPath(`/projects/${id}/${tab}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchProjectDetail(id)
  const label = PROJECT_TABS.find((t) => t.slug === tab)?.label ?? 'Project'
  return { title: d ? `${d.project.name} · ${label}` : label }
}

/**
 * (REG-913 · REG-931) A project's other tabs — one route serves every slug in `PROJECT_TABS` but the Overview. Round 1's are the lead's own
 * tabs carried on (Q-01): the same records, the same components, handed the lead's id and the project's base path so every link they build
 * stays on the project. A round that adds a tab (Schedule, Updates, Money, Choices) adds its branch here. The frame's loader and the tab's run
 * together (REG-286); a project the viewer may not see answers not found.
 * (simplify S-03 · Q-01 · Q-02, the owner's "build everything" 2026-10-09) Every slug keeps its address; a view inside a group of more than one
 * (Tasks · Client · Design · Files & notes, lib/projects/tabs.ts) is handed the group's view switch as its title line (`views`). Design ›
 * Designs is new: the renders and 3D layouts the client sees.
 */
export default async function ProjectTabPage({ params, searchParams }: { params: Promise<{ id: string; tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id, tab }, sp] = await Promise.all([params, searchParams])
  if (!isProjectTab(tab)) notFound()
  if (await refusesPath(`/projects/${id}/${tab}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project is never Marketing's — before a record is read
  const origin = readFrom(sp.from)
  const leadId = await projectLeadId(id)
  if (!leadId) { if (await isDeletedProject(id)) redirect(`/projects?deleted=${encodeURIComponent(id)}`); notFound() }   // (Projects round 7) a deleted project's address lands on the listing — (fix-E, E-28) which says where it is
  const base = projectBase(id)
  /* (parity map, PR-022) Accounting opens a project's Money and Files; any other view keeps the frame and says so — no view's records are read */
  if (!opensProjectView('Accounting', tab) && await refusesWorkspace()) {
    const d = await fetchProjectDetail(id)
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectViewGate view={PROJECT_TABS.find((t) => t.slug === tab)?.label ?? 'this view'} moneyHref={`${base}/money`} />} />
  }
  if (tab === 'updates') {   // (REG-951, round 3) the project's own tab — its updates to the client
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectUpdates(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectUpdates data={data} views={<ProjectViews slug="updates" />} />} />
  }
  if (tab === 'choices') {   // (Projects round 8) the client's choices
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectChoices(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectChoices data={data} views={<ProjectViews slug="choices" />} />} />
  }
  if (tab === 'money') {   // (Projects round 5) where money lives; a project made before money gets its Drafts on this first read (idempotent)
    await draftInvoicesFor(id)
    const [d, data, costs, books] = await Promise.all([fetchProjectDetail(id), fetchProjectMoney(id), fetchProjectCosts(id), fetchProjectBooks(id)])   // (gaps build F1) money out beside money in · (F2) the books
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectMoney data={data} books={books} costs={costs} />} />   // (simplify S-07) one tab: Needs you · the tiles · Billing · Costs, the Costs orchestrator inside it
  }
  if (tab === 'floor-plan') {   // (gaps build G, G-Q1) the plan marked up with the client — `?plan=` opens one, else the main plan
    const planId = typeof sp.plan === 'string' ? sp.plan : null
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchFloorPlanData(id, planId)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectFloorPlan data={data} views={<ProjectViews slug="floor-plan" />} />} />
  }
  if (tab === 'messages') {   // (gaps build H, H-Q11) the one conversation with the client's side
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectChat(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectMessages data={data} views={<ProjectViews slug="messages" />} />} />
  }
  if (tab === 'tickets') {   // (gaps build H, H-Q2) the problems the client reports — `?open=` lands on one
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectTickets(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectTickets data={data} views={<ProjectViews slug="tickets" />} />} />
  }
  if (tab === 'meetings') {   // (pending modules S23) Client › Meetings — the lead's own meetings carried on: site meetings with the co-pilot and their briefs
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadMeetings(leadId)])
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadMeetings leadId={leadId} lead={data.lead} rows={data.meetings} team={data.team} viewer={data.viewer} mayChange={data.mayChange} now={data.now} studioName={data.studioName} base={base} views={<ProjectViews slug="meetings" />} />} />
  }
  if (tab === 'compliance') {   // (gaps build I, I-Q9) Singapore's checklist for the kind of home
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectCompliance(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectCompliance data={data} grouped />} />
  }
  if (tab === 'designs') {   // (simplify S-03) Design › Designs — the renders and 3D layouts the client sees, read where the portal reads them
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchProjectDesigns(id)])
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectDesigns data={data} views={<ProjectViews slug="designs" />} />} />
  }
  if (tab === 'schedule') {   // (Projects round 2) the list that is also the timeline
    const [d, data, crew] = await Promise.all([fetchProjectDetail(id), fetchScheduleData(id), fetchCrewBoard()])   // (S45B) the project's contractors
    if (!d || !data) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<ProjectSchedule data={data} crew={crew.viewer.sees ? crew : null} />} />
  }
  if (tab === 'tasks') {
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadTasks(leadId)])
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadTasks leadId={leadId} data={data} base={base} views={<ProjectViews slug="tasks" />} />} />
  }
  if (tab === 'files') {
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadFiles(leadId)])
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadFiles leadId={leadId} data={data} base={base} views={(await refusesWorkspace()) ? undefined : <ProjectViews slug="files" />} />} />   // (parity map, PR-022) Accounting's Files is the group's one view — its own title, no switch
  }
  /* (gaps build, package A — M-02) the lead's own Notes & Logs and Questionnaire carried on — a direct project's client has no lead page */
  if (tab === 'notes') {
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadNotes(leadId)])
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadNotes leadId={leadId} data={data} stage="Won" base={base} noun="project" views={<ProjectViews slug="notes" />} />} />   // (parity P-12) "this project"
  }
  if (tab === 'questionnaire') {
    const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadQuestions(leadId)])
    if (!d) notFound()
    return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadQuestionnaire data={data} noun="project" views={<ProjectViews slug="questionnaire" />} />} />   // (parity P-12)
  }
  const [d, data] = await Promise.all([fetchProjectDetail(id), fetchLeadActivity(leadId, { projectId: id })])
  if (!d) notFound()
  /* (fix-A, A-16 · C-20) the project's own chips — Money only for whoever sees it (F-17) */
  return <ProjectFrame d={d} tab={tab} origin={origin} body={<LeadActivity data={data} chips={PROJECT_ACTIVITY_CHIPS.filter((c) => c.value !== 'money' || d.money)} views={<ProjectViews slug="activity" />} />} />
}
