import { redirect } from 'next/navigation'
import { withQuery } from '@/lib/nav'

/** (REG-611 → REG-1361) Leads › Insights is Company › Reports › Leads now. The old address still lands there, `from` and all — Back then returns
    to the listing or the lead it was opened from. */
export default async function OldInsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(withQuery('/company/reports/leads', await searchParams))
}
