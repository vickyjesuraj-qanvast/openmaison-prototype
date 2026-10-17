import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchLeadCredits, type CreditsView } from '@/lib/qanvast-account/queries'
import { LeadCredits } from '@/components/qanvast/account/lead-credits'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** (pending modules S41b-5 — 1.0's `deployment/qanvast` qanvast-ops/credits · credits/transactions · credits/contracts) Qanvast Ops › Lead
    credits: Overview · Transactions (?month=YYYY-MM) · Contracts, each at 1.0's own address. Owners only (1.0's rule) — anyone else meets the
    tab's gate, and nothing is asked of Qanvast for them. */
export const dynamic = 'force-dynamic'

const VIEWS: Record<string, CreditsView> = { transactions: 'transactions', contracts: 'contracts' }
const TITLES: Record<CreditsView, string> = { overview: 'Lead credits', transactions: 'Transactions · Lead credits', contracts: 'Contracts · Lead credits' }
const viewOf = (seg: string[] | undefined): CreditsView | null => (!seg?.length ? 'overview' : seg.length === 1 ? VIEWS[seg[0]!] ?? null : null)

export async function generateMetadata({ params }: { params: Promise<{ view?: string[] }> }): Promise<Metadata> {
  const v = viewOf((await params).view)
  return { title: v ? `${TITLES[v]} · Qanvast Ops` : 'Qanvast Ops' }
}

export default async function LeadCreditsPage({ params, searchParams }: { params: Promise<{ view?: string[] }>; searchParams: Promise<{ month?: string | string[] }> }) {
  if (await refusesPath('/qanvast-ops/credits')) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [{ view }, sp] = await Promise.all([params, searchParams])
  const v = viewOf(view)
  if (!v) notFound()
  const data = await fetchLeadCredits(v, { month: typeof sp.month === 'string' ? sp.month : null })
  return <LeadCredits data={data} view={v} />
}
