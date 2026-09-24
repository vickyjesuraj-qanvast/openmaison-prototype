import type { Metadata } from 'next'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { fetchLeadCapture, fetchLeadReasons, fetchLeadSources, fetchLeadVisibility, fetchNumbering, fetchStudio, fetchQuoteApproval, fetchQuoteRules, fetchStageMovement, fetchTemplateApproval, fetchTrades } from '@/lib/settings/queries'
import { inArray, isNull, sql } from 'drizzle-orm'
import { imports, leads, stageLogs } from '@/lib/db/schema'
import { like, or } from 'drizzle-orm'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { SettingsView } from './settings-view'
import { fetchMessageTemplates, fetchNotificationRules } from '@/lib/notifications/queries'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/** Account setup — studio-level configuration. Leads and Quotes (REG-561) are live in this build; `?section=quotes` opens the Quotes module. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const [stageMovement, quoteApproval, templateApproval, numbering, trades, me, sp, rules, team, leadSources, counts, leadVisibility, leadCapture, studio, arrivals, notificationRules, messageTemplates] = await Promise.all([
    fetchStageMovement(), fetchQuoteApproval(), fetchTemplateApproval(), fetchNumbering(), fetchTrades(), db.select({ name: members.name }).from(members).where(eq(members.isYou, true)), searchParams,
    fetchQuoteRules(), db.select({ id: members.id, name: members.name, role: members.role }).from(members),
    fetchLeadSources(), db.select({ source: leads.source, n: sql<number>`count(*)` }).from(leads).where(isNull(leads.deletedAt)).groupBy(leads.source),   /* (REG-599) */
    fetchLeadVisibility(),   /* (REG-601) */
    fetchLeadCapture(), fetchStudio(), db.select({ fileName: imports.fileName, createdAt: imports.createdAt, importedRows: imports.importedRows }).from(imports).where(or(like(imports.fileName, 'Website form%'), like(imports.fileName, 'Meta Lead Ads%'))),   /* (REG-602) */
    fetchNotificationRules(), fetchMessageTemplates(),   /* (REG-604) */
  ])
  /* (REG-607) The Lost / On Hold reasons and how many leads each has ever carried (the parking logs' payloads); only Owners and Admins edit the Leads cards (parity Q-41). */
  const [reasonList, reasonRows, viewer, customFields] = await Promise.all([
    fetchLeadReasons(),
    db.select({ reason: sql<string | null>`json_extract(${stageLogs.payload}, '$.reason')`, toStage: stageLogs.toStage, n: sql<number>`count(distinct ${stageLogs.leadId})` }).from(stageLogs).where(inArray(stageLogs.toStage, ['Lost', 'On Hold'])).groupBy(sql`json_extract(${stageLogs.payload}, '$.reason')`, stageLogs.toStage),
    fetchViewer(),
    fetchCustomFields(false),   /* (REG-612) */
  ])
  const reasonCounts = { lost: {} as Record<string, number>, hold: {} as Record<string, number> }
  for (const r of reasonRows) if (r.reason) reasonCounts[r.toStage === 'Lost' ? 'lost' : 'hold'][r.reason] = Number(r.n)
  return <SettingsView stageMovement={stageMovement} quoteApproval={quoteApproval} templateApproval={templateApproval} numbering={numbering} trades={trades.trades} tradesManaged={trades.managed} meName={me[0]?.name ?? ''} section={sp.section === 'quotes' ? 'quotes' : sp.section === 'notifications' ? 'notifications' : 'leads'} rules={rules} team={team}
                       leadReasons={reasonList.reasons} reasonsManaged={reasonList.managed} reasonCounts={reasonCounts} canManage={runsStudio(viewer.role)} customFields={customFields}
                       leadSources={leadSources.sources} sourcesManaged={leadSources.managed} sourceCounts={Object.fromEntries(counts.map((c) => [c.source, Number(c.n)]))} leadVisibility={leadVisibility}
                       leadCapture={leadCapture} studioName={studio.name} arrivals={arrivals.map((a) => ({ fileName: a.fileName, at: a.createdAt.getTime(), rows: a.importedRows }))}
                       notificationRules={notificationRules} messageTemplates={messageTemplates} />
}
