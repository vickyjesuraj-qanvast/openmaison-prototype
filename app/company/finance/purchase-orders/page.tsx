import { redirect } from 'next/navigation'
import { OLD_FINANCE_TABS } from '@/lib/finance/sections'
import { keepQuery } from '@/lib/nav'

/** (simplify S-11) Finance › Purchase orders is a kind of Money out now — the old address (a bell row, a search hit, `?open=` · `?new=1`) lands on
    Money out on that kind, its query kept. Its own route, with no loader, so the answer is a plain 307 rather than a streamed page. */
export default async function OldPurchaseOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(keepQuery(OLD_FINANCE_TABS['purchase-orders']!, await searchParams))
}
