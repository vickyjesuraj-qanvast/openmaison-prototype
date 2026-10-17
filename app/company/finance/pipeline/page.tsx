import { redirect } from 'next/navigation'
import { keepQuery } from '@/lib/nav'

/** (one-home N-01) Finance's Pipeline is gone — every project's contract, collected and margin is Company › Reports › Finance › Profitability.
    The old tab (and `/finance/pipeline`, which lands here) opens that report, its own query kept. Its own route, with no loader, so the answer
    is a plain redirect rather than a streamed page. */
export default async function OldPipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(keepQuery('/company/reports/finance?report=profitability', await searchParams))
}
