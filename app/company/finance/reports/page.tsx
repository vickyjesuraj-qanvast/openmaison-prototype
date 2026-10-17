import { redirect } from 'next/navigation'
import { withQuery } from '@/lib/nav'

/** (REG-1361) Finance's reports are Company › Reports › Finance now — the old tab lands there with its report, period and project. Its own route,
    with no loader, so the answer is a plain redirect rather than a streamed page. */
export default async function OldFinanceReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(withQuery('/company/reports/finance', await searchParams))
}
