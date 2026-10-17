import type { Metadata } from 'next'
import { UsageView } from '@/components/company/plan/usage-view'
import { fetchCreditSummary, fetchOpenAsks, fetchUsage, parseRange } from '@/lib/credits/queries'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Plan & AI credits' }
export const dynamic = 'force-dynamic'

/** Company › Plan & AI credits › Usage (REG-704): the studio's AI credits — what is left, who used what, on which leads, every charge. */
export default async function PlanUsagePage({ searchParams }: { searchParams: Promise<{ range?: string; member?: string; from?: string }> }) {
  if (await refusesPath('/company/plan')) return <AccessGate section="Plan & AI credits" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const sp = await searchParams
  const summary = await fetchCreditSummary()
  const [usage, asks] = await Promise.all([fetchUsage(parseRange(sp.range)), summary.viewer.canSetAmounts ? fetchOpenAsks() : Promise.resolve([])])
  return <UsageView summary={summary} usage={usage} asks={asks} from={readFrom(sp.from)} focus={sp.member} />
}
