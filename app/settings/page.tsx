import type { Metadata } from 'next'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { db } from '@/lib/db'
import { members, quotes } from '@/lib/db/schema'
import { fetchLeadCapture, fetchLeadReasons, fetchLeadSources, fetchLeadVisibility, fetchNumbering, fetchStudio, fetchQuoteApproval, fetchQuoteRules, fetchStageMovement, fetchTemplateApproval, fetchTradeNotes, fetchTrades } from '@/lib/settings/queries'
import { inArray, isNull, sql } from 'drizzle-orm'
import { imports, leads, stageLogs } from '@/lib/db/schema'
import { like, or } from 'drizzle-orm'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchBrand } from '@/lib/templates/queries'
import { withoutSecrets } from '@/lib/settings/types'
import { readFrom } from '@/lib/nav'
import { parseSettingsModule } from '@/lib/settings/modules'
import { SettingsView } from './settings-view'
import { fetchMessageTemplates, fetchNotificationRules } from '@/lib/notifications/queries'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/**
 * Settings — the studio's rules (REG-645, settings parity Q-01): the modules Studio · Lead management · Quotes & pricing · Notifications
 * as the house tab strip, the open one in `?section=` (Studio when none), `?from=` for Back. The records the modules speak of live under
 * Company. Every member opens it; Owners and Admins change it (parity Q-41).
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string; from?: string }> }) {
  const [stageMovement, quoteApproval, templateApproval, numbering, trades, sp, rules, team, leadSources, counts, leadVisibility, leadCapture, studio, arrivals, notificationRules, messageTemplates, brand, numbers] = await Promise.all([
    fetchStageMovement(), fetchQuoteApproval(), fetchTemplateApproval(), fetchNumbering(), fetchTrades(), searchParams,
    fetchQuoteRules(), db.select({ id: members.id, name: members.name, role: members.role, color: members.color, isYou: members.isYou, managerId: members.managerId, isActive: members.isActive }).from(members),
    fetchLeadSources(), db.select({ source: leads.source, n: sql<number>`count(*)` }).from(leads).where(isNull(leads.deletedAt)).groupBy(leads.source),   /* (REG-599) */
    fetchLeadVisibility(),   /* (REG-601) */
    fetchLeadCapture(), fetchStudio(), db.select({ fileName: imports.fileName, createdAt: imports.createdAt, importedRows: imports.importedRows }).from(imports).where(or(like(imports.fileName, 'Website form%'), like(imports.fileName, 'Meta Lead Ads%'))),   /* (REG-602) */
    fetchNotificationRules(), fetchMessageTemplates(),   /* (REG-604) */
    fetchBrand(), db.select({ number: quotes.number }).from(quotes),   /* (REG-645) the issuing entities; every number given, for the real next one */
  ])
  /* (REG-607) The Lost / On Hold reasons and how many leads each has ever carried (the parking logs' payloads); only Owners and Admins edit the Leads cards (parity Q-41). */
  const [reasonList, reasonRows, viewer, customFields, tradeNotes] = await Promise.all([
    fetchLeadReasons(),
    db.select({ reason: sql<string | null>`json_extract(${stageLogs.payload}, '$.reason')`, toStage: stageLogs.toStage, n: sql<number>`count(distinct ${stageLogs.leadId})` }).from(stageLogs).where(inArray(stageLogs.toStage, ['Lost', 'On Hold'])).groupBy(sql`json_extract(${stageLogs.payload}, '$.reason')`, stageLogs.toStage),
    fetchViewer(),
    fetchCustomFields(false),   /* (REG-612) */
    fetchTradeNotes(trades.trades),   /* (REG-617, parity Q-08) a note per trade */
  ])
  const reasonCounts = { lost: {} as Record<string, number>, hold: {} as Record<string, number> }
  for (const r of reasonRows) if (r.reason) reasonCounts[r.toStage === 'Lost' ? 'lost' : 'hold'][r.reason] = Number(r.n)
  const me = team.find((m) => m.isYou)
  /* (REG-645, settings parity Q-04) The entities as Settings › Studio lists them: the first is the studio — its UEN and GST are the studio's own. */
  const entities = brand.details.entities.map((e, i) => ({
    name: e.name, uen: i === 0 ? brand.details.uen : e.uen, gstRegistered: i === 0 ? studio.gstRegistered : e.gstRegistered,
    bank: [e.bankName, e.accountNo].filter(Boolean).join(' · ') || (e.payNow ? `PayNow ${e.payNow}` : ''),
    retired: i > 0 && !!e.retired,   // (sweep S4 #13) a retired entity said so on Profile, not here
  }))
  return <SettingsView stageMovement={stageMovement} quoteApproval={quoteApproval} templateApproval={templateApproval} numbering={numbering} trades={trades.trades} tradesManaged={trades.managed} tradeNotes={tradeNotes} meName={me?.name ?? ''}
                       section={parseSettingsModule(sp.section)} from={readFrom(sp.from)} rules={rules} team={team} studio={studio} entities={entities} quoteNumbers={numbers.map((q) => q.number)}
                       leadReasons={reasonList.reasons} reasonsManaged={reasonList.managed} reasonCounts={reasonCounts} canManage={runsStudio(viewer.role)} customFields={customFields}
                       leadSources={leadSources.sources} sourcesManaged={leadSources.managed} sourceCounts={Object.fromEntries(counts.map((c) => [c.source, Number(c.n)]))} leadVisibility={leadVisibility}
                       leadCapture={withoutSecrets(leadCapture)} studioName={studio.name} arrivals={arrivals.map((a) => ({ fileName: a.fileName, at: a.createdAt.getTime(), rows: a.importedRows }))}
                       notificationRules={notificationRules} messageTemplates={messageTemplates} />
}
