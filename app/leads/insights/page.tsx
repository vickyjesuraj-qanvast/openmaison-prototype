import type { Metadata } from 'next'
import { fetchInsights } from '@/lib/leads/insights'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { backLabel, readFrom } from '@/lib/nav'
import { InsightsView } from '@/components/leads/insights/insights-view'

/** (REG-611, parity Q-24 · R-01) Leads › Insights — 1.0's Performance view on 2.0's records, for Owners and Admins. */
export const metadata: Metadata = { title: 'Insights' }
export const dynamic = 'force-dynamic'

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [viewer, params] = await Promise.all([fetchViewer(), searchParams])
  const data = runsStudio(viewer.role) ? await fetchInsights() : null   // a Designer or a Manager gets the gate, not the numbers
  const from = readFrom(params.from)
  /* (Dane's UAT 11.09) Opened from a lead (its LEAD STAGES card's Response time), Back returns to that lead — and now says so, with the
     lead's name, where it said "Back to Leads". Only a lead the viewer may open is named (REG-601). */
  const leadId = from?.split('?')[0]?.match(/^\/leads\/([^/]+)/)?.[1]
  const leadName = leadId && leadId !== 'insights' && leadId !== 'imports' && await canOpenLead(viewer, leadId)
    ? (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)))[0]?.name ?? null
    : null
  return <InsightsView data={data} from={from} backLabel={from && leadName ? backLabel(from, { leadName, fallback: 'Back to Leads' }) : undefined} />
}
