import { redirect } from 'next/navigation'
import { FINANCE_BASE } from '@/lib/finance/sections'
import { withQuery } from '@/lib/nav'
import { oldFinanceQuery } from '@/lib/links/old-addresses'

/** (REG-1360) A tab of Finance at its old address — `/finance/bills?open=…` — lands on the same tab in Company › Finance, `open` and all.
    (pending modules S41b-2) 1.0's own Finance addresses land too — `/finance/vendors?vendorId=` opens the vendor (2.0's `?open=`); 1.0's
    `/finance/operations` has its own route (app/finance/operations), since 2.0 has no Operations tab. */
export default async function OldFinanceTabPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tab } = await params
  redirect(withQuery(`${FINANCE_BASE}/${encodeURIComponent(tab)}`, oldFinanceQuery(tab, await searchParams)))
}
