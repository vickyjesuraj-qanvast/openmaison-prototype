import type { Metadata } from 'next'
import { BillingView } from '@/components/company/plan/billing-view'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import { fetchInvoices } from '@/lib/credits/queries'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Company · Plan & billing' }
export const dynamic = 'force-dynamic'

/** Company › Plan & AI credits › Plan & billing (REG-704): the plan, top-ups, the card, the billing details and the invoices. */
export default async function PlanBillingPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [chrome, invoices, sp] = await Promise.all([fetchCreditsChrome(), fetchInvoices(), searchParams])
  return <BillingView chrome={chrome} invoices={invoices} from={readFrom(sp.from)} />
}
