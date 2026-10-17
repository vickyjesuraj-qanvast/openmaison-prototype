import { redirect } from 'next/navigation'
import { FINANCE_BASE } from '@/lib/finance/sections'
import { withQuery } from '@/lib/nav'

/** (REG-1360) Finance lives in Company (Company › Operations › Finance). The old address still lands — a link or a bell row from before
    the move opens Company › Finance, with its own query. */
export default async function OldFinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(withQuery(FINANCE_BASE, await searchParams))
}
