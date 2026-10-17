import type { Metadata } from 'next'
import { fetchInsights } from '@/lib/market-insights/queries'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { InsightsHome } from '@/components/market-insights/insights-home'

/** (pending modules S25 — card studio:market-insights) Tools › Market Insights: the articles OpenMaison's editors publish (1.0's /tools/market-insights). */
export const metadata: Metadata = { title: 'Market Insights' }
export const dynamic = 'force-dynamic'

export default async function MarketInsightsPage() {
  if (await refusesPath('/market-insights')) return <AccessGate section="Market Insights" />
  return <InsightsHome data={await fetchInsights()} />
}
