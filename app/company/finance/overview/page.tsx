import { redirect } from 'next/navigation'
import { OLD_FINANCE_TABS } from '@/lib/finance/sections'
import { keepQuery } from '@/lib/nav'

/** (simplify S-10) Finance › Overview became To do — Money to verify and Stuck are its To approve · To collect · Stuck groups. The old address
    lands there with its query. Its own route, with no loader, so the answer is a plain 307 rather than a streamed page. */
export default async function OldOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(keepQuery(OLD_FINANCE_TABS.overview!, await searchParams))
}
