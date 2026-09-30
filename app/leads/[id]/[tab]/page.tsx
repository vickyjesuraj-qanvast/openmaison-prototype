import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { notFound } from 'next/navigation'
import { fetchLeadDetail } from '@/lib/leads/detail'
import { DETAIL_TABS, type DetailTabSlug } from '@/lib/leads/stage-policy'
import { LeadOverview } from '../overview'
import { fetchLeadTasks } from '@/lib/leads/tasks'
import { LeadTasks } from '@/components/leads/tasks/lead-tasks'
import { fetchLeadQuotes } from '@/lib/leads/quotes'
import { LeadQuotes } from '@/components/leads/quotes/lead-quotes'
import { isApprover } from '@/lib/settings/queries'   // (REG-624)
import { fetchLeadContracts } from '@/lib/leads/contracts'
import { LeadContracts } from '@/components/leads/contracts/lead-contracts'
import { fetchLeadFiles } from '@/lib/leads/files'
import { LeadFiles } from '@/components/leads/files/lead-files'
import { fetchLeadNotes } from '@/lib/leads/notes'
import { LeadNotes } from '@/components/leads/notes/lead-notes'
import { fetchLeadQuestions } from '@/lib/leads/questions'
import { LeadQuestionnaire } from '@/components/leads/questionnaire/lead-questionnaire'
import { fetchLeadActivity } from '@/lib/leads/activity'
import { LeadActivity } from '@/components/leads/activity/lead-activity'

export const dynamic = 'force-dynamic'

/*
 * One route serves seven tabs, so all seven tab modules land in this route's client chunk (audit 2026-08-30,
 * PERF-TAB-BUNDLE). Both `next/dynamic` here and React.lazy inside a client module were measured on the production
 * build: Turbopack bundles per route, so neither split anything (identical chunk lists for /tasks and /quotes).
 * The only real fix is a route segment per tab; measured cost of not doing it is ~190 KB uncompressed (~45 KB gzip)
 * of tab code, downloaded once and then cached — left as is deliberately rather than adding indirection that does nothing.
 */

const isTab = (s: string): s is Exclude<DetailTabSlug, ''> => DETAIL_TABS.some((t) => t.slug === s && t.slug !== '')

/**
 * The lead frame and the tab's own rows are two INDEPENDENT queries; this route used to await `fetchLeadDetail`
 * and only then start the tab loader, serialising two round trips for no reason (REG-286, audit "request waterfall").
 * They now run together. Every tab loader is safe on an id that is not a lead — it returns an empty set — so
 * starting it before `notFound()` costs nothing, and `Promise.all` settles both so neither rejects unhandled.
 */
async function loadFrame<T>(id: string, load: (leadId: string) => Promise<T>) {
  const [detail, data] = await Promise.all([fetchLeadDetail(id), load(id)])
  if (!detail) notFound()
  return { detail, data }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; tab: string }> }): Promise<Metadata> {
  const { id, tab } = await params
  const detail = await fetchLeadDetail(id)
  const label = DETAIL_TABS.find((t) => t.slug === tab)?.label ?? 'Lead'
  return { title: detail ? `${detail.lead.name} · ${label}` : label }
}

/**
 * The other eight tabs (858:24784) keep the lead's frame and answer "coming soon" until their mocks arrive.
 * `?from=qanvast` (931:49680) is read the way app/leads/[id]/page.tsx reads it, so the "Qanvast Ops / Leads" crumb survives a tab click.
 */
export default async function LeadTabPage({ params, searchParams }: { params: Promise<{ id: string; tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id, tab }, sp] = await Promise.all([params, searchParams])
  if (!isTab(tab)) notFound()
  const origin = readFrom(sp.from)   // (REG-465) where the lead was opened from, kept across the tabs
  if (tab === 'tasks') {
    // Tasks (902-36216): the lead frame without the info column; the tab owns its table, panels and dialogs.
    const { detail, data } = await loadFrame(id, fetchLeadTasks)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadTasks leadId={id} data={data} />} />
  }
  if (tab === 'quotes') {
    // Quotes (910-36240): the same wide frame; the tab owns its table, menus, filters and dialogs.
    const { detail, data } = await loadFrame(id, fetchLeadQuotes)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadQuotes leadId={id} leadName={detail.lead.name} data={data} approval={detail.quoteApproval} canApprove={await isApprover(detail.viewer.id, detail.viewer.role)} viewer={{ id: detail.viewer.id, role: detail.viewer.role }} />} />
  }
  if (tab === 'contracts') {
    // Contracts (931-38609): the same wide frame; the tab owns its table, menus, filters and dialogs.
    const { detail, data } = await loadFrame(id, fetchLeadContracts)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadContracts leadId={id} data={data} />} />
  }
  if (tab === 'files') {
    // Files (931-39056): the same wide frame; the tab owns its grid / list, folders, menus, dialogs and the upload flow.
    const { detail, data } = await loadFrame(id, fetchLeadFiles)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadFiles leadId={id} data={data} />} />
  }
  if (tab === 'notes') {
    // Notes (931-44865): the same wide frame; the tab owns its list, editors, toolbar, attachments and dialogs.
    const { detail, data } = await loadFrame(id, fetchLeadNotes)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadNotes leadId={id} data={data} stage={detail.lead.stage} />} />   /* (UX audit 2026-09-30, L2) the stage decides the saved log's next step */
  }
  if (tab === 'questionnaire') {
    // Questionnaire (931-46769): the same wide frame; the tab owns its toolbar, cards, summary and the Ask the client dialog.
    const { detail, data } = await loadFrame(id, fetchLeadQuestions)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadQuestionnaire data={data} />} />
  }
  if (tab === 'activity') {
    // Activity (931-47975): the same wide frame; the feed derives from the lead's records.
    const { detail, data } = await loadFrame(id, fetchLeadActivity)
    return <LeadOverview detail={detail} tab={tab} origin={origin} wide body={<LeadActivity data={data} />} />
  }
  // Meetings (and any future tab): the wide frame too — the info column is the Overview's alone (REG-247, user 2026-09-01).
  const detail = await fetchLeadDetail(id)
  if (!detail) notFound()
  return <LeadOverview detail={detail} tab={tab} origin={origin} wide />
}
