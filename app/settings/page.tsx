import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { fetchNumbering, fetchQuoteApproval, fetchQuoteRules, fetchStageMovement, fetchTemplateApproval, fetchTrades } from '@/lib/settings/queries'
import { SettingsView } from './settings-view'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/** Account setup — studio-level configuration. Leads and Quotes (REG-561) are live in this build; `?section=quotes` opens the Quotes module. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const [stageMovement, quoteApproval, templateApproval, numbering, trades, me, sp, rules, team] = await Promise.all([
    fetchStageMovement(), fetchQuoteApproval(), fetchTemplateApproval(), fetchNumbering(), fetchTrades(), db.select({ name: members.name }).from(members).where(eq(members.isYou, true)), searchParams,
    fetchQuoteRules(), db.select({ id: members.id, name: members.name, role: members.role }).from(members),
  ])
  return <SettingsView stageMovement={stageMovement} quoteApproval={quoteApproval} templateApproval={templateApproval} numbering={numbering} trades={trades.trades} tradesManaged={trades.managed} meName={me[0]?.name ?? ''} section={sp.section === 'quotes' ? 'quotes' : 'leads'} rules={rules} team={team} />
}
