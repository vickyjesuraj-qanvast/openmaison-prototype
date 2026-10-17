import type { Metadata } from 'next'
import { BillingView } from '@/components/company/plan/billing-view'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import { fetchAutoTopUp, fetchInvoices } from '@/lib/credits/queries'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Plan & billing' }
export const dynamic = 'force-dynamic'

/** Company › Plan & AI credits › Plan & billing (REG-704): the plan, top-ups, the card, the billing details and the invoices. */
export default async function PlanBillingPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/plan/billing')) return <AccessGate section="Plan & AI credits" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [chrome, invoices, auto, sp] = await Promise.all([fetchCreditsChrome(), fetchInvoices(), fetchAutoTopUp(), searchParams])
  return <BillingView chrome={chrome} invoices={invoices} auto={auto} from={readFrom(sp.from)} />
}
