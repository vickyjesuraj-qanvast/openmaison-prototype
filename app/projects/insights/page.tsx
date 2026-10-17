import { redirect } from 'next/navigation'
import { withQuery } from '@/lib/nav'

/** (gaps build I → REG-1361) Projects › Insights is Company › Reports › Projects now. The old address still lands there, with its query. */
export default async function OldProjectInsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(withQuery('/company/reports/projects', await searchParams))
}
